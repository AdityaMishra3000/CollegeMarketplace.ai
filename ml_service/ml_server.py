"""
College Marketplace - ML Microservice
Provides: Price Prediction, Recommendation System, Fraud Detection

TEMPORARY IMPLEMENTATION. The three "models" below are hand-written heuristics
and are intended to be replaced by trained models. The parts that matter to the
rest of the system are the HTTP contract and the vocabulary:

  - categories and conditions must match backend/src/config/taxonomy.js exactly
    (backend/tests/taxonomy.contract.test.js asserts this)
  - unknown categories/conditions are rejected with 400 rather than silently
    falling back, because a silent fallback is what previously mispriced every
    `appliances` listing and ignored every `like_new` condition

Anything replacing this service only has to honour those two things.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import re
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

# Guard rails for the batch endpoint: an unbounded list is free CPU for a caller.
MAX_BATCH_PRODUCTS = 500

# ─────────────────────────────────────────────
# 1. PRICE PREDICTION MODEL
# Rule-based + heuristic price estimator
# In production: replace with trained sklearn/XGBoost model
# ─────────────────────────────────────────────

# Base price ranges by category (in INR).
# Keys are the canonical taxonomy values — see the module docstring.
CATEGORY_BASE_PRICES = {
    "textbooks":   {"new": 800,  "like_new": 550,  "good": 350,  "fair": 200,  "poor": 100},
    "electronics": {"new": 8000, "like_new": 6000, "good": 4000, "fair": 2500, "poor": 1200},
    "furniture":   {"new": 3000, "like_new": 2200, "good": 1500, "fair": 900,  "poor": 400},
    "appliances":  {"new": 4000, "like_new": 3000, "good": 2000, "fair": 1200, "poor": 600},
    "clothing":    {"new": 600,  "like_new": 400,  "good": 250,  "fair": 150,  "poor": 80},
    "sports":      {"new": 1500, "like_new": 1100, "good": 750,  "fair": 450,  "poor": 200},
    "other":       {"new": 1000, "like_new": 700,  "good": 500,  "fair": 300,  "poor": 150},
}

KNOWN_CATEGORIES = tuple(CATEGORY_BASE_PRICES)
KNOWN_CONDITIONS = tuple(CATEGORY_BASE_PRICES["other"])

# Ordered worst -> best; mirrors the `rank` field in the canonical taxonomy.
CONDITION_LADDER = ["poor", "fair", "good", "like_new", "new"]


# Keywords that boost or reduce price
PRICE_BOOST_KEYWORDS = {
    # Electronics
    "iphone": 3.5, "macbook": 5.0, "apple": 2.5, "samsung": 2.0, "laptop": 3.0,
    "gaming": 2.2, "gpu": 3.5, "nvidia": 3.0, "rtx": 3.5, "mechanical": 1.8,
    "wireless": 1.4, "bluetooth": 1.3, "airpods": 2.5, "tablet": 2.0, "ipad": 3.0,
    # Textbooks
    "engineering": 1.5, "medical": 1.8, "reference": 1.3,
    "imported": 1.4, "international edition": 1.2, "hardcover": 1.3,
    # Furniture
    "wooden": 1.5, "solid": 1.4, "adjustable": 1.3, "ergonomic": 1.6,
    # Clothing
    "branded": 1.6, "adidas": 1.5, "nike": 1.6, "puma": 1.4,
    # Applies across categories ("original packaging", "original charger").
    # Was declared twice with different values; the first was silently dropped.
    "original": 1.3,
}

PRICE_REDUCE_KEYWORDS = {
    "damaged": 0.5, "broken": 0.4, "cracked": 0.55, "scratched": 0.7,
    "torn": 0.6, "worn": 0.7, "old": 0.8, "stained": 0.65, "faded": 0.75,
    "missing pages": 0.5, "highlighted": 0.75, "annotated": 0.8,
}

def predict_price(title: str, description: str, category: str, condition: str) -> dict:
    """Predict fair price range for a product."""
    base = CATEGORY_BASE_PRICES.get(category, CATEGORY_BASE_PRICES["other"])
    base_price = base.get(condition, base["good"])
    
    combined_text = (title + " " + description).lower()
    
    multiplier = 1.0
    matched_boosts = []
    matched_reductions = []
    
    for keyword, factor in PRICE_BOOST_KEYWORDS.items():
        if keyword in combined_text:
            multiplier *= factor
            matched_boosts.append(keyword)
    
    for keyword, factor in PRICE_REDUCE_KEYWORDS.items():
        if keyword in combined_text:
            multiplier *= factor
            matched_reductions.append(keyword)
    
    # Cap multiplier to avoid extreme values
    multiplier = min(max(multiplier, 0.2), 8.0)
    
    predicted_price = base_price * multiplier
    
    # Price range: ±20%
    low  = round(predicted_price * 0.80 / 10) * 10
    high = round(predicted_price * 1.20 / 10) * 10
    fair = round(predicted_price / 10) * 10
    
    confidence = 0.85 if (matched_boosts or matched_reductions) else 0.65
    
    reasoning = []
    reasoning.append(f"Base price for {category} ({condition} condition): ₹{base_price}")
    if matched_boosts:
        reasoning.append(f"Price boosters found: {', '.join(matched_boosts)}")
    if matched_reductions:
        reasoning.append(f"Price reducers found: {', '.join(matched_reductions)}")
    
    return {
        "predicted_price": fair,
        "price_range": {"low": low, "high": high},
        "confidence": round(confidence, 2),
        "reasoning": reasoning,
        "market_insight": get_market_insight(category, condition)
    }

def get_market_insight(category: str, condition: str) -> str:
    insights = {
        "textbooks": "Textbook prices spike at semester start. List early for best results.",
        "electronics": "Electronics sell fastest in first 2 weeks. Price competitively.",
        "furniture": "Furniture is in high demand during hostel move-in season.",
        "appliances": "Hostel appliances move quickly at the start and end of term.",
        "clothing": "Branded clothing retains ~60% of original value in good condition.",
        "sports": "Sports equipment sells well before new academic year.",
        "other": "Unique items may fetch higher prices - highlight special features.",
    }
    return insights.get(category, "Price competitively for faster sale.")


# ─────────────────────────────────────────────
# 2. RECOMMENDATION SYSTEM
# Content-based filtering using TF-IDF-like scoring
# ─────────────────────────────────────────────

def compute_similarity(product_a: dict, product_b: dict) -> float:
    """Compute similarity score between two products with improved text matching."""
    score = 0.0
    
    # 1. Category match (Still important, but slightly less dominant)
    if product_a.get("category") == product_b.get("category"):
        score += 0.3
    
    # 2. Condition proximity (Minor factor)
    conditions = CONDITION_LADDER
    cond_a = conditions.index(product_a.get("condition", "good")) if product_a.get("condition") in conditions else 2
    cond_b = conditions.index(product_b.get("condition", "good")) if product_b.get("condition") in conditions else 2
    cond_diff = abs(cond_a - cond_b)
    score += max(0, 0.1 - cond_diff * 0.02)
    
    # 3. Price proximity
    price_a = product_a.get("price", 0)
    price_b = product_b.get("price", 0)
    if price_a > 0 and price_b > 0:
        ratio = min(price_a, price_b) / max(price_a, price_b)
        score += ratio * 0.15
    
    # 4. Upgraded Title/Description overlap (The Game Changer)
    def tokenize(text):
        # Ignore common filler words that ruin similarity scores
        stopwords = {"the", "and", "for", "with", "this", "that", "are", "you", 
                     "not", "from", "has", "have", "but", "very", "good", "condition", 
                     "used", "new", "buy", "sell", "price", "only"}
                     
        # Extract words 3 letters or longer
        words = set(re.findall(r'\b\w{3,}\b', text.lower()))
        return words - stopwords
    
    # Give double weight to the title words vs description words
    title_a = product_a.get("title", "")
    title_b = product_b.get("title", "")
    desc_a = product_a.get("description", "")
    desc_b = product_b.get("description", "")
    
    tokens_a = tokenize(title_a + " " + title_a + " " + desc_a) # Title counted twice
    tokens_b = tokenize(title_b + " " + title_b + " " + desc_b)
    
    if tokens_a and tokens_b:
        intersection = tokens_a & tokens_b
        union = tokens_a | tokens_b
        jaccard = len(intersection) / len(union)
        # Text similarity is now the biggest deciding factor
        score += jaccard * 0.45 
    
    return round(score, 4)

def get_recommendations(target_product: dict, all_products: list, user_history: list = None, top_n: int = 6) -> list:
    """
    Get product recommendations based on:
    1. Content similarity to target product
    2. User's browsing/interest history
    """
    target_id = target_product.get("_id") or target_product.get("id")
    
    scored = []
    for product in all_products:
        pid = product.get("_id") or product.get("id")
        if pid == target_id:
            continue
        if not product.get("isActive", True):
            continue
        
        sim_score = compute_similarity(target_product, product)
        
        # Boost based on user history
        history_boost = 0.0
        if user_history:
            for hist_item in user_history:
                if hist_item.get("category") == product.get("category"):
                    history_boost += 0.05
        
        # Recency boost (newer items ranked slightly higher)
        created_at = product.get("createdAt", "")
        recency_boost = 0.0
        if created_at:
            try:
                created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                days_old = (datetime.now(created.tzinfo) - created).days
                recency_boost = max(0, 0.1 - days_old * 0.002)
            except:
                pass
        
        total_score = sim_score + history_boost + recency_boost
        scored.append({"product": product, "score": round(total_score, 4)})
    
    scored.sort(key=lambda x: x["score"], reverse=True)
    
    return [
        {**item["product"], "recommendation_score": item["score"]}
        for item in scored[:top_n]
    ]


# ─────────────────────────────────────────────
# 3. FRAUD DETECTION
# Rule-based anomaly scoring for listings
# ─────────────────────────────────────────────

FRAUD_INDICATORS = {
    # Price anomalies
    "price_too_low_ratio": 0.15,   # If price < 15% of market base price
    "price_too_high_ratio": 5.0,   # If price > 5x of market base price
    
    # Text red flags
    "scam_phrases": [
        "whatsapp only", "telegram only", "advance payment", "send money first",
        "upi only outside", "google pay first", "paytm advance", "bank transfer first",
        "100% genuine", "no return", "as-is", "urgent sale",
        "lottery", "prize", "won", "claim your", "click link",
        "contact outside", "call me only", "don't contact on app"
    ],
    
    # Suspicious patterns
    "excessive_caps_threshold": 0.3,   # >30% caps in description
    "excessive_punctuation_threshold": 5,  # > 5 consecutive special chars
    "too_short_description_threshold": 25,  # < 25 chars is suspicious
    "duplicate_contact_pattern": r'\b(\d{10})\b',  # Phone numbers in description
}

def calculate_fraud_score(product: dict, seller_history: dict = None) -> dict:
    """
    Returns fraud risk score (0-100) and flags.
    0-25: Low risk, 26-50: Medium, 51-75: High, 76+: Very High
    """
    flags = []
    risk_score = 0
    
    title = product.get("title", "")
    description = product.get("description", "")
    price = product.get("price", 0)
    category = product.get("category", "other")
    condition = product.get("condition", "good")
    combined_text = (title + " " + description).lower()
    
    # 1. Price anomaly check
    base_prices = CATEGORY_BASE_PRICES.get(category, CATEGORY_BASE_PRICES["other"])
    base_price = base_prices.get(condition, base_prices["good"])
    
    if price > 0 and base_price > 0:
        price_ratio = price / base_price
        if price_ratio < FRAUD_INDICATORS["price_too_low_ratio"]:
            risk_score += 30
            flags.append({
                "type": "PRICE_ANOMALY",
                "severity": "HIGH",
                "message": f"Price ₹{price} is unusually low for {category} in {condition} condition (expected ~₹{base_price})"
            })
        elif price_ratio > FRAUD_INDICATORS["price_too_high_ratio"]:
            risk_score += 15
            flags.append({
                "type": "PRICE_ANOMALY",
                "severity": "MEDIUM",
                "message": f"Price ₹{price} is unusually high. Verify item authenticity."
            })
    
    # 2. Scam phrase detection
    detected_phrases = []
    for phrase in FRAUD_INDICATORS["scam_phrases"]:
        if phrase in combined_text:
            detected_phrases.append(phrase)
    
    if detected_phrases:
        penalty = min(len(detected_phrases) * 15, 40)
        risk_score += penalty
        flags.append({
            "type": "SUSPICIOUS_LANGUAGE",
            "severity": "HIGH" if len(detected_phrases) >= 2 else "MEDIUM",
            "message": f"Suspicious phrases detected: {', '.join(detected_phrases[:3])}",
            "phrases": detected_phrases
        })
    
    # 3. Text quality checks
    if len(description) < FRAUD_INDICATORS["too_short_description_threshold"]:
        risk_score += 10
        flags.append({
            "type": "INCOMPLETE_LISTING",
            "severity": "LOW",
            "message": "Description is very short. Legitimate sellers usually provide detailed descriptions."
        })
    
    # 4. Excessive caps
    if len(description) > 10:
        caps_ratio = sum(1 for c in description if c.isupper()) / len(description)
        if caps_ratio > FRAUD_INDICATORS["excessive_caps_threshold"]:
            risk_score += 10
            flags.append({
                "type": "SUSPICIOUS_FORMATTING",
                "severity": "LOW",
                "message": "Excessive use of capital letters (common in spam/scam listings)."
            })
    
    # 5. External contact attempt
    phone_in_desc = re.findall(FRAUD_INDICATORS["duplicate_contact_pattern"], description)
    if phone_in_desc:
        risk_score += 20
        flags.append({
            "type": "EXTERNAL_CONTACT",
            "severity": "MEDIUM",
            "message": "Phone number found in description. Use the platform's messaging system for safety."
        })
    
    # 6. Seller history checks
    if seller_history:
        if seller_history.get("report_count", 0) >= 2:
            risk_score += 25
            flags.append({
                "type": "SELLER_HISTORY",
                "severity": "HIGH",
                "message": f"Seller has {seller_history['report_count']} previous reports."
            })
        
        account_age_days = seller_history.get("account_age_days", 999)
        if account_age_days < 3:
            risk_score += 15
            flags.append({
                "type": "NEW_ACCOUNT",
                "severity": "MEDIUM",
                "message": "Seller account created very recently. Exercise caution."
            })
    
    risk_score = min(risk_score, 100)
    
    # Determine risk level
    if risk_score <= 25:
        risk_level = "LOW"
        recommendation = "This listing appears legitimate. Safe to proceed."
    elif risk_score <= 50:
        risk_level = "MEDIUM"
        recommendation = "Some concerns detected. Verify item before payment."
    elif risk_score <= 75:
        risk_level = "HIGH"
        recommendation = "Multiple red flags. Meet in person on campus and inspect before paying."
    else:
        risk_level = "VERY_HIGH"
        recommendation = "Do not proceed. This listing has multiple fraud indicators. Report it."
    
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "flags": flags,
        "recommendation": recommendation,
        "is_flagged": risk_score > 50,
        "analyzed_at": datetime.now(timezone.utc).isoformat()
    }


# ─────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────

def taxonomy_error(category, condition):
    """
    Reject values outside the shared taxonomy.

    Every heuristic here is keyed by category and condition, so an unrecognised
    value used to fall back to `other` / `good` and produce a confidently wrong
    answer. Failing the request instead means a vocabulary mismatch between the
    backend and this service is visible immediately.
    """
    problems = []
    if category not in CATEGORY_BASE_PRICES:
        problems.append(
            f"unknown category '{category}' (expected one of: {', '.join(KNOWN_CATEGORIES)})"
        )
    if condition not in KNOWN_CONDITIONS:
        problems.append(
            f"unknown condition '{condition}' (expected one of: {', '.join(KNOWN_CONDITIONS)})"
        )
    if not problems:
        return None
    app.logger.warning("taxonomy mismatch: %s", "; ".join(problems))
    return jsonify({"error": "; ".join(problems), "code": "TAXONOMY_MISMATCH"}), 400


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ML Service Running",
        "version": "1.1.0",
        "implementation": "heuristic",
        "categories": list(KNOWN_CATEGORIES),
        "conditions": list(KNOWN_CONDITIONS)
    })

@app.route('/api/ml/predict-price', methods=['POST'])
def api_predict_price():
    """
    POST /api/ml/predict-price
    Body: { title, description, category, condition }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    required = ["title", "description", "category", "condition"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    invalid = taxonomy_error(data["category"], data["condition"])
    if invalid:
        return invalid

    result = predict_price(
        data["title"],
        data["description"],
        data["category"],
        data["condition"]
    )
    return jsonify(result)

@app.route('/api/ml/recommend', methods=['POST'])
def api_recommend():
    """
    POST /api/ml/recommend
    Body: { target_product, all_products, user_history (optional), top_n (optional) }

    Returns a ranking only. The caller re-reads whatever product fields it needs
    to render, so candidates can be sent already projected down to the fields
    scored here.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data provided"}), 400

    target = data.get("target_product")
    all_products = data.get("all_products", [])
    user_history = data.get("user_history", [])
    top_n = data.get("top_n", 6)

    if not target:
        return jsonify({"error": "target_product is required"}), 400
    if not isinstance(all_products, list):
        return jsonify({"error": "all_products must be an array"}), 400
    if len(all_products) > MAX_BATCH_PRODUCTS:
        return jsonify({
            "error": f"too many candidates in one request (max {MAX_BATCH_PRODUCTS})"
        }), 413

    try:
        top_n = max(1, min(int(top_n), 50))
    except (TypeError, ValueError):
        top_n = 6

    recommendations = get_recommendations(target, all_products, user_history, top_n)
    return jsonify({
        "recommendations": recommendations,
        "count": len(recommendations)
    })

@app.route('/api/ml/fraud-check', methods=['POST'])
def api_fraud_check():
    """
    POST /api/ml/fraud-check
    Body: { product, seller_history (optional) }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    product = data.get("product")
    if not product:
        return jsonify({"error": "product is required"}), 400

    invalid = taxonomy_error(product.get("category"), product.get("condition"))
    if invalid:
        return invalid

    seller_history = data.get("seller_history", {})
    result = calculate_fraud_score(product, seller_history)
    return jsonify(result)

@app.route('/api/ml/batch-fraud-check', methods=['POST'])
def api_batch_fraud():
    """
    Check fraud for multiple products at once.

    Body: { products: [ { ...product, seller_history?: {...} } ] }

    Seller history travels inside each entry so a batch scores identically to
    single-product checks. Used by the backend's fraud backfill: one round trip
    per 100 products instead of one request per product.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data provided"}), 400

    products = data.get("products")
    if not isinstance(products, list):
        return jsonify({"error": "products must be an array"}), 400
    if len(products) > MAX_BATCH_PRODUCTS:
        return jsonify({
            "error": f"too many products in one batch (max {MAX_BATCH_PRODUCTS})"
        }), 413

    results = []
    skipped = []

    for product in products:
        if not isinstance(product, dict):
            continue
        # One bad row must not fail the whole batch, but it is still reported.
        if product.get("category") not in CATEGORY_BASE_PRICES or \
                product.get("condition") not in KNOWN_CONDITIONS:
            skipped.append({
                "product_id": product.get("_id") or product.get("id"),
                "reason": "TAXONOMY_MISMATCH",
                "category": product.get("category"),
                "condition": product.get("condition")
            })
            continue

        fraud_result = calculate_fraud_score(product, product.get("seller_history") or {})
        results.append({
            "product_id": product.get("_id") or product.get("id"),
            **fraud_result
        })

    if skipped:
        app.logger.warning("batch-fraud-check skipped %d off-taxonomy products", len(skipped))

    flagged_count = sum(1 for r in results if r["is_flagged"])
    return jsonify({
        "results": results,
        "total": len(results),
        "flagged_count": flagged_count,
        "skipped": skipped
    })

if __name__ == '__main__':
    print("🤖 ML Service starting on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)

"""
College Marketplace - ML Microservice
Provides: Price Prediction, Recommendation System, Fraud Detection
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import json
import re
from datetime import datetime
import math

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# 1. PRICE PREDICTION MODEL
# Rule-based + heuristic price estimator
# In production: replace with trained sklearn/XGBoost model
# ─────────────────────────────────────────────

# Base price ranges by category (in INR)
CATEGORY_BASE_PRICES = {
    "textbooks":   {"new": 800,  "like-new": 550, "good": 350, "fair": 200, "poor": 100},
    "electronics": {"new": 8000, "like-new": 6000, "good": 4000, "fair": 2500, "poor": 1200},
    "furniture":   {"new": 3000, "like-new": 2200, "good": 1500, "fair": 900,  "poor": 400},
    "clothing":    {"new": 600,  "like-new": 400,  "good": 250,  "fair": 150,  "poor": 80},
    "sports":      {"new": 1500, "like-new": 1100, "good": 750,  "fair": 450,  "poor": 200},
    "other":       {"new": 1000, "like-new": 700,  "good": 500,  "fair": 300,  "poor": 150},
}

# Keywords that boost or reduce price
PRICE_BOOST_KEYWORDS = {
    # Electronics
    "iphone": 3.5, "macbook": 5.0, "apple": 2.5, "samsung": 2.0, "laptop": 3.0,
    "gaming": 2.2, "gpu": 3.5, "nvidia": 3.0, "rtx": 3.5, "mechanical": 1.8,
    "wireless": 1.4, "bluetooth": 1.3, "airpods": 2.5, "tablet": 2.0, "ipad": 3.0,
    # Textbooks
    "engineering": 1.5, "medical": 1.8, "reference": 1.3, "original": 1.2,
    "imported": 1.4, "international edition": 1.2, "hardcover": 1.3,
    # Furniture
    "wooden": 1.5, "solid": 1.4, "adjustable": 1.3, "ergonomic": 1.6,
    # Clothing
    "branded": 1.6, "adidas": 1.5, "nike": 1.6, "puma": 1.4, "original": 1.3,
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
    conditions = ["poor", "fair", "good", "like-new", "new"]
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
        "analyzed_at": datetime.utcnow().isoformat()
    }


# ─────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ML Service Running", "version": "1.0.0"})

@app.route('/api/ml/predict-price', methods=['POST'])
def api_predict_price():
    """
    POST /api/ml/predict-price
    Body: { title, description, category, condition }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    required = ["title", "description", "category", "condition"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    
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
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    target = data.get("target_product")
    all_products = data.get("all_products", [])
    user_history = data.get("user_history", [])
    top_n = data.get("top_n", 6)
    
    if not target:
        return jsonify({"error": "target_product is required"}), 400
    
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
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    product = data.get("product")
    if not product:
        return jsonify({"error": "product is required"}), 400
    
    seller_history = data.get("seller_history", {})
    result = calculate_fraud_score(product, seller_history)
    return jsonify(result)

@app.route('/api/ml/batch-fraud-check', methods=['POST'])
def api_batch_fraud():
    """Check fraud for multiple products at once."""
    data = request.get_json()
    products = data.get("products", [])
    
    results = []
    for product in products:
        fraud_result = calculate_fraud_score(product)
        results.append({
            "product_id": product.get("_id") or product.get("id"),
            **fraud_result
        })
    
    flagged_count = sum(1 for r in results if r["is_flagged"])
    return jsonify({
        "results": results,
        "total": len(results),
        "flagged_count": flagged_count
    })

if __name__ == '__main__':
    print("🤖 ML Service starting on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)

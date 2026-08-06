# 🎓 College Marketplace — AI/ML Enhanced Edition

> A student buy-and-sell platform upgraded with **Price Prediction**, **Recommendation System**, and **Fraud Detection** powered by a dedicated Python ML microservice.

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────┐
│               COLLEGE MARKETPLACE               │
│                                                 │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │   Frontend   │───▶│   Node.js Backend    │   │
│  │  HTML/JS/CSS │    │   Express  Port 5000 │   │
│  │  Port 3000   │    └────────┬─────────────    │
│  └──────────────┘             │                 │
│                         ┌─────▼──────────────┐  │
│                         │  Python ML Service │  │
│                         │   Flask  Port 5001 │  │
│                         └─────────┬──────────┘  │
│                                   │             │
│                         ┌─────────▼──────────┐  │
│                         │      MongoDB       │  │
│                         │     Port 27017     │  │
│                         └────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 🤖 AI/ML Features

### 1. 💰 Price Prediction
**How it works:**
- Seller fills in Title, Category, and Condition in the listing form
- Clicks **"🤖 Get AI Price Suggestion"**
- ML service returns a predicted fair price + low/high range + confidence score
- Seller can click **"✅ Use This Price"** to auto-fill the form

**Technical approach:**
- Rule-based + keyword multiplier engine (production-ready to swap with trained ML model)
- Factors used: category base price, condition, title/description keywords (e.g. "MacBook" → price boost, "damaged" → price reduction)
- Returns confidence score based on number of matching signals
- Market insight tip per category

**API:** `POST /api/ai/predict-price`
```json
Request:  { "title": "MacBook Air M1", "description": "...", "category": "electronics", "condition": "good" }
Response: { "predicted_price": 52000, "price_range": { "low": 41600, "high": 62400 }, "confidence": 0.85, "reasoning": [...], "market_insight": "..." }
```

---

### 2. 🎯 Recommendation System
**How it works:**
- When a buyer opens any product detail, the system automatically fetches similar products
- Shows a **"Similar Items You Might Like"** horizontal scrollable strip below the product
- Considers the user's interest/view history to personalize results

**Technical approach:**
- Content-based filtering using a custom similarity function
- Similarity score = weighted sum of: category match (40%), condition proximity (20%), price range similarity (20%), title/description keyword Jaccard overlap (20%)
- Bonus boosts for: items the user previously showed interest in, recently listed items
- Returns top 6 recommendations sorted by score

**API:** `GET /api/ai/recommendations/:productId`
```json
Response: { "recommendations": [ { ...product, "recommendation_score": 0.73 }, ... ], "count": 6 }
```

---

### 3. 🚨 Fraud Detection
**How it works:**
- Every product listing is automatically scanned when opened
- A risk badge appears: ✅ Safe / ⚠️ Caution / 🚨 High Risk / 🛑 Danger
- For new listings being created, fraud check runs on the form data before submission
- Products flagged VERY_HIGH are auto-marked `isFlagged: true` in the database

**Technical approach:**
Risk score 0–100 computed from:

| Check | Weight | What it detects |
|---|---|---|
| Price anomaly | +30 | Price < 15% of market base = likely scam |
| Scam phrases | +15/flag | "WhatsApp only", "advance payment", "no return", etc. |
| Phone in description | +20 | Trying to move contact off-platform |
| Very short description | +10 | Lazy/fake listing |
| Excessive CAPS | +10 | Common in spam |
| New account (< 3 days) | +15 | New account fraud pattern |
| Seller with reports | +25 | History of complaints |

**Risk Levels:**
- 0–25: ✅ LOW — Safe to proceed
- 26–50: ⚠️ MEDIUM — Verify item before paying
- 51–75: 🚨 HIGH — Meet on campus, inspect first
- 76–100: 🛑 VERY HIGH — Do not proceed, report listing

**API:** `POST /api/ai/fraud-check` or `GET /api/ai/fraud-check/:productId`

---

### 4. 📊 AI Market Insights
**How it works:**
- Sidebar button "🤖 AI Market Insights" expands a live panel
- Shows trending categories, average prices, total active listings

**API:** `GET /api/ai/insights`

---

## 📁 Project Structure

```
AI_MARKETPLACE/
├── backend/
│   ├── server.js           # Express API + all AI routes
│   ├── package.json
│   ├── .env
│   └── Dockerfile
│
├── ml_service/
│   ├── ml_server.py        # Flask ML microservice
│   ├── requirements.txt    # flask, flask-cors, numpy
│   └── Dockerfile
│
├── frontend/
│   ├── index.html          # Main app (AI features integrated)
│   ├── aiService.js        # 🆕 AI API calls + UI renderers
│   ├── aiStyles.css        # 🆕 AI component styles
│   ├── apiService.js       # Original API service
│   ├── authAPI.js          # Auth manager
│   ├── productsAPI.js      # Product manager
│   ├── ui.js               # UI manager
│   ├── styles.css          # Original styles
│   └── animations.css      # Original animations
│
├── docker-compose.yml      # 🆕 One-command deployment
├── nginx.conf              # 🆕 Frontend server config
└── README.md               # This file
```

---

## 🚀 Setup & Running

### Option A — Docker (Recommended, one command)

```bash
# 1. Make sure Docker Desktop is running

# 2. From the AI_MARKETPLACE folder:
docker-compose up --build

# App is now available at:
#   Frontend  →  http://localhost:3000
#   Backend   →  http://localhost:5000
#   ML API    →  http://localhost:5001
```

---

### Option B — Manual Setup (3 terminals)

#### Terminal 1 — MongoDB
```bash
# Make sure MongoDB is installed and running
mongod
```

#### Terminal 2 — ML Service (Python)
```bash
cd ml_service
pip install -r requirements.txt
python ml_server.py

# Should print: ML Service starting on port 5001...
```

#### Terminal 3 — Node.js Backend
```bash
cd backend
npm install
npm run dev

# Should print: Server running on port 5000
#               MongoDB connected successfully
```

#### Frontend
```bash
# Open frontend/index.html in your browser directly, OR
# Serve it with a simple HTTP server:
cd frontend
npx serve .   # or: python3 -m http.server 3000
```

---

## 🧪 Testing the AI Features

### Test Price Prediction
```bash
curl -X POST http://localhost:5001/api/ml/predict-price \
  -H "Content-Type: application/json" \
  -d '{"title":"MacBook Air M1","description":"Good condition laptop","category":"electronics","condition":"good"}'
```

### Test Fraud Detection
```bash
# Safe listing
curl -X POST http://localhost:5001/api/ml/fraud-check \
  -H "Content-Type: application/json" \
  -d '{"product":{"title":"Engineering Textbook","description":"Used for one semester, good condition","category":"textbooks","price":350,"condition":"good"}}'

# Suspicious listing
curl -X POST http://localhost:5001/api/ml/fraud-check \
  -H "Content-Type: application/json" \
  -d '{"product":{"title":"iPhone 15 Pro Max","description":"URGENT SALE!! Contact on WhatsApp only advance payment send money first","category":"electronics","price":100,"condition":"new"}}'
```

### Test Recommendations
```bash
# After seeding the database, pick any product _id
curl http://localhost:5000/api/ai/recommendations/PRODUCT_ID_HERE
```

### Test Market Insights
```bash
curl http://localhost:5000/api/ai/insights
```

---

## 🔮 Upgrading to Production ML Models

The ML service is designed so you can replace the rule-based engines with real trained models:

### Price Prediction → scikit-learn / XGBoost
```python
# In ml_server.py, replace predict_price() with:
import pickle
model = pickle.load(open('price_model.pkl', 'rb'))
vectorizer = pickle.load(open('tfidf_vectorizer.pkl', 'rb'))

def predict_price(title, description, category, condition):
    features = vectorizer.transform([title + ' ' + description])
    # Add category/condition as one-hot encoded features
    price = model.predict(features)[0]
    return { "predicted_price": int(price), ... }
```

**Training data you need:** Historical listings with `(title, description, category, condition, final_price)` tuples.

### Recommendation System → Collaborative Filtering
Once you have user interaction data (views, interest clicks, purchases), upgrade to:
- **Matrix Factorization** (SVD, NMF) using surprise library
- **Neural Collaborative Filtering** using TensorFlow/PyTorch

### Fraud Detection → Binary Classifier
Label your flagged listings as fraud (1) vs legitimate (0), then train:
- **Logistic Regression** or **Random Forest** on the extracted features
- Use SHAP for explainability to show which features triggered the flag

---

## 📡 Complete AI API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/predict-price` | ✅ JWT | Get price suggestion for a listing |
| GET | `/api/ai/recommendations/:id` | Optional | Get similar product recommendations |
| POST | `/api/ai/fraud-check` | None | Analyze a product object for fraud |
| GET | `/api/ai/fraud-check/:id` | None | Fraud check existing product by ID |
| GET | `/api/ai/insights` | None | AI-powered market analytics |

---

## 👥 Demo Credentials
```
Email:    demo@college.edu
Password: demo123
```

---

*Built as a college project demonstrating full-stack AI/ML integration.*

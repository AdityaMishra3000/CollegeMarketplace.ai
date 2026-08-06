// ═══════════════════════════════════════════════════════════════
// aiService.js — AI/ML Feature Integration for College Marketplace
// ═══════════════════════════════════════════════════════════════

const AI_BASE = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api');

const AIService = {

    // Helper to safely fetch and intercept silent crashes (like 502 Bad Gateway)
    async safeFetch(endpoint, options = {}) {
        try {
            const res = await fetch(endpoint, options);
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return { error: `Server Error ${res.status}: Backend or AI service is offline.` };
            }
        } catch (e) {
            return { error: `Connection Error: ${e.message}` };
        }
    },

    // ── PRICE PREDICTION ──────────────────────────────────────────
    async predictPrice({ title, description, category, condition }) {
        const token = localStorage.getItem('authToken');
        return await this.safeFetch(`${AI_BASE}/ai/predict-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title, description, category, condition })
        });
    },

    // ── RECOMMENDATIONS ───────────────────────────────────────────
    async getRecommendations(productId) {
        const token = localStorage.getItem('authToken');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await this.safeFetch(`${AI_BASE}/ai/recommendations/${productId}`, { headers });
        return res.recommendations ? res : { recommendations: [] };
    },

    // ── FRAUD CHECK ───────────────────────────────────────────────
    async checkFraud(product) {
        return await this.safeFetch(`${AI_BASE}/ai/fraud-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product })
        });
    },

    async checkFraudById(productId) {
        return await this.safeFetch(`${AI_BASE}/ai/fraud-check/${productId}`);
    },

    // ── MARKET INSIGHTS ───────────────────────────────────────────
    async getInsights() {
        return await this.safeFetch(`${AI_BASE}/ai/insights`);
    },

    // ── UI HELPERS ────────────────────────────────────────────────

    renderPriceSuggestion(container, data) {
        // Stop and show the exact error if the fetch failed
        if(!data || data.fallback || data.error || data.message) {
            container.innerHTML = `
              <div class="ai-scan-loader" style="color: #ef4444; font-weight: bold;">
                ⚠️ ${data?.error || data?.message || 'AI service unavailable. Please set price manually.'}
              </div>`;
            return;
        }
        
        const { predicted_price, price_range, confidence, reasoning, market_insight } = data;
        const pct = Math.round(confidence * 100);
        const barColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

        container.innerHTML = `
          <div class="ai-price-box">
            <div class="ai-price-header">
              <span class="ai-badge">🤖 AI Price Suggestion</span>
              <span class="ai-confidence" style="--bar:${pct}%;--bar-color:${barColor}">
                ${pct}% confident
                <span class="conf-bar"><span class="conf-fill"></span></span>
              </span>
            </div>
            <div class="ai-price-values">
              <div class="ai-price-fair">
                ₹${predicted_price?.toLocaleString('en-IN') ?? '—'}
                <span>Suggested Fair Price</span>
              </div>
              <div class="ai-price-range">
                <span class="range-low">₹${price_range?.low?.toLocaleString('en-IN')}</span>
                <span class="range-sep">–</span>
                <span class="range-high">₹${price_range?.high?.toLocaleString('en-IN')}</span>
                <span>Market Range</span>
              </div>
            </div>
            <div class="ai-market-tip">💡 ${market_insight}</div>
            <button type="button" class="btn-use-price" onclick="AIService.applyPrice(${predicted_price})">
              ✅ Use This Price
            </button>
          </div>`;
    },

    applyPrice(price) {
        const priceInput = document.getElementById('itemPrice');
        if(priceInput) {
            priceInput.value = price;
            priceInput.classList.add('ai-applied');
            setTimeout(() => priceInput.classList.remove('ai-applied'), 1500);
        }
    },

    renderFraudBadge(container, data, compact = false) {
        if(!data || data.error) return;
        const { risk_level, risk_score, flags, recommendation } = data;
        const config = {
            LOW:       { emoji: '✅', label: 'Safe',      cls: 'fraud-low',       bg: '#d1fae5', color: '#065f46' },
            MEDIUM:    { emoji: '⚠️', label: 'Caution',   cls: 'fraud-medium',    bg: '#fef3c7', color: '#92400e' },
            HIGH:      { emoji: '🚨', label: 'High Risk', cls: 'fraud-high',      bg: '#fee2e2', color: '#991b1b' },
            VERY_HIGH: { emoji: '🛑', label: 'Danger',    cls: 'fraud-very-high', bg: '#fca5a5', color: '#7f1d1d' },
            UNKNOWN:   { emoji: '❓', label: 'Unknown',   cls: 'fraud-unknown',   bg: '#f3f4f6', color: '#374151' },
        };
        const c = config[risk_level] || config.UNKNOWN;

        if(compact) {
            container.innerHTML = `
              <span class="fraud-badge-compact ${c.cls}" title="${recommendation}">
                ${c.emoji} ${c.label} (${risk_score || 0}/100)
              </span>`;
            return;
        }

        const flagsHTML = flags?.length
            ? flags.map(f => `
                <div class="fraud-flag fraud-flag--${f.severity.toLowerCase()}">
                  <strong>${f.severity}:</strong> ${f.message}
                </div>`).join('')
            : '<div class="fraud-flag fraud-flag--low">No issues detected.</div>';

        container.innerHTML = `
          <div class="fraud-panel" style="background:${c.bg}; border-left:4px solid ${c.color}">
            <div class="fraud-panel-header">
              <span style="color:${c.color}; font-weight:700; font-size:1.1em">${c.emoji} ${c.label} — Score ${risk_score || 0}/100</span>
              <div class="fraud-score-bar">
                <div class="fraud-score-fill" style="width:${risk_score || 0}%; background:${c.color}"></div>
              </div>
            </div>
            <p class="fraud-recommendation" style="color:${c.color}">${recommendation}</p>
            <div class="fraud-flags">${flagsHTML}</div>
          </div>`;
    },

    renderRecommendations(container, data) {
        const recs = data?.recommendations || [];
        if(!recs.length) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'block';
        const cards = recs.map(p => {
            const condEmoji = { new: '✨', 'like-new': '🌟', good: '👍', fair: '👌', poor: '⚠️' };
            const score = p.recommendation_score ? ` · ${Math.round(p.recommendation_score * 100)}% match` : '';
            return `
              <div class="rec-card" onclick="showProductDetails('${p._id || p.id}')">
                <div class="rec-card-cat">${DataManagerAPI?.getCategoryEmoji?.(p.category) || '📦'} ${p.category}</div>
                <div class="rec-card-title">${p.title}</div>
                <div class="rec-card-meta">
                  <span class="rec-price">₹${Number(p.price).toLocaleString('en-IN')}</span>
                  <span class="rec-cond">${condEmoji[p.condition] || ''} ${p.condition}</span>
                </div>
                <div class="rec-match">${score}</div>
              </div>`;
        }).join('');

        container.innerHTML = `
          <div class="rec-section">
            <h3 class="rec-title">🎯 Similar Items You Might Like</h3>
            <div class="rec-strip">${cards}</div>
          </div>`;
    },

    renderInsights(container, data) {
        if(!data || data.error) return;
        const { trending_categories = [], market_health = {} } = data;
        const rows = trending_categories.map(tc => `
          <div class="insight-row">
            <span class="insight-cat">${tc.category}</span>
            <span class="insight-count">${tc.listing_count} listings</span>
            <span class="insight-price">avg ₹${tc.avg_price?.toLocaleString('en-IN')}</span>
            <div class="insight-bar-wrap">
              <div class="insight-bar" style="width:${Math.min(tc.listing_count * 4, 100)}%"></div>
            </div>
          </div>`).join('');

        container.innerHTML = `
          <div class="insights-panel">
            <div class="insights-header">
              <span class="ai-badge">🤖 AI Market Insights</span>
              <small>Live • Updated just now</small>
            </div>
            <div class="insights-kpis">
              <div class="kpi"><span>${market_health.total_active_listings ?? 0}</span>Active Listings</div>
              <div class="kpi"><span>₹${Number(market_health.avg_market_price ?? 0).toLocaleString('en-IN')}</span>Avg Price</div>
              <div class="kpi"><span>${market_health.most_active_category ?? '—'}</span>Top Category</div>
            </div>
            <h4>🔥 Trending Categories</h4>
            ${rows}
          </div>`;
    }
};

window.AIService = AIService;
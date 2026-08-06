// productsAPI.js - Updated Product Manager for API Integration

const ProductManagerAPI = {
    currentFilter: { category: 'all', price: 'all', condition: 'all', search: '' },
    currentSort: 'newest',
    isViewingMyListings: false,
    currentProducts: [],

    init() { this.setupEventListeners(); },

    setupEventListeners() {
        const sellForm = document.getElementById('sellForm');
        if (sellForm) {
            sellForm.addEventListener('submit', (e) => {
                const editId = sellForm.getAttribute('data-edit-id');
                if (editId) { e.preventDefault(); this.handleEditForm(editId); } 
                else { this.handleSellForm(e); }
            });
        }
    },

    async displayProducts() {
        try {
            const grid = document.getElementById('productsGrid');
            UIManager.showLoading(grid);

            let products = [];
            if (this.isViewingMyListings) {
                const currentUser = AuthManager.getCurrentUser();
                if (currentUser) {
                    const res = await fetch(`/api/users/${currentUser.id}/products`);
                    const data = await res.json();
                    products = data.products || [];
                }
            } else {
                // 🆕 EXPLICIT FILTERING TO BACKEND
                const params = new URLSearchParams();
                if (this.currentFilter.category !== 'all') params.append('category', this.currentFilter.category);
                if (this.currentFilter.condition !== 'all') params.append('condition', this.currentFilter.condition);
                if (this.currentFilter.search) params.append('search', this.currentFilter.search);
                
                if (this.currentFilter.price !== 'all') {
                    if (this.currentFilter.price === '5000+') {
                        params.append('minPrice', '5000');
                    } else {
                        const [min, max] = this.currentFilter.price.split('-');
                        if (min) params.append('minPrice', min.replace('+', '').replace('₹', ''));
                        if (max) params.append('maxPrice', max);
                    }
                }

                const res = await fetch(`/api/products?${params.toString()}`);
                const data = await res.json();
                products = data.products || [];
                products = this.sortProducts(products, this.currentSort);
            }

            this.currentProducts = products;

            if (products.length === 0) {
                grid.innerHTML = `
                    <div class="no-products">
                        <h3>😔 No items found</h3>
                        <p>Try adjusting your search or filters, or be the first to list an item!</p>
                    </div>`;
                return;
            }

            grid.innerHTML = products.map(product => this.renderProductCard(product)).join('');
            this.animateProductCards();

        } catch (error) {
            document.getElementById('productsGrid').innerHTML = `<div class="no-products"><h3>⚠️ Error Loading Products</h3></div>`;
        }
    },

    renderProductCard(product) {
        const isMyListing = this.isViewingMyListings;
        const sellerName = typeof product.seller === 'object' ? `${product.seller.name} (${product.seller.course})` : product.seller || 'Unknown Seller';
        const imageHTML = product.imageUrl ? `<img src="${product.imageUrl}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size: 3.5rem;">${DataManagerAPI.getCategoryEmoji(product.category)}</div>`;
        const isAdmin = AuthManager.getCurrentUser()?.role === 'admin';

        return `
            <div class="product-card stagger-item" data-category="${product.category}" data-price="${product.price}" data-product-id="${product._id || product.id}" style="${product.status === 'sold_out' ? 'opacity: 0.6;' : ''}">
                <div class="product-image">${imageHTML}</div>
                <div class="product-info">
                    <div class="fraud-badge-slot" style="margin-bottom:8px"></div>
                    <div class="product-title">${product.title}</div>
                    <div class="product-price">${DataManagerAPI.formatPrice(product.price)}</div>
                    <div class="product-seller">Seller: ${sellerName}</div>
                    
                    <div style="margin: 10px 0; padding: 5px 12px; background: ${DataManagerAPI.getConditionColor(product.condition)}; border-radius: 15px; display: inline-block; font-size: 0.85rem; font-weight: 600;">
                        ${DataManagerAPI.getConditionEmoji(product.condition)} ${product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}
                    </div>

                    ${isMyListing || isAdmin ? `
                        <div style="margin: 8px 0; font-size: 0.85rem; font-weight: bold; color: ${product.status === 'sold_out' ? '#dc3545' : '#28a745'};">
                            📦 ${product.quantity !== undefined ? product.quantity : 1} in stock ${product.status === 'sold_out' ? '(SOLD OUT)' : ''}
                        </div>
                    ` : ''}

                    ${isMyListing ? `<div style="margin: 10px 0; color: #666; font-size: 0.85rem;">👁️ ${product.views || 0} views</div>` : ''}
                    
                    <div class="product-actions" style="flex-wrap: wrap;">
                        <button class="btn btn-primary btn-small" onclick="ProductManagerAPI.showProductDetails('${product._id || product.id}')">👁️ View Details</button>
                        ${isMyListing && product.status !== 'sold_out' ? `<button class="btn btn-secondary btn-small" onclick="ProductManagerAPI.markItemAsSold('${product._id || product.id}')" style="background: #f59e0b; color: white;">🤝 Sell 1</button>` : ''}
                        ${isMyListing ? `
                            <button class="btn btn-secondary btn-small" onclick="ProductManagerAPI.editItem('${product._id || product.id}')" style="background: #28a745; color: white;">✏️ Edit</button>
                            <button class="btn btn-secondary btn-small" onclick="ProductManagerAPI.removeItem('${product._id || product.id}')" style="background: #dc3545; color: white;">🗑️ Remove</button>
                        ` : ''}
                        ${isAdmin && !isMyListing ? `<button class="btn btn-secondary btn-small" onclick="ProductManagerAPI.adminDelete('${product._id || product.id}')" style="background: #dc3545; color: white;">🗑️ Admin Delete</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    async markItemAsSold(productId) {
        if (!confirm('Sell 1 unit of this item? (It will be hidden from the store if quantity hits 0)')) return;
        try {
            const response = await fetch(`/api/products/${productId}/sell-one`, {
                method: 'PUT', headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const data = await response.json();
            if (response.ok) {
                UIManager.showSuccessMessage(data.product.quantity === 0 ? 'Item completely sold out!' : `${data.product.quantity} units remaining.`);
                if (this.isViewingMyListings) await this.showMyListings(); else await this.displayProducts();
                await UIManagerAPI.updateStats(); 
            } else { UIManager.showNotification(data.message, 'error'); }
        } catch (error) { UIManager.showNotification('Failed to mark item as sold.', 'error'); }
    },

    sortProducts(products, sortBy) {
        return [...products].sort((a, b) => {
            switch(sortBy) {
                case 'newest': return new Date(b.createdAt || b.dateAdded) - new Date(a.createdAt || a.dateAdded);
                case 'price-low': return a.price - b.price;
                case 'price-high': return b.price - a.price;
                case 'title': return a.title.localeCompare(b.title);
                case 'popular': return (b.views || 0) - (a.views || 0);
                default: return 0;
            }
        });
    },

    animateProductCards() {
        const cards = document.querySelectorAll('.product-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0'; card.style.transform = 'translateY(20px)';
            setTimeout(() => { card.style.transition = 'all 0.5s ease'; card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, index * 50); 
        });
    },

    // 🆕 FETCHING DIRECTLY FROM OUR RESTORED API ENDPOINT
    async showProductDetails(productId) {
        try {
            const res = await fetch(`/api/products/${productId}`);
            if (!res.ok) throw new Error('Product not found');
            const product = await res.json();

            const timeAgo = DataManagerAPI.getTimeAgo(product.createdAt || product.dateAdded);
            const sellerName = typeof product.seller === 'object' ? product.seller.name : 'Unknown Seller';
            const contactInfo = typeof product.seller === 'object' ? product.seller.email : product.contact || '';
            const sellerPhone = product.sellerPhone || product.phone || contactInfo;

            const imageDisplay = product.imageUrl 
                ? `<img src="${product.imageUrl}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">`
                : `<div class="product-detail-icon" style="font-size: 5rem;">${DataManagerAPI.getCategoryEmoji(product.category)}</div>`;

            document.getElementById('productDetails').innerHTML = `
                <div style="display: flex; align-items: center; gap: 25px; margin: 25px 0; flex-wrap: wrap;">
                    ${imageDisplay}
                    <div style="flex: 1; min-width: 200px;">
                        <h2 style="margin-bottom: 15px; color: #333; line-height: 1.3;">
                            ${product.title} ${product.status === 'sold_out' ? '<span style="color:#ef4444; font-size:1.2rem;">(SOLD OUT)</span>' : ''}
                        </h2>
                        <div style="font-size: 2rem; font-weight: bold; background: linear-gradient(45deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px;">
                            ${DataManagerAPI.formatPrice(product.price)}
                        </div>
                        <div style="display: flex; gap: 15px; margin: 15px 0; flex-wrap: wrap;">
                            <span style="padding: 8px 16px; background: ${DataManagerAPI.getConditionColor(product.condition)}; border-radius: 20px; font-weight: 600; font-size: 0.9rem;">
                                ${DataManagerAPI.getConditionEmoji(product.condition)} ${product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}
                            </span>
                            <span style="padding: 8px 16px; background: rgba(102, 126, 234, 0.1); border-radius: 20px; font-weight: 600; color: #667eea; font-size: 0.9rem;">
                                ${DataManagerAPI.getCategoryEmoji(product.category)} ${DataManagerAPI.getCategoryName(product.category)}
                            </span>
                        </div>
                        <div style="color: #333; margin: 8px 0; font-weight: bold;">📦 Quantity Available: ${product.quantity !== undefined ? product.quantity : 1}</div>
                        <div style="color: #666; margin: 8px 0;">👤 <strong>Seller:</strong> ${sellerName}</div>
                        <div style="color: #666; font-size: 0.9rem;">🕒 <strong>Posted:</strong> ${timeAgo}</div>
                        <div style="color: #666; font-size: 0.9rem;">👁️ <strong>Views:</strong> ${product.views || 0}</div>
                    </div>
                </div>
                
                <div style="margin: 30px 0; padding: 25px; background: rgba(102, 126, 234, 0.05); border-radius: 20px; border-left: 4px solid #667eea;">
                    <h4 style="margin-bottom: 15px; color: #333; display: flex; align-items: center; gap: 10px;">📝 <span>Detailed Description</span></h4>
                    <p style="line-height: 1.7; color: #555; font-size: 1rem;">${product.description}</p>
                </div>
                
                <div style="display: flex; gap: 15px; margin-top: 35px; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="showSellerContact('${sellerPhone}')" style="flex: 1; min-width: 200px; padding: 15px 25px;" ${product.status === 'sold_out' ? 'disabled' : ''}>
                        📞 ${product.status === 'sold_out' ? 'Item Unavailable' : 'Contact Seller'}
                    </button>
                    <button class="btn btn-secondary" onclick="ProductManagerAPI.shareProduct('${product._id || product.id}')" style="padding: 15px 25px;">🔗 Share</button>
                    <button class="btn btn-secondary" onclick="ProductManagerAPI.closeProductModal()" style="padding: 15px 25px;">✖️ Close</button>
                </div>
            `;
            
            document.getElementById('productModal').style.display = 'block'; document.body.style.overflow = 'hidden';
        } catch (error) { UIManager.showNotification('Error loading product details', 'error'); }
    },

    async handleSellForm(e) {
        e.preventDefault();
        if (!AuthManager.isLoggedIn()) { UIManager.showNotification('Please login to list items', 'error'); return; }

        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        try {
            submitButton.textContent = 'Uploading...'; submitButton.disabled = true;

            const title = document.getElementById('itemTitle').value.trim();
            const category = document.getElementById('itemCategory').value;
            const price = parseInt(document.getElementById('itemPrice').value);
            const quantity = parseInt(document.getElementById('itemQuantity')?.value) || 1; 
            const condition = document.getElementById('itemCondition').value;
            const description = document.getElementById('itemDescription').value.trim();
            
            const sellerPhoneRaw = document.getElementById('sellerPhone').value;
            const sellerPhone = sellerPhoneRaw.replace(/\s+/g, '');
            if (!/^\+91[0-9]{10}$/.test(sellerPhone)) throw new Error('Phone number must be +91 followed by exactly 10 digits.');

            const imageFile = document.getElementById('itemImage')?.files[0];
            if (!title || !category || !condition || !description || !sellerPhone) throw new Error('Please fill in all required fields');

            let imageUrl = null;
            if (imageFile) {
                const formData = new FormData(); formData.append('image', imageFile);
                const uploadRes = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }, body: formData });
                if (!uploadRes.ok) throw new Error('Image upload failed.');
                imageUrl = (await uploadRes.json()).imageUrl;
            }

            submitButton.textContent = 'Listing Item...';
            const productData = { title, category, price, quantity, condition, description, sellerPhone, imageUrl };
            await DataManagerAPI.addProduct(productData);
            
            this.closeSellModal();
            await this.displayProducts();
            await UIManagerAPI.updateStats();
            UIManager.showSuccessMessage('Item listed successfully!');
        } catch (error) { UIManager.showNotification(error.message, 'error'); } 
        finally { submitButton.textContent = originalText; submitButton.disabled = false; }
    },

    async handleEditForm(editId) {
        if (!AuthManager.isLoggedIn()) return;
        try {
            const sellerPhoneRaw = document.getElementById('sellerPhone').value;
            const sellerPhone = sellerPhoneRaw.replace(/\s+/g, '');
            if (!/^\+91[0-9]{10}$/.test(sellerPhone)) throw new Error('Phone number must be +91 followed by exactly 10 digits.');

            const updates = {
                title: document.getElementById('itemTitle').value.trim(),
                category: document.getElementById('itemCategory').value,
                price: parseInt(document.getElementById('itemPrice').value),
                quantity: parseInt(document.getElementById('itemQuantity')?.value) || 1,
                condition: document.getElementById('itemCondition').value,
                description: document.getElementById('itemDescription').value.trim(),
                sellerPhone: sellerPhone
            };

            await DataManagerAPI.updateProduct(editId, updates);
            this.closeSellModal();
            if (this.isViewingMyListings) await this.showMyListings(); else await this.displayProducts();
            await UIManagerAPI.updateStats();
            UIManager.showSuccessMessage('Item updated successfully!');
        } catch (error) { UIManager.showNotification(error.message, 'error'); }
    },

    async showMyListings() {
        if (!AuthManager.isLoggedIn()) { UIManager.showNotification('Please login to view your listings', 'error'); return; }
        this.isViewingMyListings = true;
        await this.displayProducts();
        document.getElementById('sectionTitle').textContent = '📋 My Listings';
        document.getElementById('backButton').classList.remove('hidden');
        document.querySelectorAll('.category-list li').forEach(li => li.classList.remove('active'));
    },

    async editItem(productId) {
        try {
            const res = await fetch(`/api/products/${productId}`);
            if(!res.ok) throw new Error();
            const product = await res.json();

            document.getElementById('itemTitle').value = product.title;
            document.getElementById('itemCategory').value = product.category;
            document.getElementById('itemPrice').value = product.price;
            if (document.getElementById('itemQuantity')) document.getElementById('itemQuantity').value = product.quantity !== undefined ? product.quantity : 1;
            document.getElementById('itemCondition').value = product.condition;
            document.getElementById('itemDescription').value = product.description;
            document.getElementById('sellerPhone').value = product.sellerPhone || '';

            const form = document.getElementById('sellForm');
            form.setAttribute('data-edit-id', productId);
            this.openSellModal();
            document.querySelector('#sellModal h2').textContent = '✏️ Edit Your Item';
            document.querySelector('#sellForm button[type="submit"]').textContent = '💾 Update Item';
        } catch (error) { UIManager.showNotification('Error loading item for editing', 'error'); }
    },

    async removeItem(productId) {
        if (confirm('Are you sure you want to remove this listing?')) {
            try {
                await DataManagerAPI.deleteProduct(productId);
                await UIManagerAPI.updateStats();
                UIManager.showSuccessMessage('Item removed successfully!');
                if (this.isViewingMyListings) await this.showMyListings(); else await this.displayProducts();
            } catch (error) { UIManager.showNotification('Error removing item', 'error'); }
        }
    },

    async adminDelete(id) {
        if(confirm('Admin Action: Permanently delete this listing?')) {
            try {
                await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } });
                await this.displayProducts();
                await UIManagerAPI.updateStats();
                UIManager.showSuccessMessage('Item forcefully removed by Admin.');
            } catch(e) { UIManager.showNotification('Failed to delete', 'error'); }
        }
    },

    async updateFilter(filterType, value) { this.currentFilter[filterType] = value; await this.displayProducts(); },
    async updateSort(sortBy) { this.currentSort = sortBy; await this.displayProducts(); },
    resetFiltersAndView() { this.currentFilter = { category: 'all', price: 'all', condition: 'all', search: '' }; this.currentSort = 'newest'; this.isViewingMyListings = false; },
    
    // Save to history before searching
    async searchProducts(query) { 
        this.currentFilter.search = query.toLowerCase(); 
        await this.displayProducts(); 
    },

    openSellModal() { if (!AuthManager.isLoggedIn()) { UIManager.showNotification('Please login to list items', 'error'); return; } document.getElementById('sellModal').style.display = 'block'; document.body.style.overflow = 'hidden'; },
    closeSellModal() { document.getElementById('sellModal').style.display = 'none'; document.getElementById('sellForm').reset(); document.body.style.overflow = 'auto'; document.getElementById('sellForm').removeAttribute('data-edit-id'); document.querySelector('#sellModal h2').textContent = '📝 List Your Item'; document.querySelector('#sellForm button[type="submit"]').textContent = '🚀 List Item for Sale'; },
    closeProductModal() { document.getElementById('productModal').style.display = 'none'; document.body.style.overflow = 'auto'; },
    shareProduct(productId) { const product = this.currentProducts.find(p => (p._id || p.id) === productId); if (!product) return; const shareText = `Check out this ${product.title} for ${DataManagerAPI.formatPrice(product.price)} on College Marketplace!`; if (navigator.share) { navigator.share({ title: product.title, text: shareText, url: window.location.href }); } else { navigator.clipboard.writeText(shareText + ' ' + window.location.href).then(() => { UIManager.showSuccessMessage('Product link copied to clipboard!'); }); } }
};

const UIManagerAPI = {
    async updateStats() {
        try {
            const stats = await DataManagerAPI.getStats();
            document.getElementById('totalItems').textContent = stats.totalItems; document.getElementById('activeUsers').textContent = stats.activeUsers; document.getElementById('totalSales').textContent = stats.totalSales; document.getElementById('avgPrice').textContent = DataManagerAPI.formatPrice(stats.avgPrice);
        } catch (error) { document.getElementById('totalItems').textContent = '0'; document.getElementById('activeUsers').textContent = '0'; document.getElementById('totalSales').textContent = '0'; document.getElementById('avgPrice').textContent = DataManagerAPI.formatPrice(0); }
    }
};

function openSellModal() { ProductManagerAPI.openSellModal(); }
function closeSellModal() { ProductManagerAPI.closeSellModal(); }
function showProductDetails(productId) { ProductManagerAPI.showProductDetails(productId); }
function closeProductModal() { ProductManagerAPI.closeProductModal(); }
function showMyListings() { ProductManagerAPI.showMyListings(); }

window.ProductManager = ProductManagerAPI;
window.ProductManagerAPI = ProductManagerAPI;
window.UIManagerAPI = UIManagerAPI;
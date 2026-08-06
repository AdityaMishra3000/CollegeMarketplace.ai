// ui.js - UI Management and Interactions

const UIManager = {
    // Initialize UI components
    init() {
        this.createFloatingParticles();
        this.setupMainAppEventListeners();
        this.setupModalEventListeners();
        this.setupKeyboardShortcuts();
        this.startRealTimeUpdates();
    },

    // Create floating particles background
    createFloatingParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 20 + 's';
            particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
            particlesContainer.appendChild(particle);
        }
    },

    // Setup main app event listeners
    setupMainAppEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                ProductManager.searchProducts(e.target.value);
            });
        }

        // Sort functionality
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                ProductManager.updateSort(e.target.value);
            });
        }

        // Category filters
        document.querySelectorAll('.category-list li').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelector('.category-list li.active')?.classList.remove('active');
                item.classList.add('active');
                ProductManager.updateFilter('category', item.dataset.category);
                this.updateSectionTitle(item.dataset.category);
            });
        });

        // Price filters
        document.querySelectorAll('#priceFilters .filter-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                document.querySelector('#priceFilters .filter-tag.active')?.classList.remove('active');
                tag.classList.add('active');
                ProductManager.updateFilter('price', tag.dataset.price);
            });
        });

        // Condition filters
        document.querySelectorAll('#conditionFilters .filter-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                document.querySelector('#conditionFilters .filter-tag.active')?.classList.remove('active');
                tag.classList.add('active');
                ProductManager.updateFilter('condition', tag.dataset.condition);
            });
        });
    },

    // Setup modal event listeners
    setupModalEventListeners() {
        // Close modals when clicking outside
        window.addEventListener('click', (event) => {
            const sellModal = document.getElementById('sellModal');
            const productModal = document.getElementById('productModal');
            
            if (event.target === sellModal) {
                ProductManager.closeSellModal();
            }
            if (event.target === productModal) {
                ProductManager.closeProductModal();
            }
        });
    },

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ProductManager.closeSellModal();
                ProductManager.closeProductModal();
            }

            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // Ctrl/Cmd + N for new listing (only when logged in)
            if ((e.ctrlKey || e.metaKey) && e.key === 'n' && AuthManager.isLoggedIn()) {
                e.preventDefault();
                ProductManager.openSellModal();
            }
        });
    },

    // Update section title based on category
    updateSectionTitle(category) {
        const categoryNames = {
            'all': 'All Items',
            'textbooks': 'Textbooks',
            'electronics': 'Electronics',
            'furniture': 'Furniture',
            'clothing': 'Clothing',
            'sports': 'Sports & Recreation',
            'other': 'Other Items'
        };
        const titleElement = document.getElementById('sectionTitle');
        if (titleElement) {
            titleElement.textContent = `${DataManager.getCategoryEmoji(category) || ''} ${categoryNames[category] || 'Items'}`;
        }
    },

    // Update statistics display
    updateStats() {
        const stats = DataManager.getStats();
        
        const elements = {
            totalItems: document.getElementById('totalItems'),
            activeUsers: document.getElementById('activeUsers'),
            totalSales: document.getElementById('totalSales'),
            avgPrice: document.getElementById('avgPrice')
        };

        if (elements.totalItems) elements.totalItems.textContent = stats.totalItems;
        if (elements.activeUsers) elements.activeUsers.textContent = stats.activeUsers;
        if (elements.totalSales) elements.totalSales.textContent = stats.totalSales;
        if (elements.avgPrice) elements.avgPrice.textContent = DataManager.formatPrice(stats.avgPrice);
    },

    // Show success message
    showSuccessMessage(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message notification';
        successDiv.textContent = message;
        successDiv.style.position = 'fixed';
        successDiv.style.top = '20px';
        successDiv.style.right = '20px';
        successDiv.style.zIndex = '10000';
        successDiv.style.maxWidth = '300px';
        successDiv.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 4000);
    },

    // Show loading state
    showLoading(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 15px; color: #666;">Loading...</p>
                </div>
            `;
        }
    },

    // Navigate to home page
    goToHomePage() {
        ProductManager.resetFiltersAndView();
        document.getElementById('backButton').classList.add('hidden');
        document.getElementById('sectionTitle').textContent = 'All Items';
        
        // Reset search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        // Reset active states
        document.querySelectorAll('.category-list li').forEach(li => li.classList.remove('active'));
        document.querySelector('.category-list li[data-category="all"]')?.classList.add('active');
        
        document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
        document.querySelectorAll('.filter-tag[data-price="all"], .filter-tag[data-condition="all"]').forEach(tag => tag.classList.add('active'));

        ProductManager.displayProducts();
        
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Reset filters and view state
    resetFiltersAndView() {
        ProductManager.resetFiltersAndView();
        
        // Reset UI elements
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        // Reset active states
        document.querySelectorAll('.category-list li').forEach(li => li.classList.remove('active'));
        document.querySelector('.category-list li[data-category="all"]')?.classList.add('active');
        
        document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
        document.querySelectorAll('.filter-tag[data-price="all"], .filter-tag[data-condition="all"]').forEach(tag => tag.classList.add('active'));

        // Reset sort
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.value = 'newest';
        }
    },

    // Start real-time updates
    startRealTimeUpdates() {
        setInterval(() => {
            if (document.getElementById('mainApp').classList.contains('hidden')) return;
            
            // Quietly fetch the real, updated stats from the backend every 45 seconds
            if (typeof UIManagerAPI !== 'undefined') {
                UIManagerAPI.updateStats();
            }
        }, 45000);
    },

    // Animate elements on scroll
    handleScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1
        });

        // Observe product cards
        document.qstartuerySelectorAll('.product-card').forEach(card => {
            observer.observe(card);
        });
    },

    // Toggle theme (if implementing dark mode)
    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        this.showSuccessMessage(`Switched to ${isDark ? 'dark' : 'light'} theme`);
    },

    // Initialize theme from localStorage
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    },

    // Show notification
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const colors = {
            success: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
            error: 'linear-gradient(135deg, #ffe6e6, #ffcccc)',
            warning: 'linear-gradient(135deg, #fff3cd, #ffeeba)',
            info: 'linear-gradient(135deg, #cce5ff, #b3d9ff)'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
            padding: 15px 20px;
            border-radius: 15px;
            background: ${colors[type] || colors.info};
            color: #333;
            font-weight: 500;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            animation: notificationSlide ${duration}ms ease-in-out;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    },

    // Show confirmation dialog
    showConfirm(message, onConfirm, onCancel = null) {
        if (confirm(message)) {
            onConfirm();
        } else if (onCancel) {
            onCancel();
        }
    },

    // Update page title with unread count (if implementing notifications)
    updatePageTitle(unreadCount = 0) {
        const baseTitle = 'College Marketplace';
        document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
    },

    // Format currency for display
    formatCurrency(amount) {
        return DataManager.formatPrice(amount);
    },

    // Debounce function for search
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Setup debounced search
    setupDebouncedSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const debouncedSearch = this.debounce((value) => {
                ProductManager.searchProducts(value);
            }, 300);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }
    },

    // Handle responsive navigation
    handleResponsiveNav() {
        const headerContent = document.querySelector('.header-content');
        if (window.innerWidth <= 768 && headerContent) {
            // Mobile layout adjustments
            headerContent.style.flexDirection = 'column';
        }
    },

    // Initialize responsive handlers
    initResponsive() {
        window.addEventListener('resize', this.handleResponsiveNav.bind(this));
        this.handleResponsiveNav(); // Initial check
    }
};

// Global functions for HTML onclick events
function goToHomePage() {
    UIManager.goToHomePage();
}
// apiService.js - Frontend API Integration Service

const API_BASE_URL = '/api';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.baseURL = API_BASE_URL;
    }

    // Helper method to get headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Helper method to handle API responses
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                this.logout();
            }
            throw new Error(data.message || 'An error occurred');
        }
        
        return data;
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Remove authentication token
    removeToken() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    }

    // Authentication Methods

    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: this.getHeaders(false),
                body: JSON.stringify(userData)
            });
            
            const data = await this.handleResponse(response);
            
            if (data.token) {
                this.setToken(data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
            }
            
            return data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(false),
                body: JSON.stringify({ email, password })
            });
            
            const data = await this.handleResponse(response);
            
            if (data.token) {
                this.setToken(data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
            }
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async getCurrentUser() {
        try {
            if (!this.token) return null;
            
            const response = await fetch(`${this.baseURL}/auth/me`, {
                headers: this.getHeaders()
            });
            
            const data = await this.handleResponse(response);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            return data.user;
        } catch (error) {
            console.error('Get current user error:', error);
            this.logout();
            return null;
        }
    }

    logout() {
        this.removeToken();
        // Redirect to start page or reload
        if (typeof AuthManager !== 'undefined') {
            AuthManager.showStartPage();
        }
    }

    // Product Methods

    async getProducts(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value !== 'all') {
                    queryParams.append(key, value);
                }
            });
            
            const response = await fetch(`${this.baseURL}/products?${queryParams}`);
            const data = await this.handleResponse(response);
            return data.products || [];
        } catch (error) {
            console.error('Get products error:', error);
            throw error;
        }
    }

    async getProduct(id) {
        try {
            const response = await fetch(`${this.baseURL}/products/${id}`);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Get product error:', error);
            throw error;
        }
    }

    async createProduct(productData) {
        try {
            const response = await fetch(`${this.baseURL}/products`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(productData)
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Create product error:', error);
            throw error;
        }
    }

    async updateProduct(id, productData) {
        try {
            const response = await fetch(`${this.baseURL}/products/${id}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(productData)
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Update product error:', error);
            throw error;
        }
    }

    async deleteProduct(id) {
        try {
            const response = await fetch(`${this.baseURL}/products/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Delete product error:', error);
            throw error;
        }
    }

    async getUserProducts(userId) {
        try {
            const response = await fetch(`${this.baseURL}/users/${userId}/products`, {
                headers: this.getHeaders()
            });
            
            const data = await this.handleResponse(response);
            return data.products || [];
        } catch (error) {
            console.error('Get user products error:', error);
            throw error;
        }
    }

    async showInterest(productId) {
        try {
            const response = await fetch(`${this.baseURL}/products/${productId}/interest`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Show interest error:', error);
            throw error;
        }
    }

    // Statistics

    async getStats() {
        try {
            const response = await fetch(`${this.baseURL}/stats`);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Get stats error:', error);
            return {
                totalItems: 0,
                activeUsers: 150,
                totalSales: 0,
                avgPrice: 0
            };
        }
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'ERROR' };
        }
    }

    // Utility method to check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }
}

// Create global instance
const apiService = new ApiService();

// Updated DataManager to use API instead of localStorage
const DataManagerAPI = {
    // User management
    async findUser(email, password) {
        try {
            const data = await apiService.login(email, password);
            return data.user;
        } catch (error) {
            console.error('Login failed:', error);
            return null;
        }
    },

    async addUser(userData) {
        try {
            const data = await apiService.register(userData);
            return data.user;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    },

    async getCurrentUser() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            return JSON.parse(savedUser);
        }
        return await apiService.getCurrentUser();
    },

    // Product management
    async getProducts(filters = {}) {
        return await apiService.getProducts(filters);
    },

    async addProduct(productData) {
        try {
            const data = await apiService.createProduct(productData);
            return data.product;
        } catch (error) {
            console.error('Failed to create product:', error);
            throw error;
        }
    },

    async updateProduct(id, updates) {
        try {
            const data = await apiService.updateProduct(id, updates);
            return data.product;
        } catch (error) {
            console.error('Failed to update product:', error);
            throw error;
        }
    },

    async deleteProduct(id) {
        try {
            await apiService.deleteProduct(id);
            return true;
        } catch (error) {
            console.error('Failed to delete product:', error);
            throw error;
        }
    },

    async getProductById(id) {
        try {
            return await apiService.getProduct(id);
        } catch (error) {
            console.error('Failed to get product:', error);
            return null;
        }
    },

    async getProductsByUser(userId) {
        try {
            return await apiService.getUserProducts(userId);
        } catch (error) {
            console.error('Failed to get user products:', error);
            return [];
        }
    },

    // Search and filter (now handled by API)
    async filterProducts(filters) {
        const searchFilters = {};
        
        if (filters.category && filters.category !== 'all') {
            searchFilters.category = filters.category;
        }
        
        if (filters.condition && filters.condition !== 'all') {
            searchFilters.condition = filters.condition;
        }
        
        if (filters.price && filters.price !== 'all') {
            switch(filters.price) {
                case '0-1000':
                    searchFilters.minPrice = 0;
                    searchFilters.maxPrice = 1000;
                    break;
                case '1000-5000':
                    searchFilters.minPrice = 1000;
                    searchFilters.maxPrice = 5000;
                    break;
                case '5000+':
                    searchFilters.minPrice = 5000;
                    break;
            }
        }
        
        if (filters.search) {
            searchFilters.search = filters.search;
        }
        
        return await this.getProducts(searchFilters);
    },

    async sortProducts(products, sortBy) {
        // Sorting is now handled by the API
        const sortedProducts = await this.getProducts({ sort: sortBy });
        return sortedProducts;
    },

    // Statistics
    async getStats() {
        try {
            return await apiService.getStats();
        } catch (error) {
            console.error('Failed to get stats:', error);
            return {
                totalItems: 0,
                activeUsers: 150,
                totalSales: 0,
                avgPrice: 0
            };
        }
    },

    // Utility functions remain the same
    formatPrice(price) {
        return `₹${price.toLocaleString('en-IN')}`;
    },

    getConditionColor(condition) {
        const conditionConfig = {
            'new': 'linear-gradient(135deg, #d4edda, #c3e6cb)',
            'like-new': 'linear-gradient(135deg, #cce5ff, #b3d9ff)',
            'good': 'linear-gradient(135deg, #fff3cd, #ffeeba)',
            'fair': 'linear-gradient(135deg, #ffeaa7, #fdcb6e)',
            'poor': 'linear-gradient(135deg, #f8d7da, #f5c6cb)'
        };
        return conditionConfig[condition] || conditionConfig['good'];
    },

    getConditionEmoji(condition) {
        const conditionConfig = {
            'new': '✨',
            'like-new': '🌟',
            'good': '👍',
            'fair': '👌',
            'poor': '⚠️'
        };
        return conditionConfig[condition] || '👍';
    },

    getCategoryEmoji(category) {
        const categoryConfig = {
            'textbooks': '📚',
            'electronics': '💻',
            'furniture': '🪑',
            'clothing': '👕',
            'sports': '⚽',
            'other': '🔧'
        };
        return categoryConfig[category] || '🔧';
    },

    getCategoryName(category) {
        const categoryConfig = {
            'textbooks': 'Textbooks',
            'electronics': 'Electronics',
            'furniture': 'Furniture',
            'clothing': 'Clothing',
            'sports': 'Sports & Recreation',
            'other': 'Other'
        };
        return categoryConfig[category] || 'Other';
    },

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffDays > 7) return date.toLocaleDateString('en-IN');
        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        return 'Just now';
    },

    // No longer needed with API
    saveToStorage() {
        // API handles persistence
        console.log('Data automatically saved to database');
    },

    loadFromStorage() {
        // Data loaded from API
        console.log('Data loaded from database via API');
    }
};

// Export for use in other files
window.apiService = apiService;
window.DataManagerAPI = DataManagerAPI;
// authAPI.js - Updated Authentication Manager for API Integration

let currentUser = null;

const AuthManagerAPI = {
    // Initialize authentication
    init() {
        this.checkAuthState();
        this.setupEventListeners();
    },

    // Check if user is already logged in
    async checkAuthState() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                apiService.setToken(token);
                const user = await apiService.getCurrentUser();
                if (user) {
                    currentUser = user;
                    this.showMainApp();
                } else {
                    this.showStartPage();
                }
            } catch (error) {
                console.error('Error checking auth state:', error);
                this.logout();
            }
        } else {
            this.showStartPage();
        }
    },

    // Set up authentication event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginFormElement');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Register form
        const registerForm = document.getElementById('registerFormElement');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }
    },

    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Basic validation
        if (!email || !password) {
            this.showError('loginError', 'Please fill in all fields.');
            return;
        }

        try {
            // Show loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Logging in...';
            submitButton.disabled = true;

            const response = await apiService.login(email, password);
            
            currentUser = response.user;
            this.showMainApp();
            this.hideError('loginError');
            UIManager.showSuccessMessage('Welcome back! Happy shopping!');

        } catch (error) {
            console.error('Login error:', error);
            this.showError('loginError', error.message || 'Login failed. Please try again.');
        } finally {
            // Reset button state
            const submitButton = e.target.querySelector('button[type="submit"]');
            submitButton.textContent = 'Login & Start Shopping 🛍️';
            submitButton.disabled = false;
        }
    },

    // Handle registration form submission
    async handleRegister(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('registerName').value.trim(),
            email: document.getElementById('registerEmail').value.trim(),
            phone: document.getElementById('registerPhone').value.trim(),
            course: document.getElementById('registerCourse').value,
            year: document.getElementById('registerYear').value,
            password: document.getElementById('registerPassword').value,
            confirmPassword: document.getElementById('registerConfirmPassword').value
        };

        // Validation
        const validation = this.validateRegistration(formData);
        if (!validation.isValid) {
            this.showError('registerError', validation.message);
            return;
        }

        try {
            // Show loading state
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Creating Account...';
            submitButton.disabled = true;

            const response = await apiService.register({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                course: formData.course,
                year: formData.year,
                password: formData.password
            });

            currentUser = response.user;
            this.showMainApp();
            this.hideError('registerError');
            UIManager.showSuccessMessage('Account created successfully! Welcome to College Marketplace!');

        } catch (error) {
            console.error('Registration error:', error);
            this.showError('registerError', error.message || 'Registration failed. Please try again.');
        } finally {
            // Reset button state
            const submitButton = e.target.querySelector('button[type="submit"]');
            submitButton.textContent = 'Create Account & Start Selling 🚀';
            submitButton.disabled = false;
        }
    },

    // Validate registration data (same as before)
    validateRegistration(data) {
        if (!data.name || data.name.length < 2) {
            return { isValid: false, message: 'Please enter a valid full name (at least 2 characters).' };
        }

        if (!data.email || !this.isValidEmail(data.email)) {
            return { isValid: false, message: 'Please enter a valid email address.' };
        }

        // 👇 UPDATED STRICT FRONTEND CHECK
        if (!data.email.toLowerCase().endsWith('.edu.in')) {
            return { isValid: false, message: 'Access restricted: You must register with a valid .edu.in college email.' };
        }

        if (!data.phone || !this.isValidPhone(data.phone)) {
            return { isValid: false, message: 'Please enter a valid phone number.' };
        }

        if (!data.course) {
            return { isValid: false, message: 'Please select your course/department.' };
        }

        if (!data.year) {
            return { isValid: false, message: 'Please select your year of study.' };
        }

        if (!data.password || data.password.length < 6) {
            return { isValid: false, message: 'Password must be at least 6 characters long.' };
        }

        if (data.password !== data.confirmPassword) {
            return { isValid: false, message: 'Passwords do not match! Please try again.' };
        }

        return { isValid: true };
    },

    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Phone validation
    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    },

    // Show/hide pages
    showStartPage() {
        document.getElementById('startPage').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        this.hideAllAuthForms();
    },

    async showMainApp() {
        document.getElementById('startPage').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        if (currentUser) {
            const firstName = currentUser.name.split(' ')[0];
            const avatar = currentUser.name.charAt(0).toUpperCase();
            
            document.getElementById('userName').textContent = firstName;
            document.getElementById('userAvatar').textContent = avatar;
        }
        
        // Initialize main app with API data
        try {
            await ProductManagerAPI.displayProducts();
            await UIManagerAPI.updateStats();
        } catch (error) {
            console.error('Error initializing main app:', error);
            UIManager.showNotification('Error loading data. Please refresh the page.', 'error');
        }
    },

    // Show/hide auth forms (same as before)
    showLoginForm() {
        this.hideAllAuthForms();
        document.getElementById('loginForm').classList.remove('hidden');
    },

    showRegisterForm() {
        this.hideAllAuthForms();
        document.getElementById('registerForm').classList.remove('hidden');
    },

    hideAllAuthForms() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    },

    // Error handling (same as before)
    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
            setTimeout(() => this.hideError(elementId), 8000);
        }
    },

    hideError(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    },

    // Logout functionality
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            currentUser = null;
            apiService.logout(); // This will handle token removal
            this.showStartPage();
            this.resetForms();
            this.hideAllErrors();
            
            UIManager.showSuccessMessage('Logged out successfully! Come back soon!');
        }
    },

    // Reset all forms (same as before)
    resetForms() {
        const forms = ['loginFormElement', 'registerFormElement'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.reset();
            }
        });
    },

    // Hide all error messages
    hideAllErrors() {
        const errors = ['loginError', 'registerError'];
        errors.forEach(errorId => this.hideError(errorId));
    },

    // Get current user
    getCurrentUser() {
        return currentUser;
    },

    // Check if user is logged in
    isLoggedIn() {
        return currentUser !== null && apiService.isAuthenticated();
    },

    // Update user profile (placeholder for future implementation)
    async updateUserProfile(updates) {
        // This would need a backend endpoint to update user profile
        if (currentUser && updates) {
            Object.assign(currentUser, updates);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            return currentUser;
        }
        return null;
    }
};

// Global functions for HTML onclick events
function showLoginForm() {
    AuthManagerAPI.showLoginForm();
}

function showRegisterForm() {
    AuthManagerAPI.showRegisterForm();
}

function logout() {
    AuthManagerAPI.logout();
}

// Replace the original AuthManager with the API version
window.AuthManager = AuthManagerAPI;
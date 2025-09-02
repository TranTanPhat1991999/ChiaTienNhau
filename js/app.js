// ChiaCheck - Main Application

class ChiaCheckApp {
    constructor() {
        this.currentSession = null;
        this.isLoading = false;
        this.isDragging = false;
        this.suggestions = {
            members: [],
            locations: [],
            items: []
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // Show loading screen
            this.showLoading();
            
            // Initialize theme
            this.initializeTheme();
            
            // Load settings and suggestions
            await this.loadSettings();
            await this.loadSuggestions();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize session
            this.initializeSession();
            
            // Load recent sessions
            this.loadRecentSessions();
            
            // Setup auto-save
            this.setupAutoSave();
            
            // Register service worker for PWA
            this.registerServiceWorker();
            
            // Hide loading screen
            setTimeout(() => this.hideLoading(), 1000);
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showToast('Failed to initialize app', 'error');
        }
    }
    
    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen) loadingScreen.style.display = 'flex';
        if (app) app.style.display = 'none';
    }
    
    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
        
        if (app) {
            app.style.display = 'block';
            app.classList.add('fade-in');
        }
    }
    
    // Theme Management
    initializeTheme() {
        const savedTheme = window.storageManager.getSetting('theme') || 'light';
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const theme = savedTheme === 'auto' ? (prefersDark ? 'dark' : 'light') : savedTheme;
        
        this.setTheme(theme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (window.storageManager.getSetting('theme') === 'auto') {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        
        // Add transition class temporarily
        document.body.classList.add('theme-transitioning');
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 300);
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        this.setTheme(newTheme);
        window.storageManager.setSetting('theme', newTheme);
        
        this.showToast(`Switched to ${newTheme} mode`, 'success');
    }
    
    // Settings Management
    async loadSettings() {
        const settings = window.storageManager.getSettings();
        
        // Apply currency setting
        if (window.calculationEngine) {
            window.calculationEngine.currency = settings.currency || 'VND';
        }
        
        // Apply auto-save settings
        if (window.autoSaveManager) {
            window.autoSaveManager.isEnabled = settings.autoSave !== false;
            window.autoSaveManager.interval = settings.autoSaveInterval || 30000;
        }
    }
    
    async loadSuggestions() {
        this.suggestions = window.storageManager.getSuggestions();
    }
    
    // Event Listeners Setup
    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Mobile menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }
        
        // Session management
        document.getElementById('new-session')?.addEventListener('click', () => this.newSession());
        document.getElementById('save-session')?.addEventListener('click', () => this.saveSession());
        document.getElementById('export-pdf')?.addEventListener('click', () => this.exportPDF());
        
        // Date validation
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        if (startDate && endDate) {
            startDate.addEventListener('change', () => this.validateDateRange());
            endDate.addEventListener('change', () => this.validateDateRange());
        }
        
        // Location management
        const locationInput = document.getElementById('location');
        const getLocationBtn = document.getElementById('get-location');
        
        if (locationInput) {
            locationInput.addEventListener('input', () => this.handleLocationInput());
            locationInput.addEventListener('focus', () => this.showLocationSuggestions());
            locationInput.addEventListener('blur', () => {
                // Delay hiding to allow clicking on suggestions
                setTimeout(() => this.hideLocationSuggestions(), 150);
            });
        }
        
        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', () => this.getCurrentLocation());
        }
        
        // Member management
        const memberNameInput = document.getElementById('member-name');
        const addMemberBtn = document.getElementById('add-member');
        
        if (memberNameInput) {
            memberNameInput.addEventListener('input', () => this.handleMemberNameInput());
            memberNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addMember();
                }
            });
            memberNameInput.addEventListener('focus', () => this.showMemberSuggestions());
            memberNameInput.addEventListener('blur', () => {
                setTimeout(() => this.hideMemberSuggestions(), 150);
            });
        }
        
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', () => this.addMember());
        }
        
        // Banking info toggle
        const toggleBankInfo = document.getElementById('toggle-bank-info');
        if (toggleBankInfo) {
            toggleBankInfo.addEventListener('click', () => this.toggleBankingInfo());
        }
        
        // Recalculate button
        const recalculateBtn = document.getElementById('recalculate');
        if (recalculateBtn) {
            recalculateBtn.addEventListener('click', () => this.recalculate());
        }
        
        // Modal controls
        this.setupModalEventListeners();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Auto-calculation on input changes
        document.addEventListener('input', (e) => {
            if (e.target.matches('.item-price, .advance-amount')) {
                this.debouncedRecalculate();
            }
        });
        
        // Update progress on any change
        document.addEventListener('input', () => this.updateProgress());
        document.addEventListener('change', () => this.updateProgress());
    }
    
    setupModalEventListeners() {
        // Analytics modal
        const analyticsBtn = document.getElementById('analytics-btn');
        const analyticsModal = document.getElementById('analytics-modal');
        
        if (analyticsBtn && analyticsModal) {
            analyticsBtn.addEventListener('click', () => this.showAnalytics());
        }
        
        // Share modal
        const shareBtn = document.getElementById('share-btn');
        const shareModal = document.getElementById('share-modal');
        
        if (shareBtn && shareModal) {
            shareBtn.addEventListener('click', () => this.showShareModal());
        }
        
        // Close modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.hideModal(modal);
            });
        });
        
        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    this.hideModal(openModal);
                }
            }
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S: Save session
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveSession();
            }
            
            // Ctrl/Cmd + E: Export PDF
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.exportPDF();
            }
            
            // Ctrl/Cmd + N: New session
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.newSession();
            }
            
            // Ctrl/Cmd + Z: Undo (placeholder for future implementation)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                // TODO: Implement undo functionality
            }
        });
    }
    
    // Mobile Menu
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.mobile-overlay') || this.createMobileOverlay();
        
        if (sidebar && overlay) {
            const isOpen = sidebar.classList.contains('open');
            
            if (isOpen) {
                sidebar.classList.remove('open');
                overlay.classList.remove('show');
            } else {
                sidebar.classList.add('open');
                overlay.classList.add('show');
            }
        }
    }
    
    createMobileOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.addEventListener('click', () => this.toggleMobileMenu());
        document.body.appendChild(overlay);
        return overlay;
    }
    
    // Session Management
    initializeSession() {
        this.currentSession = {
            id: this.generateId(),
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                name: ''
            },
            dateRange: {
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
            },
            location: '',
            members: [],
            totals: {
                totalCost: 0,
                totalAdvance: 0,
                memberCount: 0,
                costPerPerson: 0,
                remainingBalance: 0
            },
            settings: {
                theme: window.storageManager.getSetting('theme'),
                currency: window.storageManager.getSetting('currency'),
                showBankInfo: window.storageManager.getSetting('showBankInfo')
            }
        };
        
        // Set initial dates
        document.getElementById('start-date').value = this.currentSession.dateRange.startDate;
        document.getElementById('end-date').value = this.currentSession.dateRange.endDate;
        
        // Set auto-save
        if (window.autoSaveManager) {
            window.autoSaveManager.setCurrentSession(this.currentSession);
        }
        
        this.updateProgress();
    }
    
    newSession() {
        if (this.hasUnsavedChanges()) {
            if (!confirm('You have unsaved changes. Are you sure you want to start a new session?')) {
                return;
            }
        }
        
        this.initializeSession();
        this.clearAllInputs();
        this.updateDisplay();
        this.showToast('New session created', 'success');
    }
    
    saveSession() {
        if (!this.currentSession) {
            this.showToast('No session to save', 'error');
            return;
        }
        
        try {
            // Update session data from form
            this.updateSessionFromForm();
            
            // Generate name if not provided
            if (!this.currentSession.metadata.name) {
                this.currentSession.metadata.name = this.generateSessionName();
            }
            
            const success = window.storageManager.saveSession(this.currentSession);
            
            if (success) {
                this.showToast('Session saved successfully', 'success');
                this.loadRecentSessions();
            } else {
                this.showToast('Failed to save session', 'error');
            }
        } catch (error) {
            console.error('Save session failed:', error);
            this.showToast('Failed to save session', 'error');
        }
    }
    
    loadSession(sessionId) {
        try {
            const session = window.storageManager.getSession(sessionId);
            
            if (!session) {
                this.showToast('Session not found', 'error');
                return;
            }
            
            this.currentSession = session;
            this.populateFormFromSession();
            this.updateDisplay();
            this.showToast('Session loaded', 'success');
            
            // Update auto-save
            if (window.autoSaveManager) {
                window.autoSaveManager.setCurrentSession(this.currentSession);
            }
        } catch (error) {
            console.error('Load session failed:', error);
            this.showToast('Failed to load session', 'error');
        }
    }
    
    generateId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateSessionName() {
        const location = this.currentSession.location || 'Unknown Location';
        const date = new Date(this.currentSession.dateRange.startDate);
        const dateStr = date.toLocaleDateString();
        
        return `${location} - ${dateStr}`;
    }
    
    hasUnsavedChanges() {
        // Simple check - in a real app, you'd compare with last saved state
        return this.currentSession && this.currentSession.members.length > 0;
    }
    
    // Date Management
    validateDateRange() {
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        if (startDate && endDate && startDate.value && endDate.value) {
            if (new Date(startDate.value) > new Date(endDate.value)) {
                endDate.value = startDate.value;
                this.showToast('End date cannot be before start date', 'warning');
            }
            
            // Update session
            if (this.currentSession) {
                this.currentSession.dateRange.startDate = startDate.value;
                this.currentSession.dateRange.endDate = endDate.value;
            }
        }
    }
    
    // Location Management
    handleLocationInput() {
        const locationInput = document.getElementById('location');
        if (locationInput && this.currentSession) {
            this.currentSession.location = locationInput.value;
            this.showLocationSuggestions();
        }
    }
    
    showLocationSuggestions() {
        const locationInput = document.getElementById('location');
        const suggestionsContainer = document.getElementById('location-suggestions');
        
        if (!locationInput || !suggestionsContainer) return;
        
        const query = locationInput.value.toLowerCase().trim();
        const suggestions = this.suggestions.locations.filter(location => 
            location.toLowerCase().includes(query) && location.toLowerCase() !== query
        ).slice(0, 5);
        
        if (suggestions.length > 0 && query.length > 0) {
            suggestionsContainer.innerHTML = suggestions.map(suggestion => 
                `<div class="suggestion-item" data-value="${suggestion}">${suggestion}</div>`
            ).join('');
            
            // Add click listeners
            suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    locationInput.value = item.dataset.value;
                    this.currentSession.location = item.dataset.value;
                    this.hideLocationSuggestions();
                });
            });
            
            suggestionsContainer.classList.add('show');
        } else {
            this.hideLocationSuggestions();
        }
    }
    
    hideLocationSuggestions() {
        const suggestionsContainer = document.getElementById('location-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.remove('show');
        }
    }
    
    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showToast('Geolocation not supported', 'error');
            return;
        }
        
        const getLocationBtn = document.getElementById('get-location');
        const originalText = getLocationBtn.textContent;
        
        try {
            getLocationBtn.textContent = '📍 Getting...';
            getLocationBtn.disabled = true;
            
            const position = await this.getCurrentPosition();
            const address = await this.reverseGeocode(position.coords.latitude, position.coords.longitude);
            
            const locationInput = document.getElementById('location');
            if (locationInput) {
                locationInput.value = address;
                this.currentSession.location = address;
            }
            
            this.showToast('Location found', 'success');
        } catch (error) {
            console.error('Geolocation failed:', error);
            this.showToast('Failed to get location', 'error');
        } finally {
            getLocationBtn.textContent = originalText;
            getLocationBtn.disabled = false;
        }
    }
    
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            });
        });
    }
    
    async reverseGeocode(lat, lng) {
        try {
            // Using a simple approach - in production, you'd use a proper geocoding service
            return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch (error) {
            throw new Error('Reverse geocoding failed');
        }
    }
    
    // Member Management
    handleMemberNameInput() {
        this.showMemberSuggestions();
    }
    
    showMemberSuggestions() {
        const memberNameInput = document.getElementById('member-name');
        const suggestionsContainer = document.getElementById('member-suggestions');
        
        if (!memberNameInput || !suggestionsContainer) return;
        
        const query = memberNameInput.value.toLowerCase().trim();
        const existingNames = this.currentSession.members.map(m => m.name.toLowerCase());
        
        const suggestions = this.suggestions.members.filter(name => 
            name.toLowerCase().includes(query) && 
            name.toLowerCase() !== query &&
            !existingNames.includes(name.toLowerCase())
        ).slice(0, 5);
        
        if (suggestions.length > 0 && query.length > 0) {
            suggestionsContainer.innerHTML = suggestions.map(suggestion => 
                `<div class="suggestion-item" data-value="${suggestion}">${suggestion}</div>`
            ).join('');
            
            // Add click listeners
            suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    memberNameInput.value = item.dataset.value;
                    this.addMember();
                    this.hideMemberSuggestions();
                });
            });
            
            suggestionsContainer.classList.add('show');
        } else {
            this.hideMemberSuggestions();
        }
    }
    
    hideMemberSuggestions() {
        const suggestionsContainer = document.getElementById('member-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.remove('show');
        }
    }
    
    addMember() {
        const memberNameInput = document.getElementById('member-name');
        if (!memberNameInput || !this.currentSession) return;
        
        const name = memberNameInput.value.trim();
        
        if (!name) {
            this.showToast('Please enter a member name', 'warning');
            return;
        }
        
        // Check for duplicates (case-insensitive)
        const existingMember = this.currentSession.members.find(
            m => m.name.toLowerCase() === name.toLowerCase()
        );
        
        if (existingMember) {
            this.showToast('Member already exists', 'warning');
            return;
        }
        
        const member = {
            id: this.generateId(),
            name: name,
            items: [],
            advance: 0,
            bankInfo: {
                accountNumber: '',
                bankName: '',
                accountHolder: name
            }
        };
        
        this.currentSession.members.push(member);
        memberNameInput.value = '';
        
        this.updateMembersList();
        this.updateItemsSection();
        this.updateAdvanceSection();
        this.updateBankingSection();
        this.updateMemberCount();
        this.recalculate();
        
        this.showToast(`Added ${name}`, 'success');
    }
    
    removeMember(memberId) {
        if (!this.currentSession) return;
        
        const memberIndex = this.currentSession.members.findIndex(m => m.id === memberId);
        if (memberIndex === -1) return;
        
        const memberName = this.currentSession.members[memberIndex].name;
        
        if (confirm(`Remove ${memberName} from the session?`)) {
            this.currentSession.members.splice(memberIndex, 1);
            
            this.updateMembersList();
            this.updateItemsSection();
            this.updateAdvanceSection();
            this.updateBankingSection();
            this.updateMemberCount();
            this.recalculate();
            
            this.showToast(`Removed ${memberName}`, 'success');
        }
    }
    
    updateMembersList() {
        const membersList = document.getElementById('members-list');
        if (!membersList || !this.currentSession) return;
        
        if (this.currentSession.members.length === 0) {
            membersList.innerHTML = '<div class="empty-state">No members added yet</div>';
            return;
        }
        
        membersList.innerHTML = this.currentSession.members.map(member => `
            <div class="member-card" draggable="true" data-member-id="${member.id}">
                <div class="member-info">
                    <div class="member-avatar">${member.name.charAt(0).toUpperCase()}</div>
                    <div class="member-name">${member.name}</div>
                </div>
                <div class="member-actions">
                    <button type="button" class="remove-member" title="Remove ${member.name}">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        membersList.querySelectorAll('.remove-member').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberCard = e.target.closest('.member-card');
                const memberId = memberCard.dataset.memberId;
                this.removeMember(memberId);
            });
        });
        
        // Add drag and drop functionality
        this.setupMemberDragAndDrop();
    }
    
    setupMemberDragAndDrop() {
        const memberCards = document.querySelectorAll('.member-card');
        
        memberCards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.isDragging = true;
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.memberId);
            });
            
            card.addEventListener('dragend', () => {
                this.isDragging = false;
                card.classList.remove('dragging');
            });
            
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                
                const draggedId = e.dataTransfer.getData('text/plain');
                const targetId = card.dataset.memberId;
                
                if (draggedId !== targetId) {
                    this.reorderMembers(draggedId, targetId);
                }
            });
        });
    }
    
    reorderMembers(draggedId, targetId) {
        if (!this.currentSession) return;
        
        const members = this.currentSession.members;
        const draggedIndex = members.findIndex(m => m.id === draggedId);
        const targetIndex = members.findIndex(m => m.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Remove dragged member and insert at target position
        const [draggedMember] = members.splice(draggedIndex, 1);
        members.splice(targetIndex, 0, draggedMember);
        
        this.updateMembersList();
        this.updateItemsSection();
        this.updateAdvanceSection();
        this.updateBankingSection();
    }
    
    updateMemberCount() {
        const memberCountElement = document.getElementById('member-count');
        if (memberCountElement && this.currentSession) {
            const count = this.currentSession.members.length;
            memberCountElement.textContent = `${count} member${count !== 1 ? 's' : ''}`;
        }
    }
    
    // Progress Tracking
    updateProgress() {
        if (!this.currentSession) return;
        
        let completedSteps = 0;
        const totalSteps = 5;
        
        // Step 1: Date range
        if (this.currentSession.dateRange.startDate && this.currentSession.dateRange.endDate) {
            completedSteps++;
        }
        
        // Step 2: Location
        if (this.currentSession.location && this.currentSession.location.trim()) {
            completedSteps++;
        }
        
        // Step 3: Members
        if (this.currentSession.members.length > 0) {
            completedSteps++;
        }
        
        // Step 4: Items
        const hasItems = this.currentSession.members.some(m => m.items && m.items.length > 0);
        if (hasItems) {
            completedSteps++;
        }
        
        // Step 5: Calculations
        if (this.currentSession.totals && this.currentSession.totals.totalCost > 0) {
            completedSteps++;
        }
        
        const percentage = Math.round((completedSteps / totalSteps) * 100);
        
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');
        
        if (progressText) {
            progressText.textContent = `${percentage}% Complete`;
        }
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
    }
    
    // Utility Methods
    updateSessionFromForm() {
        if (!this.currentSession) return;
        
        // Update dates
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        if (startDate && endDate) {
            this.currentSession.dateRange.startDate = startDate.value;
            this.currentSession.dateRange.endDate = endDate.value;
        }
        
        // Update location
        const location = document.getElementById('location');
        if (location) {
            this.currentSession.location = location.value;
        }
        
        // Update timestamp
        this.currentSession.metadata.updatedAt = new Date().toISOString();
    }
    
    populateFormFromSession() {
        if (!this.currentSession) return;
        
        // Set dates
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        if (startDate && this.currentSession.dateRange.startDate) {
            startDate.value = this.currentSession.dateRange.startDate;
        }
        
        if (endDate && this.currentSession.dateRange.endDate) {
            endDate.value = this.currentSession.dateRange.endDate;
        }
        
        // Set location
        const location = document.getElementById('location');
        if (location && this.currentSession.location) {
            location.value = this.currentSession.location;
        }
        
        // Update all sections
        this.updateMembersList();
        this.updateItemsSection();
        this.updateAdvanceSection();
        this.updateBankingSection();
        this.updateMemberCount();
        this.recalculate();
    }
    
    clearAllInputs() {
        // Clear form inputs
        document.getElementById('start-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('end-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('location').value = '';
        document.getElementById('member-name').value = '';
        
        // Clear lists
        document.getElementById('members-list').innerHTML = '<div class="empty-state">No members added yet</div>';
        document.getElementById('member-items').innerHTML = '<div class="empty-state">Add members to start adding items</div>';
        document.getElementById('advance-list').innerHTML = '<div class="empty-state">Add members to track advance payments</div>';
        document.getElementById('banking-forms').innerHTML = '<div class="empty-state">Add members to manage banking information</div>';
        document.getElementById('member-calculations').innerHTML = '<div class="empty-state">No calculations yet</div>';
        
        this.updateMemberCount();
        this.updateProgress();
    }
    
    updateDisplay() {
        this.updateMembersList();
        this.updateItemsSection();
        this.updateAdvanceSection();
        this.updateBankingSection();
        this.updateMemberCount();
        this.updateProgress();
        this.recalculate();
    }
    
    // Items & Costs Management
    updateItemsSection() {
        const memberItems = document.getElementById('member-items');
        if (!memberItems || !this.currentSession) return;
        
        if (this.currentSession.members.length === 0) {
            memberItems.innerHTML = '<div class="empty-state">Add members to start adding items</div>';
            return;
        }
        
        memberItems.innerHTML = this.currentSession.members.map(member => `
            <div class="member-items-section" data-member-id="${member.id}">
                <div class="member-items-header">
                    <h3>${member.name}'s Items</h3>
                    <span class="member-total">Total: <span id="member-total-${member.id}">0 VND</span></span>
                </div>
                
                <div class="add-item-form">
                    <div class="item-inputs">
                        <input type="text" class="item-name-input" placeholder="Item name" data-member-id="${member.id}">
                        <input type="text" class="item-price-input" placeholder="Price (e.g., 25000 or 2*25000)" data-member-id="${member.id}">
                        <button type="button" class="btn-primary add-item-btn" data-member-id="${member.id}">Add</button>
                    </div>
                    <div class="item-suggestions" id="item-suggestions-${member.id}"></div>
                </div>
                
                <div class="items-list" id="items-list-${member.id}">
                    ${this.renderMemberItems(member)}
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        this.setupItemsEventListeners();
        this.updateMemberTotals();
    }
    
    renderMemberItems(member) {
        if (!member.items || member.items.length === 0) {
            return '<div class="empty-items">No items added yet</div>';
        }
        
        return member.items.map((item, index) => `
            <div class="item-card" data-item-index="${index}">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${this.formatCurrency(window.calculationEngine?.parseExpression(item.price) || 0)}</span>
                </div>
                <button type="button" class="remove-item-btn" data-member-id="${member.id}" data-item-index="${index}">🗑️</button>
            </div>
        `).join('');
    }
    
    setupItemsEventListeners() {
        // Add item buttons
        document.querySelectorAll('.add-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberId = e.target.dataset.memberId;
                this.addItemToMember(memberId);
            });
        });
        
        // Remove item buttons
        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberId = e.target.dataset.memberId;
                const itemIndex = parseInt(e.target.dataset.itemIndex);
                this.removeItemFromMember(memberId, itemIndex);
            });
        });
        
        // Item name inputs - suggestions
        document.querySelectorAll('.item-name-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.showItemSuggestions(e.target);
            });
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const memberId = e.target.dataset.memberId;
                    this.addItemToMember(memberId);
                }
            });
        });
        
        // Price inputs - calculator support
        document.querySelectorAll('.item-price-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const memberId = e.target.dataset.memberId;
                    this.addItemToMember(memberId);
                }
            });
            
            input.addEventListener('blur', (e) => {
                this.formatPriceInput(e.target);
            });
        });
    }
    
    addItemToMember(memberId) {
        const member = this.currentSession.members.find(m => m.id === memberId);
        if (!member) return;
        
        const nameInput = document.querySelector(`.item-name-input[data-member-id="${memberId}"]`);
        const priceInput = document.querySelector(`.item-price-input[data-member-id="${memberId}"]`);
        
        if (!nameInput || !priceInput) return;
        
        const itemName = nameInput.value.trim();
        const itemPrice = priceInput.value.trim();
        
        if (!itemName) {
            this.showToast('Please enter an item name', 'warning');
            nameInput.focus();
            return;
        }
        
        if (!itemPrice) {
            this.showToast('Please enter an item price', 'warning');
            priceInput.focus();
            return;
        }
        
        // Validate price expression
        const parsedPrice = window.calculationEngine?.parseExpression(itemPrice);
        if (parsedPrice === null || parsedPrice < 0) {
            this.showToast('Please enter a valid price', 'warning');
            priceInput.focus();
            return;
        }
        
        // Add item to member
        if (!member.items) member.items = [];
        member.items.push({
            name: itemName,
            price: itemPrice
        });
        
        // Clear inputs
        nameInput.value = '';
        priceInput.value = '';
        
        // Update display
        this.updateItemsSection();
        this.recalculate();
        
        this.showToast(`Added ${itemName} to ${member.name}`, 'success');
    }
    
    removeItemFromMember(memberId, itemIndex) {
        const member = this.currentSession.members.find(m => m.id === memberId);
        if (!member || !member.items || itemIndex < 0 || itemIndex >= member.items.length) return;
        
        const itemName = member.items[itemIndex].name;
        
        if (confirm(`Remove ${itemName}?`)) {
            member.items.splice(itemIndex, 1);
            this.updateItemsSection();
            this.recalculate();
            this.showToast(`Removed ${itemName}`, 'success');
        }
    }
    
    showItemSuggestions(input) {
        const memberId = input.dataset.memberId;
        const query = input.value.toLowerCase().trim();
        const suggestionsContainer = document.getElementById(`item-suggestions-${memberId}`);
        
        if (!suggestionsContainer || query.length < 2) {
            if (suggestionsContainer) suggestionsContainer.classList.remove('show');
            return;
        }
        
        const suggestions = this.suggestions.items.filter(item => 
            item.name.toLowerCase().includes(query)
        ).slice(0, 5);
        
        if (suggestions.length > 0) {
            suggestionsContainer.innerHTML = suggestions.map(item => 
                `<div class="suggestion-item" data-name="${item.name}" data-price="${item.avgPrice}">
                    <span class="suggestion-name">${item.name}</span>
                    <span class="suggestion-price">${this.formatCurrency(item.avgPrice)}</span>
                </div>`
            ).join('');
            
            // Add click listeners
            suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    input.value = item.dataset.name;
                    const priceInput = document.querySelector(`.item-price-input[data-member-id="${memberId}"]`);
                    if (priceInput && !priceInput.value) {
                        priceInput.value = item.dataset.price;
                    }
                    suggestionsContainer.classList.remove('show');
                });
            });
            
            suggestionsContainer.classList.add('show');
        } else {
            suggestionsContainer.classList.remove('show');
        }
    }
    
    formatPriceInput(input) {
        const value = input.value.trim();
        if (!value) return;
        
        const parsed = window.calculationEngine?.parseExpression(value);
        if (parsed !== null && parsed >= 0) {
            // Show the calculated result as placeholder or tooltip
            input.title = `= ${this.formatCurrency(parsed)}`;
        }
    }
    
    updateMemberTotals() {
        if (!this.currentSession) return;
        
        this.currentSession.members.forEach(member => {
            const totalElement = document.getElementById(`member-total-${member.id}`);
            if (totalElement) {
                const total = (member.items || []).reduce((sum, item) => {
                    return sum + (window.calculationEngine?.parseExpression(item.price) || 0);
                }, 0);
                totalElement.textContent = this.formatCurrency(total);
            }
        });
        
        // Update session total
        const totalCostElement = document.getElementById('total-cost');
        if (totalCostElement && this.currentSession.totals) {
            totalCostElement.textContent = `Total: ${this.formatCurrency(this.currentSession.totals.totalCost)}`;
        }
    }
    
    // Advance Payments Management
    updateAdvanceSection() {
        const advanceList = document.getElementById('advance-list');
        if (!advanceList || !this.currentSession) return;
        
        if (this.currentSession.members.length === 0) {
            advanceList.innerHTML = '<div class="empty-state">Add members to track advance payments</div>';
            return;
        }
        
        advanceList.innerHTML = this.currentSession.members.map(member => `
            <div class="advance-item">
                <div class="advance-info">
                    <span class="member-name">${member.name}</span>
                    <div class="advance-input-group">
                        <input type="text" class="advance-amount" placeholder="0" 
                               value="${member.advance || ''}" data-member-id="${member.id}">
                        <span class="currency-label">VND</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        document.querySelectorAll('.advance-amount').forEach(input => {
            input.addEventListener('input', (e) => {
                const memberId = e.target.dataset.memberId;
                this.updateMemberAdvance(memberId, e.target.value);
            });
            
            input.addEventListener('blur', (e) => {
                this.formatAdvanceInput(e.target);
            });
        });
        
        this.updateAdvanceTotal();
    }
    
    updateMemberAdvance(memberId, value) {
        const member = this.currentSession.members.find(m => m.id === memberId);
        if (member) {
            member.advance = value;
            this.debouncedRecalculate();
            this.updateAdvanceTotal();
        }
    }
    
    formatAdvanceInput(input) {
        const value = input.value.trim();
        if (!value) return;
        
        const parsed = window.calculationEngine?.parseExpression(value);
        if (parsed !== null && parsed >= 0) {
            input.title = `= ${this.formatCurrency(parsed)}`;
        }
    }
    
    updateAdvanceTotal() {
        const totalAdvanceElement = document.getElementById('total-advance');
        if (totalAdvanceElement && this.currentSession) {
            const total = this.currentSession.members.reduce((sum, member) => {
                return sum + (window.calculationEngine?.parseExpression(member.advance) || 0);
            }, 0);
            totalAdvanceElement.textContent = `Total Advance: ${this.formatCurrency(total)}`;
        }
    }
    
    // Banking Information Management
    updateBankingSection() {
        const bankingForms = document.getElementById('banking-forms');
        if (!bankingForms || !this.currentSession) return;
        
        if (this.currentSession.members.length === 0) {
            bankingForms.innerHTML = '<div class="empty-state">Add members to manage banking information</div>';
            return;
        }
        
        bankingForms.innerHTML = this.currentSession.members.map(member => `
            <div class="banking-form" data-member-id="${member.id}">
                <h4>${member.name}'s Banking Information</h4>
                <div class="banking-inputs">
                    <div class="input-group">
                        <label>Account Holder Name</label>
                        <input type="text" class="bank-account-holder" 
                               value="${member.bankInfo?.accountHolder || member.name}" 
                               data-member-id="${member.id}">
                    </div>
                    <div class="input-group">
                        <label>Bank Name</label>
                        <input type="text" class="bank-name" 
                               value="${member.bankInfo?.bankName || ''}" 
                               data-member-id="${member.id}">
                    </div>
                    <div class="input-group">
                        <label>Account Number</label>
                        <input type="text" class="bank-account-number" 
                               value="${member.bankInfo?.accountNumber || ''}" 
                               data-member-id="${member.id}">
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        document.querySelectorAll('.bank-account-holder, .bank-name, .bank-account-number').forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateMemberBankInfo(e.target);
            });
        });
    }
    
    updateMemberBankInfo(input) {
        const memberId = input.dataset.memberId;
        const member = this.currentSession.members.find(m => m.id === memberId);
        
        if (!member) return;
        
        if (!member.bankInfo) {
            member.bankInfo = {
                accountHolder: member.name,
                bankName: '',
                accountNumber: ''
            };
        }
        
        if (input.classList.contains('bank-account-holder')) {
            member.bankInfo.accountHolder = input.value;
        } else if (input.classList.contains('bank-name')) {
            member.bankInfo.bankName = input.value;
        } else if (input.classList.contains('bank-account-number')) {
            member.bankInfo.accountNumber = input.value;
        }
    }
    
    toggleBankingInfo() {
        const bankingForms = document.getElementById('banking-forms');
        const toggleBtn = document.getElementById('toggle-bank-info');
        const toggleText = document.getElementById('bank-toggle-text');
        
        if (!bankingForms || !toggleBtn || !toggleText) return;
        
        const isVisible = bankingForms.style.display !== 'none';
        
        if (isVisible) {
            bankingForms.style.display = 'none';
            toggleText.textContent = 'Show Bank Info';
        } else {
            bankingForms.style.display = 'block';
            toggleText.textContent = 'Hide Bank Info';
            this.updateBankingSection();
        }
        
        // Update session settings
        if (this.currentSession && this.currentSession.settings) {
            this.currentSession.settings.showBankInfo = !isVisible;
        }
    }
    
    // Calculation Management
    recalculate() {
        if (!this.currentSession || !window.calculationEngine) return;
        
        try {
            const calculations = window.calculationEngine.calculateSession(this.currentSession);
            
            // Update session totals
            this.currentSession.totals = calculations.totals;
            
            // Update UI
            this.updateCalculationResults(calculations);
            this.updateMemberTotals();
            this.updateAdvanceTotal();
            this.updateProgress();
            
        } catch (error) {
            console.error('Calculation failed:', error);
            this.showToast('Calculation error: ' + error.message, 'error');
        }
    }
    
    updateCalculationResults(calculations) {
        // Update summary cards
        const summaryElements = {
            'summary-total-cost': calculations.totals.totalCost,
            'summary-cost-per-person': calculations.totals.costPerPerson,
            'summary-total-advance': calculations.totals.totalAdvance,
            'summary-remaining-balance': calculations.totals.remainingBalance
        };
        
        Object.entries(summaryElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = this.formatCurrency(value);
            }
        });
        
        // Update member calculations
        const memberCalculations = document.getElementById('member-calculations');
        if (memberCalculations && calculations.memberCalculations) {
            memberCalculations.innerHTML = calculations.memberCalculations.map(member => `
                <div class="member-calculation-card ${member.status}">
                    <div class="member-calc-header">
                        <h4>${member.name}</h4>
                        <span class="status-badge ${member.status}">${this.getStatusText(member.status)}</span>
                    </div>
                    <div class="member-calc-details">
                        <div class="calc-row">
                            <span>Should pay:</span>
                            <span>${this.formatCurrency(member.amountPerPerson)}</span>
                        </div>
                        <div class="calc-row">
                            <span>Advance paid:</span>
                            <span>${this.formatCurrency(member.advance)}</span>
                        </div>
                        <div class="calc-row final">
                            <span>${member.status === 'gets_refund' ? 'Gets refund:' : member.status === 'needs_to_pay' ? 'Needs to pay:' : 'Amount:'}}</span>
                            <span class="final-amount ${member.status}">${this.formatCurrency(member.finalAmount)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    getStatusText(status) {
        switch (status) {
            case 'needs_to_pay': return 'Needs to Pay';
            case 'gets_refund': return 'Gets Refund';
            case 'even': return 'Even';
            default: return 'Unknown';
        }
    }
    
    debouncedRecalculate() {
        if (this.recalculateTimeout) {
            clearTimeout(this.recalculateTimeout);
        }
        this.recalculateTimeout = setTimeout(() => {
            this.recalculate();
        }, 500);
    }
    
    // Session Management
    loadRecentSessions() {
        const recentSessions = document.getElementById('recent-sessions');
        if (!recentSessions) return;
        
        const recent = window.storageManager.getRecent();
        
        if (recent.length === 0) {
            recentSessions.innerHTML = '<div class="empty-state">No recent sessions</div>';
            return;
        }
        
        recentSessions.innerHTML = recent.map(session => `
            <div class="recent-session-item" data-session-id="${session.id}">
                <div class="session-info">
                    <h4>${session.name}</h4>
                    <p>${session.location}</p>
                    <small>${new Date(session.updatedAt).toLocaleDateString()} • ${session.memberCount} members</small>
                </div>
                <div class="session-cost">
                    ${this.formatCurrency(session.totalCost)}
                </div>
            </div>
        `).join('');
        
        // Add click listeners
        recentSessions.querySelectorAll('.recent-session-item').forEach(item => {
            item.addEventListener('click', () => {
                const sessionId = item.dataset.sessionId;
                this.loadSession(sessionId);
            });
        });
    }
    
    setupAutoSave() {
        // Auto-save is handled by the AutoSaveManager in storage.js
        // Just ensure it's properly configured
        if (window.autoSaveManager && this.currentSession) {
            window.autoSaveManager.setCurrentSession(this.currentSession);
        }
    }
    
    // Export Functions
    async exportPDF() {
        if (!this.currentSession || !window.pdfExporter) {
            this.showToast('PDF export not available', 'error');
            return;
        }
        
        try {
            // Ensure calculations are up to date
            this.recalculate();
            
            const calculations = window.calculationEngine.calculateSession(this.currentSession);
            
            await window.pdfExporter.exportSession(this.currentSession, calculations);
            this.showToast('PDF exported successfully', 'success');
            
        } catch (error) {
            console.error('PDF export failed:', error);
            this.showToast('PDF export failed: ' + error.message, 'error');
        }
    }
    
    // Analytics
    async showAnalytics() {
        const modal = document.getElementById('analytics-modal');
        if (!modal || !window.analyticsManager) {
            this.showToast('Analytics not available', 'error');
            return;
        }
        
        try {
            const sessions = window.storageManager.getSessions();
            if (sessions.length === 0) {
                this.showToast('No data available for analytics', 'warning');
                return;
            }
            
            const analytics = await window.analyticsManager.generateSessionAnalytics(sessions);
            
            // Create charts
            await window.analyticsManager.createExpenseChart('expense-chart', analytics);
            await window.analyticsManager.createMemberChart('member-chart', analytics);
            
            this.showModal(modal);
            
        } catch (error) {
            console.error('Analytics failed:', error);
            this.showToast('Analytics failed: ' + error.message, 'error');
        }
    }
    
    // Share Modal
    showShareModal() {
        const modal = document.getElementById('share-modal');
        if (!modal) return;
        
        if (!this.currentSession) {
            this.showToast('No session to share', 'warning');
            return;
        }
        
        // Setup share options
        this.setupShareOptions();
        this.showModal(modal);
    }
    
    setupShareOptions() {
        // Copy summary
        const copySummaryBtn = document.getElementById('copy-summary');
        if (copySummaryBtn) {
            copySummaryBtn.onclick = () => this.copySessionSummary();
        }
        
        // Generate QR code
        const generateQRBtn = document.getElementById('generate-qr');
        if (generateQRBtn) {
            generateQRBtn.onclick = () => this.generateQRCode();
        }
        
        // Export JSON
        const exportJSONBtn = document.getElementById('export-json');
        if (exportJSONBtn) {
            exportJSONBtn.onclick = () => this.exportSessionJSON();
        }
    }
    
    async copySessionSummary() {
        if (!this.currentSession) return;
        
        try {
            const calculations = window.calculationEngine.calculateSession(this.currentSession);
            const summary = window.calculationEngine.exportCalculations(calculations, 'summary');
            
            await navigator.clipboard.writeText(summary);
            this.showToast('Summary copied to clipboard', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showToast('Copy failed', 'error');
        }
    }
    
    async generateQRCode() {
        if (!this.currentSession || typeof QRCode === 'undefined') {
            this.showToast('QR code generation not available', 'error');
            return;
        }
        
        try {
            const sessionData = {
                id: this.currentSession.id,
                name: this.currentSession.metadata?.name || 'ChiaCheck Session',
                location: this.currentSession.location,
                members: this.currentSession.members.length,
                total: this.currentSession.totals?.totalCost || 0
            };
            
            const qrContainer = document.getElementById('qr-container');
            if (qrContainer) {
                qrContainer.innerHTML = '';
                
                await QRCode.toCanvas(qrContainer, JSON.stringify(sessionData), {
                    width: 200,
                    margin: 2
                });
                
                this.showToast('QR code generated', 'success');
            }
        } catch (error) {
            console.error('QR code generation failed:', error);
            this.showToast('QR code generation failed', 'error');
        }
    }
    
    exportSessionJSON() {
        if (!this.currentSession) return;
        
        try {
            const dataStr = JSON.stringify(this.currentSession, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `chiacheck-session-${Date.now()}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            this.showToast('Session exported as JSON', 'success');
        } catch (error) {
            console.error('JSON export failed:', error);
            this.showToast('JSON export failed', 'error');
        }
    }
    
    // Utility Methods
    formatCurrency(amount) {
        if (window.calculationEngine) {
            return window.calculationEngine.formatCurrency(amount);
        }
        return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' VND';
    }
    
    // PWA Service Worker Registration
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('ServiceWorker registered successfully:', registration.scope);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdateAvailable(registration);
                            }
                        });
                    }
                });
                
            } catch (error) {
                console.log('ServiceWorker registration failed:', error);
            }
        }
    }
    
    showUpdateAvailable(registration) {
        const updateToast = document.createElement('div');
        updateToast.className = 'toast update-toast';
        updateToast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">🔄</span>
                <span class="toast-message">App update available!</span>
                <button class="btn-primary update-btn">Update</button>
            </div>
        `;
        
        const updateBtn = updateToast.querySelector('.update-btn');
        updateBtn.addEventListener('click', () => {
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
        });
        
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            toastContainer.appendChild(updateToast);
        }
    }
    
    showModal(modal) {
        if (modal) {
            modal.classList.add('show');
        }
    }
    
    hideModal(modal) {
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    // Toast Notifications
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icon}</span>
                <span class="toast-message">${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;
        
        // Add close functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.removeToast(toast);
        }, 5000);
    }
    
    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }
    
    getToastIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chiaCheckApp = new ChiaCheckApp();
});

// Make showToast globally available
window.showToast = (message, type) => {
    if (window.chiaCheckApp) {
        window.chiaCheckApp.showToast(message, type);
    }
};

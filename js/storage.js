// ChiaCheck - LocalStorage Management System

class StorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            SESSIONS: 'chiacheck_sessions',
            TEMPLATES: 'chiacheck_templates',
            SETTINGS: 'chiacheck_settings',
            RECENT: 'chiacheck_recent',
            SUGGESTIONS: 'chiacheck_suggestions'
        };
        
        this.MAX_SESSIONS = 50;
        this.MAX_RECENT = 10;
        this.COMPRESSION_THRESHOLD = 1024; // 1KB
        
        this.initializeStorage();
    }
    
    // Initialize storage with default values
    initializeStorage() {
        try {
            // Check if storage is available
            if (!this.isStorageAvailable()) {
                console.warn('LocalStorage not available, using memory storage');
                this.fallbackStorage = {};
                return;
            }
            
            // Initialize default structures
            if (!this.getItem(this.STORAGE_KEYS.SESSIONS)) {
                this.setItem(this.STORAGE_KEYS.SESSIONS, []);
            }
            
            if (!this.getItem(this.STORAGE_KEYS.TEMPLATES)) {
                this.setItem(this.STORAGE_KEYS.TEMPLATES, this.getDefaultTemplates());
            }
            
            if (!this.getItem(this.STORAGE_KEYS.SETTINGS)) {
                this.setItem(this.STORAGE_KEYS.SETTINGS, this.getDefaultSettings());
            }
            
            if (!this.getItem(this.STORAGE_KEYS.RECENT)) {
                this.setItem(this.STORAGE_KEYS.RECENT, []);
            }
            
            if (!this.getItem(this.STORAGE_KEYS.SUGGESTIONS)) {
                this.setItem(this.STORAGE_KEYS.SUGGESTIONS, {
                    members: [],
                    locations: [],
                    items: []
                });
            }
            
            // Clean up old data on initialization
            this.cleanup();
            
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            this.handleStorageError(error);
        }
    }
    
    // Check if LocalStorage is available
    isStorageAvailable() {
        try {
            const test = 'chiacheck_test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // Get item from storage with error handling
    getItem(key) {
        try {
            if (!this.isStorageAvailable()) {
                return this.fallbackStorage[key] || null;
            }
            
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            // Try to decompress if needed
            const decompressed = this.decompress(item);
            return JSON.parse(decompressed);
        } catch (error) {
            console.error(`Failed to get item ${key}:`, error);
            return null;
        }
    }
    
    // Set item in storage with error handling and compression
    setItem(key, value) {
        try {
            if (!this.isStorageAvailable()) {
                this.fallbackStorage[key] = value;
                return true;
            }
            
            const jsonString = JSON.stringify(value);
            const compressed = this.compress(jsonString);
            
            localStorage.setItem(key, compressed);
            return true;
        } catch (error) {
            console.error(`Failed to set item ${key}:`, error);
            
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                this.handleQuotaExceeded(key, value);
            }
            
            return false;
        }
    }
    
    // Remove item from storage
    removeItem(key) {
        try {
            if (!this.isStorageAvailable()) {
                delete this.fallbackStorage[key];
                return true;
            }
            
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Failed to remove item ${key}:`, error);
            return false;
        }
    }
    
    // Simple compression for large data
    compress(data) {
        if (data.length < this.COMPRESSION_THRESHOLD) {
            return data;
        }
        
        // Simple compression - could be enhanced with actual compression library
        try {
            // For now, just return as-is. In production, you might use LZ-string or similar
            return data;
        } catch (error) {
            console.warn('Compression failed, storing uncompressed:', error);
            return data;
        }
    }
    
    // Simple decompression
    decompress(data) {
        try {
            // For now, just return as-is
            return data;
        } catch (error) {
            console.warn('Decompression failed:', error);
            return data;
        }
    }
    
    // Handle storage quota exceeded
    handleQuotaExceeded(key, value) {
        console.warn('Storage quota exceeded, attempting cleanup...');
        
        try {
            // Clean up old sessions
            this.cleanup(true);
            
            // Try again after cleanup
            const jsonString = JSON.stringify(value);
            const compressed = this.compress(jsonString);
            localStorage.setItem(key, compressed);
            
            console.info('Successfully stored after cleanup');
        } catch (error) {
            console.error('Failed to store even after cleanup:', error);
            this.showStorageWarning();
        }
    }
    
    // Handle storage errors
    handleStorageError(error) {
        console.error('Storage error:', error);
        
        // Show user-friendly error
        if (window.showToast) {
            window.showToast('Storage Error: Some data may not be saved', 'error');
        }
    }
    
    // Show storage warning to user
    showStorageWarning() {
        if (window.showToast) {
            window.showToast('Storage full: Please export old sessions', 'warning');
        }
    }
    
    // Get default settings
    getDefaultSettings() {
        return {
            theme: 'light',
            currency: 'VND',
            autoSave: true,
            autoSaveInterval: 30000, // 30 seconds
            showBankInfo: false,
            voiceInput: false,
            notifications: true,
            language: 'en',
            dateFormat: 'DD/MM/YYYY',
            numberFormat: 'comma'
        };
    }
    
    // Get default member templates
    getDefaultTemplates() {
        return [
            {
                id: 'friends_4',
                name: 'Friends (4)',
                members: ['Alice', 'Bob', 'Charlie', 'David']
            },
            {
                id: 'colleagues_6',
                name: 'Colleagues (6)',
                members: ['John', 'Jane', 'Mike', 'Sarah', 'Tom', 'Lisa']
            },
            {
                id: 'family_3',
                name: 'Family (3)',
                members: ['Dad', 'Mom', 'Me']
            }
        ];
    }
    
    // Session Management
    saveSession(session) {
        try {
            const sessions = this.getSessions();
            const existingIndex = sessions.findIndex(s => s.id === session.id);
            
            // Add timestamps
            session.updatedAt = new Date().toISOString();
            if (!session.createdAt) {
                session.createdAt = session.updatedAt;
            }
            
            if (existingIndex >= 0) {
                sessions[existingIndex] = session;
            } else {
                sessions.unshift(session); // Add to beginning
            }
            
            // Limit number of sessions
            if (sessions.length > this.MAX_SESSIONS) {
                sessions.splice(this.MAX_SESSIONS);
            }
            
            const success = this.setItem(this.STORAGE_KEYS.SESSIONS, sessions);
            
            if (success) {
                this.addToRecent(session);
                this.updateSuggestions(session);
            }
            
            return success;
        } catch (error) {
            console.error('Failed to save session:', error);
            return false;
        }
    }
    
    // Get all sessions
    getSessions() {
        return this.getItem(this.STORAGE_KEYS.SESSIONS) || [];
    }
    
    // Get session by ID
    getSession(sessionId) {
        const sessions = this.getSessions();
        return sessions.find(s => s.id === sessionId) || null;
    }
    
    // Delete session
    deleteSession(sessionId) {
        try {
            const sessions = this.getSessions();
            const filteredSessions = sessions.filter(s => s.id !== sessionId);
            
            const success = this.setItem(this.STORAGE_KEYS.SESSIONS, filteredSessions);
            
            if (success) {
                this.removeFromRecent(sessionId);
            }
            
            return success;
        } catch (error) {
            console.error('Failed to delete session:', error);
            return false;
        }
    }
    
    // Recent sessions management
    addToRecent(session) {
        try {
            const recent = this.getRecent();
            const recentItem = {
                id: session.id,
                name: session.metadata?.name || 'Unnamed Session',
                location: session.location || 'Unknown Location',
                memberCount: session.members?.length || 0,
                totalCost: session.totals?.totalCost || 0,
                updatedAt: session.updatedAt,
                createdAt: session.createdAt
            };
            
            // Remove if already exists
            const filteredRecent = recent.filter(r => r.id !== session.id);
            
            // Add to beginning
            filteredRecent.unshift(recentItem);
            
            // Limit recent items
            if (filteredRecent.length > this.MAX_RECENT) {
                filteredRecent.splice(this.MAX_RECENT);
            }
            
            return this.setItem(this.STORAGE_KEYS.RECENT, filteredRecent);
        } catch (error) {
            console.error('Failed to add to recent:', error);
            return false;
        }
    }
    
    // Get recent sessions
    getRecent() {
        return this.getItem(this.STORAGE_KEYS.RECENT) || [];
    }
    
    // Remove from recent
    removeFromRecent(sessionId) {
        try {
            const recent = this.getRecent();
            const filteredRecent = recent.filter(r => r.id !== sessionId);
            return this.setItem(this.STORAGE_KEYS.RECENT, filteredRecent);
        } catch (error) {
            console.error('Failed to remove from recent:', error);
            return false;
        }
    }
    
    // Settings management
    getSetting(key) {
        const settings = this.getSettings();
        return settings[key];
    }
    
    setSetting(key, value) {
        try {
            const settings = this.getSettings();
            settings[key] = value;
            return this.setItem(this.STORAGE_KEYS.SETTINGS, settings);
        } catch (error) {
            console.error('Failed to set setting:', error);
            return false;
        }
    }
    
    getSettings() {
        return this.getItem(this.STORAGE_KEYS.SETTINGS) || this.getDefaultSettings();
    }
    
    // Templates management
    getTemplates() {
        return this.getItem(this.STORAGE_KEYS.TEMPLATES) || [];
    }
    
    saveTemplate(template) {
        try {
            const templates = this.getTemplates();
            const existingIndex = templates.findIndex(t => t.id === template.id);
            
            if (existingIndex >= 0) {
                templates[existingIndex] = template;
            } else {
                templates.push(template);
            }
            
            return this.setItem(this.STORAGE_KEYS.TEMPLATES, templates);
        } catch (error) {
            console.error('Failed to save template:', error);
            return false;
        }
    }
    
    deleteTemplate(templateId) {
        try {
            const templates = this.getTemplates();
            const filteredTemplates = templates.filter(t => t.id !== templateId);
            return this.setItem(this.STORAGE_KEYS.TEMPLATES, filteredTemplates);
        } catch (error) {
            console.error('Failed to delete template:', error);
            return false;
        }
    }
    
    // Suggestions management
    updateSuggestions(session) {
        try {
            const suggestions = this.getSuggestions();
            
            // Update member suggestions
            if (session.members) {
                session.members.forEach(member => {
                    if (member.name && !suggestions.members.includes(member.name)) {
                        suggestions.members.push(member.name);
                    }
                });
                
                // Keep only recent suggestions (limit to 50)
                suggestions.members = suggestions.members.slice(-50);
            }
            
            // Update location suggestions
            if (session.location && !suggestions.locations.includes(session.location)) {
                suggestions.locations.push(session.location);
                suggestions.locations = suggestions.locations.slice(-20);
            }
            
            // Update item suggestions
            if (session.members) {
                session.members.forEach(member => {
                    if (member.items) {
                        member.items.forEach(item => {
                            if (item.name && !suggestions.items.find(i => i.name === item.name)) {
                                suggestions.items.push({
                                    name: item.name,
                                    avgPrice: item.price,
                                    count: 1
                                });
                            } else {
                                const existingItem = suggestions.items.find(i => i.name === item.name);
                                if (existingItem) {
                                    existingItem.avgPrice = Math.round((existingItem.avgPrice + item.price) / 2);
                                    existingItem.count++;
                                }
                            }
                        });
                    }
                });
                
                // Keep only popular items (limit to 100)
                suggestions.items = suggestions.items
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 100);
            }
            
            return this.setItem(this.STORAGE_KEYS.SUGGESTIONS, suggestions);
        } catch (error) {
            console.error('Failed to update suggestions:', error);
            return false;
        }
    }
    
    getSuggestions() {
        return this.getItem(this.STORAGE_KEYS.SUGGESTIONS) || {
            members: [],
            locations: [],
            items: []
        };
    }
    
    // Data export/import
    exportData() {
        try {
            const data = {
                sessions: this.getSessions(),
                templates: this.getTemplates(),
                settings: this.getSettings(),
                suggestions: this.getSuggestions(),
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }
    
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Validate data structure
            if (!data.version || !data.sessions) {
                throw new Error('Invalid data format');
            }
            
            // Import sessions
            if (data.sessions && Array.isArray(data.sessions)) {
                this.setItem(this.STORAGE_KEYS.SESSIONS, data.sessions);
            }
            
            // Import templates
            if (data.templates && Array.isArray(data.templates)) {
                this.setItem(this.STORAGE_KEYS.TEMPLATES, data.templates);
            }
            
            // Import settings (merge with defaults)
            if (data.settings && typeof data.settings === 'object') {
                const currentSettings = this.getSettings();
                const mergedSettings = { ...currentSettings, ...data.settings };
                this.setItem(this.STORAGE_KEYS.SETTINGS, mergedSettings);
            }
            
            // Import suggestions
            if (data.suggestions && typeof data.suggestions === 'object') {
                this.setItem(this.STORAGE_KEYS.SUGGESTIONS, data.suggestions);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
    
    // Storage cleanup
    cleanup(aggressive = false) {
        try {
            const sessions = this.getSessions();
            
            if (aggressive) {
                // Remove sessions older than 6 months
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                
                const filteredSessions = sessions.filter(session => {
                    const sessionDate = new Date(session.createdAt || session.updatedAt);
                    return sessionDate > sixMonthsAgo;
                });
                
                if (filteredSessions.length < sessions.length) {
                    this.setItem(this.STORAGE_KEYS.SESSIONS, filteredSessions);
                    console.info(`Cleaned up ${sessions.length - filteredSessions.length} old sessions`);
                }
            } else {
                // Normal cleanup - just limit to MAX_SESSIONS
                if (sessions.length > this.MAX_SESSIONS) {
                    const trimmedSessions = sessions.slice(0, this.MAX_SESSIONS);
                    this.setItem(this.STORAGE_KEYS.SESSIONS, trimmedSessions);
                }
            }
            
            // Clean up recent list
            const recent = this.getRecent();
            if (recent.length > this.MAX_RECENT) {
                const trimmedRecent = recent.slice(0, this.MAX_RECENT);
                this.setItem(this.STORAGE_KEYS.RECENT, trimmedRecent);
            }
            
        } catch (error) {
            console.error('Failed to cleanup storage:', error);
        }
    }
    
    // Get storage usage information
    getStorageInfo() {
        try {
            if (!this.isStorageAvailable()) {
                return {
                    available: false,
                    used: 0,
                    remaining: 0,
                    percentage: 0
                };
            }
            
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }
            
            // Estimate quota (5MB for most browsers)
            const estimatedQuota = 5 * 1024 * 1024; // 5MB in bytes
            
            return {
                available: true,
                used: totalSize,
                remaining: estimatedQuota - totalSize,
                percentage: Math.round((totalSize / estimatedQuota) * 100),
                sessions: this.getSessions().length,
                templates: this.getTemplates().length
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return {
                available: false,
                used: 0,
                remaining: 0,
                percentage: 0
            };
        }
    }
    
    // Clear all data
    clearAllData() {
        try {
            if (!this.isStorageAvailable()) {
                this.fallbackStorage = {};
                return true;
            }
            
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Reinitialize with defaults
            this.initializeStorage();
            
            return true;
        } catch (error) {
            console.error('Failed to clear all data:', error);
            return false;
        }
    }
}

// Create global storage manager instance
window.storageManager = new StorageManager();

// Auto-save functionality
class AutoSaveManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.currentSession = null;
        this.saveTimeout = null;
        this.isEnabled = true;
        this.interval = 30000; // 30 seconds default
        
        this.initialize();
    }
    
    initialize() {
        const settings = this.storageManager.getSettings();
        this.isEnabled = settings.autoSave !== false;
        this.interval = settings.autoSaveInterval || 30000;
        
        // Listen for form changes
        this.setupChangeListeners();
    }
    
    setupChangeListeners() {
        // Debounced save function
        const debouncedSave = this.debounce(() => {
            if (this.isEnabled && this.currentSession) {
                this.saveCurrentSession();
            }
        }, 2000); // 2 second delay
        
        // Listen to form inputs
        document.addEventListener('input', debouncedSave);
        document.addEventListener('change', debouncedSave);
    }
    
    setCurrentSession(session) {
        this.currentSession = session;
    }
    
    saveCurrentSession() {
        if (!this.currentSession) return;
        
        try {
            const success = this.storageManager.saveSession(this.currentSession);
            if (success && window.showToast) {
                window.showToast('Session auto-saved', 'success');
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
    
    // Utility function for debouncing
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
    }
    
    enable() {
        this.isEnabled = true;
    }
    
    disable() {
        this.isEnabled = false;
    }
    
    setInterval(interval) {
        this.interval = interval;
    }
}

// Create global auto-save manager
window.autoSaveManager = new AutoSaveManager(window.storageManager);

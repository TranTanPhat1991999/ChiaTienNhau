// ChiaCheck - Voice Input System

class VoiceInputManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = false;
        this.currentMode = 'item'; // 'item', 'member', 'location'
        this.activeInput = null;
        this.commands = new Map();
        
        this.initialize();
    }
    
    initialize() {
        // Check for Web Speech API support
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.isSupported = true;
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
            this.isSupported = true;
        } else {
            console.warn('Speech recognition not supported in this browser');
            this.isSupported = false;
            return;
        }
        
        this.setupRecognition();
        this.setupCommands();
        this.setupUI();
    }
    
    setupRecognition() {
        if (!this.recognition) return;
        
        // Configuration
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3;
        
        // Event listeners
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI();
            this.showToast('Voice input started - speak now', 'info');
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUI();
        };
        
        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };
        
        this.recognition.onerror = (event) => {
            this.handleSpeechError(event);
        };
        
        this.recognition.onnomatch = () => {
            this.showToast('No speech was recognized', 'warning');
        };
    }
    
    setupCommands() {
        // Voice commands for navigation and actions
        this.commands.set('new session', () => {
            if (window.chiaCheckApp) {
                window.chiaCheckApp.newSession();
            }
        });
        
        this.commands.set('save session', () => {
            if (window.chiaCheckApp) {
                window.chiaCheckApp.saveSession();
            }
        });
        
        this.commands.set('export pdf', () => {
            if (window.chiaCheckApp) {
                window.chiaCheckApp.exportPDF();
            }
        });
        
        this.commands.set('add member', () => {
            const memberInput = document.getElementById('member-name');
            if (memberInput) {
                memberInput.focus();
                this.setMode('member');
                this.startListening();
            }
        });
        
        this.commands.set('set location', () => {
            const locationInput = document.getElementById('location');
            if (locationInput) {
                locationInput.focus();
                this.setMode('location');
                this.startListening();
            }
        });
        
        this.commands.set('calculate', () => {
            if (window.chiaCheckApp) {
                window.chiaCheckApp.recalculate();
            }
        });
        
        this.commands.set('dark mode', () => {
            if (window.chiaCheckApp) {
                window.chiaCheckApp.setTheme('dark');
            }
        });
        
        this.commands.set('light mode', () => {
            if (window.chiaCheckApp) {
                window.chiaCheckApp.setTheme('light');
            }
        });
    }
    
    setupUI() {
        const voiceToggle = document.getElementById('voice-toggle');
        if (voiceToggle) {
            if (!this.isSupported) {
                voiceToggle.style.display = 'none';
                return;
            }
            
            voiceToggle.addEventListener('click', () => {
                this.toggleListening();
            });
        }
        
        // Add voice input buttons to text inputs
        this.addVoiceButtonsToInputs();
        
        // Keyboard shortcut (Ctrl/Cmd + Shift + V)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.toggleListening();
            }
        });
    }
    
    addVoiceButtonsToInputs() {
        const inputs = [
            { id: 'member-name', mode: 'member' },
            { id: 'location', mode: 'location' }
        ];
        
        inputs.forEach(({ id, mode }) => {
            const input = document.getElementById(id);
            if (input && this.isSupported) {
                const container = input.parentElement;
                if (container && container.classList.contains('input-group')) {
                    const voiceBtn = this.createVoiceButton(input, mode);
                    container.appendChild(voiceBtn);
                }
            }
        });
    }
    
    createVoiceButton(input, mode) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn-secondary voice-input-btn';
        button.innerHTML = '🎤';
        button.title = 'Voice input';
        
        button.addEventListener('click', () => {
            this.activeInput = input;
            this.setMode(mode);
            this.startListening();
        });
        
        return button;
    }
    
    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }
    
    startListening() {
        if (!this.isSupported || !this.recognition) {
            this.showToast('Voice input not supported', 'error');
            return;
        }
        
        if (this.isListening) {
            this.stopListening();
            return;
        }
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            this.showToast('Failed to start voice input', 'error');
        }
    }
    
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
    
    setMode(mode) {
        this.currentMode = mode;
        
        // Update language if needed
        switch (mode) {
            case 'location':
                // Could set to local language for better location recognition
                this.recognition.lang = 'en-US';
                break;
            default:
                this.recognition.lang = 'en-US';
        }
    }
    
    handleSpeechResult(event) {
        if (event.results.length === 0) return;
        
        const result = event.results[0];
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;
        
        console.log('Speech result:', transcript, 'Confidence:', confidence);
        
        // Low confidence warning
        if (confidence < 0.7) {
            this.showToast('Low confidence in speech recognition', 'warning');
        }
        
        // Check for voice commands first
        if (this.handleVoiceCommand(transcript)) {
            return;
        }
        
        // Handle text input
        this.handleTextInput(transcript);
    }
    
    handleVoiceCommand(transcript) {
        const command = transcript.toLowerCase();
        
        // Check exact matches
        if (this.commands.has(command)) {
            this.commands.get(command)();
            this.showToast(`Command executed: ${command}`, 'success');
            return true;
        }
        
        // Check partial matches for flexibility
        for (const [commandKey, commandFunc] of this.commands.entries()) {
            if (command.includes(commandKey) || commandKey.includes(command)) {
                commandFunc();
                this.showToast(`Command executed: ${commandKey}`, 'success');
                return true;
            }
        }
        
        return false;
    }
    
    handleTextInput(transcript) {
        switch (this.currentMode) {
            case 'member':
                this.handleMemberInput(transcript);
                break;
            case 'location':
                this.handleLocationInput(transcript);
                break;
            case 'item':
                this.handleItemInput(transcript);
                break;
            default:
                this.handleGeneralInput(transcript);
        }
    }
    
    handleMemberInput(transcript) {
        const memberInput = this.activeInput || document.getElementById('member-name');
        if (memberInput) {
            // Clean up the transcript for names
            const cleanName = this.cleanNameInput(transcript);
            memberInput.value = cleanName;
            
            // Auto-add if it sounds like a complete name
            if (this.isCompleteName(cleanName)) {
                if (window.chiaCheckApp) {
                    window.chiaCheckApp.addMember();
                }
            }
            
            this.showToast(`Added name: ${cleanName}`, 'success');
        }
    }
    
    handleLocationInput(transcript) {
        const locationInput = this.activeInput || document.getElementById('location');
        if (locationInput) {
            // Clean up the transcript for locations
            const cleanLocation = this.cleanLocationInput(transcript);
            locationInput.value = cleanLocation;
            
            if (window.chiaCheckApp && window.chiaCheckApp.currentSession) {
                window.chiaCheckApp.currentSession.location = cleanLocation;
            }
            
            this.showToast(`Location set: ${cleanLocation}`, 'success');
        }
    }
    
    handleItemInput(transcript) {
        // Parse item input (could be "item name price" format)
        const parsed = this.parseItemInput(transcript);
        
        if (parsed.name) {
            // Find the active item input or create new item
            this.addVoiceItem(parsed.name, parsed.price);
            this.showToast(`Added item: ${parsed.name}${parsed.price ? ' - ' + parsed.price : ''}`, 'success');
        }
    }
    
    handleGeneralInput(transcript) {
        // If no specific mode, try to determine what the user wants
        const lower = transcript.toLowerCase();
        
        if (lower.includes('location') || lower.includes('restaurant') || lower.includes('bar')) {
            this.setMode('location');
            this.handleLocationInput(transcript.replace(/location|restaurant|bar/gi, '').trim());
        } else if (lower.includes('member') || lower.includes('person') || lower.includes('add')) {
            this.setMode('member');
            this.handleMemberInput(transcript.replace(/member|person|add/gi, '').trim());
        } else {
            // Default to item input
            this.setMode('item');
            this.handleItemInput(transcript);
        }
    }
    
    handleSpeechError(event) {
        let errorMessage = 'Voice input error';
        
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No speech was detected';
                break;
            case 'audio-capture':
                errorMessage = 'No microphone was found';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone permission denied';
                break;
            case 'network':
                errorMessage = 'Network error occurred';
                break;
            case 'service-not-allowed':
                errorMessage = 'Speech service not allowed';
                break;
            default:
                errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        console.error('Speech recognition error:', event.error);
        this.showToast(errorMessage, 'error');
        
        this.isListening = false;
        this.updateUI();
    }
    
    // Text processing utilities
    cleanNameInput(transcript) {
        return transcript
            .replace(/\b(add|member|person|name)\b/gi, '')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    
    cleanLocationInput(transcript) {
        return transcript
            .replace(/\b(location|restaurant|bar|place)\b/gi, '')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    
    parseItemInput(transcript) {
        // Try to parse "item name price" format
        const words = transcript.trim().split(/\s+/);
        const result = { name: '', price: null };
        
        // Look for numbers (prices) in the transcript
        const priceRegex = /\b(\d+(?:[.,]\d+)?)\b/g;
        const priceMatches = transcript.match(priceRegex);
        
        if (priceMatches && priceMatches.length > 0) {
            // Take the last number as the price
            result.price = priceMatches[priceMatches.length - 1].replace(',', '.');
            
            // Remove price from transcript to get item name
            result.name = transcript
                .replace(new RegExp(priceMatches[priceMatches.length - 1] + '\\b'), '')
                .trim();
        } else {
            result.name = transcript.trim();
        }
        
        // Clean up item name
        result.name = result.name
            .replace(/\b(item|add|price)\b/gi, '')
            .trim();
        
        return result;
    }
    
    isCompleteName(name) {
        // Simple heuristic: consider it complete if it has at least one letter
        // and doesn't end with common incomplete indicators
        return name.length >= 2 && 
               /[a-zA-Z]/.test(name) && 
               !name.endsWith('...') &&
               !name.endsWith('uh') &&
               !name.endsWith('um');
    }
    
    addVoiceItem(itemName, price) {
        // This would integrate with the items management system
        // For now, just log the item
        console.log('Voice item:', { name: itemName, price: price });
        
        // TODO: Integrate with actual item management system
        // This would need to:
        // 1. Find the current active member
        // 2. Add the item to their items list
        // 3. Update the UI
    }
    
    updateUI() {
        const voiceToggle = document.getElementById('voice-toggle');
        if (voiceToggle) {
            if (this.isListening) {
                voiceToggle.classList.add('listening');
                voiceToggle.title = 'Stop voice input';
                voiceToggle.innerHTML = '<span>🎤</span> Listening...';
            } else {
                voiceToggle.classList.remove('listening');
                voiceToggle.title = 'Start voice input';
                voiceToggle.innerHTML = '<span>🎤</span> Voice Input';
            }
        }
        
        // Update voice input buttons
        document.querySelectorAll('.voice-input-btn').forEach(btn => {
            if (this.isListening) {
                btn.classList.add('listening');
                btn.innerHTML = '⏹️';
            } else {
                btn.classList.remove('listening');
                btn.innerHTML = '🎤';
            }
        });
    }
    
    showToast(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        }
    }
    
    // Public API
    isAvailable() {
        return this.isSupported;
    }
    
    getStatus() {
        return {
            supported: this.isSupported,
            listening: this.isListening,
            mode: this.currentMode
        };
    }
    
    setLanguage(lang) {
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    }
    
    addCustomCommand(command, callback) {
        this.commands.set(command.toLowerCase(), callback);
    }
    
    removeCustomCommand(command) {
        this.commands.delete(command.toLowerCase());
    }
}

// CSS for voice input states
const voiceCSS = `
.voice-input-btn.listening {
    background-color: #dc2626 !important;
    color: white !important;
    animation: pulse 1s infinite;
}

.nav-btn.listening {
    background-color: #dc2626 !important;
    color: white !important;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
}

.voice-input-btn {
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
}
`;

// Add CSS to document
const style = document.createElement('style');
style.textContent = voiceCSS;
document.head.appendChild(style);

// Create global voice input manager
window.voiceInputManager = new VoiceInputManager();

# ChiaCheck - Smart Bill Splitting Web App

A professional, responsive web application for splitting restaurant/bar bills among friends with smart calculations, PDF export, and PWA functionality.

## 🚀 Features

### Core Functionality
- **Smart Bill Splitting**: Automatically calculates how much each person owes
- **Member Management**: Add/remove members with drag & drop reordering
- **Item Tracking**: Add items with smart calculator support (e.g., "2*25000")
- **Advance Payments**: Track who paid what in advance
- **Banking Information**: Store payment details for easy transfers

### Smart Features
- **Auto-save**: Sessions saved automatically every 30 seconds
- **Voice Input**: Add items and members using speech recognition
- **Smart Suggestions**: Remembers previous members, locations, and items
- **PDF Export**: Generate professional reports with all details
- **QR Code Sharing**: Share session details via QR code
- **Analytics Dashboard**: View spending trends and insights

### Technical Features
- **PWA Support**: Install as a native app, works offline
- **Dark/Light Mode**: Automatic theme switching
- **Responsive Design**: Works on mobile, tablet, and desktop
- **LocalStorage**: All data stored locally, no server required
- **Accessibility**: WCAG 2.1 AA compliant

## 📱 Getting Started

### Quick Start
1. Open `chiatien.html` in a modern web browser
2. The app will load with a beautiful splash screen
3. Start by entering session details (date, location)
4. Add members to your group
5. Add items and costs for each member
6. View automatic calculations and export PDF

### Installation as PWA
1. Open the app in Chrome/Edge/Safari
2. Look for the "Install" button in the address bar
3. Click to install as a native app
4. Access from your device's app drawer/home screen

## 🎯 How to Use

### 1. Session Setup
- **Date Range**: Select start and end dates for your event
- **Location**: Enter restaurant/bar name or use GPS location
- **Progress Tracker**: See completion percentage in real-time

### 2. Member Management
- **Add Members**: Type names with duplicate prevention
- **Drag & Drop**: Reorder members as needed
- **Templates**: Save frequent groups for quick setup
- **Voice Input**: Say "add member [name]" to add via voice

### 3. Items & Costs
- **Smart Calculator**: Enter "2*25000" for complex calculations
- **Auto-formatting**: Prices displayed in local currency format
- **Suggestions**: Previous items suggested as you type
- **Voice Input**: Say item names and prices

### 4. Advanced Features
- **Advance Payments**: Track who paid what upfront
- **Banking Info**: Store account details for transfers
- **Custom Splits**: Override equal splitting if needed
- **Tip Calculation**: Add tips with equal or proportional distribution

### 5. Results & Export
- **Live Calculations**: See who owes what in real-time
- **Payment Suggestions**: Optimal transfer recommendations
- **PDF Export**: Professional reports with all details
- **Share Options**: QR codes, clipboard, JSON export

## 🛠️ Technical Details

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Required Features
- LocalStorage (5MB+)
- Web Speech API (for voice input)
- Geolocation API (for location features)
- Service Workers (for PWA features)

### File Structure
```
ChiaCheck/
├── chiatien.html          # Main HTML file
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker
├── css/
│   ├── styles.css         # Main styles
│   ├── themes.css         # Dark/light themes
│   └── responsive.css     # Mobile-first responsive design
└── js/
    ├── app.js             # Main application logic
    ├── storage.js         # LocalStorage management
    ├── calculations.js    # Bill splitting engine
    ├── pdf-export.js      # PDF generation
    ├── voice.js           # Speech recognition
    └── analytics.js       # Charts and insights
```

## 🎨 Customization

### Themes
- Built-in dark/light mode toggle
- Automatic system preference detection
- Smooth transitions between themes
- High contrast mode support

### Currency
- Default: Vietnamese Dong (VND)
- Easily configurable in settings
- Automatic formatting for different currencies

### Language
- Default: English
- Voice recognition supports multiple languages
- Easy to extend with translations

## 📊 Data Management

### Storage
- All data stored locally in browser
- No server required, completely private
- Automatic cleanup of old sessions
- Export/import functionality for backup

### Auto-Save
- Sessions saved every 30 seconds
- Recovery from interrupted sessions
- Recent sessions quick access
- Template saving for frequent groups

## 🔧 Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save current session
- `Ctrl/Cmd + E`: Export PDF
- `Ctrl/Cmd + N`: New session
- `Ctrl/Cmd + Shift + V`: Toggle voice input
- `Escape`: Close modals

## 🎤 Voice Commands

- "New session" - Start a new bill splitting session
- "Save session" - Save current progress
- "Add member [name]" - Add a new member
- "Set location [place]" - Set the location
- "Calculate" - Recalculate totals
- "Dark mode" / "Light mode" - Switch themes

## 📱 Mobile Features

- Touch-optimized interface
- Swipe gestures for navigation
- Responsive typography
- Optimized for one-handed use
- Native app-like experience when installed

## 🔒 Privacy & Security

- No data sent to external servers
- All processing done locally
- No tracking or analytics
- Complete user privacy
- Secure LocalStorage encryption

## 🐛 Troubleshooting

### Voice Input Not Working
- Check microphone permissions
- Ensure HTTPS or localhost
- Try refreshing the page
- Check browser compatibility

### PDF Export Issues
- Ensure jsPDF library loaded
- Check browser PDF support
- Try different browser
- Disable ad blockers

### Performance Issues
- Clear browser cache
- Check available storage
- Close other tabs
- Update browser

## 🚀 Future Enhancements

- Multi-currency support
- Cloud sync (optional)
- Group templates sharing
- Receipt scanning (OCR)
- Split by percentage
- Tax and service charge handling
- Multi-language support
- Advanced analytics

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to submit issues, feature requests, and pull requests to improve ChiaCheck!

---

**ChiaCheck** - Making bill splitting smart, simple, and social! 💰✨

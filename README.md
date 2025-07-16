# Home Assistant Desktop Widget

A beautiful **native Windows desktop application** that displays real-time data from your Home Assistant sensors. Built with Electron for a true native app experience.

## Features

- 🖥️ **Native Windows Application** - Not a browser app, runs as a real desktop widget
- 🌟 Modern Windows 11-style design with glass morphism effects
- 📊 Real-time sensor data display with mini chart
- 📌 **Always on top** - Stays visible above other windows
- 🔄 **System tray integration** - Minimize to tray, right-click for options
- 🖱️ **Draggable** - Move the widget anywhere on your screen
- ⚙️ Configurable settings (URL, token, entity, refresh interval)
- 🔄 Auto-refresh with customizable intervals
- 📱 Responsive design that works on different screen sizes
- 🌙 Dark mode support
- 🎯 Designed specifically for `sensor.solarnet_power_grid_export` but configurable for any sensor

## Setup Instructions

### **Prerequisites**
1. **Install Node.js** from https://nodejs.org/ (if not already installed)
2. Restart your computer after Node.js installation

### **Quick Start**
1. **Double-click `start-desktop-app.bat`** to launch the native desktop widget
2. The app will:
   - Install dependencies automatically on first run
   - Launch as a native Windows application
   - Appear in the top-right corner of your screen
   - Add an icon to your system tray

## Native App Features

### **Window Management**
- **Draggable**: Click and drag the widget header to move it anywhere
- **Always on Top**: Stays above other windows (can be toggled via tray menu)
- **Minimize to Tray**: Click minimize or close to hide to system tray
- **Frameless**: Clean, modern look without window borders

### **System Tray Integration**
Right-click the tray icon for options:
- Show/Hide Widget
- Always on Top toggle
- Settings
- Refresh data
- Quit application

### **No Browser Required**
- Runs as a native Windows application
- No browser tabs or bookmarks needed
- Appears in Alt+Tab window switcher
- True desktop widget experience

## Configuration

### **First Time Setup**

**Before running the app**, you need to create your configuration file:

1. **Copy the example config**:
   ```bash
   copy config.example.json config.json
   ```

2. **Edit `config.json`** with your Home Assistant details:
   ```json
   {
     "homeAssistant": {
       "url": "http://YOUR_HOME_ASSISTANT_IP:8123",
       "bearerToken": "your-long-lived-access-token-here",
       "entity": "sensor.solarnet_power_grid_export"
     }
   }
   ```

3. **Get your bearer token**:
   - Go to your Home Assistant profile
   - Go to Security Tab
   - Scroll down to "Long-Lived Access Tokens"
   - Click "Create Token"
   - Copy and paste the token into your `config.json`

### **Security Note**
Your `config.json` file is automatically ignored by git (.gitignore) to keep your credentials secure.

### **Runtime Settings**
To modify settings while the app is running:
1. Click the gear icon (⚙️) in the widget header, or
2. Right-click the system tray icon and select "Settings"

## File Structure

```
homeassistent-widget/
├── main.js                # Electron main process
├── index.html             # Widget HTML
├── styles.css             # Widget styling (Windows 11 design)
├── script.js              # Widget functionality and Home Assistant API
├── package.json           # Electron app configuration
├── start-desktop-app.bat  # Launch script for desktop app
├── assets/                # App icons and resources
│   ├── icon.svg
│   └── icon.png
└── README.md              # This file
```

## Usage

### **Desktop App**
1. Launch with `start-desktop-app.bat`
2. The widget appears as a native Windows application
3. Drag it to your preferred screen position
4. Data refreshes automatically every 5 seconds
5. Minimize to tray when not needed

### **Positioning Tips**
- **Top-right corner**: Default position, great for monitoring
- **Side of screen**: Drag to left or right edge for vertical monitoring
- **Second monitor**: Perfect for multi-monitor setups

### **System Tray**
- **Double-click tray icon**: Show/hide widget
- **Right-click tray icon**: Access all options
- **Balloon notifications**: Get notified when minimizing

## Building Distributable App

To create an installer for distribution:

```bash
npm run build
```

This creates a Windows installer in the `dist/` folder that you can share or install on other computers.

## Troubleshooting

### **App Won't Start**
1. Ensure Node.js is installed and in your PATH
2. Run `start-desktop-app.bat` and check for error messages
3. Try deleting `node_modules` folder and running again

### **Widget Won't Connect**
1. Verify your Home Assistant is accessible at the configured URL
2. Check that the bearer token is valid and not expired
3. Ensure the entity ID exists in your Home Assistant instance
4. Check the console in the app (Ctrl+Shift+I in development mode)

### **Widget Not Updating**
1. Right-click tray icon and select "Refresh"
2. Check your network connection
3. Verify Home Assistant is running and responsive

## Security Notes

- Your bearer token is stored in `config.json` which is automatically gitignored
- The app only communicates with your specified Home Assistant instance
- All communication uses HTTPS when possible
- No data is sent to external services
- Configuration file is kept local and secure
- Runs locally on your machine only

## Advantages Over Browser Version

✅ **Native Windows integration**  
✅ **System tray support**  
✅ **Always on top capability**  
✅ **No browser required**  
✅ **Better performance**  
✅ **True desktop widget experience**  
✅ **Single executable when built**  
✅ **Professional appearance**  

Enjoy your new native Home Assistant desktop widget! 🏠⚡

Enjoy your new Home Assistant desktop widget! 🏠⚡
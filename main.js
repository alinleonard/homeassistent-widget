const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');

// Load Home Assistant configuration from file
let HA_CONFIG;
try {
    const configPath = path.join(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    HA_CONFIG = JSON.parse(configData).homeAssistant;
    console.log('✅ Configuration loaded successfully');
} catch (error) {
    console.error('❌ Failed to load config.json:', error.message);
    console.error('Please create config.json from config.example.json');
    process.exit(1);
}

let mainWindow;
let tray;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 340,
        height: 480,
        resizable: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: false,
        show: false,
        titleBarStyle: 'hidden',
        focusable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    // Load the index.html file
    mainWindow.loadFile('index.html');

    // Set a simple title for taskbar identification
    mainWindow.setTitle('HA Widget');

    // Show window once ready, without title bar
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // Ensure no title bar is visible
        mainWindow.setMenuBarVisibility(false);
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle minimize to tray
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
        tray.displayBalloon({
            icon: nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')),
            title: 'Home Assistant Widget',
            content: 'Widget minimized to system tray'
        });
    });

    // Make window draggable
    mainWindow.on('ready-to-show', () => {
        // Set initial position (top-right corner)
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        mainWindow.setPosition(width - 350, 50);
        
        // Force remove any menu bar
        mainWindow.setAutoHideMenuBar(true);
        mainWindow.setMenuBarVisibility(false);
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

function createTray() {
    // Create system tray icon
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Widget',
            click: () => {
                mainWindow.show();
                mainWindow.focus();
            }
        },
        {
            label: 'Hide Widget',
            click: () => {
                mainWindow.hide();
            }
        },
        { type: 'separator' },
        {
            label: 'Always on Top',
            type: 'checkbox',
            checked: true,
            click: (item) => {
                mainWindow.setAlwaysOnTop(item.checked);
            }
        },
        { type: 'separator' },
        {
            label: 'Settings',
            click: () => {
                mainWindow.show();
                mainWindow.webContents.send('open-settings');
            }
        },
        {
            label: 'Refresh',
            click: () => {
                mainWindow.webContents.send('refresh-data');
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Home Assistant Widget');
    tray.setContextMenu(contextMenu);

    // Double-click to show/hide
    tray.on('double-click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestModule = urlObj.protocol === 'https:' ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = requestModule.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse JSON: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Handle IPC messages from renderer
ipcMain.handle('fetch-ha-data', async (event, entity) => {
    try {
        const apiUrl = `${HA_CONFIG.url}/api/states/${entity}`;
        const data = await makeRequest(apiUrl, {
            headers: {
                'Authorization': `Bearer ${HA_CONFIG.bearerToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        return data;
    } catch (error) {
        console.error('HA API Error:', error);
        throw new Error(`Failed to fetch from Home Assistant: ${error.message}`);
    }
});

ipcMain.handle('get-ha-config', () => {
    return {
        url: HA_CONFIG.url,
        entity: HA_CONFIG.entity
    };
});

ipcMain.handle('update-ha-config', (event, newConfig) => {
    Object.assign(HA_CONFIG, newConfig);
    return true;
});

// App event handlers
app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Cleanup
    if (tray) {
        tray.destroy();
    }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, focus our window instead
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}
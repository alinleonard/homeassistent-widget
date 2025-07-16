class HomeAssistantWidget {
    constructor() {
        this.config = null;
        this.refreshInterval = null;
        this.chart = null;
        this.dataHistory = [];
        this.maxHistoryPoints = 20;
        
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.setupEventListeners();
        this.setupChart();
        this.startPeriodicUpdate();
        await this.updateSensorData();
    }

    async loadConfig() {
        try {
            // Get configuration from Electron main process
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                const haConfig = await ipcRenderer.invoke('get-ha-config');
                
                this.config = {
                    "homeAssistant": {
                        "url": haConfig.url,
                        "bearerToken": "", // Handled by main process
                        "entity": haConfig.entity
                    },
                    "widget": {
                        "refreshInterval": 5000,
                        "title": "Solar Power Export",
                        "unit": "W"
                    }
                };
            } else {
                // Fallback for browser mode
                this.config = {
                    "homeAssistant": {
                        "url": "http://localhost:3000",
                        "bearerToken": "",
                        "entity": "sensor.solarnet_power_grid_export"
                    },
                    "widget": {
                        "refreshInterval": 5000,
                        "title": "Solar Power Export",
                        "unit": "W"
                    }
                };
            }
            
            // Load settings from localStorage if available (overrides default)
            const savedSettings = localStorage.getItem('haWidgetSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                // Only override if not using Electron mode
                if (!this.isElectron()) {
                    this.config.homeAssistant = { ...this.config.homeAssistant, ...settings };
                }
            }
            
            this.applyConfig();
        } catch (error) {
            console.error('Failed to load config:', error);
            this.showError('Failed to load configuration');
        }
    }

    isElectron() {
        return typeof require !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer';
    }

    applyConfig() {
        document.getElementById('widgetTitle').textContent = this.config.widget.title;
        document.getElementById('entityName').textContent = this.config.homeAssistant.entity;
        document.getElementById('sensorUnit').textContent = this.config.widget.unit;
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.updateSensorData();
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('cancelSettings').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Close modal on background click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeSettings();
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
            }
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                this.updateSensorData();
            }
        });
    }

    setupChart() {
        const canvas = document.getElementById('miniChart');
        const ctx = canvas.getContext('2d');
        
        this.chart = {
            canvas: canvas,
            ctx: ctx,
            draw: () => this.drawChart()
        };
    }

    drawChart() {
        const { canvas, ctx } = this.chart;
        const { width, height } = canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        if (this.dataHistory.length < 2) return;
        
        // Calculate min/max for scaling
        const values = this.dataHistory.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        
        // Draw grid lines
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        
        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw line chart
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        this.dataHistory.forEach((point, index) => {
            const x = (width / (this.dataHistory.length - 1)) * index;
            const y = height - ((point.value - min) / range) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = '#ff9800';
        this.dataHistory.forEach((point, index) => {
            const x = (width / (this.dataHistory.length - 1)) * index;
            const y = height - ((point.value - min) / range) * height;
            
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    async updateSensorData() {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.classList.add('spinning');
        
        try {
            let data;
            
            if (this.isElectron()) {
                // Use Electron IPC to fetch data
                const { ipcRenderer } = require('electron');
                data = await ipcRenderer.invoke('fetch-ha-data', this.config.homeAssistant.entity);
            } else {
                // Use direct fetch for browser mode
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                // Only add Authorization header if bearerToken is provided
                if (this.config.homeAssistant.bearerToken) {
                    headers['Authorization'] = `Bearer ${this.config.homeAssistant.bearerToken}`;
                }
                
                const response = await fetch(`${this.config.homeAssistant.url}/api/states/${this.config.homeAssistant.entity}`, {
                    headers: headers
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                data = await response.json();
            }

            this.updateDisplay(data);
            this.updateStatus('connected', 'Connected');
            this.hideError();
            
            // Add to history
            const value = parseFloat(data.state);
            if (!isNaN(value)) {
                this.dataHistory.push({
                    value: value,
                    timestamp: new Date()
                });
                
                // Keep only last N points
                if (this.dataHistory.length > this.maxHistoryPoints) {
                    this.dataHistory.shift();
                }
                
                this.chart.draw();
            }
            
        } catch (error) {
            console.error('Error fetching sensor data:', error);
            this.updateStatus('error', 'Connection error');
            this.showError(`Failed to fetch data: ${error.message}`);
        } finally {
            refreshBtn.classList.remove('spinning');
        }
    }

    updateDisplay(data) {
        const value = parseFloat(data.state);
        const displayValue = isNaN(value) ? data.state : this.formatValue(value);
        
        document.getElementById('sensorValue').textContent = displayValue;
        
        const lastChanged = new Date(data.last_changed);
        const timeAgo = this.formatTimeAgo(lastChanged);
        document.getElementById('lastUpdated').textContent = `Updated ${timeAgo}`;
        
        // Don't update document title for Electron app to avoid title bar appearing
        if (!this.isElectron()) {
            document.title = `${displayValue} ${this.config.widget.unit} - HA Widget`;
        }
    }

    formatValue(value) {
        // Always show the full value with 1 decimal place, no "k" formatting
        return value.toFixed(1);
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        
        if (diffSecs < 60) {
            return 'just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    updateStatus(status, text) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        indicator.className = `status-indicator ${status}`;
        statusText.textContent = text;
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        errorText.textContent = message;
        errorElement.style.display = 'flex';
    }

    hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    openSettings() {
        const modal = document.getElementById('settingsModal');
        
        // Populate current settings
        document.getElementById('haUrl').value = this.config.homeAssistant.url;
        document.getElementById('haToken').value = this.config.homeAssistant.bearerToken;
        document.getElementById('entityId').value = this.config.homeAssistant.entity;
        document.getElementById('refreshInterval').value = this.config.widget.refreshInterval / 1000;
        document.getElementById('widgetTitleInput').value = this.config.widget.title;
        
        modal.style.display = 'flex';
    }

    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    saveSettings() {
        const newSettings = {
            url: document.getElementById('haUrl').value.trim(),
            bearerToken: document.getElementById('haToken').value.trim(),
            entity: document.getElementById('entityId').value.trim()
        };
        
        const newRefreshInterval = parseInt(document.getElementById('refreshInterval').value) * 1000;
        const newTitle = document.getElementById('widgetTitleInput').value.trim();
        
        // Validate inputs
        if (!newSettings.url || !newSettings.bearerToken || !newSettings.entity) {
            alert('Please fill in all required fields');
            return;
        }
        
        if (newRefreshInterval < 1000 || newRefreshInterval > 300000) {
            alert('Refresh interval must be between 1 and 300 seconds');
            return;
        }
        
        // Update config
        this.config.homeAssistant = { ...this.config.homeAssistant, ...newSettings };
        this.config.widget.refreshInterval = newRefreshInterval;
        this.config.widget.title = newTitle || this.config.widget.title;
        
        // Save to localStorage
        localStorage.setItem('haWidgetSettings', JSON.stringify(newSettings));
        
        // Apply changes
        this.applyConfig();
        this.stopPeriodicUpdate();
        this.startPeriodicUpdate();
        
        // Refresh data with new settings
        this.updateSensorData();
        
        this.closeSettings();
    }

    startPeriodicUpdate() {
        this.stopPeriodicUpdate();
        this.refreshInterval = setInterval(() => {
            this.updateSensorData();
        }, this.config.widget.refreshInterval);
    }

    stopPeriodicUpdate() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Handle page visibility changes to pause updates when hidden
    handleVisibilityChange() {
        if (document.hidden) {
            this.stopPeriodicUpdate();
        } else {
            this.startPeriodicUpdate();
            this.updateSensorData();
        }
    }
}

// Initialize the widget when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const widget = new HomeAssistantWidget();
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        widget.handleVisibilityChange();
    });
    
    // Handle window focus/blur
    window.addEventListener('focus', () => {
        widget.updateSensorData();
    });

    // Electron IPC listeners
    if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        
        // Listen for messages from main process
        ipcRenderer.on('open-settings', () => {
            widget.openSettings();
        });
        
        ipcRenderer.on('refresh-data', () => {
            widget.updateSensorData();
        });
    }
});

// Service Worker registration for browser mode only
if ('serviceWorker' in navigator && typeof require === 'undefined') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

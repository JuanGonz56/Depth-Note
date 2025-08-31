// Background script for Depth Annotation Extension
class BackgroundService {
  constructor() {
    this.init();
  }
  
  init() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });
    
    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
    
    // Listen for tab updates to inject content script
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });
    
    // Set up context menu
    this.setupContextMenu();
  }
  
  handleInstallation(details) {
    if (details.reason === 'install') {
      // First time installation
      console.log('Depth Annotation Extension installed');
      
      // Set default settings
      chrome.storage.local.set({
        settings: {
          autoSave: true,
          showDepthIndicator: true,
          defaultDepth: 0
        }
      });
      
      // Open welcome page or instructions
      chrome.tabs.create({
        url: chrome.runtime.getURL('welcome.html')
      }).catch(() => {
        // If welcome page doesn't exist, that's fine
        console.log('Welcome page not found, skipping');
      });
      
    } else if (details.reason === 'update') {
      console.log('Depth Annotation Extension updated');
    }
  }
  
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'saveAnnotation':
          await this.saveAnnotation(message.data);
          sendResponse({ success: true });
          break;
          
        case 'getAnnotations':
          const annotations = await this.getAnnotations(message.url);
          sendResponse({ success: true, data: annotations });
          break;
          
        case 'deleteAnnotation':
          await this.deleteAnnotation(message.url, message.annotationId);
          sendResponse({ success: true });
          break;
          
        case 'getSettings':
          const settings = await this.getSettings();
          sendResponse({ success: true, data: settings });
          break;
          
        case 'updateStats':
          // Broadcast stats update to all extension contexts
          this.broadcastStatsUpdate();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  handleTabUpdate(tabId, changeInfo, tab) {
    // When page is fully loaded, check if we need to inject content script
    if (changeInfo.status === 'complete' && tab.url) {
      // Skip special pages
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('moz-extension://') || 
          tab.url.startsWith('chrome-extension://')) {
        return;
      }
      
      // Content script is already injected via manifest, but we can handle
      // any additional setup here if needed
      this.setupTabAnnotations(tabId, tab.url);
    }
  }
  
  async setupTabAnnotations(tabId, url) {
    try {
      // Check if this page has existing annotations
      const key = `annotations_${btoa(url)}`;
      const result = await chrome.storage.local.get([key]);
      
      if (result[key] && result[key].annotations && result[key].annotations.length > 0) {
        // Send existing annotations to content script
        chrome.tabs.sendMessage(tabId, {
          action: 'loadExistingAnnotations',
          annotations: result[key].annotations
        }).catch(() => {
          // Content script might not be ready yet, that's okay
        });
      }
    } catch (error) {
      // Silently handle errors - content script will load annotations itself
      console.log('Tab setup completed');
    }
  }
  
  setupContextMenu() {
    // Remove existing context menus
    chrome.contextMenus.removeAll(() => {
      // Create context menu for quick annotation
      chrome.contextMenus.create({
        id: 'quick-annotate',
        title: 'Add Depth Annotation',
        contexts: ['page', 'selection']
      });
      
      chrome.contextMenus.create({
        id: 'toggle-3d-view',
        title: 'Toggle 3D View',
        contexts: ['page']
      });
    });
    
    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }
  
  async handleContextMenuClick(info, tab) {
    try {
      if (info.menuItemId === 'quick-annotate') {
        // Activate annotation mode and create annotation at clicked position
        await chrome.tabs.sendMessage(tab.id, {
          action: 'quickAnnotate',
          x: info.pageX || 100,
          y: info.pageY || 100,
          selectedText: info.selectionText || ''
        });
      } else if (info.menuItemId === 'toggle-3d-view') {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggle3DView'
        });
      }
    } catch (error) {
      console.error('Error handling context menu click:', error);
    }
  }
  
  async saveAnnotation(annotationData) {
    const key = `annotations_${btoa(annotationData.url)}`;
    const result = await chrome.storage.local.get([key]);
    const existingData = result[key] || { url: annotationData.url, annotations: [] };
    
    // Add or update annotation
    const existingIndex = existingData.annotations.findIndex(a => a.id === annotationData.id);
    if (existingIndex >= 0) {
      existingData.annotations[existingIndex] = annotationData;
    } else {
      existingData.annotations.push(annotationData);
    }
    
    await chrome.storage.local.set({ [key]: existingData });
    this.broadcastStatsUpdate();
  }
  
  async getAnnotations(url) {
    const key = `annotations_${btoa(url)}`;
    const result = await chrome.storage.local.get([key]);
    return result[key]?.annotations || [];
  }
  
  async deleteAnnotation(url, annotationId) {
    const key = `annotations_${btoa(url)}`;
    const result = await chrome.storage.local.get([key]);
    
    if (result[key] && result[key].annotations) {
      result[key].annotations = result[key].annotations.filter(a => a.id !== annotationId);
      await chrome.storage.local.set({ [key]: result[key] });
      this.broadcastStatsUpdate();
    }
  }
  
  async getSettings() {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || {
      autoSave: true,
      showDepthIndicator: true,
      defaultDepth: 0
    };
  }
  
  broadcastStatsUpdate() {
    // Send update message to all extension contexts (popup, content scripts)
    chrome.runtime.sendMessage({ action: 'updateStats' }).catch(() => {
      // Ignore errors if no listeners
    });
  }
  
  // Utility method to clean up old annotations (optional)
  async cleanupOldAnnotations() {
    try {
      const result = await chrome.storage.local.get(null);
      const cutoffDate = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days ago
      let cleaned = false;
      
      for (const [key, data] of Object.entries(result)) {
        if (key.startsWith('annotations_') && data.annotations) {
          const filteredAnnotations = data.annotations.filter(annotation => 
            (annotation.timestamp || 0) > cutoffDate
          );
          
          if (filteredAnnotations.length !== data.annotations.length) {
            data.annotations = filteredAnnotations;
            await chrome.storage.local.set({ [key]: data });
            cleaned = true;
          }
        }
      }
      
      if (cleaned) {
        console.log('Cleaned up old annotations');
        this.broadcastStatsUpdate();
      }
    } catch (error) {
      console.error('Error cleaning up annotations:', error);
    }
  }
}

// Initialize the background service
new BackgroundService();

// Cleanup old annotations once per day
chrome.alarms.create('cleanup-annotations', { 
  delayInMinutes: 1, 
  periodInMinutes: 24 * 60 
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup-annotations') {
    const backgroundService = new BackgroundService();
    backgroundService.cleanupOldAnnotations();
  }
});
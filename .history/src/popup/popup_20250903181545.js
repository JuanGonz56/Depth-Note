// Popup functionality - Fixed version
class PopupManager {
  constructor() {
    this.init();
  }
  
  async init() {
    await this.loadStats();
    await this.loadRecentAnnotations();
    this.setupEventListeners();
    this.loadSettings();
  }
  
  setupEventListeners() {
    // Toggle annotation tool - FIXED ID
    document.getElementById('toggle-tool').addEventListener('click', () => {
      this.toggleAnnotationTool();
    });
    
    // Export annotations
    document.getElementById('export-annotations').addEventListener('click', () => {
      this.exportAnnotations();
    });
    
    // Import annotations
    document.getElementById('import-annotations').addEventListener('click', () => {
      this.importAnnotations();
    });
    
    // Settings
    document.getElementById('auto-save').addEventListener('change', (e) => {
      this.saveSetting('autoSave', e.target.checked);
    });
    
    document.getElementById('show-depth-indicator').addEventListener('change', (e) => {
      this.saveSetting('showDepthIndicator', e.target.checked);
    });
    
    document.getElementById('default-depth').addEventListener('change', (e) => {
      this.saveSetting('defaultDepth', parseInt(e.target.value));
    });
  }
  
  async toggleAnnotationTool() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      console.log("Sending message to tab:", tab.id);
      
      // Send message to content script to toggle annotation mode
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleAnnotationMode' });
      console.log("Response received:", response);
      
      // Update button text
      const button = document.getElementById('toggle-tool');
      const buttonText = button.querySelector('.btn-text');
      
      if (buttonText.textContent === 'Start Annotating') {
        buttonText.textContent = 'Stop Annotating';
        button.classList.add('active');
      } else {
        buttonText.textContent = 'Start Annotating';
        button.classList.remove('active');
      }
      
      // Close popup after activating
      setTimeout(() => window.close(), 500);
      
    } catch (error) {
      console.error('Error toggling annotation tool:', error);
      // If content script isn't loaded, inject it
      this.injectContentScript();
    }
  }
  
  async injectContentScript() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      console.log("Injecting content script into tab:", tab.id);
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content.js']
      });
      
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['src/content/content.css']
      });
      
      console.log("Content script injected successfully");
      
      // Try toggling again after injection
      setTimeout(() => this.toggleAnnotationTool(), 1000);
      
    } catch (error) {
      console.error('Error injecting content script:', error);
    }
  }
  
  async loadStats() {
    try {
      // Get all stored annotations
      const result = await chrome.storage.local.get(null);
      const annotationKeys = Object.keys(result).filter(key => key.startsWith('annotations_'));
      
      let totalAnnotations = 0;
      annotationKeys.forEach(key => {
        if (result[key] && result[key].annotations) {
          totalAnnotations += result[key].annotations.length;
        }
      });
      
      document.getElementById('annotation-count').textContent = totalAnnotations;
      document.getElementById('page-visits').textContent = annotationKeys.length;
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }
  
  async loadRecentAnnotations() {
    try {
      const result = await chrome.storage.local.get(null);
      const annotationKeys = Object.keys(result)
        .filter(key => key.startsWith('annotations_'))
        .sort((a, b) => {
          const aData = result[a];
          const bData = result[b];
          const aLatest = Math.max(...(aData.annotations || []).map(ann => ann.timestamp || 0));
          const bLatest = Math.max(...(bData.annotations || []).map(ann => ann.timestamp || 0));
          return bLatest - aLatest;
        });
      
      const recentList = document.getElementById('recent-annotations');
      
      if (annotationKeys.length === 0) {
        return; // Keep empty state
      }
      
      recentList.innerHTML = '';
      
      // Show recent annotations from up to 3 most recent pages
      const recentPages = annotationKeys.slice(0, 3);
      
      recentPages.forEach(key => {
        const data = result[key];
        if (data && data.annotations && data.annotations.length > 0) {
          data.annotations
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 2)
            .forEach(annotation => {
              const item = this.createAnnotationItem(annotation, data.url);
              recentList.appendChild(item);
            });
        }
      });
      
    } catch (error) {
      console.error('Error loading recent annotations:', error);
    }
  }
  
  createAnnotationItem(annotation, url) {
    const item = document.createElement('div');
    item.className = 'annotation-item';
    
    const preview = document.createElement('div');
    preview.className = 'annotation-preview';
    
    const textPreview = document.createElement('div');
    textPreview.className = 'annotation-text-preview';
    textPreview.textContent = annotation.text || 'Empty annotation';
    
    const meta = document.createElement('div');
    meta.className = 'annotation-meta';
    const hostname = new URL(url).hostname;
    const date = new Date(annotation.timestamp).toLocaleDateString();
    meta.textContent = `${hostname} • ${date}`;
    
    preview.appendChild(textPreview);
    preview.appendChild(meta);
    
    const depthIndicator = document.createElement('div');
    depthIndicator.className = 'annotation-depth';
    depthIndicator.textContent = (annotation.depth || 0) + 1;
    depthIndicator.style.background = this.getDepthColor(annotation.depth || 0);
    
    item.appendChild(preview);
    item.appendChild(depthIndicator);
    
    // Click to navigate to annotation
    item.addEventListener('click', () => {
      this.navigateToAnnotation(url, annotation.id);
    });
    
    return item;
  }
  
  getDepthColor(depth) {
    const colors = ['#ff4757', '#ffa502', '#2ed573', '#5352ed', '#ff6b9d'];
    return colors[depth] || colors[0];
  }
  
  async navigateToAnnotation(url, annotationId) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url !== url) {
        // Navigate to the page first
        await chrome.tabs.update(tab.id, { url: url });
        
        // Wait a bit for page to load, then highlight annotation
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'highlightAnnotation',
            annotationId: annotationId
          });
        }, 2000);
      } else {
        // Same page, just highlight
        await chrome.tabs.sendMessage(tab.id, {
          action: 'highlightAnnotation',
          annotationId: annotationId
        });
      }
      
      window.close();
      
    } catch (error) {
      console.error('Error navigating to annotation:', error);
    }
  }
  
  async exportAnnotations() {
    try {
      const result = await chrome.storage.local.get(null);
      const annotationData = {};
      
      Object.keys(result).forEach(key => {
        if (key.startsWith('annotations_')) {
          annotationData[key] = result[key];
        }
      });
      
      const dataStr = JSON.stringify(annotationData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `depth-annotations-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success feedback
      this.showFeedback('Annotations exported successfully!');
      
    } catch (error) {
      console.error('Error exporting annotations:', error);
      this.showFeedback('Error exporting annotations', 'error');
    }
  }
  
  async importAnnotations() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Import the annotations
        await chrome.storage.local.set(data);
        
        // Refresh the popup
        await this.loadStats();
        await this.loadRecentAnnotations();
        
        this.showFeedback('Annotations imported successfully!');
        
      } catch (error) {
        console.error('Error importing annotations:', error);
        this.showFeedback('Error importing annotations', 'error');
      }
    };
    
    input.click();
  }
  
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {};
      
      document.getElementById('auto-save').checked = settings.autoSave !== false;
      document.getElementById('show-depth-indicator').checked = settings.showDepthIndicator !== false;
      document.getElementById('default-depth').value = settings.defaultDepth || 0;
      
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  async saveSetting(key, value) {
    try {
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {};
      settings[key] = value;
      
      await chrome.storage.local.set({ settings });
      console.log(`Setting saved: ${key} = ${value}`);
      
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  }
  
  showFeedback(message, type = 'success') {
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = `feedback ${type}`;
    feedback.textContent = message;
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#ff4757' : '#2ed573'};
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(feedback);
    
    // Remove after 3 seconds
    setTimeout(() => {
      feedback.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log("Popup DOM loaded!");
  new PopupManager();
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateStats') {
    // Refresh stats when annotations are updated
    setTimeout(() => {
      const popup = new PopupManager();
      popup.loadStats();
      popup.loadRecentAnnotations();
    }, 100);
  }
});
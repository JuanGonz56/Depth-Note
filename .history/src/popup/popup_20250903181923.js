// Debug version to find correct element IDs
document.addEventListener('DOMContentLoaded', function() {
  console.log("Popup DOM loaded!");
  
  // Debug: List all elements with IDs
  const allElementsWithIds = document.querySelectorAll('[id]');
  console.log("Found elements with IDs:");
  allElementsWithIds.forEach(element => {
    console.log(`- ID: "${element.id}", Tag: ${element.tagName}, Text: "${element.textContent?.trim()?.substring(0, 50)}"`);
  });
  
  // Debug: List all buttons
  const allButtons = document.querySelectorAll('button');
  console.log("Found buttons:");
  allButtons.forEach((button, index) => {
    console.log(`- Button ${index}: ID="${button.id}", Class="${button.className}", Text="${button.textContent?.trim()}"`);
  });
  
  // Try to find the main button by different methods
  const toggleBtn = document.getElementById('toggle-tool') || 
                   document.querySelector('.action-btn.primary') ||
                   document.querySelector('button[id*="toggle"]') ||
                   document.querySelector('button:first-of-type');
  
  console.log("Toggle button found:", toggleBtn);
  
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      console.log("Main button clicked!");
      
      // Send message to content script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        console.log("Sending message to tab:", tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleAnnotationMode'}, function(response) {
          if (chrome.runtime.lastError) {
            console.log("Error:", chrome.runtime.lastError.message);
          } else {
            console.log("Response received:", response);
          }
        });
      });
    });
  } else {
    console.error("Could not find the main toggle button!");
  }
  
  // Set up other event listeners safely
  const exportBtn = document.getElementById('export-annotations');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => console.log("Export clicked"));
  } else {
    console.log("Export button not found");
  }
  
  const importBtn = document.getElementById('import-annotations');
  if (importBtn) {
    importBtn.addEventListener('click', () => console.log("Import clicked"));
  } else {
    console.log("Import button not found");
  }
  
  const autoSave = document.getElementById('auto-save');
  if (autoSave) {
    autoSave.addEventListener('change', (e) => console.log("Auto-save:", e.target.checked));
  } else {
    console.log("Auto-save checkbox not found");
  }
  
  const depthIndicator = document.getElementById('show-depth-indicator');
  if (depthIndicator) {
    depthIndicator.addEventListener('change', (e) => console.log("Show depth indicator:", e.target.checked));
  } else {
    console.log("Depth indicator checkbox not found");
  }
  
  const defaultDepth = document.getElementById('default-depth');
  if (defaultDepth) {
    defaultDepth.addEventListener('change', (e) => console.log("Default depth:", e.target.value));
  } else {
    console.log("Default depth selector not found");
  }
});
// Fixed popup script with better error handling
document.addEventListener('DOMContentLoaded', function() {
  console.log("Popup loaded!");
  
  // Main start annotating button
  document.getElementById('startBtn').addEventListener('click', function() {
    console.log("Start Annotating clicked!");
    
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      console.log("Sending message to tab:", tabs[0].id);
      
      chrome.tabs.sendMessage(tabs[0].id, {action: 'start'}, function(response) {
        // Check for Chrome runtime errors
        if (chrome.runtime.lastError) {
          console.log("Chrome error:", chrome.runtime.lastError.message);
          console.log("Content script not ready yet - but it might still work!");
        } else {
          console.log("Message sent successfully, response:", response);
        }
      });
    });
  });
  
  // Export button (placeholder for now)
  document.getElementById('export-annotations').addEventListener('click', function() {
    console.log("Export clicked");
  });
  
  // Import button (placeholder for now)
  document.getElementById('import-annotations').addEventListener('click', function() {
    console.log("Import clicked");
  });
  
  // Settings checkboxes
  document.getElementById('auto-save').addEventListener('change', function(e) {
    console.log("Auto-save:", e.target.checked);
  });
  
  document.getElementById('show-depth-indicator').addEventListener('change', function(e) {
    console.log("Show depth indicator:", e.target.checked);
  });
  
  // Default depth selector
  document.getElementById('default-depth').addEventListener('change', function(e) {
    console.log("Default depth:", e.target.value);
  });
});
// Simple popup - works with your existing HTML
document.addEventListener('DOMContentLoaded', function() {
  
  // Use the correct ID that exists in your HTML
  document.getElementById('toggle-tool').addEventListener('click', function() {
    console.log("Start button clicked!");
    
    // Tell the current webpage to start annotation mode
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'start'});
    });
  });
  
});
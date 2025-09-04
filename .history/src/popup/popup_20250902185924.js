// Simple popup - just handles button clicks
document.addEventListener('DOMContentLoaded', function() {
  
  // When "Start Annotating" is clicked
  document.getElementById('startBtn').addEventListener('click', function() {
    // Tell the current webpage to start annotation mode
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'start'});
    });
  });
  
  // When depth buttons are clicked
  document.getElementById('nearBtn').addEventListener('click', function() {
    console.log("Near depth selected");
  });
  
});
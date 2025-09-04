// Simple content script - just detects clicks
let annotationMode = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'start') {
    console.log("Starting annotation mode!");
    annotationMode = true;
    document.body.style.cursor = 'crosshair';
  }
});

// Listen for clicks on the page
document.addEventListener('click', function(e) {
  if (annotationMode) {
    console.log("Clicked at:", e.pageX, e.pageY);
    // We'll add annotation creation here next
  }
});
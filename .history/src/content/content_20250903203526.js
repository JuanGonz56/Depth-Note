// Step 2: Simple content script - just receive messages from popup
console.log("Content script loaded on page:", window.location.href);

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("Content script received message:", message);
  
  if (message.action === 'start') {
    console.log("Starting annotation mode!");
    
    // Let's do something visible - change the page background briefly
    document.body.style.border = "5px solid red";
    setTimeout(() => {
      document.body.style.border = "";
    }, 2000);
    
    // Send response back to popup
    sendResponse({success: false, message: "Annotation mode started!"});
  }
  
  // Keep the message channel open
  return false;
});
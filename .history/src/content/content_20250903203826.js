// Step 2: Simple content script - just receive messages from popup
console.log("Content script loaded on page:", window.location.href);

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("Content script received message:", message);

  if (message.action === 'start') {
    console.log("Starting annotation mode!");

    // Add border immediately
    document.body.style.border = "5px solid red";

    // Reset border after 2s
    setTimeout(() => {
      document.body.style.border = "";
      // Send response AFTER the async work
      sendResponse({ success: true, message: "Annotation mode started!" });
    }, 2000);

    // IMPORTANT: return true to keep the channel open for async response
    return true;
  }

  // Handle unknown actions
  sendResponse({ success: false, message: "Unknown action" });
  return false;
});

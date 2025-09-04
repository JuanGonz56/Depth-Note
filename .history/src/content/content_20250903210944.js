// Step 3: Content script with floating toolbar
console.log("Content script loaded on page:", window.location.href);

let annotationMode = false;
let toolbar = null;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("Content script received message:", message);
  
  if (message.action === 'start') {
    console.log("Starting annotation mode!");
    
    // Toggle annotation mode
    if (annotationMode) {
      stopAnnotationMode();
    } else {
      startAnnotationMode();
    }
    
    // Send response back to popup
    sendResponse({success: true, message: "Annotation mode toggled!"});
  }
  
  return true;
});

function startAnnotationMode() {
  annotationMode = true;
  console.log("Annotation mode ON");
  
  // Create floating toolbar
  createFloatingToolbar();
  
  // Change cursor to crosshair
  document.body.style.cursor = 'crosshair';
  
  // Add click listener to create annotations
  document.addEventListener('click', handlePageClick);
}

function stopAnnotationMode() {
  annotationMode = false;
  console.log("Annotation mode OFF");
  
  // Remove toolbar
  if (toolbar) {
    toolbar.remove();
    toolbar = null;
  }
  
  // Reset cursor
  document.body.style.cursor = '';
  
  // Remove click listener
  document.removeEventListener('click', handlePageClick);
}

function createFloatingToolbar() {
  // Create toolbar element
  toolbar = document.createElement('div');
  toolbar.id = 'annotation-toolbar';
  toolbar.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #667eea;
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      cursor: pointer;
    ">
      🎯 Annotation Mode ON - Click anywhere to add note
    </div>
  `;
  
  // Add click handler to close annotation mode
  toolbar.addEventListener('click', function(e) {
    e.stopPropagation();
    stopAnnotationMode();
  });
  
  document.body.appendChild(toolbar);
}

function handlePageClick(e) {
  // Don't create annotation if clicking on toolbar
  if (e.target.closest('#annotation-toolbar')) {
    return;
  }
  
  // Prevent normal click behavior
  e.preventDefault();
  e.stopPropagation();
  
  console.log("Creating annotation at:", e.pageX, e.pageY);
  
  // Create a simple annotation marker
  createAnnotationMarker(e.pageX, e.pageY);
}

function createAnnotationMarker(x, y) {
  const marker = document.createElement('div');
  marker.innerHTML = `
    <div style="
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 20px;
      height: 20px;
      background: #ff4757;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      z-index: 9999;
      animation: pulse 1s ease-out;
    ">📝</div>
  `;
  
  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(marker);
  
  console.log("Annotation marker created!");
}
// Step 4: Content script with text input for annotations
console.log("Content script loaded on page:", window.location.href);

let annotationMode = false;
let toolbar = null;
let annotationCounter = 0;

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
    
    sendResponse({success: true, message: "Annotation mode toggled!"});
  }
  
  return true;
});

function startAnnotationMode() {
  annotationMode = true;
  console.log("Annotation mode ON");
  
  createFloatingToolbar();
  document.body.style.cursor = 'crosshair';
  document.addEventListener('click', handlePageClick);
}

function stopAnnotationMode() {
  annotationMode = false;
  console.log("Annotation mode OFF");
  
  if (toolbar) {
    toolbar.remove();
    toolbar = null;
  }
  
  document.body.style.cursor = '';
  document.removeEventListener('click', handlePageClick);
}

function createFloatingToolbar() {
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
  
  toolbar.addEventListener('click', function(e) {
    e.stopPropagation();
    stopAnnotationMode();
  });
  
  document.body.appendChild(toolbar);
}

function handlePageClick(e) {
  if (e.target.closest('#annotation-toolbar')) {
    return;
  }
  
  // Don't interfere with existing annotation popups
  if (e.target.closest('.annotation-popup')) {
    return;
  }
  
  e.preventDefault();
  e.stopPropagation();
  
  console.log("Creating annotation at:", e.pageX, e.pageY);
  createAnnotationMarker(e.pageX, e.pageY);
}

function createAnnotationMarker(x, y) {
  annotationCounter++;
  const annotationId = `annotation-${annotationCounter}`;
  
  const marker = document.createElement('div');
  marker.id = annotationId;
  marker.innerHTML = `
    <!-- Red dot marker -->
    <div class="annotation-dot" style="
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 24px;
      height: 24px;
      background: #ff4757;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      animation: pulse 1s ease-out;
    ">📝</div>
    
    <!-- Text input popup (hidden by default) -->
    <div class="annotation-popup" style="
      position: absolute;
      left: ${x + 30}px;
      top: ${y}px;
      width: 200px;
      background: white;
      border: 2px solid #667eea;
      border-radius: 8px;
      padding: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      display: none;
      font-family: Arial, sans-serif;
    ">
      <textarea placeholder="Add your note..." style="
        width: 100%;
        height: 60px;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px;
        font-size: 14px;
        resize: none;
        outline: none;
      "></textarea>
      <div style="margin-top: 8px; text-align: right;">
        <button class="save-btn" style="
          background: #2ed573;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 5px;
          font-size: 12px;
        ">Save</button>
        <button class="cancel-btn" style="
          background: #ff4757;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Cancel</button>
      </div>
    </div>
  `;
  
  // Add pulse animation
  if (!document.getElementById('annotation-styles')) {
    const style = document.createElement('style');
    style.id = 'annotation-styles';
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(0); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(marker);
  
  // Set up event listeners
  setupAnnotationEvents(marker);
  
  // Auto-show the popup for new annotations
  const popup = marker.querySelector('.annotation-popup');
  const textarea = marker.querySelector('textarea');
  popup.style.display = 'block';
  textarea.focus();
  
  console.log("Annotation marker created!");
}

function setupAnnotationEvents(marker) {
  const dot = marker.querySelector('.annotation-dot');
  const popup = marker.querySelector('.annotation-popup');
  const textarea = marker.querySelector('textarea');
  const saveBtn = marker.querySelector('.save-btn');
  const cancelBtn = marker.querySelector('.cancel-btn');
  
  // Click dot to show/hide popup
  dot.addEventListener('click', function(e) {
    e.stopPropagation();
    const isVisible = popup.style.display === 'block';
    popup.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      textarea.focus();
    }
  });
  
  // Save button
  saveBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const text = textarea.value.trim();
    if (text) {
      // Change dot color to indicate it has text
      dot.style.background = '#2ed573';
      dot.innerHTML = '💬';
      console.log("Annotation saved:", text);
    }
    popup.style.display = 'none';
  });
  
  // Cancel button
  cancelBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    popup.style.display = 'none';
  });
  
  // Click outside to close popup
  document.addEventListener('click', function(e) {
    if (!marker.contains(e.target)) {
      popup.style.display = 'none';
    }
  });
}
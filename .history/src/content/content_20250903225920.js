// Content script with DELETE button and custom color theme
console.log("Content script loaded on page:", window.location.href);

let annotationMode = false;
let toolbar = null;
let annotationCounter = 0;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("Content script received message:", message);
  
  if (message.action === 'start') {
    console.log("Starting annotation mode!");
    
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
      background: linear-gradient(135deg, #5682B1 0%, #739EC9 100%);
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
    <!-- Annotation Dot with theme colors -->
    <div class="annotation-dot" style="
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 30px;
      height: 30px;
      background: #5682B1;
      border-radius: 50%;
      border: 4px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      animation: pulse 1.5s ease-out;
    ">📝</div>
    
    <!-- Text Popup with theme colors -->
    <div class="annotation-popup" style="
      position: absolute;
      left: ${x + 40}px;
      top: ${y - 20}px;
      width: 320px;
      background: #45a7b4ff;
      border: 3px solid #5682B1;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(86, 130, 177, 0.3);
      z-index: 10001;
      display: block;
      font-family: Arial, sans-serif;
    ">
      <div style="
        background: white;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 15px;
        border: 2px solid #739EC9;
      ">
        <h3 style="margin: 0 0 10px 0; color: #000000; font-weight: bold;">Add Your Note:</h3>
        <textarea placeholder="Type your note here..." style="
          width: 100%;
          height: 80px;
          border: 2px solid #739EC9;
          border-radius: 6px;
          padding: 12px;
          font-size: 16px;
          resize: none;
          outline: none;
          box-sizing: border-box;
          background: #FFE8DB;
          color: #000000;
        "></textarea>
      </div>
      
      <div style="display: flex; justify-content: space-between; gap: 8px;">
        <button class="save-btn" style="
          background: #5682B1;
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          flex: 1;
          transition: all 0.2s ease;
        ">💾 SAVE</button>
        
        <button class="cancel-btn" style="
          background: #739EC9;
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          flex: 1;
          transition: all 0.2s ease;
        ">❌ CANCEL</button>
        
        <button class="delete-btn" style="
          background: #000000;
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          flex: 1;
          transition: all 0.2s ease;
        ">🗑️ DELETE</button>
      </div>
    </div>
  `;
  
  // Add pulse animation and hover effects
  if (!document.getElementById('annotation-styles')) {
    const style = document.createElement('style');
    style.id = 'annotation-styles';
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(0); }
        50% { transform: scale(1.3); }
        100% { transform: scale(1); }
      }
      
      .save-btn:hover {
        background: #456a94 !important;
        transform: translateY(-1px);
      }
      
      .cancel-btn:hover {
        background: #5e85ab !important;
        transform: translateY(-1px);
      }
      
      .delete-btn:hover {
        background: #333333 !important;
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(marker);
  setupAnnotationEvents(marker);
  
  // Auto-focus the textarea
  const textarea = marker.querySelector('textarea');
  textarea.focus();
  
  console.log("Annotation marker created!");
}

function setupAnnotationEvents(marker) {
  const dot = marker.querySelector('.annotation-dot');
  const popup = marker.querySelector('.annotation-popup');
  const textarea = marker.querySelector('textarea');
  const saveBtn = marker.querySelector('.save-btn');
  const cancelBtn = marker.querySelector('.cancel-btn');
  const deleteBtn = marker.querySelector('.delete-btn');
  
  // Safety check
  if (!dot || !popup || !textarea || !saveBtn || !cancelBtn || !deleteBtn) {
    console.error('Missing annotation elements');
    return;
  }
  
  // Click dot to show/hide popup
  dot.addEventListener('click', function(e) {
    e.stopPropagation();
    const isVisible = popup.style.display === 'block';
    popup.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      textarea.focus();
    }
  });
  
  // Save button - changes dot to show it has content
  saveBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const text = textarea.value.trim();
    if (text) {
      dot.style.background = '#739EC9';
      dot.innerHTML = '💬';
      console.log("Annotation saved:", text);
    }
    popup.style.display = 'none';
  });
  
  // Cancel button - removes empty annotations, closes popup for filled ones
  cancelBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!textarea.value.trim()) {
      marker.remove();
      console.log("Empty annotation cancelled and removed");
    } else {
      popup.style.display = 'none';
      console.log("Annotation editing cancelled");
    }
  });
  
  // Delete button - always removes the annotation completely
  deleteBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    marker.remove();
    console.log("Annotation deleted permanently");
  });
}
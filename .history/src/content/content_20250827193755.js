// Depth Annotation Tool - Content Script
class DepthAnnotationTool {
  constructor() {
    this.isActive = false;
    this.annotations = [];
    this.currentDepthLayer = 0;
    this.maxDepthLayers = 5;
    this.annotationCounter = 0;
    
    // Initialize the tool
    this.init();
  }
  
  init() {
    // Create the annotation container
    this.createAnnotationContainer();
    
    // Create the floating toolbar
    this.createFloatingToolbar();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load saved annotations
    this.loadAnnotations();
    
    console.log('Depth Annotation Tool initialized');
  }
  
  createAnnotationContainer() {
    this.container = document.createElement('div');
    this.container.id = 'depth-annotation-container';
    this.container.className = 'depth-container';
    document.body.appendChild(this.container);
  }
  
  createFloatingToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.id = 'depth-toolbar';
    this.toolbar.className = 'depth-toolbar';
    
    this.toolbar.innerHTML = `
      <div class="toolbar-content">
        <button id="toggle-annotations" class="toolbar-btn active">
          📝 Annotate
        </button>
        <div class="depth-selector">
          <label>Depth:</label>
          <input type="range" id="depth-slider" min="0" max="4" value="0" class="depth-slider">
          <span id="depth-value">1</span>
        </div>
        <button id="clear-annotations" class="toolbar-btn danger">
          🗑️ Clear All
        </button>
        <button id="toggle-3d-view" class="toolbar-btn">
          🎭 3D View
        </button>
      </div>
    `;
    
    document.body.appendChild(this.toolbar);
  }
  
  setupEventListeners() {
    // Toggle annotation mode
    document.getElementById('toggle-annotations').addEventListener('click', () => {
      this.toggleAnnotationMode();
    });
    
    // Depth slider
    const depthSlider = document.getElementById('depth-slider');
    depthSlider.addEventListener('input', (e) => {
      this.currentDepthLayer = parseInt(e.target.value);
      document.getElementById('depth-value').textContent = this.currentDepthLayer + 1;
    });
    
    // Clear all annotations
    document.getElementById('clear-annotations').addEventListener('click', () => {
      this.clearAllAnnotations();
    });
    
    // Toggle 3D view
    document.getElementById('toggle-3d-view').addEventListener('click', () => {
      this.toggle3DView();
    });
    
    // Page click handler for creating annotations
    document.addEventListener('click', (e) => this.handlePageClick(e));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.toggleAnnotationMode();
      }
    });
  }
  
  toggleAnnotationMode() {
    this.isActive = !this.isActive;
    const toggleBtn = document.getElementById('toggle-annotations');
    
    if (this.isActive) {
      document.body.classList.add('annotation-mode');
      toggleBtn.textContent = '✅ Annotating';
      toggleBtn.classList.add('active');
      this.showCrosshair();
    } else {
      document.body.classList.remove('annotation-mode');
      toggleBtn.textContent = '📝 Annotate';
      toggleBtn.classList.remove('active');
      this.hideCrosshair();
    }
  }
  
  showCrosshair() {
    document.body.style.cursor = 'crosshair';
  }
  
  hideCrosshair() {
    document.body.style.cursor = 'default';
  }
  
  handlePageClick(e) {
    if (!this.isActive) return;
    if (e.target.closest('#depth-toolbar') || e.target.closest('.depth-annotation')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    this.createAnnotation(e.pageX, e.pageY);
  }
  
  createAnnotation(x, y) {
    const annotationId = `annotation-${this.annotationCounter++}`;
    const annotation = document.createElement('div');
    annotation.className = 'depth-annotation';
    annotation.id = annotationId;
    annotation.dataset.depth = this.currentDepthLayer;
    
    // Position the annotation
    annotation.style.left = `${x}px`;
    annotation.style.top = `${y}px`;
    
    // Create annotation content
    annotation.innerHTML = `
      <div class="annotation-marker" style="transform: translateZ(${this.currentDepthLayer * 20}px)">
        <div class="marker-dot"></div>
        <div class="marker-pulse"></div>
      </div>
      <div class="annotation-popup" style="transform: translateZ(${this.currentDepthLayer * 20 + 10}px)">
        <textarea placeholder="Add your annotation..." class="annotation-text"></textarea>
        <div class="annotation-actions">
          <button class="save-btn">Save</button>
          <button class="delete-btn">Delete</button>
        </div>
      </div>
    `;
    
    // Apply depth-based styling
    this.applyDepthStyling(annotation, this.currentDepthLayer);
    
    this.container.appendChild(annotation);
    
    // Set up annotation-specific event listeners
    this.setupAnnotationEvents(annotation, annotationId);
    
    // Auto-focus the textarea
    const textarea = annotation.querySelector('.annotation-text');
    textarea.focus();
    
    // Store annotation data
    this.annotations.push({
      id: annotationId,
      x: x,
      y: y,
      depth: this.currentDepthLayer,
      text: '',
      timestamp: Date.now()
    });
  }
  
  applyDepthStyling(annotation, depth) {
    const intensity = (depth + 1) / this.maxDepthLayers;
    const blur = depth * 0.5;
    const scale = 1 + (depth * 0.1);
    const opacity = 1 - (depth * 0.1);
    
    annotation.style.filter = `blur(${blur}px)`;
    annotation.style.transform = `scale(${scale})`;
    annotation.style.opacity = opacity;
    annotation.style.zIndex = 1000 + depth;
    
    // Add depth-based color coding
    const colors = ['#ff4757', '#ffa502', '#2ed573', '#5352ed', '#ff6b9d'];
    annotation.style.setProperty('--depth-color', colors[depth] || colors[0]);
  }
  
  setupAnnotationEvents(annotation, annotationId) {
    const marker = annotation.querySelector('.annotation-marker');
    const popup = annotation.querySelector('.annotation-popup');
    const textarea = annotation.querySelector('.annotation-text');
    const saveBtn = annotation.querySelector('.save-btn');
    const deleteBtn = annotation.querySelector('.delete-btn');
    
    // Show/hide popup on marker click
    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.toggle('visible');
    });
    
    // Save annotation
    saveBtn.addEventListener('click', () => {
      this.saveAnnotation(annotationId, textarea.value);
      popup.classList.remove('visible');
    });
    
    // Delete annotation
    deleteBtn.addEventListener('click', () => {
      this.deleteAnnotation(annotationId);
    });
    
    // Auto-save on textarea blur
    textarea.addEventListener('blur', () => {
      if (textarea.value.trim()) {
        this.saveAnnotation(annotationId, textarea.value);
      }
    });
  }
  
  saveAnnotation(annotationId, text) {
    const annotationIndex = this.annotations.findIndex(a => a.id === annotationId);
    if (annotationIndex !== -1) {
      this.annotations[annotationIndex].text = text;
      this.saveToStorage();
    }
  }
  
  deleteAnnotation(annotationId) {
    const annotation = document.getElementById(annotationId);
    if (annotation) {
      annotation.remove();
    }
    
    this.annotations = this.annotations.filter(a => a.id !== annotationId);
    this.saveToStorage();
  }
  
  clearAllAnnotations() {
    if (confirm('Are you sure you want to clear all annotations?')) {
      this.container.innerHTML = '';
      this.annotations = [];
      this.saveToStorage();
    }
  }
  
  toggle3DView() {
    document.body.classList.toggle('depth-3d-view');
    const btn = document.getElementById('toggle-3d-view');
    
    if (document.body.classList.contains('depth-3d-view')) {
      btn.textContent = '📱 2D View';
      this.enable3DEffects();
    } else {
      btn.textContent = '🎭 3D View';
      this.disable3DEffects();
    }
  }
  
  enable3DEffects() {
    document.body.style.perspective = '1000px';
    document.body.style.perspectiveOrigin = '50% 50%';
    
    // Add mouse movement parallax
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
  }
  
  disable3DEffects() {
    document.body.style.perspective = '';
    document.body.style.perspectiveOrigin = '';
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
  }
  
  handleMouseMove(e) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const mouseX = (e.clientX - centerX) / centerX;
    const mouseY = (e.clientY - centerY) / centerY;
    
    // Apply parallax to annotations based on their depth
    this.annotations.forEach(annotationData => {
      const annotation = document.getElementById(annotationData.id);
      if (annotation) {
        const depth = annotationData.depth;
        const parallaxX = mouseX * (depth + 1) * 5;
        const parallaxY = mouseY * (depth + 1) * 5;
        
        annotation.style.transform = `translate(${parallaxX}px, ${parallaxY}px) translateZ(${depth * 20}px)`;
      }
    });
  }
  
  saveToStorage() {
    const data = {
      url: window.location.href,
      annotations: this.annotations
    };
    
    chrome.storage.local.set({
      [`annotations_${btoa(window.location.href)}`]: data
    });
  }
  
  loadAnnotations() {
    const key = `annotations_${btoa(window.location.href)}`;
    chrome.storage.local.get([key], (result) => {
      if (result[key] && result[key].annotations) {
        result[key].annotations.forEach(annotationData => {
          this.recreateAnnotation(annotationData);
        });
        this.annotations = result[key].annotations;
        this.annotationCounter = Math.max(...this.annotations.map(a => 
          parseInt(a.id.split('-')[1]) || 0
        )) + 1;
      }
    });
  }
  
  recreateAnnotation(data) {
    const annotation = document.createElement('div');
    annotation.className = 'depth-annotation';
    annotation.id = data.id;
    annotation.dataset.depth = data.depth;
    
    annotation.style.left = `${data.x}px`;
    annotation.style.top = `${data.y}px`;
    
    annotation.innerHTML = `
      <div class="annotation-marker" style="transform: translateZ(${data.depth * 20}px)">
        <div class="marker-dot"></div>
        <div class="marker-pulse"></div>
      </div>
      <div class="annotation-popup" style="transform: translateZ(${data.depth * 20 + 10}px)">
        <textarea class="annotation-text">${data.text}</textarea>
        <div class="annotation-actions">
          <button class="save-btn">Save</button>
          <button class="delete-btn">Delete</button>
        </div>
      </div>
    `;
    
    this.applyDepthStyling(annotation, data.depth);
    this.container.appendChild(annotation);
    this.setupAnnotationEvents(annotation, data.id);
  }
}

// Initialize the tool when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DepthAnnotationTool();
  });
} else {
  new DepthAnnotationTool();
}
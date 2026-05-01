const PAGE_URL = window.location.href;
let annotationMode = false;
let is3DMode = false;
let currentDepth = 0;
let toolbar = null;
const activeAnnotations = new Map();

const DEPTH_COLORS = ["#ff4757", "#ffa502", "#2ed573", "#5352ed", "#ff6b9d"];
const DEPTH_NAMES = ["Layer 1", "Layer 2", "Layer 3", "Layer 4", "Layer 5"];

function generateId() {
  return "dn-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function init() {
  injectBaseStyles();
  try {
    const res = await chrome.runtime.sendMessage({
      action: "getAnnotations",
      url: PAGE_URL,
    });
    if (res?.success && Array.isArray(res.data))
      res.data.forEach(renderSavedAnnotation);
  } catch (_) {}
}

function injectBaseStyles() {
  if (document.getElementById("dn-base-styles")) return;
  const s = document.createElement("style");
  s.id = "dn-base-styles";
  s.textContent = `
    @keyframes dn-pop-in {
      0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
      70%  { transform: scale(1.25) rotate(4deg); }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    .dn-dot {
      width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; user-select: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      animation: dn-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .dn-dot:hover { transform: scale(1.22); }
    .dn-wrapper {
      position: absolute; z-index: 9998;
      pointer-events: none;
      transition: transform 0.08s ease-out;
    }
    .dn-dot, .dn-popup { pointer-events: auto; }
  `;
  document.head.appendChild(s);
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  switch (message.action) {
    case "start":
      annotationMode ? stopAnnotationMode() : startAnnotationMode();
      sendResponse({ success: true });
      break;
    case "loadExistingAnnotations":
      if (Array.isArray(message.annotations))
        message.annotations.forEach(renderSavedAnnotation);
      sendResponse({ success: true });
      break;
    case "quickAnnotate":
      if (!annotationMode) startAnnotationMode();
      createAnnotationAt(
        message.x || 100,
        message.y || 100,
        message.selectedText || "",
      );
      sendResponse({ success: true });
      break;
    case "toggle3DView":
      toggle3DMode();
      sendResponse({ success: true });
      break;
  }
  return true;
});

async function startAnnotationMode() {
  annotationMode = true;
  document.body.classList.add("annotation-mode");
  try {
    const res = await chrome.runtime.sendMessage({ action: "getSettings" });
    if (res?.success) currentDepth = res.data.defaultDepth ?? 0;
  } catch (_) {}
  createToolbar();
  document.addEventListener("click", handlePageClick, true);
}

function stopAnnotationMode() {
  annotationMode = false;
  document.body.classList.remove("annotation-mode");
  toolbar?.remove();
  toolbar = null;
  document.removeEventListener("click", handlePageClick, true);
}

function createToolbar() {
  toolbar = document.createElement("div");
  toolbar.id = "dn-toolbar";
  toolbar.className = "depth-toolbar";
  toolbar.innerHTML = `
    <div class="toolbar-content">
      <span style="white-space:nowrap;font-weight:600;">🎯 Annotation Mode</span>
      <div class="depth-selector">
        <span>Depth:</span>
        <input type="range" class="depth-slider" min="0" max="4" value="${currentDepth}">
        <span class="depth-value-label" style="background:rgba(255,255,255,0.2);padding:3px 8px;border-radius:4px;font-weight:bold;min-width:20px;text-align:center;">${currentDepth + 1}</span>
      </div>
      <button class="toolbar-btn${is3DMode ? " active" : ""}" id="dn-3d-btn">3D ${is3DMode ? "ON" : "OFF"}</button>
      <button class="toolbar-btn danger" id="dn-close-btn">✕ Close</button>
    </div>
  `;
  document.body.appendChild(toolbar);

  const slider = toolbar.querySelector(".depth-slider");
  const label = toolbar.querySelector(".depth-value-label");
  slider.addEventListener("input", (e) => {
    e.stopPropagation();
    currentDepth = +e.target.value;
    label.textContent = currentDepth + 1;
  });
  toolbar.querySelector("#dn-3d-btn").addEventListener("click", function (e) {
    e.stopPropagation();
    toggle3DMode();
    this.textContent = `3D ${is3DMode ? "ON" : "OFF"}`;
    this.classList.toggle("active", is3DMode);
  });
  toolbar.querySelector("#dn-close-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    stopAnnotationMode();
  });
}

function handlePageClick(e) {
  if (e.target.closest("#dn-toolbar") || e.target.closest(".dn-wrapper"))
    return;
  e.preventDefault();
  e.stopPropagation();
  createAnnotationAt(e.pageX, e.pageY, "");
}

function createAnnotationAt(x, y, prefillText) {
  const id = generateId();
  const data = {
    id,
    x,
    y,
    text: "",
    depth: currentDepth,
    timestamp: Date.now(),
    url: PAGE_URL,
  };
  const el = buildWrapper(id, x, y, currentDepth, false);
  document.body.appendChild(el);
  activeAnnotations.set(id, { element: el, data });
  openPopup(el, data, prefillText, true);
}

function renderSavedAnnotation(annotation) {
  if (activeAnnotations.has(annotation.id)) return;
  const el = buildWrapper(
    annotation.id,
    annotation.x,
    annotation.y,
    annotation.depth,
    true,
  );
  document.body.appendChild(el);
  activeAnnotations.set(annotation.id, {
    element: el,
    data: { ...annotation, url: annotation.url || PAGE_URL },
  });
}

function buildWrapper(id, x, y, depth, isSaved) {
  const color = DEPTH_COLORS[depth] ?? DEPTH_COLORS[0];
  const wrapper = document.createElement("div");
  wrapper.className = "dn-wrapper";
  wrapper.dataset.annotationId = id;
  wrapper.style.left = x + "px";
  wrapper.style.top = y + "px";
  const dot = document.createElement("div");
  dot.className = "dn-dot";
  dot.style.background = color;
  dot.style.boxShadow = `0 0 0 2px ${color}55, 0 4px 12px rgba(0,0,0,0.35)`;
  dot.textContent = isSaved ? "💬" : "📝";
  dot.addEventListener("click", function (e) {
    e.stopPropagation();
    const entry = activeAnnotations.get(id);
    if (!entry) return;
    const existing = wrapper.querySelector(".dn-popup");
    if (existing) existing.remove();
    else openPopup(wrapper, entry.data, "", false);
  });
  wrapper.appendChild(dot);
  return wrapper;
}

function openPopup(wrapper, data, prefillText, isNew) {
  wrapper.querySelector(".dn-popup")?.remove();
  const color = DEPTH_COLORS[data.depth] ?? DEPTH_COLORS[0];
  const popup = document.createElement("div");
  popup.className = "dn-popup";
  popup.style.cssText = `position:absolute;left:36px;top:-8px;width:268px;background:white;border-radius:12px;padding:13px;box-shadow:0 8px 28px rgba(0,0,0,0.22),0 0 0 2px ${color};z-index:10001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;`;
  popup.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;">
      <span style="background:${color};color:white;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;">${escHtml(DEPTH_NAMES[data.depth] || "Layer 1")}</span>
      <button class="dn-px-close" style="background:none;border:none;cursor:pointer;font-size:15px;color:#aaa;line-height:1;padding:2px 4px;">✕</button>
    </div>
    <textarea class="dn-ta" placeholder="Type your annotation…" style="width:100%;min-height:72px;border:2px solid ${color}44;border-radius:7px;padding:8px;font-size:13px;resize:vertical;outline:none;box-sizing:border-box;font-family:inherit;color:#333;transition:border-color 0.2s;">${escHtml(data.text || prefillText || "")}</textarea>
    <div style="display:flex;gap:7px;margin-top:9px;justify-content:flex-end;">
      <button class="dn-px-del" style="background:#fdf0f0;color:#c0392b;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;">🗑 Delete</button>
      <button class="dn-px-save" style="background:${color};color:white;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">💾 Save</button>
    </div>
  `;
  popup.addEventListener("click", (e) => e.stopPropagation());
  wrapper.appendChild(popup);
  const ta = popup.querySelector(".dn-ta");
  ta.focus();
  ta.addEventListener("focus", () => {
    ta.style.borderColor = color;
  });
  ta.addEventListener("blur", () => {
    ta.style.borderColor = color + "44";
  });
  popup.querySelector(".dn-px-close").addEventListener("click", (e) => {
    e.stopPropagation();
    if (isNew && !data.text && !ta.value.trim()) {
      activeAnnotations.delete(data.id);
      wrapper.remove();
    } else popup.remove();
  });
  popup.querySelector(".dn-px-save").addEventListener("click", async (e) => {
    e.stopPropagation();
    const text = ta.value.trim();
    if (!text) {
      ta.style.borderColor = "#e74c3c";
      ta.focus();
      return;
    }
    data.text = text;
    data.timestamp = Date.now();
    wrapper.querySelector(".dn-dot").textContent = "💬";
    try {
      await chrome.runtime.sendMessage({
        action: "saveAnnotation",
        data: { ...data },
      });
    } catch (_) {}
    popup.remove();
  });
  popup.querySelector(".dn-px-del").addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      await chrome.runtime.sendMessage({
        action: "deleteAnnotation",
        url: PAGE_URL,
        annotationId: data.id,
      });
    } catch (_) {}
    activeAnnotations.delete(data.id);
    wrapper.remove();
  });
}

function toggle3DMode() {
  is3DMode = !is3DMode;
  if (is3DMode) {
    document.body.classList.add("depth-3d-view");
    document.addEventListener("mousemove", on3DMouseMove);
  } else {
    document.body.classList.remove("depth-3d-view");
    document.removeEventListener("mousemove", on3DMouseMove);
    activeAnnotations.forEach(({ element }) => {
      element.style.transform = "";
    });
  }
}

function on3DMouseMove(e) {
  const cx = window.innerWidth / 2,
    cy = window.innerHeight / 2;
  const dx = (e.clientX - cx) / cx,
    dy = (e.clientY - cy) / cy;
  activeAnnotations.forEach(({ element, data }) => {
    const f = (data.depth + 1) * 8;
    element.style.transform = `translate(${dx * f}px, ${dy * f}px)`;
  });
}

init();

const DEPTH_COLORS = ["#ff4757", "#ffa502", "#2ed573", "#5352ed", "#ff6b9d"];

document.addEventListener("DOMContentLoaded", async function () {
  await loadSettings();
  await refreshUI();

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.action === "updateStats") refreshUI();
  });

  document.getElementById("startBtn").addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: "start" }, function () {
        if (chrome.runtime.lastError) {
          showMsg(
            "Could not connect to page. Try refreshing it first.",
            "error",
          );
        } else {
          window.close();
        }
      });
    });
  });

  document
    .getElementById("export-annotations")
    .addEventListener("click", exportAll);

  document
    .getElementById("import-annotations")
    .addEventListener("click", () => {
      document.getElementById("dn-import-input").click();
    });
  document
    .getElementById("dn-import-input")
    .addEventListener("change", importFromFile);

  document.getElementById("auto-save").addEventListener("change", saveSettings);
  document
    .getElementById("show-depth-indicator")
    .addEventListener("change", saveSettings);
  document
    .getElementById("default-depth")
    .addEventListener("change", saveSettings);
});

async function refreshUI() {
  await Promise.all([loadStats(), loadRecent()]);
}

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get("settings");
    const s = result.settings || {};
    document.getElementById("auto-save").checked = s.autoSave !== false;
    document.getElementById("show-depth-indicator").checked =
      s.showDepthIndicator !== false;
    document.getElementById("default-depth").value = s.defaultDepth ?? 0;
  } catch (_) {}
}

async function saveSettings() {
  try {
    await chrome.storage.local.set({
      settings: {
        autoSave: document.getElementById("auto-save").checked,
        showDepthIndicator: document.getElementById("show-depth-indicator")
          .checked,
        defaultDepth: +document.getElementById("default-depth").value,
      },
    });
  } catch (_) {}
}

async function loadStats() {
  try {
    const all = await chrome.storage.local.get(null);
    let total = 0,
      pages = 0;
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith("annotations_") && v.annotations?.length) {
        total += v.annotations.length;
        pages++;
      }
    }
    document.getElementById("annotation-count").textContent = total;
    document.getElementById("page-visits").textContent = pages;
  } catch (_) {}
}

async function loadRecent() {
  try {
    const all = await chrome.storage.local.get(null);
    const items = [];
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith("annotations_") && v.annotations) {
        v.annotations.forEach((a) => items.push({ ...a, pageUrl: v.url }));
      }
    }
    items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const recent = items.slice(0, 5);
    const container = document.getElementById("recent-annotations");

    if (!recent.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📝</span>
          <p>No annotations yet. Click "Start Annotating" to begin!</p>
        </div>`;
      return;
    }

    container.innerHTML = recent
      .map((a) => {
        const color = DEPTH_COLORS[a.depth] || DEPTH_COLORS[0];
        const preview = esc(
          (a.text || "").slice(0, 45) +
            ((a.text || "").length > 45 ? "…" : "") || "(no text)",
        );
        const date = a.timestamp
          ? new Date(a.timestamp).toLocaleDateString()
          : "";
        let host = "";
        try {
          host = new URL(a.pageUrl || "").hostname;
        } catch (_) {}
        return `
        <div class="annotation-item">
          <div class="annotation-preview">
            <div class="annotation-text-preview">${preview}</div>
            <div class="annotation-meta">${esc(host)}${date ? " · " + date : ""}</div>
          </div>
          <div class="annotation-depth" style="background:${color}">${(a.depth || 0) + 1}</div>
        </div>`;
      })
      .join("");
  } catch (_) {}
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function exportAll() {
  try {
    const all = await chrome.storage.local.get(null);
    const out = {};
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith("annotations_")) out[k] = v;
    }
    if (!Object.keys(out).length) {
      showMsg("Nothing to export yet.", "error");
      return;
    }
    const json = JSON.stringify(out, null, 2);
    const dataUrl =
      "data:application/json;charset=utf-8," + encodeURIComponent(json);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `depth-annotations-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showMsg("Exported successfully!", "ok");
  } catch (_) {
    showMsg("Export failed.", "error");
  }
}

async function importFromFile(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    let added = 0;
    for (const [k, v] of Object.entries(parsed)) {
      if (!k.startsWith("annotations_") || !Array.isArray(v.annotations))
        continue;
      const existing = await chrome.storage.local.get(k);
      const cur = existing[k]?.annotations || [];
      const curIds = new Set(cur.map((a) => a.id));
      const newOnes = v.annotations.filter((a) => !curIds.has(a.id));
      if (newOnes.length) {
        await chrome.storage.local.set({
          [k]: { ...v, annotations: [...cur, ...newOnes] },
        });
        added += newOnes.length;
      }
    }
    showMsg(`Imported ${added} annotation${added !== 1 ? "s" : ""}!`, "ok");
    await refreshUI();
  } catch (_) {
    showMsg("Import failed. Check the file format.", "error");
  }
}

function showMsg(text, type) {
  document.getElementById("dn-msg")?.remove();
  const el = document.createElement("div");
  el.id = "dn-msg";
  el.textContent = text;
  el.style.cssText = `
    position:fixed;bottom:12px;left:50%;transform:translateX(-50%);
    background:${type === "error" ? "#e74c3c" : "#27ae60"};
    color:white;padding:7px 16px;border-radius:8px;
    font-size:12px;font-weight:500;z-index:9999;white-space:nowrap;
    box-shadow:0 3px 10px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

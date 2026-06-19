import { state } from './state.js';
import { initEditor } from './editor.js';
import { initTools, setActiveTool } from './tools.js';
import { initLayers, duplicateLayer, removeLayer } from './layers.js';
import { initFilters } from './filters.js';
import { initPresets } from './presets.js';
import { initTemplates } from './templates.js';
import { initExport, exportImage, closePreview, copyToClipboard } from './export.js';
import { initHistory, undo, redo } from './history.js';
import { initVideoSource } from './video-source.js';
import { initFrameCapture } from './frame-capture.js';

initEditor();
initTools();
initLayers();
initFilters();
initPresets();
initTemplates();
initExport();
initHistory();
initVideoSource();
initFrameCapture();

const mobileBar = document.getElementById('mobile-bottom-bar');
if (mobileBar) {
  mobileBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const panel = btn.dataset.panel;
    const leftPanel = document.getElementById('panel-left');
    const rightPanel = document.getElementById('panel-right');

    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      leftPanel.classList.remove('mobile-open');
      rightPanel.classList.remove('mobile-open');
      return;
    }

    mobileBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    leftPanel.classList.remove('mobile-open');
    rightPanel.classList.remove('mobile-open');

    if (panel === 'layers') {
      rightPanel.classList.add('mobile-open');
    } else {
      leftPanel.classList.add('mobile-open');
    }
  });
}

const TOOL_SHORTCUTS = { v: 'select', t: 'text', r: 'rect', c: 'circle', a: 'arrow', l: 'line' };

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'SELECT' || e.target.isContentEditable) {
    if (e.key === 'Escape') e.target.blur();
    if (e.key === 'Enter' && !e.shiftKey) e.target.blur();
    return;
  }

  const ctrl = e.ctrlKey || e.metaKey;

  if (!ctrl) {
    const key = e.key.toLowerCase();
    if (TOOL_SHORTCUTS[key]) {
      e.preventDefault();
      setActiveTool(TOOL_SHORTCUTS[key]);
    }
  }

  if (ctrl) {
    switch(e.key.toLowerCase()) {
      case 'z':
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        break;
      case 'd':
        e.preventDefault();
        if (state.selectedId) duplicateLayer(state.selectedId);
        break;
      case 'e':
        e.preventDefault();
        exportImage();
        break;
      case 'c':
        if (window.getSelection && window.getSelection().toString()) return;
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        copyToClipboard();
        break;
    }
  }

  if (e.key === 'Delete' && state.selectedId) {
    removeLayer(state.selectedId);
  }

  if (e.key === 'Escape') {
    const overlay = document.getElementById('preview-overlay');
    if (overlay && overlay.classList.contains('visible')) {
      closePreview();
    } else if (state.selectedId) {
      state.selectedId = null;
    }
  }
});

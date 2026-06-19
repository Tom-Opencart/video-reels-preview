import { state } from './state.js';
import { initEditor } from './editor.js';
import { initTools } from './tools.js';
import { initLayers } from './layers.js';
import { initFilters } from './filters.js';
import { initPresets } from './presets.js';
import { initTemplates } from './templates.js';
import { initExport } from './export.js';
import { initVideoSource } from './video-source.js';
import { initFrameCapture } from './frame-capture.js';

initEditor();
initTools();
initLayers();
initFilters();
initPresets();
initTemplates();
initExport();
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

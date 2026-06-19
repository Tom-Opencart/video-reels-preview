// js/presets.js — size presets

import { state, PRESETS } from './state.js';
import { toast } from './utils.js';

let presetSelect, customSizeDiv, customW, customH, btnApply;

export function initPresets() {
  presetSelect = document.getElementById('preset-select');
  customSizeDiv = document.getElementById('custom-size');
  customW = document.getElementById('custom-w');
  customH = document.getElementById('custom-h');
  btnApply = document.getElementById('btn-apply-size');

  presetSelect.addEventListener('change', () => applyPreset(presetSelect.value));
  btnApply.addEventListener('click', applyCustomSize);
  customW.addEventListener('keydown', e => { if (e.key === 'Enter') applyCustomSize(); });
  customH.addEventListener('keydown', e => { if (e.key === 'Enter') applyCustomSize(); });
}

function applyPreset(key) {
  if (key === 'custom') {
    customSizeDiv.style.display = '';
    return;
  }
  customSizeDiv.style.display = 'none';
  const p = PRESETS[key];
  if (!p) return;
  state.preset = { ...p };
  window.dispatchEvent(new Event('preset:changed'));
}

function applyCustomSize() {
  const w = parseInt(customW.value, 10);
  const h = parseInt(customH.value, 10);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 100 || h < 100 || w > 4096 || h > 4096) {
    toast('Size must be 100–4096', 'error');
    return;
  }
  state.preset = { name: 'Custom', width: w, height: h };
  window.dispatchEvent(new Event('preset:changed'));
}

// js/export.js — export canvas to image files & clipboard

import { state } from './state.js';
import { renderLayer } from './editor.js';

function showToast(msg, type) {
  const el = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'info');
  t.textContent = msg;
  el.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function preloadImages() {
  const promises = state.layers.map(layer => {
    if (layer.type !== 'image' || layer._img) return Promise.resolve();
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { layer._img = img; resolve(); };
      img.onerror = () => resolve();
      img.src = layer.src;
    });
  });
  return Promise.all(promises);
}

function renderToOffscreen() {
  const offscreen = document.createElement('canvas');
  offscreen.width = state.preset.width;
  offscreen.height = state.preset.height;
  const offCtx = offscreen.getContext('2d');

  offCtx.fillStyle = state.background;
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

  for (const layer of state.layers) {
    if (layer.visible === false) continue;
    renderLayer(offCtx, layer);
  }

  return offscreen;
}

function getMime(fmt) {
  const map = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
  return map[fmt] || 'image/png';
}

function getExt(fmt) {
  return fmt === 'jpeg' ? 'jpg' : fmt;
}

function getQuality(fmt) {
  if (fmt === 'jpeg') return 0.9;
  if (fmt === 'webp') return 0.92;
  return undefined;
}

async function exportImage() {
  await preloadImages();
  const fmt = document.getElementById('fmt').value;
  const offscreen = renderToOffscreen();

  offscreen.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preview_${Date.now()}.${getExt(fmt)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Image exported!', 'success');
  }, getMime(fmt), getQuality(fmt));
}

async function copyToClipboard() {
  await preloadImages();
  const offscreen = renderToOffscreen();

  try {
    const blob = await new Promise(resolve => offscreen.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast('Copied to clipboard!', 'success');
  } catch (err) {
    showToast('Clipboard copy failed: ' + err.message, 'error');
  }
}

function openPreview() {
  preloadImages().then(() => {
    const fmt = document.getElementById('fmt').value;
    const offscreen = renderToOffscreen();
    const ext = getExt(fmt);
    const mimeType = getMime(fmt);
    const quality = getQuality(fmt);

    offscreen.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const img = document.getElementById('preview-img');
      img.src = url;
      img._blobUrl = url;

      const info = document.getElementById('preview-info');
      info.textContent = `${state.preset.width}x${state.preset.height} ${ext.toUpperCase()}`;

      document.getElementById('preview-overlay').classList.add('visible');
      document.body.style.overflow = 'hidden';
    }, mimeType, quality);
  });
}

function closePreview() {
  const overlay = document.getElementById('preview-overlay');
  overlay.classList.remove('visible');
  document.body.style.overflow = '';

  const img = document.getElementById('preview-img');
  if (img._blobUrl) {
    URL.revokeObjectURL(img._blobUrl);
    img._blobUrl = null;
  }
}

export function initExport() {
  const btnExport = document.getElementById('btn-export');
  const previewClose = document.getElementById('preview-close');

  if (btnExport) {
    btnExport.addEventListener('click', exportImage);
  }

  if (previewClose) {
    previewClose.addEventListener('click', closePreview);
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('preview-overlay');
      if (overlay && overlay.classList.contains('visible')) {
        closePreview();
      }
    }
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      if (window.getSelection && window.getSelection().toString()) return;
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      copyToClipboard();
    }
  });
}

// js/export.js — export canvas to image files & clipboard

import { state } from './state.js';
import { renderLayer } from './editor.js';
import { toast } from './utils.js';

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

export async function exportImage() {
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
    toast('Изображение скачано!', 'success');
  }, getMime(fmt), getQuality(fmt));
}

export async function copyToClipboard() {
  await preloadImages();
  const offscreen = renderToOffscreen();

  try {
    const blob = await new Promise(resolve => offscreen.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    toast('Скопировано в буфер обмена!', 'success');
  } catch (err) {
    toast('Ошибка копирования: ' + err.message, 'error');
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

export function closePreview() {
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
}

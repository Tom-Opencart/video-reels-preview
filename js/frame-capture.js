import { state } from './state.js';
import { addLayer } from './layers.js';
import { getCurrentSource, getPlayer } from './video-source.js';
import { toast } from './utils.js';

export function initFrameCapture() {
  document.getElementById('btn-capture').addEventListener('click', captureFrame);
}

async function captureFrame() {
  const source = getCurrentSource();
  const wrapper = document.getElementById('video-wrapper');

  if (!source) {
    toast('No video loaded', 'warning');
    return;
  }

  let dataURL;

  if (source === 'youtube') {
    dataURL = await captureYouTubeThumb();
  } else {
    dataURL = captureVideoFrame();
  }

  if (!dataURL) {
    toast('Capture failed', 'warning');
    return;
  }

  addLayer('image', {
    src: dataURL,
    width: state.preset.width,
    height: state.preset.height,
    x: 0,
    y: 0,
  });

  wrapper.style.display = 'none';
  toast('Frame captured');
}

function captureVideoFrame() {
  const p = getPlayer();
  const canvas = document.createElement('canvas');
  canvas.width = p.videoWidth;
  canvas.height = p.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(p, 0, 0);
  return canvas.toDataURL();
}

async function captureYouTubeThumb() {
  const urlInput = document.getElementById('source-url');
  const url = urlInput.value;
  let id = '';
  const m1 = url.match(/[?&]v=([^&]+)/);
  const m2 = url.match(/youtu\.be\/([^?&]+)/);
  id = m1 ? m1[1] : m2 ? m2[1] : '';
  if (!id) return null;

  const qualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];

  for (const q of qualities) {
    const src = `https://img.youtube.com/vi/${id}/${q}.jpg`;
    try {
      const ok = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img.naturalWidth > 100);
        img.onerror = () => reject();
        img.src = src;
      });
      if (ok) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = src;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL();
      }
    } catch {}
  }
  return null;
}

function videoWrapper() {
  return document.getElementById('video-wrapper');
}

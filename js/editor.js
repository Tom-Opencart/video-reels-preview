// js/editor.js — canvas rendering engine

import { state, getLayerById } from './state.js';
import { getFilterString } from './filters.js';

let canvas, ctx;
let containerEl;
let displayWidth = 0, displayHeight = 0;
let offsetX = 0, offsetY = 0;
let dpr = window.devicePixelRatio || 1;

let _lastZoom = -1;
let _lastContainerW = -1, _lastContainerH = -1;
let _needsResize = true;

let zoomBadgeEl;
let _zoomBadgeTimer;

let isPanning = false;
let panStartX = 0, panStartY = 0;
let panStartPanX = 0, panStartPanY = 0;

let _touchState = null;

export function initEditor() {
  canvas = document.getElementById('editor-canvas');
  ctx = canvas.getContext('2d');
  containerEl = document.getElementById('canvas-container');
  zoomBadgeEl = document.getElementById('zoom-badge');

  resizeCanvas();

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => resizeCanvas()).observe(containerEl);
  } else {
    window.addEventListener('resize', resizeCanvas);
  }

  containerEl.addEventListener('wheel', onWheel, { passive: false });
  containerEl.addEventListener('dblclick', onDblClick);
  canvas.addEventListener('mousedown', onCanvasMouseDown);
  window.addEventListener('mousemove', onCanvasMouseMove);
  window.addEventListener('mouseup', onCanvasMouseUp);

  containerEl.addEventListener('touchstart', onTouchStart, { passive: false });
  containerEl.addEventListener('touchmove', onTouchMove, { passive: false });
  containerEl.addEventListener('touchend', onTouchEnd);

  window.addEventListener('preset:changed', () => { _needsResize = true; render(); });

  render();
}

function resizeCanvas() {
  const containerW = containerEl.clientWidth;
  const containerH = containerEl.clientHeight;

  if (!_needsResize && containerW === _lastContainerW && containerH === _lastContainerH && state.zoom === _lastZoom) {
    return;
  }
  _needsResize = false;
  _lastContainerW = containerW;
  _lastContainerH = containerH;
  _lastZoom = state.zoom;

  const presetW = state.preset.width;
  const presetH = state.preset.height;

  const baseFit = Math.min(containerW / presetW, containerH / presetH);
  displayWidth = Math.round(presetW * baseFit * state.zoom);
  displayHeight = Math.round(presetH * baseFit * state.zoom);

  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';

  const containerRect = containerEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  offsetX = canvasRect.left - containerRect.left;
  offsetY = canvasRect.top - containerRect.top;
}

export function getEditorExports() {
  return { canvas, ctx, displayWidth, displayHeight, offsetX, offsetY };
}

// ─── Render ───

function render() {
  if (!ctx) { requestAnimationFrame(render); return; }

  resizeCanvas();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  ctx.fillStyle = state.background;
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  ctx.save();

  const presetW = state.preset.width;
  const presetH = state.preset.height;
  const totalScale = displayWidth / presetW;

  ctx.translate(displayWidth / 2 + state.panX, displayHeight / 2 + state.panY);
  ctx.scale(totalScale, totalScale);
  ctx.translate(-presetW / 2, -presetH / 2);

  for (const layer of state.layers) {
    if (layer.visible === false) continue;
    renderLayer(ctx, layer);
  }

  if (state.selectedId) {
    const sel = getLayerById(state.selectedId);
    if (sel) drawSelection(ctx, sel);
  }

  ctx.restore();

  if (state.layers.length === 0) {
    drawEmptyState(ctx, displayWidth, displayHeight);
  }

  requestAnimationFrame(render);
}

// ─── Render Layer ───

function drawEmptyState(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Иконка камеры
  const iconSize = Math.min(w, h) * 0.12;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = iconSize * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Прямоугольник камеры
  const camW = iconSize * 1.4;
  const camH = iconSize;
  const camR = iconSize * 0.12;
  const camX = cx - camW / 2;
  const camY = cy - iconSize * 1.2;

  ctx.beginPath();
  ctx.moveTo(camX + camR, camY);
  ctx.lineTo(camX + camW - camR, camY);
  ctx.quadraticCurveTo(camX + camW, camY, camX + camW, camY + camR);
  ctx.lineTo(camX + camW, camY + camH - camR);
  ctx.quadraticCurveTo(camX + camW, camY + camH, camX + camW - camR, camY + camH);
  ctx.lineTo(camX + camR, camY + camH);
  ctx.quadraticCurveTo(camX, camY + camH, camX, camY + camH - camR);
  ctx.lineTo(camX, camY + camR);
  ctx.quadraticCurveTo(camX, camY, camX + camR, camY);
  ctx.closePath();
  ctx.stroke();

  // Кружок объектива
  ctx.beginPath();
  ctx.arc(cx, camY + camH / 2, iconSize * 0.28, 0, Math.PI * 2);
  ctx.stroke();

  // Текст
  const fontSize = Math.max(20, Math.min(40, w * 0.035));
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('Загрузите видео', cx, cy + iconSize * 0.6);

  const subSize = Math.max(14, Math.min(24, w * 0.025));
  ctx.font = `400 ${subSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText('и нажмите «Снять кадр»', cx, cy + iconSize * 0.6 + fontSize * 1.4);

  ctx.restore();
}

export function renderLayer(ctx, layer) {
  ctx.save();

  if (layer.rotation) {
    const cx = layer.x + (layer.width || 0) / 2;
    const cy = layer.y + (layer.height || 0) / 2;
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  if (layer.opacity != null && layer.opacity < 1) {
    ctx.globalAlpha = layer.opacity;
  }

  switch (layer.type) {
    case 'image': renderImage(ctx, layer); break;
    case 'text': renderText(ctx, layer); break;
    case 'rect': renderRect(ctx, layer); break;
    case 'circle': renderCircle(ctx, layer); break;
    case 'arrow': renderArrow(ctx, layer); break;
    case 'line': renderLine(ctx, layer); break;
  }

  ctx.restore();
}

function renderImage(ctx, layer) {
  if (!layer._img) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = layer.src;
    img.onload = () => { layer._img = img; };
    layer._img = null;
    return;
  }

  const filter = getFilterString();
  if (filter) ctx.filter = filter;

  const w = layer.width || layer._img.width;
  const h = layer.height || layer._img.height;
  ctx.drawImage(layer._img, layer.x, layer.y, w, h);

  ctx.filter = 'none';
}

function renderText(ctx, layer) {
  const fontSize = layer.fontSize || 48;
  const fontFamily = layer.fontFamily || 'Inter, system-ui, sans-serif';
  const fontWeight = layer.fontWeight || 'bold';
  const text = layer.text || '';
  const color = layer.color || '#ffffff';
  const bg = layer.background || null;
  const shadow = layer.shadow || null;
  const textAlign = layer.textAlign || 'left';

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'top';

  const lines = wrapText(ctx, text, layer.width || 400);
  const lineHeight = fontSize * 1.2;
  const totalH = lines.length * lineHeight;

  if (shadow) {
    ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = shadow.blur || 4;
    ctx.shadowOffsetX = shadow.offsetX || 2;
    ctx.shadowOffsetY = shadow.offsetY || 2;
  }

  if (bg) {
    const padding = layer.padding || 8;
    const bgRadius = layer.borderRadius || 0;
    let bgX = layer.x;
    if (textAlign === 'center') bgX = layer.x - (layer.width || 400) / 2;
    else if (textAlign === 'right') bgX = layer.x - (layer.width || 400);

    ctx.fillStyle = bg;
    roundRect(ctx, bgX - padding, layer.y - padding, (layer.width || 400) + padding * 2, totalH + padding * 2, bgRadius);
    ctx.fill();
  }

  let textX = layer.x;
  if (textAlign === 'center') textX = layer.x + (layer.width || 400) / 2;
  else if (textAlign === 'right') textX = layer.x + (layer.width || 400);

  ctx.fillStyle = color;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textX, layer.y + i * lineHeight);
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function renderRect(ctx, layer) {
  const w = layer.width || 100;
  const h = layer.height || 100;
  const radius = layer.borderRadius || 0;

  if (layer.fill) {
    ctx.fillStyle = layer.fill;
    roundRect(ctx, layer.x, layer.y, w, h, radius);
    ctx.fill();
  }
  if (layer.stroke) {
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = layer.strokeWidth || 2;
    roundRect(ctx, layer.x, layer.y, w, h, radius);
    ctx.stroke();
  }
}

function renderCircle(ctx, layer) {
  const r = (layer.radius || Math.min(layer.width || 100, layer.height || 100) / 2);
  const cx = layer.x + r;
  const cy = layer.y + r;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);

  if (layer.fill) {
    ctx.fillStyle = layer.fill;
    ctx.fill();
  }
  if (layer.stroke) {
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = layer.strokeWidth || 2;
    ctx.stroke();
  }
}

function renderArrow(ctx, layer) {
  const x1 = layer.x || 0;
  const y1 = layer.y || 0;
  const x2 = layer.x2 != null ? layer.x2 : x1 + 200;
  const y2 = layer.y2 != null ? layer.y2 : y1;

  ctx.strokeStyle = layer.stroke || layer.color || '#ffffff';
  ctx.lineWidth = layer.strokeWidth || 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 14;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = layer.stroke || layer.color || '#ffffff';
  ctx.fill();
}

function renderLine(ctx, layer) {
  const x1 = layer.x || 0;
  const y1 = layer.y || 0;
  const x2 = layer.x2 != null ? layer.x2 : x1 + 200;
  const y2 = layer.y2 != null ? layer.y2 : y1;

  ctx.strokeStyle = layer.stroke || layer.color || '#ffffff';
  ctx.lineWidth = layer.strokeWidth || 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── Selection ───

function drawSelection(ctx, layer) {
  ctx.save();
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);

  let x, y, w, h;

  if (layer.type === 'line' || layer.type === 'arrow') {
    const x1 = layer.x || 0;
    const y1 = layer.y || 0;
    const x2 = layer.x2 != null ? layer.x2 : x1 + 200;
    const y2 = layer.y2 != null ? layer.y2 : y1;
    x = Math.min(x1, x2);
    y = Math.min(y1, y2);
    w = Math.abs(x2 - x1);
    h = Math.abs(y2 - y1);
  } else if (layer.type === 'circle') {
    const r = layer.radius || Math.min(layer.width || 100, layer.height || 100) / 2;
    x = layer.x;
    y = layer.y;
    w = r * 2;
    h = r * 2;
  } else if (layer.type === 'text') {
    const fontSize = layer.fontSize || 48;
    x = layer.x;
    y = layer.y;
    w = layer.width || 400;
    h = fontSize * 1.4;
  } else {
    x = layer.x;
    y = layer.y;
    w = layer.width || 100;
    h = layer.height || 100;
  }

  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  const handleSize = 8;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;

  const handles = [
    [x, y], [x + w / 2, y], [x + w, y],
    [x, y + h / 2], [x + w, y + h / 2],
    [x, y + h], [x + w / 2, y + h], [x + w, y + h],
  ];

  for (const [hx, hy] of handles) {
    ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  }

  ctx.restore();
}

// ─── Coordinate Conversion ───

export function screenToCanvas(screenX, screenY) {
  const containerRect = containerEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  const relX = screenX - canvasRect.left;
  const relY = screenY - canvasRect.top;

  const presetW = state.preset.width;
  const presetH = state.preset.height;
  const totalScale = displayWidth / presetW;

  const canvasX = (relX - displayWidth / 2 - state.panX) / totalScale + presetW / 2;
  const canvasY = (relY - displayHeight / 2 - state.panY) / totalScale + presetH / 2;

  return { x: canvasX, y: canvasY };
}

// ─── Zoom & Pan ───

function onWheel(e) {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    const delta = -e.deltaY * 0.002;
    const newZoom = Math.max(0.25, Math.min(5, state.zoom + delta * state.zoom));
    state.zoom = newZoom;
    _needsResize = true;
    showZoomBadge();
  } else {
    state.panX -= e.deltaX;
    state.panY -= e.deltaY;
  }
}

function onDblClick() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  _needsResize = true;
  showZoomBadge();
}

function onCanvasMouseDown(e) {
  if (state.zoom > 1) {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartPanX = state.panX;
    panStartPanY = state.panY;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
}

function onCanvasMouseMove(e) {
  if (!isPanning) return;
  state.panX = panStartPanX + (e.clientX - panStartX);
  state.panY = panStartPanY + (e.clientY - panStartY);
}

function onCanvasMouseUp() {
  if (isPanning) {
    isPanning = false;
    canvas.style.cursor = '';
  }
}

function showZoomBadge() {
  if (!zoomBadgeEl) return;
  zoomBadgeEl.textContent = Math.round(state.zoom * 100) + '%';
  zoomBadgeEl.classList.add('visible');
  clearTimeout(_zoomBadgeTimer);
  _zoomBadgeTimer = setTimeout(() => zoomBadgeEl.classList.remove('visible'), 1500);
}

// ─── Touch Gestures ───

function onTouchStart(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    const t1 = e.touches[0], t2 = e.touches[1];
    _touchState = {
      mode: 'pinch',
      prevDist: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
      prevZoom: state.zoom,
    };
  } else if (e.touches.length === 1 && state.zoom > 1) {
    e.preventDefault();
    const t = e.touches[0];
    _touchState = {
      mode: 'pan',
      startX: t.clientX,
      startY: t.clientY,
      startPanX: state.panX,
      startPanY: state.panY,
    };
  }
}

function onTouchMove(e) {
  if (!_touchState) return;

  if (_touchState.mode === 'pinch' && e.touches.length === 2) {
    e.preventDefault();
    const t1 = e.touches[0], t2 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const scale = dist / _touchState.prevDist;
    state.zoom = Math.max(0.25, Math.min(5, _touchState.prevZoom * scale));
    _needsResize = true;
    showZoomBadge();
  } else if (_touchState.mode === 'pan' && e.touches.length === 1) {
    e.preventDefault();
    const t = e.touches[0];
    state.panX = _touchState.startPanX + (t.clientX - _touchState.startX);
    state.panY = _touchState.startPanY + (t.clientY - _touchState.startY);
  }
}

function onTouchEnd(e) {
  if (e.touches.length === 0) {
    _touchState = null;
  } else if (e.touches.length === 1 && _touchState && _touchState.mode === 'pinch') {
    const t = e.touches[0];
    _touchState = {
      mode: 'pan',
      startX: t.clientX,
      startY: t.clientY,
      startPanX: state.panX,
      startPanY: state.panY,
    };
  }
}

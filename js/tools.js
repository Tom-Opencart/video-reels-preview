// js/tools.js — selection and shape tools

import { state, genId, getLayerById, getSelectedLayer } from './state.js';
import { screenToCanvas, getEditorExports } from './editor.js';

let canvas;

let isDragging = false;
let dragStartCanvasX = 0, dragStartCanvasY = 0;
let dragLayerStartX = 0, dragLayerStartY = 0;

let isResizing = false;
let resizeHandle = null;
let resizeStartCanvasX = 0, resizeStartCanvasY = 0;
let resizeStartLayer = null;

let isDrawing = false;
let drawStartCanvasX = 0, drawStartCanvasY = 0;
let tempLayer = null;

let isEditingText = false;

const TOOL_SHORTCUTS = { v: 'select', t: 'text', r: 'rect', c: 'circle', a: 'arrow', l: 'line' };

export function initTools() {
  canvas = getEditorExports().canvas;

  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
  });

  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('mousedown', onCanvasMouseDown);
  window.addEventListener('mousemove', onCanvasMouseMove);
  window.addEventListener('mouseup', onCanvasMouseUp);
  canvas.addEventListener('dblclick', onCanvasDblClick);
}

function setActiveTool(tool) {
  state.activeTool = tool;
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  if (canvas) canvas.style.cursor = tool === 'select' ? '' : 'crosshair';
}

function onKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  const key = e.key.toLowerCase();
  if (TOOL_SHORTCUTS[key]) {
    e.preventDefault();
    setActiveTool(TOOL_SHORTCUTS[key]);
  }
}

function getScale() {
  const exp = getEditorExports();
  return exp.displayWidth / state.preset.width;
}

// ─── Hit Testing ───

function hitTest(canvasX, canvasY) {
  for (let i = state.layers.length - 1; i >= 0; i--) {
    const layer = state.layers[i];
    if (layer.visible === false || layer.locked) continue;
    const b = getLayerBounds(layer);
    if (b && canvasX >= b.x && canvasX <= b.x + b.w && canvasY >= b.y && canvasY <= b.y + b.h) {
      return layer.id;
    }
  }
  return null;
}

function getLayerBounds(layer) {
  switch (layer.type) {
    case 'image':
    case 'text':
    case 'rect':
      return { x: layer.x, y: layer.y, w: layer.width || 100, h: layer.height || 100 };
    case 'circle': {
      const r = layer.radius || Math.min(layer.width || 100, layer.height || 100) / 2;
      return { x: layer.x, y: layer.y, w: r * 2, h: r * 2 };
    }
    case 'arrow':
    case 'line': {
      const x1 = layer.x, y1 = layer.y;
      const x2 = layer.x2 != null ? layer.x2 : x1 + 200;
      const y2 = layer.y2 != null ? layer.y2 : y1;
      const pad = 10;
      return {
        x: Math.min(x1, x2) - pad, y: Math.min(y1, y2) - pad,
        w: Math.abs(x2 - x1) + pad * 2, h: Math.abs(y2 - y1) + pad * 2,
      };
    }
  }
  return null;
}

function getSelectionBounds(layer) {
  const b = getLayerBounds(layer);
  if (!b) return null;
  if (layer.type === 'text') b.h = (layer.fontSize || 48) * 1.4;
  return b;
}

// ─── Handle Hit Test ───

function hitTestHandle(canvasX, canvasY) {
  const layer = getSelectedLayer();
  if (!layer) return null;
  const b = getSelectionBounds(layer);
  if (!b) return null;

  const tolerance = 6 / getScale();
  const corners = {
    tl: [b.x, b.y], tr: [b.x + b.w, b.y],
    bl: [b.x, b.y + b.h], br: [b.x + b.w, b.y + b.h],
  };
  for (const [name, [hx, hy]] of Object.entries(corners)) {
    if (Math.abs(canvasX - hx) <= tolerance && Math.abs(canvasY - hy) <= tolerance) return name;
  }
  return null;
}

// ─── Canvas Mouse Events ───

function onCanvasMouseDown(e) {
  if (e.button !== 0) return;
  const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);

  if (state.activeTool === 'select') {
    const handle = hitTestHandle(cx, cy);
    if (handle) { startResize(handle, cx, cy); return; }
    const hitId = hitTest(cx, cy);
    if (hitId) {
      state.selectedId = hitId;
      const layer = getLayerById(hitId);
      isDragging = true;
      dragStartCanvasX = cx; dragStartCanvasY = cy;
      dragLayerStartX = layer.x; dragLayerStartY = layer.y;
    } else {
      state.selectedId = null;
    }
  } else if (state.activeTool === 'text') {
    createTextLayer(cx, cy);
  } else if (['rect', 'circle', 'arrow', 'line'].includes(state.activeTool)) {
    startShapeDraw(cx, cy);
  }
}

function onCanvasMouseMove(e) {
  const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);

  if (isDragging) {
    const layer = getSelectedLayer();
    if (!layer) return;
    layer.x = dragLayerStartX + (cx - dragStartCanvasX);
    layer.y = dragLayerStartY + (cy - dragStartCanvasY);
  } else if (isResizing) {
    handleResizeMove(cx, cy);
  } else if (isDrawing && tempLayer) {
    updateShapeDraw(cx, cy);
  }
}

function onCanvasMouseUp() {
  if (isDragging) { isDragging = false; saveSnapshot(); }
  else if (isResizing) { isResizing = false; resizeHandle = null; resizeStartLayer = null; saveSnapshot(); }
  else if (isDrawing) { finalizeShape(); }
}

function onCanvasDblClick(e) {
  const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
  const hitId = hitTest(cx, cy);
  if (hitId) {
    const layer = getLayerById(hitId);
    if (layer && layer.type === 'text') enterTextEdit(layer);
  }
}

// ─── Resize ───

function startResize(handle, cx, cy) {
  const layer = getSelectedLayer();
  if (!layer) return;
  isResizing = true;
  resizeHandle = handle;
  resizeStartCanvasX = cx;
  resizeStartCanvasY = cy;
  const b = getSelectionBounds(layer);
  resizeStartLayer = { x: layer.x, y: layer.y, w: b.w, h: b.h };
}

function handleResizeMove(cx, cy) {
  const layer = getSelectedLayer();
  if (!layer || !resizeStartLayer) return;

  const dx = cx - resizeStartCanvasX;
  const dy = cy - resizeStartCanvasY;
  const s = resizeStartLayer;
  const aspect = s.w / s.h;

  let newW, newH, newX = s.x, newY = s.y;

  if (resizeHandle === 'br') {
    newW = Math.max(10, s.w + dx); newH = newW / aspect;
  } else if (resizeHandle === 'bl') {
    newW = Math.max(10, s.w - dx); newH = newW / aspect;
    newX = s.x + s.w - newW;
  } else if (resizeHandle === 'tr') {
    newW = Math.max(10, s.w + dx); newH = newW / aspect;
    newY = s.y + s.h - newH;
  } else {
    newW = Math.max(10, s.w - dx); newH = newW / aspect;
    newX = s.x + s.w - newW; newY = s.y + s.h - newH;
  }

  layer.x = newX; layer.y = newY; layer.width = newW; layer.height = newH;
}

// ─── Text Tool ───

function createTextLayer(cx, cy) {
  const layer = {
    id: genId(), type: 'text', text: 'Текст',
    x: cx, y: cy, width: 400,
    fontSize: 48, fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 'bold', color: '#ffffff',
    background: 'rgba(0,0,0,0.4)', textAlign: 'left',
    visible: true, locked: false,
  };
  state.layers.push(layer);
  state.selectedId = layer.id;
  setActiveTool('select');
  saveSnapshot();
}

function enterTextEdit(layer) {
  if (isEditingText) return;
  isEditingText = true;

  const exp = getEditorExports();
  const containerEl = document.getElementById('canvas-container');
  const totalScale = exp.displayWidth / state.preset.width;

  const relX = (layer.x - state.preset.width / 2) * totalScale + exp.displayWidth / 2 + state.panX;
  const relY = (layer.y - state.preset.height / 2) * totalScale + exp.displayHeight / 2 + state.panY;

  const overlay = document.createElement('div');
  overlay.contentEditable = 'true';
  overlay.style.cssText = `
    position:absolute; left:${exp.canvas.offsetLeft + relX}px; top:${exp.canvas.offsetTop + relY}px;
    min-width:${(layer.width || 400) * totalScale}px; min-height:${(layer.fontSize || 48) * 1.4 * totalScale}px;
    font-size:${(layer.fontSize || 48) * totalScale}px;
    font-family:${layer.fontFamily || 'Inter, system-ui, sans-serif'};
    font-weight:${layer.fontWeight || 'bold'}; color:${layer.color || '#ffffff'};
    background:${layer.background || 'rgba(0,0,0,0.4)'};
    padding:8px; border:2px solid #2563eb; outline:none; white-space:pre-wrap; z-index:1000; cursor:text;
  `;
  overlay.textContent = layer.text || '';
  containerEl.appendChild(overlay);
  overlay.focus();

  const range = document.createRange();
  range.selectNodeContents(overlay);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  function finish() {
    if (!isEditingText) return;
    isEditingText = false;
    layer.text = overlay.textContent || '';
    overlay.remove();
    saveSnapshot();
  }

  overlay.addEventListener('blur', finish);
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(); }
  });
}

// ─── Shape Tools ───

function startShapeDraw(cx, cy) {
  isDrawing = true;
  drawStartCanvasX = cx; drawStartCanvasY = cy;

  const base = {
    id: genId(), type: state.activeTool, x: cx, y: cy,
    width: 0, height: 0, visible: true, locked: false,
  };

  if (state.activeTool === 'rect') {
    Object.assign(base, { fill: '#2563eb', stroke: '#1d4ed8', strokeWidth: 2, borderRadius: 0 });
  } else if (state.activeTool === 'circle') {
    Object.assign(base, { fill: '#2563eb', stroke: '#1d4ed8', strokeWidth: 2 });
  } else {
    Object.assign(base, { x2: cx, y2: cy, stroke: '#ffffff', color: '#ffffff', strokeWidth: 3 });
  }

  tempLayer = base;
  state.layers.push(tempLayer);
  state.selectedId = tempLayer.id;
}

function updateShapeDraw(cx, cy) {
  if (!tempLayer) return;

  if (tempLayer.type === 'arrow' || tempLayer.type === 'line') {
    tempLayer.x2 = cx; tempLayer.y2 = cy;
  } else {
    tempLayer.x = Math.min(drawStartCanvasX, cx);
    tempLayer.y = Math.min(drawStartCanvasY, cy);
    tempLayer.width = Math.abs(cx - drawStartCanvasX);
    tempLayer.height = Math.abs(cy - drawStartCanvasY);
    if (tempLayer.type === 'circle') {
      tempLayer.radius = Math.min(tempLayer.width, tempLayer.height) / 2;
    }
  }
}

function finalizeShape() {
  isDrawing = false;
  if (tempLayer) {
    const b = getLayerBounds(tempLayer);
    if (b && b.w < 3 && b.h < 3) {
      state.layers = state.layers.filter(l => l.id !== tempLayer.id);
      state.selectedId = null;
    }
  }
  tempLayer = null;
  saveSnapshot();
}

function saveSnapshot() {
  window.dispatchEvent(new CustomEvent('editor:save-snapshot'));
}

// js/layers.js — layer panel manager

import { state, genId, getLayerById } from './state.js';

let listEl;
let dragIndex = null;

const TYPE_ICONS = {
  text: 'T', rect: '▭', circle: '○', arrow: '→', line: '╱', image: '🖼',
};

const TYPE_NAMES = {
  text: 'Текст', rect: 'Прямоугольник', circle: 'Круг', arrow: 'Стрелка', line: 'Линия', image: 'Изображение',
};

export function initLayers() {
  listEl = document.getElementById('layer-list');

  document.getElementById('btn-add-layer').addEventListener('click', () => addLayer('text'));
  document.getElementById('btn-dup-layer').addEventListener('click', () => duplicateLayer(state.selectedId));
  document.getElementById('btn-del-layer').addEventListener('click', () => removeLayer(state.selectedId));

  window.addEventListener('layers:changed', () => updateLayerList());

  updateLayerList();
}

export function addLayer(type, data) {
  const layer = {
    id: genId(),
    type,
    visible: true,
    locked: false,
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    ...getDefaultProps(type),
    ...data,
  };
  state.layers.push(layer);
  state.selectedId = layer.id;
  updateLayerList();
  dispatchLayersChanged();
  return layer;
}

function getDefaultProps(type) {
  switch (type) {
    case 'text':
      return { text: 'Текст', fontSize: 48, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 'bold', color: '#ffffff', background: 'rgba(0,0,0,0.4)', textAlign: 'left', width: 400, height: 60 };
    case 'rect':
      return { fill: '#2563eb', stroke: '#1d4ed8', strokeWidth: 2, borderRadius: 0 };
    case 'circle':
      return { fill: '#2563eb', stroke: '#1d4ed8', strokeWidth: 2, radius: 50 };
    case 'arrow':
      return { x2: 300, y2: 100, stroke: '#ffffff', color: '#ffffff', strokeWidth: 3 };
    case 'line':
      return { x2: 300, y2: 100, stroke: '#ffffff', color: '#ffffff', strokeWidth: 3 };
    case 'image':
      return { src: '', width: 200, height: 200 };
    default:
      return {};
  }
}

export function removeLayer(id) {
  if (!id) return;
  state.layers = state.layers.filter(l => l.id !== id);
  if (state.selectedId === id) state.selectedId = null;
  updateLayerList();
  dispatchLayersChanged();
}

export function duplicateLayer(id) {
  if (!id) return;
  const original = getLayerById(id);
  if (!original) return;
  const idx = state.layers.indexOf(original);
  const clone = JSON.parse(JSON.stringify(original));
  clone.id = genId();
  state.layers.splice(idx + 1, 0, clone);
  state.selectedId = clone.id;
  updateLayerList();
  dispatchLayersChanged();
  return clone;
}

export function moveLayer(fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= state.layers.length) return;
  if (toIndex < 0 || toIndex >= state.layers.length) return;
  const [layer] = state.layers.splice(fromIndex, 1);
  state.layers.splice(toIndex, 0, layer);
  updateLayerList();
  dispatchLayersChanged();
}

export function toggleVisibility(id) {
  const layer = getLayerById(id);
  if (!layer) return;
  layer.visible = !layer.visible;
  updateLayerList();
}

export function toggleLock(id) {
  const layer = getLayerById(id);
  if (!layer) return;
  layer.locked = !layer.locked;
  updateLayerList();
}

export function updateLayerList() {
  if (!listEl) return;
  listEl.innerHTML = '';

  for (let i = state.layers.length - 1; i >= 0; i--) {
    const layer = state.layers[i];
    const item = document.createElement('div');
    item.className = 'layer-item' + (layer.id === state.selectedId ? ' active' : '');
    item.dataset.id = layer.id;
    item.draggable = true;

    const icon = document.createElement('span');
    icon.className = 'layer-item-icon';
    icon.textContent = TYPE_ICONS[layer.type] || '?';

    const name = document.createElement('span');
    name.className = 'layer-item-name';
    name.textContent = layer.id;

    const visBtn = document.createElement('button');
    visBtn.className = 'layer-vis';
    visBtn.textContent = layer.visible === false ? '👁‍🗨' : '👁';
    visBtn.title = 'Видимость';
    visBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleVisibility(layer.id); });

    const lockBtn = document.createElement('button');
    lockBtn.className = 'layer-lock';
    lockBtn.textContent = layer.locked ? '🔒' : '🔓';
    lockBtn.title = 'Блокировка';
    lockBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleLock(layer.id); });

    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(visBtn);
    item.appendChild(lockBtn);

    item.addEventListener('click', () => {
      state.selectedId = layer.id;
      updateLayerList();
    });

    item.addEventListener('dragstart', (e) => {
      dragIndex = i;
      e.dataTransfer.effectAllowed = 'move';
      item.style.opacity = '0.4';
    });

    item.addEventListener('dragend', () => {
      dragIndex = null;
      item.style.opacity = '';
      listEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (dragIndex !== null) {
        const targetIndex = state.layers.length - 1 - Array.from(listEl.children).indexOf(item);
        moveLayer(dragIndex, targetIndex);
        dragIndex = null;
      }
    });

    listEl.appendChild(item);
  }
}

function dispatchLayersChanged() {
  window.dispatchEvent(new CustomEvent('layers:changed'));
}

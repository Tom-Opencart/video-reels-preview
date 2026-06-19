// js/state.js — central state store

export const PRESETS = {
  shorts:  { name: 'YouTube Shorts', width: 1080, height: 1920 },
  square:  { name: 'Instagram',      width: 1080, height: 1080 },
  youtube: { name: 'YouTube',        width: 1280, height: 720 },
};

export const state = {
  preset: { ...PRESETS.shorts },
  layers: [],
  filters: {
    brightness: 100, contrast: 100, saturate: 100,
    blur: 0, sepia: 0, grayscale: 0, invert: 0,
  },
  background: '#000000',
  selectedId: null,
  activeTool: 'select',
  zoom: 1,
  panX: 0,
  panY: 0,
};

let _idCounter = 0;
export function genId() { return `layer-${++_idCounter}`; }

export function getLayerById(id) {
  return state.layers.find(l => l.id === id);
}

export function getSelectedLayer() {
  return state.selectedId ? getLayerById(state.selectedId) : null;
}

export function cloneState() {
  return JSON.parse(JSON.stringify({
    layers: state.layers,
    filters: state.filters,
    preset: state.preset,
    background: state.background,
  }));
}

export function restoreState(snap) {
  state.layers = snap.layers;
  state.filters = snap.filters;
  state.preset = snap.preset;
  state.background = snap.background;
  state.selectedId = null;
}

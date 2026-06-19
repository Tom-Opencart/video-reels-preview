import { state } from './state.js';
import { dispatch } from './events.js';

const DEFAULTS = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0
};

const SLIDER_CONFIG = {
  brightness: { min: 0, max: 200, unit: '%' },
  contrast: { min: 0, max: 200, unit: '%' },
  saturate: { min: 0, max: 200, unit: '%' },
  blur: { min: 0, max: 20, unit: 'px' },
  sepia: { min: 0, max: 100, unit: '%' },
  grayscale: { min: 0, max: 100, unit: '%' },
  invert: { min: 0, max: 100, unit: '%' }
};

export function initFilters() {
  const container = document.getElementById('filters-content');
  const resetBtn = document.getElementById('btn-reset-filters');
  
  if (!container) return;
  
  container.innerHTML = '';
  
  Object.entries(SLIDER_CONFIG).forEach(([key, config]) => {
    const row = document.createElement('div');
    row.className = 'filter-row';
    
    const label = document.createElement('label');
    label.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    
    const input = document.createElement('input');
    input.type = 'range';
    input.min = config.min;
    input.max = config.max;
    input.value = state.filters[key];
    input.dataset.filter = key;
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'filter-val';
    valueDisplay.textContent = `${state.filters[key]}${config.unit}`;
    input.valueDisplay = valueDisplay;
    input.config = config;
    
    input.addEventListener('input', (e) => {
      const filterKey = e.target.dataset.filter;
      const value = Number(e.target.value);
      state.filters[filterKey] = value;
      
      const display = e.target.valueDisplay;
      display.textContent = `${value}${e.target.config.unit}`;
      
      dispatch('filters:changed');
    });
    
    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(valueDisplay);
    container.appendChild(row);
  });
  
  if (resetBtn) {
    resetBtn.addEventListener('click', resetFilters);
  }
}

export function getFilterString() {
  const f = state.filters;
  return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) blur(${f.blur}px) sepia(${f.sepia}%) grayscale(${f.grayscale}%) invert(${f.invert}%)`;
}

export function resetFilters() {
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    state.filters[key] = value;
    
    const input = document.querySelector(`[data-filter="${key}"]`);
    if (input) {
      input.value = value;
      const config = SLIDER_CONFIG[key];
      input.valueDisplay.textContent = `${value}${config.unit}`;
    }
  });
  
  dispatch('filters:changed');
}

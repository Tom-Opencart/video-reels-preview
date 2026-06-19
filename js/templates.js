// js/templates.js — save / load editor templates

import { cloneState, restoreState } from './state.js';
import { toast } from './utils.js';

const STORAGE_KEY = 'vrp-templates';
const MAX_TEMPLATES = 20;

let templates = [];
let templateSelect;

export function initTemplates() {
  templateSelect = document.getElementById('template-select');
  const btnSave = document.getElementById('btn-save-template');
  const btnDel = document.getElementById('btn-del-template');

  templates = loadFromStorage();
  updateTemplateSelect();

  btnSave.addEventListener('click', () => {
    const name = prompt('Template name:');
    if (name && name.trim()) saveTemplate(name.trim());
  });

  btnDel.addEventListener('click', () => {
    if (templateSelect.value) deleteTemplate(templateSelect.value);
  });

  templateSelect.addEventListener('change', () => {
    if (templateSelect.value) loadTemplate(templateSelect.value);
  });
}

function saveTemplate(name) {
  if (templates.length >= MAX_TEMPLATES) {
    toast('Max 20 templates', 'error');
    return;
  }
  const tpl = {
    id: 'tpl-' + Date.now(),
    name,
    createdAt: new Date().toISOString(),
    state: cloneState(),
  };
  templates.push(tpl);
  persist();
  updateTemplateSelect();
  toast('Template saved', 'success');
}

function loadTemplate(id) {
  const tpl = templates.find(t => t.id === id);
  if (!tpl) return;
  restoreState(tpl.state);
  document.dispatchEvent(new CustomEvent('history:restored'));
  toast('Template loaded', 'success');
}

function deleteTemplate(id) {
  templates = templates.filter(t => t.id !== id);
  persist();
  updateTemplateSelect();
  toast('Template deleted', 'info');
}

function updateTemplateSelect() {
  while (templateSelect.options.length > 1) templateSelect.remove(1);
  templates.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    templateSelect.appendChild(opt);
  });
  templateSelect.value = '';
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

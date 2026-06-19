// js/history.js — undo / redo stack

import { cloneState, restoreState } from './state.js';

const MAX_STEPS = 50;
let undoStack = [];
let redoStack = [];
let restoring = false;

let btnUndo, btnRedo;

export function initHistory() {
  btnUndo = document.getElementById('btn-undo');
  btnRedo = document.getElementById('btn-redo');

  window.addEventListener('editor:save-snapshot', saveSnapshot);
  window.addEventListener('layers:changed', saveSnapshot);
  window.addEventListener('filters:changed', saveSnapshot);

  btnUndo.addEventListener('click', undo);
  btnRedo.addEventListener('click', redo);
}

function saveSnapshot() {
  if (restoring) return;
  undoStack.push(cloneState());
  redoStack = [];
  if (undoStack.length > MAX_STEPS) undoStack.shift();
  updateButtons();
}

export function undo() {
  if (!undoStack.length) return;
  restoring = true;
  redoStack.push(cloneState());
  restoreState(undoStack.pop());
  updateButtons();
  window.dispatchEvent(new CustomEvent('layers:changed'));
  restoring = false;
  document.dispatchEvent(new CustomEvent('history:restored'));
}

export function redo() {
  if (!redoStack.length) return;
  restoring = true;
  undoStack.push(cloneState());
  restoreState(redoStack.pop());
  updateButtons();
  window.dispatchEvent(new CustomEvent('layers:changed'));
  restoring = false;
  document.dispatchEvent(new CustomEvent('history:restored'));
}

function updateButtons() {
  btnUndo.disabled = undoStack.length === 0;
  btnRedo.disabled = redoStack.length === 0;
}

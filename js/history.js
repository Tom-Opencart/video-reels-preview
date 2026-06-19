import { state, cloneState, restoreState } from './state.js';
import { render } from './editor.js';

const MAX_STEPS = 50;
let undoStack = [];
let redoStack = [];
let _skipNext = false;

export function saveSnapshot() {
	if (_skipNext) { _skipNext = false; return; }
	undoStack.push(cloneState());
	if (undoStack.length > MAX_STEPS) undoStack.shift();
	redoStack = [];
	updateButtons();
}

export function undo() {
	if (!undoStack.length) return false;
	redoStack.push(cloneState());
	restoreState(undoStack.pop());
	updateButtons();
	render();
	return true;
}

export function redo() {
	if (!redoStack.length) return false;
	undoStack.push(cloneState());
	restoreState(redoStack.pop());
	updateButtons();
	render();
	return true;
}

export function skipNext() { _skipNext = true; }

function updateButtons() {
	const btnUndo = document.getElementById('btn-undo');
	const btnRedo = document.getElementById('btn-redo');
	if (btnUndo) btnUndo.disabled = !undoStack.length;
	if (btnRedo) btnRedo.disabled = !redoStack.length;
}

export function initHistory() {
	document.getElementById('btn-undo').addEventListener('click', undo);
	document.getElementById('btn-redo').addEventListener('click', redo);
}

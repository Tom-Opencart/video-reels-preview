import { state, PRESETS } from './state.js';
import { render, resizeCanvas } from './editor.js';

export function initPresets() {
	const select = document.getElementById('preset-select');
	const customDiv = document.getElementById('custom-size');

	select.addEventListener('change', () => {
		const val = select.value;
		if (val === 'custom') {
			customDiv.style.display = 'flex';
		} else {
			customDiv.style.display = 'none';
			applyPreset(val);
		}
	});

	document.getElementById('btn-apply-size').addEventListener('click', () => {
		const w = parseInt(document.getElementById('custom-w').value);
		const h = parseInt(document.getElementById('custom-h').value);
		if (w >= 100 && w <= 4096 && h >= 100 && h <= 4096) {
			state.preset = { name: 'Кастомный', width: w, height: h };
			resizeCanvas();
			render();
		}
	});
}

export function applyPreset(key) {
	if (PRESETS[key]) {
		state.preset = { ...PRESETS[key] };
		resizeCanvas();
		render();
	}
}

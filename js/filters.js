import { state } from './state.js';
import { render } from './editor.js';

export function getFilterString() {
	const f = state.filters;
	const parts = [];
	if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
	if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
	if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
	if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
	if (f.sepia > 0) parts.push(`sepia(${f.sepia}%)`);
	if (f.grayscale > 0) parts.push(`grayscale(${f.grayscale}%)`);
	if (f.invert > 0) parts.push(`invert(${f.invert}%)`);
	return parts.join(' ');
}

export function initFilters() {
	const map = {
		brightness: { suffix: '%' },
		contrast: { suffix: '%' },
		saturate: { suffix: '%' },
		blur: { suffix: 'px' },
		sepia: { suffix: '%' },
		grayscale: { suffix: '%' },
		invert: { suffix: '%' },
	};

	Object.keys(map).forEach(key => {
		const input = document.getElementById(`filter-${key}`);
		const valEl = document.getElementById(`val-${key}`);
		if (!input || !valEl) return;

		input.addEventListener('input', () => {
			state.filters[key] = parseInt(input.value);
			valEl.textContent = input.value + map[key].suffix;
			render();
		});
	});

	document.getElementById('btn-reset-filters').addEventListener('click', () => {
		state.filters.brightness = 100;
		state.filters.contrast = 100;
		state.filters.saturate = 100;
		state.filters.blur = 0;
		state.filters.sepia = 0;
		state.filters.grayscale = 0;
		state.filters.invert = 0;
		resetFilterSliders();
		render();
	});
}

export function resetFilterSliders() {
	const defaults = { brightness: 100, contrast: 100, saturate: 100, blur: 0, sepia: 0, grayscale: 0, invert: 0 };
	const suffixes = { brightness: '%', contrast: '%', saturate: '%', blur: 'px', sepia: '%', grayscale: '%', invert: '%' };
	Object.keys(defaults).forEach(key => {
		const input = document.getElementById(`filter-${key}`);
		const valEl = document.getElementById(`val-${key}`);
		if (input) input.value = defaults[key];
		if (valEl) valEl.textContent = defaults[key] + suffixes[key];
	});
}

import { state, cloneState, restoreState, PRESETS, resetIdCounter } from './state.js';
import { render, resizeCanvas } from './editor.js';
import { updateLayerList } from './layers.js';

const STORAGE_KEY = 'vrp-templates';
const MAX_TEMPLATES = 20;

export function initTemplates() {
	refreshTemplateList();

	document.getElementById('btn-save-template').addEventListener('click', () => {
		const name = prompt('Название шаблона:');
		if (!name || !name.trim()) return;
		saveTemplate(name.trim());
	});

	document.getElementById('btn-del-template').addEventListener('click', () => {
		const select = document.getElementById('template-select');
		if (!select.value) return;
		if (!confirm('Удалить шаблон «' + select.options[select.selectedIndex].text + '»?')) return;
		deleteTemplate(select.value);
	});

	document.getElementById('template-select').addEventListener('change', function () {
		document.getElementById('btn-del-template').disabled = !this.value;
		if (this.value) {
			loadTemplate(this.value);
		}
	});

	document.getElementById('btn-export-template').addEventListener('click', exportAllTemplates);
	document.getElementById('btn-import-template').addEventListener('click', () => {
		document.getElementById('template-file-input').click();
	});

	const fileInput = document.getElementById('template-file-input');
	fileInput.addEventListener('change', (e) => {
		const file = e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const data = JSON.parse(reader.result);
				importTemplates(data);
			} catch (err) {
				toast('Ошибка импорта: неверный JSON', 'error');
			}
		};
		reader.readAsText(file);
		fileInput.value = '';
	});
}

export function saveTemplate(name) {
	const templates = getTemplates();
	if (templates.length >= MAX_TEMPLATES) {
		toast(`Максимум ${MAX_TEMPLATES} шаблонов`, 'error');
		return;
	}

	const existingIdx = templates.findIndex(t => t.name === name);
	const data = {
		name,
		version: 1,
		createdAt: new Date().toISOString(),
		state: {
			preset: state.preset,
			layers: state.layers.map(l => {
				const { _img, ...rest } = l;
				if (l.type === 'image' && _img) {
					rest._imgSrc = _img.src;
				}
				return rest;
			}),
			filters: { ...state.filters },
			background: state.background,
		},
	};

	if (existingIdx >= 0) {
		templates[existingIdx] = data;
	} else {
		templates.push(data);
	}

	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
	refreshTemplateList();
	toast('Шаблон сохранён: ' + name, 'success');
}

export function loadTemplate(id) {
	const templates = getTemplates();
	const idx = parseInt(id);
	const tmpl = templates[idx];
	if (!tmpl) return;

	restoreState(tmpl.state);

	resetIdCounter(state.layers.length + 1);

	state.layers.forEach(l => {
		if (l.type === 'image' && l._imgSrc) {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.src = l._imgSrc;
			l._img = img;
			delete l._imgSrc;
		}
	});

	updateLayerList();
	resizeCanvas();
	render();
	toast('Шаблон загружен: ' + tmpl.name, 'success');
}

export function deleteTemplate(id) {
	const templates = getTemplates();
	const idx = parseInt(id);
	templates.splice(idx, 1);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
	refreshTemplateList();
	document.getElementById('btn-del-template').disabled = true;
}

function getTemplates() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
	} catch (e) {
		return [];
	}
}

function refreshTemplateList() {
	const select = document.getElementById('template-select');
	if (!select) return;
	const templates = getTemplates();

	select.innerHTML = '<option value="">— Выберите шаблон —</option>';
	templates.forEach((t, i) => {
		const opt = document.createElement('option');
		opt.value = i;
		opt.textContent = t.name + ' (' + new Date(t.createdAt).toLocaleDateString() + ')';
		select.appendChild(opt);
	});

	document.getElementById('btn-del-template').disabled = !select.value;
}

function exportAllTemplates() {
	const templates = getTemplates();
	const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = 'vrp_templates_' + new Date().toISOString().slice(0, 10) + '.json';
	a.click();
	toast('Шаблоны экспортированы', 'success');
}

function importTemplates(data) {
	const arr = Array.isArray(data) ? data : [data];
	const existing = getTemplates();
	let added = 0;

	arr.forEach(tmpl => {
		if (existing.length >= MAX_TEMPLATES) return;
		if (!existing.find(e => e.name === tmpl.name)) {
			existing.push(tmpl);
			added++;
		}
	});

	localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
	refreshTemplateList();
	toast(`Импортировано шаблонов: ${added}`, 'success');
}

function toast(msg, type) {
	const c = document.getElementById('toasts');
	if (!c) return;
	const t = document.createElement('div');
	t.className = `toast ${type}`;
	const icons = { success: '✅', error: '❌', info: 'ℹ️' };
	t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
	c.appendChild(t);
	setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = 'all .25s'; setTimeout(() => t.remove(), 250); }, 3000);
}

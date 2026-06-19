import { state } from './state.js';
import { initEditor, render, resizeCanvas, updateCursor } from './editor.js';
import { initTools } from './tools.js';
import { initLayers, updateLayerList, deleteLayer } from './layers.js';
import { initFilters } from './filters.js';
import { initHistory, undo, redo, saveSnapshot } from './history.js';
import { initTemplates, saveTemplate, loadTemplate } from './templates.js';
import { initExport, exportImage, copyToClipboard, openPreview } from './export.js';
import { initVideoSource } from './video-source.js';

initEditor();
initTools();
initLayers();
initFilters();
initHistory();
initTemplates();
initExport();
initVideoSource();

render();
updateLayerList();

// Spoiler toggling
document.querySelectorAll('.panel-header').forEach(header => {
	header.addEventListener('click', () => {
		const section = document.getElementById(header.dataset.section);
		if (section) section.classList.toggle('collapsed');
	});
});

// Global: open a specific spoiler section
window.openSection = function (sectionId) {
	const section = document.getElementById(sectionId);
	if (section) section.classList.remove('collapsed');
};

// Mobile bar panel toggling
const mobileTabs = document.querySelectorAll('.mobile-tab');
mobileTabs.forEach(tab => {
	tab.addEventListener('click', () => {
		const panel = tab.dataset.panel;

		if (panel === 'tools') {
			const left = document.getElementById('panel-left');
			left.classList.toggle('mobile-open');
			tab.classList.toggle('active', left.classList.contains('mobile-open'));
		} else if (panel === 'layers') {
			const left = document.getElementById('panel-left');
			left.classList.toggle('mobile-open');
			tab.classList.toggle('active', left.classList.contains('mobile-open'));
		} else if (panel === 'filters') {
			const section = document.getElementById('section-filters');
			if (section) {
				section.classList.toggle('collapsed');
				tab.classList.toggle('active', !section.classList.contains('collapsed'));
			}
		} else if (panel === 'export') {
			const fmt = document.getElementById('fmt');
			if (fmt) {
				const val = fmt.value;
				if (val === 'png') fmt.value = 'jpeg';
				else if (val === 'jpeg') fmt.value = 'webp';
				else fmt.value = 'png';
			}
			exportImage();
		}

		mobileTabs.forEach(t => {
			if (t !== tab && t.dataset.panel !== 'filters') {
				t.classList.remove('active');
			}
		});
	});
});


// Help modal
function openHelp() {
	const overlay = document.getElementById('help-overlay');
	overlay.classList.add('visible');
	document.body.style.overflow = 'hidden';
}

document.getElementById('btn-help').addEventListener('click', openHelp);
document.getElementById('btn-open-help').addEventListener('click', openHelp);
document.getElementById('btn-help-templates').addEventListener('click', (e) => {
	e.stopPropagation();
	openHelp();
});

document.getElementById('help-close').addEventListener('click', () => {
	document.getElementById('help-overlay').classList.remove('visible');
	document.body.style.overflow = '';
});

document.getElementById('help-overlay').addEventListener('click', (e) => {
	if (e.target === e.currentTarget) {
		e.currentTarget.classList.remove('visible');
		document.body.style.overflow = '';
	}
});

document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') {
		const helpOverlay = document.getElementById('help-overlay');
		if (helpOverlay.classList.contains('visible')) {
			helpOverlay.classList.remove('visible');
			document.body.style.overflow = '';
			return;
		}
	}

	if (e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
		return;
	}

	const ctrl = e.ctrlKey || e.metaKey;

	if (ctrl && e.key === 'z' && !e.shiftKey) {
		e.preventDefault();
		undo();
		return;
	}

	if (ctrl && e.key === 'z' && e.shiftKey) {
		e.preventDefault();
		redo();
		return;
	}

	if (ctrl && e.key === 'e') {
		e.preventDefault();
		exportImage();
		return;
	}

	if (ctrl && e.key === 'c') {
		e.preventDefault();
		copyToClipboard();
		return;
	}

	if (e.key === 'Delete' || e.key === 'Backspace') {
		if (state.selectedId && !document.querySelector('.text-box.editing')) {
			deleteLayer();
			saveSnapshot();
		}
		return;
	}

	if (e.key === 'Escape') {
		state.selectedId = null;
		updateLayerList();
		render();
		return;
	}

	const toolKeys = {
		'v': 'select',
		't': 'text',
		'r': 'rect',
		'c': 'circle',
		'a': 'arrow',
		'l': 'line',
	};

	const tool = toolKeys[e.key.toLowerCase()];
	if (tool) {
		document.querySelectorAll('.tool-btn').forEach(b => {
			b.classList.toggle('active', b.dataset.tool === tool);
		});
		state.activeTool = tool;
		updateCursor(tool);
	}
});

window.toast = function (msg, type) {
	const c = document.getElementById('toasts');
	if (!c) return;
	const t = document.createElement('div');
	t.className = `toast ${type || 'info'}`;
	const icons = { success: '✅', error: '❌', info: 'ℹ️' };
	t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
	c.appendChild(t);
	setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = 'all .25s'; setTimeout(() => t.remove(), 250); }, 3000);
};

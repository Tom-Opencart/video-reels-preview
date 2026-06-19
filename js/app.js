import { state } from './state.js';
import { initEditor, render, resizeCanvas } from './editor.js';
import { initTools } from './tools.js';
import { initLayers, updateLayerList, deleteLayer } from './layers.js';
import { initFilters } from './filters.js';
import { initHistory, undo, redo, saveSnapshot } from './history.js';
import { initTemplates, saveTemplate, loadTemplate } from './templates.js';
import { initExport, exportImage, copyToClipboard, openPreview } from './export.js';
import { initVideoSource } from './video-source.js';
import { updateCursor } from './editor.js';

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
			const fpanel = document.getElementById('filters-panel');
			const wasHidden = fpanel.style.display === 'none';
			updateMobileFilterPanel(!wasHidden);
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

function updateMobileFilterPanel(show) {
	const fpanel = document.getElementById('filters-panel');
	if (!fpanel) return;
	fpanel.style.display = show ? 'block' : 'none';
	if (show) {
		fpanel.style.position = 'fixed';
		fpanel.style.bottom = '50px';
		fpanel.style.left = '0';
		fpanel.style.right = '0';
		fpanel.style.background = 'var(--bg-page)';
		fpanel.style.borderTop = '1px solid var(--border)';
		fpanel.style.padding = '16px';
		fpanel.style.zIndex = '95';
		fpanel.style.maxHeight = '50vh';
		fpanel.style.overflowY = 'auto';
	} else {
		fpanel.style.position = '';
		fpanel.style.bottom = '';
		fpanel.style.left = '';
		fpanel.style.right = '';
		fpanel.style.background = '';
		fpanel.style.borderTop = '';
		fpanel.style.padding = '';
		fpanel.style.zIndex = '';
		fpanel.style.maxHeight = '';
		fpanel.style.overflowY = '';
	}
}

document.addEventListener('keydown', (e) => {
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

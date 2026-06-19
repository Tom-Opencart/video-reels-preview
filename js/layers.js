import { state, PRESETS, genId } from './state.js';
import { render, resizeCanvas } from './editor.js';
import { saveSnapshot } from './history.js';

export function initLayers() {
	document.getElementById('btn-add-layer').addEventListener('click', addEmptyLayer);
	document.getElementById('btn-dup-layer').addEventListener('click', duplicateLayer);
	document.getElementById('btn-del-layer').addEventListener('click', deleteLayer);
}

function addEmptyLayer() {
	const id = genId();
	const layer = {
		id,
		type: 'text',
		visible: true,
		locked: false,
		x: 100,
		y: 100,
		content: 'Новый слой',
		fontSize: 32,
		fontFamily: 'Inter, system-ui, sans-serif',
		color: '#ffffff',
		bgOpacity: 0,
	};
	state.layers.push(layer);
	state.selectedId = id;
	saveSnapshot();
	updateLayerList();
	render();
}

export function addImageLayer(img, name) {
	const id = genId();
	const layer = {
		id,
		type: 'image',
		visible: true,
		locked: false,
		x: 0,
		y: 0,
		width: state.preset.width,
		height: state.preset.height,
		_img: img,
		name: name || 'Кадр',
	};
	state.layers.push(layer);
	state.selectedId = id;
	saveSnapshot();
	updateLayerList();
	render();
}

export function duplicateLayer() {
	const layer = getSelectedFromState();
	if (!layer) return;

	const newLayer = JSON.parse(JSON.stringify(layer));
	newLayer.id = genId();
	if (layer._img) newLayer._img = layer._img;

	const idx = state.layers.indexOf(layer);
	state.layers.splice(idx + 1, 0, newLayer);
	state.selectedId = newLayer.id;
	saveSnapshot();
	updateLayerList();
	render();
}

export function deleteLayer() {
	const layer = getSelectedFromState();
	if (!layer) return;

	state.layers = state.layers.filter(l => l !== layer);
	state.selectedId = null;
	saveSnapshot();
	updateLayerList();
	render();
}

export function removeLayerById(id) {
	state.layers = state.layers.filter(l => l.id !== id);
	if (state.selectedId === id) state.selectedId = null;
	updateLayerList();
	render();
}

export function updateLayerList() {
	const list = document.getElementById('layer-list');
	if (!list) return;

	list.innerHTML = '';

	if (state.layers.length === 0) {
		list.innerHTML = '<div class="layer-empty">Нет слоёв</div>';
		return;
	}

	const reversed = [...state.layers].reverse();

	reversed.forEach((layer, revIdx) => {
		const idx = state.layers.length - 1 - revIdx;
		const item = document.createElement('div');
		item.className = 'layer-item';
		item.draggable = true;
		item.dataset.id = layer.id;

		if (layer.id === state.selectedId) {
			item.classList.add('selected');
		}

		const iconMap = {
			image: '🖼',
			text: 'T',
			rect: '▭',
			circle: '○',
			arrow: '→',
			line: '╱',
		};

		const icon = document.createElement('span');
		icon.className = 'layer-icon';
		icon.textContent = iconMap[layer.type] || '?';
		item.appendChild(icon);

		const name = document.createElement('span');
		name.className = 'layer-name';
		name.textContent = layer.name || layer.content || layer.type;
		item.appendChild(name);

		const vis = document.createElement('span');
		vis.className = 'layer-vis' + (layer.visible ? '' : ' off');
		vis.textContent = layer.visible ? '👁' : '👁';
		vis.title = 'Видимость';
		vis.addEventListener('click', (e) => {
			e.stopPropagation();
			layer.visible = !layer.visible;
			saveSnapshot();
			updateLayerList();
			render();
		});
		item.appendChild(vis);

		const lock = document.createElement('span');
		lock.className = 'layer-lock' + (layer.locked ? '' : ' off');
		lock.textContent = layer.locked ? '🔒' : '🔓';
		lock.title = 'Блокировка';
		lock.addEventListener('click', (e) => {
			e.stopPropagation();
			layer.locked = !layer.locked;
			saveSnapshot();
			updateLayerList();
			render();
		});
		item.appendChild(lock);

		item.addEventListener('click', () => {
			state.selectedId = layer.id;
			updateLayerList();
			render();
		});

		item.addEventListener('dragstart', (e) => {
			e.dataTransfer.setData('text/plain', String(idx));
			item.classList.add('dragging');
		});

		item.addEventListener('dragend', () => {
			item.classList.remove('dragging');
			document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('drag-over'));
		});

		item.addEventListener('dragover', (e) => {
			e.preventDefault();
			item.classList.add('drag-over');
		});

		item.addEventListener('dragleave', () => {
			item.classList.remove('drag-over');
		});

		item.addEventListener('drop', (e) => {
			e.preventDefault();
			item.classList.remove('drag-over');
			const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
			if (!isNaN(fromIdx) && fromIdx !== idx) {
				const [moved] = state.layers.splice(fromIdx, 1);
				state.layers.splice(idx, 0, moved);
				saveSnapshot();
				updateLayerList();
				render();
			}
		});

		list.appendChild(item);
	});
}

function getSelectedFromState() {
	return state.layers.find(l => l.id === state.selectedId);
}

import { state, getLayerById, genId } from './state.js';
import { render, getCanvas, screenToCanvas, updateCursor } from './editor.js';
import { saveSnapshot } from './history.js';
import { updateLayerList } from './layers.js';

let dragState = null;

export function initTools() {
	const toolBtns = document.querySelectorAll('.tool-btn');

	toolBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			toolBtns.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			state.activeTool = btn.dataset.tool;
			updateCursor(state.activeTool);
		});
	});

	const canvas = getCanvas();
	canvas.addEventListener('mousedown', onMouseDown);
	canvas.addEventListener('mousemove', onMouseMove);
	canvas.addEventListener('mouseup', onMouseUp);
	document.addEventListener('mouseup', onMouseUp);

	canvas.addEventListener('dblclick', onDoubleClick);
}

function getActiveLayerAtPoint(cx, cy) {
	for (let i = state.layers.length - 1; i >= 0; i--) {
		const layer = state.layers[i];
		if (!layer.visible || layer.locked) continue;

		const x = layer.x || 0;
		const y = layer.y || 0;
		const w = layer.width || (layer.type === 'text' ? 200 : 100);
		const h = layer.height || (layer.type === 'text' ? 40 : 100);

		if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
			return layer;
		}
	}
	return null;
}

function onMouseDown(e) {
	if (e.button !== 0) return;

	const { x, y } = screenToCanvas(e.clientX, e.clientY);

	if (state.activeTool === 'select') {
		const layer = getActiveLayerAtPoint(x, y);
		if (layer) {
			state.selectedId = layer.id;
			updateLayerList();

			dragState = {
				type: 'move',
				id: layer.id,
				startX: layer.x || 0,
				startY: layer.y || 0,
				mouseX: e.clientX,
				mouseY: e.clientY,
			};
		} else {
			state.selectedId = null;
			updateLayerList();
		}
		render();
	} else if (state.activeTool === 'text') {
		const id = genId();
		const layer = {
			id,
			type: 'text',
			visible: true,
			locked: false,
			x: x,
			y: y,
			content: 'Текст',
			fontSize: 32,
			fontFamily: 'Inter, system-ui, sans-serif',
			color: '#ffffff',
			bgOpacity: 40,
			bgColor: '#000000',
			bold: false,
			italic: false,
			name: 'Текст',
		};
		state.layers.push(layer);
		state.selectedId = id;
		saveSnapshot();
		updateLayerList();
		render();
	} else if (['rect', 'circle', 'arrow', 'line'].includes(state.activeTool)) {
		dragState = {
			type: 'shape',
			shapeType: state.activeTool,
			startX: x,
			startY: y,
			mouseX: e.clientX,
			mouseY: e.clientY,
		};
	}
}

function onMouseMove(e) {
	if (!dragState) return;

	if (dragState.type === 'move') {
		const { x, y } = screenToCanvas(e.clientX, e.clientY);
		const startCanvas = screenToCanvas(dragState.mouseX, dragState.mouseY);
		const dx = x - startCanvas.x;
		const dy = y - startCanvas.y;

		const layer = getLayerById(dragState.id);
		if (layer) {
			layer.x = dragState.startX + dx;
			layer.y = dragState.startY + dy;
			render();
		}
	} else if (dragState.type === 'shape') {
		const { x, y } = screenToCanvas(e.clientX, e.clientY);
		dragState.currentX = x;
		dragState.currentY = y;
		render();
		drawShapePreview();
	}
}

function onMouseUp(e) {
	if (!dragState) return;

	if (dragState.type === 'move') {
		saveSnapshot();
	} else if (dragState.type === 'shape') {
		const { x, y } = screenToCanvas(e.clientX, e.clientY);
		const sx = dragState.startX;
		const sy = dragState.startY;
		let ex = x;
		let ey = y;

		if (Math.abs(ex - sx) < 5 && Math.abs(ey - sy) < 5) {
			ex = sx + 100;
			ey = sy + 100;
		}

		const id = genId();
		const shapeType = dragState.shapeType;
		const layer = {
			id,
			type: shapeType,
			visible: true,
			locked: false,
			x: Math.min(sx, ex),
			y: Math.min(sy, ey),
			width: Math.abs(ex - sx),
			height: Math.abs(ey - sy),
			name: shapeType,
		};

		if (shapeType === 'rect') {
			layer.fill = 'rgba(37, 99, 235, 0.2)';
			layer.stroke = '#2563eb';
			layer.strokeWidth = 2;
			layer.borderRadius = 0;
		} else if (shapeType === 'circle') {
			layer.fill = 'rgba(37, 99, 235, 0.2)';
			layer.stroke = '#2563eb';
			layer.strokeWidth = 2;
			const size = Math.min(layer.width, layer.height);
			layer.width = size;
			layer.height = size;
		} else if (shapeType === 'arrow') {
			layer.x = sx;
			layer.y = sy;
			layer.x2 = ex;
			layer.y2 = ey;
			layer.color = '#ef4444';
			layer.strokeWidth = 3;
			layer.headSize = 12;
			delete layer.width;
			delete layer.height;
		} else if (shapeType === 'line') {
			layer.x = sx;
			layer.y = sy;
			layer.x2 = ex;
			layer.y2 = ey;
			layer.color = '#ffffff';
			layer.strokeWidth = 3;
			delete layer.width;
			delete layer.height;
		}

		state.layers.push(layer);
		state.selectedId = id;
		saveSnapshot();
		updateLayerList();
	}

	dragState = null;
	render();
}

function drawShapePreview() {
	if (!dragState || dragState.type !== 'shape') return;

	const canvas = getCanvas();
	const ctx = canvas.getContext('2d');
	const dpr = window.devicePixelRatio || 1;
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.scale(dpr, dpr);

	const sx = dragState.startX;
	const sy = dragState.startY;
	const ex = dragState.currentX;
	const ey = dragState.currentY;
	const x = Math.min(sx, ex);
	const y = Math.min(sy, ey);
	const w = Math.abs(ex - sx);
	const h = Math.abs(ey - sy);

	ctx.strokeStyle = '#2563eb';
	ctx.lineWidth = 1;
	ctx.setLineDash([4, 4]);

	if (dragState.shapeType === 'rect') {
		ctx.strokeRect(x, y, w || 1, h || 1);
	} else if (dragState.shapeType === 'circle') {
		const size = Math.min(w, h);
		const cx = sx + (ex - sx) / 2;
		const cy = sy + (ey - sy) / 2;
		ctx.beginPath();
		ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
		ctx.stroke();
	} else if (dragState.shapeType === 'arrow' || dragState.shapeType === 'line') {
		ctx.beginPath();
		ctx.moveTo(sx, sy);
		ctx.lineTo(ex, ey);
		ctx.stroke();
	}

	ctx.setLineDash([]);
	ctx.restore();
}

function onDoubleClick(e) {
	const { x, y } = screenToCanvas(e.clientX, e.clientY);
	const layer = getActiveLayerAtPoint(x, y);
	if (!layer || layer.type !== 'text') return;

	const newContent = prompt('Редактировать текст:', layer.content || 'Текст');
	if (newContent !== null) {
		layer.content = newContent || 'Текст';
		saveSnapshot();
		updateLayerList();
		render();
	}
}

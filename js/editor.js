import { state, getSelectedLayer, getLayerById } from './state.js';

let canvas, ctx, container;
let dpr = 1;
let displayW = 0, displayH = 0;
let scaleToDisplay = 1;

export function getCanvas() { return canvas; }
export function getCtx() { return ctx; }
export function getDisplaySize() { return { w: displayW, h: displayH, scale: scaleToDisplay }; }

export function screenToCanvas(sx, sy) {
	const rect = canvas.getBoundingClientRect();
	const x = (sx - rect.left) / (displayW / canvas.width);
	const y = (sy - rect.top) / (displayH / canvas.height);
	return { x: Math.round(x), y: Math.round(y) };
}

export function canvasToScreen(cx, cy) {
	const rect = canvas.getBoundingClientRect();
	return {
		x: rect.left + (cx / canvas.width) * displayW,
		y: rect.top + (cy / canvas.height) * displayH,
	};
}

export function initEditor() {
	canvas = document.getElementById('editor-canvas');
	ctx = canvas.getContext('2d');
	container = document.getElementById('canvas-container');

	dpr = window.devicePixelRatio || 1;
	resizeCanvas();
	setupZoomPan();
	setupResizeObserver();
	render();

	canvas.addEventListener('mousedown', onCanvasMouseDown);
	window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
	const pw = state.preset.width;
	const ph = state.preset.height;
	const cw = container.clientWidth - 32;
	const ch = container.clientHeight - 32;

	const scaleX = cw / pw;
	const scaleY = ch / ph;
	scaleToDisplay = Math.min(scaleX, scaleY, 1);

	displayW = Math.round(pw * scaleToDisplay * state.zoom);
	displayH = Math.round(ph * scaleToDisplay * state.zoom);

	canvas.width = Math.round(pw * dpr);
	canvas.height = Math.round(ph * dpr);
	canvas.style.width = displayW + 'px';
	canvas.style.height = displayH + 'px';

	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.scale(dpr, dpr);

	render();
}

function setupResizeObserver() {
	if (window.ResizeObserver) {
		const ro = new ResizeObserver(() => resizeCanvas());
		ro.observe(container);
	}
}

export function render() {
	if (!ctx || !canvas) return;

	const w = state.preset.width;
	const h = state.preset.height;

	ctx.clearRect(0, 0, w, h);

	ctx.fillStyle = state.background;
	ctx.fillRect(0, 0, w, h);

	for (const layer of state.layers) {
		if (!layer.visible) continue;
		renderLayer(layer);
	}

	drawSelection();
}

function renderLayer(layer) {
	ctx.save();

	if (layer.type === 'image') {
		renderImageLayer(layer);
	} else if (layer.type === 'text') {
		renderTextLayer(layer);
	} else if (layer.type === 'rect') {
		renderRectLayer(layer);
	} else if (layer.type === 'circle') {
		renderCircleLayer(layer);
	} else if (layer.type === 'arrow') {
		renderArrowLayer(layer);
	} else if (layer.type === 'line') {
		renderLineLayer(layer);
	}

	ctx.restore();
}

function renderImageLayer(layer) {
	if (!layer._img || !layer._img.complete) return;

	const w = layer.width || state.preset.width;
	const h = layer.height || state.preset.height;
	const x = layer.x || 0;
	const y = layer.y || 0;

	ctx.drawImage(layer._img, x, y, w, h);
}

function renderTextLayer(layer) {
	const x = layer.x || 0;
	const y = layer.y || 0;

	ctx.textBaseline = 'top';
	ctx.font = `${layer.bold ? 'bold ' : ''}${layer.italic ? 'italic ' : ''}${layer.fontSize || 32}px ${layer.fontFamily || 'Inter, system-ui, sans-serif'}`;
	ctx.fillStyle = layer.color || '#ffffff';

	const lines = (layer.content || 'Текст').split('\n');
	let lineY = y;
	const lineHeight = (layer.fontSize || 32) * 1.25;

	if (layer.bgOpacity !== undefined && layer.bgOpacity > 0) {
		let maxW = 0;
		lines.forEach(line => {
			const m = ctx.measureText(line);
			if (m.width > maxW) maxW = m.width;
		});
		const textH = lines.length * lineHeight;
		const bgColor = layer.bgColor || '#000000';
		const alpha = layer.bgOpacity / 100;
		const padX = 10;
		const padY = 6;
		const rx = x - padX, ry = y - padY, rw = maxW + padX * 2, rh = textH + padY * 2;
		const r = 6;

		ctx.fillStyle = `rgba(${hexToRgb(bgColor)},${alpha})`;
		ctx.beginPath();
		ctx.moveTo(rx + r, ry);
		ctx.lineTo(rx + rw - r, ry);
		ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
		ctx.lineTo(rx + rw, ry + rh - r);
		ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
		ctx.lineTo(rx + r, ry + rh);
		ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
		ctx.lineTo(rx, ry + r);
		ctx.quadraticCurveTo(rx, ry, rx + r, ry);
		ctx.closePath();
		ctx.fill();
	}

	lines.forEach(line => {
		ctx.fillText(line, x, lineY);
		lineY += lineHeight;
	});
}

function renderRectLayer(layer) {
	const x = layer.x || 0;
	const y = layer.y || 0;
	const w = layer.width || 100;
	const h = layer.height || 100;
	const r = layer.borderRadius || 0;

	if (layer.fill) {
		ctx.fillStyle = layer.fill;
		if (r > 0) {
			roundRect(x, y, w, h, r);
			ctx.fill();
		} else {
			ctx.fillRect(x, y, w, h);
		}
	}

	if (layer.stroke && layer.strokeWidth > 0) {
		ctx.strokeStyle = layer.stroke;
		ctx.lineWidth = layer.strokeWidth;
		if (r > 0) {
			roundRect(x, y, w, h, r);
			ctx.stroke();
		} else {
			ctx.strokeRect(x, y, w, h);
		}
	}
}

function renderCircleLayer(layer) {
	const cx = (layer.x || 0) + (layer.width || 100) / 2;
	const cy = (layer.y || 0) + (layer.height || 100) / 2;
	const r = Math.min(layer.width || 100, layer.height || 100) / 2;

	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);

	if (layer.fill) {
		ctx.fillStyle = layer.fill;
		ctx.fill();
	}

	if (layer.stroke && layer.strokeWidth > 0) {
		ctx.strokeStyle = layer.stroke;
		ctx.lineWidth = layer.strokeWidth;
		ctx.stroke();
	}
}

function renderArrowLayer(layer) {
	const x1 = layer.x || 0;
	const y1 = layer.y || 0;
	const x2 = layer.x2 || 100;
	const y2 = layer.y2 || 0;

	ctx.strokeStyle = layer.color || '#ff0000';
	ctx.lineWidth = layer.strokeWidth || 3;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();

	const headSize = layer.headSize || 12;
	const angle = Math.atan2(y2 - y1, x2 - x1);
	ctx.fillStyle = layer.color || '#ff0000';
	ctx.beginPath();
	ctx.moveTo(x2, y2);
	ctx.lineTo(
		x2 - headSize * Math.cos(angle - Math.PI / 6),
		y2 - headSize * Math.sin(angle - Math.PI / 6)
	);
	ctx.lineTo(
		x2 - headSize * Math.cos(angle + Math.PI / 6),
		y2 - headSize * Math.sin(angle + Math.PI / 6)
	);
	ctx.closePath();
	ctx.fill();
}

function renderLineLayer(layer) {
	const x1 = layer.x || 0;
	const y1 = layer.y || 0;
	const x2 = layer.x2 || 100;
	const y2 = layer.y2 || 0;

	ctx.strokeStyle = layer.color || '#ffffff';
	ctx.lineWidth = layer.strokeWidth || 3;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

function drawSelection() {
	const layer = getSelectedLayer();
	if (!layer || layer.locked) return;

	const x = layer.x || 0;
	const y = layer.y || 0;
	const w = layer.width || (layer.type === 'text' ? 200 : 100);
	const h = layer.height || (layer.type === 'text' ? 40 : 100);

	ctx.strokeStyle = '#2563eb';
	ctx.lineWidth = 2;
	ctx.setLineDash([5, 3]);
	ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
	ctx.setLineDash([]);

	const handleSize = 8;
	const handles = [
		{ x: x - handleSize / 2, y: y - handleSize / 2 },
		{ x: x + w - handleSize / 2, y: y - handleSize / 2 },
		{ x: x + w - handleSize / 2, y: y + h - handleSize / 2 },
		{ x: x - handleSize / 2, y: y + h - handleSize / 2 },
	];

	handles.forEach(h => {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(h.x - 1, h.y - 1, handleSize + 2, handleSize + 2);
		ctx.fillStyle = '#2563eb';
		ctx.fillRect(h.x, h.y, handleSize, handleSize);
	});
}

function roundRect(x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}

function hexToRgb(hex) {
	const clean = hex.replace('#', '');
	const r = parseInt(clean.substring(0, 2), 16);
	const g = parseInt(clean.substring(2, 4), 16);
	const b = parseInt(clean.substring(4, 6), 16);
	return `${r},${g},${b}`;
}

/* ---- Zoom & Pan ---- */
function setupZoomPan() {
	canvas.addEventListener('wheel', (e) => {
		if (!e.ctrlKey && !e.metaKey) return;
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.1 : 0.1;
		state.zoom = Math.max(0.25, Math.min(5, state.zoom + delta));
		resizeCanvas();
		updateZoomBadge();
	}, { passive: false });

	canvas.addEventListener('dblclick', () => {
		state.zoom = 1;
		resizeCanvas();
		updateZoomBadge();
	});
}

let badgeTimer = null;
function updateZoomBadge() {
	const badge = document.getElementById('zoom-badge');
	if (!badge) return;
	badge.textContent = Math.round(state.zoom * 100) + '%';
	badge.classList.add('visible');
	clearTimeout(badgeTimer);
	badgeTimer = setTimeout(() => badge.classList.remove('visible'), 1500);
}

/* ---- Canvas mouse events placeholder ---- */
let onCanvasMouseDownCallback = null;
export function setCanvasMouseDown(fn) { onCanvasMouseDownCallback = fn; }

function onCanvasMouseDown(e) {
	if (onCanvasMouseDownCallback) {
		onCanvasMouseDownCallback(e);
	}
}

export function updateCursor(tool) {
	if (!canvas) return;
	if (tool === 'select') {
		canvas.classList.add('tool-select');
	} else {
		canvas.classList.remove('tool-select');
	}
}

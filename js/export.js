import { state } from './state.js';
import { getCanvas } from './editor.js';

let offscreenCanvas, offscreenCtx;

export function initExport() {
	offscreenCanvas = document.getElementById('offscreen-canvas');

	document.getElementById('btn-export').addEventListener('click', () => exportImage('png'));
	document.getElementById('preview-close').addEventListener('click', closePreview);
	document.getElementById('preview-overlay').addEventListener('click', (e) => {
		if (e.target === e.currentTarget) closePreview();
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			const overlay = document.getElementById('preview-overlay');
			if (overlay.classList.contains('visible')) {
				closePreview();
			}
		}
	});
}

export function exportImage(fmt) {
	const canvas = getCanvas();
	if (!canvas) return;

	const fmtEl = document.getElementById('fmt');
	if (fmtEl) fmt = fmtEl.value || fmt;

	const mime = fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png';
	const ext = fmt === 'jpeg' ? 'jpg' : fmt;

	canvas.toBlob(blob => {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `preview_${Date.now()}.${ext}`;
		a.click();
		toast('Скачано: ' + ext.toUpperCase(), 'success');
	}, mime, 0.92);
}

export async function copyToClipboard() {
	const canvas = getCanvas();
	if (!canvas) return;

	try {
		const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
		toast('Скопировано в буфер', 'success');
	} catch (e) {
		toast('Ошибка копирования', 'error');
	}
}

export function openPreview() {
	const canvas = getCanvas();
	if (!canvas) return;

	const fmtEl = document.getElementById('fmt');
	const fmt = fmtEl ? fmtEl.value : 'png';
	const mime = fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png';

	canvas.toBlob(blob => {
		const previewImg = document.getElementById('preview-img');
		const previewInfo = document.getElementById('preview-info');
		const overlay = document.getElementById('preview-overlay');

		previewImg.src = URL.createObjectURL(blob);
		previewInfo.textContent = `${canvas.width}×${canvas.height} • ${fmt.toUpperCase()} • Esc — выйти`;
		overlay.classList.add('visible');
		document.body.style.overflow = 'hidden';
	}, mime, 0.95);
}

function closePreview() {
	document.getElementById('preview-overlay').classList.remove('visible');
	document.body.style.overflow = '';
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

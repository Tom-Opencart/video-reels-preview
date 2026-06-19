import { state } from './state.js';
import { render, getCanvas } from './editor.js';
import { addImageLayer } from './layers.js';

let ytId = null, rtId = null;
let srcType = 'auto';
let playerDuration = 0;

export function initVideoSource() {
	const tabs = document.querySelectorAll('.source-tabs .tab');
	tabs.forEach(tab => {
		tab.addEventListener('click', () => switchSourceTab(tab.dataset.src));
	});

	const urlInput = document.getElementById('source-url');
	urlInput.addEventListener('input', () => {
		document.getElementById('btn-load').disabled = !urlInput.value.trim();
	});

	document.getElementById('btn-load').addEventListener('click', loadAuto);

	const dropzone = document.getElementById('dropzone');
	dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
	dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
	dropzone.addEventListener('drop', e => {
		e.preventDefault();
		dropzone.classList.remove('dragover');
		if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
	});

	document.getElementById('file-input').addEventListener('change', (e) => {
		if (e.target.files[0]) handleFile(e.target.files[0]);
	});

	document.getElementById('btn-capture').addEventListener('click', capture);
	document.getElementById('time-slider').addEventListener('input', function () {
		const player = document.getElementById('player');
		if (player) player.currentTime = parseFloat(this.value);
	});
}

function switchSourceTab(type) {
	srcType = type;
	document.querySelectorAll('.source-tabs .tab').forEach(t => {
		t.classList.toggle('active', t.dataset.src === type);
	});
	const urlInput = document.getElementById('source-url');
	if (urlInput) {
		urlInput.value = '';
		urlInput.placeholder = type === 'youtube' ? 'YouTube URL...' :
			type === 'rutube' ? 'Rutube URL...' :
			type === 'file' ? 'MP4 URL или файл...' :
			'Вставьте ссылку...';
	}
	document.getElementById('btn-load').disabled = true;
	hideVideoPlayer();
}

function hideVideoPlayer() {
	const wrapper = document.getElementById('video-wrapper');
	const panel = document.getElementById('video-controls-panel');
	if (wrapper) wrapper.style.display = 'none';
	if (panel) panel.style.display = 'none';
}

function showVideoPlayer() {
	const wrapper = document.getElementById('video-wrapper');
	const panel = document.getElementById('video-controls-panel');
	if (wrapper) wrapper.style.display = 'block';
	if (panel) panel.style.display = 'block';
}

function detectSourceType(input) {
	const clean = input.trim();
	if (clean.match(/\.(mp4|webm|mov|ogg|m3u8)(\?.*)?$/i)) return 'direct';
	if (clean.match(/youtube\.com|youtu\.be/)) return 'youtube';
	if (clean.match(/rutube\.ru/)) return 'rutube';
	return 'unknown';
}

function loadAuto() {
	const input = document.getElementById('source-url').value.trim();
	const type = detectSourceType(input);

	if (type === 'youtube') { srcType = 'youtube'; loadYouTube(input); }
	else if (type === 'rutube') { srcType = 'rutube'; loadRutube(input); }
	else if (type === 'direct') { srcType = 'file'; loadMp4Url(input); }
	else { toast('Не удалось определить тип ссылки', 'error'); }
}

export function loadYouTube(url) {
	const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
	if (!match) return toast('Неверная ссылка YouTube', 'error');

	ytId = match[1];
	const wrapper = document.getElementById('video-wrapper');
	wrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?enablejsapi=1&modestbranding=1&rel=0" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>`;
	showVideoPlayer();

	const slider = document.getElementById('time-slider');
	const timeDisp = document.getElementById('time-display');
	if (slider) slider.style.display = 'none';
	if (timeDisp) timeDisp.textContent = 'YouTube превью';

	toast('YouTube видео загружено', 'success');
}

export function loadRutube(url) {
	const match = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)/);
	if (!match) return toast('Неверная ссылка Rutube', 'error');

	rtId = match[1];
	const wrapper = document.getElementById('video-wrapper');
	wrapper.innerHTML = `<iframe src="https://rutube.ru/play/embed/${rtId}" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>`;
	showVideoPlayer();

	const slider = document.getElementById('time-slider');
	const timeDisp = document.getElementById('time-display');
	if (slider) slider.style.display = 'none';
	if (timeDisp) timeDisp.textContent = '⚠ Захват кадра недоступен';

	toast('Rutube видео загружено', 'success');
}

export function loadMp4Url(url) {
	const wrapper = document.getElementById('video-wrapper');
	wrapper.innerHTML = '<video id="player" controls crossorigin="anonymous"></video>';

	const player = document.getElementById('player');
	player.src = url;
	player.addEventListener('loadedmetadata', () => {
		playerDuration = player.duration;
		const slider = document.getElementById('time-slider');
		if (slider) { slider.max = playerDuration; slider.value = 0; }
		updateTimeDisplay();
	});
	player.addEventListener('timeupdate', updateTimeDisplay);
	player.addEventListener('error', () => toast('Ошибка загрузки видео', 'error'));

	showVideoPlayer();

	const slider = document.getElementById('time-slider');
	if (slider) slider.style.display = '';

	toast('Видео загружается...', 'info');
}

export function handleFile(file) {
	if (!file || !file.type.startsWith('video/')) return toast('Выберите видеофайл', 'error');

	document.getElementById('file-info').textContent = `📎 ${file.name} (${(file.size/1024/1024).toFixed(1)} MB)`;

	const wrapper = document.getElementById('video-wrapper');
	wrapper.innerHTML = '<video id="player" controls crossorigin="anonymous"></video>';

	const player = document.getElementById('player');
	player.src = URL.createObjectURL(file);
	player.addEventListener('loadedmetadata', () => {
		playerDuration = player.duration;
		const slider = document.getElementById('time-slider');
		if (slider) { slider.max = playerDuration; slider.value = 0; }
		updateTimeDisplay();
	});
	player.addEventListener('timeupdate', updateTimeDisplay);
	player.addEventListener('error', () => toast('Ошибка загрузки видео', 'error'));

	srcType = 'file';
	showVideoPlayer();

	const slider = document.getElementById('time-slider');
	if (slider) slider.style.display = '';

	toast('Файл загружен', 'success');
}

function updateTimeDisplay() {
	const player = document.getElementById('player');
	if (!player || !playerDuration) return;

	const timeDisp = document.getElementById('time-display');
	const slider = document.getElementById('time-slider');
	if (timeDisp) timeDisp.textContent = `${fmtTime(player.currentTime)} / ${fmtTime(playerDuration)}`;
	if (slider) slider.value = player.currentTime;
}

function fmtTime(s) {
	const m = Math.floor(s / 60);
	return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function capture() {
	const player = document.getElementById('player');

	if (srcType === 'file' && player && player.videoWidth) {
		const canvas = document.createElement('canvas');
		canvas.width = player.videoWidth;
		canvas.height = player.videoHeight;
		canvas.getContext('2d').drawImage(player, 0, 0);

		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			addImageLayer(img, 'Кадр');
			toast('Кадр захвачен! ' + canvas.width + '×' + canvas.height, 'success');
		};
		img.src = canvas.toDataURL();
	} else if (srcType === 'youtube' && ytId) {
		const variants = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
		let loaded = false;
		variants.forEach(v => {
			if (loaded) return;
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => {
				if (loaded || img.naturalWidth < 100) return;
				loaded = true;
				addImageLayer(img, 'Кадр YouTube');
				toast('Кадр захвачен! ' + img.naturalWidth + '×' + img.naturalHeight, 'success');
			};
			img.onerror = () => {};
			img.src = `https://img.youtube.com/vi/${ytId}/${v}.jpg`;
		});
		setTimeout(() => {
			if (!loaded) toast('Не удалось загрузить превью YouTube', 'error');
		}, 5000);
	} else {
		toast('Загрузите MP4 файл или используйте YouTube', 'info');
	}
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

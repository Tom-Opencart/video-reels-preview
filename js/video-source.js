import { state } from './state.js';
import { render, getCanvas, resizeCanvas } from './editor.js';
import { addImageLayer } from './layers.js';

let ytId = null, rtId = null;
let srcType = 'auto';
let playerDuration = 0;

export function initVideoSource() {
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
		seekVideo(parseFloat(this.value));
	});

	document.getElementById('btn-play').addEventListener('click', togglePlay);
	document.getElementById('btn-frame-prev').addEventListener('click', () => stepFrame(-1));
	document.getElementById('btn-frame-next').addEventListener('click', () => stepFrame(1));

	document.addEventListener('keydown', (e) => {
		if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
		if (e.code === 'Space') {
			e.preventDefault();
			togglePlay();
		}
		if (e.code === 'ArrowLeft') { e.preventDefault(); stepFrame(-1); }
		if (e.code === 'ArrowRight') { e.preventDefault(); stepFrame(1); }
	});
}

function getVideoElement() {
	return document.getElementById('player');
}

function getYtIframe() {
	return document.querySelector('#video-player iframe[src*="youtube"]');
}

function togglePlay() {
	const video = getVideoElement();
	const ytFrame = getYtIframe();

	if (video) {
		if (video.paused) { video.play(); updatePlayIcon(true); }
		else { video.pause(); updatePlayIcon(false); }
	} else if (ytFrame) {
		const btn = document.getElementById('btn-play');
		const isPlaying = btn.dataset.playing === 'true';
		const cmd = isPlaying ? 'pauseVideo' : 'playVideo';
		ytFrame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: [] }), '*');
		updatePlayIcon(!isPlaying);
	}
}

function updatePlayIcon(playing) {
	const btn = document.getElementById('btn-play');
	if (btn) {
		btn.textContent = playing ? '⏸' : '▶';
		btn.dataset.playing = playing;
	}
}

function seekVideo(time) {
	const video = getVideoElement();
	const ytFrame = getYtIframe();

	if (video) {
		video.currentTime = time;
	} else if (ytFrame) {
		ytFrame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [time, true] }), '*');
	}

	const slider = document.getElementById('time-slider');
	if (slider) slider.value = time;
}

function stepFrame(dir) {
	const video = getVideoElement();
	const ytFrame = getYtIframe();
	const step = 1 / 30;

	if (video) {
		video.currentTime = Math.max(0, video.currentTime + dir * step);
		updateTimeDisplay();
	} else if (ytFrame) {
		const slider = document.getElementById('time-slider');
		if (slider) {
			const newTime = Math.max(0, parseFloat(slider.value) + dir * step);
			seekVideo(newTime);
		}
	}
}

function hideVideoPlayer() {
	const player = document.getElementById('video-player');
	if (player) { player.innerHTML = ''; player.classList.remove('visible'); }
}

function showVideoPlayer() {
	const player = document.getElementById('video-player');
	if (player) player.classList.add('visible');
	if (window.openSection) window.openSection('section-video');
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
	const playerEl = document.getElementById('video-player');
	playerEl.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&playsinline=1" frameborder="0" allow="autoplay" style="width:100%;height:100%;"></iframe>`;
	showVideoPlayer();

	const slider = document.getElementById('time-slider');
	const timeDisp = document.getElementById('time-display');
	if (slider) { slider.max = 600; slider.value = 0; slider.style.display = ''; }
	if (timeDisp) timeDisp.textContent = '0:00 / --:--';
	updatePlayIcon(true);

	toast('YouTube видео загружено', 'success');
}

export function loadRutube(url) {
	const match = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)/);
	if (!match) return toast('Неверная ссылка Rutube', 'error');

	rtId = match[1];
	const playerEl = document.getElementById('video-player');
	playerEl.innerHTML = `<iframe src="https://rutube.ru/play/embed/${rtId}" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>`;
	showVideoPlayer();

	const slider = document.getElementById('time-slider');
	const timeDisp = document.getElementById('time-display');
	if (slider) slider.style.display = 'none';
	if (timeDisp) timeDisp.textContent = '⚠ Захват кадра недоступен';

	toast('Rutube видео загружено', 'success');
}

export function loadMp4Url(url) {
	const playerEl = document.getElementById('video-player');
	playerEl.innerHTML = '<video id="player" crossorigin="anonymous"></video>';

	const player = document.getElementById('player');
	player.src = url;
	player.addEventListener('loadedmetadata', () => {
		playerDuration = player.duration;
		const slider = document.getElementById('time-slider');
		if (slider) { slider.max = playerDuration; slider.value = 0; slider.style.display = ''; }
		updateTimeDisplay();
		updatePlayIcon(true);
	});
	player.addEventListener('timeupdate', updateTimeDisplay);
	player.addEventListener('play', () => updatePlayIcon(true));
	player.addEventListener('pause', () => updatePlayIcon(false));
	player.addEventListener('ended', () => updatePlayIcon(false));
	player.addEventListener('error', () => toast('Ошибка загрузки видео', 'error'));

	showVideoPlayer();

	toast('Видео загружается...', 'info');
}

export function handleFile(file) {
	if (!file || !file.type.startsWith('video/')) return toast('Выберите видеофайл', 'error');

	document.getElementById('file-info').textContent = `📎 ${file.name} (${(file.size/1024/1024).toFixed(1)} MB)`;

	const playerEl = document.getElementById('video-player');
	playerEl.innerHTML = '<video id="player" crossorigin="anonymous"></video>';

	const player = document.getElementById('player');
	player.src = URL.createObjectURL(file);
	player.addEventListener('loadedmetadata', () => {
		playerDuration = player.duration;
		const slider = document.getElementById('time-slider');
		if (slider) { slider.max = playerDuration; slider.value = 0; slider.style.display = ''; }
		updateTimeDisplay();
		updatePlayIcon(true);
	});
	player.addEventListener('timeupdate', updateTimeDisplay);
	player.addEventListener('play', () => updatePlayIcon(true));
	player.addEventListener('pause', () => updatePlayIcon(false));
	player.addEventListener('ended', () => updatePlayIcon(false));
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

function setPresetFromVideo(w, h) {
	state.preset = { name: `${w}×${h}`, width: w, height: h };
	resizeCanvas();
}

function capture() {
	const player = document.getElementById('player');

	if (srcType === 'file' && player && player.videoWidth) {
		const cvs = document.createElement('canvas');
		cvs.width = player.videoWidth;
		cvs.height = player.videoHeight;
		cvs.getContext('2d').drawImage(player, 0, 0);

		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			setPresetFromVideo(cvs.width, cvs.height);
			addImageLayer(img, 'Кадр');
			toast('Кадр захвачен! ' + cvs.width + '×' + cvs.height, 'success');
		};
		img.src = cvs.toDataURL();
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
				setPresetFromVideo(img.naturalWidth, img.naturalHeight);
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

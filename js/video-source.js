import { state } from './state.js';
import { toast } from './utils.js';

const player = () => document.getElementById('player');
const videoWrapper = () => document.getElementById('video-wrapper');
const playerBar = () => document.getElementById('player-bar');

let currentSource = null;

export function initVideoSource() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.src));
  });

  document.getElementById('btn-load').addEventListener('click', loadSource);
  document.getElementById('source-url').addEventListener('input', onUrlInput);
  document.getElementById('file-input').addEventListener('change', e => handleFile(e.target.files[0]));

  const dropzone = document.getElementById('dropzone');
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  const p = player();
  if (!p) { console.error('Элемент #player не найден'); return; }
  p.addEventListener('timeupdate', onTimeUpdate);
  p.addEventListener('play', () => updatePlayBtn());
  p.addEventListener('pause', () => updatePlayBtn());
  p.addEventListener('loadedmetadata', () => {
    const seek = document.getElementById('player-seek');
    if (seek) seek.max = p.duration;
    onTimeUpdate();
  });

  const btnPlay = document.getElementById('btn-play');
  const btnRw = document.getElementById('btn-rw');
  const btnFf = document.getElementById('btn-ff');
  const btnMute = document.getElementById('btn-mute');
  const playerSeek = document.getElementById('player-seek');

  if (btnPlay) btnPlay.addEventListener('click', togglePlay);
  if (btnRw) btnRw.addEventListener('click', () => skip(-10));
  if (btnFf) btnFf.addEventListener('click', () => skip(10));
  if (btnMute) btnMute.addEventListener('click', toggleMute);
  if (playerSeek) playerSeek.addEventListener('input', e => {
    player().currentTime = parseFloat(e.target.value);
  });
}

function switchTab(type) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.src === type));
  document.querySelectorAll('.input-group').forEach(g => g.classList.remove('active'));

  if (type === 'file') {
    document.getElementById('src-file').classList.add('active');
  } else {
    document.getElementById('src-auto').classList.add('active');
  }

  videoWrapper().classList.remove('visible');
  videoWrapper().innerHTML = '<video id="player" autoplay muted playsinline crossorigin="anonymous"></video>';
  document.getElementById('canvas-container').style.display = '';
  playerBar().style.display = 'none';
  currentSource = null;
}

function onUrlInput() {
  const url = document.getElementById('source-url').value.trim();
  document.getElementById('btn-load').disabled = !url;
}

function loadSource() {
  const url = document.getElementById('source-url').value.trim();
  if (!url) return;

  const type = detectSourceType(url);
  if (type === 'youtube') loadYouTube(url);
  else if (type === 'rutube') loadRutube(url);
  else if (type === 'direct') loadMp4Url(url);
  else toast('Не удалось определить тип ссылки', 'warning');
}

function detectSourceType(url) {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/rutube\.ru/.test(url)) return 'rutube';
  if (/\.(mp4|webm|ogg|mov)$/i.test(url)) return 'direct';
  return null;
}

function loadYouTube(url) {
  let id = '';
  const m1 = url.match(/[?&]v=([^&]+)/);
  const m2 = url.match(/youtu\.be\/([^?&]+)/);
  id = m1 ? m1[1] : m2 ? m2[1] : '';
  if (!id) { toast('Не удалось извлечь ID YouTube', 'warning'); return; }

  currentSource = 'youtube';
  videoWrapper().innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?rel=0&controls=0&modestbranding=1&autoplay=1" frameborder="0" allowfullscreen style="width:100%;height:100%;border:none"></iframe>`;
  videoWrapper().classList.add('visible');
  document.getElementById('canvas-container').style.display = 'none';
  playerBar().style.display = 'none';
  toast('YouTube загружен');
}

function loadRutube(url) {
  const m = url.match(/rutube\.ru\/video\/([^/?&]+)/);
  if (!m) { toast('Не удалось извлечь ID Rutube', 'warning'); return; }

  currentSource = 'rutube';
  videoWrapper().innerHTML = `<iframe src="https://rutube.ru/play/embed/${m[1]}" frameborder="0" allowfullscreen style="width:100%;height:100%;border:none"></iframe>`;
  videoWrapper().classList.add('visible');
  document.getElementById('canvas-container').style.display = 'none';
  playerBar().style.display = 'none';
  toast('Rutube загружен (CORS может ограничить захват)', 'warning');
}

function loadMp4Url(url) {
  currentSource = 'mp4';
  const p = player();
  p.src = url;
  p.play().catch(() => {});
  videoWrapper().classList.add('visible');
  document.getElementById('canvas-container').style.display = 'none';
  playerBar().style.display = 'flex';
  updatePlayBtn();
}

function handleFile(file) {
  if (!file || !file.type.startsWith('video/')) {
    toast('Это не видеофайл', 'warning');
    return;
  }
  currentSource = 'file';
  const p = player();
  p.src = URL.createObjectURL(file);
  p.play().catch(() => {});
  videoWrapper().classList.add('visible');
  document.getElementById('canvas-container').style.display = 'none';
  playerBar().style.display = 'flex';
  updatePlayBtn();
  const size = (file.size / 1024 / 1024).toFixed(1);
  toast(`Загружено: ${file.name} (${size} МБ)`);
}

function togglePlay() {
  const p = player();
  if (p.paused) p.play().catch(() => {});
  else p.pause();
}

function updatePlayBtn() {
  const p = player();
  const btn = document.getElementById('btn-play');
  btn.textContent = p.paused ? '▶' : '⏸';
}

function skip(seconds) {
  const p = player();
  if (!p.duration) return;
  p.currentTime = Math.max(0, Math.min(p.duration, p.currentTime + seconds));
}

function toggleMute() {
  const p = player();
  p.muted = !p.muted;
  document.getElementById('btn-mute').textContent = p.muted ? '🔇' : '🔊';
  toast(p.muted ? '🔇 Звук выключен' : '🔊 Звук включён', 'info');
}

function onTimeUpdate() {
  const p = player();
  if (!p.duration) return;
  document.getElementById('player-time').textContent = `${fmtTime(p.currentTime)} / ${fmtTime(p.duration)}`;
  const seek = document.getElementById('player-seek');
  if (document.activeElement !== seek) {
    seek.value = p.currentTime;
  }
}

function fmtTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getCurrentSource() { return currentSource; }
export function getPlayer() { return player(); }

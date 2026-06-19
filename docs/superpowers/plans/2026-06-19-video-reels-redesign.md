# Video Reels Preview — Полный редизайн: План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перестроить Video Reels Preview из монолитного HTML в модульный canvas-редактор обложек с инструментами, слоями, фильтрами, undo/redo, пресетами размеров и шаблонами.

**Architecture:** ES modules без сборки. Один index.html作为 точка входа, js/*.js — модули, css/style.css — стили. Canvas 2D для редактора. Все данные — в памяти браузера, шаблоны в localStorage.

**Tech Stack:** Vanilla JS (ES modules), HTML Canvas 2D, CSS custom properties, localStorage, Clipboard API.

---

## Файловая структура (итоговая)

```
video-reels-preview/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── video-source.js
│   ├── frame-capture.js
│   ├── editor.js
│   ├── tools.js
│   ├── layers.js
│   ├── filters.js
│   ├── history.js
│   ├── presets.js
│   ├── templates.js
│   └── export.js
└── docs/
```

---

## Task 1: Структура проекта и CSS

**Files:**
- Create: `index.html` (новый)
- Create: `css/style.css`

- [ ] **Step 1: Создать index.html с базовой структурой**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Reels Preview</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="topbar">
    <a href="#" class="logo">Video <span>Reels Preview</span></a>
    <div class="topbar-actions">
      <button class="btn btn-sm" id="btn-undo" disabled title="Отменить (Ctrl+Z)">↩</button>
      <button class="btn btn-sm" id="btn-redo" disabled title="Повторить (Ctrl+Shift+Z)">↪</button>
      <button class="btn btn-primary btn-sm" id="btn-export">⬇ Экспорт</button>
    </div>
  </header>

  <main class="app">
    <!-- Левая панель: инструменты -->
    <aside class="panel panel-left" id="panel-left">
      <div class="panel-section">
        <div class="panel-title">Источник</div>
        <div class="source-tabs">
          <button class="tab active" data-src="auto">🔍 Авто</button>
          <button class="tab" data-src="youtube">▶ YT</button>
          <button class="tab" data-src="rutube">▶ RT</button>
          <button class="tab" data-src="file">▶ MP4</button>
        </div>
        <div class="source-input" id="source-input">
          <input type="text" class="input-field" id="source-url" placeholder="Вставьте ссылку...">
          <button class="btn btn-primary" id="btn-load" disabled>Загрузить</button>
        </div>
        <div class="drop-zone" id="dropzone">
          <p>Перетащите файл или нажмите</p>
          <input type="file" id="file-input" accept="video/*">
        </div>
      </div>

      <div class="panel-section" id="video-controls" style="display:none">
        <div class="panel-title">Видео</div>
        <div class="time-control">
          <span class="time-label" id="time-display">0:00 / 0:00</span>
          <input type="range" id="time-slider" min="0" max="100" value="0" step="0.1">
        </div>
        <select class="format-select" id="fmt">
          <option value="png">PNG</option>
          <option value="jpeg">JPEG 90%</option>
          <option value="webp">WebP</option>
        </select>
        <button class="btn btn-primary" id="btn-capture">📸 Снять кадр</button>
      </div>

      <div class="panel-section">
        <div class="panel-title">Инструменты</div>
        <div class="tool-grid">
          <button class="tool-btn active" data-tool="select" title="Выделение (V)">↖</button>
          <button class="tool-btn" data-tool="text" title="Текст (T)">T</button>
          <button class="tool-btn" data-tool="rect" title="Прямоугольник (R)">▭</button>
          <button class="tool-btn" data-tool="circle" title="Круг (C)">○</button>
          <button class="tool-btn" data-tool="arrow" title="Стрелка (A)">→</button>
          <button class="tool-btn" data-tool="line" title="Линия (L)">╱</button>
        </div>
      </div>

      <div class="panel-section" id="props-panel" style="display:none">
        <div class="panel-title">Свойства</div>
        <div id="props-content"></div>
      </div>

      <div class="panel-section" id="filters-panel" style="display:none">
        <div class="panel-title">Фильтры</div>
        <div id="filters-content"></div>
        <button class="btn btn-sm" id="btn-reset-filters">Сбросить</button>
      </div>

      <div class="panel-section">
        <div class="panel-title">Пресеты</div>
        <select class="input-field" id="preset-select">
          <option value="shorts">YouTube Shorts (9:16)</option>
          <option value="square">Instagram (1:1)</option>
          <option value="youtube">YouTube (16:9)</option>
          <option value="custom">Кастомный...</option>
        </select>
        <div id="custom-size" style="display:none">
          <input type="number" id="custom-w" placeholder="Ширина" class="input-field input-sm">
          <span>×</span>
          <input type="number" id="custom-h" placeholder="Высота" class="input-field input-sm">
          <button class="btn btn-sm" id="btn-apply-size">OK</button>
        </div>
      </div>
    </aside>

    <!-- Центр: холст -->
    <div class="canvas-area" id="canvas-area">
      <div class="video-wrapper" id="video-wrapper" style="display:none">
        <video id="player" controls crossorigin="anonymous"></video>
      </div>
      <div class="canvas-container" id="canvas-container">
        <canvas id="editor-canvas"></canvas>
        <div class="zoom-badge" id="zoom-badge">100%</div>
      </div>
    </div>

    <!-- Правая панель: слои -->
    <aside class="panel panel-right" id="panel-right">
      <div class="panel-section">
        <div class="panel-title">Слои</div>
        <div class="layer-actions">
          <button class="btn btn-sm" id="btn-add-layer">+ Добавить</button>
          <button class="btn btn-sm" id="btn-dup-layer">📋 Duplicate</button>
          <button class="btn btn-sm btn-danger" id="btn-del-layer">🗑</button>
        </div>
        <div class="layer-list" id="layer-list"></div>
      </div>

      <div class="panel-section">
        <div class="panel-title">Шаблоны</div>
        <select class="input-field" id="template-select">
          <option value="">— Выберите шаблон —</option>
        </select>
        <div class="template-actions">
          <button class="btn btn-sm" id="btn-save-template">💾 Сохранить</button>
          <button class="btn btn-sm btn-danger" id="btn-del-template">🗑</button>
        </div>
      </div>
    </aside>
  </main>

  <div class="toast-container" id="toasts"></div>
  <div class="preview-overlay" id="preview-overlay">
    <button class="preview-close" id="preview-close">✕</button>
    <img id="preview-img" alt="Предпросмотр">
    <span class="preview-info" id="preview-info"></span>
  </div>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Создать css/style.css**

Создать `css/style.css` с CSS-переменными, базовым reset, стилями для: topbar, panel-left/panel-right, canvas-area, tool-grid, layer-list, source-tabs, drop-zone, time-control, toast, preview-overlay, responsive breakpoints. Стили должны покрывать всю разметку из Step 1.

- [ ] **Step 3: Проверить что index.html открывается и отображает layout**

Открыть `index.html` в браузере. Убедиться что: header виден, 3 колонки (лево/центр/право), пустой canvas в центре, все кнопки кликабельны.

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: project structure and CSS layout"
```

---

## Task 2: state.js — Центральное хранилище

**Files:**
- Create: `js/state.js`

- [ ] **Step 1: Создать модуль state.js**

```js
// js/state.js — центральное хранилище состояния

export const PRESETS = {
  shorts:  { name: 'YouTube Shorts', width: 1080, height: 1920 },
  square:  { name: 'Instagram',      width: 1080, height: 1080 },
  youtube: { name: 'YouTube',        width: 1280, height: 720 },
};

export const state = {
  preset: { ...PRESETS.shorts },
  layers: [],
  filters: {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    blur: 0,
    sepia: 0,
    grayscale: 0,
    invert: 0,
  },
  background: '#000000',
  selectedId: null,
  activeTool: 'select',
  zoom: 1,
  panX: 0,
  panY: 0,
};

let _idCounter = 0;
export function genId() { return `layer-${++_idCounter}`; }

export function getLayerById(id) {
  return state.layers.find(l => l.id === id);
}

export function getSelectedLayer() {
  return state.selectedId ? getLayerById(state.selectedId) : null;
}

export function cloneState() {
  return JSON.parse(JSON.stringify({
    layers: state.layers,
    filters: state.filters,
    preset: state.preset,
    background: state.background,
  }));
}

export function restoreState(snap) {
  state.layers = snap.layers;
  state.filters = snap.filters;
  state.preset = snap.preset;
  state.background = snap.background;
  state.selectedId = null;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/state.js
git commit -m "feat: add central state module"
```

---

## Task 3: editor.js — Canvas, рендер, зум, пан

**Files:**
- Create: `js/editor.js`

- [ ] **Step 1: Создать модуль editor.js**

Модуль содержит:
- `initEditor()` — привязка canvas, вычисление DPR, resize observer
- `render()` — основной рендер-цикл (фон → слои → выделение)
- `renderLayer(ctx, layer)` — рендер одного слоя (image/text/rect/circle/arrow/line)
- `screenToCanvas(x, y)` — конвертация экранных координат в координаты холста (с учётом zoom/pan)
- `canvasToScreen(x, y)` — обратная конвертация
- Zoom через Ctrl+wheel
- Pan через mousedown+move при zoom > 1
- Resize observer для адаптации canvas к контейнеру

- [ ] **Step 2: Привязать editor к app.js**

В `js/app.js`:
```js
import { state } from './state.js';
import { initEditor, render } from './editor.js';

initEditor();
render();
```

- [ ] **Step 3: Проверить что canvas рендерит фон и размер подстраивается**

Открыть в браузере. Canvas должен отображать чёрный прямоугольник (1080×1920 в CSS пикселях), масштабированный под контейнер. При изменении размера окна — canvas подстраивается.

- [ ] **Step 4: Commit**

```bash
git add js/editor.js js/app.js
git commit -m "feat: add editor canvas with render loop, zoom, pan"
```

---

## Task 4: tools.js — Инструменты выделения и создания объектов

**Files:**
- Create: `js/tools.js`

- [ ] **Step 1: Создать модуль tools.js**

Модуль содержит:
- `initTools()` — привязка кликов по tool-grid, привяжет клавиши V/T/R/C/A/L
- Hit-test: `hitTest(x, y)` — определение слоя под курсором (сверху вниз)
- Select tool: клик → selectedId, drag → перемещение, resize-хэндлы
- Text tool: клик → создание text-слоя, double-click → contenteditable overlay
- Shape tools: mousedown → start, mousemove → preview, mouseup → finalize
- `createTextLayer(x, y)` — создаёт text-слой с дефолтными свойствами
- `createShapeLayer(type, x, y, w, h)` — rect/circle/arrow/line

- [ ] **Step 2: Привязать tools к app.js**

В `js/app.js` добавить импорт и вызов `initTools()`.

- [ ] **Step 3: Проверить что можно создавать и перемещать объекты**

Открыть в браузере. Клик по canvas в режиме «Текст» → появляется текстовый блок. Клик по canvas в режиме «Прямоугольник» → тянется прямоугольник. Переключение на «Выделение» → клик выбирает объект, drag перемещает.

- [ ] **Step 4: Commit**

```bash
git add js/tools.js js/app.js
git commit -m "feat: add tools — select, text, shapes"
```

---

## Task 5: layers.js — Менеджер слоёв

**Files:**
- Create: `js/layers.js`

- [ ] **Step 1: Создать модуль layers.js**

Модуль содержит:
- `initLayers()` — привязка кнопок add/dup/del, привязка drag-and-drop в layer-list
- `addLayer(type, data)` — добавление слоя в state.layers
- `removeLayer(id)` — удаление слоя
- `duplicateLayer(id)` — дублирование слоя
- `moveLayer(fromIdx, toIdx)` — перемещение в порядке
- `toggleVisibility(id)` — toggle visible
- `toggleLock(id)` — toggle locked
- `updateLayerList()` — перерисовка UI-списка слоёв

- [ ] **Step 2: Привязать layers к app.js**

- [ ] **Step 3: Проверить что слои добавляются/удаляются/перетаскиваются**

Создать 3 слоя через инструменты. Проверить: reorder через drag, toggle видимости (глазок), toggle блокировки (замок), duplicate, delete.

- [ ] **Step 4: Commit**

```bash
git add js/layers.js js/app.js
git commit -m "feat: add layer management panel"
```

---

## Task 6: filters.js — Фильтры изображения

**Files:**
- Create: `js/filters.js`

- [ ] **Step 1: Создать модуль filters.js**

Модуль содержит:
- `initFilters()` — создание слайдеров для каждого фильтра, привязка к state.filters
- `getFilterString()` — возвращает строку для `ctx.filter` (например `"brightness(1.2) contrast(1.1)"`)
- `resetFilters()` — сброс к дефолтным значениям
- Слайдеры: яркость (0–200), контраст (0–200), насыщенность (0–200), размытие (0–20), сепия (0–100), ч/б (0–100), инверсия (0–100)

- [ ] **Step 2: Применить фильтры в editor.js при рендере image-слоя**

В `renderLayer()` для image-слоя: `ctx.filter = getFilterString()` перед drawImage, сбросить после.

- [ ] **Step 3: Привязать filters к app.js**

- [ ] **Step 4: Проверить что слайдеры применяют фильтры к изображению**

Загрузить изображение (или сгенерировать тестовое), подвигать слайдеры — фильтры применяются в реальном времени.

- [ ] **Step 5: Commit**

```bash
git add js/filters.js js/editor.js js/app.js
git commit -m "feat: add image filters with real-time preview"
```

---

## Task 7: history.js — Undo/Redo

**Files:**
- Create: `js/history.js`

- [ ] **Step 1: Создать модуль history.js**

```js
// js/history.js
import { state, cloneState, restoreState } from './state.js';

const MAX_STEPS = 50;
let undoStack = [];
let redoStack = [];
let _skipNext = false;

export function saveSnapshot() {
  if (_skipNext) { _skipNext = false; return; }
  undoStack.push(cloneState());
  if (undoStack.length > MAX_STEPS) undoStack.shift();
  redoStack = [];
  updateButtons();
}

export function undo() {
  if (!undoStack.length) return;
  redoStack.push(cloneState());
  restoreState(undoStack.pop());
  updateButtons();
  return true;
}

export function redo() {
  if (!redoStack.length) return;
  undoStack.push(cloneState());
  restoreState(redoStack.pop());
  updateButtons();
  return true;
}

export function skipNext() { _skipNext = true; }

function updateButtons() {
  document.getElementById('btn-undo').disabled = !undoStack.length;
  document.getElementById('btn-redo').disabled = !redoStack.length;
}

export function initHistory() {
  document.getElementById('btn-undo').addEventListener('click', () => {
    if (undo()) renderCallback?.();
  });
  document.getElementById('btn-redo').addEventListener('click', () => {
    if (redo()) renderCallback?.();
  });
}

let renderCallback = null;
export function setRenderCallback(fn) { renderCallback = fn; }
```

- [ ] **Step 2: Вызывать saveSnapshot() при ключевых действиях**

В tools.js: после завершения drag, после создания слоя, после изменения свойств.
В layers.js: после add/remove/duplicate/move.
В filters.js: при изменении фильтра.

- [ ] **Step 3: Привязать Ctrl+Z / Ctrl+Shift+Z**

В app.js: `document.addEventListener('keydown', ...)` → если Ctrl+Z → undo(), если Ctrl+Shift+Z → redo().

- [ ] **Step 4: Проверить что undo/redo работает**

Создать объект → переместить → Ctrl+Z → вернулся → Ctrl+Shift+Z → снова перемещён.

- [ ] **Step 5: Commit**

```bash
git add js/history.js js/tools.js js/layers.js js/filters.js js/app.js
git commit -m "feat: add undo/redo with history stack"
```

---

## Task 8: presets.js — Пресеты размеров

**Files:**
- Create: `js/presets.js`

- [ ] **Step 1: Создать модуль presets.js**

Модуль содержит:
- `initPresets()` — привязка select#preset-select, обработка custom-size
- `applyPreset(key)` — установка state.preset, пересчёт canvas, перерисовка
- При кастомном размере: показ полей width/height, валидация (min 100, max 4096)

- [ ] **Step 2: Привязать presets к app.js**

- [ ] **Step 3: Проверить переключение пресетов**

Переключить YouTube Shorts → Instagram → YouTube → Кастомный. Canvas должен менять пропорции.

- [ ] **Step 4: Commit**

```bash
git add js/presets.js js/app.js
git commit -m "feat: add preset sizes with custom option"
```

---

## Task 9: templates.js — Шаблоны

**Files:**
- Create: `js/templates.js`

- [ ] **Step 1: Создать модуль templates.js**

Модуль содержит:
- `initTemplates()` — привязка кнопок save/load/delete, загрузка списка из localStorage
- `saveTemplate(name)` — сохраняет cloneState() в localStorage
- `loadTemplate(id)` — restoreState() из localStorage
- `deleteTemplate(id)` — удаление из localStorage
- `exportTemplate(id)` — скачивание JSON
- `importTemplate(json)` — загрузка JSON
- Макс 20 шаблонов, ключ `vrp-templates`

- [ ] **Step 2: Привязать templates к app.js**

- [ ] **Step 3: Проверить сохранение/загрузку шаблона**

Создать макет → «Сохранить шаблон» → ввести имя → перезагрузить страницу → выбрать шаблон из dropdown → макет восстанавливается.

- [ ] **Step 4: Commit**

```bash
git add js/templates.js js/app.js
git commit -m "feat: add template save/load via localStorage"
```

---

## Task 10: export.js — Экспорт

**Files:**
- Create: `js/export.js`

- [ ] **Step 1: Создать модуль export.js**

Модуль содержит:
- `initExport()` — привязка кнопок export, preview, clipboard
- `exportImage(fmt)` — offscreen canvas → toBlob → download
- `copyToClipboard()` — toBlob('image/png') → ClipboardItem
- `openPreview()` — offscreen canvas → toBlob → показ в overlay

- [ ] **Step 2: Привязать export к app.js**

- [ ] **Step 3: Проверить экспорт в三种 формата**

Создать макет → «Скачать» → проверить PNG/JPEG/WebP. «Копировать» → вставить в другой документ. «Предпросмотр» → fullscreen overlay.

- [ ] **Step 4: Commit**

```bash
git add js/export.js js/app.js
git commit -m "feat: add export to PNG/JPEG/WebP and clipboard"
```

---

## Task 11: video-source.js и frame-capture.js — Источник видео

**Files:**
- Create: `js/video-source.js`
- Create: `js/frame-capture.js`

- [ ] **Step 1: Создать video-source.js**

Модуль содержит:
- `initVideoSource()` — привязка табов, input, dropzone, file input
- `loadYouTube(url)` — embed iframe
- `loadRutube(url)` — embed iframe
- `loadMp4Url(url)` — video.src = url
- `handleFile(file)` — URL.createObjectURL
- `detectSourceType(url)` — автодетект
- Видео-контролы: play/pause, seek, time display

- [ ] **Step 2: Создать frame-capture.js**

Модуль содержит:
- `captureFrame()` — захват кадра: video→canvas (для MP4) или img.youtube.com (для YouTube)
- YouTube fallback: maxresdefault → sddefault → hqdefault → mqdefault → default
- Результат: image-слой добавляется в state.layers

- [ ] **Step 3: Интегрировать с app.js**

После захвата кадра: автоматически создать image-слой, скрыть видео-плеер, показать canvas.

- [ ] **Step 4: Проверить полный flow**

YouTube: вставить ссылку → embed → «Снять кадр» → image-слой появляется в редакторе.
MP4: загрузить файл → плеер → выбрать момент → «Снять кадр» → image-слой.

- [ ] **Step 5: Commit**

```bash
git add js/video-source.js js/frame-capture.js js/app.js
git commit -m "feat: add video source loading and frame capture"
```

---

## Task 12: Мобильная версия

**Files:**
- Modify: `css/style.css`
- Modify: `index.html`
- Modify: `js/app.js`

- [ ] **Step 1: Добавить CSS media queries для мобильных**

```css
@media (max-width: 768px) {
  .app { grid-template-columns: 1fr; }
  .panel-left, .panel-right { display: none; }
  .panel-left.mobile-open, .panel-right.mobile-open {
    display: flex;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    max-height: 50vh;
    overflow-y: auto;
    z-index: 100;
  }
  .mobile-bottom-bar {
    display: flex;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: var(--bg-page);
    border-top: 1px solid var(--border);
    z-index: 90;
  }
  .mobile-bottom-bar .tab { flex: 1; text-align: center; padding: 12px; }
}
```

- [ ] **Step 2: Добавить mobile-bottom-bar в index.html**

Нижняя панель с вкладками: Инструменты | Свойства | Слои | Фильтры | Ещё.

- [ ] **Step 3: Добавить touch-жесты в editor.js**

- Pinch-to-zoom: отслеживание двух пальцев через touchstart/touchmove/touchend
- Drag-to-pan при zoom > 1
- Tap → hit-test → выбор объекта

- [ ] **Step 4: Проверить на мобильном размере**

Уменьшить окно браузера до < 768px. Убедиться что: bottom bar виден, панели открываются как overlay, canvas адаптируется.

- [ ] **Step 5: Commit**

```bash
git add css/style.css index.html js/editor.js js/app.js
git commit -m "feat: add mobile responsive layout with bottom bar"
```

---

## Task 13: Горячие клавиши и финальная интеграция

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Добавить глобальный keydown handler**

```
V → select, T → text, R → rect, C → circle, A → arrow, L → line
Ctrl+Z → undo, Ctrl+Shift+Z → redo
Delete → удалить selected layer
Ctrl+D → duplicate selected
Escape → снять выделение / закрыть preview
Ctrl+E → экспорт
```

- [ ] **Step 2: Финальная проверка всех flow**

Полный цикл: загрузить видео → захват кадра → выбрать пресет → добавить текст → добавить прямоугольник → применить фильтры → reorder слоёв → Ctrl+Z → Ctrl+Shift+Z → сохранить шаблон → экспорт → preview.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: add keyboard shortcuts and final integration"
```

---

## Task 14: Очистка и деплой

**Files:**
- Delete: старый `index.html` (монолитный)
- Modify: `README.md`

- [ ] **Step 1: Удалить старый монолитный index.html**

Старый файл заменён новой modular структурой.

- [ ] **Step 2: Обновить README.md**

Описать новую структуру, возможности, горячие клавиши.

- [ ] **Step 3: Push и проверка GitHub Pages**

```bash
git push
```

Проверить https://tom-opencart.github.io/video-reels-preview/

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README for redesigned tool"
```

# Video Reels Preview — Полный редизайн

## Краткое описание

Мини-редактор обложек для видео. Захват кадра из YouTube/Rutube/MP4 → редактирование на canvas (текст, фигуры, фильтры, слои) → экспорт в PNG/JPEG/WebP. Всё локально в браузере, без сервера. Статика на GitHub Pages.

## Текущее состояние

- Один `index.html` (~1200 строк), чистый HTML/CSS/JS
- Захват кадра из видео (YouTube через превью-картинку, MP4 через video→canvas)
- Текстовые оверлеи ( drag, resize, цвет, фон, шрифт)
- Зум/пан, экспорт, копирование в буфер
- Нет мобильной версии, нет слоёв, нет undo/redo, нет фильтров

## Цели редизайна

1. Полноценный canvas-редактор с инструментами
2. Слои (текст, фигуры, изображение кадра)
3. Фильтры изображения
4. Undo/Redo
5. Пресеты размеров (9:16, 1:1, 16:9, кастомный)
6. Шаблоны (сохранение/загрузка через localStorage)
7. Мобильная версия
8. Чистый, модульный код (ES modules)

## Структура файлов

```
video-reels-preview/
├── index.html              ← точка входа, минимум разметки
├── css/
│   └── style.css           ← стили, CSS-переменные, адаптив
├── js/
│   ├── app.js              ← инициализация, привязка событий, основной цикл
│   ├── video-source.js     ← YouTube/Rutube/MP4/file загрузка
│   ├── frame-capture.js    ← захват кадра в canvas (imageData)
│   ├── editor.js           ← основной canvas, рендер-цикл, зум/пан, hit-test
│   ├── tools.js            ← ToolManager: выделение, текст, прямоугольник, круг, стрелка, линия
│   ├── layers.js           ← LayerStack: CRUD слоёв, порядок, видимость, блокировка
│   ├── filters.js          ← FilterEngine: яркость, контраст, насыщенность, сепия, ч/б
│   ├── history.js          ← HistoryManager: undo/redo через стек состояний
│   ├── presets.js          ← PresetManager: пресеты размеров + кастомный
│   ├── templates.js        ← TemplateStore: сохранение/загрузка шаблонов (localStorage)
│   └── export.js           ← ExportEngine: PNG/JPEG/WebP + clipboard
└── README.md
```

Все JS-модули — ES modules (`type="module"` в script-теге). Работает на GitHub Pages без сборки.

## Архитектура редактора

### Модель данных

```js
// Состояние проекта
{
  preset: { name: 'YouTube Shorts', width: 1080, height: 1920 },
  layers: [
    {
      id: 'layer-1',
      type: 'image',           // image | text | rect | circle | arrow | line
      visible: true,
      locked: false,
      x: 0, y: 0,
      width: 1080, height: 1920,
      // Тип-специфичные данные:
      // image: { src (dataURL) }
      // text: { content, fontSize, fontFamily, color, bgColor, bgOpacity, bold, italic, shadow, stroke }
      // rect: { fill, stroke, strokeWidth, borderRadius }
      // circle: { fill, stroke, strokeWidth }
      // arrow: { x2, y2, color, strokeWidth, headSize }
      // line: { x2, y2, color, strokeWidth }
    }
  ],
  filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0, sepia: 0, grayscale: 0, invert: 0 },
  background: '#000000'
}
```

### Рендер-цикл

```
1. Очистить canvas
2. Нарисовать фон (цвет пресета)
3. Для каждого слоя снизу вверх:
   - Если type === 'image': нарисовать с учётом фильтров (ctx.filter)
   - Если type === 'text': нарисовать текст с фоном/тенью
   - Если type === 'rect': fillRect + strokeRect
   - Если type === 'circle': arc + fill + stroke
   - Если type === 'arrow'/'line': lineTo + stroke + arrowhead
4. Нарисовать выделение (рамка + resize-хэндлы) для активного слоя
5. Обновить UI-панели (свойства активного слоя)
```

### Зум и пан

- Ctrl+колёсико → зум (0.25x – 5x), центр — курсор мыши
- Зажатый mouse при зуме > 1 → пан (scrollLeft/scrollTop)
- На мобильном: pinch-to-zoom (два пальца), drag-to-pan (один палец при зуме)
- Double-click → сброс зума в 1x
- Zoom badge (indicator) показывает текущий уровень

### Интеракция с объектами

1. **Hit-test**: при клике по canvas — перебираем слои сверху вниз, проверяем попадание точки в bounding box (с учётом зума)
2. **Выделение**: клик по объекту → selectedId = его id, показать хэндлы
3. **Drag**: зажатый mouse на выделенном объекте → перемещение (с учётом зума)
4. **Resize**: зажатый mouse на хэндле → изменение размера (proportional для текста, free для фигур)
5. **Double-click по тексту**: вход в режим редактирования (contenteditable overlay поверх canvas)
6. **Escape**: выход из редактирования / снятие выделения

## Инструменты

| Инструмент | Поведение |
|------------|-----------|
| **Выделение** (по умолчанию) | Клик — выбрать, drag — переместить, хэндлы — resize |
| **Текст** | Клик → создать текстовый слой, double-click → редактировать |
| **Прямоугольник** | Зажать и тянуть → рисует rect |
| **Круг** | Зажать и тянуть → рисует circle |
| **Стрелка** | Клик → начало, тянуть → конец с наконечником |
| **Линия** | Клик → начало, тянуть → конец |

### Текст (расширенный)

- Шрифт: system-ui, Inter (по умолчанию), + Google Fonts
- Размер: 12–200px (слайдер + ручной ввод)
- Цвет текста + цвет фона + прозрачность фона (0–100%)
- Жирный / Курсив (переключатели)
- Тень текста: offset-x, offset-y, blur, color
- Обводка текста: strokeWidth, strokeColor
- Multiline: Enter для переноса строки
- word-break: break-word

### Фигуры

- Прямоугольник: fill, stroke, strokeWidth, borderRadius
- Круг: fill, stroke, strokeWidth
- Стрелка: strokeWidth, color, headSize (размер наконечника)
- Линия: strokeWidth, color

Всё рисуется на canvas через.fillRect, ctx.arc, ctx.lineTo, ctx.stroke.

## Слои

### LayerStack (панель слоёв)

- Список слоёв с иконкой типа и именем
- Drag-and-drop для переупорядочивания (порядок рендера)
- Глазок — toggle видимости
- Замок — toggle блокировки (нельзя выбирать/перемещать)
- Кнопки: добавить слой (+), удалить (🗑), duplicate (📋)
- Активный слой подсвечен
- На мобильном: bottom sheet с swipe

### Порядок рендера

Слои рендерятся снизу вверх: `layers[0]` — самый нижний, `layers[layers.length-1]` — самый верхний. Hit-test идёт сверху вниз (последний слой проверяется первым).

## Фильтры

Фильтры применяются к **изображению кадра** (слой типа `image`), не ко всему canvas.

Реализация через `ctx.filter` (CSS Filter API):

| Фильтр | Диапазон | Значение по умолчанию |
|--------|----------|----------------------|
| Яркость | 0–200% | 100% |
| Контраст | 0–200% | 100% |
| Насыщенность | 0–200% | 100% |
| Размытие | 0–20px | 0px |
| Сепия | 0–100% | 0% |
| Чёрно-белое | 0–100% | 0% |
| Инверсия | 0–100% | 0% |

- Слайдеры в реальном времени (обновление canvas при каждом change)
- Кнопка «Сбросить фильтры» → все значения к дефолту

## Undo/Redo

### HistoryManager

- Стек состояний: массив снимков (deep clone объекта `state`)
- Максимум 50 шагов
- Триггеры для создания снимка:
  - Завершение drag объекта (mouseup)
  - Изменение свойств объекта (цвет, размер, текст)
  - Добавление / удаление / дублирование слоя
  - Изменение порядка слоёв
  - Применение / сброс фильтров
  - Изменение пресета размера
- Горячие клавиши: Ctrl+Z (undo), Ctrl+Shift+Z (redo)
- Кнопки в UI: «Отменить» / «Повторить»

### Оптимизация памяти

- Снимок — это массив `layers` + `filters` + `preset` (без imageData — те же dataURL)
- Глубокое клонирование через `structuredClone()` или `JSON.parse(JSON.stringify())`
- При превышении 50 шагов — удаление самых старых

## Пресеты размеров

| Пресет | Ширина | Высота | Соотношение |
|--------|--------|--------|-------------|
| YouTube Shorts / Reels | 1080 | 1920 | 9:16 |
| Instagram Post | 1080 | 1080 | 1:1 |
| YouTube Thumbnail | 1280 | 720 | 16:9 |
| Stories VK/IG | 1080 | 1920 | 9:16 |
| Кастомный | Ввод | Ввод | — |

- При выборе пресета: canvas/resizing пересчитывается
- Изображение кадра масштабируется с `object-fit: cover` (обрезка по краям)
- UI показывает текущий размер: «1080 × 1920 (9:16)»

## Шаблоны

### TemplateStore (localStorage)

- **Сохранить как шаблон**: ввод имени → сохраняет `{ name, state: { layers, filters, preset } }`
- **Загрузить шаблон**: dropdown со списком сохранённых шаблонов
- **Удалить шаблон**: кнопка рядом с каждым шаблоном в списке
- Максимум 20 шаблонов
- Экспорт шаблона: скачивание JSON-файла
- Импорт шаблона: загрузка JSON-файла

### Формат шаблона (JSON)

```json
{
  "name": "Мой шаблон",
  "version": 1,
  "createdAt": "2026-06-19T12:00:00Z",
  "state": {
    "preset": { "name": "YouTube Shorts", "width": 1080, "height": 1920 },
    "layers": [...],
    "filters": {...},
    "background": "#000000"
  }
}
```

## Экспорт

### ExportEngine

- **PNG**: без потерь, для превью высокого качества
- **JPEG 90%**: меньший размер файла
- **WebP 92%**: ещё меньший размер

### Процесс экспорта

1. Создать offscreen canvas (1:1 с размером пресета)
2. Отрисовать все слои (с фильтрами для image-слоя)
3. `canvas.toBlob(callback, mimeType, quality)`
4. Создать `<a>` с `URL.createObjectURL(blob)` → `download`
5. Имя файла: `preview_${Date.now()}.${ext}`

### Копирование в буфер

1. `canvas.toBlob(callback, 'image/png')`
2. `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`
3. Toast: «Скопировано в буфер»

## Мобильная версия (< 768px)

### Layout

- Холст на всю ширину экрана, высота — пропорциональная
- Bottom toolbar вместо боковой панели
- Top bar: название + кнопкиundo/redo + экспорт

### Bottom Toolbar (вкладки)

| Вкладка | Содержимое |
|---------|------------|
| **Инструменты** | Выделение, Текст, Прямоугольник, Круг, Стрелка, Линия |
| **Свойства** | Цвет, размер, шрифт (для активного слоя) |
| **Слои** | Список слоёв с drag-and-drop |
| **Фильтры** | Слайдеры фильтров |
| **Ещё** | Пресеты, Шаблоны, Экспорт |

### Touch-жесты

- **Tap** — выбор объекта / инструмента
- **Drag** — перемещение объекта (при инструменте «Выделение»)
- **Pinch** — zoom in/out
- **Long press** — контекстное меню (удалить, duplicate, переместить вверх/вниз)
- **Double tap по тексту** — вход в редактирование

### Адаптивный canvas

- Ширина canvas = ширина экрана - отступы
- Высота canvas = ширина × (preset.height / preset.width)
- Pinch-to-zoom работает поверх canvas

## Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `V` | Инструмент «Выделение» |
| `T` | Инструмент «Текст» |
| `R` | Инструмент «Прямоугольник» |
| `C` | Инструмент «Круг» |
| `A` | Инструмент «Стрелка» |
| `L` | Инструмент «Линия» |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` | Удалить выделенный слой |
| `Ctrl+D` | Duplicate выделенного слоя |
| `Ctrl+колёсико` | Zoom |
| `Escape` | Снять выделение / выйти из редактирования |
| `Enter` | Сохранить текст (в режиме редактирования) |
| `Пробел` | Play/Pause видео (в stage-источнике) |
| `Ctrl+E` | Экспорт |
| `Ctrl+C` (при выделении) | Копировать в буфер |

## Ограничения (без сервера)

- **YouTube/Rutube**: захват кадра только через превью-картинку (CORS), не через видео-поток
- **Нет AI**: нет генерации обложек, нет авто-раскладки
- **Нет шаринга**: только скачивание / копирование
- **Нет永久 хранения**: шаблоны в localStorage (до 20 штук)
- **Нет collaboration**: однопользовательский редактор

## Дизайн-токены (CSS-переменные)

```css
:root {
  --bg-page: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-hover: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --border: #e5e7eb;
  --border-focus: #2563eb;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-light: #eff6ff;
  --success: #059669;
  --warning-bg: #fffbeb;
  --warning-border: #fcd34d;
  --warning-text: #92400e;
  --radius: 10px;
  --radius-lg: 14px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
  --font-ui: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

Стили сохраняют текущий минималистичный дизайн, но с улучшенной адаптивностью.

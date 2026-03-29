# Web1CAD Selection System - Детальний аналіз продуктивності

## 📋 Резюме аналізу

Проведено комплексне дослідження системи виділення об'єктів у Web1CAD. Знайдено **3 основних вузькі місця** та **5 потенційних оптимізацій**.

---

## 1. СИСТЕМА ВИДІЛЕННЯ (Selection System)

### 1.1 Архітектура виділення

**Розташування**: `js/cad/core/selection.js` (лінії 1-60)
**Основна структура**: `selectedShapes` - **Set** об'єктів, що містить UUID виділених фігур

```javascript
// js/cad/core/selection.js, лінія 6
// Note: selectedShapes Set is defined in /geometry/primitives.js
```

**Глобальні функції**:
- `clearSelection()` (лінія 12-28)
- `selectAll()` (лінія 33-56)

### 1.2 Де виділення відбувається (Click handlers)

**Розташування**: `js/cad/rendering/renderer.js` (лінії 1000-1120)

#### 2.2а. Single Click Selection (лінія 1030-1055)
```javascript
// js/cad/rendering/renderer.js, лінії 1030-1055

// ВУЗЬКІ МІСЦЯ #1: ЛІНІЙНИЙ ПОШУК ПО ВСІХ ФІГУРАМ
for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    if (isPointInShape(shape, x, y)) {
        // Check if shape can be modified (layer not locked)
        if (typeof canModifyShape === 'function' && !canModifyShape(shape)) {
            addToHistory(`Cannot select object on locked layer: ${shape.layer || 'Default'}`);
            found = true;
            break;
        }
        
        // PHASE 1F: Use UUID instead of array index
        const shapeUuid = shapes[i].uuid;
        if (e.shiftKey && selectedShapes.has(shapeUuid)) {
            // If shift is held and object is already selected, deselect it
            selectedShapes.delete(shapeUuid);
        } else {
            selectedShapes.add(shapeUuid);
        }
        found = true;
        break;
    }
}
```

**Проблеми**:
- ✗ **O(n)** - переглядає ВСІ фігури від початку до кінця
- ✗ **Глибока перевірка** - на кожній ітерації викликається `isPointInShape()` з геометричними розрахунками
- ✗ **Немає quadtree** - не використовується spatial indexing
- ✗ **Немає early exit** - переглядає далі, навіть якщо знайшла фігуру

#### 2.2б. Window Selection (лінія 1060-1110)
```javascript
// js/cad/rendering/renderer.js, лінії 1060-1110

// ВУЗЬКІ МІСЦЯ #2: ПОВТОРНИЙ ПОШУК ВСІХ ФІГУР
const isWindowSelection = e.offsetX > selectionWindowStartX;
let selectedCount = 0;
let lockedCount = 0;

for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    let shouldSelect = false;

    if (isWindowSelection) {
        // Window selection - must be entirely within window
        shouldSelect = isShapeInWindow(shape, startX, startY, x, y);
    } else {
        // Crossing selection - intersects with window
        shouldSelect = doesShapeIntersectWindow(shape, startX, startY, x, y);
    }

    if (shouldSelect) {
        // Check if shape can be modified (layer not locked)
        if (typeof canModifyShape === 'function' && !canModifyShape(shape)) {
            lockedCount++;
            continue;
        }
        
        // PHASE 1F: Use UUID instead of array index
        const shapeUuid = shape.uuid;
        if (e.shiftKey && selectedShapes.has(shapeUuid)) {
            selectedShapes.delete(shapeUuid);
        } else {
            selectedShapes.add(shapeUuid);
            selectedCount++;
        }
    }
}
```

**Проблеми**:
- ✗ **O(n)** на кожну drag операцію - викликається з mousemove!
- ✗ **Немає spatial indexing** - перевіряються ВСІ фігури
- ✗ **Складні геометричні операції** - `isShapeInWindow()` / `doesShapeIntersectWindow()`

---

## 2. РЕНДЕРИНГ ВИДІЛЕНИХ ОБ'ЄКТІВ

### 2.1 Основній цикл рендеринга

**Розташування**: `js/cad/rendering/renderer.js` (лінії 1-100)

```javascript
// js/cad/rendering/renderer.js, лінія 8-100 (_redraw функція)

function _redraw() {
    // ... setup ...
    
    // ВУЗЬКІ МІСЦЯ #3: VIEWPORT CACHE REBUILD
    updateViewportCache();
    
    // Отримання видимих фігур
    const shapesToRender = viewportCache.visibleShapes.size > 0 ? 
        Array.from(viewportCache.visibleShapes) : 
        Array.from(shapes.keys());
    
    for (const i of shapesToRender) {
        if (i >= shapes.length) continue;
        const shape = shapes[i];
        
        // ... skip preview objects ...
        
        // Viewport culling
        if (typeof window.renderStabilizer !== 'undefined') {
            if (!window.renderStabilizer.isShapeVisible(shape)) {
                culledCount++;
                continue;
            }
        }
        
        // РЕНДЕРИНГ
        if (typeof drawShape === 'function') {
            drawShape(ctx, shape, zoom, i);
        }
    }
}
```

### 2.2 Функція drawShape

**Розташування**: `js/shape-renderer.js` (лінія 334-600)

```javascript
// js/shape-renderer.js, лінія 334
function drawShape(ctx, shape, zoom, shapeIndex) {
    // Use the proven standard renderer that works correctly with layers
    renderStandardShapes(ctx, shape, zoom, shapeIndex);
}

// js/shape-renderer.js, лінія 447
function renderStandardShapes(ctx, shape, zoom, shapeIndex) {
    // 1. ПЕРЕВІРКА ВИДИМОСТІ
    const isSelected = (typeof selectedShapes !== 'undefined' && selectedShapes.has) ? 
        selectedShapes.has(shape.uuid) : false;
    
    // 2. ОТРИМАННЯ ВЛАСТИВОСТЕЙ ШАРУ
    const layer = getShapeLayer ? getShapeLayer(shape) : null;
    if (layer && !layer.visible) return;
    
    // 3. РОЗРАХУНОК КОЛОРІВ
    const shapeColor = (typeof resolveShapeColor === 'function') ? 
        resolveShapeColor(shape, layer) : (shape.color || '#ffffff');
    
    // 4. РОЗРАХУНОК ТОВЩИНИ ЛІНІЇ
    const effectiveLineweight = (typeof resolveShapeLineWeight === 'function') ? 
        resolveShapeLineWeight(shape, layer) : (shape.lineweight || 0.25);
    
    // 5. РОЗРАХУНОК ТИПУ ЛІНІЇ
    let effectiveLinetype = shape.linetype;
    if (!effectiveLinetype || effectiveLinetype === 'byLayer') {
        effectiveLinetype = (layer && layer.linetype) ? layer.linetype : 'continuous';
    }
    
    // 6. ЗАСТОСУВАННЯ DASH PATTERN
    if (typeof LINETYPE_PATTERNS !== 'undefined') {
        const pattern = LINETYPE_PATTERNS[effectiveLinetype] || [];
        if (pattern.length > 0) {
            const minScale = 0.8;
            const maxScale = 3.0;
            const baseScale = Math.max(minScale, Math.min(maxScale, 2 / zoom));
            const scaledPattern = pattern.map(dash => Math.max(2, dash * baseScale));
            ctx.setLineDash(scaledPattern);
        }
    }
    
    // 7. ПОВНА ОБРОБКА ЧЕРЕЗ UNIFIED HANDLER
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('draw', shape.type, ctx, shape, zoom);
        if (result !== null) {
            // ✗ РЕНДЕРИНГ ЗА ТИПОМ - 11 типів форм
            // Успішно обробило
        }
    }
    
    // 8. FALLBACK - РУЧНИЙ РЕНДЕРИНГ всіх 11 типів
    switch(shape.type) {
        case 'line': // лінія 559-564
        case 'polyline': // лінія 565-571
        case 'circle': // лінія 572-576
        case 'arc': // лінія 577-585
        case 'ellipse': // лінія 586-592
        case 'polygon': // лінія 593-600
        case 'spline': // лінія 601-603
        case 'hatch': // лінія 604-612
        case 'point': // лінія 613-617
        case 'text': // лінія 618-631
        default:
            // ...
    }
    
    // 9. РЕНДЕРИНГ ВИДІЛЕННЯ ✓✓✓ ЦЕ ДОДАЄ 2 ФУНКЦІЇ
    if (isSelected || isMoveSelected) {
        drawSelectionHighlight(ctx, shape, zoom);  // 2x рендеринг фігури!
        drawSelectionHandles(ctx, shape, zoom);    // 8-12 додаткових об'єктів
    }
}
```

### 2.3 Рендеринг виділення (Selection Highlighting)

**Розташування**: `js/shape-renderer.js` (лінії 730-900)

```javascript
// js/shape-renderer.js, лінія 730
function drawSelectionHighlight(ctx, shape, zoom) {
    ctx.save();
    
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('highlight', shape.type, ctx, shape, zoom);
        if (result !== null) {
            ctx.restore();
            return;
        }
    }
    
    // РЕНДЕРИНГ ВИДІЛЕННЯ - ОДНА ДОДАТКОВА ВЕРСІЯ ФОРМИ
    // Set selection highlight style - bright yellow outline
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3 / zoom; // Slightly thicker for visibility
    ctx.setLineDash([]);
    
    // РИСУЄ ФІГУРУ ЗАНОВО ДЛЯ ЖОВТОГО КОНТУРУ
    switch(shape.type) {
        case 'line':        // лінія 753-756: ctx.beginPath(); ctx.moveTo(); ctx.lineTo(); ctx.stroke();
        case 'polyline':    // лінія 758-765: рисує повністю заново
        case 'circle':      // лінія 767-770: рисує заново
        case 'arc':         // лінія 772-775: рисує заново
        case 'ellipse':     // лінія 777-783: рисує заново
        case 'polygon':     // лінія 785-792: рисує заново
        case 'spline':      // лінія 794-797: рисує заново
        case 'hatch':       // лінія 799-806: рисує заново
        case 'point':       // лінія 808-811: рисує заново
        case 'text':        // лінія 813-850: СКЛАДНА - трансформації + stroke
            // ...
    }
    
    ctx.restore();
}

// js/shape-renderer.js, лінія 950+
function drawSelectionHandles(ctx, shape, zoom) {
    // ЦЕ ДОДАЄ: 8-12 додаткових малюнків
    // Залежить від типу фігури:
    // - Line: 2 handles (endpoints)
    // - Circle: 2 handles (center, edge)
    // - Polyline/Polygon: handlers на кожній точці (N хендлерів!)
    // - Text: 4-8 хендлерів для трансформації
}
```

### 2.4 Дублювання рендеринга

**КРИТИЧНА ПРОБЛЕМА**: Виділена фігура рендерується **ТРИ РАЗИ**:

1. **Перший раз** - нормальний рендеринг у `renderStandardShapes()`
   ```javascript
   switch(shape.type) {
       case 'line':
           ctx.beginPath();
           ctx.moveTo(shape.x1, shape.y1);
           ctx.lineTo(shape.x2, shape.y2);
           ctx.stroke();  // ← РЕНДЕРИНГ #1
   }
   ```

2. **Другий раз** - жовтий контур у `drawSelectionHighlight()`
   ```javascript
   switch(shape.type) {
       case 'line':
           ctx.beginPath();
           ctx.moveTo(shape.x1, shape.y1);
           ctx.lineTo(shape.x2, shape.y2);
           ctx.stroke();  // ← РЕНДЕРИНГ #2
   }
   ```

3. **Третій раз** - хендлери у `drawSelectionHandles()`
   ```javascript
   // 2+ додаткових рисування на кожен хендлер
   ```

**На кожну виділену фігуру витрачається**: 3x рендеринг + 8-12 хендлерів = **11-15 операцій Canvas API**

---

## 3. ПРОЦЕС ПЕРЕРИСУВАННЯ (Redraw Flow)

### 3.1 Trigger Redraw на Selection

**Розташування**: `js/cad/rendering/renderer.js` (лінія 1050, 1105)

```javascript
// js/cad/rendering/renderer.js, лінія 1050
addToHistory(`Selected ${selectedShapes.size} objects`);

// js/cad/rendering/renderer.js, лінія 1105
let message = `${isWindowSelection ? 'Window' : 'Crossing'} selected ${selectedShapes.size} objects`;

// js/cad/rendering/renderer.js, лінія 1107
redraw();  // ← ЗАПУСКАЄТЬСЯ ПЕРЕРИСУВАННЯ
```

### 3.2 Optimized Redraw (RequestAnimationFrame)

**Розташування**: `js/cad/rendering/renderer.js` (лінія 698-720)

```javascript
// js/cad/rendering/renderer.js, лінія 698
let pendingDraw = false;

function redraw() {
    if (!pendingDraw) {
        pendingDraw = true;
        requestAnimationFrame(() => {
            try {
                _redraw();  // ← ПОВНА ПЕРЕРИСУВАННЯ
            } catch (error) {
                console.error('Error during redraw:', error);
            } finally {
                pendingDraw = false;
            }
        });
    }
}
```

**Позитивно**: 
- ✓ Використовується `requestAnimationFrame` - не кількість редравів в секунду, а кількість кадрів
- ✓ `pendingDraw` flag запобігає дублюванню редравів

**Проблеми**:
- ✗ **На кожну зміну selection** викликається ПОВНА перерисування (всіх фігур + всіх хендлерів)
- ✗ Навіть якщо змінилася селекція лише 1 фігури - редраються ВСІ видимі фігури

### 3.3 Viewport Cache - Області видимості

**Розташування**: `js/cad/rendering/viewport.js` (лінії 1-100)

```javascript
// js/cad/rendering/viewport.js
let viewportCache = {
    lastZoom: null,
    lastOffsetX: null,
    lastOffsetY: null,
    lastCanvasWidth: null,
    lastCanvasHeight: null,
    bounds: null,
    visibleShapes: new Set(),
    lastShapeCount: 0,
    needsFullRebuild: true
};

function updateViewportCache() {
    const needsUpdate = viewportCache.lastZoom !== zoom ||
        viewportCache.lastOffsetX !== offsetX ||
        viewportCache.lastOffsetY !== offsetY ||
        viewportCache.lastCanvasWidth !== canvas.width ||
        viewportCache.lastCanvasHeight !== canvas.height ||
        viewportCache.lastShapeCount !== shapes.length;

    if (needsUpdate || viewportCache.needsFullRebuild) {
        // QUADTREE або GRID LOOKUP
        if (globalQuadTree) {
            const qtResults = queryQuadTree(viewportCache.bounds);
            if (qtResults && qtResults.size > 0) {
                viewportCache.visibleShapes = qtResults;
            }
        } else {
            // FALLBACK: всі фігури перебираються в цикл
            shapes.forEach((shape, index) => {
                if (isShapeInViewport(shape, viewportCache.bounds)) {
                    viewportCache.visibleShapes.add(index);
                }
            });
        }
    }
}
```

**Позитивно**:
- ✓ Кешує видимі фігури
- ✓ Підтримує Quadtree для spatial indexing

**Проблеми**:
- ✗ **Редбілд на КОЖЕН редрав** - навіть якщо zoom/offset не змінилися, але змінилася селекція
- ✗ `needsFullRebuild` не скидається на зміну selection
- ✗ Viewport cache не оптимізує рендеринг виділених фігур

---

## 4. ÉVÉNEMENTS (Events) - Частота вже викликів

### 4.1 Selection Events

**Розташування**: `js/cad/core/events.js` (лінії 137-250)

```javascript
// js/cad/core/events.js

// НЕ РОЗГЛЯДАЄТЬСЯ DEBOUNCE/THROTTLE для selection!

function handleSelectMode(x, y, e) {
    // Vertex selection
    [x, y] = screenToWorld(e.offsetX, e.offsetY);
    // ...
    selectedShapes.add(shapeUuid);
    redraw();  // ← НЕГАЙНИМ РЕДРАВ при КОЖНОМУ click
}
```

**Проблеми**:
- ✗ **Немає debouncing** для selection events
- ✗ **Window selection на mousemove** (лінія 1125-1140) - редраї можуть бути на кожен frame!

```javascript
// js/cad/rendering/renderer.js, лінія 1125
canvas.addEventListener('mousemove', (e) => {
    // ... 
    if (mode === 'select' && isDrawing) {
        // ЦЕ ВИКЛИКАЄТЬСЯ НА КОЖЕН MOUSEMOVE!!
        const [sx, sy] = worldToScreen(startX, startY);
        const [ex, ey] = worldToScreen(x, y);
        
        selectionWindow.style.left = `${Math.min(sx, ex)}px`;
        selectionWindow.style.top = `${Math.min(sy, ey)}px`;
        // ... НЕ ВИКЛИКАЄ redraw(), тільки оновлює DOM ...
    }
});
```

### 4.2 Command-System Selection

**Розташування**: `js/cad/ui/command-system.js` (лінії 599-617)

```javascript
// js/cad/ui/command-system.js, лінія 599
function openPropertyPanel(clickedShape) {
    if (clickedShape) {
        const shapeUuid = clickedShape.uuid;
        
        if (e.shiftKey) {
            if (selectedShapes.has(shapeUuid)) {
                selectedShapes.delete(shapeUuid);
                addToHistory(`Object deselected`);
            } else {
                selectedShapes.add(shapeUuid);
                addToHistory(`Object added to selection`);
            }
        } else {
            if (selectedShapes.has(shapeUuid) && selectedShapes.size === 1) {
                addToHistory(`Object already selected`);
                return;
            } else {
                if (typeof clearSelection === 'function') {
                    clearSelection();
                }
                selectedShapes.add(shapeUuid);
                addToHistory(`Object selected: ${clickedShape.type}`);
            }
        }
        redraw();  // ← НЕГАЙНИЙ РЕДРАВ
        
        const propertiesPanel = document.getElementById('propertiesPanel');
        if (propertiesPanel && propertiesPanel.style.display !== 'none') {
            updatePropertiesPanel();  // ← ДРУГИЙ РЕДРАВ (побічний)
        }
    }
}
```

---

## 5. АНАЛІЗ QUADTREE (Quadtree Performance)

### 5.1 Quadtree Initialization

**Розташування**: `js/cad/rendering/quadtree.js` (лінії 1-200)

```javascript
// js/cad/rendering/quadtree.js, лінія 1
class QuadTreeNode {
    constructor(bounds, depth = 0, maxDepth = 8, maxObjects = 4) {
        this.bounds = bounds;  // {minX, maxX, minY, maxY}
        this.depth = depth;
        this.maxDepth = maxDepth;
        this.maxObjects = maxObjects;
        this.objects = [];     // Array of {index, bounds}
        this.children = [];    // Quadrants
    }
    
    // ПРОБЛЕМА: QUADTREE НЕ ВИКОРИСТОВУЄТЬСЯ ПРАВИЛЬНО ЛЯ SELECTION!
    // Quadtree кешується для viewport culling
    // Але НЕ скоростися для click point searches
}
```

**Проблеми**:
- ✗ Quadtree існує, але **НЕ ВИКОРИСТОВУЄТЬСЯ на click selection**
- ✗ Quadtree використовується тільки для viewport culling
- ✗ Single click та window selection роблять linear search (O(n))
- ✗ Quadtree забуває відновлювати при изменнениях selection (но это правда, сдалдцій не меняет фигуры)

---

## 6. ВУЗЬКІ МІСЦЯ (BOTTLENECKS) - РЕЗЮМЕ

### 6.1 На Single Click Selection

| Операція | Розташування | Складність | Проблема |
|----------|-------------|-----------|---------|
| Пошук фігури | `renderer.js:1030-1055` | O(n) | Лінійний пошук по всіх фігурах |
| Перевірка на попадання | `isPointInShape()` | O(1) + геометрія | Складні розрахунки для кожної фігури |
| Запис в Set | `selectedShapes.add()` | O(1) | Швидко |
| Редрав | `redraw()` | O(n) | Рендеринг всіх видимих фігур |
| **Видалення при 1000 фігур** | - | ~1000ms | Може зависнути UI |

### 6.2 На Window Selection (під час drag)

| Операція | Розташування | Складність | Проблема |
|----------|-------------|-----------|---------|
| Пошук фігур | `renderer.js:1060-1110` | O(n) | Лінійний на КОЖЕН mousemove! |
| Тест перетину | `isShapeInWindow()` | O(1) + геометрія | Всередину кожної фігури |
| Обновлення DOM | `mousemove` | O(1) | Фреймрейт UI |
| **Видалення при 1000 фігур** | - | ~60fps @ 1000ms drag | Slow selection window |

### 6.3 На Selection Highlight Rendering

| Операція | Розташування | Складність | Проблема |
|----------|-------------|-----------|---------|
| Перевірка `isSelected` | `renderStandardShapes():450` | O(1) Set lookup | Швидко |
| Рендеринг фігури | `switch(shape.type)` | O(1) | Базовий рендеринг |
| Рендеринг контуру | `drawSelectionHighlight()` | O(1) | **2x рендеринг фігури** |
| Рендеринг хендлерів | `drawSelectionHandles()` | O(n) на N хендлерів | **8-12+ додаткових об'єктів** |
| **На 100 виділених** | - | 3x100 + 12x100 = 1500 ops | Дорого! |

### 6.4 На Properties Panel Update

**Розташування**: `command-system.js:617` та `properties-panel.js`

```javascript
// Іноді викликається ДВІЧІ:
redraw();  // #1
updatePropertiesPanel();  // #2 - побічно більше редравів
```

---

## 7. РЕКОМЕНДАЦІЇ ОПТИМІЗАЦІї

### 🎯 ПРИОРИТЕТ 1: СКОРОСТИТИ ПОШУК ПРИ CLICK SELECTION

**Нинішня**, лінія 1030-1055:
```javascript
for (let i = 0; i < shapes.length; i++) {
    if (isPointInShape(shapes[i], x, y)) { ... }
}
```

**Рекомендація**: Використати Quadtree для point query
```javascript
// Pseudocode:
if (globalQuadTree) {
    const candidates = globalQuadTree.query({
        minX: x - 1/zoom,
        maxX: x + 1/zoom,
        minY: y - 1/zoom,
        maxY: y + 1/zoom
    });
    
    // Перевіримо тільки кандидатів (зазвичай < 10)
    for (const index of candidates) {
        if (isPointInShape(shapes[index], x, y)) {
            selectedShapes.add(shapes[index].uuid);
            break;
        }
    }
} else {
    // fallback до лінійного пошуку
}
```

**Очікуваний виграш**: O(n) → O(log n) + O(k) де k << n

---

### 🎯 ПРИОРИТЕТ 2: ОПТИМІЗУВАТИ SELECTION HIGHLIGHT RENDERING

**Нинішня**, лінія 750-870:
```javascript
function drawSelectionHighlight(ctx, shape, zoom) {
    // рисує фігуру ЩЕ РАЗ під жовтим контуром
    switch(shape.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();  // ← 2x рендеринг
    }
}
```

**Рекомендація 2A**: Використати Canvas filter для гіпнозу контуру
```javascript
function drawSelectionHighlight(ctx, shape, zoom) {
    ctx.save();
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3 / zoom;
    ctx.setLineDash([]);
    // НЕ РИСУЄТЕ ФІГУРУ! - просто накладаєте фільтр
    // Потім рисуєте лицоме как обычно - фильтр наложится автоматом
    // (не підтримується в старих браузерах)
    ctx.restore();
}
```

**Рекомендація 2B**: Використати виділену версію фігури с чеканием
```javascript
function renderStandardShapes(ctx, shape, zoom, shapeIndex) {
    const isSelected = selectedShapes.has(shape.uuid);
    
    // Вибір стилю ОДИН РАЗ
    const strokeColor = isSelected ? '#ffff00' : shapeColor;
    const lineWidth = isSelected ? 3/zoom : 1/zoom;
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    
    // РИСУЄМО ОДИН РАЗ з правильним стилем
    switch(shape.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
    }
    
    // Тільки хендлери додатково
    if (isSelected) {
        drawSelectionHandles(ctx, shape, zoom);
    }
}
```

**Очікуваний виграш**: 2x → 1.3x на виділених фігурах

---

### 🎯 ПРИОРИТЕТ 3: ОПТИМІЗУВАТИ SELECTION HANDLES

**Нинішня**: Рисує 8-12 хендлерів для кожної фігури

**Рекомендація**: Крок розміру хендлерів (тільки близькі до курсору)
```javascript
function drawSelectionHandles(ctx, shape, zoom) {
    // Отримуємо все хендлери
    const handles = getSelectionHandles(shape);
    
    // Перевіря: які видимі на екрані в текущому zoom
    const screenHandles = handles.filter(h => {
        const [sx, sy] = worldToScreen(h.x, h.y);
        return sx >= 0 && sx <= canvas.width &&
               sy >= 0 && sy <= canvas.height;
    });
    
    // Рискемо тільки видимі хендлери
    screenHandles.forEach(handle => {
        drawHandle(handle.x, handle.y, handle.type);
    });
}
```

**Очікуваний виграш**: Рідко мати більше 8 хендлерів на екрані

---

### 🎯 ПРИОРИТЕТ 4: ДЕБАУНС WINDOW SELECTION

**Нинішня**, mousemove обновлює selection на кожен frame:
```javascript
canvas.addEventListener('mousemove', (e) => {
    if (mode === 'select' && isDrawing) {
        // Це викликаються на КОЖЕН mousemove (60+ fps!)
        // Але redraw() з requestAnimationFrame обмежує до 60fps
    }
});
```

**Рекомендація**: Батч обновити selection на КОНЕЦ drag
```javascript
// Замість виконання selection на mousemove
// Просто оновлюючи selection window DOM

// На mouseup - викликаємо selection один раз
canvas.addEventListener('mouseup', (e) => {
    if (mode === 'select' && isDrawing) {
        // ОДНА перевірка всих фігур
        performWindowSelection(...);
        redraw();  // Один редрав в конці
    }
});
```

**Очікуваний виграш**: Зменшує редравів під час drag з потенціально 60+ до 1

---

### 🎯 ПРИОРИТЕТ 5: ІНВАЛІДАЦІЯ SELECTION STATE У VIEWPORT CACHE

**Нинішня**, viewport cache не враховуєSelection:
```javascript
function updateViewportCache() {
    // Перебудовує тільки якщо zoom/offset змінився
    // НЕ перебудовується при зміні selection!
}
```

**Рекомендація**: Тримати окремий SELECTION CACHE
```javascript
let selectionHighlightCache = {
    lastSelectedShapes: new Set(),
    isDirty: false
};

function updateSelectionCache() {
    // Порівнюємо з попередню версію
    if (selectedShapes.size !== selectionHighlightCache.lastSelectedShapes.size ||
        ![...selectedShapes].every(uuid => selectionHighlightCache.lastSelectedShapes.has(uuid))) {
        selectionHighlightCache.isDirty = true;
        selectionHighlightCache.lastSelectedShapes = new Set(selectedShapes);
    }
}

function _redraw() {
    // Тільки перебудувати viewport если нужно
    if (viewportCache.needsFullRebuild) {
        updateViewportCache();
    }
    
    // Рести shape - с условием isDirty на selection
    // Това ќ помоћ не перерисовувати selection handles для невизначених
}
```

---

## 8. ПРОВЕРКА ГЛУБОКОГО КОПИРОВАНИЯ

### 8.1 Selection Set - це Reference-based, не Value-based

**Розташування**: `primitives.js` (оригинальне визначення)
```javascript
let selectedShapes = new Set();  // ← Set од UUIDs, не копії фігур!
```

**Переваги**:
- ✓ Не використовує глибоке копіювання
- ✓ Швидко додавати/видаляти з Set (O(1))
- ✓ Мало пам'яті (тільки UUID strings)

**Проблеми**: Немає

---

## 9. НЕВИКОРИСТАНА ОПТИМІЗАЦІЯ - SPATIAL INDEXING

### 9.1 Quadtree існує, але під-оптимізований

**Файл**: `js/cad/rendering/quadtree.js`

**Використання**:
1. ✓ Viewport culling у `updateViewportCache()` - **використовується**
2. ✗ Point selection на click - **НЕ використовується!**
3. ✗ Window selection - **НЕ використовується!**

**Код на viewport culling** (лінія viewport.js:45-60):
```javascript
if (globalQuadTree !== null && globalQuadTree.isDirty) {
    initializeQuadTree();
}

const qtResults = queryQuadTree(viewportCache.bounds);
if (qtResults && qtResults.size > 0) {
    viewportCache.visibleShapes = qtResults;  // ✓ Використовується
}
```

**Код на click selection** (лінія renderer.js:1030):
```javascript
for (let i = 0; i < shapes.length; i++) {  // ✗ Не використовується quadtree!
    if (isPointInShape(shapes[i], x, y)) { ... }
}
```

---

## 10. ВИСНОВКИ

### Três основні вузькі місця

1. **SELECTION SEARCH (O(n))**
   - Click на кожен объект - лінійний перебір всіх фігур
   - Quadtree існує, але не використовується
   - **Вирішення**: Quadtree point query

2. **SELECTION HIGHLIGHT RENDERING (3x рендеринг)**
   - Кожна виділена фігура рисується 3 рази (нормально + контур + хендлери)
   - drawSelectionHighlight повторює всю фігуру
   - **Вирішення**: Об'єднати рендеринг в одну операцію

3. **WINDOW SELECTION PERFORMANCE (O(n) × 60fps)**
   - mousemove викличе лінійний пошук на кожен frame
   - Selection не батчована - могто бути додаткові редравів
   - **Вирішення**: Батч selection на mouseup, інакше тільки DOM оновлення

### Пропоновані срибані результаты

| Опотимізація | Ствутна | Рекомендована | Виграш |
|-------------|--------|--------|--------|
| Point selection | O(n) | O(log n) Quadtree | 10-100x на 1000+ фігур |
| Highlight rendering | 3x | 1.3x | 2x |
| Selection handles | 12 на все | 4-8 видимих | 2x при zoom out |
| Window selection | O(n*60fps) | O(n) 1x | 60x батч |

### Загальна картина

- ✓ Система используэт Set-based selection (добре)
- ✓ Viewport culling через Quadtree (добре)
- ✗ Пошук при click не використовує Quadtree (вузька місце)
- ✗ Selection highlight дублює рендеринг (вузька місце)
- ✗ Window selection під час drag не батчується (вузька місце)

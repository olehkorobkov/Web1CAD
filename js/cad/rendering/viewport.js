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

let zoom = 3.7;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let panStartX = 0, panStartY = 0;

function updateViewportCache() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    const needsUpdate = viewportCache.lastZoom !== zoom ||
        viewportCache.lastOffsetX !== offsetX ||
        viewportCache.lastOffsetY !== offsetY ||
        viewportCache.lastCanvasWidth !== canvas.width ||
        viewportCache.lastCanvasHeight !== canvas.height ||
        viewportCache.lastShapeCount !== shapes.length;

    if (needsUpdate || viewportCache.needsFullRebuild) {
        const canvasEl = document.getElementById('canvas');
        if (!canvasEl) return;

        const startTime = performance.now();
        const margin = Math.max(50, 200 / zoom); 
        viewportCache.bounds = {
            minX: (-canvasEl.width/2 - offsetX) / zoom - margin,
            maxX: (canvasEl.width/2 - offsetX) / zoom + margin,
            minY: (-canvasEl.height/2 + offsetY) / zoom - margin,
            maxY: (canvasEl.height/2 + offsetY) / zoom + margin
        };

        viewportCache.visibleShapes.clear();
        renderingStats.totalShapes = shapes.length;
        renderingStats.culledShapes = 0;

        shapes.forEach((shape, index) => {
            if (isShapeInViewport(shape, viewportCache.bounds)) {
                viewportCache.visibleShapes.add(index);
            } else {
                renderingStats.culledShapes++;
            }
        });

        renderingStats.visibleShapes = viewportCache.visibleShapes.size;
        renderingStats.lastCullTime = performance.now() - startTime;

        viewportCache.lastZoom = zoom;
        viewportCache.lastOffsetX = offsetX;
        viewportCache.lastOffsetY = offsetY;
        viewportCache.lastCanvasWidth = canvasEl.width;
        viewportCache.lastCanvasHeight = canvasEl.height;
        viewportCache.lastShapeCount = shapes.length;
        viewportCache.needsFullRebuild = false;

        if (shapes.length > 100) {
            console.log(`Viewport culling: ${renderingStats.culledShapes}/${renderingStats.totalShapes} shapes culled in ${renderingStats.lastCullTime.toFixed(2)}ms`);
        }
    }
}

function invalidateViewportCache() {
    viewportCache.needsFullRebuild = true;
    viewportCache.visibleShapes.clear();
}

function addShapeWithCacheUpdate(shape) {
    shapes.push(shape);
    invalidateViewportCache();
}

function removeShapeWithCacheUpdate(index) {
    if (index >= 0 && index < shapes.length) {
        shapes.splice(index, 1);
        invalidateViewportCache();
    }
}
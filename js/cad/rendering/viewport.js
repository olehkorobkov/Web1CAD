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

        // PHASE 3: Try QuadTree first, fall back to grid
        let useQuadTree = false;
        if (typeof findShapesNearPointQuadTree === 'function' && globalQuadTree !== null) {
            try {
                // Initialize QuadTree with all shapes
                if (globalQuadTree && (globalQuadTree.isDirty || globalQuadTree.root.getStats().objectCount !== shapes.length)) {
                    initializeQuadTree();
                }
                
                // Query QuadTree for visible shapes
                const qtResults = queryQuadTree(viewportCache.bounds);
                if (qtResults && qtResults.size > 0) {
                    viewportCache.visibleShapes = qtResults;
                    renderingStats.culledShapes = shapes.length - viewportCache.visibleShapes.size;
                    useQuadTree = true;
                }
            } catch (err) {
                console.warn('QuadTree query failed, falling back to grid:', err);
            }
        }

        // PHASE 2A/2B: Fallback to grid system if QuadTree not available or failed
        if (!useQuadTree && typeof getVisibleShapesOptimized === 'function') {
            // Get all shape indices for culling check
            const allIndices = Array.from({length: shapes.length}, (_, i) => i);
            // PHASE 2B: Filter by layer visibility first (faster than checking bounds for all)
            let indicesToCull = allIndices;
            if (typeof filterShapesByLayerVisibility === 'function') {
                indicesToCull = filterShapesByLayerVisibility(allIndices);
            }
            viewportCache.visibleShapes = getVisibleShapesOptimized(indicesToCull, viewportCache.bounds);
            renderingStats.culledShapes = shapes.length - viewportCache.visibleShapes.size;
        } else if (!useQuadTree) {
            // Ultimate fallback to original method
            shapes.forEach((shape, index) => {
                if (isShapeInViewport(shape, viewportCache.bounds)) {
                    viewportCache.visibleShapes.add(index);
                } else {
                    renderingStats.culledShapes++;
                }
            });
        }

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
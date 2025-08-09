/*
 * Memory Management System - Web1CAD Optimization
 * Version 0.250801 (August 1, 2025)
 * © 2025 Oleh Korobkov. All rights reserved.
 * 
 * OPTIMIZATION: Memory management, GC optimization, object pooling
 */

class MemoryManager {
    constructor() {
        // OPTIMIZATION: Object pooling to reduce GC
        this.objectPools = {
            shapes: [],
            points: [],
            events: [],
            bounds: [],
            handles: []
        };
        
        this.poolSizes = {
            shapes: 1000,
            points: 5000,
            events: 100,
            bounds: 500,
            handles: 200
        };
        
        // Weak references for automatic cleanup
        this.weakRefs = new Set();
        
        // Memory usage tracking
        this.memoryStats = {
            shapesCount: 0,
            poolsSize: 0,
            undoStackSize: 0,
            cacheSize: 0
        };
        
        // Auto cleanup configuration
        this.autoCleanupInterval = 30000; // 30 seconds
        this.maxUndoSteps = 50;
        this.maxCacheAge = 300000; // 5 minutes
        
        this.startAutoCleanup();
    }

    // === OBJECT POOLING ===
    getPooledObject(type, initializer = null) {
        const pool = this.objectPools[type];
        if (!pool) {
            console.warn(`Unknown pool type: ${type}`);
            return initializer ? initializer() : {};
        }
        
        let obj;
        if (pool.length > 0) {
            obj = pool.pop();
            this.resetObject(obj);
        } else {
            obj = initializer ? initializer() : {};
        }
        
        return obj;
    }

    returnToPool(type, obj) {
        const pool = this.objectPools[type];
        if (!pool) return;
        
        if (pool.length < this.poolSizes[type]) {
            this.resetObject(obj);
            pool.push(obj);
        }
    }

    resetObject(obj) {
        // Clear object for reuse
        if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach(key => {
                delete obj[key];
            });
        }
    }

    // === SHAPE MEMORY OPTIMIZATION ===
    createOptimizedShape(type, properties) {
        const shape = this.getPooledObject('shapes', () => ({}));
        
        // Minimal set of properties
        shape.type = type;
        Object.assign(shape, properties);
        
        // Lazy loading for rarely used properties
        this.setupLazyProperties(shape);
        
        this.memoryStats.shapesCount++;
        return shape;
    }

    setupLazyProperties(shape) {
        // Lazy getter for handles
        Object.defineProperty(shape, '_handles', {
            get() {
                if (!this.__handles) {
                    this.__handles = window.shapeHandler?.execute('getHandles', this.type, this) || [];
                }
                return this.__handles;
            },
            configurable: true
        });
        
        // Lazy getter for bounds
        Object.defineProperty(shape, '_bounds', {
            get() {
                if (!this.__bounds) {
                    this.__bounds = window.shapeHandler?.execute('getBounds', this.type, this) || null;
                }
                return this.__bounds;
            },
            configurable: true
        });
    }

    destroyShape(shape) {
        // Clear lazy properties
        delete shape.__handles;
        delete shape.__bounds;
        
        // Return to pool
        this.returnToPool('shapes', shape);
        this.memoryStats.shapesCount--;
    }

    // === UNDO/REDO OPTIMIZATION ===
    optimizeUndoStack(undoStack, redoStack) {
        // Limit undo stack size
        while (undoStack.length > this.maxUndoSteps) {
            const removed = undoStack.shift();
            this.cleanupUndoState(removed);
        }
        
        // Clear redo stack on new operation
        while (redoStack.length > 0) {
            const removed = redoStack.pop();
            this.cleanupUndoState(removed);
        }
        
        this.memoryStats.undoStackSize = undoStack.length + redoStack.length;
    }

    cleanupUndoState(state) {
        if (state && state.shapes) {
            for (const shape of state.shapes) {
                this.destroyShape(shape);
            }
        }
    }

    // === CACHE MANAGEMENT ===
    setupCacheWithTTL(cache, maxAge = this.maxCacheAge) {
        const originalSet = cache.set.bind(cache);
        const timestamps = new Map();
        
        cache.set = function(key, value) {
            timestamps.set(key, Date.now());
            return originalSet(key, value);
        };
        
        cache.cleanExpired = function() {
            const now = Date.now();
            for (const [key, timestamp] of timestamps) {
                if (now - timestamp > maxAge) {
                    cache.delete(key);
                    timestamps.delete(key);
                }
            }
        };
        
        return cache;
    }

    // === GARBAGE COLLECTION OPTIMIZATION ===
    scheduleGC() {
        // Hint to browser that now is good time for GC
        if (window.gc && typeof window.gc === 'function') {
            // Chrome DevTools gc function
            setTimeout(() => window.gc(), 0);
        }
    }

    // === WEAK REFERENCES ===
    addWeakRef(obj, cleanup) {
        const ref = new WeakRef(obj);
        ref.cleanup = cleanup;
        this.weakRefs.add(ref);
    }

    cleanupWeakRefs() {
        for (const ref of this.weakRefs) {
            if (!ref.deref()) {
                // Object was collected by GC
                if (ref.cleanup) {
                    ref.cleanup();
                }
                this.weakRefs.delete(ref);
            }
        }
    }

    // === AUTO CLEANUP ===
    startAutoCleanup() {
        setInterval(() => {
            this.performAutoCleanup();
        }, this.autoCleanupInterval);
    }

    performAutoCleanup() {
        console.log('🧹 Memory cleanup started...');
        
        // 1. Clear expired cache entries
        if (window.optimizedRenderer?.layerCache) {
            window.optimizedRenderer.layerCache.cleanExpired?.();
        }
        
        // 2. Clear weak references
        this.cleanupWeakRefs();
        
        // 3. Optimize undo stack
        if (window.undoStack && window.redoStack) {
            this.optimizeUndoStack(window.undoStack, window.redoStack);
        }
        
        // 4. Clear unused pools
        this.cleanupPools();
        
        // 5. Force garbage collection hint
        this.scheduleGC();
        
        // 6. Update stats
        this.updateMemoryStats();
        
        console.log('✅ Memory cleanup completed', this.memoryStats);
    }

    cleanupPools() {
        for (const [type, pool] of Object.entries(this.objectPools)) {
            const maxSize = this.poolSizes[type];
            const targetSize = Math.floor(maxSize * 0.7); // Keep 70%
            
            while (pool.length > targetSize) {
                pool.pop();
            }
        }
    }

    updateMemoryStats() {
        this.memoryStats.poolsSize = Object.values(this.objectPools)
            .reduce((total, pool) => total + pool.length, 0);
        
        this.memoryStats.cacheSize = 0;
        if (window.optimizedRenderer?.layerCache) {
            this.memoryStats.cacheSize = window.optimizedRenderer.layerCache.size;
        }
        
        // Browser memory info (if available)
        if (performance.memory) {
            this.memoryStats.heapUsed = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            this.memoryStats.heapTotal = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
            this.memoryStats.heapLimit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        }
    }

    // === SHAPE SERIALIZATION OPTIMIZATION ===
    serializeShapeOptimized(shape) {
        // Create minimal copy without lazy properties and methods
        const serialized = {};
        
        // Basic properties
        const essentialProps = ['type', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 
                               'radius', 'rx', 'ry', 'rotation', 'startAngle', 'endAngle',
                               'points', 'content', 'size', 'color', 'lineWeight', 'layer'];
        
        for (const prop of essentialProps) {
            if (shape.hasOwnProperty(prop)) {
                serialized[prop] = shape[prop];
            }
        }
        
        return serialized;
    }

    deserializeShape(data) {
        return this.createOptimizedShape(data.type, data);
    }

    // === BATCH OPERATIONS ===
    batchDestroyShapes(shapes) {
        const batch = [];
        for (const shape of shapes) {
            batch.push(() => this.destroyShape(shape));
        }
        
        // Execute cleanup in next tick to not block UI
        setTimeout(() => {
            for (const cleanup of batch) {
                cleanup();
            }
        }, 0);
    }

    batchCreateShapes(shapesData) {
        const shapes = [];
        for (const data of shapesData) {
            shapes.push(this.createOptimizedShape(data.type, data));
        }
        return shapes;
    }

    // === MEMORY MONITORING ===
    getMemoryReport() {
        this.updateMemoryStats();
        
        return {
            ...this.memoryStats,
            poolUtilization: Object.entries(this.objectPools).reduce((acc, [type, pool]) => {
                acc[type] = `${pool.length}/${this.poolSizes[type]}`;
                return acc;
            }, {}),
            weakRefsCount: this.weakRefs.size,
            timestamp: Date.now()
        };
    }

    // === PUBLIC API ===
    forceCleanup() {
        this.performAutoCleanup();
    }

    setPoolSize(type, size) {
        if (this.objectPools[type]) {
            this.poolSizes[type] = size;
        }
    }

    setAutoCleanupInterval(interval) {
        this.autoCleanupInterval = interval;
    }

    // === INTEGRATION HELPERS ===
    wrapShapeOperations() {
        // Wrap existing shape creation functions
        if (window.addShape) {
            const originalAddShape = window.addShape;
            window.addShape = (shapeData) => {
                const optimizedShape = this.createOptimizedShape(shapeData.type, shapeData);
                return originalAddShape(optimizedShape);
            };
        }
        
        // Wrap shape deletion
        if (window.deleteShape) {
            const originalDeleteShape = window.deleteShape;
            window.deleteShape = (index) => {
                const shape = window.shapes[index];
                if (shape) {
                    this.destroyShape(shape);
                }
                return originalDeleteShape(index);
            };
        }
    }
}

// Performance monitoring utilities
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = [];
    }

    startMeasure(name) {
        performance.mark(`${name}-start`);
    }

    endMeasure(name) {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measure = performance.getEntriesByName(name, 'measure')[0];
        this.metrics.set(name, measure.duration);
        
        // Cleanup marks
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
        
        return measure.duration;
    }

    measureFunction(fn, name) {
        return (...args) => {
            this.startMeasure(name);
            const result = fn.apply(this, args);
            const duration = this.endMeasure(name);
            
            // Log slow operations
            if (duration > 16) { // 60 FPS threshold
                console.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`);
            }
            
            return result;
        };
    }

    getMetrics() {
        return Object.fromEntries(this.metrics);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.MemoryManager = MemoryManager;
    window.PerformanceMonitor = PerformanceMonitor;
    
    // Auto-initialize
    window.memoryManager = new MemoryManager();
    window.performanceMonitor = new PerformanceMonitor();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MemoryManager, PerformanceMonitor };
}
/*
 * Optimized Rendering System - Web1CAD 
 * © 2025 Oleh Korobkov. All rights reserved.
 * 
 * OPTIMIZATION: Dirty rectangles + Layer caching + Viewport culling
 */

class OptimizedRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // OPTIMIZATION 1: Layer Caching
        this.layerCache = new Map();
        this.dirtyLayers = new Set();
        
        // OPTIMIZATION 2: Viewport Culling 
        this.viewportBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        
        // OPTIMIZATION 3: Dirty Rectangle system
        this.dirtyRegions = [];
        this.fullRedrawNeeded = true;
        
        // OPTIMIZATION 4: Shape spatial indexing (QuadTree)
        this.spatialIndex = new QuadTree(0, 0, 10000, 10000);
        
        // OPTIMIZATION 5: Batch operations
        this.renderQueue = [];
        this.pendingUpdates = new Set();
    }

    // === MAIN OPTIMIZED REDRAW ===
    redraw(zoom, offsetX, offsetY, forceFullRedraw = false) {
        if (!this.pendingDraw) {
            this.pendingDraw = true;
            requestAnimationFrame(() => {
                this._optimizedRedraw(zoom, offsetX, offsetY, forceFullRedraw);
                this.pendingDraw = false;
            });
        }
    }

    _optimizedRedraw(zoom, offsetX, offsetY, forceFullRedraw) {
        // STEP 1: Update viewport bounds for culling
        this.updateViewportBounds(zoom, offsetX, offsetY);
        
        // STEP 2: Check if full redraw is needed
        if (forceFullRedraw || this.fullRedrawNeeded) {
            this.performFullRedraw(zoom, offsetX, offsetY);
            this.fullRedrawNeeded = false;
            this.dirtyRegions = [];
            return;
        }
        
        // STEP 3: Optimized partial redraw 
        this.performPartialRedraw(zoom, offsetX, offsetY);
        this.dirtyRegions = [];
    }

    // === VIEWPORT CULLING ===
    updateViewportBounds(zoom, offsetX, offsetY) {
        this.viewportBounds = {
            minX: -offsetX / zoom,
            minY: -offsetY / zoom,
            maxX: (-offsetX + this.canvas.width) / zoom,
            maxY: (-offsetY + this.canvas.height) / zoom
        };
    }

    isShapeInViewport(shape) {
        const bounds = window.shapeHandler.execute('getBounds', shape.type, shape);
        if (!bounds) return true; // Fallback - render unknown shapes
        
        return !(bounds.maxX < this.viewportBounds.minX || 
                 bounds.minX > this.viewportBounds.maxX ||
                 bounds.maxY < this.viewportBounds.minY || 
                 bounds.minY > this.viewportBounds.maxY);
    }

    // === LAYER CACHING SYSTEM ===
    getCachedLayer(layerName) {
        if (this.dirtyLayers.has(layerName) || !this.layerCache.has(layerName)) {
            this.rebuildLayerCache(layerName);
            this.dirtyLayers.delete(layerName);
        }
        return this.layerCache.get(layerName);
    }

    rebuildLayerCache(layerName) {
        // Create off-screen canvas for layer
        const offCanvas = document.createElement('canvas');
        offCanvas.width = this.canvas.width;
        offCanvas.height = this.canvas.height;
        const offCtx = offCanvas.getContext('2d');
        
        // Draw all objects of this layer
        const layerShapes = window.shapes.filter(shape => (shape.layer || '0') === layerName);
        
        for (const shape of layerShapes) {
            if (this.isShapeInViewport(shape)) {
                window.shapeHandler.execute('render', shape.type, offCtx, shape, window.zoom, -1);
            }
        }
        
        this.layerCache.set(layerName, offCanvas);
    }

    invalidateLayer(layerName) {
        this.dirtyLayers.add(layerName);
    }

    // === SPATIAL INDEXING (QuadTree) ===
    rebuildSpatialIndex() {
        this.spatialIndex.clear();
        
        for (let i = 0; i < window.shapes.length; i++) {
            const shape = window.shapes[i];
            const bounds = window.shapeHandler.execute('getBounds', shape.type, shape);
            if (bounds) {
                this.spatialIndex.insert({
                    x: bounds.minX,
                    y: bounds.minY,
                    width: bounds.maxX - bounds.minX,
                    height: bounds.maxY - bounds.minY,
                    shapeIndex: i
                });
            }
        }
    }

    getVisibleShapes() {
        return this.spatialIndex.retrieve(this.viewportBounds);
    }

    // === DIRTY RECTANGLE SYSTEM ===
    markDirty(bounds) {
        this.dirtyRegions.push(bounds);
    }

    markShapeDirty(shapeIndex) {
        const shape = window.shapes[shapeIndex];
        if (shape) {
            const bounds = window.shapeHandler.execute('getBounds', shape.type, shape);
            if (bounds) {
                this.markDirty(bounds);
                this.invalidateLayer(shape.layer || '0');
            }
        }
    }

    // === OPTIMIZED RENDERING METHODS ===
    performFullRedraw(zoom, offsetX, offsetY) {
        // Clear entire canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set transformation
        this.ctx.setTransform(zoom, 0, 0, -zoom, offsetX, this.canvas.height - offsetY);
        
        // Draw grid
        this.drawGrid();
        
        // OPTIMIZATION: Group by layers for better caching
        const layerGroups = this.groupShapesByLayer();
        
        for (const [layerName, shapes] of layerGroups) {
            const layer = this.getLayer(layerName);
            if (!layer || !layer.visible) continue;
            
            // VIEWPORT CULLING: Render only visible objects
            for (const [index, shape] of shapes) {
                if (this.isShapeInViewport(shape)) {
                    window.shapeHandler.execute('render', shape.type, this.ctx, shape, zoom, index);
                }
            }
        }
        
        // Draw preview and UI elements
        this.drawPreviews(zoom);
        this.drawSelectionHandles(zoom);
    }

    performPartialRedraw(zoom, offsetX, offsetY) {
        // For partial redraw - currently using full
        // TODO: Implement real partial redraw with dirty rectangles
        this.performFullRedraw(zoom, offsetX, offsetY);
    }

    // === BATCH OPERATIONS ===
    addToRenderQueue(operation, ...args) {
        this.renderQueue.push({ operation, args });
    }

    flushRenderQueue() {
        for (const { operation, args } of this.renderQueue) {
            this[operation](...args);
        }
        this.renderQueue = [];
    }

    // === UTILITY METHODS ===
    groupShapesByLayer() {
        const groups = new Map();
        
        for (let i = 0; i < window.shapes.length; i++) {
            const shape = window.shapes[i];
            const layerName = shape.layer || '0';
            
            if (!groups.has(layerName)) {
                groups.set(layerName, []);
            }
            groups.get(layerName).push([i, shape]);
        }
        
        return groups;
    }

    getLayer(layerName) {
        return window.layers?.find(l => l.name === layerName) || null;
    }

    drawGrid() {
        if (window.drawGrid) {
            window.drawGrid();
        }
    }

    drawPreviews(zoom) {
        // Draw all active previews
        if (window._redraw) {
            // Call part of original _redraw that draws previews
            // TODO: Extract preview code into separate methods
        }
    }

    drawSelectionHandles(zoom) {
        // Draw selection handles for selected objects
        if (window.selectedShapes) {
            for (const index of window.selectedShapes) {
                const shape = window.shapes[index];
                if (shape && this.isShapeInViewport(shape)) {
                    const handles = window.shapeHandler.execute('getHandles', shape.type, shape);
                    if (handles) {
                        this.renderHandles(handles, zoom);
                    }
                }
            }
        }
    }

    renderHandles(handles, zoom) {
        this.ctx.save();
        const handleSize = 4 / zoom;
        
        for (const handle of handles) {
            this.ctx.fillStyle = this.getHandleColor(handle.type);
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1 / zoom;
            
            if (handle.type === 'midpoint') {
                this.ctx.beginPath();
                this.ctx.arc(handle.x, handle.y, handleSize/2, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
            } else {
                this.ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
                this.ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
            }
        }
        this.ctx.restore();
    }

    getHandleColor(type) {
        switch(type) {
            case 'endpoint': return '#ff0000';
            case 'midpoint': return '#0000ff';
            case 'center': return '#00ff00';
            default: return '#ffff00';
        }
    }
}

// Simple QuadTree for spatial indexing
class QuadTree {
    constructor(x, y, width, height, maxObjects = 10, maxLevels = 5, level = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
        
        this.objects = [];
        this.nodes = [];
    }

    clear() {
        this.objects = [];
        for (const node of this.nodes) {
            if (node) node.clear();
        }
        this.nodes = [];
    }

    insert(rect) {
        if (this.nodes.length > 0) {
            const index = this.getIndex(rect);
            if (index !== -1) {
                this.nodes[index].insert(rect);
                return;
            }
        }

        this.objects.push(rect);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (this.nodes.length === 0) {
                this.split();
            }

            let i = 0;
            while (i < this.objects.length) {
                const index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                } else {
                    i++;
                }
            }
        }
    }

    retrieve(rect) {
        const returnObjects = [...this.objects];
        
        if (this.nodes.length > 0) {
            const index = this.getIndex(rect);
            if (index !== -1) {
                returnObjects.push(...this.nodes[index].retrieve(rect));
            } else {
                for (const node of this.nodes) {
                    returnObjects.push(...node.retrieve(rect));
                }
            }
        }
        
        return returnObjects;
    }

    getIndex(rect) {
        const verticalMidpoint = this.x + this.width / 2;
        const horizontalMidpoint = this.y + this.height / 2;
        
        const topQuadrant = rect.y < horizontalMidpoint && rect.y + rect.height < horizontalMidpoint;
        const bottomQuadrant = rect.y > horizontalMidpoint;
        
        if (rect.x < verticalMidpoint && rect.x + rect.width < verticalMidpoint) {
            if (topQuadrant) return 1;
            else if (bottomQuadrant) return 2;
        } else if (rect.x > verticalMidpoint) {
            if (topQuadrant) return 0;
            else if (bottomQuadrant) return 3;
        }
        
        return -1;
    }

    split() {
        const subWidth = this.width / 2;
        const subHeight = this.height / 2;
        const x = this.x;
        const y = this.y;
        
        this.nodes[0] = new QuadTree(x + subWidth, y, subWidth, subHeight, this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[1] = new QuadTree(x, y, subWidth, subHeight, this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[2] = new QuadTree(x, y + subHeight, subWidth, subHeight, this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[3] = new QuadTree(x + subWidth, y + subHeight, subWidth, subHeight, this.maxObjects, this.maxLevels, this.level + 1);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.OptimizedRenderer = OptimizedRenderer;
    window.QuadTree = QuadTree;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OptimizedRenderer, QuadTree };
}
/*
 * Unified Event System - Web1CAD Optimization
 * © 2025 Oleh Korobkov. All rights reserved.
 * 
 * OPTIMIZATION: Centralized handling of all events with throttling and batching
 */

class UnifiedEventSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.events = new Map();
        this.throttleTimers = new Map();
        this.batchQueue = [];
        
        // OPTIMIZATION: Debounce/Throttle settings
        this.throttleDelays = {
            mousemove: 16, // ~60 FPS
            wheel: 10,     // Smooth zooming
            resize: 100,   // Debounce window resize
            keydown: 50    // Prevent key spam
        };
        
        // OPTIMIZATION: Event pooling to reduce GC
        this.eventPool = [];
        this.maxPoolSize = 100;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Central handler for all events
        const eventTypes = [
            'mousedown', 'mouseup', 'mousemove', 'mouseleave', 
            'wheel', 'keydown', 'keyup', 'contextmenu'
        ];
        
        for (const eventType of eventTypes) {
            this.canvas.addEventListener(eventType, (e) => {
                this.handleEvent(eventType, e);
            }, { passive: false });
        }
        
        // Window events
        window.addEventListener('resize', (e) => {
            this.handleEvent('resize', e);
        });
    }

    // === CENTRAL EVENT HANDLER ===
    handleEvent(eventType, originalEvent) {
        // OPTIMIZATION: Event pooling
        const event = this.getPooledEvent(eventType, originalEvent);
        
        // OPTIMIZATION: Throttling for performance-critical events
        if (this.shouldThrottle(eventType)) {
            this.throttleEvent(eventType, event);
            return;
        }
        
        // Immediate processing for critical events
        this.processEvent(event);
        this.returnEventToPool(event);
    }

    shouldThrottle(eventType) {
        return this.throttleDelays.hasOwnProperty(eventType);
    }

    throttleEvent(eventType, event) {
        const delay = this.throttleDelays[eventType];
        
        // Clear previous timer if exists
        if (this.throttleTimers.has(eventType)) {
            clearTimeout(this.throttleTimers.get(eventType));
        }
        
        // Create new throttle timer
        const timer = setTimeout(() => {
            this.processEvent(event);
            this.returnEventToPool(event);
            this.throttleTimers.delete(eventType);
        }, delay);
        
        this.throttleTimers.set(eventType, timer);
    }

    // === EVENT PROCESSING ===
    processEvent(event) {
        // OPTIMIZATION: Preprocessed coordinates for fast access
        if (this.isMouseEvent(event.type)) {
            this.preprocessMouseEvent(event);
        }
        
        // Dispatch to appropriate handler
        switch(event.type) {
            case 'mousedown':
                this.handleMouseDown(event);
                break;
            case 'mouseup':
                this.handleMouseUp(event);
                break;
            case 'mousemove':
                this.handleMouseMove(event);
                break;
            case 'mouseleave':
                this.handleMouseLeave(event);
                break;
            case 'wheel':
                this.handleWheel(event);
                break;
            case 'keydown':
                this.handleKeyDown(event);
                break;
            case 'keyup':
                this.handleKeyUp(event);
                break;
            case 'resize':
                this.handleResize(event);
                break;
        }
    }

    // === MOUSE EVENT PREPROCESSING ===
    preprocessMouseEvent(event) {
        // OPTIMIZATION: Cache all needed coordinates at once
        event.canvasX = event.offsetX;
        event.canvasY = event.offsetY;
        
        // World coordinates
        [event.worldX, event.worldY] = window.screenToWorld(event.canvasX, event.canvasY);
        
        // Object snapping
        const osnap = window.findOsnap(event.worldX, event.worldY);
        if (osnap) {
            event.snapX = osnap.x;
            event.snapY = osnap.y;
            event.hasSnap = true;
        } else {
            [event.snapX, event.snapY] = window.applySnap(event.worldX, event.worldY);
            event.hasSnap = false;
        }
        
        // Final coordinates
        event.finalX = event.snapX;
        event.finalY = event.snapY;
        
        // Mouse state
        event.isLeftButton = event.button === 0;
        event.isMiddleButton = event.button === 1;
        event.isRightButton = event.button === 2;
        
        // Modifier keys
        event.isShift = event.shiftKey;
        event.isCtrl = event.ctrlKey || event.metaKey;
        event.isAlt = event.altKey;
    }

    isMouseEvent(eventType) {
        return ['mousedown', 'mouseup', 'mousemove', 'mouseleave'].includes(eventType);
    }

    // === UNIFIED MODE HANDLING ===
    handleMouseDown(event) {
        if (event.isMiddleButton) {
            this.handleMiddleClick(event);
            return;
        }
        
        if (!event.isLeftButton) return;
        
        // OPTIMIZATION: Single dispatch table instead of multiple switch
        const handler = this.getModeHandler(window.mode, 'mousedown');
        if (handler) {
            handler(event);
        }
    }

    handleMouseUp(event) {
        if (event.isMiddleButton) {
            this.handleMiddleRelease(event);
            return;
        }
        
        const handler = this.getModeHandler(window.mode, 'mouseup');
        if (handler) {
            handler(event);
        }
    }

    handleMouseMove(event) {
        // OPTIMIZATION: Batching coordinates for smooth preview
        this.updateCursorDisplay(event);
        
        // Handle panning
        if (window.isPanning) {
            this.handlePanning(event);
            return;
        }
        
        // Handle mode-specific mousemove
        const handler = this.getModeHandler(window.mode, 'mousemove');
        if (handler) {
            handler(event);
        }
    }

    handleMouseLeave(event) {
        // Cleanup on canvas exit
        this.clearCursorDisplay();
        this.stopAllPreviews();
    }

    // === MODE HANDLER LOOKUP ===
    getModeHandler(mode, eventType) {
        // OPTIMIZATION: Map lookup instead of switch
        const handlerKey = `${mode}_${eventType}`;
        
        if (!this.modeHandlers) {
            this.initializeModeHandlers();
        }
        
        return this.modeHandlers.get(handlerKey);
    }

    initializeModeHandlers() {
        this.modeHandlers = new Map([
            // Select mode
            ['select_mousedown', this.handleSelectMouseDown.bind(this)],
            ['select_mouseup', this.handleSelectMouseUp.bind(this)],
            ['select_mousemove', this.handleSelectMouseMove.bind(this)],
            
            // Drawing modes
            ['line_mousedown', this.handleLineMouseDown.bind(this)],
            ['line_mousemove', this.handleLineMouseMove.bind(this)],
            
            ['circle_mousedown', this.handleCircleMouseDown.bind(this)],
            ['circle_mousemove', this.handleCircleMouseMove.bind(this)],
            
            ['polyline_mousedown', this.handlePolylineMouseDown.bind(this)],
            ['polyline_mousemove', this.handlePolylineMouseMove.bind(this)],
            
            // Edit modes
            ['move_mousedown', this.handleMoveMouseDown.bind(this)],
            ['move_mousemove', this.handleMoveMouseMove.bind(this)],
            
            ['copy_mousedown', this.handleCopyMouseDown.bind(this)],
            ['copy_mousemove', this.handleCopyMouseMove.bind(this)],
            
            // ... add all other modes
        ]);
    }

    // === OPTIMIZED MODE HANDLERS ===
    handleSelectMouseDown(event) {
        // Optimized select mode logic
        if (event.isShift) {
            // Multi-select - do not clear previous selection
        } else {
            window.clearSelection();
        }
        
        // Fast hit test through spatial index
        const hitShapes = this.getShapesAtPoint(event.finalX, event.finalY);
        
        if (hitShapes.length > 0) {
            this.selectShape(hitShapes[0], event.isShift);
        } else {
            this.startSelectionWindow(event);
        }
    }

    handleLineMouseDown(event) {
        if (!window.isDrawing) {
            // Start line drawing
            window.startX = event.finalX;
            window.startY = event.finalY;
            window.isDrawing = true;
            window.updateHelpBar('Click end point for line');
        } else {
            // Complete line
            this.createLine(window.startX, window.startY, event.finalX, event.finalY);
            window.isDrawing = false;
            window.setMode('select');
        }
    }

    handleLineMouseMove(event) {
        if (window.isDrawing) {
            window.previewX = event.finalX;
            window.previewY = event.finalY;
            window.redraw();
        }
    }

    // === UTILITY METHODS ===
    getShapesAtPoint(x, y) {
        // OPTIMIZATION: Use spatial index for fast hit testing
        if (window.optimizedRenderer && window.optimizedRenderer.spatialIndex) {
            const candidates = window.optimizedRenderer.spatialIndex.retrieve({
                x: x - 5, y: y - 5, width: 10, height: 10
            });
            
            return candidates.filter(candidate => {
                const shape = window.shapes[candidate.shapeIndex];
                return window.shapeHandler.execute('hitTest', shape.type, shape, x, y, 5);
            }).map(candidate => candidate.shapeIndex);
        }
        
        // Fallback to linear search
        const hits = [];
        for (let i = window.shapes.length - 1; i >= 0; i--) {
            const shape = window.shapes[i];
            if (window.shapeHandler.execute('hitTest', shape.type, shape, x, y, 5)) {
                hits.push(i);
            }
        }
        return hits;
    }

    selectShape(shapeIndex, addToSelection = false) {
        if (!addToSelection) {
            window.selectedShapes.clear();
        }
        
        if (window.selectedShapes.has(shapeIndex)) {
            window.selectedShapes.delete(shapeIndex);
        } else {
            window.selectedShapes.add(shapeIndex);
        }
        
        window.redraw();
    }

    startSelectionWindow(event) {
        window.startX = event.finalX;
        window.startY = event.finalY;
        window.isDrawing = true;
        
        // Show selection window UI
        const [sx, sy] = window.worldToScreen(event.finalX, event.finalY);
        window.selectionWindow.style.left = `${sx}px`;
        window.selectionWindow.style.top = `${sy}px`;
        window.selectionWindow.style.width = '0px';
        window.selectionWindow.style.height = '0px';
        window.selectionWindow.style.display = 'block';
    }

    createLine(x1, y1, x2, y2) {
        const line = {
            type: 'line',
            x1, y1, x2, y2,
            color: window.currentColor,
            lineWeight: window.currentLineWeight,
            layer: window.currentLayer
        };
        
        window.addShape(line);
        window.redraw();
    }

    // === PERFORMANCE HELPERS ===
    updateCursorDisplay(event) {
        if (window.cursorCoordsElement) {
            window.cursorCoordsElement.textContent = `X: ${event.finalX.toFixed(2)} Y: ${event.finalY.toFixed(2)}`;
        }
    }

    clearCursorDisplay() {
        if (window.cursorCoordsElement) {
            window.cursorCoordsElement.textContent = 'X: - Y: -';
        }
    }

    stopAllPreviews() {
        window.previewX = undefined;
        window.previewY = undefined;
        window.redraw();
    }

    handlePanning(event) {
        window.offsetX += event.clientX - window.panStartX;
        window.offsetY -= event.clientY - window.panStartY;
        window.panStartX = event.clientX;
        window.panStartY = event.clientY;
        window.redraw();
    }

    handleMiddleClick(event) {
        event.preventDefault();
        const currentTime = Date.now();
        if (currentTime - window.lastMiddleClickTime < 400) {
            window.zoomToFit();
            window.redraw();
            return;
        }
        window.lastMiddleClickTime = currentTime;
        
        window.isPanning = true;
        window.panStartX = event.clientX;
        window.panStartY = event.clientY;
        this.canvas.style.cursor = 'grab';
    }

    handleMiddleRelease(event) {
        window.isPanning = false;
        this.canvas.style.cursor = 'crosshair';
    }

    handleWheel(event) {
        event.preventDefault();
        const factor = 1.1;
        const [mx, my] = window.screenToWorld(event.offsetX, event.offsetY);
        window.zoom *= (event.deltaY < 0) ? factor : 1 / factor;
        window.zoom = Math.max(0.001, Math.min(1000, window.zoom));
        window.offsetX = event.offsetX - mx * window.zoom;
        window.offsetY = this.canvas.height - event.offsetY - my * window.zoom;
        
        window.redraw();
    }

    handleKeyDown(event) {
        if (window.isUserTypingInInput()) return;
        
        // OPTIMIZATION: Map lookup for hotkeys
        const handler = this.getKeyHandler(event.key, event.ctrlKey, event.shiftKey);
        if (handler) {
            event.preventDefault();
            handler(event);
        }
    }

    getKeyHandler(key, ctrl, shift) {
        const keyCode = `${ctrl ? 'ctrl+' : ''}${shift ? 'shift+' : ''}${key.toLowerCase()}`;
        
        if (!this.keyHandlers) {
            this.initializeKeyHandlers();
        }
        
        return this.keyHandlers.get(keyCode);
    }

    initializeKeyHandlers() {
        this.keyHandlers = new Map([
            ['escape', () => window.cancelCurrentOperation()],
            ['delete', () => window.deleteSelected()],
            ['ctrl+z', () => window.undo()],
            ['ctrl+y', () => window.redo()],
            ['ctrl+c', () => window.copySelected()],
            ['ctrl+v', () => window.pasteSelected()],
            ['ctrl+a', () => window.selectAll()],
            ['ctrl+s', () => window.saveDrawing()],
            ['ctrl+o', () => window.openDrawing()],
            ['ctrl+n', () => window.newDrawing()],
            ['l', () => window.setMode('line')],
            ['c', () => window.setMode('circle')],
            ['r', () => window.setMode('rectangle')],
            ['p', () => window.setMode('polyline')],
            // ... add all hotkeys
        ]);
    }

    handleKeyUp(event) {
        // Handle key release events if needed
    }

    handleResize(event) {
        // Debounced canvas resize
        if (this.canvas && window.resizeCanvas) {
            window.resizeCanvas();
        }
    }

    // === EVENT POOLING ===
    getPooledEvent(type, originalEvent) {
        let pooledEvent;
        
        if (this.eventPool.length > 0) {
            pooledEvent = this.eventPool.pop();
            this.resetEvent(pooledEvent);
        } else {
            pooledEvent = {};
        }
        
        // Copy necessary properties
        Object.assign(pooledEvent, {
            type,
            offsetX: originalEvent.offsetX,
            offsetY: originalEvent.offsetY,
            clientX: originalEvent.clientX,
            clientY: originalEvent.clientY,
            button: originalEvent.button,
            shiftKey: originalEvent.shiftKey,
            ctrlKey: originalEvent.ctrlKey,
            metaKey: originalEvent.metaKey,
            altKey: originalEvent.altKey,
            key: originalEvent.key,
            deltaY: originalEvent.deltaY,
            preventDefault: originalEvent.preventDefault?.bind(originalEvent)
        });
        
        return pooledEvent;
    }

    returnEventToPool(event) {
        if (this.eventPool.length < this.maxPoolSize) {
            this.resetEvent(event);
            this.eventPool.push(event);
        }
    }

    resetEvent(event) {
        // Clear all properties event
        Object.keys(event).forEach(key => {
            delete event[key];
        });
    }
}

// Initialization
if (typeof window !== 'undefined') {
    window.UnifiedEventSystem = UnifiedEventSystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedEventSystem;
}
/*
 * Web1CAD Optimization Integration
 * © 2025 Oleh Korobkov. All rights reserved.
 * 
 * OPTIMIZATION: Integration of all optimizations into existing system
 */

class Web1CADOptimizer {
    constructor() {
        this.isInitialized = false;
        this.optimizations = {
            unifiedShapeHandler: false,
            optimizedRenderer: false,
            unifiedEventSystem: false,
            memoryManager: false
        };
    }

    // === MAIN INITIALIZATION ===
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing Web1CAD optimizations...');
        
        try {
            // 1. Initialize Memory Manager (first, because others depend on it)
            this.initializeMemoryManager();
            
            // 2. Initialize Unified Shape Handler
            this.initializeShapeHandler();
            
            // 3. Initialize Optimized Renderer
            this.initializeRenderer();
            
            // 4. Initialize Unified Event System
            this.initializeEventSystem();
            
            // 5. Hook into existing system
            this.hookIntoExistingSystem();
            
            // 6. Performance monitoring
            this.setupPerformanceMonitoring();
            
            this.isInitialized = true;
            console.log('✅ Web1CAD optimizations initialized successfully!');
            console.log('📊 Active optimizations:', this.optimizations);
            
        } catch (error) {
            console.error('❌ Failed to initialize optimizations:', error);
        }
    }

    // === MEMORY MANAGER ===
    initializeMemoryManager() {
        if (window.MemoryManager) {
            window.memoryManager = new window.MemoryManager();
            window.performanceMonitor = new window.PerformanceMonitor();
            
            // Wrap existing functions for memory optimization
            window.memoryManager.wrapShapeOperations();
            
            this.optimizations.memoryManager = true;
            console.log('✅ Memory Manager initialized');
        }
    }

    // === SHAPE HANDLER ===
    initializeShapeHandler() {
        if (window.ShapeHandler) {
            window.shapeHandler = new window.ShapeHandler();
            this.optimizations.unifiedShapeHandler = true;
            console.log('✅ Unified Shape Handler initialized');
        }
    }

    // === OPTIMIZED RENDERER ===
    initializeRenderer() {
        if (window.OptimizedRenderer && window.canvas && window.ctx) {
            window.optimizedRenderer = new window.OptimizedRenderer(window.canvas, window.ctx);
            
            // Replace original redraw function
            this.wrapRedrawFunction();
            
            this.optimizations.optimizedRenderer = true;
            console.log('✅ Optimized Renderer initialized');
        }
    }

    wrapRedrawFunction() {
        if (window.redraw && window.optimizedRenderer) {
            const originalRedraw = window.redraw;
            
            window.redraw = function(forceFullRedraw = false) {
                if (window.optimizedRenderer) {
                    window.optimizedRenderer.redraw(
                        window.zoom, 
                        window.offsetX, 
                        window.offsetY, 
                        forceFullRedraw
                    );
                } else {
                    originalRedraw();
                }
            };
            
            console.log('✅ Redraw function wrapped with optimization');
        }
    }

    // === EVENT SYSTEM ===
    initializeEventSystem() {
        if (window.UnifiedEventSystem && window.canvas) {
            window.unifiedEventSystem = new window.UnifiedEventSystem(window.canvas);
            this.optimizations.unifiedEventSystem = true;
            console.log('✅ Unified Event System initialized');
        }
    }

    // === SYSTEM INTEGRATION ===
    hookIntoExistingSystem() {
        // Hook into shape operations
        this.optimizeShapeOperations();
        
        // Hook into selection system
        this.optimizeSelectionSystem();
        
        // Hook into drawing modes
        this.optimizeDrawingModes();
        
        // Hook into file operations
        this.optimizeFileOperations();
    }

    optimizeShapeOperations() {
        // Optimize addShape function
        if (window.addShape && window.shapeHandler) {
            const originalAddShape = window.addShape;
            
            window.addShape = function(shapeData) {
                // Use memory-optimized shape creation
                if (window.memoryManager) {
                    const optimizedShape = window.memoryManager.createOptimizedShape(shapeData.type, shapeData);
                    return originalAddShape(optimizedShape);
                }
                return originalAddShape(shapeData);
            };
        }
        
        // Optimize moveShape function
        if (window.moveShape && window.shapeHandler) {
            const originalMoveShape = window.moveShape;
            
            window.moveShape = function(shape, dx, dy) {
                const result = window.shapeHandler.execute('move', shape.type, shape, dx, dy);
                if (result) {
                    // Mark shape dirty for rendering optimization
                    if (window.optimizedRenderer) {
                        const shapeIndex = window.shapes.indexOf(shape);
                        window.optimizedRenderer.markShapeDirty(shapeIndex);
                    }
                    return result;
                }
                return originalMoveShape(shape, dx, dy);
            };
        }
    }

    optimizeSelectionSystem() {
        // Optimize isPointInShape function
        if (window.isPointInShape && window.shapeHandler) {
            const originalIsPointInShape = window.isPointInShape;
            
            window.isPointInShape = function(shape, x, y) {
                const result = window.shapeHandler.execute('hitTest', shape.type, shape, x, y, 5);
                if (result !== null) {
                    return result;
                }
                return originalIsPointInShape(shape, x, y);
            };
        }
    }

    optimizeDrawingModes() {
        // Performance wrap drawing functions
        if (window.performanceMonitor) {
            const functionsToWrap = [
                'handleLineMode', 'handleCircleMode', 'handlePolylineMode',
                'handleArcMode', 'handleRectangleMode', 'handlePolygonMode'
            ];
            
            for (const funcName of functionsToWrap) {
                if (window[funcName]) {
                    window[funcName] = window.performanceMonitor.measureFunction(
                        window[funcName], 
                        funcName
                    );
                }
            }
        }
    }

    optimizeFileOperations() {
        // Optimize save/load operations with memory management
        if (window.saveDrawing && window.memoryManager) {
            const originalSaveDrawing = window.saveDrawing;
            
            window.saveDrawing = function() {
                // Use optimized serialization
                const optimizedShapes = window.shapes.map(shape => 
                    window.memoryManager.serializeShapeOptimized(shape)
                );
                
                // Temporarily replace shapes for serialization
                const originalShapes = window.shapes;
                window.shapes = optimizedShapes;
                
                const result = originalSaveDrawing();
                
                // Restore original shapes
                window.shapes = originalShapes;
                
                return result;
            };
        }
    }

    // === PERFORMANCE MONITORING ===
    setupPerformanceMonitoring() {
        if (window.performanceMonitor) {
            // Monitor critical functions including enhanced rendering
            const criticalFunctions = [
                'redraw', '_redraw', 'renderStandardShapes', 
                'drawShape', 'drawEnhancedText', 'drawEnhancedMText'
            ];
            
            for (const funcName of criticalFunctions) {
                if (window[funcName]) {
                    window[funcName] = window.performanceMonitor.measureFunction(
                        window[funcName], 
                        funcName
                    );
                }
            }
            
            // Setup periodic performance reporting
            setInterval(() => {
                const metrics = window.performanceMonitor.getMetrics();
                const memoryReport = window.memoryManager?.getMemoryReport();
                
                if (Object.keys(metrics).length > 0) {
                    console.log('📊 Performance metrics:', metrics);
                }
                
                if (memoryReport) {
                    console.log('🧠 Memory report:', memoryReport);
                }
            }, 60000); // Every minute
        }
    }

    // === DIAGNOSTIC TOOLS ===
    runDiagnostics() {
        console.log('🔍 Running Web1CAD diagnostics...');
        
        const diagnostics = {
            optimizations: this.optimizations,
            shapeCount: window.shapes?.length || 0,
            selectedCount: window.selectedShapes?.size || 0,
            memoryStats: window.memoryManager?.getMemoryReport(),
            performanceMetrics: window.performanceMonitor?.getMetrics(),
            canvasSize: window.canvas ? {
                width: window.canvas.width,
                height: window.canvas.height
            } : null,
            zoom: window.zoom,
            mode: window.mode
        };
        
        console.table(diagnostics);
        return diagnostics;
    }

    // === OPTIMIZATION CONTROLS ===
    enableOptimization(name) {
        switch(name) {
            case 'renderer':
                if (!this.optimizations.optimizedRenderer) {
                    this.initializeRenderer();
                }
                break;
            case 'events':
                if (!this.optimizations.unifiedEventSystem) {
                    this.initializeEventSystem();
                }
                break;
            case 'memory':
                if (!this.optimizations.memoryManager) {
                    this.initializeMemoryManager();
                }
                break;
            case 'shapes':
                if (!this.optimizations.unifiedShapeHandler) {
                    this.initializeShapeHandler();
                }
                break;
        }
    }

    disableOptimization(name) {
        // Implementation for disabling specific optimizations
        console.warn(`Disabling ${name} optimization not fully implemented`);
    }

    // === BENCHMARKING ===
    async runBenchmark() {
        console.log('🏃 Running performance benchmark...');
        
        const results = {};
        
        // Benchmark shape creation
        const startTime = performance.now();
        const testShapes = [];
        
        for (let i = 0; i < 1000; i++) {
            testShapes.push({
                type: 'line',
                x1: Math.random() * 1000,
                y1: Math.random() * 1000,
                x2: Math.random() * 1000,
                y2: Math.random() * 1000
            });
        }
        
        results.shapeCreation = performance.now() - startTime;
        
        // Benchmark rendering
        const renderStart = performance.now();
        if (window.redraw) {
            window.redraw(true); // Force full redraw
        }
        results.rendering = performance.now() - renderStart;
        
        // Benchmark hit testing
        const hitTestStart = performance.now();
        for (let i = 0; i < 100; i++) {
            if (window.isPointInShape && window.shapes.length > 0) {
                window.isPointInShape(window.shapes[0], Math.random() * 100, Math.random() * 100);
            }
        }
        results.hitTesting = performance.now() - hitTestStart;
        
        console.log('📈 Benchmark results:', results);
        return results;
    }
}

// === AUTO-INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    // Wait for full CAD system loading
    const initializeOptimizations = () => {
        if (window.canvas && window.ctx && window.shapes !== undefined) {
            window.web1cadOptimizer = new Web1CADOptimizer();
            window.web1cadOptimizer.initialize();
            
            // Add global functions for easy access
            window.optimizeCAD = () => window.web1cadOptimizer.initialize();
            window.diagnostics = () => window.web1cadOptimizer.runDiagnostics();
            window.benchmark = () => window.web1cadOptimizer.runBenchmark();
            window.forceCleanup = () => window.memoryManager?.forceCleanup();
            
        } else {
            // Retry after 100ms if CAD system not ready
            setTimeout(initializeOptimizations, 100);
        }
    };
    
    // Start initialization after a short delay
    setTimeout(initializeOptimizations, 500);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Web1CADOptimizer;
}

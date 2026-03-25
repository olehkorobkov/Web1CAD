// ============================================================================
// LAYER VISIBILITY CACHE - Skip rendering shapes on hidden layers
// ============================================================================
// Caches layer visibility state to avoid checking every shape's layer property
// during rendering. Major performance improvement for drawings with many layers.
// ============================================================================

let layerVisibilityCache = new Map(); // layer name -> isVisible boolean
let layerCacheValid = false;

/**
 * Build or rebuild the layer visibility cache
 * Must be called whenever layer visibility or properties change
 */
function rebuildLayerVisibilityCache() {
    layerVisibilityCache.clear();
    
    if (typeof getLayers !== 'function') {
        layerCacheValid = true;
        return;
    }
    
    const layers = getLayers();
    if (!layers) {
        layerCacheValid = true;
        return;
    }
    
    // For each layer, determine if it's visible
    for (const layerName in layers) {
        if (layers.hasOwnProperty(layerName)) {
            const layer = layers[layerName];
            // Layer is visible if it's not locked AND not hidden
            const isVisible = layer && !layer.hidden && !layer.locked;
            layerVisibilityCache.set(layerName, isVisible);
        }
    }
    
    layerCacheValid = true;
}

/**
 * Check if a shape should be rendered based on its layer visibility
 * @param {Object} shape - The shape to check
 * @returns {boolean} True if shape should be rendered
 */
function isShapeLayerVisible(shape) {
    if (!shape || !shape.layer) return true;
    
    // Ensure cache is valid
    if (!layerCacheValid) {
        rebuildLayerVisibilityCache();
    }
    
    // Check cache - default to visible if layer not in cache
    return layerVisibilityCache.get(shape.layer) !== false;
}

/**
 * Get visibility status for a specific layer
 * @param {string} layerName - The layer name to check
 * @returns {boolean} True if layer is visible
 */
function getLayerVisibility(layerName) {
    if (!layerCacheValid) {
        rebuildLayerVisibilityCache();
    }
    return layerVisibilityCache.get(layerName) !== false;
}

/**
 * Invalidate the layer visibility cache
 * Call this whenever layer properties change
 */
function invalidateLayerVisibilityCache() {
    layerCacheValid = false;
}

/**
 * Filter shapes by layer visibility
 * Returns only shapes whose layers are visible
 * @param {Array} shapesToFilter - Array of shape indices to filter
 * @returns {Array} Filtered array of visible shape indices
 */
function filterShapesByLayerVisibility(shapesToFilter) {
    if (!layerCacheValid) {
        rebuildLayerVisibilityCache();
    }
    
    return shapesToFilter.filter(index => {
        if (index >= shapes.length) return false;
        const shape = shapes[index];
        return shape && isShapeLayerVisible(shape);
    });
}

/**
 * Count how many shapes would be culled by layer visibility
 * @returns {Object} {visibleCount, culledCount}
 */
function getLayerVisibilityStats() {
    let visibleCount = 0;
    let culledCount = 0;
    
    for (const shape of shapes) {
        if (isShapeLayerVisible(shape)) {
            visibleCount++;
        } else {
            culledCount++;
        }
    }
    
    return { visibleCount, culledCount, totalShapes: shapes.length };
}

// Hook into layer operations to invalidate cache
const originalToggleLayerVisibility = window.toggleLayerVisibility;
if (originalToggleLayerVisibility) {
    window.toggleLayerVisibility = function(layerName) {
        invalidateLayerVisibilityCache();
        return originalToggleLayerVisibility(layerName);
    };
}

const originalToggleLayerLock = window.toggleLayerLock;
if (originalToggleLayerLock) {
    window.toggleLayerLock = function(layerName) {
        invalidateLayerVisibilityCache();
        return originalToggleLayerLock(layerName);
    };
}

const originalCreateLayer = window.createLayer;
if (originalCreateLayer) {
    window.createLayer = function(layerName, properties) {
        invalidateLayerVisibilityCache();
        return originalCreateLayer(layerName, properties);
    };
}

const originalDeleteLayer = window.deleteLayer;
if (originalDeleteLayer) {
    window.deleteLayer = function(layerName) {
        invalidateLayerVisibilityCache();
        return originalDeleteLayer(layerName);
    };
}

// Make functions globally accessible
window.rebuildLayerVisibilityCache = rebuildLayerVisibilityCache;
window.isShapeLayerVisible = isShapeLayerVisible;
window.getLayerVisibility = getLayerVisibility;
window.invalidateLayerVisibilityCache = invalidateLayerVisibilityCache;
window.filterShapesByLayerVisibility = filterShapesByLayerVisibility;
window.getLayerVisibilityStats = getLayerVisibilityStats;

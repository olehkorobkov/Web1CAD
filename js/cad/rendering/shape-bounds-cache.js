// ============================================================================
// SHAPE BOUNDS CACHE - Performance optimization for viewport culling
// ============================================================================
// Caches the bounding boxes of shapes to avoid recalculating them each frame
// when performing viewport culling. Invalidates cache when shapes are modified.
// ============================================================================

let shapeBoundsCache = new Map(); // UUID -> bounds object

/**
 * Get cached bounds for a shape, or calculate and cache if not present
 * @param {Object} shape - The shape object
 * @returns {Object|null} Bounds object {minX, maxX, minY, maxY} or null
 */
function getShapeBounds(shape) {
    if (!shape || !shape.uuid) return null;
    
    // Return cached bounds if available
    if (shapeBoundsCache.has(shape.uuid)) {
        return shapeBoundsCache.get(shape.uuid);
    }
    
    // Calculate and cache bounds
    const bounds = calculateShapeBounds(shape);
    if (bounds) {
        shapeBoundsCache.set(shape.uuid, bounds);
    }
    return bounds;
}

/**
 * Calculate bounds for a shape based on its type
 * @param {Object} shape - The shape to calculate bounds for
 * @returns {Object|null} Bounds object or null
 */
function calculateShapeBounds(shape) {
    if (!shape) return null;
    
    try {
        switch (shape.type) {
            case 'line':
                return {
                    minX: Math.min(shape.x1, shape.x2),
                    maxX: Math.max(shape.x1, shape.x2),
                    minY: Math.min(shape.y1, shape.y2),
                    maxY: Math.max(shape.y1, shape.y2)
                };
            
            case 'circle':
                return {
                    minX: shape.cx - shape.radius,
                    maxX: shape.cx + shape.radius,
                    minY: shape.cy - shape.radius,
                    maxY: shape.cy + shape.radius
                };
            
            case 'ellipse':
                return {
                    minX: shape.cx - shape.rx,
                    maxX: shape.cx + shape.rx,
                    minY: shape.cy - shape.ry,
                    maxY: shape.cy + shape.ry
                };
            
            case 'rectangle':
                return {
                    minX: shape.x,
                    maxX: shape.x + shape.width,
                    minY: shape.y,
                    maxY: shape.y + shape.height
                };
            
            case 'arc':
                // Simplified bounds for arc (circle bounds)
                return {
                    minX: shape.cx - shape.radius,
                    maxX: shape.cx + shape.radius,
                    minY: shape.cy - shape.radius,
                    maxY: shape.cy + shape.radius
                };
            
            case 'point':
                // Point has minimal bounds with 1px margin
                const margin = 5;
                return {
                    minX: shape.x - margin,
                    maxX: shape.x + margin,
                    minY: shape.y - margin,
                    maxY: shape.y + margin
                };
            
            case 'text':
                // Text bounds - approximate based on position
                const textMargin = shape.size * 1.2 || 20;
                return {
                    minX: shape.x - textMargin,
                    maxX: shape.x + textMargin * 4,
                    minY: shape.y - textMargin,
                    maxY: shape.y + textMargin
                };
            
            case 'polyline':
            case 'polygon':
            case 'spline':
                if (!shape.points || shape.points.length === 0) return null;
                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;
                
                for (const point of shape.points) {
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                }
                
                return { minX, maxX, minY, maxY };
            
            default:
                return null;
        }
    } catch (error) {
        console.warn('Error calculating bounds for shape type:', shape.type, error);
        return null;
    }
}

/**
 * Invalidate bounds cache for a specific shape
 * @param {string} uuid - The UUID of the shape to invalidate
 */
function invalidateShapeBoundsCache(uuid) {
    if (uuid) {
        shapeBoundsCache.delete(uuid);
    }
}

/**
 * Invalidate bounds cache for all shapes in a set
 * @param {Set} uuids - Set of UUIDs to invalidate
 */
function invalidateShapeSetBoundsCache(uuids) {
    if (uuids && uuids instanceof Set) {
        for (const uuid of uuids) {
            shapeBoundsCache.delete(uuid);
        }
    }
}

/**
 * Clear entire bounds cache (when shapes array is modified extensively)
 */
function clearShapeBoundsCache() {
    shapeBoundsCache.clear();
}

/**
 * Optimize viewport culling using cached bounds
 * Much faster than checking individual shapes each frame
 * @param {Array} shapesToCheck - Array of shape indices to check
 * @param {Object} viewportBounds - Viewport bounds
 * @returns {Set} Set of visible shape indices
 */
function getVisibleShapesOptimized(shapesToCheck, viewportBounds) {
    const visibleShapes = new Set();
    
    if (!shapesToCheck || !viewportBounds) return visibleShapes;
    
    for (const index of shapesToCheck) {
        if (index >= shapes.length) continue;
        
        const shape = shapes[index];
        if (!shape) continue;
        
        // Use cached bounds
        const bounds = getShapeBounds(shape);
        if (!bounds) {
            visibleShapes.add(index); // If no bounds, assume visible
            continue;
        }
        
        // AABB intersection test
        if (!(bounds.maxX < viewportBounds.minX || 
              bounds.minX > viewportBounds.maxX ||
              bounds.maxY < viewportBounds.minY || 
              bounds.minY > viewportBounds.maxY)) {
            visibleShapes.add(index);
        }
    }
    
    return visibleShapes;
}

// Hook into shape operations to invalidate cache
const originalAddShape = window.addShape;
window.addShape = function(shape) {
    const result = originalAddShape(shape);
    // New shape will get added to cache on first viewport check
    return result;
};

const originalDeleteSelected = window.deleteSelected;
window.deleteSelected = function() {
    // Invalidate cache for all selected shapes before deletion
    if (typeof selectedShapes !== 'undefined') {
        invalidateShapeSetBoundsCache(selectedShapes);
    }
    return originalDeleteSelected();
};

// Make cache functions globally accessible
window.getShapeBounds = getShapeBounds;
window.invalidateShapeBoundsCache = invalidateShapeBoundsCache;
window.invalidateShapeSetBoundsCache = invalidateShapeSetBoundsCache;
window.clearShapeBoundsCache = clearShapeBoundsCache;
window.getVisibleShapesOptimized = getVisibleShapesOptimized;

// ============================================================================
// SPATIAL INDEXING SYSTEM - Grid-based shape lookup
// ============================================================================
// Divides the drawing space into a grid and tracks which shapes are in each cell.
// Dramatically speeds up picking, selection windows, and viewport culling for
// large drawings with thousands of shapes.
// ============================================================================

let spatialGrid = {
    cellSize: 100,      // Size of each grid cell in drawing units
    cells: new Map(),   // Map of "x,y" -> Set of shape indices
    bounds: null,       // Current grid bounds
    isDirty: true       // Needs rebuild
};

/**
 * Build the spatial grid from all shapes
 * Should be called when shapes change significantly
 */
function buildSpatialGrid() {
    const startTime = performance.now();
    
    // Clear existing grid
    spatialGrid.cells.clear();
    
    // Reset grid bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    // Add each shape to grid cells it occupies
    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        if (!shape) continue;
        
        // Get shape bounds
        const bounds = typeof getShapeBounds === 'function' ? 
            getShapeBounds(shape) : null;
        
        if (!bounds) continue;
        
        // Update grid bounds
        minX = Math.min(minX, bounds.minX);
        maxX = Math.max(maxX, bounds.maxX);
        minY = Math.min(minY, bounds.minY);
        maxY = Math.max(maxY, bounds.maxY);
        
        // Find all grid cells this shape occupies
        const cellsToAdd = getCellsForBounds(bounds);
        for (const cellKey of cellsToAdd) {
            if (!spatialGrid.cells.has(cellKey)) {
                spatialGrid.cells.set(cellKey, new Set());
            }
            spatialGrid.cells.get(cellKey).add(i);
        }
    }
    
    spatialGrid.bounds = { minX, maxX, minY, maxY };
    spatialGrid.isDirty = false;
    
    const buildTime = performance.now() - startTime;
    console.log(`Spatial grid built in ${buildTime.toFixed(2)}ms (${spatialGrid.cells.size} cells)`);
}

/**
 * Get all grid cell keys that a bounding box occupies
 * @param {Object} bounds - {minX, maxX, minY, maxY}
 * @returns {Set} Set of "x,y" cell keys
 */
function getCellsForBounds(bounds) {
    const cells = new Set();
    const cellSize = spatialGrid.cellSize;
    
    const minCellX = Math.floor(bounds.minX / cellSize);
    const maxCellX = Math.floor(bounds.maxX / cellSize);
    const minCellY = Math.floor(bounds.minY / cellSize);
    const maxCellY = Math.floor(bounds.maxY / cellSize);
    
    for (let x = minCellX; x <= maxCellX; x++) {
        for (let y = minCellY; y <= maxCellY; y++) {
            cells.add(`${x},${y}`);
        }
    }
    
    return cells;
}

/**
 * Get cell key for a point coordinate
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {string} Cell key "x,y"
 */
function getPointCellKey(x, y) {
    const cellSize = spatialGrid.cellSize;
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    return `${cellX},${cellY}`;
}

/**
 * Get all shapes in a region of the grid
 * @param {Object} bounds - {minX, maxX, minY, maxY}
 * @returns {Set} Set of shape indices in the region
 */
function getShapesInRegion(bounds) {
    if (spatialGrid.isDirty) {
        buildSpatialGrid();
    }
    
    const shapesInRegion = new Set();
    const cells = getCellsForBounds(bounds);
    
    for (const cellKey of cells) {
        const cellShapes = spatialGrid.cells.get(cellKey);
        if (cellShapes) {
            for (const shapeIndex of cellShapes) {
                shapesInRegion.add(shapeIndex);
            }
        }
    }
    
    return shapesInRegion;
}

/**
 * Find shapes near a point (for picking/selection)
 * Much faster than checking all shapes
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {number} tolerance - Search radius in drawing units
 * @returns {Array} Array of shape indices near the point, sorted by distance
 */
function findShapesNearPoint(x, y, tolerance) {
    if (spatialGrid.isDirty) {
        buildSpatialGrid();
    }
    
    // Get candidate shapes from nearby cells
    const searchBounds = {
        minX: x - tolerance,
        maxX: x + tolerance,
        minY: y - tolerance,
        maxY: y + tolerance
    };
    
    const candidates = getShapesInRegion(searchBounds);
    
    // Filter and sort by actual distance
    const sortedResults = Array.from(candidates)
        .map(index => {
            const shape = shapes[index];
            if (!shape) return null;
            
            // Calculate actual distance to shape
            let distance = Infinity;
            
            // Simple point-in-shape check for now
            // In real implementation, would use isPointInShape
            if (typeof isPointInShape === 'function') {
                if (isPointInShape(shape, x, y)) {
                    distance = 0;
                }
            }
            
            return { index, distance };
        })
        .filter(r => r && r.distance <= tolerance)
        .sort((a, b) => a.distance - b.distance)
        .map(r => r.index);
    
    return sortedResults;
}

/**
 * Invalidate spatial grid (must be rebuilt before next use)
 */
function invalidateSpatialGrid() {
    spatialGrid.isDirty = true;
}

/**
 * Get spatial grid statistics
 * @returns {Object} Statistics about the grid
 */
function getSpatialGridStats() {
    return {
        cellSize: spatialGrid.cellSize,
        totalCells: spatialGrid.cells.size,
        isDirty: spatialGrid.isDirty,
        bounds: spatialGrid.bounds,
        totalShapes: shapes.length
    };
}

// Hook into shape operations to invalidate grid
const originalAddShapeToGrid = window.addShape;
window.addShape = function(shape) {
    invalidateSpatialGrid();
    return originalAddShapeToGrid(shape);
};

const originalDeleteSelectedForGrid = window.deleteSelected;
window.deleteSelected = function() {
    invalidateSpatialGrid();
    return originalDeleteSelectedForGrid();
};

// Make functions globally accessible
window.buildSpatialGrid = buildSpatialGrid;
window.getShapesInRegion = getShapesInRegion;
window.findShapesNearPoint = findShapesNearPoint;
window.invalidateSpatialGrid = invalidateSpatialGrid;
window.getSpatialGridStats = getSpatialGridStats;
window.getCellsForBounds = getCellsForBounds;

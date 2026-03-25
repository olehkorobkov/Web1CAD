// ============================================================================
// QUADTREE SPATIAL INDEX - Advanced shape lookup for large drawings
// ============================================================================
// Implements a hierarchical quadtree structure for faster spatial queries
// than grid-based indexing. Automatically adapts to shape distribution.
// This is a BETA implementation running PARALLEL to grid system.
// ============================================================================

/**
 * QuadTree Node - represents a region in the quadtree
 */
class QuadTreeNode {
    constructor(bounds, depth = 0, maxDepth = 8, maxObjects = 4) {
        this.bounds = bounds;           // {minX, maxX, minY, maxY}
        this.depth = depth;             // Current depth in tree
        this.maxDepth = maxDepth;       // Maximum depth before stopping division
        this.maxObjects = maxObjects;   // Max objects before splitting
        
        // Node data
        this.objects = [];              // Array of {index, bounds}
        this.children = null;           // null or [TL, TR, BL, BR]
        this.isLeaf = true;
    }
    
    /**
     * Check if this node is subdivided
     */
    isSubdivided() {
        return this.children !== null;
    }
    
    /**
     * Subdivide this node into 4 children
     */
    subdivide() {
        if (this.isSubdivided() || this.depth >= this.maxDepth) {
            return false; // Already subdivided or at max depth
        }
        
        const { minX, maxX, minY, maxY } = this.bounds;
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        
        // Create 4 children: TL, TR, BL, BR
        this.children = [
            new QuadTreeNode(
                { minX: minX, maxX: midX, minY: midY, maxY: maxY },
                this.depth + 1, this.maxDepth, this.maxObjects
            ), // Top-Left
            new QuadTreeNode(
                { minX: midX, maxX: maxX, minY: midY, maxY: maxY },
                this.depth + 1, this.maxDepth, this.maxObjects
            ), // Top-Right
            new QuadTreeNode(
                { minX: minX, maxX: midX, minY: minY, maxY: midY },
                this.depth + 1, this.maxDepth, this.maxObjects
            ), // Bottom-Left
            new QuadTreeNode(
                { minX: midX, maxX: maxX, minY: minY, maxY: midY },
                this.depth + 1, this.maxDepth, this.maxObjects
            )  // Bottom-Right
        ];
        
        this.isLeaf = false;
        
        // Redistribute existing objects to children
        for (const obj of this.objects) {
            this.insertIntoChildren(obj);
        }
        this.objects = []; // Clear objects from this node
        
        return true;
    }
    
    /**
     * Insert object into appropriate child
     */
    insertIntoChildren(obj) {
        if (!this.isSubdivided()) return false;
        
        for (const child of this.children) {
            if (this.boundsIntersect(obj.bounds, child.bounds)) {
                child.insert(obj);
            }
        }
        return true;
    }
    
    /**
     * Insert a shape into this node
     */
    insert(obj) {
        // If this node is subdivided, insert into children
        if (this.isSubdivided()) {
            this.insertIntoChildren(obj);
            return true;
        }
        
        // Add to this node
        this.objects.push(obj);
        
        // If exceeded max objects and not at max depth, subdivide
        if (this.objects.length > this.maxObjects && this.depth < this.maxDepth) {
            this.subdivide();
        }
        
        return true;
    }
    
    /**
     * Query this node for objects in bounds
     */
    query(bounds, results = []) {
        // Check if query bounds intersect this node
        if (!this.boundsIntersect(bounds, this.bounds)) {
            return results;
        }
        
        // Add objects from this node
        for (const obj of this.objects) {
            if (this.boundsIntersect(bounds, obj.bounds)) {
                results.push(obj);
            }
        }
        
        // Query children if subdivided
        if (this.isSubdivided()) {
            for (const child of this.children) {
                child.query(bounds, results);
            }
        }
        
        return results;
    }
    
    /**
     * Check if two bounding boxes intersect (AABB)
     */
    boundsIntersect(bounds1, bounds2) {
        return !(bounds1.maxX < bounds2.minX ||
                 bounds1.minX > bounds2.maxX ||
                 bounds1.maxY < bounds2.minY ||
                 bounds1.minY > bounds2.maxY);
    }
    
    /**
     * Clear all objects from this node and children
     */
    clear() {
        this.objects = [];
        if (this.isSubdivided()) {
            for (const child of this.children) {
                child.clear();
            }
        }
    }
    
    /**
     * Get statistics about this node
     */
    getStats() {
        let nodeCount = 1;
        let objectCount = this.objects.length;
        
        if (this.isSubdivided()) {
            for (const child of this.children) {
                const childStats = child.getStats();
                nodeCount += childStats.nodeCount;
                objectCount += childStats.objectCount;
            }
        }
        
        return { nodeCount, objectCount };
    }
}

/**
 * QuadTree - Main spatial index structure
 */
class QuadTree {
    constructor(bounds, maxDepth = 8, maxObjects = 4) {
        this.bounds = bounds;                      // Drawing bounds
        this.root = new QuadTreeNode(bounds, 0, maxDepth, maxObjects);
        this.shapeMap = new Map();                 // index -> object info
        this.isDirty = false;
    }
    
    /**
     * Build/rebuild tree from shapes array
     */
    build(shapesArray) {
        const startTime = performance.now();
        
        // Clear existing tree
        this.clear();
        
        if (!shapesArray || shapesArray.length === 0) {
            this.isDirty = false;
            return { time: 0, count: 0 };
        }
        
        // Get bounds from all shapes
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        // Insert each shape
        for (let i = 0; i < shapesArray.length; i++) {
            const shape = shapesArray[i];
            if (!shape) continue;
            
            // Get bounds using cached function if available
            const bounds = typeof getShapeBounds === 'function' ?
                getShapeBounds(shape) : this.getShapeBoundsFallback(shape);
            
            if (!bounds) continue;
            
            // Track overall bounds
            minX = Math.min(minX, bounds.minX);
            maxX = Math.max(maxX, bounds.maxX);
            minY = Math.min(minY, bounds.minY);
            maxY = Math.max(maxY, bounds.maxY);
            
            // Insert into tree
            const obj = { index: i, bounds: bounds };
            this.root.insert(obj);
            this.shapeMap.set(i, obj);
        }
        
        // Update overall bounds
        if (minX !== Infinity) {
            this.bounds = { minX, maxX, minY, maxY };
        }
        
        const buildTime = performance.now() - startTime;
        this.isDirty = false;
        
        const stats = this.root.getStats();
        console.log(`QuadTree built in ${buildTime.toFixed(2)}ms: ${stats.nodeCount} nodes, ${stats.objectCount} objects`);
        
        return { time: buildTime, count: shapesArray.length };
    }
    
    /**
     * Fallback for getting shape bounds if not cached
     */
    getShapeBoundsFallback(shape) {
        if (!shape) return null;
        
        const tolerance = 5; // Small margin around shapes
        
        switch (shape.type) {
            case 'line':
                return {
                    minX: Math.min(shape.x1, shape.x2) - tolerance,
                    maxX: Math.max(shape.x1, shape.x2) + tolerance,
                    minY: Math.min(shape.y1, shape.y2) - tolerance,
                    maxY: Math.max(shape.y1, shape.y2) + tolerance
                };
            
            case 'circle':
                return {
                    minX: shape.cx - shape.radius - tolerance,
                    maxX: shape.cx + shape.radius + tolerance,
                    minY: shape.cy - shape.radius - tolerance,
                    maxY: shape.cy + shape.radius + tolerance
                };
            
            case 'polyline':
            case 'polygon':
            case 'spline':
                if (!shape.points || shape.points.length === 0) return null;
                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;
                for (const p of shape.points) {
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                }
                return {
                    minX: minX - tolerance,
                    maxX: maxX + tolerance,
                    minY: minY - tolerance,
                    maxY: maxY + tolerance
                };
            
            case 'point':
                return {
                    minX: shape.x - tolerance,
                    maxX: shape.x + tolerance,
                    minY: shape.y - tolerance,
                    maxY: shape.y + tolerance
                };
            
            default:
                return null;
        }
    }
    
    /**
     * Query tree for shapes in bounds
     */
    query(bounds) {
        if (!bounds) return [];
        return this.root.query(bounds);
    }
    
    /**
     * Find shapes near a point
     */
    queryPoint(x, y, tolerance = 5) {
        const bounds = {
            minX: x - tolerance,
            maxX: x + tolerance,
            minY: y - tolerance,
            maxY: y + tolerance
        };
        return this.query(bounds);
    }
    
    /**
     * Clear the tree
     */
    clear() {
        this.root.clear();
        this.shapeMap.clear();
    }
    
    /**
     * Invalidate tree (must be rebuilt before next use)
     */
    invalidate() {
        this.isDirty = true;
    }
    
    /**
     * Get tree statistics
     */
    getStats() {
        const rootStats = this.root.getStats();
        return {
            bounds: this.bounds,
            isDirty: this.isDirty,
            nodeCount: rootStats.nodeCount,
            objectCount: rootStats.objectCount,
            maxDepth: this.root.maxDepth,
            maxObjects: this.root.maxObjects
        };
    }
}

// Global quadtree instance
let globalQuadTree = null;

/**
 * Initialize global quadtree from shapes
 */
function initializeQuadTree() {
    if (!globalQuadTree) {
        // Initialize with large bounds
        globalQuadTree = new QuadTree(
            { minX: -10000, maxX: 10000, minY: -10000, maxY: 10000 },
            8,   // maxDepth
            4    // maxObjects
        );
    }
    
    if (typeof shapes !== 'undefined' && shapes.length > 0) {
        globalQuadTree.build(shapes);
    }
}

/**
 * Query the global quadtree for shapes in bounds
 */
function queryQuadTree(bounds) {
    if (!globalQuadTree) {
        initializeQuadTree();
    }
    
    if (globalQuadTree.isDirty) {
        initializeQuadTree();
    }
    
    const results = globalQuadTree.query(bounds);
    return new Set(results.map(obj => obj.index));
}

/**
 * Find shapes near a point using quadtree
 */
function findShapesNearPointQuadTree(x, y, tolerance = 5) {
    if (!globalQuadTree) {
        initializeQuadTree();
    }
    
    if (globalQuadTree.isDirty) {
        initializeQuadTree();
    }
    
    const results = globalQuadTree.queryPoint(x, y, tolerance);
    return results.map(obj => obj.index);
}

/**
 * Invalidate quadtree after shape changes
 */
function invalidateQuadTree() {
    if (globalQuadTree) {
        globalQuadTree.invalidate();
    }
}

/**
 * Get quadtree statistics for debugging
 */
function getQuadTreeStats() {
    if (!globalQuadTree) {
        return { error: 'QuadTree not initialized' };
    }
    return globalQuadTree.getStats();
}

// Hook into shape operations to invalidate tree
const originalAddShapeQT = window.addShape;
if (originalAddShapeQT) {
    window.addShape = function(shape) {
        invalidateQuadTree();
        return originalAddShapeQT(shape);
    };
}

const originalDeleteSelectedQT = window.deleteSelected;
if (originalDeleteSelectedQT) {
    window.deleteSelected = function() {
        invalidateQuadTree();
        return originalDeleteSelectedQT();
    };
}

// Make functions globally accessible
window.QuadTree = QuadTree;
window.initializeQuadTree = initializeQuadTree;
window.queryQuadTree = queryQuadTree;
window.findShapesNearPointQuadTree = findShapesNearPointQuadTree;
window.invalidateQuadTree = invalidateQuadTree;
window.getQuadTreeStats = getQuadTreeStats;

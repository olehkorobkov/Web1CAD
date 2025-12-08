/**
 * Web1CAD Render Stabilization System
 * Version 251207 Beta (December 7, 2025)
 * 
 * This module addresses critical rendering issues that occur at high zoom levels:
 * - Line width instability when using lineWidth = 1/zoom calculations
 * - Coordinate precision loss at extreme zoom values
 * - Performance issues with many objects due to lack of viewport culling
 * - Visual artifacts during zoom operations
 */

class RenderStabilizer {
    constructor() {
        // Safe boundaries for line width calculations
        this.MIN_LINE_WIDTH = 0.1;    // Minimum visible line width
        this.MAX_LINE_WIDTH = 10;     // Maximum line width to prevent thick lines
        this.MAX_SAFE_ZOOM = 1000;    // Maximum zoom level for stable calculations
        this.PRECISION_THRESHOLD = 1e-10; // Threshold for precision loss detection
        
        // Viewport bounds for culling (updated during rendering)
        this.viewportBounds = {
            minX: 0, maxX: 0, minY: 0, maxY: 0
        };
    }
    
    /**
     * Calculate safe line width that prevents instability at high zoom levels
     * Replaces problematic lineWidth = 1/zoom calculations
     */
    getSafeLineWidth(zoom) {
        // Handle invalid zoom values
        if (!zoom || zoom <= 0 || !isFinite(zoom)) {
            return this.MIN_LINE_WIDTH;
        }
        
        // Clamp zoom to safe range
        const safeZoom = Math.min(Math.max(zoom, 1e-6), this.MAX_SAFE_ZOOM);
        
        // Calculate line width with safety bounds
        const calculatedWidth = 1 / safeZoom;
        return Math.max(this.MIN_LINE_WIDTH, Math.min(calculatedWidth, this.MAX_LINE_WIDTH));
    }
    
    /**
     * Apply stabilized coordinate transformation to canvas context
     * Prevents coordinate precision issues at extreme zoom levels
     */
    setStableTransform(ctx, zoom, offsetX, offsetY) {
        try {
            // Check for precision issues before applying transform
            if (!this.checkPrecision(zoom, offsetX) || !this.checkPrecision(zoom, offsetY)) {
                console.warn('Precision loss detected in coordinate transformation');
                // Fallback to identity transform
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                return false;
            }
            
            // Apply CAD-standard coordinate transformation (Y-axis flipped)
            const canvas = ctx.canvas;
            ctx.setTransform(zoom, 0, 0, -zoom, offsetX, canvas.height - offsetY);
            return true;
        } catch (e) {
            console.error('Transform error:', e.message);
            // Reset to safe state
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            return false;
        }
    }
    
    /**
     * Stabilized canvas clearing that works correctly at all zoom levels
     */
    stableClearCanvas(ctx, zoom, offsetX, offsetY) {
        try {
            const canvas = ctx.canvas;
            // Calculate clear rectangle in world coordinates
            const clearX = -offsetX / zoom;
            const clearY = -offsetY / zoom;
            const clearWidth = canvas.width / zoom;
            const clearHeight = canvas.height / zoom;
            
            ctx.clearRect(clearX, clearY, clearWidth, clearHeight);
        } catch (e) {
            // Fallback: clear entire canvas
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }
    
    /**
     * Update viewport bounds for culling calculations
     */
    updateViewportBounds(ctx, zoom, offsetX, offsetY) {
        const canvas = ctx.canvas;
        
        // Calculate visible world coordinates
        this.viewportBounds.minX = -offsetX / zoom;
        this.viewportBounds.maxX = (canvas.width - offsetX) / zoom;
        this.viewportBounds.minY = -offsetY / zoom;
        this.viewportBounds.maxY = (canvas.height - offsetY) / zoom;
    }
    
    /**
     * Check if a point is within the current viewport (for culling)
     */
    isInViewport(x, y, bounds = this.viewportBounds) {
        return x >= bounds.minX && x <= bounds.maxX && 
               y >= bounds.minY && y <= bounds.maxY;
    }
    
    /**
     * Check if a shape is visible in the current viewport
     * Used for viewport culling to improve performance
     */
    isShapeVisible(shape) {
        if (!shape) return false;
        
        // Get shape bounds based on type
        let minX, maxX, minY, maxY;
        
        switch (shape.type) {
            case 'line':
                minX = Math.min(shape.x1, shape.x2);
                maxX = Math.max(shape.x1, shape.x2);
                minY = Math.min(shape.y1, shape.y2);
                maxY = Math.max(shape.y1, shape.y2);
                break;
                
            case 'circle':
                minX = shape.x - shape.radius;
                maxX = shape.x + shape.radius;
                minY = shape.y - shape.radius;
                maxY = shape.y + shape.radius;
                break;
                
            case 'rectangle':
                minX = Math.min(shape.x1, shape.x2);
                maxX = Math.max(shape.x1, shape.x2);
                minY = Math.min(shape.y1, shape.y2);
                maxY = Math.max(shape.y1, shape.y2);
                break;
                
            case 'polyline':
                if (!shape.points || shape.points.length === 0) return false;
                minX = maxX = shape.points[0].x;
                minY = maxY = shape.points[0].y;
                shape.points.forEach(point => {
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                });
                break;
                
            default:
                // For unknown shape types, assume visible to be safe
                return true;
        }
        
        // Check if shape bounds intersect with viewport bounds
        return !(maxX < this.viewportBounds.minX || minX > this.viewportBounds.maxX ||
                 maxY < this.viewportBounds.minY || minY > this.viewportBounds.maxY);
    }
    
    /**
     * Check for coordinate precision loss
     * Returns false if precision issues are detected
     */
    checkPrecision(zoom, coordinate) {
        if (!isFinite(zoom) || !isFinite(coordinate)) return false;
        
        // Check for values that are too small or too large
        const result = coordinate / zoom;
        return isFinite(result) && Math.abs(result) < 1e10;
    }
}

// Create global instance for use throughout the application
window.renderStabilizer = new RenderStabilizer();

+6/*
 * Shape Rendering Module - Web1CAD System
 * Version 0.250808 (August 8, 2025) - Enhanced Rendering Core
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 * If you see this code elsewhere, it was copied.
 */

// === Enhanced Shape Rendering Module ===
// This module handles rendering of shapes and visual effects with improved text handling and coordinate system

/**
 * Enhanced Canvas Render Core - adapted from Web1CAD test page
 * Provides unified rendering system with proper coordinate transformation
 */
class CanvasRenderCore {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.zoom = 1;
        this.offset = { x: 0, y: 0 };
        this.layerMap = {};
        this.linetypeMap = {};
        this.globalLinetypeScale = 1;
        this.unitFactor = 1;
        this._initCache();
    }

    _initCache() {
        // Initialize layer cache
        if (typeof layers !== 'undefined' && Array.isArray(layers)) {
            for (const layer of layers) {
                this.layerMap[layer.name] = layer;
            }
        }
        
        // Initialize linetype cache
        if (typeof LINETYPE_PATTERNS !== 'undefined') {
            this.linetypeMap = { ...LINETYPE_PATTERNS };
        }
    }

    setZoomAndOffset(zoom, offsetX, offsetY) {
        this.zoom = zoom;
        this.offset = { x: offsetX, y: offsetY };
    }

    transformCtx() {
        this.ctx.setTransform(
            this.zoom,
            0,
            0,
            -this.zoom,
            this.canvas.width / 2 + this.offset.x * this.zoom,
            this.canvas.height / 2 - this.offset.y * this.zoom
        );
    }

    /**
     * Enhanced world to canvas coordinate conversion
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @returns {Object} Canvas coordinates {x, y}
     */
    worldToCanvas(x, y) {
        return {
            x: this.canvas.width / 2 + (x + this.offset.x) * this.zoom * this.unitFactor,
            y: this.canvas.height / 2 - (y + this.offset.y) * this.zoom * this.unitFactor
        };
    }

    /**
     * Check if entity should be rendered based on layer visibility
     * @param {Object} shape - Shape object
     * @returns {boolean} Should render
     */
    isEntityVisible(shape) {
        const layer = this.layerMap[shape.layer];
        return !layer || (layer.visible !== false && layer.locked !== true);
    }

    /**
     * Apply enhanced entity styling with proper layer inheritance
     * @param {Object} shape - Shape object
     */
    applyEntityStyle(shape) {
        const layer = this.layerMap[shape.layer] || {};
        
        // Resolve color - byLayer or specific color
        let color = shape.color;
        if (!color || color === 'byLayer') {
            color = layer.color || '#ffffff';
        }
        
        // Set stroke and fill styles using resolved color
    ctx.strokeStyle = shapeColor;
    ctx.fillStyle = shapeColor;
        
        // Resolve lineweight
        let lineweight = shape.lineWeight || shape.lineweight;
        if (!lineweight || lineweight === 'byLayer') {
            lineweight = layer.lineWeight || 0.25;
        }
        this.ctx.lineWidth = (showLineweights && lineweight > 0) ? 
            convertMmToPixels(lineweight) / this.zoom : 1 / this.zoom;

        // Resolve and apply linetype
        let linetype = shape.linetype;
        if (!linetype || linetype === 'byLayer') {
            linetype = layer.linetype || 'continuous';
        }
        
        if (linetype && linetype !== 'continuous') {
            const pattern = this.linetypeMap[linetype];
            if (pattern && Array.isArray(pattern)) {
                const minScale = 0.8;
                const maxScale = 3.0;
                const baseScale = Math.max(minScale, Math.min(maxScale, 2 / this.zoom));
                const scaledPattern = pattern.map(dash => Math.max(2, dash * baseScale));
                this.ctx.setLineDash(scaledPattern);
                this.ctx.lineDashOffset = 0;
            } else {
                this.ctx.setLineDash([]);
            }
        } else {
            this.ctx.setLineDash([]);
        }

        // Apply layer lock styling (dimmed appearance)
        if (layer && layer.locked) {
            this.ctx.globalAlpha = 0.5;
            this.ctx.strokeStyle = '#888888';
            this.ctx.fillStyle = '#888888';
        } else {
            this.ctx.globalAlpha = 1.0;
        }
    }
}

/**
 * Enhanced text rendering with proper geometric scaling
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} shape - Text shape object
 * @param {number} zoom - Current zoom level
 */
function drawEnhancedText(ctx, shape, zoom) {
    if (!shape.content || shape.content.trim() === '') return;
    
    ctx.save();
    
    // CAD-style text scaling: text size is in world units
    const worldTextSize = shape.size || shape.height || 12; // CAD text height in world units
    const screenTextSize = worldTextSize / zoom; // Convert to screen pixels
    
    // Set up text properties with proper font scaling
    ctx.font = `${screenTextSize}px Arial, sans-serif`;
    ctx.fillStyle = shape.color || '#ffffff';
    
    // Professional CAD text alignment mapping
    let textAlign = 'left';
    let textBaseline = 'alphabetic';
    
    if (shape.align) {
        switch (shape.align.toLowerCase()) {
            case 'center':
            case 'middle':
                textAlign = 'center';
                textBaseline = 'middle';
                break;
            case 'right':
                textAlign = 'right';
                break;
            case 'left':
            default:
                textAlign = 'left';
                break;
        }
    }
    
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;
    
    // Add text shadow/outline effects for better visibility
    if (shape.outline) {
        ctx.strokeStyle = shape.outline;
        ctx.lineWidth = 1 / zoom; // Scale outline with zoom
        ctx.strokeText(shape.content, shape.x, shape.y);
    }
    
    // Handle text rotation if specified (Professional CAD style)
    if (shape.rotation && shape.rotation !== 0) {
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.rotation * Math.PI / 180);
        // Apply coordinate system flip for Professional CAD compatibility
        ctx.scale(1, -1);
        ctx.fillText(shape.content, 0, 0);
    } else {
        // Apply coordinate system flip for Professional CAD compatibility
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.scale(1, -1);
        ctx.fillText(shape.content, 0, 0);
        ctx.restore();
    }
    
    ctx.restore();
}

/**
 * Enhanced multi-line text rendering with proper geometric scaling
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} shape - Multi-text shape object
 * @param {number} zoom - Current zoom level
 */
function drawEnhancedMText(ctx, shape, zoom) {
    if (!shape.content || shape.content.trim() === '') return;
    
    ctx.save();
    
    // CAD-style text scaling: text size is in world units
    const worldTextSize = shape.size || shape.height || 12; // CAD text height in world units
    const screenTextSize = worldTextSize / zoom; // Convert to screen pixels  
    const lineHeight = screenTextSize * 1.2; // Line spacing in screen pixels
    
    // Set up text properties with proper font scaling
    ctx.font = `${screenTextSize}px Arial, sans-serif`;
    ctx.fillStyle = shape.color || '#ffffff';
    
    // Professional CAD text alignment mapping
    let textAlign = 'left';
    let textBaseline = 'top'; // For multi-line, start from top
    
    if (shape.align) {
        switch (shape.align.toLowerCase()) {
            case 'center':
            case 'middle':
                textAlign = 'center';
                break;
            case 'right':
                textAlign = 'right';
                break;
            case 'left':
            default:
                textAlign = 'left';
                break;
        }
    }
    
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;
    
    // Split text into lines - handle different line break formats
    const lines = shape.content.split(/\\P|\n|\r\n|\r/);
    
    // Handle text rotation if specified (Professional CAD style)
    if (shape.rotation && shape.rotation !== 0) {
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.rotation * Math.PI / 180);
        // Apply coordinate system flip for Professional CAD compatibility
        ctx.scale(1, -1);
        
        // Draw each line with proper spacing
        lines.forEach((line, index) => {
            if (line.trim()) {
                ctx.fillText(line, 0, -(index * lineHeight)); // Negative Y for flipped coordinates
            }
        });
    } else {
        // Apply coordinate system flip for Professional CAD compatibility
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.scale(1, -1);
        
        // Draw each line with proper spacing
        lines.forEach((line, index) => {
            if (line.trim()) {
                ctx.fillText(line, 0, -(index * lineHeight)); // Negative Y for flipped coordinates
            }
        });
        ctx.restore();
    }
    
    ctx.restore();
}

/**
 * Sets the line style for canvas context based on shape properties
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} shape - The shape object with lineStyle property
 */
function setLineStyle(ctx, shape) {
    const lineStyle = shape.lineStyle || 'solid';
    switch(lineStyle) {
        case 'dashed':
            ctx.setLineDash([5, 5]);
            break;
        case 'dotted':
            ctx.setLineDash([1, 4]);
            break;
        case 'dash-dot':
            ctx.setLineDash([5, 3, 1, 3]);
            break;
        case 'solid':
        default:
            ctx.setLineDash([]);
            break;
    }
}

/**
 * Renders shapes with locked appearance if layer is locked
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} shape - The shape object
 * @param {number} zoom - Current zoom level
 */
function applyLockedStyle(ctx, shape, zoom) {
    // Get layer properties to check if layer is locked
    const layer = (typeof getShapeLayer === 'function') ? getShapeLayer(shape) : null;
    
    if (layer && layer.locked) {
        ctx.globalAlpha = 0.5; // Semi-transparent
        ctx.strokeStyle = '#888888'; // Grayscale
        ctx.fillStyle = '#888888';
    }
}

/**
 * Central utility function to draw any shape type - uses standard renderer for compatibility
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} shape - The shape object to draw
 * @param {number} zoom - Current zoom level
 * @param {number} shapeIndex - Index of the shape for selection
 */
function drawShape(ctx, shape, zoom, shapeIndex) {
    // Use the proven standard renderer that works correctly with layers
    renderStandardShapes(ctx, shape, zoom, shapeIndex);
}

/**
 * Enhanced shape rendering with improved text handling
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} shape - Shape to render
 * @param {number} zoom - Current zoom level
 * @param {number} shapeIndex - Shape index
 */
function renderEnhancedShape(ctx, shape, zoom, shapeIndex) {
    const isSelected = (typeof selectedShapes !== 'undefined' && selectedShapes.has) ? 
        selectedShapes.has(shapeIndex) : false;
    const isMoveSelected = (typeof moveObjectsToMove !== 'undefined' && moveObjectsToMove.has) ? 
        moveObjectsToMove.has(shapeIndex) : false;
    
    // Enhanced rendering based on shape type
    switch(shape.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
            break;
            
        case 'polyline':
            if (shape.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.stroke();
            break;
            
        case 'circle':
            ctx.beginPath();
            ctx.arc(shape.cx, shape.cy, shape.radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
            
        case 'arc':
            let startAngle = shape.startAngle;
            let endAngle = shape.endAngle;
            
            // Normalize angles to ensure proper arc drawing
            if (endAngle < startAngle) {
                endAngle += 2 * Math.PI;
            }
            
            ctx.beginPath();
            ctx.arc(shape.cx, shape.cy, shape.radius, startAngle, endAngle);
            ctx.stroke();
            break;
            
        case 'ellipse':
            ctx.save();
            ctx.translate(shape.cx, shape.cy);
            if (shape.rotation) {
                ctx.rotate(shape.rotation * Math.PI / 180);
            }
            ctx.scale(shape.rx, shape.ry);
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, 2 * Math.PI);
            ctx.restore();
            ctx.stroke();
            break;
            
        case 'polygon':
            if (shape.points.length < 3) return;
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.closePath();
            ctx.stroke();
            break;
            
        case 'spline':
            if (shape.points.length < 2) return;
            drawSmoothSpline(ctx, shape.points);
            break;
            
        case 'hatch':
            ctx.lineWidth = 0.5 / zoom;
            for (let i = 0; i < shape.points.length; i += 2) {
                if (i + 1 < shape.points.length) {
                    ctx.beginPath();
                    ctx.moveTo(shape.points[i].x, shape.points[i].y);
                    ctx.lineTo(shape.points[i + 1].x, shape.points[i + 1].y);
                    ctx.stroke();
                }
            }
            break;
            
        case 'point':
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            break;
            
        case 'text':
            // Use enhanced text rendering
            drawEnhancedText(ctx, shape, zoom);
            break;
            
        case 'mtext':
            // Use enhanced multi-line text rendering
            drawEnhancedMText(ctx, shape, zoom);
            break;
            
        default:
            // Render unknown entities as points
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(shape.x || 0, shape.y || 0, 3 / zoom, 0, 2 * Math.PI);
            ctx.fill();
    }
    
    // Draw selection highlight for selected shapes
    if (isSelected || isMoveSelected) {
        drawSelectionHighlight(ctx, shape, zoom);
        drawSelectionHandles(ctx, shape, zoom);
    }
}

// === Standard Shape Rendering ===
function renderStandardShapes(ctx, shape, zoom, shapeIndex) {
    // Handle standard CAD shapes - OPTIMIZED with Unified Shape Handler
    const isSelected = (typeof selectedShapes !== 'undefined' && selectedShapes.has) ? 
        selectedShapes.has(shapeIndex) : false;
    const isMoveSelected = (typeof moveObjectsToMove !== 'undefined' && moveObjectsToMove.has) ? 
        moveObjectsToMove.has(shapeIndex) : false;
    const isHovered = false; // DISABLED: Hover highlighting removed per user request
    
    // Get layer properties
    const layer = getShapeLayer ? getShapeLayer(shape) : null;
    
    // Skip rendering if layer is not visible
    if (layer && !layer.visible) return;
    
    // Determine colors using helper function
    const shapeColor = (typeof resolveShapeColor === 'function') ? 
        resolveShapeColor(shape, layer) : (shape.color || '#ffffff');
    
    // Determine lineweight using helper function
    const effectiveLineweight = (typeof resolveShapeLineWeight === 'function') ? 
        resolveShapeLineWeight(shape, layer) : (shape.lineweight || 0.25);
    
    // Determine linetype using shape and layer properties with fallback
    let effectiveLinetype = shape.linetype;
    if (!effectiveLinetype || effectiveLinetype === 'byLayer') {
        effectiveLinetype = (layer && layer.linetype) ? layer.linetype : 'continuous';
    }
    
    // Calculate line width for rendering
    let lineWidth;
    if (typeof showLineweights !== 'undefined' && showLineweights && effectiveLineweight > 0) {
        const convertPixels = (typeof convertMmToPixels === 'function') ? 
            convertMmToPixels(effectiveLineweight) : effectiveLineweight * 3.78;
        lineWidth = convertPixels / zoom;
    } else {
        lineWidth = 1 / zoom; // Hairline
    }
    
    // Apply line dash pattern based on linetype
    if (typeof LINETYPE_PATTERNS !== 'undefined') {
        const pattern = LINETYPE_PATTERNS[effectiveLinetype] || [];
        if (pattern.length > 0) {
            // Scale pattern for zoom level with better visibility
            const minScale = 0.8; // Minimum scale to keep patterns visible
            const maxScale = 3.0;  // Maximum scale to prevent huge patterns
            const baseScale = Math.max(minScale, Math.min(maxScale, 2 / zoom));
            const scaledPattern = pattern.map(dash => Math.max(2, dash * baseScale));
            ctx.setLineDash(scaledPattern);
            ctx.lineDashOffset = 0; // Reset dash offset for consistency
        } else {
            ctx.setLineDash([]); // Continuous line
        }
    } else {
        ctx.setLineDash([]); // Continuous line fallback
    }
    
    // Apply layer lock styling (dimmed appearance)
    if (layer && layer.locked) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#888888';
        ctx.fillStyle = '#888888';
    } else if (isHovered && !isSelected) {
        // Hover highlighting - light blue tint
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#00ccff';
        ctx.fillStyle = '#00ccff';
    } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = shapeColor;
        ctx.fillStyle = shapeColor;
    }
    
    // Set line width
    ctx.lineWidth = lineWidth;

    // Apply line style
    setLineStyle(ctx, shape);

    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('draw', shape.type, ctx, shape, zoom);
        if (result !== null) {
            // Successfully rendered with optimized handler
            // Draw selection highlight for selected shapes
            if (isSelected || isMoveSelected) {
                drawSelectionHighlight(ctx, shape, zoom);
                drawSelectionHandles(ctx, shape, zoom);
            }
            // Draw hover highlight for hovered shapes (but not selected ones)
            else if (isHovered) {
                drawHoverHighlight(ctx, shape, zoom);
            }
            return;
        }
    }

    // Fallback to original implementation for compatibility
    switch(shape.type) {
        case 'line':
            // NEW LINE RENDERING - Restored and improved
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
            break;
        case 'polyline':
            if (shape.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.stroke();
            break;
        case 'circle':
            ctx.beginPath();
            ctx.arc(shape.cx, shape.cy, shape.radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
        case 'arc':
            let startAngle = shape.startAngle;
            let endAngle = shape.endAngle;
            
            // Normalize angles to ensure proper arc drawing
            if (endAngle < startAngle) {
                endAngle += 2 * Math.PI;
            }
            
            ctx.beginPath();
            ctx.arc(shape.cx, shape.cy, shape.radius, startAngle, endAngle);
            ctx.stroke();
            break;
        case 'ellipse':
            ctx.save();
            ctx.translate(shape.cx, shape.cy);
            if (shape.rotation) {
                ctx.rotate(shape.rotation * Math.PI / 180);
            }
            ctx.scale(shape.rx, shape.ry);
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, 2 * Math.PI);
            ctx.restore();
            ctx.stroke();
            break;
        case 'polygon':
            if (shape.points.length < 3) return;
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.closePath();
            ctx.stroke();
            break;
        case 'spline':
            if (shape.points.length < 2) return;
            // Use smooth spline rendering instead of straight lines
            drawSmoothSpline(ctx, shape.points);
            break;
        case 'hatch':
            // Render hatch as pattern of lines
            ctx.lineWidth = 0.5 / zoom;
            for (let i = 0; i < shape.points.length; i += 2) {
                if (i + 1 < shape.points.length) {
                    ctx.beginPath();
                    ctx.moveTo(shape.points[i].x, shape.points[i].y);
                    ctx.lineTo(shape.points[i + 1].x, shape.points[i + 1].y);
                    ctx.stroke();
                }
            }
            break;
        case 'point':
            ctx.fillStyle = resolveShapeColor(shape, layer);
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            break;
        case 'text':
            const textColor = (typeof resolveShapeColor === 'function') ? 
                resolveShapeColor(shape, layer) : (shape.color || '#ffffff');
            ctx.fillStyle = textColor;
            // FIXED: text as geometric shape - scales with coordinate system
            const worldSize = shape.size || 12; // World units
            // Canvas already has zoom transformation, so use world size directly
            ctx.font = `${worldSize}px Arial`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic'; // Use alphabetic baseline for consistency
            
            // Simple text rendering - no complex transformations
            ctx.fillText(shape.content, shape.x, shape.y);
            break;
        default:
            // Render unknown entities as points
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(shape.x || 0, shape.y || 0, 3 / zoom, 0, 2 * Math.PI);
            ctx.fill();
    }
    
    // Draw selection highlight for selected shapes
    if (isSelected || isMoveSelected) {
        drawSelectionHighlight(ctx, shape, zoom);
        drawSelectionHandles(ctx, shape, zoom);
    }
}

/**
 * Get bounding box for any shape type
 * @param {Object} shape - The shape object
 * @returns {Object|null} Bounding box with minX, maxX, minY, maxY or null
 */
function getShapeBounds(shape) {
    // OPTIMIZED with Unified Shape Handler
    if (window.shapeHandler) {
        const bounds = window.shapeHandler.execute('bounds', shape.type, shape);
        if (bounds !== null) {
            return bounds;
        }
    }
    
    // Fallback to original implementation for compatibility
    switch(shape.type) {
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
            // For rotated ellipse, use conservative bounding box
            const maxRadius = Math.max(shape.rx, shape.ry);
            return {
                minX: shape.cx - maxRadius,
                maxX: shape.cx + maxRadius,
                minY: shape.cy - maxRadius,
                maxY: shape.cy + maxRadius
            };
            
        case 'arc':
            // Simplified bounding box using radius
            return {
                minX: shape.cx - shape.radius,
                maxX: shape.cx + shape.radius,
                minY: shape.cy - shape.radius,
                maxY: shape.cy + shape.radius
            };
            
        case 'polyline':
        case 'polygon':
        case 'spline':
        case 'hatch':
            if (!shape.points || shape.points.length === 0) return null;
            let minX = shape.points[0].x, maxX = shape.points[0].x;
            let minY = shape.points[0].y, maxY = shape.points[0].y;
            
            shape.points.forEach(point => {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
            });
            
            return { minX, maxX, minY, maxY };
            
        case 'point':
            const pointSize = 2;
            return {
                minX: shape.x - pointSize,
                maxX: shape.x + pointSize,
                minY: shape.y - pointSize,
                maxY: shape.y + pointSize
            };
            
        case 'text':
            if (!shape.content || shape.x === undefined || shape.y === undefined) return null;
            // Calculate bounds in world coordinates
            const textSize = shape.size || 12; // World units
            const textWidth = shape.content.length * textSize * 0.6; // Approximate width in world units
            const textHeight = textSize; // Height in world units
            
            return {
                minX: shape.x - (textWidth * 0.05),
                maxX: shape.x + textWidth + (textWidth * 0.05),
                minY: shape.y - textHeight,
                maxY: shape.y + (textHeight * 0.3)
            };
            
        default:
            return null;
    }
}

function drawSelectionHighlight(ctx, shape, zoom) {
    // Selection highlighting - OPTIMIZED with Unified Shape Handler
    // Save current context
    ctx.save();
    
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('highlight', shape.type, ctx, shape, zoom);
        if (result !== null) {
            // Successfully highlighted with optimized handler
            ctx.restore();
            return;
        }
    }
    
    // Fallback to original implementation for compatibility
    // Set selection highlight style - bright yellow outline
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3 / zoom; // Slightly thicker for visibility
    ctx.setLineDash([]); // Always use solid line for selection highlight
    
    // Draw the actual shape outline for proper highlighting
    switch(shape.type) {
        case 'line':
            // NEW LINE HIGHLIGHT - Restored selection highlighting
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
            break;
            
        case 'polyline':
            if (shape.points && shape.points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                ctx.stroke();
            }
            break;
            
        case 'circle':
            ctx.beginPath();
            ctx.arc(shape.cx, shape.cy, shape.radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
            
        case 'arc':
            ctx.beginPath();
            ctx.arc(shape.cx, shape.cy, shape.radius, shape.startAngle, shape.endAngle);
            ctx.stroke();
            break;
            
        case 'ellipse':
            ctx.beginPath();
            ctx.ellipse(
                shape.cx, 
                shape.cy, 
                shape.rx, 
                shape.ry, 
                shape.rotation || 0, 
                shape.startAngle || 0, 
                shape.endAngle || 2 * Math.PI
            );
            ctx.stroke();
            break;
            
        case 'polygon':
            if (shape.points && shape.points.length > 2) {
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }
            break;
            
        case 'spline':
            if (shape.points && shape.points.length > 1) {
                // Use smooth spline rendering
                drawSmoothSpline(ctx, shape.points);
            }
            break;
            
        case 'hatch':
            if (shape.points && shape.points.length > 1) {
                for (let i = 0; i < shape.points.length; i += 2) {
                    if (i + 1 < shape.points.length) {
                        ctx.beginPath();
                        ctx.moveTo(shape.points[i].x, shape.points[i].y);
                        ctx.lineTo(shape.points[i + 1].x, shape.points[i + 1].y);
                        ctx.stroke();
                    }
                }
            }
            break;
            
        case 'point':
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, 4 / zoom, 0, 2 * Math.PI);
            ctx.stroke();
            break;
            
        case 'text':
            // Draw text outline by stroking the text path (Professional CAD style)
            const worldTextSize = shape.size || shape.height || 12; // CAD text height in world units
            const screenTextSize = worldTextSize / zoom; // Convert to screen pixels
            ctx.font = `${screenTextSize}px Arial`;
            
            // Professional CAD text alignment mapping
            let textAlign = 'left';
            let textBaseline = 'alphabetic';
            
            if (shape.align) {
                switch (shape.align.toLowerCase()) {
                    case 'center':
                    case 'middle':
                        textAlign = 'center';
                        textBaseline = 'middle';
                        break;
                    case 'right':
                        textAlign = 'right';
                        break;
                    case 'left':
                    default:
                        textAlign = 'left';
                        break;
                }
            }
            
            ctx.textAlign = textAlign;
            ctx.textBaseline = textBaseline;
            
            ctx.save();
            ctx.translate(shape.x, shape.y);
            if (shape.rotation) ctx.rotate(shape.rotation * Math.PI / 180);
            ctx.scale(1, -1); // Professional CAD coordinate system flip
            ctx.strokeText(shape.content || '', 0, 0);
            ctx.restore();
            break;
    }
    
    // Restore context
    ctx.restore();
}

/**
 * Draw hover highlight for shape under cursor
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} shape - Shape to highlight
 * @param {number} zoom - Current zoom level
 */
function drawHoverHighlight(ctx, shape, zoom) {
    // Hover highlighting with light blue color
    // Save current context
    ctx.save();
    
    // Use optimized unified handler if available for hover highlighting
    if (window.shapeHandler) {
        // Check if unified handler supports hover highlighting
        const result = window.shapeHandler.execute('hover', shape.type, ctx, shape, zoom);
        if (result !== null) {
            // Successfully highlighted with optimized handler
            ctx.restore();
            return;
        }
    }
    
    // Fallback to manual hover highlighting
    // Set hover highlight style - light blue outline
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 2 / zoom; // Slightly thicker than normal, but thinner than selection
    ctx.setLineDash([]); // Always use solid line for hover highlight
    
    // Draw the actual shape outline for hover highlighting
    switch(shape.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
            break;
            
        case 'polyline':
        case 'spline':
            if (shape.points && shape.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                ctx.stroke();
            }
            break;
            
        case 'rectangle':
            const width = shape.x2 - shape.x1;
            const height = shape.y2 - shape.y1;
            ctx.strokeRect(shape.x1, shape.y1, width, height);
            break;
            
        case 'circle':
            const radius = Math.sqrt((shape.x2 - shape.x1) ** 2 + (shape.y2 - shape.y1) ** 2);
            ctx.beginPath();
            ctx.arc(shape.x1, shape.y1, radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
            
        case 'arc':
            const arcRadius = Math.sqrt((shape.x2 - shape.x1) ** 2 + (shape.y2 - shape.y1) ** 2);
            ctx.beginPath();
            ctx.arc(shape.x1, shape.y1, arcRadius, shape.startAngle, shape.endAngle);
            ctx.stroke();
            break;
            
        case 'point':
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, 4 / zoom, 0, 2 * Math.PI);
            ctx.stroke();
            break;
            
        case 'text':
            // Draw text outline for hover (Professional CAD style) - FIXED positioning
            const worldTextSize = shape.size || shape.height || 12; // CAD text height in world units
            const textWidth = shape.content ? shape.content.length * worldTextSize * 0.6 : worldTextSize;
            const textHeight = worldTextSize;
            
            // Calculate text bounds with corrected vertical positioning (same as hit testing)
            let minX, maxX, minY, maxY;
            
            if (shape.align) {
                switch (shape.align.toLowerCase()) {
                    case 'center':
                    case 'middle':
                        minX = shape.x - textWidth / 2;
                        maxX = shape.x + textWidth / 2;
                        minY = shape.y - textHeight / 2;
                        maxY = shape.y + textHeight / 2;
                        break;
                    case 'right':
                        minX = shape.x - textWidth;
                        maxX = shape.x;
                        minY = shape.y - textHeight / 2; // Center vertically around insertion point
                        maxY = shape.y + textHeight / 2;
                        break;
                    case 'left':
                    default:
                        minX = shape.x;
                        maxX = shape.x + textWidth;
                        minY = shape.y - textHeight / 2; // Center vertically around insertion point
                        maxY = shape.y + textHeight / 2;
                        break;
                }
            } else {
                // Default left alignment - center vertically around insertion point
                minX = shape.x;
                maxX = shape.x + textWidth;
                minY = shape.y - textHeight / 2;
                maxY = shape.y + textHeight / 2;
            }
            
            // Draw rectangle around text bounds
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
            break;
    }
    
    // Restore context
    ctx.restore();
}

// Helper function to draw different types of handles
function drawHandle(x, y, type = 'default', handleSize = 4) {
    const ctx = arguments[4] || window.currentRenderContext; // Get context from global or parameter
    const zoom = arguments[5] || 1; // Get zoom from parameter or default
    if (!ctx) return;
    
    // FIXED: Calculate proper handle size based on screen pixels, not world units
    const screenHandleSize = 6 / zoom; // 6 pixels on screen
    const minSize = 3 / zoom;
    const maxSize = 12 / zoom;
    const finalSize = Math.max(minSize, Math.min(maxSize, screenHandleSize));
    
    switch(type) {
        case 'endpoint':
            // Red squares for endpoints
            ctx.fillStyle = '#ff0000';
            ctx.strokeStyle = '#000000';
            break;
        case 'midpoint':
            // Blue circles for midpoints/control points
            ctx.fillStyle = '#0000ff';
            ctx.strokeStyle = '#ffffff';
            break;
        case 'center':
            // Green diamond for center points
            ctx.fillStyle = '#00ff00';
            ctx.strokeStyle = '#000000';
            break;
        default:
            // Yellow squares for general grips
            ctx.fillStyle = '#ffff00';
            ctx.strokeStyle = '#000000';
    }
    
    ctx.lineWidth = 1 / zoom;
    
    if (type === 'midpoint') {
        // Draw circle
        ctx.beginPath();
        ctx.arc(x, y, finalSize/2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    } else if (type === 'center') {
        // Draw diamond
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-finalSize/2, -finalSize/2, finalSize, finalSize);
        ctx.strokeRect(-finalSize/2, -finalSize/2, finalSize, finalSize);
        ctx.restore();
    } else {
        // Draw square
        ctx.fillRect(x - finalSize/2, y - finalSize/2, finalSize, finalSize);
        ctx.strokeRect(x - finalSize/2, y - finalSize/2, finalSize, finalSize);
    }
}

function drawSelectionHandles(ctx, shape, zoom) {
    // Selection handles rendering - OPTIMIZED with Unified Shape Handler
    // Save current context
    ctx.save();
    
    // Set global context for drawHandle function
    window.currentRenderContext = ctx;
    
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const handles = window.shapeHandler.execute('getHandles', shape.type, shape, zoom);
        if (handles && Array.isArray(handles)) {
            // Successfully got handles with optimized handler
            handles.forEach(handle => {
                drawHandle(handle.x, handle.y, handle.type, handle.size, ctx, zoom);
            });
            ctx.restore();
            return;
        }
    }
    
    // Fallback to original implementation for compatibility
    // FIXED: Handle size should be constant screen pixels, not world units
    const handleSize = 6 / zoom; // 6 pixels on screen, independent of zoom level
    const minHandleSize = 3 / zoom; // Minimum 3 pixels
    const maxHandleSize = 12 / zoom; // Maximum 12 pixels
    const finalHandleSize = Math.max(minHandleSize, Math.min(maxHandleSize, handleSize));
    
    // Helper function to draw different types of handles
    function drawHandleLocal(x, y, type = 'default') {
        switch(type) {
            case 'endpoint':
                // Red squares for endpoints
                ctx.fillStyle = '#ff0000';
                ctx.strokeStyle = '#000000';
                break;
            case 'midpoint':
                // Blue circles for midpoints/control points
                ctx.fillStyle = '#0000ff';
                ctx.strokeStyle = '#ffffff';
                break;
            case 'center':
                // Green diamond for center points
                ctx.fillStyle = '#00ff00';
                ctx.strokeStyle = '#000000';
                break;
            default:
                // Yellow squares for general grips
                ctx.fillStyle = '#ffff00';
                ctx.strokeStyle = '#000000';
        }
        
        ctx.lineWidth = 1 / zoom;
        
        if (type === 'midpoint') {
            // Draw circle
            ctx.beginPath();
            ctx.arc(x, y, finalHandleSize/2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        } else if (type === 'center') {
            // Draw diamond
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-finalHandleSize/2, -finalHandleSize/2, finalHandleSize, finalHandleSize);
            ctx.strokeRect(-finalHandleSize/2, -finalHandleSize/2, finalHandleSize, finalHandleSize);
            ctx.restore();
        } else {
            // Draw square
            ctx.fillRect(x - finalHandleSize/2, y - finalHandleSize/2, finalHandleSize, finalHandleSize);
            ctx.strokeRect(x - finalHandleSize/2, y - finalHandleSize/2, finalHandleSize, finalHandleSize);
        }
    }
    
    switch(shape.type) {
        case 'line':
            // NEW LINE HANDLES - Restored with improved positioning
            drawHandleLocal(shape.x1, shape.y1, 'endpoint');
            drawHandleLocal(shape.x2, shape.y2, 'endpoint');
            // Add midpoint grip
            const midX = (shape.x1 + shape.x2) / 2;
            const midY = (shape.y1 + shape.y2) / 2;
            drawHandleLocal(midX, midY, 'midpoint');
            break;
            
        case 'polyline':
            if (shape.points && shape.points.length > 0) {
                shape.points.forEach((point, index) => {
                    const isEndpoint = index === 0 || index === shape.points.length - 1;
                    drawHandleLocal(point.x, point.y, isEndpoint ? 'endpoint' : 'midpoint');
                });
            }
            break;
            
        case 'circle':
            // Center handle
            drawHandleLocal(shape.cx, shape.cy, 'center');
            // Cardinal direction handles
            drawHandleLocal(shape.cx + shape.radius, shape.cy, 'midpoint');
            drawHandleLocal(shape.cx - shape.radius, shape.cy, 'midpoint');
            drawHandleLocal(shape.cx, shape.cy + shape.radius, 'midpoint');
            drawHandleLocal(shape.cx, shape.cy - shape.radius, 'midpoint');
            break;
            
        case 'arc':
            // Center handle
            drawHandleLocal(shape.cx, shape.cy, 'center');
            // Start and end point handles
            const startX = shape.cx + shape.radius * Math.cos(shape.startAngle);
            const startY = shape.cy + shape.radius * Math.sin(shape.startAngle);
            const endX = shape.cx + shape.radius * Math.cos(shape.endAngle);
            const endY = shape.cy + shape.radius * Math.sin(shape.endAngle);
            drawHandleLocal(startX, startY, 'endpoint');
            drawHandleLocal(endX, endY, 'endpoint');
            break;
            
        case 'ellipse':
            // Center handle
            drawHandleLocal(shape.cx, shape.cy, 'center');
            // Major and minor axis handles
            const rotation = shape.rotation || 0;
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            
            // Major axis endpoints
            const majorX1 = shape.cx + shape.rx * cos;
            const majorY1 = shape.cy + shape.rx * sin;
            const majorX2 = shape.cx - shape.rx * cos;
            const majorY2 = shape.cy - shape.rx * sin;
            
            // Minor axis endpoints
            const minorX1 = shape.cx - shape.ry * sin;
            const minorY1 = shape.cy + shape.ry * cos;
            const minorX2 = shape.cx + shape.ry * sin;
            const minorY2 = shape.cy - shape.ry * cos;
            
            drawHandleLocal(majorX1, majorY1, 'midpoint');
            drawHandleLocal(majorX2, majorY2, 'midpoint');
            drawHandleLocal(minorX1, minorY1, 'midpoint');
            drawHandleLocal(minorX2, minorY2, 'midpoint');
            break;
            
        case 'polygon':
            if (shape.points && shape.points.length > 0) {
                shape.points.forEach(point => {
                    drawHandleLocal(point.x, point.y, 'midpoint');
                });
            }
            break;
            
        case 'spline':
            if (shape.points && shape.points.length > 0) {
                shape.points.forEach((point, index) => {
                    const isEndpoint = index === 0 || index === shape.points.length - 1;
                    drawHandleLocal(point.x, point.y, isEndpoint ? 'endpoint' : 'midpoint');
                });
            }
            break;
            
        case 'hatch':
            if (shape.points && shape.points.length > 0) {
                // Show handles for every other point to reduce clutter
                shape.points.forEach((point, index) => {
                    if (index % 2 === 0) { // Only start points of hatch lines
                        drawHandleLocal(point.x, point.y, 'endpoint');
                    }
                });
            }
            break;
            
        case 'text':
            if (shape.x !== undefined && shape.y !== undefined) {
                // Minimal text handles: insertion point + 1 extent handle
                const textSize = shape.size || shape.height || 12;
                const textWidth = shape.content ? shape.content.length * textSize * 0.6 : textSize;
                const textHeight = textSize;
                
                // Only 2 handles total: insertion point + opposite corner
                drawHandleLocal(shape.x, shape.y, 'endpoint'); // Red insertion point
                drawHandleLocal(shape.x + textWidth, shape.y + textHeight, 'midpoint'); // Blue extent handle
            }
            break;
            
        case 'point':
            drawHandleLocal(shape.x, shape.y, 'center');
            break;
    }
    
    // Restore context
    ctx.restore();
}

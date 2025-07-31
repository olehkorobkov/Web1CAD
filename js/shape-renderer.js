/*
 * Shape Rendering Module - Web1CAD System
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 * If you see this code elsewhere, it was copied.
 */

// === Shape Rendering Module ===
// This module handles rendering of shapes and visual effects

/**
 * Resolve the effective color for a shape
 * @param {Object} shape - The shape object
 * @param {Object} layer - The layer object
 * @returns {string} The resolved color
 */
function resolveShapeColor(shape, layer) {
    let shapeColor = shape.color;
    if (!shapeColor || shapeColor === 'byLayer') {
        shapeColor = layer ? layer.color : '#ffffff';
    }
    if (!shapeColor) {
        shapeColor = currentColor || '#ffffff';
    }
    return shapeColor;
}

/**
 * Resolve the effective lineweight for a shape
 * @param {Object} shape - The shape object
 * @param {Object} layer - The layer object
 * @returns {number} The resolved lineweight
 */
function resolveShapeLineweight(shape, layer) {
    let effectiveLineweight = shape.lineweight;
    if (effectiveLineweight === 'byLayer' || effectiveLineweight === undefined) {
        effectiveLineweight = layer ? layer.lineWeight : 0.25;
    }
    return effectiveLineweight;
}

/**
 * Resolve the effective linetype for a shape
 * @param {Object} shape - The shape object
 * @param {Object} layer - The layer object
 * @returns {string} The resolved linetype
 */
function resolveShapeLinetype(shape, layer) {
    let effectiveLinetype = shape.linetype;
    if (effectiveLinetype === 'byLayer' || effectiveLinetype === undefined) {
        effectiveLinetype = layer ? layer.linetype : 'continuous';
    }
    return effectiveLinetype;
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
 * Renders shapes with locked appearance if shape.locked is true
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} shape - The shape object
 * @param {number} zoom - Current zoom level
 */
function applyLockedStyle(ctx, shape, zoom) {
    if (shape.locked) {
        ctx.globalAlpha = 0.5; // Semi-transparent
        ctx.strokeStyle = '#888888'; // Grayscale
        ctx.fillStyle = '#888888';
    }
}

/**
 * Central utility function to draw any shape type
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} shape - The shape object to draw
 * @param {number} zoom - Current zoom level
 * @param {number} shapeIndex - Index of the shape for selection
 */
function drawShape(ctx, shape, zoom, shapeIndex) {
    // Check layer visibility first
    if (typeof shouldRenderShape === 'function' && !shouldRenderShape(shape)) {
        return; // Skip rendering if layer is hidden
    }
    
    ctx.save();
    
    // Apply locked style if needed (legacy shape.locked support)
    applyLockedStyle(ctx, shape, zoom);
    
    // Set line style
    setLineStyle(ctx, shape);
    
    // Render the shape
    renderStandardShapes(ctx, shape, zoom, shapeIndex);
    
    ctx.restore();
}

// === Standard Shape Rendering ===
function renderStandardShapes(ctx, shape, zoom, shapeIndex) {
    // Handle standard CAD shapes
    const isSelected = selectedShapes.has(shapeIndex);
    const isMoveSelected = (typeof moveObjectsToMove !== 'undefined') && moveObjectsToMove.has(shapeIndex);
    
    // Get layer properties
    const layer = getShapeLayer ? getShapeLayer(shape) : null;
    
    // Skip rendering if layer is not visible
    if (layer && !layer.visible) return;
    
    // Determine colors using helper function
    const shapeColor = resolveShapeColor(shape, layer);
    
    // Determine lineweight using helper function
    const effectiveLineweight = resolveShapeLineweight(shape, layer);
    
    // Determine linetype using helper function
    const effectiveLinetype = resolveShapeLinetype(shape, layer);
    
    // Calculate line width for rendering
    let lineWidth;
    if (showLineweights && effectiveLineweight > 0) {
        lineWidth = convertMmToPixels(effectiveLineweight) / zoom;
    } else {
        lineWidth = 1 / zoom; // Hairline
    }
    
    // Apply line dash pattern based on linetype
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
    
    // Apply layer lock styling (dimmed appearance)
    if (layer && layer.locked) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#888888';
        ctx.fillStyle = '#888888';
    } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = shapeColor;
        ctx.fillStyle = shapeColor;
    }
    
    // Set line width
    ctx.lineWidth = lineWidth;

    // Apply line style
    setLineStyle(ctx, shape);

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
            ctx.fillStyle = resolveShapeColor(shape, layer);
            ctx.font = `${(shape.size || 12) / zoom}px Arial`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            
            // Save current transformation matrix
            ctx.save();
            
            // Apply text-specific transformation without affecting global canvas
            const textRotation = shape.rotation || 0;
            ctx.translate(shape.x, shape.y);
            ctx.rotate(textRotation);
            ctx.scale(1, -1); // Flip Y-axis only for text
            
            // Draw text at origin since we've translated
            ctx.fillText(shape.content || '', 0, 0);
            
            // Restore transformation matrix
            ctx.restore();
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
            
        case 'arc':
            // Simplified bounding box using radius
            return {
                minX: shape.cx - shape.radius,
                maxX: shape.cx + shape.radius,
                minY: shape.cy - shape.radius,
                maxY: shape.cy + shape.radius
            };
            
        case 'ellipse':
            return getEllipseBounds(shape);
            
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
            const textSize = shape.size || 12;
            const textWidth = shape.content.length * textSize * 0.6;
            const textHeight = textSize;
            
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
    // Save current context
    ctx.save();
    
    // Set selection highlight style - bright yellow outline
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3 / zoom; // Slightly thicker for visibility
    ctx.setLineDash([]); // Always use solid line for selection highlight
    
    // Draw the actual shape outline for proper highlighting
    switch(shape.type) {
        case 'line':
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
            // Draw text outline by stroking the text path
            ctx.font = `${(shape.size || 12) / zoom}px Arial`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.save();
            ctx.translate(shape.x, shape.y);
            if (shape.rotation) ctx.rotate(shape.rotation);
            ctx.scale(1, -1);
            ctx.strokeText(shape.content || '', 0, 0);
            ctx.restore();
            break;
    }
    
    // Restore context
    ctx.restore();
}

function drawSelectionHandles(ctx, shape, zoom) {
    // Save current context
    ctx.save();
    
    const handleSize = 4 / zoom;
    
    // Helper function to draw different types of handles
    function drawHandle(x, y, type = 'default') {
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
            ctx.arc(x, y, handleSize/2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        } else if (type === 'center') {
            // Draw diamond
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-handleSize/2, -handleSize/2, handleSize, handleSize);
            ctx.strokeRect(-handleSize/2, -handleSize/2, handleSize, handleSize);
            ctx.restore();
        } else {
            // Draw square
            ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
            ctx.strokeRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
        }
    }
    
    switch(shape.type) {
        case 'line':
            drawHandle(shape.x1, shape.y1, 'endpoint');
            drawHandle(shape.x2, shape.y2, 'endpoint');
            // Add midpoint grip
            const midX = (shape.x1 + shape.x2) / 2;
            const midY = (shape.y1 + shape.y2) / 2;
            drawHandle(midX, midY, 'midpoint');
            break;
            
        case 'polyline':
            if (shape.points && shape.points.length > 0) {
                shape.points.forEach((point, index) => {
                    const isEndpoint = index === 0 || index === shape.points.length - 1;
                    drawHandle(point.x, point.y, isEndpoint ? 'endpoint' : 'midpoint');
                });
            }
            break;
            
        case 'circle':
            // Center handle
            drawHandle(shape.cx, shape.cy, 'center');
            // Cardinal direction handles
            drawHandle(shape.cx + shape.radius, shape.cy, 'midpoint');
            drawHandle(shape.cx - shape.radius, shape.cy, 'midpoint');
            drawHandle(shape.cx, shape.cy + shape.radius, 'midpoint');
            drawHandle(shape.cx, shape.cy - shape.radius, 'midpoint');
            break;
            
        case 'arc':
            // Center handle
            drawHandle(shape.cx, shape.cy, 'center');
            // Start and end point handles
            const startX = shape.cx + shape.radius * Math.cos(shape.startAngle);
            const startY = shape.cy + shape.radius * Math.sin(shape.startAngle);
            const endX = shape.cx + shape.radius * Math.cos(shape.endAngle);
            const endY = shape.cy + shape.radius * Math.sin(shape.endAngle);
            drawHandle(startX, startY, 'endpoint');
            drawHandle(endX, endY, 'endpoint');
            break;
            
        case 'ellipse':
            // Center handle
            drawHandle(shape.cx, shape.cy, 'center');
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
            
            drawHandle(majorX1, majorY1, 'midpoint');
            drawHandle(majorX2, majorY2, 'midpoint');
            drawHandle(minorX1, minorY1, 'midpoint');
            drawHandle(minorX2, minorY2, 'midpoint');
            break;
            
        case 'polygon':
            if (shape.points && shape.points.length > 0) {
                shape.points.forEach(point => {
                    drawHandle(point.x, point.y, 'midpoint');
                });
            }
            break;
            
        case 'spline':
            if (shape.points && shape.points.length > 0) {
                shape.points.forEach((point, index) => {
                    const isEndpoint = index === 0 || index === shape.points.length - 1;
                    drawHandle(point.x, point.y, isEndpoint ? 'endpoint' : 'midpoint');
                });
            }
            break;
            
        case 'hatch':
            if (shape.points && shape.points.length > 0) {
                // Show handles for every other point to reduce clutter
                shape.points.forEach((point, index) => {
                    if (index % 2 === 0) { // Only start points of hatch lines
                        drawHandle(point.x, point.y, 'endpoint');
                    }
                });
            }
            break;
            
        case 'text':
            if (shape.x !== undefined && shape.y !== undefined) {
                const textSize = shape.size || 12;
                const textWidth = shape.content ? shape.content.length * textSize * 0.6 : textSize;
                const textHeight = textSize;
                
                // Text corner handles
                drawHandle(shape.x, shape.y, 'endpoint'); // Baseline start (insertion point)
                drawHandle(shape.x + textWidth, shape.y, 'midpoint'); // Baseline end
                drawHandle(shape.x, shape.y - textHeight, 'midpoint'); // Top left
                drawHandle(shape.x + textWidth, shape.y - textHeight, 'midpoint'); // Top right
            }
            break;
            
        case 'point':
            drawHandle(shape.x, shape.y, 'center');
            break;
    }
    
    // Restore context
    ctx.restore();
}

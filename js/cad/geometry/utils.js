/*
 * Geometry Utils Module - Web1CAD System
 * Version 251207 (December 7, 2025)
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 * If you see this code elsewhere, it was copied.
 */

// Distance from point to line segment
function distanceToLineSegment(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// Line-rectangle intersection test
function lineIntersectsRect(x1, y1, x2, y2, rx1, ry1, rx2, ry2) {
    // Check if either endpoint is inside the rectangle
    if ((x1 >= rx1 && x1 <= rx2 && y1 >= ry1 && y1 <= ry2) ||
        (x2 >= rx1 && x2 <= rx2 && y2 >= ry1 && y2 <= ry2)) {
        return true;
    }

    // Check if line intersects any of the rectangle edges
    return lineIntersectsLine(x1, y1, x2, y2, rx1, ry1, rx1, ry2) || // left edge
        lineIntersectsLine(x1, y1, x2, y2, rx1, ry1, rx2, ry1) || // top edge
        lineIntersectsLine(x1, y1, x2, y2, rx2, ry1, rx2, ry2) || // right edge
        lineIntersectsLine(x1, y1, x2, y2, rx1, ry2, rx2, ry2);    // bottom edge
}

// Circle-rectangle intersection test
function circleIntersectsRect(cx, cy, radius, rx1, ry1, rx2, ry2) {
    // Find the closest point on the rectangle to the circle
    const closestX = Math.max(rx1, Math.min(cx, rx2));
    const closestY = Math.max(ry1, Math.min(cy, ry2));

    // Calculate distance between circle center and closest point
    const distanceX = cx - closestX;
    const distanceY = cy - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    return distanceSquared < radius * radius;
}

// Line-line intersection test
function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false; // lines are parallel

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

// === TRANSFORMATION FUNCTIONS ===

// Rotate shape - АКТИВОВАНА ФУНКЦІЯ
function rotateShape(shape, centerX, centerY, angle) {
    // Function to rotate a single point around center
    function rotatePoint(px, py, cx, cy, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = px - cx;
        const dy = py - cy;
        return {
            x: cx + dx * cos - dy * sin,
            y: cy + dx * sin + dy * cos
        };
    }

    switch (shape.type) {
        case 'line':
            const rotatedStart = rotatePoint(shape.x1, shape.y1, centerX, centerY, angle);
            const rotatedEnd = rotatePoint(shape.x2, shape.y2, centerX, centerY, angle);
            shape.x1 = rotatedStart.x;
            shape.y1 = rotatedStart.y;
            shape.x2 = rotatedEnd.x;
            shape.y2 = rotatedEnd.y;
            break;

        case 'circle':
            const rotatedCenter = rotatePoint(shape.cx, shape.cy, centerX, centerY, angle);
            shape.cx = rotatedCenter.x;
            shape.cy = rotatedCenter.y;
            break;

        case 'arc':
            const rotatedArcCenter = rotatePoint(shape.cx, shape.cy, centerX, centerY, angle);
            shape.cx = rotatedArcCenter.x;
            shape.cy = rotatedArcCenter.y;
            shape.startAngle += angle;
            shape.endAngle += angle;
            break;

        case 'rectangle':
            const rotatedRectCenter = rotatePoint(shape.x + shape.width / 2, shape.y + shape.height / 2, centerX, centerY, angle);
            shape.x = rotatedRectCenter.x - shape.width / 2;
            shape.y = rotatedRectCenter.y - shape.height / 2;
            break;

        case 'polyline':
        case 'polygon':
        case 'spline':
            if (shape.points && shape.points.length > 0) {
                for (let i = 0; i < shape.points.length; i++) {
                    const rotatedPoint = rotatePoint(shape.points[i].x, shape.points[i].y, centerX, centerY, angle);
                    shape.points[i].x = rotatedPoint.x;
                    shape.points[i].y = rotatedPoint.y;
                }
            }
            break;

        case 'text':
            const rotatedTextPos = rotatePoint(shape.x, shape.y, centerX, centerY, angle);
            shape.x = rotatedTextPos.x;
            shape.y = rotatedTextPos.y;
            break;

        case 'point':
            const rotatedPointPos = rotatePoint(shape.x, shape.y, centerX, centerY, angle);
            shape.x = rotatedPointPos.x;
            shape.y = rotatedPointPos.y;
            break;

        case 'hatch':
            if (shape.points && shape.points.length > 0) {
                for (let i = 0; i < shape.points.length; i++) {
                    const rotatedPoint = rotatePoint(shape.points[i].x, shape.points[i].y, centerX, centerY, angle);
                    shape.points[i].x = rotatedPoint.x;
                    shape.points[i].y = rotatedPoint.y;
                }
            }
            break;

        default:
            console.warn('Unknown shape type for rotation:', shape.type);
            return false;
    }

    return true;
}

// Scale shape - АКТИВОВАНА ФУНКЦІЯ
function scaleShape(shape, centerX, centerY, factor) {
    // Function to scale a single point from center
    function scalePoint(px, py, cx, cy, factor) {
        const dx = px - cx;
        const dy = py - cy;
        return {
            x: cx + dx * factor,
            y: cy + dy * factor
        };
    }

    switch (shape.type) {
        case 'line':
            const scaledStart = scalePoint(shape.x1, shape.y1, centerX, centerY, factor);
            const scaledEnd = scalePoint(shape.x2, shape.y2, centerX, centerY, factor);
            shape.x1 = scaledStart.x;
            shape.y1 = scaledStart.y;
            shape.x2 = scaledEnd.x;
            shape.y2 = scaledEnd.y;
            break;

        case 'circle':
            const scaledCenter = scalePoint(shape.cx, shape.cy, centerX, centerY, factor);
            shape.cx = scaledCenter.x;
            shape.cy = scaledCenter.y;
            shape.radius *= factor;
            break;

        case 'arc':
            const scaledArcCenter = scalePoint(shape.cx, shape.cy, centerX, centerY, factor);
            shape.cx = scaledArcCenter.x;
            shape.cy = scaledArcCenter.y;
            shape.radius *= factor;
            break;

        case 'rectangle':
            const scaledRectCenter = scalePoint(shape.x + shape.width / 2, shape.y + shape.height / 2, centerX, centerY, factor);
            shape.width *= factor;
            shape.height *= factor;
            shape.x = scaledRectCenter.x - shape.width / 2;
            shape.y = scaledRectCenter.y - shape.height / 2;
            break;

        case 'polyline':
        case 'polygon':
        case 'spline':
            if (shape.points && shape.points.length > 0) {
                for (let i = 0; i < shape.points.length; i++) {
                    const scaledPoint = scalePoint(shape.points[i].x, shape.points[i].y, centerX, centerY, factor);
                    shape.points[i].x = scaledPoint.x;
                    shape.points[i].y = scaledPoint.y;
                }
            }
            break;

        case 'text':
            const scaledTextPos = scalePoint(shape.x, shape.y, centerX, centerY, factor);
            shape.x = scaledTextPos.x;
            shape.y = scaledTextPos.y;
            if (shape.size) {
                shape.size *= factor;
            }
            break;

        case 'point':
            const scaledPointPos = scalePoint(shape.x, shape.y, centerX, centerY, factor);
            shape.x = scaledPointPos.x;
            shape.y = scaledPointPos.y;
            break;

        case 'hatch':
            if (shape.points && shape.points.length > 0) {
                for (let i = 0; i < shape.points.length; i++) {
                    const scaledPoint = scalePoint(shape.points[i].x, shape.points[i].y, centerX, centerY, factor);
                    shape.points[i].x = scaledPoint.x;
                    shape.points[i].y = scaledPoint.y;
                }
            }
            break;

        default:
            console.warn('Unknown shape type for scaling:', shape.type);
            return false;
    }

    return true;
}

// Mirror shape - OPTIMIZED with Unified Shape Handler
function mirrorShape(shape, x1, y1, x2, y2) {
    // OPTIMIZED with Unified Shape Handler
    if (window.shapeHandler) {
        const result = window.shapeHandler.mirrorShape(shape, x1, y1, x2, y2);
        if (result !== undefined) {
            return result;
        }
    }
    
    // Fallback to original implementation for compatibility
    // Calculate mirror line parameters
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;
    
    const nx = -dy / length; // Normal vector
    const ny = dx / length;
    
    function mirrorPoint(x, y) {
        // Vector from line start to point
        const px = x - x1;
        const py = y - y1;
        
        // Project onto normal and reflect
        const dot = px * nx + py * ny;
        return {
            x: x - 2 * dot * nx,
            y: y - 2 * dot * ny
        };
    }
    
    switch(shape.type) {
        case 'line':
            const p1 = mirrorPoint(shape.x1, shape.y1);
            const p2 = mirrorPoint(shape.x2, shape.y2);
            shape.x1 = p1.x; shape.y1 = p1.y;
            shape.x2 = p2.x; shape.y2 = p2.y;
            break;
        case 'circle':
            const center = mirrorPoint(shape.cx, shape.cy);
            shape.cx = center.x;
            shape.cy = center.y;
            break;
        case 'ellipse':
            const ellipseCenter = mirrorPoint(shape.cx, shape.cy);
            shape.cx = ellipseCenter.x;
            shape.cy = ellipseCenter.y;
            // Mirror rotation angle
            shape.rotation = -shape.rotation || 0;
            break;
        case 'arc':
            const arcCenter = mirrorPoint(shape.cx, shape.cy);
            shape.cx = arcCenter.x;
            shape.cy = arcCenter.y;
            // Mirror angles
            const temp = shape.startAngle;
            shape.startAngle = -shape.endAngle;
            shape.endAngle = -temp;
            break;
        case 'rectangle':
            const corner = mirrorPoint(shape.x, shape.y);
            shape.x = corner.x;
            shape.y = corner.y;
            break;
        case 'point':
        case 'text':
            const point = mirrorPoint(shape.x, shape.y);
            shape.x = point.x;
            shape.y = point.y;
            break;
        default:
            if (shape.points) {
                shape.points.forEach(point => {
                    const mirrored = mirrorPoint(point.x, point.y);
                    point.x = mirrored.x;
                    point.y = mirrored.y;
                });
            }
    }
}

// Move shape - OPTIMIZED with Unified Shape Handler
function moveShape(shape, dx, dy) {
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('move', shape.type, shape, dx, dy);
        if (result !== null) {
            return result;
        }
    }
    
    // Fallback to original implementation for compatibility
    switch(shape.type) {
        case 'line':
            shape.x1 += dx;
            shape.y1 += dy;
            shape.x2 += dx;
            shape.y2 += dy;
            break;
        case 'polyline':
        case 'polygon':
        case 'spline':
        case 'hatch':
            if (shape.points) {
                shape.points.forEach(point => {
                    point.x += dx;
                    point.y += dy;
                });
            }
            break;
        case 'circle':
        case 'arc':
            shape.cx += dx;
            shape.cy += dy;
            break;
        case 'ellipse':
            shape.cx += dx;
            shape.cy += dy;
            break;
        case 'point':
        case 'text':
            shape.x += dx;
            shape.y += dy;
            break;
    }
}

// === SELECTION AND DETECTION FUNCTIONS ===

function isShapeInWindow(shape, x1, y1, x2, y2) {
    // Window intersection testing - OPTIMIZED with Unified Shape Handler
    // Ensure window coordinates are correct
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('isInWindow', shape.type, shape, minX, maxX, minY, maxY);
        if (result !== null && result !== undefined) {
            return result;
        }
    }
    
    // Fallback to original implementation for compatibility
    switch(shape.type) {
        case 'line':
            return (shape.x1 >= minX && shape.x1 <= maxX && shape.y1 >= minY && shape.y1 <= maxY) &&
                   (shape.x2 >= minX && shape.x2 <= maxX && shape.y2 >= minY && shape.y2 <= maxY);
        case 'polyline':
        case 'polygon':
        case 'spline':
        case 'hatch':
            if (!shape.points || shape.points.length === 0) return false;
            return shape.points.every(point => 
                point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY);
        case 'circle':
            return (shape.cx - shape.radius >= minX && shape.cx + shape.radius <= maxX &&
                   shape.cy - shape.radius >= minY && shape.cy + shape.radius <= maxY);
        case 'ellipse':
            // Use bounding box approximation for ellipse
            const ellipseBounds = getEllipseBounds(shape);
            return (ellipseBounds.minX >= minX && ellipseBounds.maxX <= maxX &&
                   ellipseBounds.minY >= minY && ellipseBounds.maxY <= maxY);
        case 'arc':
            return (shape.cx >= minX && shape.cx <= maxX && shape.cy >= minY && shape.cy <= maxY);
        case 'point':
        case 'text':
            return (shape.x >= minX && shape.x <= maxX && shape.y >= minY && shape.y <= maxY);
    }
    return false;
}

function doesShapeIntersectWindow(shape, x1, y1, x2, y2) {
    // Window intersection testing - OPTIMIZED with Unified Shape Handler
    // Ensure window coordinates are correct
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('intersectsWindow', shape.type, shape, minX, maxX, minY, maxY);
        if (result !== null && result !== undefined) {
            return result;
        }
    }
    
    // Fallback to original implementation for compatibility
    switch(shape.type) {
        case 'line':
            return lineIntersectsRect(shape.x1, shape.y1, shape.x2, shape.y2, minX, minY, maxX, maxY);
        case 'polyline':
        case 'polygon':
        case 'spline':
        case 'hatch':
            if (!shape.points || shape.points.length === 0) return false;
            for (let i = 0; i < shape.points.length - 1; i++) {
                if (lineIntersectsRect(shape.points[i].x, shape.points[i].y,
                                     shape.points[i + 1].x, shape.points[i + 1].y,
                                     minX, minY, maxX, maxY)) {
                    return true;
                }
            }
            return false;
        case 'circle':
            return circleIntersectsRect(shape.cx, shape.cy, shape.radius, minX, minY, maxX, maxY);
        case 'ellipse':
            return ellipseIntersectsRect(shape, minX, minY, maxX, maxY);
        case 'arc':
            return circleIntersectsRect(shape.cx, shape.cy, shape.radius, minX, minY, maxX, maxY);
        case 'point':
            return (shape.x >= minX && shape.x <= maxX && shape.y >= minY && shape.y <= maxY);
        case 'text':
            if (shape.content && shape.x !== undefined && shape.y !== undefined) {
                const textSize = shape.size || 12;
                const textWidth = shape.content.length * textSize * 0.6;
                const textHeight = textSize;
                
                const textMinX = shape.x - (textWidth * 0.1);
                const textMaxX = shape.x + textWidth;
                const textMinY = shape.y - textHeight;
                const textMaxY = shape.y + (textHeight * 0.3);
                
                return !(textMaxX < minX || textMinX > maxX ||
                    textMaxY < minY || textMinY > maxY);
            }
            return false;
    }
    return false;
}

// === ELLIPSE GEOMETRY UTILITIES ===

/**
 * Get bounding box of an ellipse
 * @param {Object} ellipse - Ellipse shape with cx, cy, rx, ry, rotation
 * @returns {Object} Bounding box with minX, maxX, minY, maxY
 */
function getEllipseBounds(ellipse) {
    const cx = ellipse.cx;
    const cy = ellipse.cy;
    const rx = ellipse.rx;
    const ry = ellipse.ry;
    const rotation = ellipse.rotation || 0;
    
    // Calculate rotated bounding box
    const cos = Math.abs(Math.cos(rotation));
    const sin = Math.abs(Math.sin(rotation));
    
    const width = rx * cos + ry * sin;
    const height = rx * sin + ry * cos;
    
    return {
        minX: cx - width,
        maxX: cx + width,
        minY: cy - height,
        maxY: cy + height
    };
}

/**
 * Test if ellipse intersects with rectangle
 * @param {Object} ellipse - Ellipse shape
 * @param {number} rx1 - Rectangle min X
 * @param {number} ry1 - Rectangle min Y
 * @param {number} rx2 - Rectangle max X
 * @param {number} ry2 - Rectangle max Y
 * @returns {boolean} True if intersects
 */
function ellipseIntersectsRect(ellipse, rx1, ry1, rx2, ry2) {
    // Use bounding box approximation for performance
    const bounds = getEllipseBounds(ellipse);
    return !(bounds.maxX < rx1 || bounds.minX > rx2 || 
             bounds.maxY < ry1 || bounds.minY > ry2);
}

// === ADVANCED GEOMETRY UTILITIES ===

/**
 * Get intersection point of two lines
 * @param {number} x1 - Line 1 start X
 * @param {number} y1 - Line 1 start Y
 * @param {number} x2 - Line 1 end X
 * @param {number} y2 - Line 1 end Y
 * @param {number} x3 - Line 2 start X
 * @param {number} y3 - Line 2 start Y
 * @param {number} x4 - Line 2 end X
 * @param {number} y4 - Line 2 end Y
 * @param {boolean} allowExtension - Allow intersection beyond line segments
 * @returns {Object|null} Intersection point {x, y} or null
 */
function getLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4, allowExtension = false) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (Math.abs(denom) < 1e-10) return null; // Lines are parallel

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    if (!allowExtension && (ua < 0 || ua > 1 || ub < 0 || ub > 1)) {
        return null; // Intersection is outside line segments
    }

    return {
        x: x1 + ua * (x2 - x1),
        y: y1 + ua * (y2 - y1)
    };
}

function drawShapeOutline(ctx, shape) {
    // Draw outline around shape for selection highlighting using enhanced rendering core
    
    // Use enhanced rendering system if available
    if (typeof drawShape === 'function') {
        ctx.save();
        
        // Force selection styling for outline
        const originalSelected = shape.selected;
        shape.selected = true;
        
        // Draw with enhanced system (it handles selection highlighting)
        drawShape(ctx, shape, zoom, true);
        
        // Restore original selection state
        shape.selected = originalSelected;
        
        ctx.restore();
        return;
    }
    
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('outline', shape.type, ctx, shape);
        if (result !== null) {
            // Successfully outlined with optimized handler
            return;
        }
    }
    
    // Fallback to original implementation for compatibility
    switch(shape.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
            break;
        case 'polyline':
            if (shape.points.length < 2) break;
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
            ctx.beginPath();
            ctx.arc(shape.cx, shape.cy, shape.radius, shape.startAngle, shape.endAngle);
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
            if (shape.points.length > 1) {
                drawSmoothSpline(ctx, shape.points);
            }
            break;
        case 'point':
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, 3 / zoom, 0, 2 * Math.PI);
            ctx.stroke();
            break;
        case 'text':
            // Draw rectangle around text
            const textSize = shape.size || (12 / zoom);
            const textWidth = shape.content ? shape.content.length * textSize * 0.6 : 10;
            ctx.strokeRect(shape.x - 2, shape.y - textSize, textWidth + 4, textSize + 4);
            break;
        case 'hatch':
            if (shape.points && shape.points.length > 1) {
                ctx.beginPath();
                for (let i = 0; i < shape.points.length; i += 2) {
                    if (i + 1 < shape.points.length) {
                        ctx.moveTo(shape.points[i].x, shape.points[i].y);
                        ctx.lineTo(shape.points[i+1].x, shape.points[i+1].y);
                    }
                }
                ctx.stroke();
            }
            break;
    }
}

function screenToWorld(x, y) {
    return [(x - offsetX) / zoom, (canvas.height - y - offsetY) / zoom];
}

function worldToScreen(x, y) {
    return [x * zoom + offsetX, canvas.height - (y * zoom + offsetY)];
}

function applySnap(x, y) {
    if (snapEnabled) {
        // Use current grid step based on zoom level
        const gridSettings = getCurrentGridSettings();
        
        // Use subgrid for snapping if zoomed in enough and subgrid is available
        let snapStep = gridSettings.base;
        if (gridSettings.sub > 0 && zoom > 2.0) {
            snapStep = gridSettings.sub;
        }
        
        x = Math.round(x / snapStep) * snapStep;
        y = Math.round(y / snapStep) * snapStep;
    }
    return [x, y];
}

function applyOrtho(x, y, refX, refY) {
    if (orthoMode) {
        const dx = Math.abs(x - refX);
        const dy = Math.abs(y - refY);
        if (dx > dy) y = refY;
        else x = refX;
    }
    return [x, y];
}

function findOsnap(x, y) {
    if (!objectSnapEnabled) return null;
    for (const shape of shapes) {
        const pts = shape.type === 'line'
            ? [[shape.x1, shape.y1], [shape.x2, shape.y2]]
            : shape.type === 'polyline'
                ? shape.points.map(p => [p.x, p.y])
                : shape.type === 'circle'
                    ? [[shape.cx, shape.cy]]
                    : shape.type === 'arc'
                        ? [[shape.cx, shape.cy],
                            [shape.cx + shape.radius * Math.cos(shape.startAngle),
                                shape.cy + shape.radius * Math.sin(shape.startAngle)],
                            [shape.cx + shape.radius * Math.cos(shape.endAngle),
                                shape.cy + shape.radius * Math.sin(shape.endAngle)]]
                            : (shape.type === 'polygon' || (shape.type === 'polyline' && shape.isPolygon))
                                ? shape.points.map(p => [p.x, p.y])
                                : shape.type === 'point'
                                    ? [[shape.x, shape.y]]
                                    : [];
        for (const [px, py] of pts) {
            const dx = x - px, dy = y - py;
            if (Math.sqrt(dx * dx + dy * dy) < 10 / zoom)
                return { x: px, y: py };
        }
    }
    return null;
}

// Check if a point is inside a shape - OPTIMIZED with Unified Shape Handler
/**
 * Calculate distance from point to line segment
 * @param {number} px - Point X coordinate
 * @param {number} py - Point Y coordinate  
 * @param {number} x1 - Line start X
 * @param {number} y1 - Line start Y
 * @param {number} x2 - Line end X
 * @param {number} y2 - Line end Y
 * @returns {number} Distance from point to line segment
 */
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
    // Vector from line start to end
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // If line has zero length, return distance to point
    if (dx === 0 && dy === 0) {
        return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }
    
    // Calculate parameter t for closest point on line
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    
    // Clamp t to segment bounds [0, 1]
    const clampedT = Math.max(0, Math.min(1, t));
    
    // Find closest point on segment
    const closestX = x1 + clampedT * dx;
    const closestY = y1 + clampedT * dy;
    
    // Return distance from point to closest point on segment
    return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
}

function isPointInShape(shape, x, y) {
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('hitTest', shape.type, shape, x, y, 5 / zoom);
        if (result !== null) {
            return result;
        }
    }
    
    // Fallback to original implementation for compatibility
    if (shape.type === 'line') {
        return distanceToLineSegment(x, y, shape.x1, shape.y1, shape.x2, shape.y2) < 5 / zoom;
    } else if (shape.type === 'polyline') {
        // Checking polyline collision
        for (let i = 1; i < shape.points.length; i++) {
            const p1 = shape.points[i-1];
            const p2 = shape.points[i];
            const distance = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            // Segment collision detection
            if (distance < 5 / zoom) {
                // Polyline segment hit detected
                return true;
            }
        }
        return false;
    } else if (shape.type === 'circle') {
        const dx = x - shape.cx;
        const dy = y - shape.cy;
        return Math.sqrt(dx * dx + dy * dy) <= shape.radius + (2 / zoom) &&
            Math.sqrt(dx * dx + dy * dy) >= shape.radius - (2 / zoom);
    } else if (shape.type === 'ellipse') {
        // Transform point to ellipse local coordinates
        const dx = x - shape.cx;
        const dy = y - shape.cy;
        
        // Apply reverse rotation if ellipse is rotated
        let localX = dx;
        let localY = dy;
        if (shape.rotation) {
            const rad = -shape.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            localX = dx * cos - dy * sin;
            localY = dx * sin + dy * cos;
        }
        
        // Check if point is on ellipse perimeter using standard ellipse equation
        const normalizedDist = (localX * localX) / (shape.rx * shape.rx) + (localY * localY) / (shape.ry * shape.ry);
        const threshold = 2 / zoom;
        const innerLimit = Math.max(0, 1 - threshold / Math.min(shape.rx, shape.ry));
        const outerLimit = 1 + threshold / Math.min(shape.rx, shape.ry);
        
        return normalizedDist >= innerLimit && normalizedDist <= outerLimit;
    } else if (shape.type === 'arc') {
        const dx = x - shape.cx;
        const dy = y - shape.cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance >= shape.radius - (2 / zoom) && distance <= shape.radius + (2 / zoom)) {
            const angle = Math.atan2(dy, dx);
            // Normalize angles
            let start = shape.startAngle;
            let end = shape.endAngle;
            if (end < start) end += 2 * Math.PI;
            if (angle < start) angle += 2 * Math.PI;
            return angle >= start && angle <= end;
        }
        return false;
    } else if (shape.type === 'polygon' || (shape.type === 'polyline' && shape.isPolygon)) {
        // Simple point-in-polygon test
        let inside = false;
        // For polygon polylines, exclude the last point since it's a duplicate of the first
        const points = shape.isPolygon && shape.points.length > 2 ? 
            shape.points.slice(0, -1) : shape.points;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;

            const intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    } else if (shape.type === 'point') {
        const dx = x - shape.x;
        const dy = y - shape.y;
        return Math.sqrt(dx * dx + dy * dy) < 5 / zoom;
    } else if (shape.type === 'spline') {
        // Check spline selection like polyline
        if (shape.points && shape.points.length > 1) {
            for (let i = 1; i < shape.points.length; i++) {
                const p1 = shape.points[i-1];
                const p2 = shape.points[i];
                const distance = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
                if (distance < 5 / zoom) {
                    return true;
                }
            }
        }
        return false;
    } else if (shape.type === 'hatch') {
        // Check hatch selection by testing line segments
        if (shape.points && shape.points.length > 1) {
            for (let i = 0; i < shape.points.length; i += 2) {
                if (i + 1 < shape.points.length) {
                    const p1 = shape.points[i];
                    const p2 = shape.points[i + 1];
                    const distance = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
                    if (distance < 5 / zoom) {
                        return true;
                    }
                }
            }
        }
        return false;
    } else if (shape.type === 'text') {
        // Check text selection by bounding box (Professional CAD style with Y-flip correction)
        if (shape.content && shape.x !== undefined && shape.y !== undefined) {
            const worldTextSize = shape.size || shape.height || 12; // Text height in world units
            
            // Calculate approximate text dimensions in world units
            const charWidth = worldTextSize * 0.6; // Average character width
            const textWidth = shape.content.length * charWidth;
            const textHeight = worldTextSize;
            
            // CRITICAL FIX: Account for Y-flip + alphabetic baseline
            // In rendering: textBaseline='alphabetic' + Y-flip means text appears above insertion point
            const baselineOffset = textHeight * 0.2; // alphabetic baseline offset
            
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
                        // With Y-flip + alphabetic baseline, text appears above insertion point
                        minY = shape.y + baselineOffset;
                        maxY = shape.y + textHeight + baselineOffset;
                        break;
                    case 'left':
                    default:
                        minX = shape.x;
                        maxX = shape.x + textWidth;
                        // With Y-flip + alphabetic baseline, text appears above insertion point
                        minY = shape.y + baselineOffset;
                        maxY = shape.y + textHeight + baselineOffset;
                        break;
                }
            } else {
                // Default left alignment - With Y-flip + alphabetic baseline
                minX = shape.x;
                maxX = shape.x + textWidth;
                minY = shape.y + baselineOffset;
                maxY = shape.y + textHeight + baselineOffset;
            }
            
            // Add tolerance for easier selection
            const tolerance = 3 / zoom;
            minX -= tolerance;
            maxX += tolerance;
            minY -= tolerance;
            maxY += tolerance;
            
            return x >= minX && x <= maxX && y >= minY && y <= maxY;
        }
        return false;
    }
    return false;
}


/**
 * Check if shape is entirely within selection window (window selection)
 * @param {Object} shape - Shape to check
 * @param {number} x1 - Window start X
 * @param {number} y1 - Window start Y  
 * @param {number} x2 - Window end X
 * @param {number} y2 - Window end Y
 * @returns {boolean} True if shape is entirely within window
 */
function isShapeInWindow(shape, x1, y1, x2, y2) {
    // Normalize window coordinates
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    switch(shape.type) {
        case 'line':
            return (shape.x1 >= minX && shape.x1 <= maxX && shape.y1 >= minY && shape.y1 <= maxY) &&
                   (shape.x2 >= minX && shape.x2 <= maxX && shape.y2 >= minY && shape.y2 <= maxY);
                   
        case 'circle':
            return (shape.cx - shape.radius >= minX && shape.cx + shape.radius <= maxX &&
                   shape.cy - shape.radius >= minY && shape.cy + shape.radius <= maxY);
                   
        case 'arc':
            // Simplified check - check if center and radius bounds are within window
            return (shape.cx - shape.radius >= minX && shape.cx + shape.radius <= maxX &&
                   shape.cy - shape.radius >= minY && shape.cy + shape.radius <= maxY);
                   
        case 'rectangle':
            const rectMinX = Math.min(shape.x1, shape.x2);
            const rectMaxX = Math.max(shape.x1, shape.x2);
            const rectMinY = Math.min(shape.y1, shape.y2);
            const rectMaxY = Math.max(shape.y1, shape.y2);
            return (rectMinX >= minX && rectMaxX <= maxX && rectMinY >= minY && rectMaxY <= maxY);
            
        case 'ellipse':
            // Simplified check using axis-aligned bounding box
            return (shape.cx - shape.rx >= minX && shape.cx + shape.rx <= maxX &&
                   shape.cy - shape.ry >= minY && shape.cy + shape.ry <= maxY);
                   
        case 'polyline':
        case 'polygon':
        case 'spline':
            if (!shape.points || shape.points.length === 0) return false;
            // Check if all points are within window
            return shape.points.every(point => 
                point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY);
                
        case 'point':
            return (shape.x >= minX && shape.x <= maxX && shape.y >= minY && shape.y <= maxY);
            
        case 'text':
        case 'mtext':
            // Text bounds depend on content and alignment (Professional CAD style)
            if (shape.content && shape.x !== undefined && shape.y !== undefined) {
                const worldTextSize = shape.size || shape.height || 12;
                const charWidth = worldTextSize * 0.6;
                const textWidth = shape.content.length * charWidth;
                const textHeight = worldTextSize;
                
                // CRITICAL FIX: Match hit testing logic - text goes ABOVE insertion point due to Y-flip
                let textMinX, textMaxX, textMinY, textMaxY;
                
                if (shape.align) {
                    switch (shape.align.toLowerCase()) {
                        case 'center':
                        case 'middle':
                            textMinX = shape.x - textWidth / 2;
                            textMaxX = shape.x + textWidth / 2;
                            textMinY = shape.y - textHeight / 2;
                            textMaxY = shape.y + textHeight / 2;
                            break;
                        case 'right':
                            textMinX = shape.x - textWidth;
                            textMaxX = shape.x;
                            // With Y-flip, text goes ABOVE insertion point
                            textMinY = shape.y;
                            textMaxY = shape.y + textHeight;
                            break;
                        case 'left':
                        default:
                            textMinX = shape.x;
                            textMaxX = shape.x + textWidth;
                            // With Y-flip, text goes ABOVE insertion point
                            textMinY = shape.y;
                            textMaxY = shape.y + textHeight;
                            break;
                    }
                } else {
                    // Default left alignment - With Y-flip, text goes ABOVE insertion point
                    textMinX = shape.x;
                    textMaxX = shape.x + textWidth;
                    textMinY = shape.y;
                    textMaxY = shape.y + textHeight;
                }
                
                return (textMinX >= minX && textMaxX <= maxX && textMinY >= minY && textMaxY <= maxY);
            }
            return (shape.x >= minX && shape.x <= maxX && shape.y >= minY && shape.y <= maxY);
            
        default:
            return false;
    }
}


/**
 * Check if shape intersects with selection window (crossing selection)
 * @param {Object} shape - Shape to check
 * @param {number} x1 - Window start X
 * @param {number} y1 - Window start Y
 * @param {number} x2 - Window end X  
 * @param {number} y2 - Window end Y
 * @returns {boolean} True if shape intersects with window
 */
function doesShapeIntersectWindow(shape, x1, y1, x2, y2) {
    // Normalize window coordinates
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    switch(shape.type) {
        case 'line':
            // Line-rectangle intersection test
            return lineIntersectsRect(shape.x1, shape.y1, shape.x2, shape.y2, minX, minY, maxX, maxY);
            
        case 'circle':
            // Circle-rectangle intersection test
            return circleIntersectsRect(shape.cx, shape.cy, shape.radius, minX, minY, maxX, maxY);
            
        case 'arc':
            // Simplified: check if arc's bounding circle intersects
            return circleIntersectsRect(shape.cx, shape.cy, shape.radius, minX, minY, maxX, maxY);
            
        case 'rectangle':
            const rectMinX = Math.min(shape.x1, shape.x2);
            const rectMaxX = Math.max(shape.x1, shape.x2);
            const rectMinY = Math.min(shape.y1, shape.y2);
            const rectMaxY = Math.max(shape.y1, shape.y2);
            // Rectangle-rectangle intersection
            return !(rectMaxX < minX || rectMinX > maxX || rectMaxY < minY || rectMinY > maxY);
            
        case 'ellipse':
            // Simplified: check if ellipse's bounding box intersects
            const ellipseMinX = shape.cx - shape.rx;
            const ellipseMaxX = shape.cx + shape.rx;
            const ellipseMinY = shape.cy - shape.ry;
            const ellipseMaxY = shape.cy + shape.ry;
            return !(ellipseMaxX < minX || ellipseMinX > maxX || ellipseMaxY < minY || ellipseMinY > maxY);
            
        case 'polyline':
        case 'polygon':
        case 'spline':
            if (!shape.points || shape.points.length === 0) return false;
            // Check if any line segment intersects with window
            for (let i = 1; i < shape.points.length; i++) {
                if (lineIntersectsRect(
                    shape.points[i-1].x, shape.points[i-1].y,
                    shape.points[i].x, shape.points[i].y,
                    minX, minY, maxX, maxY)) {
                    return true;
                }
            }
            // Also check if any point is within window
            return shape.points.some(point => 
                point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY);
                
        case 'point':
            return (shape.x >= minX && shape.x <= maxX && shape.y >= minY && shape.y <= maxY);
            
        case 'text':
        case 'mtext':
            // Text crossing selection (Professional CAD style) - check if text bounds intersect window - Y-flip corrected
            if (shape.content && shape.x !== undefined && shape.y !== undefined) {
                const worldTextSize = shape.size || shape.height || 12;
                const charWidth = worldTextSize * 0.6;
                const textWidth = shape.content.length * charWidth;
                const textHeight = worldTextSize;
                
                // CRITICAL FIX: Match hit testing logic - text goes ABOVE insertion point due to Y-flip
                let textMinX, textMaxX, textMinY, textMaxY;
                
                if (shape.align) {
                    switch (shape.align.toLowerCase()) {
                        case 'center':
                        case 'middle':
                            textMinX = shape.x - textWidth / 2;
                            textMaxX = shape.x + textWidth / 2;
                            textMinY = shape.y - textHeight / 2;
                            textMaxY = shape.y + textHeight / 2;
                            break;
                        case 'right':
                            textMinX = shape.x - textWidth;
                            textMaxX = shape.x;
                            // With Y-flip, text goes ABOVE insertion point
                            textMinY = shape.y;
                            textMaxY = shape.y + textHeight;
                            break;
                        case 'left':
                        default:
                            textMinX = shape.x;
                            textMaxX = shape.x + textWidth;
                            // With Y-flip, text goes ABOVE insertion point
                            textMinY = shape.y;
                            textMaxY = shape.y + textHeight;
                            break;
                    }
                } else {
                    // Default left alignment - With Y-flip, text goes ABOVE insertion point
                    textMinX = shape.x;
                    textMaxX = shape.x + textWidth;
                    textMinY = shape.y;
                    textMaxY = shape.y + textHeight;
                }
                
                // Check if text bounds intersect with selection window
                return !(textMaxX < minX || textMinX > maxX || textMaxY < minY || textMinY > maxY);
            }
            return (shape.x >= minX && shape.x <= maxX && shape.y >= minY && shape.y <= maxY);
            
        default:
            return false;
    }
}

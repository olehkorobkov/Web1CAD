/*
 * Geometry Utils Module - Web1CAD System
 * Version 0.250801 (August 1, 2025)
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 * If you see this code elsewhere, it was copied.
 */

// === Geometry Utils Module ===
// This module contains mathematical functions and geometry utilities

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

// Rotate shape - OPTIMIZED with Unified Shape Handler
function rotateShape(shape, angle, centerX, centerY) {
    // OPTIMIZED with Unified Shape Handler
    if (window.shapeHandler) {
        const result = window.shapeHandler.rotateShape(shape, angle, centerX, centerY);
        if (result !== undefined) {
            return result;
        }
    }
    
    // Fallback to original implementation for compatibility
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    function rotatePoint(x, y) {
        const dx = x - centerX;
        const dy = y - centerY;
        return {
            x: centerX + dx * cos - dy * sin,
            y: centerY + dx * sin + dy * cos
        };
    }
    
    switch(shape.type) {
        case 'line':
            const p1 = rotatePoint(shape.x1, shape.y1);
            const p2 = rotatePoint(shape.x2, shape.y2);
            shape.x1 = p1.x; shape.y1 = p1.y;
            shape.x2 = p2.x; shape.y2 = p2.y;
            break;
        case 'circle':
        case 'arc':
            const center = rotatePoint(shape.cx, shape.cy);
            shape.cx = center.x;
            shape.cy = center.y;
            if (shape.type === 'arc') {
                shape.startAngle += angle;
                shape.endAngle += angle;
            }
            break;
        case 'ellipse':
            const ellipseCenter = rotatePoint(shape.cx, shape.cy);
            shape.cx = ellipseCenter.x;
            shape.cy = ellipseCenter.y;
            shape.rotation = (shape.rotation || 0) + angle;
            break;
        case 'rectangle':
            const corner = rotatePoint(shape.x, shape.y);
            shape.x = corner.x;
            shape.y = corner.y;
            // Note: Rectangle rotation would require converting to polygon
            break;
        case 'point':
        case 'text':
            const point = rotatePoint(shape.x, shape.y);
            shape.x = point.x;
            shape.y = point.y;
            break;
        default:
            if (shape.points) {
                shape.points.forEach(point => {
                    const rotated = rotatePoint(point.x, point.y);
                    point.x = rotated.x;
                    point.y = rotated.y;
                });
            }
    }
}

// Scale shape - OPTIMIZED with Unified Shape Handler
function scaleShape(shape, centerX, centerY, factor) {
    // OPTIMIZED with Unified Shape Handler
    if (window.shapeHandler) {
        const result = window.shapeHandler.scaleShape(shape, factor, centerX, centerY);
        if (result !== undefined) {
            return result;
        }
    }
    
    // Fallback to original implementation for compatibility
    function scalePoint(x, y) {
        return {
            x: centerX + (x - centerX) * factor,
            y: centerY + (y - centerY) * factor
        };
    }
    
    switch(shape.type) {
        case 'line':
            const p1 = scalePoint(shape.x1, shape.y1);
            const p2 = scalePoint(shape.x2, shape.y2);
            shape.x1 = p1.x; shape.y1 = p1.y;
            shape.x2 = p2.x; shape.y2 = p2.y;
            break;
        case 'circle':
        case 'arc':
            const center = scalePoint(shape.cx, shape.cy);
            shape.cx = center.x;
            shape.cy = center.y;
            shape.radius *= factor;
            break;
        case 'ellipse':
            const ellipseCenter = scalePoint(shape.cx, shape.cy);
            shape.cx = ellipseCenter.x;
            shape.cy = ellipseCenter.y;
            shape.rx *= factor;
            shape.ry *= factor;
            break;
        case 'rectangle':
            const corner = scalePoint(shape.x, shape.y);
            shape.x = corner.x;
            shape.y = corner.y;
            shape.width *= factor;
            shape.height *= factor;
            break;
        case 'point':
        case 'text':
            const point = scalePoint(shape.x, shape.y);
            shape.x = point.x;
            shape.y = point.y;
            if (shape.size) shape.size *= factor;
            break;
        default:
            if (shape.points) {
                shape.points.forEach(point => {
                    const scaled = scalePoint(point.x, point.y);
                    point.x = scaled.x;
                    point.y = scaled.y;
                });
            }
    }
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

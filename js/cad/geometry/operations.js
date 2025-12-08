let isDrawing = false;
let startX = 0, startY = 0;
let previewX = 0, previewY = 0;
let currentMouseX = 0, currentMouseY = 0; 

// Initialize copiedShapes as global variable for copy/paste operations
if (typeof window.copiedShapes === 'undefined') {
    window.copiedShapes = [];
}
let copiedShapes = window.copiedShapes;

let mirrorLine = null;

let moveStep = 0;
let moveBasePoint = { x: 0, y: 0 };
let moveObjectsToMove = new Set();
let movePreviewActive = false;

let copyStep = 0;
let copyBasePoint = { x: 0, y: 0 };
let copyObjectsToCopy = new Set();
let copyPreviewActive = false;

let isLengthInputActive = false;
let lineDirection = { x: 0, y: 0 };
let polylineDirection = { x: 0, y: 0 };
let splineDirection = { x: 0, y: 0 };

let polylinePoints = [];
let polylinePreviewActive = false;

let ellipseDrawingStep = 0;
let ellipseCenter = { x: 0, y: 0 };
let ellipseMajorRadius = 0;
let ellipsePreviewActive = false;

let arcPoints = [];
let arcDrawingStep = 0;
let arcPreviewActive = false;

let rectangleStep = 0;
let rectangleStartX = 0;
let rectangleStartY = 0;
let rectangleWidth = 0;
let rectangleHeight = 0;
let rectangleAngle = 0;
let rectangleWidthSign = 1;
let rectangleHeightSign = 1;

// Polygon variables
let polygonSides = 5;
let polygonRadius = 0;
let polygonAngle = 0;
let polygonStep = 0;
let polygonCenterX = 0;
let polygonCenterY = 0;
let polygonRadiusType = 'circumscribed'; // 'inscribed' or 'circumscribed'

let splinePoints = [];
let splinePreviewActive = false;
let splineStep = 0;
let hatchPoints = [];
let textPosition = { x: 0, y: 0 };

let lastClickTime = 0;
let lastClickX = 0;
let lastClickY = 0;

function isShapeInViewport(shape, bounds) {
    if (!shape || !bounds) return true; 
    
    try {
        switch (shape.type) {
            case 'line':
                return isLineInViewport(shape, bounds);
            case 'circle':
                return isCircleInViewport(shape, bounds);
            case 'rectangle':
                return isRectInViewport(shape, bounds);
            case 'ellipse':
                return isEllipseInViewport(shape, bounds);
            case 'arc':
                return isArcInViewport(shape, bounds);
            case 'point':
            case 'text':
                return isPointInViewport(shape, bounds);
            case 'polyline':
            case 'polygon':
            case 'spline':
                return isPolylineInViewport(shape, bounds);
            default:
                return true; 
        }
    } catch (error) {
        console.warn('Viewport check error for shape:', shape.type, error);
        return true; 
    }
}

function isLineInViewport(shape, bounds) {
    const x1 = shape.x1, y1 = shape.y1, x2 = shape.x2, y2 = shape.y2;
    return !(Math.max(x1, x2) < bounds.minX || Math.min(x1, x2) > bounds.maxX ||
             Math.max(y1, y2) < bounds.minY || Math.min(y1, y2) > bounds.maxY);
}

function isCircleInViewport(shape, bounds) {
    const cx = shape.cx, cy = shape.cy, r = shape.radius;
    return !(cx + r < bounds.minX || cx - r > bounds.maxX ||
             cy + r < bounds.minY || cy - r > bounds.maxY);
}

function isRectInViewport(shape, bounds) {
    return !(shape.x + shape.width < bounds.minX || shape.x > bounds.maxX ||
             shape.y + shape.height < bounds.minY || shape.y > bounds.maxY);
}

function isEllipseInViewport(shape, bounds) {
    const cx = shape.cx, cy = shape.cy, rx = shape.rx, ry = shape.ry;
    return !(cx + rx < bounds.minX || cx - rx > bounds.maxX ||
             cy + ry < bounds.minY || cy - ry > bounds.maxY);
}

function isArcInViewport(shape, bounds) {
    return isCircleInViewport(shape, bounds);
}

function isPointInViewport(shape, bounds) {
    const x = shape.x || shape.cx;
    const y = shape.y || shape.cy;
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function isPolylineInViewport(shape, bounds) {
    if (!shape.points || shape.points.length === 0) return false;
    
    for (const point of shape.points) {
        if (point.x >= bounds.minX && point.x <= bounds.maxX &&
            point.y >= bounds.minY && point.y <= bounds.maxY) {
            return true;
        }
    }
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const point of shape.points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }
    
    return !(maxX < bounds.minX || minX > bounds.maxX ||
             maxY < bounds.minY || minY > bounds.maxY);
}

function getEffectiveLineweight(shape) {
    const lineweight = shape.lineWeight || shape.lineweight; 
    if (lineweight === 'byLayer' || lineweight === undefined) {
        const layer = layers.find(l => l.name === shape.layer);
        return layer ? layer.lineWeight : 0.25;
    }
    return lineweight;
}

function getCurrentGridSettings() {
    let baseStep = BASE_GRID_STEP; 
    let subStep = SUB_GRID_STEP;   
    
    const baseGridPixels = baseStep * zoom;
    
    let redistributed = false;
    
    if (baseGridPixels < 15) {
        let scaleFactor = 1;
        while ((baseStep * scaleFactor * zoom) < 15) {
            scaleFactor *= 5; 
        }
        if (scaleFactor > 1) {
            subStep = baseStep; 
            baseStep = baseStep * scaleFactor;
            redistributed = true;
        }
    }
    else if (baseGridPixels > 80) {
        let scaleFactor = 1;
        while ((baseStep / scaleFactor * zoom) > 80 && (baseStep / scaleFactor) >= 4) {
            scaleFactor *= 5; 
        }
        if (scaleFactor > 1) {
            baseStep = baseStep / scaleFactor;
            subStep = baseStep / 5; 
            if (baseStep < 4) {
                baseStep = 4;
                subStep = 0; 
            }
            redistributed = true;
        }
    }
    
    if (subStep < 1 || (subStep * zoom) < 3) {
        subStep = 0; 
    }
    
    return {
        base: baseStep,
        sub: subStep,
        major: baseStep * 5 
    };
}

/**
 * Zoom in by a fixed step and recalculate grid
 */
function zoomInStep() {
    const factor = 1.5; 
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const [mx, my] = screenToWorld(centerX, centerY);
    
    zoom *= factor;
    zoom = Math.max(0.001, Math.min(1000, zoom));
    
    offsetX = centerX - mx * zoom;
    offsetY = canvas.height - centerY - my * zoom;
    
    redraw();
    addToHistory(`Zoomed in (${zoom.toFixed(2)}x)`);
}

function zoomOutStep() {
    const factor = 1.5; 
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const [mx, my] = screenToWorld(centerX, centerY);
    
    zoom /= factor;
    zoom = Math.max(0.001, Math.min(1000, zoom));
    
    offsetX = centerX - mx * zoom;
    offsetY = canvas.height - centerY - my * zoom;
    
    redraw();
    addToHistory(`Zoomed out (${zoom.toFixed(2)}x)`);
}

function resetZoom() {
    zoom = 3.7; 
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    
    redraw();
    
    addToHistory('Zoom reset to 1:1');
}

function drawGrid() {
    if (!showGrid) return;

    const startX = -offsetX / zoom;
    const startY = -offsetY / zoom;
    const endX = startX + canvas.width / zoom;
    const endY = startY + canvas.height / zoom;

    const gridSettings = getCurrentGridSettings();
    const baseStep = gridSettings.base;
    const subStep = gridSettings.sub;
    const majorStep = gridSettings.major;

    ctx.save();
    
    const basePixels = baseStep * zoom;
    const subPixels = subStep * zoom;
    const majorPixels = majorStep * zoom;
    
    let baseOpacity = 0.2;   
    let subOpacity = 0.1;    
    let majorOpacity = 0.3;  
    
    if (basePixels < 20) {
        baseOpacity = Math.max(0.1, basePixels / 100); 
    } else if (basePixels > 80) {
        baseOpacity = Math.min(0.35, 0.2 + (basePixels - 80) / 400); 
    }
    
    if (subPixels < 10 && subStep > 0) {
        subOpacity = Math.max(0.05, subPixels / 100); 
    } else if (subPixels > 40 && subStep > 0) {
        subOpacity = Math.min(0.2, 0.1 + (subPixels - 40) / 300); 
    }
    
    if (majorPixels < 40) {
        majorOpacity = Math.max(0.15, majorPixels / 133); 
    } else if (majorPixels > 120) {
        majorOpacity = Math.min(0.5, 0.3 + (majorPixels - 120) / 300); 
    }
    
    const subX0 = Math.floor(startX / subStep) * subStep;
    const subY0 = Math.floor(startY / subStep) * subStep;
    const subX1 = Math.ceil(endX / subStep) * subStep;
    const subY1 = Math.ceil(endY / subStep) * subStep;
    
    const baseX0 = Math.floor(startX / baseStep) * baseStep;
    const baseY0 = Math.floor(startY / baseStep) * baseStep;
    const baseX1 = Math.ceil(endX / baseStep) * baseStep;
    const baseY1 = Math.ceil(endY / baseStep) * baseStep;
    
    const majorX0 = Math.floor(startX / majorStep) * majorStep;
    const majorY0 = Math.floor(startY / majorStep) * majorStep;
    const majorX1 = Math.ceil(endX / majorStep) * majorStep;
    const majorY1 = Math.ceil(endY / majorStep) * majorStep;
    
    if (subStep > 0) {
        ctx.globalAlpha = subOpacity;
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 0.5 / zoom;
        
        ctx.beginPath();
        
        for (let x = subX0; x <= subX1; x += subStep) {
            if (Math.abs(x % baseStep) < 0.001 || Math.abs(x % majorStep) < 0.001) continue;
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        
        for (let y = subY0; y <= subY1; y += subStep) {
            if (Math.abs(y % baseStep) < 0.001 || Math.abs(y % majorStep) < 0.001) continue;
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        
        ctx.stroke();
    }
    
    ctx.globalAlpha = baseOpacity;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1 / zoom;
    
    ctx.beginPath();
    
    for (let x = baseX0; x <= baseX1; x += baseStep) {
        if (Math.abs(x % majorStep) < 0.001) continue;
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    
    for (let y = baseY0; y <= baseY1; y += baseStep) {
        if (Math.abs(y % majorStep) < 0.001) continue;
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    
    ctx.stroke();
    ctx.globalAlpha = majorOpacity;
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath();
    
    for (let x = majorX0; x <= majorX1; x += majorStep) {
        if (Math.abs(x) < 0.001) continue; 
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    
    for (let y = majorY0; y <= majorY1; y += majorStep) {
        if (Math.abs(y) < 0.001) continue; 
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2 / zoom;
    
    if (startY <= 0 && endY >= 0) {
        ctx.strokeStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(endX, 0);
        ctx.stroke();
    }
    
    if (startX <= 0 && endX >= 0) {
        ctx.strokeStyle = '#4444ff';
        ctx.beginPath();
        ctx.moveTo(0, startY);
        ctx.lineTo(0, endY);
        ctx.stroke();
    }
    ctx.restore();
}

// redraw is now defined in /rendering/renderer.js

// ============================================================================
// EXPLODE OPERATIONS - Convert complex shapes to lines
// ============================================================================

/**
 * Inherit properties from source shape to new shape
 */
function inheritProperties(newShape, source) {
    if (typeof currentLayer !== 'undefined') {
        newShape.layer = source.layer || currentLayer;
    }
    if (typeof currentColor !== 'undefined') {
        newShape.color = source.color || currentColor;
    }
    if (typeof currentLineWeight !== 'undefined') {
        newShape.lineWeight = source.lineWeight || source.lineweight || currentLineWeight;
    }
    if (typeof currentLinetype !== 'undefined') {
        newShape.linetype = source.linetype || currentLinetype;
    }
    return newShape;
}

/**
 * Explode a shape into simpler primitives (usually lines)
 * @param {Object} shape - Shape to explode
 * @returns {Array} Array of simpler shapes (lines)
 */
function explodeShape(shape) {
    const parts = [];
    
    switch (shape.type) {
        case 'line':
        case 'point':
        case 'text':
            return parts;
            
        case 'polyline': {
            const pts = shape.points || [];
            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i], p2 = pts[i + 1];
                if (p1 && p2 && (p1.x !== p2.x || p1.y !== p2.y)) {
                    parts.push({ type: 'line', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
                }
            }
            break;
        }
        
        case 'circle': {
            const cx = shape.cx, cy = shape.cy, r = Math.max(0, shape.radius || shape.r || 0);
            const segs = typeof EXPLODE_SEGMENTS !== 'undefined' ? Math.max(8, EXPLODE_SEGMENTS) : 64;
            for (let i = 0; i < segs; i++) {
                const a0 = (i / segs) * 2 * Math.PI;
                const a1 = ((i + 1) / segs) * 2 * Math.PI;
                const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0);
                const x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1);
                parts.push({ type: 'line', x1, y1, x2, y2 });
            }
            break;
        }
        
        case 'ellipse': {
            const cx = shape.cx, cy = shape.cy, rx = Math.max(0, shape.rx || 0), ry = Math.max(0, shape.ry || 0);
            const rot = shape.rotation || 0;
            const cosR = Math.cos(rot), sinR = Math.sin(rot);
            const segs = typeof EXPLODE_SEGMENTS !== 'undefined' ? Math.max(8, EXPLODE_SEGMENTS) : 64;
            const pts = [];
            for (let i = 0; i <= segs; i++) {
                const t = (i / segs) * 2 * Math.PI;
                const lx = rx * Math.cos(t);
                const ly = ry * Math.sin(t);
                const x = cx + lx * cosR - ly * sinR;
                const y = cy + lx * sinR + ly * cosR;
                pts.push({ x, y });
            }
            for (let i = 0; i < pts.length - 1; i++) {
                parts.push({ type: 'line', x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y });
            }
            break;
        }
        
        case 'arc': {
            const cx = shape.cx, cy = shape.cy, r = Math.max(0, shape.radius || 0);
            let a0 = shape.startAngle || 0;
            let a1 = shape.endAngle || 0;
            let sweep = a1 - a0;
            const full = 2 * Math.PI;
            if (sweep === 0) return parts;
            
            const explodeSegs = typeof EXPLODE_SEGMENTS !== 'undefined' ? EXPLODE_SEGMENTS : 64;
            const segs = Math.max(4, Math.round(explodeSegs * Math.abs(sweep) / full));
            const step = sweep / segs;
            let prevX = cx + r * Math.cos(a0), prevY = cy + r * Math.sin(a0);
            
            for (let i = 1; i <= segs; i++) {
                const ang = a0 + step * i;
                const x = cx + r * Math.cos(ang);
                const y = cy + r * Math.sin(ang);
                parts.push({ type: 'line', x1: prevX, y1: prevY, x2: x, y2: y });
                prevX = x; prevY = y;
            }
            break;
        }
        
        case 'hatch': {
            const pts = shape.points || [];
            for (let i = 0; i + 1 < pts.length; i += 2) {
                const p1 = pts[i], p2 = pts[i + 1];
                parts.push({ type: 'line', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
            }
            break;
        }
        
        case 'spline': {
            const pts = shape.points || [];
            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i], p2 = pts[i + 1];
                parts.push({ type: 'line', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
            }
            break;
        }
        
        default:
            return parts;
    }
    
    return parts.map(p => inheritProperties(p, shape));
}

window.inheritProperties = inheritProperties;
window.explodeShape = explodeShape;

/*
 * Hatch Command Module - Web1CAD System
 * Version 251207 (December 7, 2025)
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 */

// === HATCH COMMAND ===
function handleHatchMode(x, y, e) {
    // Get hatch settings from panel
    const angleInput = document.getElementById('hatchAngle');
    const spacingInput = document.getElementById('hatchSpacing');
    const patternSelect = document.getElementById('hatchPattern');
    const angle = angleInput ? parseFloat(angleInput.value) : 45;
    const spacing = spacingInput ? parseFloat(spacingInput.value) : 10;
    const pattern = patternSelect ? patternSelect.value : 'lines';
    
    // Find closed shape at click location
    for (let i = shapes.length - 1; i >= 0; i--) {
        const shape = shapes[i];
        
        // Skip non-closed shapes
        if (shape.type === 'hatch' || shape.type === 'text' || shape.type === 'point' || shape.type === 'line') {
            continue;
        }
        
        // Check if click is inside shape
        if (isClickInsideShape(x, y, shape)) {
            // Check for SOLID pattern - fill the shape
            if (pattern === 'solid') {
                const filledShape = createShapeWithProperties({
                    type: shape.type,
                    ...shape,
                    filled: true
                });
                addShape(filledShape);
                addToHistory(`Solid fill applied to ${shape.type}`);
                redraw();
                setMode('select');
                return;
            }
            
            // Generate hatch pattern
            const hatchLines = generateHatchPattern(shape, angle, spacing, pattern);
            if (hatchLines && hatchLines.length > 0) {
                addShape(createShapeWithProperties({
                    type: 'hatch',
                    points: hatchLines,
                    pattern: pattern
                }));
                addToHistory(`Hatch created with ${Math.floor(hatchLines.length / 2)} lines (${pattern})`);
                redraw();
                setMode('select');
                return;
            }
        }
    }
    
    addToHistory('No closed shape found at click location', 'error');
}

// Check if click is inside a shape
function isClickInsideShape(x, y, shape) {
    if (shape.type === 'circle') {
        const dist = Math.sqrt(Math.pow(x - shape.cx, 2) + Math.pow(y - shape.cy, 2));
        return dist <= shape.radius;
    } else if (shape.type === 'rectangle') {
        if (shape.width && shape.height) {
            return x >= shape.x && x <= shape.x + shape.width && 
                   y >= shape.y && y <= shape.y + shape.height;
        }
    } else if (shape.type === 'polygon' && shape.points) {
        return isPointInPolygon(x, y, shape.points);
    } else if (shape.type === 'polyline' && shape.points && shape.points.length >= 3) {
        // Check if polyline is closed
        const first = shape.points[0];
        const last = shape.points[shape.points.length - 1];
        const closeDist = Math.sqrt(Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2));
        if (closeDist < 1) {
            return isPointInPolygon(x, y, shape.points);
        }
    }
    return false;
}

// Point in polygon test (ray casting algorithm)
function isPointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

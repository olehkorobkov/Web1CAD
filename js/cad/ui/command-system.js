const commandHistory = [];
let isHistoryVisible = false;
let historyIndex = -1;
let tempCommand = '';

// Функція для показу повідомлення про відключені функції
function showDisabledMessage(functionName) {
    addToHistory(`${functionName} function is currently disabled`, 'error');
    updateHelpBar(`${functionName} function is disabled - Use other editing tools`);
}

// Helper function to get bounds of selected shapes
function getSelectionBounds(selection) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    selection.forEach(index => {
        const shape = shapes[index];
        
        // OPTIMIZED with Unified Shape Handler
        if (window.shapeHandler) {
            const bounds = window.shapeHandler.execute('getBounds', shape.type, shape);
            if (bounds !== null) {
                minX = Math.min(minX, bounds.minX);
                minY = Math.min(minY, bounds.minY);
                maxX = Math.max(maxX, bounds.maxX);
                maxY = Math.max(maxY, bounds.maxY);
                return; // Skip fallback implementation
            }
        }
        
        // Fallback to original implementation for compatibility
        switch(shape.type) {
            case 'line':
                minX = Math.min(minX, shape.x1, shape.x2);
                maxX = Math.max(maxX, shape.x1, shape.x2);
                minY = Math.min(minY, shape.y1, shape.y2);
                maxY = Math.max(maxY, shape.y1, shape.y2);
                break;
            case 'circle':
                minX = Math.min(minX, shape.cx - shape.radius);
                maxX = Math.max(maxX, shape.cx + shape.radius);
                minY = Math.min(minY, shape.cy - shape.radius);
                maxY = Math.max(maxY, shape.cy + shape.radius);
                break;
            case 'rectangle':
                minX = Math.min(minX, shape.x);
                maxX = Math.max(maxX, shape.x + shape.width);
                minY = Math.min(minY, shape.y);
                maxY = Math.max(maxY, shape.y + shape.height);
                break;
            // Add more shape types as needed
        }
    });
    
    return { minX, minY, maxX, maxY };
}

/**
 * Converts white color to black for better visibility on white background
 * (CAD-style logic)
 */
function convertWhiteToBlackForPreview(color) {
    if (!color) return '#000000'; // Default to black
    
    const normalizedColor = color.toLowerCase();
    
    // Convert white color to black
    if (normalizedColor === '#ffffff' || normalizedColor === '#fff' || 
        normalizedColor === 'white' || normalizedColor === 'rgb(255,255,255)') {
        return '#000000';
    }
    
    return color; // Keep all other colors as they are
}

// Make function globally available
window.convertWhiteToBlackForPreview = convertWhiteToBlackForPreview;

function drawCopyPreview(ctx, shape, dx, dy, zoom) {
    ctx.save();
    
    // Create a temporary copied shape for preview using safe method
    const previewShape = safeDeepCopy(shape, {}, 'copy preview shape');
    if (!previewShape || typeof previewShape !== 'object') {
        console.error('Failed to create preview shape');
        ctx.restore();
        return;
    }
    
    moveShape(previewShape, dx, dy);
    
    // Professional CAD logic: convert white color to black for better visibility
    if (previewShape.color) {
        previewShape.color = convertWhiteToBlackForPreview(previewShape.color);
    }
    
    // Set preview styling - more transparent and visible
    ctx.globalAlpha = 0.5; // 50% transparency for floating effect
    
    // Use enhanced rendering system if available
    if (typeof drawShape === 'function') {
        drawShape(ctx, previewShape, zoom, false);
        ctx.restore();
        return;
    }
    
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('draw', previewShape.type, ctx, previewShape, zoom);
        if (result !== null) {
            ctx.restore();
            return; // Successfully rendered with optimized handler
        }
    }
    
    // Fallback to original implementation for compatibility
    // Draw based on shape type with original styling but transparent
    switch(previewShape.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(previewShape.x1, previewShape.y1);
            ctx.lineTo(previewShape.x2, previewShape.y2);
            ctx.stroke();
            break;
        case 'polyline':
            if (previewShape.points.length < 2) break;
            ctx.beginPath();
            ctx.moveTo(previewShape.points[0].x, previewShape.points[0].y);
            for (let i = 1; i < previewShape.points.length; i++) {
                ctx.lineTo(previewShape.points[i].x, previewShape.points[i].y);
            }
            ctx.stroke();
            break;
        case 'circle':
            ctx.beginPath();
            ctx.arc(previewShape.cx, previewShape.cy, previewShape.radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
        case 'arc':
            ctx.beginPath();
            ctx.arc(previewShape.cx, previewShape.cy, previewShape.radius, previewShape.startAngle, previewShape.endAngle);
            ctx.stroke();
            break;
        case 'polygon':
            if (previewShape.points && previewShape.points.length > 2) {
                ctx.beginPath();
                ctx.moveTo(previewShape.points[0].x, previewShape.points[0].y);
                for (let i = 1; i < previewShape.points.length; i++) {
                    ctx.lineTo(previewShape.points[i].x, previewShape.points[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }
            break;
        default:
            console.warn('Unknown shape type for copy preview:', previewShape.type);
    }
    
    ctx.restore();
}

function drawRotatePreview(ctx, shape, centerX, centerY, angle, zoom) {
    ctx.save();
    
    // Create a temporary rotated shape for preview using safe method
    const previewShape = safeDeepCopy(shape, {}, 'rotate preview shape');
    if (!previewShape || typeof previewShape !== 'object') {
        console.error('Failed to create rotate preview shape');
        ctx.restore();
        return;
    }
    
    // Apply rotation to the copy
    rotateShape(previewShape, centerX, centerY, angle);
    
    // Professional CAD logic: convert white color to black for better visibility
    if (previewShape.color) {
        previewShape.color = convertWhiteToBlackForPreview(previewShape.color);
    }
    
    // Set preview styling - more transparent and visible
    ctx.globalAlpha = 0.5; // 50% transparency for floating effect
    
    // Use enhanced rendering system if available
    if (typeof drawShape === 'function') {
        drawShape(ctx, previewShape, zoom, false);
        ctx.restore();
        return;
    }
    
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('draw', previewShape.type, ctx, previewShape, zoom);
        if (result !== null) {
            ctx.restore();
            return; // Successfully rendered with optimized handler
        }
    }
    
    // Fallback to original implementation for compatibility
    // Draw based on shape type with original styling but transparent
    switch(previewShape.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(previewShape.x1, previewShape.y1);
            ctx.lineTo(previewShape.x2, previewShape.y2);
            ctx.stroke();
            break;
        case 'polyline':
            if (previewShape.points.length < 2) break;
            ctx.beginPath();
            ctx.moveTo(previewShape.points[0].x, previewShape.points[0].y);
            for (let i = 1; i < previewShape.points.length; i++) {
                ctx.lineTo(previewShape.points[i].x, previewShape.points[i].y);
            }
            ctx.stroke();
            break;
        case 'circle':
            ctx.beginPath();
            ctx.arc(previewShape.cx, previewShape.cy, previewShape.radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
        case 'arc':
            ctx.beginPath();
            ctx.arc(previewShape.cx, previewShape.cy, previewShape.radius, previewShape.startAngle, previewShape.endAngle);
            ctx.stroke();
            break;
        case 'polygon':
            if (previewShape.points && previewShape.points.length > 2) {
                ctx.beginPath();
                ctx.moveTo(previewShape.points[0].x, previewShape.points[0].y);
                for (let i = 1; i < previewShape.points.length; i++) {
                    ctx.lineTo(previewShape.points[i].x, previewShape.points[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }
            break;
        case 'spline':
            if (previewShape.points.length > 1) {
                drawSmoothSpline(ctx, previewShape.points);
            }
            break;
        case 'point':
            ctx.beginPath();
            ctx.arc(previewShape.x, previewShape.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            break;
        case 'text':
            // FIXED: text as geometric shape for copy preview + Professional CAD color logic
            if (previewShape.content) {
                const worldSize = previewShape.size || 12; // World units
                ctx.font = `${worldSize}px Arial`; // Use world size directly
                
                // Apply converted color (white → black)
                if (previewShape.color) {
                    ctx.fillStyle = previewShape.color;
                }
                
                ctx.fillText(previewShape.content, previewShape.x, previewShape.y);
            }
            break;
        case 'hatch':
            if (previewShape.points && previewShape.points.length > 1) {
                ctx.beginPath();
                for (let i = 0; i < previewShape.points.length; i += 2) {
                    if (i + 1 < previewShape.points.length) {
                        ctx.moveTo(previewShape.points[i].x, previewShape.points[i].y);
                        ctx.lineTo(previewShape.points[i+1].x, previewShape.points[i+1].y);
                    }
                }
                ctx.stroke();
            }
            break;
        default:
            console.warn('Unknown shape type for copy preview:', previewShape.type);
    }
    
    ctx.restore();
}

function drawRotatePreview(ctx, shape, centerX, centerY, angle, zoom) {
    ctx.save();
    
    // Create a temporary rotated shape for preview using safe method
    const previewShape = safeDeepCopy(shape, {}, 'rotate preview shape');
    if (!previewShape || typeof previewShape !== 'object') {
        console.error('Failed to create rotate preview shape');
        ctx.restore();
        return;
    }
    
    rotateShape(previewShape, centerX, centerY, angle);
    
    // Professional CAD logic: convert white color to black for better visibility
    if (previewShape.color) {
        previewShape.color = convertWhiteToBlackForPreview(previewShape.color);
    }
    
    // Set preview styling - more transparent and visible
    ctx.globalAlpha = 0.5; // 50% transparency for floating effect
    
    // Use enhanced rendering system if available
    if (typeof drawShape === 'function') {
        drawShape(ctx, previewShape, zoom, false);
        ctx.restore();
        return;
    }
    
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('draw', previewShape.type, ctx, previewShape, zoom);
        if (result !== null) {
            ctx.restore();
            return; // Successfully rendered with optimized handler
        }
    }
    
    // Fallback to original implementation for compatibility
    // Draw based on shape type with original styling but transparent
    switch(previewShape.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(previewShape.x1, previewShape.y1);
            ctx.lineTo(previewShape.x2, previewShape.y2);
            ctx.stroke();
            break;
        case 'polyline':
            if (previewShape.points && previewShape.points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(previewShape.points[0].x, previewShape.points[0].y);
                for (let j = 1; j < previewShape.points.length; j++) {
                    ctx.lineTo(previewShape.points[j].x, previewShape.points[j].y);
                }
                ctx.stroke();
            }
            break;
        case 'circle':
            ctx.beginPath();
            ctx.arc(previewShape.cx, previewShape.cy, previewShape.radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
        case 'rectangle':
            ctx.strokeRect(previewShape.x, previewShape.y, previewShape.width, previewShape.height);
            break;
        case 'point':
            ctx.fillRect(previewShape.x - 1, previewShape.y - 1, 2, 2);
            break;
        case 'text':
            ctx.fillText(previewShape.content || 'Text', previewShape.x, previewShape.y);
            break;
        default:
            console.warn('Unknown shape type for rotate preview:', previewShape.type);
    }
    
    ctx.restore();
}

function drawScalePreview(ctx, shape, centerX, centerY, factor, zoom) {
    ctx.save();
    
    // Create a temporary scaled shape for preview using safe method
    const previewShape = safeDeepCopy(shape, {}, 'scale preview shape');
    if (!previewShape || typeof previewShape !== 'object') {
        console.error('Failed to create scale preview shape');
        ctx.restore();
        return;
    }
    
    // Apply scaling to the copy
    scaleShape(previewShape, centerX, centerY, factor);
    
    // Make scale preview more visible with distinct color
    if (previewShape.color) {
        // Use blue color for scale preview to distinguish from original
        previewShape.color = '#0066FF';
    }
    
    // Set preview styling - semi-transparent but clearly visible over original
    ctx.globalAlpha = 0.7; // 70% transparency for good visibility while still showing it's a preview
    
    // Use enhanced rendering system if available
    if (typeof drawShape === 'function') {
        drawShape(ctx, previewShape, zoom, false);
        ctx.restore();
        return;
    }
    
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('draw', previewShape.type, ctx, previewShape, zoom);
        if (result !== null) {
            ctx.restore();
            return; // Successfully rendered with optimized handler
        }
    }
    
    // Fallback to original implementation for compatibility
    // Draw based on shape type with original styling but transparent
    switch(previewShape.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(previewShape.x1, previewShape.y1);
            ctx.lineTo(previewShape.x2, previewShape.y2);
            ctx.stroke();
            break;
        case 'polyline':
            if (previewShape.points.length < 2) break;
            ctx.beginPath();
            ctx.moveTo(previewShape.points[0].x, previewShape.points[0].y);
            for (let i = 1; i < previewShape.points.length; i++) {
                ctx.lineTo(previewShape.points[i].x, previewShape.points[i].y);
            }
            ctx.stroke();
            break;
        case 'circle':
            ctx.beginPath();
            ctx.arc(previewShape.cx, previewShape.cy, previewShape.radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
        case 'arc':
            ctx.beginPath();
            ctx.arc(previewShape.cx, previewShape.cy, previewShape.radius, previewShape.startAngle, previewShape.endAngle);
            ctx.stroke();
            break;
        case 'polygon':
            if (previewShape.points && previewShape.points.length > 2) {
                ctx.beginPath();
                ctx.moveTo(previewShape.points[0].x, previewShape.points[0].y);
                for (let i = 1; i < previewShape.points.length; i++) {
                    ctx.lineTo(previewShape.points[i].x, previewShape.points[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }
            break;
        case 'spline':
            if (previewShape.points.length > 1) {
                drawSmoothSpline(ctx, previewShape.points);
            }
            break;
        case 'point':
            ctx.beginPath();
            ctx.arc(previewShape.x, previewShape.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            break;
        case 'text':
            if (previewShape.content) {
                const worldSize = previewShape.size || 12;
                ctx.font = `${worldSize}px Arial`;
                if (previewShape.color) {
                    ctx.fillStyle = previewShape.color;
                }
                ctx.fillText(previewShape.content, previewShape.x, previewShape.y);
            }
            break;
        case 'hatch':
            if (previewShape.points && previewShape.points.length > 1) {
                ctx.beginPath();
                for (let i = 0; i < previewShape.points.length; i += 2) {
                    if (i + 1 < previewShape.points.length) {
                        ctx.moveTo(previewShape.points[i].x, previewShape.points[i].y);
                        ctx.lineTo(previewShape.points[i+1].x, previewShape.points[i+1].y);
                    }
                }
                ctx.stroke();
            }
            break;
        default:
            console.warn('Unknown shape type for scale preview:', previewShape.type);
    }
    
    ctx.restore();
}

function drawMovePreview(ctx, shape, dx, dy, zoom) {
    ctx.save();
    
    // Create a temporary moved shape for preview using safe method
    const previewShape = safeDeepCopy(shape, {}, 'move preview shape');
    if (!previewShape || typeof previewShape !== 'object') {
        console.error('Failed to create move preview shape');
        ctx.restore();
        return;
    }
    
    moveShape(previewShape, dx, dy);
    
    // Professional CAD logic: convert white color to black for better visibility
    if (previewShape.color) {
        previewShape.color = convertWhiteToBlackForPreview(previewShape.color);
    }
    
    // Set preview styling - more transparent and visible
    ctx.globalAlpha = 0.5; // 50% transparency for floating effect
    
    // Use enhanced rendering system if available
    if (typeof drawShape === 'function') {
        drawShape(ctx, previewShape, zoom, false);
        ctx.restore();
        return;
    }
    
    // Use optimized unified handler if available
    if (window.shapeHandler) {
        const result = window.shapeHandler.execute('draw', previewShape.type, ctx, previewShape, zoom);
        if (result !== null) {
            ctx.restore();
            return; // Successfully rendered with optimized handler
        }
    }
    
    // Fallback to original implementation for compatibility
    // Draw based on shape type with original styling but transparent
    switch(previewShape.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(previewShape.x1, previewShape.y1);
            ctx.lineTo(previewShape.x2, previewShape.y2);
            ctx.stroke();
            break;
        case 'polyline':
            if (previewShape.points.length < 2) break;
            ctx.beginPath();
            ctx.moveTo(previewShape.points[0].x, previewShape.points[0].y);
            for (let i = 1; i < previewShape.points.length; i++) {
                ctx.lineTo(previewShape.points[i].x, previewShape.points[i].y);
            }
            ctx.stroke();
            break;
        case 'circle':
            ctx.beginPath();
            ctx.arc(previewShape.cx, previewShape.cy, previewShape.radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
        case 'arc':
            ctx.beginPath();
            ctx.arc(previewShape.cx, previewShape.cy, previewShape.radius, previewShape.startAngle, previewShape.endAngle);
            ctx.stroke();
            break;
        case 'polygon':
            if (previewShape.points && previewShape.points.length > 2) {
                ctx.beginPath();
                ctx.moveTo(previewShape.points[0].x, previewShape.points[0].y);
                for (let i = 1; i < previewShape.points.length; i++) {
                    ctx.lineTo(previewShape.points[i].x, previewShape.points[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }
            break;
        case 'spline':
            if (previewShape.points.length > 1) {
                drawSmoothSpline(ctx, previewShape.points);
            }
            break;
        case 'point':
            ctx.beginPath();
            ctx.arc(previewShape.x, previewShape.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            break;
        case 'text':
            // FIXED: text as geometric shape for move preview + Professional CAD color logic
            if (previewShape.content) {
                const worldSize = previewShape.size || 12; // World units
                ctx.font = `${worldSize}px Arial`; // Use world size directly
                
                // Apply converted color (white → black)
                if (previewShape.color) {
                    ctx.fillStyle = previewShape.color;
                }
                
                ctx.fillText(previewShape.content, previewShape.x, previewShape.y);
            }
            break;
        case 'hatch':
            if (previewShape.points && previewShape.points.length > 1) {
                ctx.beginPath();
                for (let i = 0; i < previewShape.points.length; i += 2) {
                    if (i + 1 < previewShape.points.length) {
                        ctx.moveTo(previewShape.points[i].x, previewShape.points[i].y);
                        ctx.lineTo(previewShape.points[i+1].x, previewShape.points[i+1].y);
                    }
                }
                ctx.stroke();
            }
            break;
    }
    
    ctx.restore();
}

// Clear all selections
function clearSelection() {
    const wasSelected = selectedShapes.size > 0;
    selectedShapes.clear();
    if (wasSelected) {
        setStatusMessage('Selection cleared');
    }
    redraw();
    
    // Update properties panel if it's open
    const propertiesPanel = document.getElementById('propertiesPanel');
    if (propertiesPanel && propertiesPanel.style.display !== 'none') {
        updatePropertiesPanel();
    }
}


// Select all shapes
function selectAll() {
    selectedShapes = new Set(shapes.map((_, i) => i));
    setStatusMessage(`Selected all ${selectedShapes.size} objects`);
    addToHistory(`Selected ${selectedShapes.size} objects`);
    redraw();
}

// === ESSENTIAL EDITING FUNCTIONS ===

function deleteSelected() {
    if (selectedShapes.size === 0) {
        addToHistory('No objects selected to delete', 'error');
        return;
    }
    
    // Save state for undo
    saveState(`Delete ${selectedShapes.size} object(s)`);
    
    // Sort indices in descending order to avoid index shifting
    const sortedIndices = Array.from(selectedShapes).sort((a, b) => b - a);
    
    // Remove shapes from back to front
    sortedIndices.forEach(index => {
        shapes.splice(index, 1);
    });
    
    // Invalidate viewport cache since shapes array changed
    invalidateViewportCache();
    
    addToHistory(`Deleted ${selectedShapes.size} object(s)`);
    selectedShapes.clear();
    redraw();
}

function copySelected() {
    if (selectedShapes.size === 0) {
        addToHistory('No objects selected to copy', 'error');
        return;
    }
    
    // Store copied shapes using safe method
    copiedShapes = [];
    selectedShapes.forEach(index => {
        const copiedShape = safeDeepCopy(shapes[index], {}, 'copied to clipboard');
        if (copiedShape && typeof copiedShape === 'object') {
            copiedShapes.push(copiedShape);
        } else {
            console.error('Failed to copy shape at index:', index);
            addToHistory('Warning: Failed to copy one or more shapes', 'warning');
        }
    });
    
    addToHistory(`Copied ${selectedShapes.size} object(s). Click to paste.`);
    setMode('paste');
}

function pasteShapes(x, y) {
    if (!copiedShapes || copiedShapes.length === 0) {
        addToHistory('Nothing to paste', 'error');
        return;
    }
    
    // Calculate the center of copied shapes
    let centerX = 0, centerY = 0, count = 0;
    
    copiedShapes.forEach(shape => {
        if (shape.type === 'line') {
            centerX += (shape.x1 + shape.x2) / 2;
            centerY += (shape.y1 + shape.y2) / 2;
            count++;
        } else if (shape.type === 'circle' || shape.type === 'arc') {
            centerX += shape.cx;
            centerY += shape.cy;
            count++;
        } else if (shape.type === 'point' || shape.type === 'text') {
            centerX += shape.x;
            centerY += shape.y;
            count++;
        } else if (shape.points && shape.points.length > 0) {
            shape.points.forEach(point => {
                centerX += point.x;
                centerY += point.y;
                count++;
            });
        }
    });
    
    if (count > 0) {
        centerX /= count;
        centerY /= count;
    }
    
    const offsetX = x - centerX;
    const offsetY = y - centerY;
    
    // Clear selection
    selectedShapes.clear();
    
    // Paste and select the new shapes
    copiedShapes.forEach(shape => {
        const newShape = safeDeepCopy(shape, {}, 'pasted shape'); // Safe deep copy
        
        if (!newShape || typeof newShape !== 'object') {
            console.error('Failed to paste shape:', shape);
            addToHistory('Warning: Failed to paste one or more shapes', 'warning');
            return;
        }
        
        // Apply offset to position the copied shape at cursor
        if (newShape.type === 'line') {
            newShape.x1 += offsetX;
            newShape.y1 += offsetY;
            newShape.x2 += offsetX;
            newShape.y2 += offsetY;
        } else if (newShape.type === 'circle' || newShape.type === 'arc' || newShape.type === 'ellipse') {
            newShape.cx += offsetX;
            newShape.cy += offsetY;
        } else if (newShape.type === 'point' || newShape.type === 'text') {
            newShape.x += offsetX;
            newShape.y += offsetY;
        } else if (newShape.points && newShape.points.length > 0) {
            newShape.points.forEach(point => {
                point.x += offsetX;
                point.y += offsetY;
            });
        }
        
        // Assign current layer properties to pasted shape
        newShape.layer = currentLayer;
        newShape.color = currentColor;
        newShape.lineWeight = currentLineWeight;
        
        shapes.push(newShape);
        selectedShapes.add(shapes.length - 1);
    });
    
    addToHistory(`Pasted ${copiedShapes.length} object(s)`);
    redraw();
    setMode('select');
}

// === FILE OPERATIONS ===

// === FILE OPERATIONS ===

// === ADVANCED EDITING MODE HANDLERS ===
// [ФУНКЦІЇ ROTATE ТА SCALE ВИМКНЕНО]

function handleMirrorMode(x, y, e) {
    if (selectedShapes.size === 0) {
        addToHistory('No objects selected to mirror', 'error');
        setMode('select');
        return;
    }
    
    if (!mirrorLine) {
        // First click - start mirror line
        mirrorLine = { x1: x, y1: y, x2: null, y2: null };
        addToHistory('Mirror line start set. Click to set end point.');
    } else if (!mirrorLine.x2) {
        // Second click - complete mirror line and perform mirroring
        mirrorLine.x2 = x;
        mirrorLine.y2 = y;
        
        selectedShapes.forEach(index => {
            mirrorShape(shapes[index], mirrorLine.x1, mirrorLine.y1, mirrorLine.x2, mirrorLine.y2);
        });
        
        addToHistory(`Mirrored ${selectedShapes.size} object(s)`);
        mirrorLine = null;
        setMode('select');
        redraw();
    }
}


// === Mode-specific mouse handlers ===
function handleSelectMode(x, y, e) {
    // Check if we're clicking on an object first (before clearing selection)
    let clickedShape = null;
    let clickedIndex = -1;
    
    // Find object under cursor (search from top to bottom)
    for (let i = shapes.length - 1; i >= 0; i--) {
        if (isPointInShape(shapes[i], x, y)) {
            clickedShape = shapes[i];
            clickedIndex = i;
            break;
        }
    }
    
    if (clickedShape) {
        // Clicked on an object
        if (e.shiftKey) {
            // Multi-select mode - toggle selection of clicked object
            if (selectedShapes.has(clickedIndex)) {
                selectedShapes.delete(clickedIndex);
                addToHistory(`Object deselected`);
            } else {
                selectedShapes.add(clickedIndex);
                addToHistory(`Object added to selection`);
            }
        } else {
            // Single-select mode
            if (selectedShapes.has(clickedIndex) && selectedShapes.size === 1) {
                // Already selected single object - start moving
                isMoving = true;
                moveStartX = x;
                moveStartY = y;
                return;
            } else {
                // Select new object (clear other selections)
                clearSelection();
                selectedShapes.add(clickedIndex);
                addToHistory(`Object selected: ${clickedShape.type}`);
            }
        }
        redraw();
        
        // Update properties panel if open
        const propertiesPanel = document.getElementById('propertiesPanel');
        if (propertiesPanel && propertiesPanel.style.display !== 'none') {
            updatePropertiesPanel();
        }
        return;
    }
    
    // No object clicked - start selection window
    if (!e.shiftKey) {
        clearSelection();
    }

    startX = x;
    startY = y;
    isDrawing = true;

    // Show selection window
    const [sx, sy] = worldToScreen(x, y);
    selectionWindow.style.left = `${sx}px`;
    selectionWindow.style.top = `${sy}px`;
    selectionWindow.style.width = '0px';
    selectionWindow.style.height = '0px';
    selectionWindow.style.display = 'block';

    // Store initial screen X/Y for window direction
    selectionWindowStartX = e.offsetX;
    selectionWindowStartY = e.offsetY;
    
    setStatusMessage('Selecting objects...');
}

function handleLineMode(x, y, e) {
    // NEW IMPROVED LINE MODE - Based on polyline logic
    if (!isDrawing) {
        // First click - set start point
        [startX, startY] = [x, y];
        isDrawing = true;
        
        // Set default direction for length input (horizontal)
        lineDirection = { x: 1, y: 0 };
        
        // Show length input immediately like in polyline mode
        showLengthInput(e.offsetX, e.offsetY);
        
        updateHelpBar('Step 2/2: Click end point, type length + Enter, or use Escape to cancel');
        addToHistory(`Line started at (${x.toFixed(2)}, ${y.toFixed(2)}) - Enter length or click end point`);
    } else {
        // Second click - create line
        // Always hide length input when adding point via click
        if (isLengthInputActive) {
            hideLengthInput();
        }
        
        [x, y] = applyOrtho(x, y, startX, startY);
        
        // NEW LINE CREATION - Based on polyline logic
        addShape(createShapeWithProperties({ type: 'line', x1: startX, y1: startY, x2: x, y2: y }));
        isDrawing = false;
        
        // Show success message and return to select mode
        addToHistory(`Line created from (${startX.toFixed(2)}, ${startY.toFixed(2)}) to (${x.toFixed(2)}, ${y.toFixed(2)})`);
        updateHelpBar('Line completed! Select another tool or object.');
        setMode('select');
        
        // Reset help bar to default after 3 seconds (like polyline)
        setTimeout(() => {
            if (mode === 'select') {
                updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
            }
        }, 3000);
        
        redraw();
    }
}

function handlePolylineMode(x, y, e) {
    // Polyline mode handling
    
    // Track double click for polyline completion
    const currentTime = Date.now();
    const clickDistance = polylinePoints.length > 0 ? 
        Math.sqrt(Math.pow(x - lastClickX, 2) + Math.pow(y - lastClickY, 2)) : 0;
    
    if (polylinePoints.length === 0) {
        // First point - just add it
        polylinePoints.push({ x, y });
        
        // Set default direction for length input (horizontal)
        polylineDirection = { x: 1, y: 0 };
        
        // Show length input immediately like in line mode
        showLengthInput(e.offsetX, e.offsetY);
        
        // Enable preview after a short delay to prevent immediate unwanted preview
        setTimeout(() => {
            polylinePreviewActive = true;
        }, 100);
        
        updateHelpBar('Step 2/?: Click next point, type length + Enter to continue, or Escape/double-click to finish');
        addToHistory(`Polyline started at (${x.toFixed(2)}, ${y.toFixed(2)}) - Enter length or click for next point`);
        // First polyline point added
    } else {
        // Check for double click to finish polyline (only if we have at least 2 points)
        if (currentTime - lastClickTime < 400 && clickDistance < 10 / zoom && polylinePoints.length > 1) {
            // Double click detected - finish polyline
            addShape(createShapeWithProperties({ type: 'polyline', points: [...polylinePoints] }));
            addToHistory(`Polyline completed with ${polylinePoints.length} points`);
            updateHelpBar('Polyline completed! Select another tool or object.');
            polylinePoints = [];
            polylinePreviewActive = false;
            hideLengthInput();
            setMode('select');
            redraw();
            lastClickTime = 0;
            
            // Reset help bar to default after 3 seconds
            setTimeout(() => {
                if (mode === 'select') {
                    updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
                }
            }, 3000);
            return;
        }
        
        // Always hide length input when adding point via click
        if (isLengthInputActive) {
            // Hiding length input before adding point
            hideLengthInput();
        }
        
        // Add new point
        const lastPoint = polylinePoints[polylinePoints.length - 1];
        [x, y] = applyOrtho(x, y, lastPoint.x, lastPoint.y);
        polylinePoints.push({ x, y });
        
        // Show length input for the next segment after a small delay
        setTimeout(() => {
            if (mode === 'polyline' && polylinePoints.length > 0) {
                showLengthInput(e.offsetX, e.offsetY);
            }
        }, 150);
        
        // Enable preview for next segment
        polylinePreviewActive = true;
        
        updateHelpBar(`Step ${polylinePoints.length + 1}/?: Click next point, type length + Enter to continue, or Escape/double-click to finish`);
        addToHistory(`Polyline point ${polylinePoints.length} added at (${x.toFixed(2)}, ${y.toFixed(2)}) - Enter length or click for next point`);
    }
    
    // Update click tracking
    lastClickTime = currentTime;
    lastClickX = x;
    lastClickY = y;
    
    redraw();
}

function handleCircleMode(x, y, e) {
    // Circle mode handling
    
    if (!isDrawing) {
        // First click - set center point
        [startX, startY] = [x, y];
        isDrawing = true;
        
        // Show length input for radius
        showLengthInput(e.offsetX, e.offsetY);
        
        updateHelpBar('Step 2/2: Click radius point, type radius + Enter, or use Escape to cancel');
        addToHistory(`Circle center at (${x.toFixed(2)}, ${y.toFixed(2)}) - Enter radius or click for radius point`);
        // Circle center set
    } else {
        // Second click - set radius and create circle
        if (isLengthInputActive) {
            // Hiding length input before creating circle
            hideLengthInput();
        }
        
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        addShape(createShapeWithProperties({ type: 'circle', cx: startX, cy: startY, radius }));
        isDrawing = false;
        addToHistory(`Circle created with radius ${radius.toFixed(2)}`);
        updateHelpBar('Circle completed! Select another tool or object.');
        setMode('select');
        redraw();
        
        // Reset help bar to default after 3 seconds
        setTimeout(() => {
            if (mode === 'select') {
                updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
            }
        }, 3000);
    }
}

function handleEllipseMode(x, y, e) {
    // Ellipse mode handling - circle-like: center → major radius → minor radius
    
    if (ellipseDrawingStep === 0) {
        // First click - set center point
        ellipseCenter.x = x;
        ellipseCenter.y = y;
        ellipseDrawingStep = 1;
        ellipsePreviewActive = true;
        
        // Show length input for major radius
        showLengthInput(e.offsetX, e.offsetY);
        
        updateHelpBar('Step 2/3: Click for major radius, type radius + Enter, or use Escape to cancel');
        addToHistory(`Ellipse center at (${x.toFixed(2)}, ${y.toFixed(2)}) - Enter major radius or click for radius point`);
    } else if (ellipseDrawingStep === 1) {
        // Second click - set major radius
        if (isLengthInputActive) {
            // Hiding length input before proceeding
            hideLengthInput();
        }
        
        const majorRadius = Math.sqrt(Math.pow(x - ellipseCenter.x, 2) + Math.pow(y - ellipseCenter.y, 2));
        
        // Ensure minimum radius to prevent degenerate ellipses
        if (majorRadius < 0.01) {
            addToHistory('Major radius too small, click further from center');
            return;
        }
        
        ellipseMajorRadius = majorRadius;
        ellipseDrawingStep = 2;
        
        // Show length input for minor radius
        showLengthInput(e.offsetX, e.offsetY);
        
        updateHelpBar('Step 3/3: Click for minor radius, type radius + Enter, or use Escape to go back');
        addToHistory(`Ellipse major radius set to ${majorRadius.toFixed(2)} - Enter minor radius or click for radius point`);
    } else if (ellipseDrawingStep === 2) {
        // Third click - set minor radius and create ellipse
        if (isLengthInputActive) {
            // Hiding length input before creating ellipse
            hideLengthInput();
        }
        
        const minorRadius = Math.sqrt(Math.pow(x - ellipseCenter.x, 2) + Math.pow(y - ellipseCenter.y, 2));
        
        // Ensure minimum radius to prevent degenerate ellipses
        if (minorRadius < 0.01) {
            addToHistory('Minor radius too small, ellipse creation cancelled');
            return;
        }
        
        // Create ellipse with circle-like properties (no rotation for simplicity)
        const ellipse = createShapeWithProperties({
            type: 'ellipse',
            cx: ellipseCenter.x,
            cy: ellipseCenter.y,
            rx: ellipseMajorRadius,  // major radius
            ry: minorRadius,         // minor radius
            rotation: 0              // no rotation in simple mode
        });
        
        addShape(ellipse);
        
        // Reset ellipse drawing state completely
        ellipseDrawingStep = 0;
        ellipsePreviewActive = false;
        ellipseCenter = { x: 0, y: 0 };
        ellipseMajorRadius = 0;
        
        // Force a redraw to clear any preview artifacts
        redraw();
        
        addToHistory(`Ellipse created with major radius ${ellipseMajorRadius.toFixed(2)}, minor radius ${minorRadius.toFixed(2)}`);
        updateHelpBar('Ellipse completed! Select another tool or object.');
        setMode('select');
        redraw();
        
        // Reset help bar to default after 3 seconds
        setTimeout(() => {
            if (mode === 'select') {
                updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
            }
        }, 3000);
    }
}

function handleArcMode(x, y, e) {
    // Arc mode handling
    
    if (arcDrawingStep === 0) {
        // First click - set start point
        arcPoints = [{ x, y }];
        arcDrawingStep = 1;
        arcPreviewActive = false;
        updateHelpBar('Step 2/3: Click end point for arc');
        addToHistory(`Arc start point at (${x.toFixed(2)}, ${y.toFixed(2)}) - Click end point`);
    } else if (arcDrawingStep === 1) {
        // Second click - set end point
        arcPoints.push({ x, y });
        arcDrawingStep = 2;
        arcPreviewActive = true; // Enable preview for arc angle
        updateHelpBar('Step 3/3: Move cursor and click to set arc curvature, or use Escape to go back');
        addToHistory(`Arc end point at (${x.toFixed(2)}, ${y.toFixed(2)}) - Move cursor and click to set arc angle`);
    } else if (arcDrawingStep === 2) {
        // Third click - finalize arc based on cursor position
        const startPoint = arcPoints[0];
        const endPoint = arcPoints[1];
        
        // Calculate the chord (straight line distance between start and end)
        const chordLength = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
        
        // Calculate the distance from cursor to the chord line
        const A = endPoint.y - startPoint.y;
        const B = startPoint.x - endPoint.x;
        const C = endPoint.x * startPoint.y - startPoint.x * endPoint.y;
        const distanceToChord = Math.abs(A * x + B * y + C) / Math.sqrt(A * A + B * B);
        
        // Calculate the sagitta (height of the arc) based on cursor distance
        const sagitta = distanceToChord;
        
        // Calculate radius from sagitta and chord length
        // Formula: radius = (sagitta^2 + (chord/2)^2) / (2 * sagitta)
        const radius = (sagitta * sagitta + (chordLength / 2) * (chordLength / 2)) / (2 * sagitta);
        
        // Calculate center point
        const midPointX = (startPoint.x + endPoint.x) / 2;
        const midPointY = (startPoint.y + endPoint.y) / 2;
        
        // Calculate perpendicular direction to the chord
        const chordDirX = endPoint.x - startPoint.x;
        const chordDirY = endPoint.y - startPoint.y;
        const perpDirX = -chordDirY / chordLength;
        const perpDirY = chordDirX / chordLength;
        
        // Determine which side of the chord the cursor is on
        const crossProduct = (x - startPoint.x) * (endPoint.y - startPoint.y) - (y - startPoint.y) * (endPoint.x - startPoint.x);
        const side = crossProduct > 0 ? 1 : -1;
        
        // Calculate center position
        const centerDistance = radius - sagitta;
        const centerX = midPointX + side * perpDirX * centerDistance;
        const centerY = midPointY + side * perpDirY * centerDistance;
        
        // Calculate start and end angles
        const startAngle = Math.atan2(startPoint.y - centerY, startPoint.x - centerX);
        const endAngle = Math.atan2(endPoint.y - centerY, endPoint.x - centerX);
        
        // Ensure correct arc direction
        let finalStartAngle = startAngle;
        let finalEndAngle = endAngle;
        
        // Determine the sweep direction based on the side
        if (side > 0) {
            // Counter-clockwise
            if (finalEndAngle < finalStartAngle) {
                finalEndAngle += 2 * Math.PI;
            }
        } else {
            // Clockwise - swap angles
            if (finalStartAngle < finalEndAngle) {
                finalStartAngle += 2 * Math.PI;
            }
            [finalStartAngle, finalEndAngle] = [finalEndAngle, finalStartAngle];
        }
        
        addShape(createShapeWithProperties({ 
            type: 'arc', 
            cx: centerX, 
            cy: centerY, 
            radius, 
            startAngle: finalStartAngle, 
            endAngle: finalEndAngle 
        }));
        
        // Reset arc drawing state
        arcPoints = [];
        arcDrawingStep = 0;
        arcPreviewActive = false;
        
        const arcAngle = Math.abs(finalEndAngle - finalStartAngle) * 180 / Math.PI;
        addToHistory(`Arc created with radius ${radius.toFixed(2)} and angle ${arcAngle.toFixed(1)}deg`);
        updateHelpBar('Arc completed! Select another tool or object.');
        setMode('select');
        redraw();
        
        // Reset help bar to default after 3 seconds
        setTimeout(() => {
            if (mode === 'select') {
                updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
            }
        }, 3000);
    }
}

function handleRectangleMode(x, y, e) {
    // Rectangle creation now supports numeric steps: width -> height -> angle
    if (rectangleStep === 0) {
        // First click - set first corner and prompt width
        rectangleStartX = x;
        rectangleStartY = y;
        rectangleWidth = 0;
        rectangleHeight = 0;
        rectangleAngle = 0;
        rectangleStep = 1;
        isDrawing = true;

        // Show numeric input for width immediately
        showLengthInput(e.offsetX, e.offsetY);
        updateLengthInputLabel('Width:');
        updateHelpBar('Rectangle: Enter width (or click second corner for 2-point method)');
        addToHistory(`Rectangle first corner at (${x.toFixed(2)}, ${y.toFixed(2)})`);
        redraw();
    } else if (rectangleStep === 1) {
        // Two-corner method: second click sets width/height, then go to angle step
        [x, y] = applyOrtho(x, y, rectangleStartX, rectangleStartY);

        const dx = x - rectangleStartX;
        const dy = y - rectangleStartY;
        rectangleWidthSign = dx >= 0 ? 1 : -1;
        rectangleHeightSign = dy >= 0 ? 1 : -1;
        rectangleWidth = Math.abs(dx);
        rectangleHeight = Math.abs(dy);
        rectangleAngle = 0;
        rectangleStep = 3; // proceed to angle selection

        // Show numeric angle input overlay and enable mouse angle selection
        showLengthInput(e.offsetX, e.offsetY);
        updateLengthInputLabel('Angle (deg):');
        updateHelpBar('Rectangle: Enter angle or move mouse to set angle, then Click to confirm');
        addToHistory(`Rectangle size set to ${rectangleWidth.toFixed(2)} × ${rectangleHeight.toFixed(2)}. Enter angle or set by mouse.`);
        redraw();
    } else if (rectangleStep === 2) {
        // Height step click does nothing; numeric entry expected
    } else if (rectangleStep === 3) {
        // Angle by mouse: update angle based on cursor vector from start corner and finalize on click
        const dx = x - rectangleStartX;
        const dy = y - rectangleStartY;
        let angle = Math.atan2(dy, dx);
        if (orthoMode) {
            // Snap angle to 15-degree increments when ortho is on (optional UX)
            const snap = 15 * Math.PI / 180;
            angle = Math.round(angle / snap) * snap;
        }
        rectangleAngle = angle;
        finalizeNumericRectangle();
    }
}

function resetRectangleMode() {
    rectangleStep = 0;
    isDrawing = false;
    rectangleWidth = 0;
    rectangleHeight = 0;
    rectangleAngle = 0;
    rectangleWidthSign = 1;
    rectangleHeightSign = 1;
    setMode('select');
    
    // Force redraw to clear any preview
    redraw();
}

function handleSplineMode(x, y, e) {
    // Track double click for spline completion
    const currentTime = Date.now();
    const clickDistance = splinePoints.length > 0 ? 
        Math.sqrt(Math.pow(x - lastClickX, 2) + Math.pow(y - lastClickY, 2)) : 0;
    
    if (splinePoints.length === 0) {
        // First point - just add it
        splinePoints.push({ x, y });
        splineStep = 1;
        isDrawing = true; // Set drawing state for spline
        
        // Set default direction for length input (horizontal)
        splineDirection = { x: 1, y: 0 };
        
        // Show length input immediately like in line mode
        showLengthInput(e.offsetX, e.offsetY);
        updateHelpBar('Step 2/?: Click next point, enter length, or double-click/Escape to finish spline');
        
        // Enable preview after a short delay to prevent immediate unwanted preview
        setTimeout(() => {
            splinePreviewActive = true;
        }, 100);
        
        addToHistory(`Spline started at (${x.toFixed(2)}, ${y.toFixed(2)}) - Enter length or click for next point`);
    } else {
        // Check for double click to finish spline (only if we have at least 2 points)
        if (currentTime - lastClickTime < 400 && clickDistance < 10 / zoom && splinePoints.length > 1) {
            // Double click detected - finish spline
            createFinalSpline();
            updateHelpBar('Spline completed! Returning to selection mode...');
            setTimeout(() => {
                updateHelpBar('Use drawing tools to create shapes');
            }, 2000);
            resetSplineMode();
            redraw();
            lastClickTime = 0;
            return;
        }
        
        // Always hide length input when adding point via click
        if (isLengthInputActive) {
            hideLengthInput();
        }
        
        // Add new point
        splinePoints.push({ x, y });
        
        // Update direction for next segment based on the last two points
        if (splinePoints.length >= 2) {
            const lastPoint = splinePoints[splinePoints.length - 2];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const newLength = Math.sqrt(dx * dx + dy * dy);
            if (newLength > 0) {
                splineDirection.x = dx / newLength;
                splineDirection.y = dy / newLength;
            }
        }
        
        // Show length input for the next segment after a small delay
        setTimeout(() => {
            if (mode === 'spline' && splinePoints.length > 0) {
                showLengthInput(e.offsetX, e.offsetY);
            }
        }, 150);
        
        // Enable preview for next segment
        splinePreviewActive = true;
        
        updateHelpBar(`Step ${splinePoints.length + 1}/?: Click next point, enter length, or double-click/Escape to finish`);
        
        addToHistory(`Spline point ${splinePoints.length} added at (${x.toFixed(2)}, ${y.toFixed(2)}) - Enter length or click for next point`);
    }
    
    // Update click tracking
    lastClickTime = currentTime;
    lastClickX = x;
    lastClickY = y;
    
    redraw();
}

function resetSplineMode() {
    splinePoints = [];
    splinePreviewActive = false;
    splineStep = 0;
    isDrawing = false;
    splineDirection = { x: 0, y: 0 };
    hideLengthInput();
    setMode('select');
}

function createFinalSpline() {
    // Ensure we have at least 2 points to create a spline
    if (splinePoints.length < 2) {
        addToHistory('Spline needs at least 2 points', 'error');
        return;
    }
    
    addShape({ 
        type: 'spline', 
        points: [...splinePoints],
        color: currentColor,
        lineWeight: currentLineWeight,
        linetype: currentLinetype,
        layer: currentLayer
    });
    
    addToHistory(`Spline created with ${splinePoints.length} points`);
}

document.addEventListener('keydown', (e) => {
    // Handle Ctrl+Z (Undo) and Ctrl+Y (Redo)
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        // File Operations
        if (e.key === 'o' || e.key === 'O') {
            e.preventDefault();
            openDrawing();
            return;
        }
        if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            saveDrawing();
            return;
        }
        
        // Undo/Redo
        if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            undo();
            return;
        }
        if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            redo();
            return;
        }
        // Zoom to Fit with Ctrl+0 (like many CAD applications)
        if (e.key === '0') {
            e.preventDefault();
            zoomToFit();
            redraw();
            addToHistory('Keyboard zoom to fit executed (Ctrl+0)');
            return;
        }
        // Layer Manager with Ctrl+L (like professional CAD software)
        if (e.key === 'l' || e.key === 'L') {
            e.preventDefault();
            toggleLayerPanel();
            addToHistory('Layer Manager toggled (Ctrl+L)');
            return;
        }
        // Properties Panel with Ctrl+P (like professional CAD software)
        if (e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            togglePropertiesPanel();
            addToHistory('Properties Panel toggled (Ctrl+P)');
            return;
        }
    }
    
    if (e.key === 'Escape') {
        // Hide length input if active
        if (isLengthInputActive) {
            hideLengthInput();
        }
        
        // If we're in line mode and drawing, cancel the line (check this regardless of length input state)
        if (mode === 'line' && isDrawing) {
            isDrawing = false;
            startX = undefined;
            startY = undefined;
            previewX = undefined;
            previewY = undefined;
            updateHelpBar('Step 1/2: Click start point for line');
            addToHistory('Line cancelled');
            redraw();
            return;
        }
        
        // If we're in circle mode and drawing, cancel the circle
        if (mode === 'circle' && isDrawing) {
            isDrawing = false;
            startX = undefined;
            startY = undefined;
            previewX = undefined;
            previewY = undefined;
            updateHelpBar('Step 1/2: Click center point for circle');
            addToHistory('Circle cancelled');
            redraw();
            return;
        }
        
        // If we're in ellipse mode, cancel or go back one step
        if (mode === 'ellipse' && ellipseDrawingStep > 0) {
            if (ellipseDrawingStep === 2) {
                // Go back to major radius step
                ellipseDrawingStep = 1;
                ellipseMajorRadius = 0;
                updateHelpBar('Step 2/3: Click for major radius, type radius + Enter, or use Escape to cancel');
                addToHistory('Ellipse minor radius cancelled - back to major radius');
            } else if (ellipseDrawingStep === 1) {
                // Cancel completely
                ellipseDrawingStep = 0;
                ellipsePreviewActive = false;
                ellipseCenter = { x: 0, y: 0 };
                ellipseMajorRadius = 0;
                updateHelpBar('Step 1/3: Click center point for ellipse');
                addToHistory('Ellipse cancelled');
            }
            redraw();
            return;
        }
        
        // If we're in arc mode, cancel or go back one step
        if (mode === 'arc' && arcPoints.length > 0) {
            if (arcDrawingStep > 0) {
                arcDrawingStep--;
                arcPoints.pop();
                if (arcDrawingStep === 0) {
                    arcPreviewActive = false;
                    updateHelpBar('Step 1/3: Click start point for arc');
                } else if (arcDrawingStep === 1) {
                    arcPreviewActive = false;
                    updateHelpBar('Step 2/3: Click end point for arc');
                }
                addToHistory('Arc step cancelled');
            } else {
                arcPoints = [];
                arcDrawingStep = 0;
                arcPreviewActive = false;
                updateHelpBar('Step 1/3: Click start point for arc');
                addToHistory('Arc cancelled');
            }
            redraw();
            return;
        }
        
        // Other mode cancellations
        if (mode === 'polygon' && polygonStep > 0) {
            resetPolygonMode();
            updateHelpBar('Polygon cancelled. Use drawing tools to create shapes.');
            addToHistory('Polygon cancelled');
            redraw();
        }
        else if (mode === 'rectangle' && rectangleStep > 0) {
            resetRectangleMode();
            updateHelpBar('Specify first corner point:');
            addToHistory('Rectangle cancelled');
            redraw();
        }
        else if (mode === 'move' && moveStep > 0) {
            resetMoveMode();
            updateHelpBar('Move operation cancelled. Use drawing tools to create shapes.');
            addToHistory('Move operation cancelled');
            redraw();
        }
        else if (mode === 'copy' && copyStep > 0) {
            resetCopyMode();
            updateHelpBar('Copy operation cancelled. Use drawing tools to create shapes.');
            addToHistory('Copy operation cancelled');
            redraw();
        }
        else if (mode === 'rotate' && rotateStep > 0) {
            resetRotateMode();
            updateHelpBar('Rotate operation cancelled. Use drawing tools to create shapes.');
            addToHistory('Rotate operation cancelled');
            redraw();
        }
        // else if (mode === 'scale' && scaleStep > 0) { // ВИМКНЕНО
        //     resetScaleMode();
        //     updateHelpBar('Scale operation cancelled. Use drawing tools to create shapes.');
        //     addToHistory('Scale operation cancelled');
        //     redraw();
        // }
        else if (mode === 'area_to_pdf' && areaToPdfStep > 0) {
            resetAreaToPdfMode();
            updateHelpBar('Area to PDF operation cancelled. Use drawing tools to create shapes.');
            addToHistory('Area to PDF operation cancelled');
            redraw();
        }
        else if (mode === 'polyline' && polylinePoints.length > 1) {
            addShape(createShapeWithProperties({ type: 'polyline', points: [...polylinePoints] }));
            addToHistory(`Polyline completed with ${polylinePoints.length} points`);
            updateHelpBar('Polyline completed! Select another tool or object.');
            polylinePoints = [];
            polylinePreviewActive = false;
            setMode('select');
            redraw();
            
            // Reset help bar to default after 3 seconds
            setTimeout(() => {
                if (mode === 'select') {
                    updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
                }
            }, 3000);
        }
        else if (mode === 'spline' && splinePoints.length > 1) {
            createFinalSpline();
            updateHelpBar('Spline completed! Returning to selection mode...');
            setTimeout(() => {
                updateHelpBar('Use drawing tools to create shapes');
            }, 2000);
            resetSplineMode();
            redraw();
        }
        else if (mode === 'spline' && splinePoints.length === 1) {
            resetSplineMode();
            updateHelpBar('Spline cancelled. Use drawing tools to create shapes.');
            addToHistory('Spline cancelled');
            redraw();
        }
        else if (mode === 'hatch' && hatchPoints.length > 1) {
            addShape(createShapeWithProperties({ type: 'hatch', points: [...hatchPoints] }));
            hatchPoints = [];
            redraw();
        }
        else if (mode === 'point') {
            setMode('select');
            updateHelpBar('Point mode exited. Use drawing tools to create shapes.');
        }
        else if (mode === 'text') {
            // If text input overlay is visible, cancel it
            if (textInputOverlay.style.display === 'block') {
                cancelText();
            } else {
                setMode('select');
                updateHelpBar('Text mode exited. Use drawing tools to create shapes.');
            }
        }
        else if (mode === 'select' && selectedShapes.size > 0) {
            clearSelection();
        } else {
            setMode('select');
        }
    }

    // Note: Enter key handling for spline completion removed - only use Escape or double-click
    
    // Activate length input with 'L' key in polyline mode
    if ((e.key === 'l' || e.key === 'L') && mode === 'polyline' && polylinePoints.length > 0 && !isLengthInputActive) {
        if (!isUserTypingInInput()) {
            e.preventDefault();
            showLengthInput(currentMouseX, currentMouseY);
        }
        return;
    }
    
    // Activate length input with 'L' key in spline mode
    if ((e.key === 'l' || e.key === 'L') && mode === 'spline' && splinePoints.length > 0 && !isLengthInputActive) {
        if (!isUserTypingInInput()) {
            e.preventDefault();
            showLengthInput(currentMouseX, currentMouseY);
        }
        return;
    }
    // Activate numeric entry in rectangle mode with 'L'
    if ((e.key === 'l' || e.key === 'L') && mode === 'rectangle' && isDrawing && !isLengthInputActive) {
        if (!isUserTypingInInput()) {
            e.preventDefault();
            showLengthInput(currentMouseX, currentMouseY);
            if (rectangleStep === 1) updateLengthInputLabel('Width:');
            else if (rectangleStep === 2) updateLengthInputLabel('Height:');
            else if (rectangleStep === 3) updateLengthInputLabel('Angle (deg):');
        }
        return;
    }
    
    // Select all with Ctrl+A
    if (e.ctrlKey && e.key === 'a') {
        if (!isUserTypingInInput()) {
            e.preventDefault();
            selectAll();
        }
    }
    
    // Delete selected objects with Delete key
    if (e.key === 'Delete' || e.key === 'Backspace') {
        // If user is typing in an input field, don't interfere with backspace/delete
        if (!isUserTypingInInput()) {
            e.preventDefault();
            deleteSelectedShapes();
        }
    }
});

// === Length Input Functions ===
function showLengthInput(x, y) {
    // Showing length input
    lengthInputOverlay.style.left = `${x + 15}px`;
    lengthInputOverlay.style.top = `${y - 10}px`;
    lengthInputOverlay.style.display = 'block';
    lengthInput.value = '';
    
    // Special settings for polygon sides input
    if (mode === 'polygon' && polygonStep === 1) {
        lengthInput.type = 'number';
        lengthInput.min = '3';
        lengthInput.max = '9';
        lengthInput.step = '1';
        lengthInput.placeholder = 'Sides (3-9)';
    }
    else {
        lengthInput.type = 'number';
        lengthInput.removeAttribute('min');
        lengthInput.removeAttribute('max');
        lengthInput.step = '0.01';
        lengthInput.placeholder = 'Length...';
    }
    
    lengthInput.focus();
    isLengthInputActive = true;
}

function hideLengthInput() {
    // Hiding length input
    lengthInputOverlay.style.display = 'none';
    isLengthInputActive = false;
    lengthInput.value = '';
    
    // Reset input to default settings
    lengthInput.type = 'number';
    lengthInput.removeAttribute('min');
    lengthInput.removeAttribute('max');
    lengthInput.step = '0.01';
    lengthInput.placeholder = 'Length...';
}

function updateLengthInputPosition(x, y) {
    if (isLengthInputActive) {
        lengthInputOverlay.style.left = `${x + 15}px`;
        lengthInputOverlay.style.top = `${y - 10}px`;
    }
}

function updateLengthInputLabel(text) {
    // Update placeholder text for different input types
    lengthInput.placeholder = text;
    
    // Set appropriate step based on input type
    if (text.toLowerCase().includes('rotation') || text.toLowerCase().includes('degrees')) {
        lengthInput.step = '1';  // Use step of 1 for angle degrees
    } else if (text.toLowerCase().includes('sides')) {
        lengthInput.step = '1';  // Use step of 1 for polygon sides
    } else {
        lengthInput.step = '0.01';  // Use step of 0.01 for lengths
    }
}

function setLengthInputValue(value) {
    lengthInput.value = value;
}

// === Angle Input Functions ===
function showAngleInput(x, y) {
    // Showing angle input
    lengthInputOverlay.style.left = `${x + 15}px`;
    lengthInputOverlay.style.top = `${y - 10}px`;
    lengthInputOverlay.style.display = 'block';
    lengthInput.value = '';
    
    // Settings for angle input
    lengthInput.type = 'number';
    lengthInput.removeAttribute('min');
    lengthInput.removeAttribute('max');
    lengthInput.step = '1';
    lengthInput.placeholder = 'Angle (degrees)...';
    
    lengthInput.focus();
    isLengthInputActive = true;
}

// === Scale Input Functions ===
function showScaleInput(x, y) {
    // Showing scale factor input
    lengthInputOverlay.style.left = `${x + 15}px`;
    lengthInputOverlay.style.top = `${y - 10}px`;
    lengthInputOverlay.style.display = 'block';
    lengthInput.value = '';
    
    // Settings for scale factor input
    lengthInput.type = 'number';
    lengthInput.min = '0.01';
    lengthInput.removeAttribute('max');
    lengthInput.step = '0.1';
    lengthInput.placeholder = 'Scale factor...';
    
    lengthInput.focus();
    isLengthInputActive = true;
}

function handleLengthInput(length) {
    if (mode === 'line' && isDrawing && length > 0) {
        // Calculate end point based on direction and length - NEW IMPROVED LOGIC
        const angle = Math.atan2(lineDirection.y, lineDirection.x);
        const endX = startX + length * Math.cos(angle);
        const endY = startY + length * Math.sin(angle);
        
        // Create the line with new logic
        addShape(createShapeWithProperties({ type: 'line', x1: startX, y1: startY, x2: endX, y2: endY }));
        
        // Reset state
        isDrawing = false;
        hideLengthInput();
        updateHelpBar(`Line created! Length: ${length.toFixed(2)} units. Click for next line or select another tool.`);
        setMode('select');
        redraw();
        
        addToHistory(`Line created with length ${length.toFixed(2)} at angle ${(angle * 180 / Math.PI).toFixed(1)}deg`);
        
        // Reset to initial message after delay
        setTimeout(() => {
            if (mode === 'line') {
                updateHelpBar('Line Tool: Click first point to start drawing. Use ortho (⟂) for precise angles.');
            }
        }, 2000);
    } else if (mode === 'polyline' && polylinePoints.length > 0 && length > 0) {
        // Calculate end point for polyline segment based on direction and length
        const lastPoint = polylinePoints[polylinePoints.length - 1];
        const angle = Math.atan2(polylineDirection.y, polylineDirection.x);
        const endX = lastPoint.x + length * Math.cos(angle);
        const endY = lastPoint.y + length * Math.sin(angle);
        
        // Add new point
        polylinePoints.push({ x: endX, y: endY });
        
        // Update preview from new point based on current mouse position
        const [mouseWorldX, mouseWorldY] = screenToWorld(currentMouseX, currentMouseY);
        [previewX, previewY] = applyOrtho(mouseWorldX, mouseWorldY, endX, endY);
        
        // Update direction for next segment based on current mouse position
        const dx = previewX - endX;
        const dy = previewY - endY;
        const newLength = Math.sqrt(dx * dx + dy * dy);
        if (newLength > 0) {
            polylineDirection.x = dx / newLength;
            polylineDirection.y = dy / newLength;
        }
        
        // Keep length input active for next segment
        updateLengthInputPosition(currentMouseX, currentMouseY);
        lengthInput.value = ''; // Clear field for new input
        lengthInput.focus();
        
        // Enable preview
        polylinePreviewActive = true;
        
        redraw();
        addToHistory(`Segment added with length ${length.toFixed(2)} at angle ${(angle * 180 / Math.PI).toFixed(1)}deg. Enter next length or click point.`);
    } else if (mode === 'circle' && isDrawing && length > 0) {
        // Create circle with specified radius
        addShape(createShapeWithProperties({ type: 'circle', cx: startX, cy: startY, radius: length }));
        
        // Reset state
        isDrawing = false;
        hideLengthInput();
        updateHelpBar('Circle completed! Select another tool or object.');
        setMode('select');
        redraw();
        
        addToHistory(`Circle created with radius ${length.toFixed(2)}`);
        
        // Reset help bar to default after 3 seconds
        setTimeout(() => {
            if (mode === 'select') {
                updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
            }
        }, 3000);
    } else if (mode === 'ellipse' && ellipseDrawingStep === 1 && length > 0) {
        // Set major radius and proceed to minor radius step
        ellipseMajorRadius = length;
        ellipseDrawingStep = 2;
        hideLengthInput();
        
        updateHelpBar('Step 3/3: Click for minor radius, type radius + Enter, or use Escape to go back');
        addToHistory(`Ellipse major radius set to ${length.toFixed(2)} - Enter minor radius or click for radius point`);
        redraw();
    } else if (mode === 'ellipse' && ellipseDrawingStep === 2 && length > 0) {
        // Create ellipse with specified minor radius
        const ellipse = createShapeWithProperties({
            type: 'ellipse',
            cx: ellipseCenter.x,
            cy: ellipseCenter.y,
            rx: ellipseMajorRadius,
            ry: length,
            rotation: 0
        });
        
        addShape(ellipse);
        
        // Reset ellipse drawing state
        ellipseDrawingStep = 0;
        ellipsePreviewActive = false;
        ellipseMajorRadius = 0;
        hideLengthInput();
        
        updateHelpBar('Ellipse completed! Select another tool or object.');
        setMode('select');
        redraw();
        
        addToHistory(`Ellipse created with major radius ${ellipseMajorRadius.toFixed(2)}, minor radius ${length.toFixed(2)}`);
        
        // Reset help bar to default after 3 seconds
        setTimeout(() => {
            if (mode === 'select') {
                updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
            }
        }, 3000);
    } else if (mode === 'polygon' && polygonStep >= 1) {
        // Handle polygon input based on current step
        if (handlePolygonLengthInput(length)) {
            hideLengthInput();
            redraw();
        }
    } else if (mode === 'rectangle' && isDrawing) {
        // Rectangle numeric workflow
        if (rectangleStep === 1 && length > 0) {
            // Set width, ask for height
            rectangleWidth = length;
            rectangleStep = 2;
            updateLengthInputLabel('Height:');
            lengthInput.value = '';
            updateHelpBar('Rectangle: Enter height');
            addToHistory(`Rectangle width set to ${length.toFixed(2)}. Enter height.`);
            redraw();
        } else if (rectangleStep === 2 && length > 0) {
            // Set height, ask for angle (degrees)
            rectangleHeight = length;
            rectangleStep = 3;
            updateLengthInputLabel('Angle (deg):');
            lengthInput.value = '';
            updateHelpBar('Rectangle: Enter angle or move mouse to set angle, then Click to confirm');
            addToHistory(`Rectangle height set to ${length.toFixed(2)}. Enter angle or set by mouse.`);
            // Start angle preview following mouse
            rectangleAngle = 0;
            redraw();
        } else if (rectangleStep === 3) {
            // Angle provided (degrees) - finalize
            const degrees = length; // reuse variable but semantically angle here
            const radians = degrees * Math.PI / 180;
            rectangleAngle = radians;
            finalizeNumericRectangle();
        }
    } else if (mode === 'spline' && isDrawing && splinePoints.length > 0) {
        // Handle spline segment length input
        const lastPoint = splinePoints[splinePoints.length - 1];
        
        // Use stored direction or calculate from mouse position if no direction set
        let dx = splineDirection.x;
        let dy = splineDirection.y;
        
        // If no direction is set, calculate from current mouse position
        if (dx === 0 && dy === 0) {
            const [mouseWorldX, mouseWorldY] = screenToWorld(currentMouseX, currentMouseY);
            dx = mouseWorldX - lastPoint.x;
            dy = mouseWorldY - lastPoint.y;
            
            // Normalize direction
            const currentLength = Math.sqrt(dx * dx + dy * dy);
            if (currentLength > 0) {
                dx = dx / currentLength;
                dy = dy / currentLength;
            } else {
                // Default to horizontal if no direction available
                dx = 1;
                dy = 0;
            }
        }
        
        // Apply ortho if enabled
        if (orthoMode) {
            [dx, dy] = applyOrtho(dx, dy, 0, 0);
            // Normalize after ortho
            const orthoLength = Math.sqrt(dx * dx + dy * dy);
            if (orthoLength > 0) {
                dx = dx / orthoLength;
                dy = dy / orthoLength;
            }
        }
        
        // Calculate new point at specified length
        const newX = lastPoint.x + dx * length;
        const newY = lastPoint.y + dy * length;
        
        // Add new point to spline
        splinePoints.push({ x: newX, y: newY });
        
        // Update direction for next segment
        splineDirection.x = dx;
        splineDirection.y = dy;
        
        // Update preview from new point based on current mouse position
        const [mouseWorldX, mouseWorldY] = screenToWorld(currentMouseX, currentMouseY);
        [previewX, previewY] = applyOrtho(mouseWorldX, mouseWorldY, newX, newY);
        
        // Keep length input active for next segment
        updateLengthInputPosition(currentMouseX, currentMouseY);
        lengthInput.value = ''; // Clear field for new input
        lengthInput.focus();
        
        // Enable preview
        splinePreviewActive = true;
        
        redraw();
        addToHistory(`Spline point added at distance ${length.toFixed(2)}`);
    } else if (mode === 'rotate' && rotateStep === 2 && rotatePreviewActive) {
        // Handle angle input for rotation
        const angleDegrees = parseFloat(length);
        if (!isNaN(angleDegrees)) {
            const angleRadians = angleDegrees * Math.PI / 180;
            
            // Save state before rotating
            saveState(`Rotate ${rotateObjectsToRotate.size} object(s) by ${angleDegrees}°`);
            
            // Rotate all selected objects
            for (const index of rotateObjectsToRotate) {
                if (index < shapes.length) { // Safety check
                    const shape = shapes[index];
                    rotateShape(shape, rotateBasePoint.x, rotateBasePoint.y, angleRadians);
                }
            }
            
            // Update main selection to match rotated objects
            selectedShapes = new Set(rotateObjectsToRotate);
            
            updateHelpBar('Objects rotated! Returning to selection mode...');
            addToHistory(`Rotated ${rotateObjectsToRotate.size} object(s) by ${angleDegrees}° around (${rotateBasePoint.x.toFixed(2)}, ${rotateBasePoint.y.toFixed(2)})`);
            
            // Reset rotate state
            resetRotateMode();
            hideLengthInput();
            redraw();
            
            setTimeout(() => {
                updateHelpBar('Use drawing tools to create shapes');
            }, 2000);
        }
    } else if (mode === 'scale' && scaleStep === 2 && scalePreviewActive) {
        // Handle scale factor input for scaling
        const scaleFactor = parseFloat(length);
        if (!isNaN(scaleFactor) && scaleFactor > 0) {
            // Save state before scaling
            saveState(`Scale ${scaleObjectsToScale.size} object(s) by ${scaleFactor}`);
            
            // Scale all selected objects
            for (const index of scaleObjectsToScale) {
                if (index < shapes.length) { // Safety check
                    const shape = shapes[index];
                    scaleShape(shape, scaleBasePoint.x, scaleBasePoint.y, scaleFactor);
                }
            }
            
            // Update main selection to match scaled objects
            selectedShapes = new Set(scaleObjectsToScale);
            
            updateHelpBar('Objects scaled! Returning to selection mode...');
            addToHistory(`Scaled ${scaleObjectsToScale.size} object(s) by factor ${scaleFactor} around (${scaleBasePoint.x.toFixed(2)}, ${scaleBasePoint.y.toFixed(2)})`);
            
            // Reset scale state
            resetScaleMode();
            hideLengthInput();
            redraw();
            
            setTimeout(() => {
                updateHelpBar('Use drawing tools to create shapes');
            }, 2000);
        }
    }
}

// Finalize numeric rectangle creation using current width/height/angle
function finalizeNumericRectangle() {
    const w = Math.max(0.0001, rectangleWidth);
    const h = Math.max(0.0001, rectangleHeight);
    const a = rectangleAngle || 0;
    const cx = rectangleStartX;
    const cy = rectangleStartY;

    // Define unrotated rectangle points from corner
    const pts = [
        { x: 0, y: 0 },
        { x: w * rectangleWidthSign, y: 0 },
        { x: w * rectangleWidthSign, y: h * rectangleHeightSign },
        { x: 0, y: h * rectangleHeightSign },
        { x: 0, y: 0 }
    ];
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const rotPts = pts.map(p => ({
        x: p.x * cosA - p.y * sinA + cx,
        y: p.x * sinA + p.y * cosA + cy
    }));

    addShape(createShapeWithProperties({ type: 'polyline', points: rotPts }));
    hideLengthInput();
    addToHistory(`Rectangle created: ${w.toFixed(2)} × ${h.toFixed(2)} at ${(a * 180 / Math.PI).toFixed(1)}°`);
    updateHelpBar('Rectangle completed! Select another tool or object.');
    resetRectangleMode();
    setTimeout(() => {
        if (mode === 'select') {
            updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
        }
    }, 3000);
    redraw();
}

// Add event listener for length input
lengthInput.addEventListener('keydown', (e) => {
    // Allow Backspace for all modes
    if (e.key === 'Backspace') {
        // Allow default backspace behavior
        return;
    }
    
    // Special handling for polygon sides input (step 1)
    if (mode === 'polygon' && polygonStep === 1) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const sides = parseInt(lengthInput.value);
            if (!isNaN(sides) && sides >= 3 && sides <= 9) {
                handleLengthInput(sides);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideLengthInput();
        }
        return;
    }
    
    // Regular handling for other modes
    if (e.key === 'Enter') {
        e.preventDefault();
        const length = safeParseFloat(lengthInput.value, 0, 'length input');
        
        // For other inputs, require positive values
        if (length > 0) {
            handleLengthInput(length);
        } else {
            addToHistory('Invalid length value', 'error');
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        hideLengthInput();
    }
});

// Add input event listener for additional validation
lengthInput.addEventListener('input', (e) => {
    // Special validation for polygon sides input (step 1)
    if (mode === 'polygon' && polygonStep === 1) {
        const value = parseInt(e.target.value);
        
        // Ensure value is within range
        if (value < 3) {
            e.target.value = '3';
        } else if (value > 9) {
            e.target.value = '9';
        }
    }
});

// Prevent length input from losing focus when clicking on canvas (but allow intentional clicks to work)
lengthInput.addEventListener('blur', (e) => {
    // Only refocus if the user didn't intentionally click to dismiss the length input
    setTimeout(() => {
        if (isLengthInputActive && 
            ((mode === 'line' && isDrawing) || 
             (mode === 'circle' && isDrawing) || 
             (mode === 'polygon' && (polygonStep === 1 || polygonStep === 3)) ||
             (mode === 'rectangle' && (rectangleStep === 1 || rectangleStep === 2 || rectangleStep === 3)) ||
             (mode === 'polyline' && polylinePoints.length > 0)) &&
            !e.relatedTarget) { // Only refocus if blur wasn't caused by clicking on another element
            lengthInput.focus();
        }
    }, 100);
});



function undoAction() {
  addToHistory('Undo action (not yet implemented)', 'error');
}
function redoAction() {
  addToHistory('Redo action (not yet implemented)', 'error');
}
function deleteSelectedShapes() {
    if (selectedShapes.size === 0) {
        addToHistory('No objects selected to delete', 'error');
        return;
    }

    // Save state before deleting
    saveState(`Delete ${selectedShapes.size} object(s)`);

    // Convert selectedShapes to array and sort in descending order
    // This ensures we delete from the end to avoid index shifting issues
    const indicesToDelete = Array.from(selectedShapes).sort((a, b) => b - a);
    
    // Delete shapes from the end
    indicesToDelete.forEach(index => {
        shapes.splice(index, 1);
    });
    
    addToHistory(`Deleted ${selectedShapes.size} object(s)`);
    
    // Clear selection
    selectedShapes.clear();
    
    // Redraw canvas
    redraw();
}

// === EXPLODE FUNCTIONS ===
function inheritProperties(newShape, source) {
    newShape.layer = source.layer || currentLayer;
    newShape.color = source.color || currentColor;
    newShape.lineWeight = source.lineWeight || source.lineweight || currentLineWeight;
    newShape.linetype = source.linetype || currentLinetype;
    return newShape;
}

function explodeShape(shape) {
    const parts = [];
    switch (shape.type) {
        case 'line':
        case 'point':
        case 'text':
            // Not explodable into simpler primitives here
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
            const segs = Math.max(8, EXPLODE_SEGMENTS);
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
            const segs = Math.max(8, EXPLODE_SEGMENTS);
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
            // Normalize to CCW sweep
            let sweep = a1 - a0;
            const full = 2 * Math.PI;
            if (sweep === 0) return parts;
            // Choose segments proportional to sweep
            const segs = Math.max(4, Math.round(EXPLODE_SEGMENTS * Math.abs(sweep) / full));
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
    // Inherit properties
    return parts.map(p => inheritProperties(p, shape));
}

function explodeSelectedShapes() {
    if (selectedShapes.size === 0) {
        addToHistory('No objects selected to explode', 'error');
        return;
    }
    saveState(`Explode ${selectedShapes.size} object(s)`);
    const indices = Array.from(selectedShapes).sort((a, b) => b - a);
    let totalParts = 0;
    const newSelected = new Set();
    for (const idx of indices) {
        if (idx < 0 || idx >= shapes.length) continue;
        const shape = shapes[idx];
        const parts = explodeShape(shape);
        if (parts && parts.length) {
            shapes.splice(idx, 1);
            for (const part of parts) {
                shapes.push(part);
                newSelected.add(shapes.length - 1);
            }
            totalParts += parts.length;
        }
    }
    selectedShapes = newSelected;
    addToHistory(`Exploded ${indices.length} object(s) into ${totalParts} part(s)`);
    redraw();
}

// Prompt for new layer name
function promptNewLayer() {
    const name = prompt('Enter new layer name:');
    if (name && name.trim()) {
        createNewLayer(name.trim());
    }
}
window.promptNewLayer = promptNewLayer;

// === Add Shape Function ===
function addShape(shape) {
    // Save state before adding shape
    saveState(`Create ${shape.type}`);
    
    // Add current layer and color information
    shape.layer = currentLayer;
    shape.color = currentColor;
    shape.lineWeight = currentLineWeight;
    
    shapes.push(shape);
    addToHistory(`${shape.type} created`);
    
    // Mark as changed for auto-save
    markAsChanged();
    
    // Professional CAD-like behavior: if using non-ByLayer lineweight, mark as temporary
    // and reset to ByLayer after creating the object
    if (currentLineWeight !== 'byLayer' && !isTemporaryLineweight) {
        isTemporaryLineweight = true;
        currentLineWeight = 'byLayer';
        updateLineweightDisplay();
        addToHistory('Lineweight reset to ByLayer');
    }
    
    // Auto-return to select mode after creating a shape (Professional CAD-like behavior)
    if (mode !== 'select' && mode !== 'polyline' && mode !== 'spline' && mode !== 'hatch') {
        setMode('select');
    }
}


function createPolygon(centerX, centerY, radius) {
    const points = [];
    for (let i = 0; i < polygonSides; i++) {
        const angle = i * 2 * Math.PI / polygonSides - Math.PI/2;
        points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    }
    
    // Add the first point again to close the polygon
    if (points.length > 0) {
        points.push({
            x: points[0].x,
            y: points[0].y
        });
    }
    
    // Create as polyline instead of polygon - this makes it behave like polyline in properties
    addShape({ 
        type: 'polyline', 
        points,
        color: currentColor,
        lineWeight: currentLineWeight,
        linetype: currentLinetype,
        layer: currentLayer,
        // Add polygon metadata to preserve polygon information
        isPolygon: true,
        polygonSides: polygonSides,
        polygonRadius: radius,
        polygonCenter: { x: centerX, y: centerY }
    });
    
    addToHistory(`Polygon created: ${polygonSides} sides, radius ${radius.toFixed(2)}`);
}

// === NEW POLYGON FUNCTIONS ===

function resetPolygonMode() {
    polygonStep = 0;
    polygonAngle = 0;
    isDrawing = false;
    hideLengthInput();
    setMode('select');
}

function createFinalPolygon() {
    const points = [];
    
    // Calculate actual radius based on type
    let actualRadius = polygonRadius;
    if (polygonRadiusType === 'inscribed') {
        // For inscribed polygon, convert apothem to circumradius
        actualRadius = polygonRadius / Math.cos(Math.PI / polygonSides);
    }
    // For circumscribed, use radius as is
    
    for (let i = 0; i < polygonSides; i++) {
        const angle = i * 2 * Math.PI / polygonSides - Math.PI/2 + polygonAngle;
        points.push({
            x: polygonCenterX + actualRadius * Math.cos(angle),
            y: polygonCenterY + actualRadius * Math.sin(angle)
        });
    }
    
    // Add the first point again to close the polygon
    if (points.length > 0) {
        points.push({
            x: points[0].x,
            y: points[0].y
        });
    }
    
    // Create as polyline instead of polygon - this makes it behave like polyline in properties
    const newShape = { 
        type: 'polyline', 
        points,
        color: currentColor,
        lineWeight: currentLineWeight,
        linetype: currentLinetype,
        layer: currentLayer,
        // Add polygon metadata to preserve polygon information
        isPolygon: true,
        polygonSides: polygonSides,
        polygonRadius: polygonRadius,
        polygonRadiusType: polygonRadiusType,
        polygonCenter: { x: polygonCenterX, y: polygonCenterY }
    };
    
    addShape(newShape);
    
    console.log('Polygon created as polyline:', newShape);
    
    const radiusTypeText = polygonRadiusType === 'inscribed' ? 'inscribed' : 'circumscribed';
    addToHistory(`Polygon created: ${polygonSides} sides, radius ${polygonRadius.toFixed(2)} (${radiusTypeText}), angle ${(polygonAngle * 180 / Math.PI).toFixed(1)}deg`);
}

function handlePolygonLengthInput(value) {
    if (polygonStep === 1) {
        // Setting number of sides
        const sides = parseInt(value);
        if (sides >= 3 && sides <= 50) {
            polygonSides = sides;
            polygonStep = 2;
            hideLengthInput();
            // Skip radius type selector step - it's already selected via toolbar button
            updateHelpBar('Step 3/3: Click center point, then drag to set radius and angle');
            addToHistory(`Number of sides set to ${polygonSides} - ${polygonRadiusType} polygon selected`);
        } else {
            addToHistory('Number of sides must be between 3 and 50', 'error');
            return false;
        }
    } else if (polygonStep === 2) {
        // Setting radius manually (alternative to clicking)
        const radius = safeParseFloat(value, 0, 'polygon radius');
        if (radius > 0) {
            polygonRadius = radius;
            polygonAngle = 0; // Default angle
            createFinalPolygon();
            updateHelpBar('Polygon completed! Returning to selection mode...');
            setTimeout(() => {
                updateHelpBar('Use drawing tools to create shapes');
            }, 2000);
            resetPolygonMode();
            redraw();
        } else {
            addToHistory('Radius must be greater than 0', 'error');
            return false;
        }
    }
    return true;
}


// Make drawing mode functions globally accessible 
window.setMode = setMode;
window.undo = undo;
window.redo = redo;
// window.startRotateCommand = startRotateCommand; // ВИМКНЕНО
// window.startScaleCommand = startScaleCommand; // ВИМКНЕНО
window.showDisabledMessage = showDisabledMessage;
window.deleteSelectedShapes = deleteSelectedShapes;
window.explodeSelectedShapes = explodeSelectedShapes;
window.confirmText = confirmText;
window.cancelText = cancelText;


// === MEMORY MANAGEMENT & CLEANUP ===
function resetAllOperationStates() {
    // Reset drawing states
    isDrawing = false;
    
    // Reset move operation
    moveStep = 0;
    moveBasePoint = { x: 0, y: 0 };
    moveObjectsToMove.clear();
    movePreviewActive = false;
    
    // Reset copy operation
    copyStep = 0;
    copyBasePoint = { x: 0, y: 0 };
    copyObjectsToCopy.clear();
    copyPreviewActive = false;
    
    // Reset rotate operation
    rotateStep = 0;
    rotateBasePoint = { x: 0, y: 0 };
    rotateObjectsToRotate.clear();
    rotatePreviewActive = false;
    rotateAngleStart = 0;
    
    // Reset scale operation
    scaleStep = 0;
    scaleBasePoint = { x: 0, y: 0 };
    scaleObjectsToScale.clear();
    scalePreviewActive = false;
    scaleStartDistance = 0;
    
    // Reset polyline
    polylinePoints = [];
    polylinePreviewActive = false;
    
    // Reset arc
    arcPoints = [];
    arcDrawingStep = 0;
    
    // Reset polygon
    resetPolygonMode();
    
    // Clear any active input overlays
    if (isLengthInputActive) {
        hideLengthInput();
    }
    
    // Clear status timeouts
    if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
    }
    
}

function cleanupMemory() {
    // Limit undo stack size (already implemented with MAX_UNDO_STEPS)
    if (undoStack.length > MAX_UNDO_STEPS) {
        undoStack.splice(0, undoStack.length - MAX_UNDO_STEPS);
    }
    
    // Limit redo stack size
    if (redoStack.length > MAX_UNDO_STEPS) {
        redoStack.splice(0, redoStack.length - MAX_UNDO_STEPS);
    }
    
    // Limit command history
    const MAX_COMMAND_HISTORY = 100;
    if (commandHistory.length > MAX_COMMAND_HISTORY) {
        commandHistory.splice(0, commandHistory.length - MAX_COMMAND_HISTORY);
    }
    
    // Clear temporary variables
    tempCommand = '';
    historyIndex = -1;
}

// Auto cleanup every 5 minutes
setInterval(cleanupMemory, 5 * 60 * 1000);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    resetAllOperationStates();
    cleanupMemory();
});

// Add a manual cleanup command
window.cleanup = () => {
    resetAllOperationStates();
    cleanupMemory();
    updateHelpBar('Memory cleanup completed');
    addToHistory('Manual memory cleanup performed');
};


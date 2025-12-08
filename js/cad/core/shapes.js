// ============================================================================
// SHAPE MANAGEMENT
// ============================================================================
// This module handles core shape operations: adding, deleting, copying, pasting
// Note: shapes array and selectedShapes Set are defined in /geometry/primitives.js
// ============================================================================

/**
 * Add a new shape to the drawing
 * @param {Object} shape - The shape object to add
 */
function addShape(shape) {
    // Save state before adding shape (for undo)
    if (typeof saveState === 'function') {
        saveState(`Create ${shape.type}`);
    }
    
    // Add current layer and color information if not already set
    if (!shape.layer && typeof currentLayer !== 'undefined') {
        shape.layer = currentLayer;
    }
    if (!shape.color && typeof currentColor !== 'undefined') {
        shape.color = currentColor;
    }
    if (!shape.lineWeight && typeof currentLineWeight !== 'undefined') {
        shape.lineWeight = currentLineWeight;
    }
    
    // Add shape to the shapes array
    if (typeof shapes !== 'undefined') {
        shapes.push(shape);
    }
    
    if (typeof addToHistory === 'function') {
        addToHistory(`${shape.type} created`);
    }
    
    // Mark as changed for auto-save
    if (typeof markAsChanged === 'function') {
        markAsChanged();
    }
    
    // Professional CAD-like behavior: if using non-ByLayer lineweight, mark as temporary
    // and reset to ByLayer after creating the object
    if (typeof currentLineWeight !== 'undefined' && 
        typeof isTemporaryLineweight !== 'undefined' &&
        currentLineWeight !== 'byLayer' && !isTemporaryLineweight) {
        isTemporaryLineweight = true;
        currentLineWeight = 'byLayer';
        
        if (typeof updateLineweightDisplay === 'function') {
            updateLineweightDisplay();
        }
        if (typeof addToHistory === 'function') {
            addToHistory('Lineweight reset to ByLayer');
        }
    }
    
    // Auto-return to select mode after creating a shape (Professional CAD-like behavior)
    if (typeof mode !== 'undefined' && 
        mode !== 'select' && mode !== 'polyline' && mode !== 'spline' && mode !== 'hatch') {
        if (typeof setMode === 'function') {
            setMode('select');
        }
    }
}

/**
 * Delete all selected shapes
 */
function deleteSelected() {
    if (typeof selectedShapes === 'undefined' || selectedShapes.size === 0) {
        if (typeof addToHistory === 'function') {
            addToHistory('No objects selected to delete', 'error');
        }
        return;
    }
    
    // Save state for undo
    if (typeof saveState === 'function') {
        saveState(`Delete ${selectedShapes.size} object(s)`);
    }
    
    // Sort indices in descending order to avoid index shifting
    const sortedIndices = Array.from(selectedShapes).sort((a, b) => b - a);
    
    // Remove shapes from back to front
    if (typeof shapes !== 'undefined') {
        sortedIndices.forEach(index => {
            shapes.splice(index, 1);
        });
    }
    
    // Invalidate viewport cache since shapes array changed
    if (typeof invalidateViewportCache === 'function') {
        invalidateViewportCache();
    }
    
    if (typeof addToHistory === 'function') {
        addToHistory(`Deleted ${selectedShapes.size} object(s)`);
    }
    
    selectedShapes.clear();
    
    if (typeof redraw === 'function') {
        redraw();
    }
}

/**
 * Copy selected shapes to clipboard
 */
function copySelected() {
    if (typeof selectedShapes === 'undefined' || selectedShapes.size === 0) {
        if (typeof addToHistory === 'function') {
            addToHistory('No objects selected to copy', 'error');
        }
        return;
    }
    
    // Clear copied shapes array (use global window.copiedShapes)
    if (typeof window.copiedShapes !== 'undefined') {
        window.copiedShapes = [];
    }
    
    selectedShapes.forEach(index => {
        if (typeof shapes !== 'undefined' && shapes[index]) {
            const copiedShape = typeof safeDeepCopy === 'function' 
                ? safeDeepCopy(shapes[index], {}, 'copied to clipboard')
                : JSON.parse(JSON.stringify(shapes[index])); // Fallback
                
            if (copiedShape && typeof copiedShape === 'object') {
                window.copiedShapes.push(copiedShape);
            } else {
                console.error('Failed to copy shape at index:', index);
                if (typeof addToHistory === 'function') {
                    addToHistory('Warning: Failed to copy one or more shapes', 'warning');
                }
            }
        }
    });
    
    if (typeof addToHistory === 'function') {
        addToHistory(`Copied ${selectedShapes.size} object(s). Click to paste.`);
    }
    
    if (typeof setMode === 'function') {
        setMode('paste');
    }
}

/**
 * Paste copied shapes at specified location
 * @param {number} x - X coordinate for paste location
 * @param {number} y - Y coordinate for paste location
 */
function pasteShapes(x, y) {
    // Use global window.copiedShapes
    if (!window.copiedShapes || window.copiedShapes.length === 0) {
        if (typeof addToHistory === 'function') {
            addToHistory('Nothing to paste', 'error');
        }
        return;
    }
    
    // Calculate the center of copied shapes
    let centerX = 0, centerY = 0, count = 0;
    
    window.copiedShapes.forEach(shape => {
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
    if (typeof selectedShapes !== 'undefined') {
        selectedShapes.clear();
    }
    
    // Paste and select the new shapes
    window.copiedShapes.forEach(shape => {
        const newShape = typeof safeDeepCopy === 'function'
            ? safeDeepCopy(shape, {}, 'pasted shape')
            : JSON.parse(JSON.stringify(shape)); // Fallback
        
        if (!newShape || typeof newShape !== 'object') {
            console.error('Failed to paste shape:', shape);
            if (typeof addToHistory === 'function') {
                addToHistory('Warning: Failed to paste one or more shapes', 'warning');
            }
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
        if (typeof currentLayer !== 'undefined') {
            newShape.layer = currentLayer;
        }
        if (typeof currentColor !== 'undefined') {
            newShape.color = currentColor;
        }
        if (typeof currentLineWeight !== 'undefined') {
            newShape.lineWeight = currentLineWeight;
        }
        
        if (typeof shapes !== 'undefined') {
            shapes.push(newShape);
            if (typeof selectedShapes !== 'undefined') {
                selectedShapes.add(shapes.length - 1);
            }
        }
    });
    
    if (typeof addToHistory === 'function') {
        addToHistory(`Pasted ${window.copiedShapes.length} object(s)`);
    }
    
    if (typeof redraw === 'function') {
        redraw();
    }
    
    if (typeof setMode === 'function') {
        setMode('select');
    }
}

// Make functions globally accessible
window.addShape = addShape;
window.deleteSelected = deleteSelected;
window.copySelected = copySelected;
window.pasteShapes = pasteShapes;

// ============================================================================
// SELECTION MANAGEMENT
// ============================================================================
// This module manages object selection operations: clearing, selecting all,
// and selection-related utilities.
// Note: selectedShapes Set is defined in /geometry/primitives.js
// ============================================================================

/**
 * Clear all selected shapes
 */
function clearSelection() {
    const wasSelected = selectedShapes.size > 0;
    selectedShapes.clear();
    
    if (wasSelected && typeof setStatusMessage === 'function') {
        setStatusMessage('Selection cleared');
    }
    
    if (typeof redraw === 'function') {
        redraw();
    }
    
    // Update properties panel if it's open
    const propertiesPanel = document.getElementById('propertiesPanel');
    if (propertiesPanel && propertiesPanel.style.display !== 'none') {
        if (typeof updatePropertiesPanel === 'function') {
            updatePropertiesPanel();
        }
    }
}

/**
 * Select all shapes in the drawing
 */
function selectAll() {
    if (typeof shapes === 'undefined' || !shapes) {
        console.warn('shapes array not available');
        return;
    }
    
    selectedShapes = new Set(shapes.map((_, i) => i));
    
    if (typeof setStatusMessage === 'function') {
        setStatusMessage(`Selected all ${selectedShapes.size} objects`);
    }
    
    if (typeof addToHistory === 'function') {
        addToHistory(`Selected ${selectedShapes.size} objects`);
    }
    
    if (typeof redraw === 'function') {
        redraw();
    }
}

// Make functions globally accessible
window.clearSelection = clearSelection;
window.selectAll = selectAll;

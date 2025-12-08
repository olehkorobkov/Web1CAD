// ============================================================================
// APPLICATION STATE MANAGEMENT
// ============================================================================
// This module manages the global application state, particularly the current
// drawing mode and related state resets when switching between modes.
// ============================================================================

// Current drawing/editing mode
let mode = 'select';

/**
 * Set the current drawing/editing mode and handle all necessary state resets
 * @param {string} m - The new mode to set (select, line, circle, polyline, etc.)
 */
function setMode(m) {
    // Clear all active toolbar buttons
    document.querySelectorAll('.toolbar-button').forEach(btn => {
        btn.classList.remove('active');
    });

    mode = m;
    
    // Open hatch panel when hatch mode is activated
    if (m === 'hatch') {
        if (typeof toggleHatchPanel === 'function') {
            toggleHatchPanel();
        }
        updateHelpBar('Click inside any closed shape to apply hatch pattern');
    }
    
    // Highlight the active tool button
    const toolButtons = {
        'line': 'div[onclick="setMode(\'line\')"]',
        'polyline': 'div[onclick="setMode(\'polyline\')"]',
        'circle': 'div[onclick="setMode(\'circle\')"]',
        'ellipse': 'div[onclick="setMode(\'ellipse\')"]',
        'arc': 'div[onclick="setMode(\'arc\')"]',
        'rectangle': 'div[onclick="setMode(\'rectangle\')"]',
        'spline': 'div[onclick="setMode(\'spline\')"]',
        'hatch': 'div[onclick="setMode(\'hatch\')"]',
        'point': 'div[onclick="setMode(\'point\')"]',
        'text': 'div[onclick="setMode(\'text\')"]',
        'area_to_pdf': 'div[onclick="setMode(\'area_to_pdf\')"]'
    };
    
    // Special handling for polygon mode - highlight the appropriate polygon button
    if (m === 'polygon') {
        if (typeof polygonRadiusType !== 'undefined' && polygonRadiusType === 'inscribed') {
            const inscribedBtn = document.querySelector('div[onclick="setPolygonMode(\'inscribed\')"]');
            if (inscribedBtn) inscribedBtn.classList.add('active');
        } else {
            const circumscribedBtn = document.querySelector('div[onclick="setPolygonMode(\'circumscribed\')"]');
            if (circumscribedBtn) circumscribedBtn.classList.add('active');
        }
    } else if (toolButtons[m]) {
        const activeButton = document.querySelector(toolButtons[m]);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
    
    // Reset drawing state variables (defined in geometry/operations.js)
    if (typeof isDrawing !== 'undefined') isDrawing = false;
    if (typeof previewX !== 'undefined') previewX = undefined;
    if (typeof previewY !== 'undefined') previewY = undefined;
    if (typeof startX !== 'undefined') startX = undefined;
    if (typeof startY !== 'undefined') startY = undefined;
    
    // Reset polyline state
    if (typeof polylinePoints !== 'undefined') polylinePoints = [];
    if (typeof polylinePreviewActive !== 'undefined') polylinePreviewActive = false;
    
    // Reset ellipse drawing state
    if (typeof ellipseDrawingStep !== 'undefined') ellipseDrawingStep = 0;
    if (typeof ellipseCenter !== 'undefined') ellipseCenter = { x: 0, y: 0 };
    if (typeof ellipseMajorRadius !== 'undefined') ellipseMajorRadius = 0;
    if (typeof ellipsePreviewActive !== 'undefined') ellipsePreviewActive = false;
    
    // Reset arc drawing state
    if (typeof arcPoints !== 'undefined') arcPoints = [];
    if (typeof arcDrawingStep !== 'undefined') arcDrawingStep = 0;
    if (typeof arcPreviewActive !== 'undefined') arcPreviewActive = false;
    
    // Reset spline state
    if (typeof splinePoints !== 'undefined') splinePoints = [];
    if (typeof splinePreviewActive !== 'undefined') splinePreviewActive = false;
    if (typeof splineStep !== 'undefined') splineStep = 0;
    if (typeof splineDirection !== 'undefined') splineDirection = { x: 0, y: 0 };
    
    // Reset hatch state
    if (typeof hatchPoints !== 'undefined') hatchPoints = [];
    
    // Reset move state when changing modes (unless switching to move mode)
    if (m !== 'move' && typeof resetMoveMode === 'function') {
        resetMoveMode();
    }
    
    // Reset copy state when changing modes (unless switching to copy mode)
    if (m !== 'copy' && typeof resetCopyMode === 'function') {
        resetCopyMode();
    }
    
    // Hide length input when changing modes
    if (typeof hideLengthInput === 'function') {
        hideLengthInput();
    }
    
    // Initialize area_to_pdf mode
    if (m === 'area_to_pdf') {
        if (typeof areaToPdfMode !== 'undefined') areaToPdfMode = true;
        if (typeof areaToPdfStep !== 'undefined') areaToPdfStep = 0;
        if (typeof areaToPdfStartX !== 'undefined') areaToPdfStartX = null;
        if (typeof areaToPdfStartY !== 'undefined') areaToPdfStartY = null;
        if (typeof areaToPdfEndX !== 'undefined') areaToPdfEndX = null;
        if (typeof areaToPdfEndY !== 'undefined') areaToPdfEndY = null;
        if (typeof stopAreaToPdfBlinking === 'function') {
            stopAreaToPdfBlinking();
        }
    } else if (typeof areaToPdfMode !== 'undefined' && areaToPdfMode) {
        // Reset area_to_pdf mode when switching to other modes
        if (typeof resetAreaToPdfMode === 'function') {
            resetAreaToPdfMode();
        }
    }

    // Set appropriate help message
    const statusMessages = {
        'select': 'Selection mode (default) - Click objects to select, drag to select area',
        'line': 'Step 1/2: Click start point for line',
        'polyline': 'Step 1/?: Click first point for polyline (Escape to finish)',
        'circle': 'Step 1/2: Click center point for circle',
        'ellipse': 'Step 1/3: Click center point for ellipse',
        'arc': 'Step 1/3: Click start point for arc',
        'rectangle': 'Rectangle: Click first corner, then enter Width → Height → Angle (or click second corner)',
        'polygon': 'Step 1/4: Click center point for polygon',
        'spline': 'Step 1/?: Click first point for spline (use double-click or Escape to finish)',
        'hatch': 'Click points to define hatch boundary',
        'point': 'Step 1/?: Click to place point',
        'text': 'Step 1/2: Click to place text',
        'move': 'Step 1/3: Select objects to move',
        'copy': 'Step 1/3: Select objects to copy',
        'rotate': 'Step 1/3: Select objects to rotate',
        'scale': 'Step 1/3: Select objects to scale',
        'area_to_pdf': '📄 Area to PDF: Click first corner to start selecting export region'
    };
    
    if (typeof updateHelpBar === 'function') {
        updateHelpBar(statusMessages[m] || `${m.charAt(0).toUpperCase() + m.slice(1)} mode active`);
    }
    
    if (m === 'select') {
        if (typeof updateHelpBar === 'function') {
            updateHelpBar(statusMessages[m]);
        }
        // No button to highlight for select mode since it's the default
    } else if (m === 'move') {
        // Status message is set by startMoveCommand or move handlers
    } else if (m === 'copy') {
        // Status message is set by startCopyCommand or copy handlers
    } else {
        if (typeof setStatusMessage === 'function') {
            setStatusMessage(`${m.charAt(0).toUpperCase() + m.slice(1)} mode active`);
        }
    }

    // Set the active button only for drawing tools (not select)
    const buttonTitles = {
        'line': 'Line',
        'polyline': 'Polyline',
        'circle': 'Circle',
        'ellipse': 'Ellipse',
        'arc': 'Arc',
        'rectangle': 'Rectangle',
        'polygon': 'Polygon',
        'spline': 'Spline',
        'hatch': 'Hatch',
        'point': 'Point',
        'text': 'Text'
    };

    if (buttonTitles[m]) {
        const button = document.querySelector(`.toolbar-button[title="${buttonTitles[m]}"]`);
        if (button) {
            button.classList.add('active');
        }
    }

    // Redraw to update any visual state changes
    if (typeof redraw === 'function') {
        redraw();
    }
}

// Make mode and setMode globally accessible
window.mode = mode;
window.setMode = setMode;

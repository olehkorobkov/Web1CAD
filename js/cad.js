/*
 * ========================================
 * Web1CAD - Professional 2D CAD System
 * ========================================
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 * 
 * Unauthorized use or distribution is prohibited.
 * If you see this code elsewhere, it was copied.
 * 
 * Contact: [your-email@example.com]
 * License: Proprietary
 * ========================================
 */

// === Command Line Logic ===
const commandInput = document.getElementById('commandInput');
const commandHistoryElement = document.getElementById('commandHistory');
const cursorCoordsElement = document.getElementById('cursorCoords');
const helpBarElement = document.getElementById('helpBar');

// === SAFE UTILITY FUNCTIONS FOR ERROR HANDLING ===
function safeParseFloat(value, defaultValue = 0, paramName = 'number') {
    try {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        
        const parsed = parseFloat(value);
        if (isNaN(parsed) || !isFinite(parsed)) {
            console.warn(`Invalid ${paramName}: "${value}", using default: ${defaultValue}`);
            return defaultValue;
        }
        
        return parsed;
    } catch (error) {
        console.error(`Parse error for ${paramName}:`, error);
        return defaultValue;
    }
}

function safeParseJSON(jsonString, defaultValue = null, context = 'JSON') {
    try {
        if (!jsonString || typeof jsonString !== 'string') {
            console.warn(`Invalid ${context} input, using default`);
            return defaultValue;
        }
        
        return JSON.parse(jsonString);
    } catch (error) {
        console.error(`${context} parse error:`, error.message);
        addToHistory(`${context} parse error: ${error.message}`, 'error');
        return defaultValue;
    }
}

function safeStringify(obj, defaultValue = '{}', context = 'Object') {
    try {
        if (obj === null || obj === undefined) {
            return defaultValue;
        }
        
        return JSON.stringify(obj);
    } catch (error) {
        console.error(`${context} stringify error:`, error.message);
        addToHistory(`${context} stringify error: ${error.message}`, 'error');
        return defaultValue;
    }
}

function safeDeepCopy(obj, defaultValue = null, context = 'Object') {
    try {
        if (obj === null || obj === undefined) {
            return defaultValue;
        }
        
        // Use safe JSON methods for deep copy
        const jsonString = safeStringify(obj, null, context);
        if (jsonString === null) {
            return defaultValue;
        }
        
        return safeParseJSON(jsonString, defaultValue, context + ' copy');
    } catch (error) {
        console.error(`Deep copy error for ${context}:`, error.message);
        return defaultValue;
    }
}

// === Undo/Redo System ===
let undoStack = [];
let redoStack = [];
const MAX_UNDO_STEPS = 50; // Limit undo history to prevent memory issues

function saveState(operationName = 'Unknown Operation') {
    // Create a deep copy of the current state using safe methods
    const state = {
        shapes: safeDeepCopy(shapes, [], 'shapes'),
        selectedShapes: new Set(selectedShapes),
        layers: safeDeepCopy(layers, [], 'layers'),
        currentLayer: currentLayer,
        operationName: operationName,
        timestamp: Date.now()
    };
    
    // Validate state before saving
    if (!Array.isArray(state.shapes) || !Array.isArray(state.layers)) {
        console.error('Failed to create valid state for undo/redo');
        return;
    }
    
    // Add to undo stack
    undoStack.push(state);
    
    // Limit undo stack size
    if (undoStack.length > MAX_UNDO_STEPS) {
        undoStack.shift(); // Remove oldest entry
    }
    
    // Clear redo stack when new operation is performed
    redoStack = [];
    
    // Update UI buttons
    updateUndoRedoButtons();
    
    // Optional: Log state changes for debugging
    // console.log(`State saved: ${operationName} (${state.shapes.length} objects)`);
}

function undo() {
    // Optional: Log undo operations for debugging
    // console.log('Undo called. Stack length:', undoStack.length);
    
    if (undoStack.length === 0) {
        addToHistory('Nothing to undo', 'warning');
        return false;
    }
    
    // Save current state to redo stack before undoing using safe methods
    const currentState = {
        shapes: safeDeepCopy(shapes, [], 'current shapes for redo'),
        selectedShapes: new Set(selectedShapes),
        layers: safeDeepCopy(layers, [], 'current layers for redo'),
        currentLayer: currentLayer,
        operationName: 'Before Undo',
        timestamp: Date.now()
    };
    
    // Validate current state before saving
    if (Array.isArray(currentState.shapes) && Array.isArray(currentState.layers)) {
        redoStack.push(currentState);
    } else {
        console.error('Failed to save current state for redo');
        addToHistory('Warning: Could not save current state for redo', 'warning');
    }
    
    // Restore previous state safely
    const previousState = undoStack.pop();
    let operationName = 'Unknown Operation';
    
    try {
        if (previousState) {
            shapes = safeDeepCopy(previousState.shapes, [], 'undo shapes') || [];
            selectedShapes = new Set(previousState.selectedShapes) || new Set();
            layers = safeDeepCopy(previousState.layers, [], 'undo layers') || [];
            currentLayer = previousState.currentLayer || '0';
            operationName = previousState.operationName || 'Unknown Operation';
        } else {
            console.error('No previous state available for undo');
            addToHistory('Error: No state to undo', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error during undo operation:', error);
        addToHistory('Error: Failed to undo - ' + error.message, 'error');
        return false;
    }
    
    // Update UI
    updateUndoRedoButtons();
    redraw();
    
    addToHistory(`Undone: ${operationName}`);
    updateHelpBar(`Undone: ${operationName}`);
    
    return true;
}

function redo() {
    // Optional: Log redo operations for debugging
    // console.log('Redo called. Stack length:', redoStack.length);
    
    if (redoStack.length === 0) {
        addToHistory('Nothing to redo', 'warning');
        return false;
    }
    
    // Save current state to undo stack before redoing using safe methods
    const currentState = {
        shapes: safeDeepCopy(shapes, [], 'current shapes for undo'),
        selectedShapes: new Set(selectedShapes),
        layers: safeDeepCopy(layers, [], 'current layers for undo'),
        currentLayer: currentLayer,
        operationName: 'Before Redo',
        timestamp: Date.now()
    };
    
    // Validate current state before saving
    if (Array.isArray(currentState.shapes) && Array.isArray(currentState.layers)) {
        undoStack.push(currentState);
    } else {
        console.error('Failed to save current state for undo');
        addToHistory('Warning: Could not save current state for undo', 'warning');
    }
    
    // Restore next state safely
    const nextState = redoStack.pop();
    let operationName = 'Unknown Operation';
    
    try {
        if (nextState) {
            shapes = safeDeepCopy(nextState.shapes, [], 'redo shapes') || [];
            selectedShapes = new Set(nextState.selectedShapes) || new Set();
            layers = safeDeepCopy(nextState.layers, [], 'redo layers') || [];
            currentLayer = nextState.currentLayer || '0';
            operationName = nextState.operationName || 'Unknown Operation';
        } else {
            console.error('No next state available for redo');
            addToHistory('Error: No state to redo', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error during redo operation:', error);
        addToHistory('Error: Failed to redo - ' + error.message, 'error');
        return false;
    }
    
    // Update UI
    updateUndoRedoButtons();
    redraw();
    
    addToHistory(`Redone: ${operationName}`);
    updateHelpBar(`Redone: ${operationName}`);
    
    return true;
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
        undoBtn.disabled = undoStack.length === 0;
        undoBtn.title = undoStack.length > 0 ? 
            `Undo: ${undoStack[undoStack.length - 1].operationName}` : 
            'Nothing to undo';
    }
    
    if (redoBtn) {
        redoBtn.disabled = redoStack.length === 0;
        redoBtn.title = redoStack.length > 0 ? 
            `Redo: ${redoStack[redoStack.length - 1].operationName}` : 
            'Nothing to redo';
    }
}

let isHistoryVisible = false;
const commandHistory = [];
let historyIndex = -1;
let tempCommand = '';

// Help bar functions
function updateHelpBar(message) {
    if (helpBarElement) {
        helpBarElement.textContent = message;
    }
}

// Set initial help bar
document.addEventListener('DOMContentLoaded', function() {
    updateHelpBar('Ready');
    // Initialize undo/redo buttons (both should be disabled initially)
    updateUndoRedoButtons();
    // Ensure select mode is active by default
    setMode('select');
    
    // Initialize layer system
    initializeLayers();
    
    // Validate and upgrade existing shapes for compatibility
    validateAndUpgradeShapes();
    
    // Initialize lineweight display
    const lwtBtn = document.getElementById('lwtBtn');
    if (lwtBtn) {
        lwtBtn.classList.toggle('active', showLineweights);
        lwtBtn.style.backgroundColor = showLineweights ? '#4CAF50' : '';
    }
    
    // Initialize lineweight selector to ByLayer (AutoCAD default)
    setCurrentLineweight('byLayer');
    updateLineweightDisplay();
    
    // Initialize canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Disable wheel scrolling on top toolbar
    const topToolbar = document.querySelector('.top-toolbar');
    if (topToolbar) {
        topToolbar.addEventListener('wheel', function(e) {
            e.preventDefault();
        }, { passive: false });
    }
    
    // Save initial empty state
    saveState('Initial state');
    
    // Add file input handler
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                loadDrawing(file);
            }
            // Reset input
            e.target.value = '';
        });
    }
    
    // Initial redraw
    redraw();
});

// Status message functions
let statusTimeout = null;

function setStatusMessage(message, persistent = false) {
    // Use help bar for status messages
    if (helpBarElement && message) {
        helpBarElement.textContent = message;
        
        // Clear any existing timeout
        if (statusTimeout) {
            clearTimeout(statusTimeout);
            statusTimeout = null;
        }
        
        // Auto-hide non-persistent messages after 3 seconds
        if (!persistent && message !== '') {
            statusTimeout = setTimeout(() => {
                clearStatusMessage();
            }, 3000);
        }
    }
}

function clearStatusMessage() {
    if (helpBarElement) {
        helpBarElement.textContent = 'Ready';
    }
    if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
    }
}

function toggleCommandHistory() {
    isHistoryVisible = !isHistoryVisible;
    commandHistoryElement.style.display = isHistoryVisible ? 'block' : 'none';
    document.querySelector('.command-toggle').textContent = isHistoryVisible ? 'v' : '^';
}

function addToHistory(text, type = 'success') {
    const line = document.createElement('div');
    line.className = `command-${type}`;
    line.textContent = '> ' + text;
    commandHistoryElement.appendChild(line);
    commandHistory.push(text);
    commandHistoryElement.scrollTop = commandHistoryElement.scrollHeight;
}

function handleCommandInput(e) {
    if (e.key === 'Enter') {
        if (this.value.trim() !== '') {
            executeCommand(this.value);
            // Remove duplicate - executeCommand already calls addToHistory
        }
        this.value = '';
        historyIndex = -1;
        tempCommand = '';
    } else if (e.key === 'ArrowUp') {
        if (historyIndex < commandHistory.length - 1) {
            if (historyIndex === -1) tempCommand = this.value;
            historyIndex++;
            this.value = commandHistory[commandHistory.length - 1 - historyIndex];
        }
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        if (historyIndex > 0) {
            historyIndex--;
            this.value = commandHistory[commandHistory.length - 1 - historyIndex];
        } else if (historyIndex === 0) {
            historyIndex = -1;
            this.value = tempCommand;
        }
        e.preventDefault();
    }
}

commandInput.addEventListener('keydown', handleCommandInput);
commandHistoryElement.addEventListener('wheel', (e) => e.stopPropagation());

// === CAD Logic Start ===
const canvas = document.getElementById('cadCanvas');
const ctx = canvas.getContext('2d');
const selectionWindow = document.getElementById('selectionWindow');
const textInputOverlay = document.getElementById('textInputOverlay');
const textInput = document.getElementById('textInput');
const lengthInputOverlay = document.getElementById('lengthInput');
const lengthInput = document.getElementById('lengthValue');
const polygonRadiusTypeSelector = document.getElementById('polygonRadiusTypeSelector');
const polygonInscribedBtn = document.getElementById('polygonInscribedBtn');
const polygonCircumscribedBtn = document.getElementById('polygonCircumscribedBtn');

let mode = 'select'; // Default to select mode
let isDrawing = false;
let startX = 0, startY = 0;
let previewX = 0, previewY = 0;
let currentMouseX = 0, currentMouseY = 0; // Track current mouse position
let shapes = [];
let selectedShapes = new Set();

// Editing state variables
let copiedShapes = []; // Store copied shapes
let rotateCenter = { x: 0, y: 0 };
let rotateStartAngle = 0;
let scaleCenter = { x: 0, y: 0 };
let mirrorLine = null;

// Move operation state
let moveStep = 0; // 0: select objects, 1: select base point, 2: move to destination
let moveBasePoint = { x: 0, y: 0 };
let moveObjectsToMove = new Set();
let movePreviewActive = false;

// Copy operation state
let copyStep = 0; // 0: select objects, 1: select base point, 2: copy to destination
let copyBasePoint = { x: 0, y: 0 };
let copyObjectsToCopy = new Set();
let copyPreviewActive = false;

// Line length input state
let isLengthInputActive = false;
let lineDirection = { x: 0, y: 0 };
let polylineDirection = { x: 0, y: 0 };
let splineDirection = { x: 0, y: 0 };

// Drawing state variables
let polylinePoints = [];
let polylinePreviewActive = false; // Track if preview should be shown
let circleRadius = 0;

// Ellipse drawing variables (circle-like implementation)
let ellipseDrawingStep = 0; // 0: waiting for center, 1: waiting for major radius, 2: waiting for minor radius
let ellipseCenter = { x: 0, y: 0 };
let ellipseMajorRadius = 0;
let ellipsePreviewActive = false;

// Arc drawing variables for 3-click system
let arcPoints = []; // Will store start point, end point
let arcDrawingStep = 0; // 0: waiting for start, 1: waiting for end, 2: waiting for angle
let arcPreviewActive = false;

let rectangleWidth = 0;
let rectangleHeight = 0;
let rectangleStep = 0; // 0: first point, 1: second point/width, 2: height, 3: rotation
let rectangleStartX = 0;
let rectangleStartY = 0;
let rectangleEndX = 0;
let rectangleEndY = 0;
let rectangleAngle = 0;
let polygonSides = 5;
let polygonRadius = 0;
let polygonAngle = 0; // Rotation angle in radians
let polygonStep = 0; // 0: waiting for center, 1: asking for sides, 2: asking for radius type, 3: setting radius and rotation
let polygonCenterX = 0;
let polygonCenterY = 0;
let polygonRadiusType = 'inscribed'; // 'inscribed' or 'circumscribed'
let splinePoints = [];
let splinePreviewActive = false;
let splineStep = 0; // 0 = waiting for points, 1 = show preview
let hatchPoints = [];
let textPosition = { x: 0, y: 0 };

// Double click tracking for polyline
let lastClickTime = 0;
let lastClickX = 0;
let lastClickY = 0;

let showGrid = true;
let orthoMode = false;
let snapEnabled = false;
let objectSnapEnabled = false;

let zoom = 1;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let panStartX = 0, panStartY = 0;
let isMoving = false;
let moveStartX = 0, moveStartY = 0;

let snapMarker = null;

// Layer management - Enhanced AutoCAD-like system
let currentLayer = "0";
let currentColor = "byLayer";
let currentLineWeight = "byLayer"; // Current drawing lineweight
let isTemporaryLineweight = false; // Flag to track if current lineweight is temporary
let currentLinetype = "byLayer"; // Default to byLayer

// AutoCAD LT standard lineweight values (in millimeters)
const LINEWEIGHT_VALUES = [
    { value: 'byLayer', label: 'ByLayer' },
    { value: 0.00, label: '0.00 mm' },
    { value: 0.05, label: '0.05 mm' },
    { value: 0.09, label: '0.09 mm' },
    { value: 0.13, label: '0.13 mm' },
    { value: 0.18, label: '0.18 mm' },
    { value: 0.25, label: '0.25 mm' },
    { value: 0.30, label: '0.30 mm' },
    { value: 0.35, label: '0.35 mm' },
    { value: 0.50, label: '0.50 mm' },
    { value: 0.70, label: '0.70 mm' },
    { value: 1.00, label: '1.00 mm' },
    { value: 1.40, label: '1.40 mm' },
    { value: 2.00, label: '2.00 mm' }
];

// Lineweight display toggle (like AutoCAD's LWT button)
let showLineweights = true;

// Essential CAD line types with distinct, visible patterns
const LINETYPE_PATTERNS = {
    'continuous': [],                           // __________ Solid line
    'dashed': [15, 5],                         // ---- ---- Long dashes
    'dotted': [1, 4],                          // . . . . . Small dots
    'dashdot': [15, 4, 1, 4],                 // ---- . ---- . Dash-dot
    'center': [25, 5, 5, 5]                   // -------- - -------- - Center line
};

const LINETYPE_VALUES = [
    { value: 'byLayer', label: 'ByLayer' },
    { value: 'continuous', label: 'Continuous' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'dashdot', label: 'Dash-Dot' },
    { value: 'center', label: 'Center Line' }
];

/**
 * Create a shape with current layer properties applied
 * @param {Object} shapeData - Shape data object
 * @returns {Object} Shape with properties applied
 */
function createShapeWithProperties(shapeData) {
    return {
        ...shapeData,
        color: currentColor,
        lineWeight: currentLineWeight,
        linetype: currentLinetype,
        layer: currentLayer
    };
}

/**
 * Ensure all shapes have required properties for compatibility
 */
function validateAndUpgradeShapes() {
    shapes.forEach(shape => {
        // Ensure all shapes have linetype property
        if (!shape.linetype) {
            shape.linetype = 'continuous';
        }
        
        // Ensure all shapes have color property
        if (!shape.color) {
            shape.color = '#ffffff';
        }
        
        // Ensure all shapes have lineWeight property
        if (!shape.lineWeight) {
            shape.lineWeight = 0.25;
        }
        
        // Ensure all shapes have layer property
        if (!shape.layer) {
            shape.layer = '0';
        }
    });
}

// Helper function to convert mm to pixels for rendering
function convertMmToPixels(mm) {
    if (mm === 'byLayer' || mm === 0.00) return 1; // Hairline
    const dpi = 96; // Standard screen DPI
    const mmPerInch = 25.4;
    const pixels = (mm / mmPerInch) * dpi;
    return Math.max(1, pixels); // Minimum 1 pixel
}

// Get effective lineweight for a shape
function getEffectiveLineweight(shape) {
    const lineweight = shape.lineWeight || shape.lineweight; // Check both naming conventions
    if (lineweight === 'byLayer' || lineweight === undefined) {
        const layer = layers.find(l => l.name === shape.layer);
        return layer ? layer.lineWeight : 0.25;
    }
    return lineweight;
}

let layers = [
    { name: '0', color: '#ffffff', visible: true, locked: false, lineWeight: 0.25, linetype: 'continuous' }
];

// Initialize layer system
function initializeLayers() {
    // Create default layer if not exists
    if (layers.length === 0) {
        layers.push({
            name: '0',
            visible: true,
            locked: false,
            color: '#ffffff',
            lineWeight: 0.25,
            linetype: 'continuous'
        });
    }
    
    // Set current layer to first available layer
    if (!currentLayer && layers.length > 0) {
        currentLayer = layers[0].name;
    }
    
    // Update UI
    updateLayerSelector();
    updateMinimalLayerPanel();
}

function setCurrentLayer(layerName) {
    currentLayer = layerName;
    // Update current drawing properties from layer
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        currentColor = layer.color;
        currentLineWeight = layer.lineWeight;
        currentLinetype = layer.linetype;
        updateColorDisplay();
        updateLinetypeDisplay();
        redraw(); // Refresh canvas
    }
}

function setCurrentColor(color) {
    currentColor = color;
    
    // Update color select to match current color
    const colorSelect = document.getElementById('colorSelect');
    if (colorSelect) {
        // Try to find matching option, if not found keep current selection
        const matchingOption = Array.from(colorSelect.options).find(option => option.value === color);
        if (matchingOption) {
            colorSelect.value = color;
        }
    }
    
    // Update hidden color picker only for actual colors (not byLayer)
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker && color !== 'byLayer') {
        colorPicker.value = color;
    }
    
    // Don't update layer color when using byLayer mode
    if (color !== 'byLayer') {
        // Update current layer color if not layer "0"
        const layer = layers.find(l => l.name === currentLayer);
        if (layer && layer.name !== '0') {
            layer.color = color;
            redraw();
        }
    }
}

function openColorPalette() {
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.click();
    }
}

function setCurrentLineweight(lineweight) {
    // Ignore Multi selection
    if (lineweight === '*MULTI*') {
        return;
    }
    
    // Clear any Multi display
    clearMultiDisplay();
    
    // Convert string values to numbers for non-byLayer values
    if (lineweight !== 'byLayer') {
        lineweight = parseFloat(lineweight);
    }
    
    // Set current lineweight and mark as user-selected (not temporary)
    currentLineWeight = lineweight;
    isTemporaryLineweight = false;
    
    // Reset lineweight selector to global mode
    const lineweightSelect = document.getElementById('lineweightSelect');
    if (lineweightSelect) {
        lineweightSelect.onchange = function() { setCurrentLineweight(this.value); };
    }
    
    updateLineweightDisplay();
    redraw();
    addToHistory(`Current lineweight set to: ${lineweight === 'byLayer' ? 'ByLayer' : lineweight + ' mm'}`);
}

function toggleLineweightDisplay() {
    showLineweights = !showLineweights;
    const lwtBtn = document.getElementById('lwtBtn');
    if (lwtBtn) {
        if (showLineweights) {
            lwtBtn.classList.add('active');
        } else {
            lwtBtn.classList.remove('active');
        }
    }
    redraw();
    addToHistory(`Lineweight display ${showLineweights ? 'enabled' : 'disabled'}`);
}

function updateLineweightDisplay() {
    const lineweightSelect = document.getElementById('lineweightSelect');
    if (lineweightSelect) {
        // Show current lineweight or ByLayer if not temporary
        if (isTemporaryLineweight && currentLineWeight !== 'byLayer') {
            lineweightSelect.value = currentLineWeight;
        } else {
            lineweightSelect.value = 'byLayer';
        }
    }
    
    // Update LWT button state
    const lwtBtn = document.getElementById('lwtBtn');
    if (lwtBtn) {
        if (showLineweights) {
            lwtBtn.classList.add('active');
        } else {
            lwtBtn.classList.remove('active');
        }
    }
}

/**
 * Update lineweight selector based on selected object(s)
 */
function updateLineweightSelectorForSelection(selection) {
    const lineweightSelect = document.getElementById('lineweightSelect');
    if (!lineweightSelect) return;
    
    // Remove any existing Multi display
    clearMultiDisplay();
    
    if (!selection) {
        // No selection - show current lineweight or ByLayer if not temporary
        if (isTemporaryLineweight && currentLineWeight !== 'byLayer') {
            lineweightSelect.value = currentLineWeight;
        } else {
            lineweightSelect.value = 'byLayer';
        }
        lineweightSelect.onchange = function() { setCurrentLineweight(this.value); };
        return;
    }
    
    if (Array.isArray(selection)) {
        // Multiple objects selected
        const lineweights = selection.map(shape => shape.lineWeight || shape.lineweight || 'byLayer');
        const firstLineweight = lineweights[0];
        const allSame = lineweights.every(lw => lw === firstLineweight);
        
        if (allSame) {
            // All objects have the same lineweight
            lineweightSelect.value = firstLineweight;
        } else {
            // Different lineweights - show Multi with custom display
            showMultiDisplay();
        }
        
        // Set onchange to update all selected objects
        lineweightSelect.onchange = function() {
            if (this.value !== '*MULTI*') {
                clearMultiDisplay();
                updateMultipleShapesProperty('lineWeight', this.value);
            }
        };
    } else {
        // Single object selected
        const objectLineweight = selection.lineWeight || selection.lineweight || 'byLayer';
        
        // Convert to string for proper comparison with select options
        let selectValue = objectLineweight;
        if (typeof objectLineweight === 'number') {
            selectValue = objectLineweight.toFixed(2);
        }
        
        lineweightSelect.value = selectValue;
        
        // If value wasn't found, try the original value
        if (lineweightSelect.value !== selectValue) {
            lineweightSelect.value = objectLineweight;
        }
        
        // Set onchange to update the selected object
        lineweightSelect.onchange = function() {
            if (selectedShapes.size === 1) {
                const shapeIndex = Array.from(selectedShapes)[0];
                updateShapeProperty(shapeIndex, 'lineWeight', this.value);
            }
        };
    }
}

/**
 * Show Multi display without adding option to dropdown
 */
function showMultiDisplay() {
    const lineweightSelect = document.getElementById('lineweightSelect');
    if (!lineweightSelect) return;
    
    // Create and insert a temporary Multi option at the top
    const multiOption = document.createElement('option');
    multiOption.value = '*MULTI*';
    multiOption.textContent = '*Multi*';
    multiOption.selected = true;
    multiOption.id = 'multiOption';
    
    // Insert at the beginning
    lineweightSelect.insertBefore(multiOption, lineweightSelect.firstChild);
    lineweightSelect.value = '*MULTI*';
}

/**
 * Remove Multi display
 */
function clearMultiDisplay() {
    const multiOption = document.getElementById('multiOption');
    if (multiOption) {
        multiOption.remove();
    }
}

function setCurrentLinetype(linetype) {
    currentLinetype = linetype;
    updateLinetypeDisplay();
    addToHistory(`Current linetype set to: ${linetype === 'byLayer' ? 'ByLayer' : linetype}`);
}

function updateLinetypeDisplay() {
    const linetypeSelect = document.getElementById('linetypeSelect');
    if (linetypeSelect) {
        linetypeSelect.value = currentLinetype;
    }
}

function showLinetypePreview() {
    // Create a modal window to show line type previews
    const existingModal = document.getElementById('linetypePreviewModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'linetypePreviewModal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2a2a2a;
        border: 2px solid #555;
        border-radius: 8px;
        padding: 20px;
        z-index: 1000;
        width: 400px;
        max-height: 500px;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="color: #fff; margin: 0;">Line Type Preview</h3>
            <button onclick="document.getElementById('linetypePreviewModal').remove()" 
                    style="background: #555; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">×</button>
        </div>
        <div style="color: #ccc; margin-bottom: 15px;">Click a line type to select it:</div>
    `;
    
    // Create canvas previews for each line type
    LINETYPE_VALUES.forEach(linetype => {
        if (linetype.value === 'byLayer') return;
        
        const canvasId = `preview_${linetype.value}`;
        html += `
            <div style="margin-bottom: 10px; padding: 8px; border: 1px solid #444; border-radius: 4px; cursor: pointer; background: #333;" 
                 onclick="setCurrentLinetype('${linetype.value}'); document.getElementById('linetypePreviewModal').remove();"
                 onmouseover="this.style.background='#444'" 
                 onmouseout="this.style.background='#333'">
                <div style="color: #fff; font-size: 12px; margin-bottom: 5px;">${linetype.label}</div>
                <canvas id="${canvasId}" width="350" height="20" style="background: #222; border-radius: 2px;"></canvas>
            </div>
        `;
    });
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    // Draw line type previews on canvases
    setTimeout(() => {
        LINETYPE_VALUES.forEach(linetype => {
            if (linetype.value === 'byLayer') return;
            
            const canvas = document.getElementById(`preview_${linetype.value}`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const pattern = LINETYPE_PATTERNS[linetype.value] || [];
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.setLineDash(pattern);
                ctx.lineCap = 'round';
                
                ctx.beginPath();
                ctx.moveTo(10, 10);
                ctx.lineTo(340, 10);
                ctx.stroke();
                
                // Reset for next draw
                ctx.setLineDash([]);
            }
        });
    }, 100);
    
    addToHistory('Line type preview opened');
}

function setCurrentLineWeight(weight) {
    currentLineWeight = safeParseFloat(weight, 1, 'line weight');
    // Update current layer line weight if not default
    const layer = layers.find(l => l.name === currentLayer);
    if (layer && layer.name !== 'Default') {
        layer.lineWeight = currentLineWeight;
        redraw();
    }
}

// === LAYER MANAGEMENT FUNCTIONS ===

/**
 * Create a new layer with specified properties
 * @param {string} name - Layer name
 * @param {string} color - Layer color (hex)
 * @param {boolean} visible - Layer visibility
 * @param {boolean} locked - Layer lock status
 * @returns {boolean} Success status
 */
function createNewLayer(name = null, color = '#ffffff', visible = true, locked = false) {
    if (!name) {
        name = prompt("Enter new layer name:");
        if (!name) return false;
    }
    
    // Check if layer already exists
    if (layers.some(l => l.name === name)) {
        addToHistory(`Error: Layer "${name}" already exists`, 'error');
        return false;
    }
    
    const newLayer = {
        name: name,
        color: color,
        visible: visible,
        locked: locked,
        lineWeight: 1.0,
        linetype: 'continuous'
    };
    
    layers.push(newLayer);
    currentLayer = name; // Auto-select newly created layer
    updateLayerSelector();
    updateMinimalLayerPanel();
    addToHistory(`Created layer: ${name}`);
    return true;
}

/**
 * Show the new layer creation form
 */
function showNewLayerForm() {
    const form = document.getElementById('newLayerForm');
    const input = document.getElementById('newLayerNameInput');
    const button = document.querySelector('.add-layer-btn');
    
    // Hide the add button and show the form
    button.style.display = 'none';
    form.style.display = 'block';
    
    // Focus the input and clear any previous value
    input.value = '';
    input.focus();
    
    // Add enter key support
    input.onkeypress = function(e) {
        if (e.key === 'Enter') {
            confirmNewLayer();
        } else if (e.key === 'Escape') {
            cancelNewLayer();
        }
    };
}

/**
 * Confirm and create the new layer
 */
function confirmNewLayer() {
    const input = document.getElementById('newLayerNameInput');
    const name = input.value.trim();
    
    if (!name) {
        // If empty, just cancel
        cancelNewLayer();
        return;
    }
    
    // Check if layer already exists
    if (layers.some(l => l.name === name)) {
        // Show error styling
        input.style.borderColor = '#f44336';
        input.style.background = '#3a2222';
        addToHistory(`Error: Layer "${name}" already exists`, 'error');
        
        // Reset styling after a moment
        setTimeout(() => {
            input.style.borderColor = '#555';
            input.style.background = '#333';
        }, 2000);
        
        input.select(); // Select text for easy correction
        return;
    }
    
    // Create the layer
    const success = createNewLayer(name);
    if (success) {
        hideNewLayerForm();
    }
}

/**
 * Cancel new layer creation
 */
function cancelNewLayer() {
    hideNewLayerForm();
}

/**
 * Hide the new layer creation form
 */
function hideNewLayerForm() {
    const form = document.getElementById('newLayerForm');
    const button = document.querySelector('.add-layer-btn');
    
    // Hide the form and show the add button
    form.style.display = 'none';
    button.style.display = 'block';
    
    // Clear the input
    document.getElementById('newLayerNameInput').value = '';
}

/**
 * Delete a layer and reassign shapes to Default
 * @param {string} layerName - Layer to delete
 * @returns {boolean} Success status
 */
function deleteLayer(layerName) {
    if (layerName === '0') {
        addToHistory('Error: Cannot delete layer "0"', 'error');
        return false;
    }
    
    const layerIndex = layers.findIndex(l => l.name === layerName);
    if (layerIndex === -1) {
        addToHistory(`Error: Layer "${layerName}" not found`, 'error');
        return false;
    }
    
    // Reassign all shapes from this layer to layer "0"
    let reassignedCount = 0;
    shapes.forEach(shape => {
        if (shape.layer === layerName) {
            shape.layer = '0';
            reassignedCount++;
        }
    });
    
    // Remove layer
    layers.splice(layerIndex, 1);
    
    // Update current layer if it was deleted
    if (currentLayer === layerName) {
        setCurrentLayer('0');
    }
    
    updateLayerSelector();
    updateMinimalLayerPanel();
    redraw();
    addToHistory(`Deleted layer: ${layerName} (${reassignedCount} shapes moved to layer "0")`);
    return true;
}

/**
 * Rename a layer
 * @param {string} oldName - Current layer name
 * @param {string} newName - New layer name
 * @returns {boolean} Success status
 */
function renameLayer(oldName, newName = null) {
    if (oldName === 'Default') {
        addToHistory('Error: Cannot rename Default layer', 'error');
        return false;
    }
    
    if (!newName) {
        newName = prompt(`Rename layer "${oldName}" to:`, oldName);
        if (!newName || newName === oldName) return false;
    }
    
    // Check if new name already exists
    if (layers.some(l => l.name === newName)) {
        addToHistory(`Error: Layer "${newName}" already exists`, 'error');
        return false;
    }
    
    const layer = layers.find(l => l.name === oldName);
    if (!layer) {
        addToHistory(`Error: Layer "${oldName}" not found`, 'error');
        return false;
    }
    
    // Update layer name
    layer.name = newName;
    
    // Update all shapes using this layer
    shapes.forEach(shape => {
        if (shape.layer === oldName) {
            shape.layer = newName;
        }
    });
    
    // Update current layer if it was renamed
    if (currentLayer === oldName) {
        currentLayer = newName;
    }
    
    updateLayerSelector();
    updateMinimalLayerPanel();
    addToHistory(`Renamed layer: ${oldName} → ${newName}`);
    return true;
}

/**
 * Toggle layer visibility
 * @param {string} layerName - Layer to toggle
 */
function toggleLayerVisibility(layerName) {
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        layer.visible = !layer.visible;
        updateMinimalLayerPanel();
        redraw();
        addToHistory(`${layer.visible ? 'Showed' : 'Hidden'} layer: ${layerName}`);
    }
}

/**
 * Toggle layer lock status
 * @param {string} layerName - Layer to toggle
 */
function toggleLayerLock(layerName) {
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        layer.locked = !layer.locked;
        updateMinimalLayerPanel();
        redraw();
        addToHistory(`${layer.locked ? 'Locked' : 'Unlocked'} layer: ${layerName}`);
    }
}

/**
 * Set layer color
 * @param {string} layerName - Layer to modify
 * @param {string} color - New color (hex)
 */
function setLayerColor(layerName, color) {
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        layer.color = color;
        updateMinimalLayerPanel();
        redraw();
        addToHistory(`Changed color of layer ${layerName} to ${color}`);
    }
}

/**
 * Set layer lineweight
 * @param {string} layerName - Layer to modify
 * @param {string|number} lineWeight - New lineweight
 */
function setLayerLineweight(layerName, lineWeight) {
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        layer.lineWeight = parseFloat(lineWeight);
        updateMinimalLayerPanel();
        redraw();
        addToHistory(`Changed lineweight of layer ${layerName} to ${lineWeight}`);
    }
}

/**
 * Set layer linetype
 * @param {string} layerName - Layer to modify
 * @param {string} linetype - New linetype
 */
function setLayerLinetype(layerName, linetype) {
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        layer.linetype = linetype;
        updateMinimalLayerPanel();
        redraw();
        addToHistory(`Changed linetype of layer ${layerName} to ${linetype}`);
    }
}

/**
 * Get layer properties for a shape
 * @param {Object} shape - Shape object
 * @returns {Object} Layer object or Default layer
 */
function getShapeLayer(shape) {
    const layerName = shape.layer || 'Default';
    return layers.find(l => l.name === layerName) || layers.find(l => l.name === 'Default');
}

/**
 * Check if shape should be rendered (layer visibility)
 * @param {Object} shape - Shape object
 * @returns {boolean} Should render
 */
function shouldRenderShape(shape) {
    const layer = getShapeLayer(shape);
    return layer && layer.visible;
}

/**
 * Check if shape can be selected/modified (layer lock)
 * @param {Object} shape - Shape object
 * @returns {boolean} Can be modified
 */
function canModifyShape(shape) {
    const layer = getShapeLayer(shape);
    return layer && !layer.locked;
}

/**
 * Update the layer selector dropdown
 */
function updateLayerSelector() {
    const layerSelect = document.getElementById('layerSelect');
    if (!layerSelect) return;
    
    layerSelect.innerHTML = '';
    layers.forEach(layer => {
        const option = document.createElement('option');
        option.value = layer.name;
        option.textContent = layer.name;
        option.selected = layer.name === currentLayer;
        layerSelect.appendChild(option);
    });
}

/**
 * Update the layer management panel
 */


/**
 * Update color display in UI
 */
function updateColorDisplay() {
    // Update color select
    const colorSelect = document.getElementById('colorSelect');
    if (colorSelect) {
        const matchingOption = Array.from(colorSelect.options).find(option => option.value === currentColor);
        if (matchingOption) {
            colorSelect.value = currentColor;
        }
    }
    
    // Update hidden color picker only for actual colors (not byLayer)
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker && currentColor !== 'byLayer') {
        colorPicker.value = currentColor;
    }
}

/**
 * Toggle layer panel visibility
 */
/**
 * Toggle layer panel visibility
 */
function toggleLayerPanel() {
    const panel = document.getElementById('layerPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        updateMinimalLayerPanel();
        initDragLayer();
    } else {
        panel.style.display = 'none';
    }
}

/**
 * Initialize draggable functionality for layer panel
 */
function initDragLayer() {
    const panel = document.getElementById('layerPanel');
    const header = document.getElementById('layerPanelHeader');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    
    // Set initial position based on current CSS position
    const rect = panel.getBoundingClientRect();
    let panelX = rect.left;
    let panelY = rect.top;

    header.addEventListener('mousedown', function(e) {
        // Don't start dragging if clicking on a button
        if (e.target.tagName === 'BUTTON') {
            return;
        }
        if (e.target === header || e.target.tagName === 'SPAN') {
            isDragging = true;
            header.style.cursor = 'grabbing';
            
            // Get current panel position
            const rect = panel.getBoundingClientRect();
            panelX = rect.left;
            panelY = rect.top;
            
            // Calculate offset from mouse to panel corner
            initialX = e.clientX - panelX;
            initialY = e.clientY - panelY;
            
            // Convert to fixed positioning for free movement
            panel.style.position = 'fixed';
            panel.style.top = panelY + 'px';
            panel.style.left = panelX + 'px';
            panel.style.right = 'auto';
            panel.style.transform = 'none';
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            e.preventDefault();
            
            // Calculate new position
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            // Constrain to viewport
            const panelRect = panel.getBoundingClientRect();
            const maxX = window.innerWidth - panelRect.width;
            const maxY = window.innerHeight - panelRect.height;
            
            currentX = Math.max(0, Math.min(maxX, currentX));
            currentY = Math.max(0, Math.min(maxY, currentY));

            // Apply new position
            panel.style.left = currentX + 'px';
            panel.style.top = currentY + 'px';
            
            // Update stored position
            panelX = currentX;
            panelY = currentY;
        }
    });

    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
        }
    });
}

/**
 * Update minimal layer panel
 */
function updateMinimalLayerPanel() {
    const layerList = document.getElementById('layerList');
    if (!layerList) return;
    
    layerList.innerHTML = ''; // Clear existing content

    layers.forEach(layer => {
        const div = document.createElement('div');
        div.className = 'layer-item';

        div.innerHTML = `
            <input type="radio" name="activeLayer" ${layer.name === currentLayer ? 'checked' : ''} onchange="setCurrentLayer('${layer.name}')">
            <span class="layer-name">${layer.name}</span>
            <button onclick="toggleLayerVisibility('${layer.name}')">${layer.visible ? '👁' : '🚫'}</button>
            <button onclick="toggleLayerLock('${layer.name}')">${layer.locked ? '🔒' : '🔓'}</button>
            <input type="color" value="${layer.color}" onchange="setLayerColor('${layer.name}', this.value)">
            <select onchange="setLayerLineweight('${layer.name}', this.value)">
                <option value="0.00"${layer.lineWeight === 0.00 ? ' selected' : ''}>0.00</option>
                <option value="0.05"${layer.lineWeight === 0.05 ? ' selected' : ''}>0.05</option>
                <option value="0.09"${layer.lineWeight === 0.09 ? ' selected' : ''}>0.09</option>
                <option value="0.13"${layer.lineWeight === 0.13 ? ' selected' : ''}>0.13</option>
                <option value="0.18"${layer.lineWeight === 0.18 ? ' selected' : ''}>0.18</option>
                <option value="0.25"${layer.lineWeight === 0.25 ? ' selected' : ''}>0.25</option>
                <option value="0.30"${layer.lineWeight === 0.30 ? ' selected' : ''}>0.30</option>
                <option value="0.35"${layer.lineWeight === 0.35 ? ' selected' : ''}>0.35</option>
                <option value="0.50"${layer.lineWeight === 0.50 ? ' selected' : ''}>0.50</option>
                <option value="0.70"${layer.lineWeight === 0.70 ? ' selected' : ''}>0.70</option>
                <option value="1.00"${layer.lineWeight === 1.00 ? ' selected' : ''}>1.00</option>
                <option value="1.40"${layer.lineWeight === 1.40 ? ' selected' : ''}>1.40</option>
                <option value="2.00"${layer.lineWeight === 2.00 ? ' selected' : ''}>2.00</option>
            </select>
            <select onchange="setLayerLinetype('${layer.name}', this.value)">
                <option value="continuous"${layer.linetype === 'continuous' ? ' selected' : ''}>Continuous</option>
                <option value="dashed"${layer.linetype === 'dashed' ? ' selected' : ''}>Dashed</option>
                <option value="dotted"${layer.linetype === 'dotted' ? ' selected' : ''}>Dotted</option>
                <option value="dashdot"${layer.linetype === 'dashdot' ? ' selected' : ''}>Dash-Dot</option>
                <option value="center"${layer.linetype === 'center' ? ' selected' : ''}>Center Line</option>
            </select>
            ${layer.name !== '0' ? `<button onclick="deleteLayer('${layer.name}')">X</button>` : ''}
        `;

        layerList.appendChild(div);
    });
}

// Function to zoom to fit all objects - OPTIMIZED with Unified Shape Handler
function zoomToFit() {
    if (shapes.length === 0) {
        // If no shapes, reset to default view
        zoom = 1;
        offsetX = 0;
        offsetY = 0;
        return;
    }

    // Find the bounding box of all shapes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    shapes.forEach(shape => {
        // Use optimized unified handler if available
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
                minY = Math.min(minY, shape.y1, shape.y2);
                maxX = Math.max(maxX, shape.x1, shape.x2);
                maxY = Math.max(maxY, shape.y1, shape.y2);
                break;
            case 'polyline':
            case 'spline':
            case 'hatch':
                shape.points.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                break;
            case 'circle':
                minX = Math.min(minX, shape.cx - shape.radius);
                minY = Math.min(minY, shape.cy - shape.radius);
                maxX = Math.max(maxX, shape.cx + shape.radius);
                maxY = Math.max(maxY, shape.cy + shape.radius);
                break;
            case 'ellipse':
                // Calculate ellipse bounds considering rotation
                if (shape.rotation && shape.rotation !== 0) {
                    // For rotated ellipse, calculate more accurate bounds
                    const cos = Math.cos(shape.rotation);
                    const sin = Math.sin(shape.rotation);
                    const a = shape.rx;
                    const b = shape.ry;
                    
                    // Calculate extent in x and y directions
                    const extentX = Math.sqrt(a * a * cos * cos + b * b * sin * sin);
                    const extentY = Math.sqrt(a * a * sin * sin + b * b * cos * cos);
                    
                    minX = Math.min(minX, shape.cx - extentX);
                    minY = Math.min(minY, shape.cy - extentY);
                    maxX = Math.max(maxX, shape.cx + extentX);
                    maxY = Math.max(maxY, shape.cy + extentY);
                } else {
                    // Simple axis-aligned ellipse
                    minX = Math.min(minX, shape.cx - shape.rx);
                    minY = Math.min(minY, shape.cy - shape.ry);
                    maxX = Math.max(maxX, shape.cx + shape.rx);
                    maxY = Math.max(maxY, shape.cy + shape.ry);
                }
                break;
            case 'arc':
                // Approximate arc with its bounding box
                const arcPoints = [];
                for (let angle = shape.startAngle; angle <= shape.endAngle; angle += 0.1) {
                    arcPoints.push({
                        x: shape.cx + shape.radius * Math.cos(angle),
                        y: shape.cy + shape.radius * Math.sin(angle)
                    });
                }
                arcPoints.push({ x: shape.cx, y: shape.cy }); // Include center
                arcPoints.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                break;
            case 'polygon':
                shape.points.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                break;
            case 'point':
                minX = Math.min(minX, shape.x);
                minY = Math.min(minY, shape.y);
                maxX = Math.max(maxX, shape.x);
                maxY = Math.max(maxY, shape.y);
                break;
            case 'text':
                minX = Math.min(minX, shape.x);
                minY = Math.min(minY, shape.y);
                maxX = Math.max(maxX, shape.x);
                maxY = Math.max(maxY, shape.y);
                break;
        }
    });

    // Add some padding around the drawing
    const padding = 20;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Calculate the required zoom level to fit everything
    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    const canvasRatio = canvas.width / canvas.height;
    const drawingRatio = drawingWidth / drawingHeight;

    if (drawingRatio > canvasRatio) {
        // Fit to width
        zoom = canvas.width / drawingWidth;
    } else {
        // Fit to height
        zoom = canvas.height / drawingHeight;
    }

    // Center the drawing
    offsetX = canvas.width / 2 - (minX + drawingWidth / 2) * zoom;
    offsetY = canvas.height / 2 - (minY + drawingHeight / 2) * zoom;

    addToHistory('Zoomed to fit all objects');
}

// === PROPERTIES PANEL FUNCTIONS ===

/**
 * Toggle properties panel visibility
 */
function togglePropertiesPanel() {
    const panel = document.getElementById('propertiesPanel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        updatePropertiesPanel();
        initDragProperties();
    } else {
        panel.style.display = 'none';
    }
}

/**
 * Initialize draggable functionality for properties panel
 */
function initDragProperties() {
    const panel = document.getElementById('propertiesPanel');
    const header = document.getElementById('propertiesHeader');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    
    const rect = panel.getBoundingClientRect();
    let panelX = rect.left;
    let panelY = rect.top;
    
    header.addEventListener('mousedown', (e) => {
        // Don't start dragging if clicking on a button
        if (e.target.tagName === 'BUTTON') {
            return;
        }
        isDragging = true;
        panel.classList.add('dragging');
        initialX = e.clientX - panelX;
        initialY = e.clientY - panelY;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            panelX = currentX;
            panelY = currentY;
            panel.style.position = 'fixed';
            panel.style.left = currentX + 'px';
            panel.style.top = currentY + 'px';
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.classList.remove('dragging');
        }
    });
}

/**
 * Update properties panel content based on selected objects
 */
function updatePropertiesPanel() {
    const content = document.getElementById('propertiesContent');
    if (!content) return;
    
    if (selectedShapes.size === 0) {
        content.innerHTML = '<div class="no-selection">No object selected</div>';
        // Reset lineweight selector to current global setting
        clearMultiDisplay(); // Clear any Multi display
        updateLineweightSelectorForSelection(null);
        return;
    }
    
    if (selectedShapes.size === 1) {
        // Single object selected - show detailed properties
        const shapeIndex = Array.from(selectedShapes)[0];
        const shape = shapes[shapeIndex];
        content.innerHTML = generateSingleObjectProperties(shape, shapeIndex);
        // Update lineweight selector to show selected object's lineweight
        updateLineweightSelectorForSelection(shape);
    } else {
        // Multiple objects selected - show common properties
        content.innerHTML = generateMultipleObjectProperties();
        // Update lineweight selector for multiple selection
        const selectedObjects = Array.from(selectedShapes).map(i => shapes[i]);
        updateLineweightSelectorForSelection(selectedObjects);
    }
}

/**
 * Calculate area of a shape
 */
function calculateShapeArea(shape) {
    // OPTIMIZED with Unified Shape Handler
    if (window.shapeHandler) {
        const area = window.shapeHandler.execute('area', shape.type, shape);
        if (area !== null && area !== undefined) {
            return area;
        }
    }
    
    // Fallback to original implementation for compatibility
    switch (shape.type) {
        case 'circle':
            return Math.PI * shape.radius * shape.radius;
            
        case 'ellipse':
            return Math.PI * shape.rx * shape.ry;
            
        case 'polygon':
            if (!shape.points || shape.points.length < 3) return 0;
            // Calculate area using shoelace formula
            let area = 0;
            for (let i = 0; i < shape.points.length; i++) {
                const j = (i + 1) % shape.points.length;
                area += shape.points[i].x * shape.points[j].y;
                area -= shape.points[j].x * shape.points[i].y;
            }
            return Math.abs(area) / 2;
            
        case 'rectangle':
            if (shape.points && shape.points.length >= 4) {
                // If rectangle is defined by points, use shoelace formula
                let area = 0;
                for (let i = 0; i < 4; i++) {
                    const j = (i + 1) % 4;
                    area += shape.points[i].x * shape.points[j].y;
                    area -= shape.points[j].x * shape.points[i].y;
                }
                return Math.abs(area) / 2;
            } else if (shape.width && shape.height) {
                // If rectangle has width and height properties
                return Math.abs(shape.width * shape.height);
            }
            return 0;
            
        case 'polyline':
            // Polyline area only if it's closed (first and last points are the same or very close)
            if (!shape.points || shape.points.length < 3) return 0;
            
            const firstPoint = shape.points[0];
            const lastPoint = shape.points[shape.points.length - 1];
            const distance = Math.sqrt(
                Math.pow(lastPoint.x - firstPoint.x, 2) + 
                Math.pow(lastPoint.y - firstPoint.y, 2)
            );
            
            // Consider closed if distance between first and last point is less than 1 unit
            if (distance < 1.0) {
                let polylineArea = 0;
                for (let i = 0; i < shape.points.length - 1; i++) {
                    const j = (i + 1) % (shape.points.length - 1);
                    polylineArea += shape.points[i].x * shape.points[j].y;
                    polylineArea -= shape.points[j].x * shape.points[i].y;
                }
                return Math.abs(polylineArea) / 2;
            }
            return 0; // Open polyline has no area
            
        case 'arc':
            // Arcs are open curves - no area
            return 0;
            
        case 'hatch':
            // Similar to polygon
            if (!shape.points || shape.points.length < 3) return 0;
            let hatchArea = 0;
            for (let i = 0; i < shape.points.length; i++) {
                const j = (i + 1) % shape.points.length;
                hatchArea += shape.points[i].x * shape.points[j].y;
                hatchArea -= shape.points[j].x * shape.points[i].y;
            }
            return Math.abs(hatchArea) / 2;
            
        case 'line':
        case 'point':
        case 'text':
        case 'spline':
        default:
            return 0; // These shapes don't have meaningful area
    }
}

/**
 * Generate properties HTML for a single object
 */
function generateSingleObjectProperties(shape, index) {
    let html = '<div class="properties-list">';
    
    // General properties
    html += '<div class="property-group">';
    html += '<div class="property-group-title">General</div>';
    html += `<div class="property-row">
        <div class="property-label">Type:</div>
        <div class="property-value">
            <input type="text" class="property-readonly" value="${shape.type}" readonly>
        </div>
    </div>`;
    html += `<div class="property-row">
        <div class="property-label">Layer:</div>
        <div class="property-value">
            <select class="property-select" onchange="updateShapeProperty(${index}, 'layer', this.value)">
                ${layers.map(layer => 
                    `<option value="${layer.name}" ${shape.layer === layer.name ? 'selected' : ''}>${layer.name}</option>`
                ).join('')}
            </select>
        </div>
    </div>`;
    html += `<div class="property-row">
        <div class="property-label">Color:</div>
        <div class="property-value">
            <select class="property-select" onchange="updateShapeProperty(${index}, 'color', this.value)">
                <option value="byLayer" ${shape.color === 'byLayer' ? 'selected' : ''}>ByLayer</option>
                <option value="#ffffff" ${shape.color === '#ffffff' ? 'selected' : ''}>White</option>
                <option value="#ff0000" ${shape.color === '#ff0000' ? 'selected' : ''}>Red</option>
                <option value="#00ff00" ${shape.color === '#00ff00' ? 'selected' : ''}>Green</option>
                <option value="#0000ff" ${shape.color === '#0000ff' ? 'selected' : ''}>Blue</option>
                <option value="#ffff00" ${shape.color === '#ffff00' ? 'selected' : ''}>Yellow</option>
                <option value="#ff00ff" ${shape.color === '#ff00ff' ? 'selected' : ''}>Magenta</option>
                <option value="#00ffff" ${shape.color === '#00ffff' ? 'selected' : ''}>Cyan</option>
            </select>
        </div>
    </div>`;
    html += `<div class="property-row">
        <div class="property-label">Lineweight:</div>
        <div class="property-value">
            <select class="property-select" onchange="updateShapeProperty(${index}, 'lineWeight', this.value)">
                <option value="byLayer" ${shape.lineWeight === 'byLayer' ? 'selected' : ''}>ByLayer</option>
                ${LINEWEIGHT_VALUES.slice(1).map(lw => 
                    `<option value="${lw.value}" ${shape.lineWeight == lw.value ? 'selected' : ''}>${lw.label}</option>`
                ).join('')}
            </select>
        </div>
    </div>`;
    html += `<div class="property-row">
        <div class="property-label">Linetype:</div>
        <div class="property-value">
            <select class="property-select" onchange="updateShapeProperty(${index}, 'linetype', this.value)">
                ${LINETYPE_VALUES.map(lt => 
                    `<option value="${lt.value}" ${shape.linetype === lt.value ? 'selected' : ''}>${lt.label}</option>`
                ).join('')}
            </select>
        </div>
    </div>`;
    html += '</div>';
    
    // Geometry properties based on shape type
    html += '<div class="property-group">';
    html += '<div class="property-group-title">Geometry</div>';
    
    switch (shape.type) {
        case 'line':
            html += `<div class="property-row">
                <div class="property-label">Start X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.x1.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'x1', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Start Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.y1.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'y1', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">End X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.x2.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'x2', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">End Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.y2.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'y2', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            const length = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
            html += `<div class="property-row">
                <div class="property-label">Length:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${length.toFixed(2)}" readonly>
                </div>
            </div>`;
            // Lines don't have area - skip area display
            break;
            
        case 'circle':
            html += `<div class="property-row">
                <div class="property-label">Center X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cx.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cx', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Center Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cy.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cy', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Radius:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.radius.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'radius', parseFloat(this.value))" step="0.01" min="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Area:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${(Math.PI * shape.radius * shape.radius).toFixed(2)}" readonly>
                </div>
            </div>`;
            break;
            
        case 'ellipse':
            html += `<div class="property-row">
                <div class="property-label">Center X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cx.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cx', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Center Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cy.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cy', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Major Radius:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.rx.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'rx', Math.max(0.01, parseFloat(this.value)))" step="0.01" min="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Minor Radius:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.ry.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'ry', Math.max(0.01, parseFloat(this.value)))" step="0.01" min="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Rotation:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${(shape.rotation || 0).toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'rotation', parseFloat(this.value))" step="0.1">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Area:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${(Math.PI * shape.rx * shape.ry).toFixed(2)}" readonly>
                </div>
            </div>`;
            break;
            
        case 'arc':
            html += `<div class="property-row">
                <div class="property-label">Center X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cx.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cx', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Center Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cy.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cy', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Radius:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.radius.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'radius', parseFloat(this.value))" step="0.01" min="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Start Angle:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${(shape.startAngle * 180 / Math.PI).toFixed(1)}" 
                           onchange="updateShapeGeometry(${index}, 'startAngle', parseFloat(this.value) * Math.PI / 180)" step="1">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">End Angle:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${(shape.endAngle * 180 / Math.PI).toFixed(1)}" 
                           onchange="updateShapeGeometry(${index}, 'endAngle', parseFloat(this.value) * Math.PI / 180)" step="1">
                </div>
            </div>`;
            const arcLength = Math.abs(shape.endAngle - shape.startAngle) * shape.radius;
            html += `<div class="property-row">
                <div class="property-label">Arc Length:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${arcLength.toFixed(2)}" readonly>
                </div>
            </div>`;
            // Arcs are open curves - no area display
            break;
            
        case 'point':
            html += `<div class="property-row">
                <div class="property-label">X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.x.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'x', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.y.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'y', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            // Points don't have area - skip area display
            break;
            
        case 'text':
            html += `<div class="property-row">
                <div class="property-label">X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.x.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'x', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.y.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'y', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Text:</div>
                <div class="property-value">
                    <input type="text" class="property-input" value="${shape.content || ''}" 
                           onchange="updateShapeGeometry(${index}, 'content', this.value)">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Size:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.size || 12}" 
                           onchange="updateShapeGeometry(${index}, 'size', parseFloat(this.value))" step="1" min="1">
                </div>
            </div>`;
            // Text doesn't have area - skip area display
            break;
            
        case 'polyline':
            html += `<div class="property-row">
                <div class="property-label">Vertices:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${shape.points ? shape.points.length : 0}" readonly>
                </div>
            </div>`;
            if (shape.points && shape.points.length > 0) {
                let totalLength = 0;
                for (let i = 1; i < shape.points.length; i++) {
                    const dx = shape.points[i].x - shape.points[i-1].x;
                    const dy = shape.points[i].y - shape.points[i-1].y;
                    totalLength += Math.sqrt(dx * dx + dy * dy);
                }
                html += `<div class="property-row">
                    <div class="property-label">Length:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${totalLength.toFixed(2)}" readonly>
                    </div>
                </div>`;
                
                // Show first and last point coordinates
                html += `<div class="property-row">
                    <div class="property-label">Start X:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[0].x.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, 0, 'x', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Start Y:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[0].y.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, 0, 'y', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                
                const lastIndex = shape.points.length - 1;
                html += `<div class="property-row">
                    <div class="property-label">End X:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[lastIndex].x.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, ${lastIndex}, 'x', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">End Y:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[lastIndex].y.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, ${lastIndex}, 'y', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                
                // Calculate and display area only for closed polylines
                const polylineArea = calculateShapeArea(shape);
                if (polylineArea > 0) {
                    html += `<div class="property-row">
                        <div class="property-label">Area:</div>
                        <div class="property-value">
                            <input type="text" class="property-readonly" value="${polylineArea.toFixed(2)}" readonly>
                        </div>
                    </div>`;
                } else {
                    html += `<div class="property-row">
                        <div class="property-label">Status:</div>
                        <div class="property-value">
                            <input type="text" class="property-readonly" value="Open polyline" readonly>
                        </div>
                    </div>`;
                }
            }
            break;
            
        case 'polygon':
            html += `<div class="property-row">
                <div class="property-label">Vertices:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${shape.points ? shape.points.length : 0}" readonly>
                </div>
            </div>`;
            if (shape.points && shape.points.length > 2) {
                // Calculate area using shoelace formula
                let area = 0;
                for (let i = 0; i < shape.points.length; i++) {
                    const j = (i + 1) % shape.points.length;
                    area += shape.points[i].x * shape.points[j].y;
                    area -= shape.points[j].x * shape.points[i].y;
                }
                area = Math.abs(area) / 2;
                
                html += `<div class="property-row">
                    <div class="property-label">Area:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${area.toFixed(2)}" readonly>
                    </div>
                </div>`;
                
                // Calculate perimeter
                let perimeter = 0;
                for (let i = 0; i < shape.points.length; i++) {
                    const j = (i + 1) % shape.points.length;
                    const dx = shape.points[j].x - shape.points[i].x;
                    const dy = shape.points[j].y - shape.points[i].y;
                    perimeter += Math.sqrt(dx * dx + dy * dy);
                }
                
                html += `<div class="property-row">
                    <div class="property-label">Perimeter:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${perimeter.toFixed(2)}" readonly>
                    </div>
                </div>`;
                
                // Show center coordinates
                let centerX = 0, centerY = 0;
                shape.points.forEach(point => {
                    centerX += point.x;
                    centerY += point.y;
                });
                centerX /= shape.points.length;
                centerY /= shape.points.length;
                
                html += `<div class="property-row">
                    <div class="property-label">Center X:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${centerX.toFixed(2)}" readonly>
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Center Y:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${centerY.toFixed(2)}" readonly>
                    </div>
                </div>`;
            }
            break;
            
        case 'spline':
            html += `<div class="property-row">
                <div class="property-label">Control Points:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${shape.points ? shape.points.length : 0}" readonly>
                </div>
            </div>`;
            if (shape.points && shape.points.length > 0) {
                html += `<div class="property-row">
                    <div class="property-label">Start X:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[0].x.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, 0, 'x', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Start Y:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[0].y.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, 0, 'y', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                
                if (shape.points.length > 1) {
                    const lastIndex = shape.points.length - 1;
                    html += `<div class="property-row">
                        <div class="property-label">End X:</div>
                        <div class="property-value">
                            <input type="number" class="property-input" value="${shape.points[lastIndex].x.toFixed(2)}" 
                                   onchange="updatePolylinePoint(${index}, ${lastIndex}, 'x', parseFloat(this.value))" step="0.01">
                        </div>
                    </div>`;
                    html += `<div class="property-row">
                        <div class="property-label">End Y:</div>
                        <div class="property-value">
                            <input type="number" class="property-input" value="${shape.points[lastIndex].y.toFixed(2)}" 
                                   onchange="updatePolylinePoint(${index}, ${lastIndex}, 'y', parseFloat(this.value))" step="0.01">
                        </div>
                    </div>`;
                }
                
                // Splines are open curves - no area
                html += `<div class="property-row">
                    <div class="property-label">Type:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="Open curve" readonly>
                    </div>
                </div>`;
            }
            break;
            
        case 'hatch':
            html += `<div class="property-row">
                <div class="property-label">Hatch Lines:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${shape.points ? Math.floor(shape.points.length / 2) : 0}" readonly>
                </div>
            </div>`;
            if (shape.points && shape.points.length > 0) {
                let totalLength = 0;
                for (let i = 0; i < shape.points.length; i += 2) {
                    if (i + 1 < shape.points.length) {
                        const dx = shape.points[i + 1].x - shape.points[i].x;
                        const dy = shape.points[i + 1].y - shape.points[i].y;
                        totalLength += Math.sqrt(dx * dx + dy * dy);
                    }
                }
                html += `<div class="property-row">
                    <div class="property-label">Total Length:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${totalLength.toFixed(2)}" readonly>
                    </div>
                </div>`;
                
                // Calculate and display area for hatch
                const hatchArea = calculateShapeArea(shape);
                html += `<div class="property-row">
                    <div class="property-label">Area:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${hatchArea.toFixed(2)}" readonly>
                    </div>
                </div>`;
            }
            break;
            
        case 'rectangle':
            if (shape.width !== undefined && shape.height !== undefined) {
                html += `<div class="property-row">
                    <div class="property-label">X:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.x.toFixed(2)}" 
                               onchange="updateShapeGeometry(${index}, 'x', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Y:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.y.toFixed(2)}" 
                               onchange="updateShapeGeometry(${index}, 'y', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Width:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.width.toFixed(2)}" 
                               onchange="updateShapeGeometry(${index}, 'width', parseFloat(this.value))" step="0.01" min="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Height:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.height.toFixed(2)}" 
                               onchange="updateShapeGeometry(${index}, 'height', parseFloat(this.value))" step="0.01" min="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Area:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${(shape.width * shape.height).toFixed(2)}" readonly>
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Perimeter:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${(2 * (shape.width + shape.height)).toFixed(2)}" readonly>
                    </div>
                </div>`;
            }
            break;
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

/**
 * Generate properties HTML for multiple selected objects
 */
function generateMultipleObjectProperties() {
    const shapes = Array.from(selectedShapes).map(i => shapes[i]);
    let html = '<div class="properties-list">';
    
    html += '<div class="property-group">';
    html += '<div class="property-group-title">Multiple Objects Selected</div>';
    html += `<div class="property-row">
        <div class="property-label">Count:</div>
        <div class="property-value">
            <input type="text" class="property-readonly" value="${selectedShapes.size}" readonly>
        </div>
    </div>`;
    
    // Show common properties if they're the same across all objects
    const firstShape = shapes[0];
    const sameLayer = shapes.every(s => s.layer === firstShape.layer);
    const sameColor = shapes.every(s => s.color === firstShape.color);
    const sameLineWeight = shapes.every(s => s.lineWeight === firstShape.lineWeight);
    const sameLinetype = shapes.every(s => s.linetype === firstShape.linetype);
    
    if (sameLayer) {
        html += `<div class="property-row">
            <div class="property-label">Layer:</div>
            <div class="property-value">
                <select class="property-select" onchange="updateMultipleShapesProperty('layer', this.value)">
                    ${layers.map(layer => 
                        `<option value="${layer.name}" ${firstShape.layer === layer.name ? 'selected' : ''}>${layer.name}</option>`
                    ).join('')}
                </select>
            </div>
        </div>`;
    }
    
    if (sameColor) {
        html += `<div class="property-row">
            <div class="property-label">Color:</div>
            <div class="property-value">
                <select class="property-select" onchange="updateMultipleShapesProperty('color', this.value)">
                    <option value="byLayer" ${firstShape.color === 'byLayer' ? 'selected' : ''}>ByLayer</option>
                    <option value="#ffffff" ${firstShape.color === '#ffffff' ? 'selected' : ''}>White</option>
                    <option value="#ff0000" ${firstShape.color === '#ff0000' ? 'selected' : ''}>Red</option>
                    <option value="#00ff00" ${firstShape.color === '#00ff00' ? 'selected' : ''}>Green</option>
                    <option value="#0000ff" ${firstShape.color === '#0000ff' ? 'selected' : ''}>Blue</option>
                    <option value="#ffff00" ${firstShape.color === '#ffff00' ? 'selected' : ''}>Yellow</option>
                    <option value="#ff00ff" ${firstShape.color === '#ff00ff' ? 'selected' : ''}>Magenta</option>
                    <option value="#00ffff" ${firstShape.color === '#00ffff' ? 'selected' : ''}>Cyan</option>
                </select>
            </div>
        </div>`;
    }
    
    // Calculate total area of all selected objects
    let totalArea = 0;
    let hasClosedShapes = false;
    shapes.forEach(shape => {
        const area = calculateShapeArea(shape);
        totalArea += area;
        if (area > 0) hasClosedShapes = true;
    });
    
    // Only show total area if there are closed shapes
    if (hasClosedShapes) {
        html += `<div class="property-row">
            <div class="property-label">Total Area:</div>
            <div class="property-value">
                <input type="text" class="property-readonly" value="${totalArea.toFixed(2)}" readonly>
            </div>
        </div>`;
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

/**
 * Update a single shape property
 */
function updateShapeProperty(index, property, value) {
    if (index >= 0 && index < shapes.length) {
        saveState(`Modify ${property}`);
        
        // Convert lineWeight to proper type
        if (property === 'lineWeight' && value !== 'byLayer') {
            value = parseFloat(value);
        }
        
        shapes[index][property] = value;
        redraw();
        
        // If lineweight was changed, update the lineweight selector
        if (property === 'lineWeight') {
            updateLineweightSelectorForSelection(shapes[index]);
        }
        
        addToHistory(`Updated ${property} for ${shapes[index].type}`);
    }
}

/**
 * Update shape geometry property
 */
function updateShapeGeometry(index, property, value) {
    if (index >= 0 && index < shapes.length && !isNaN(value)) {
        saveState(`Modify geometry`);
        shapes[index][property] = value;
        redraw();
        updatePropertiesPanel(); // Refresh calculated values
        addToHistory(`Updated ${property} for ${shapes[index].type}`);
    }
}

/**
 * Update property for multiple selected shapes
 */
function updateMultipleShapesProperty(property, value) {
    if (selectedShapes.size > 0) {
        saveState(`Modify ${property} for ${selectedShapes.size} objects`);
        
        // Convert lineWeight to proper type
        if (property === 'lineWeight' && value !== 'byLayer') {
            value = parseFloat(value);
        }
        
        selectedShapes.forEach(index => {
            shapes[index][property] = value;
        });
        redraw();
        
        // If lineweight was changed, update the lineweight selector
        if (property === 'lineWeight') {
            const selectedObjects = Array.from(selectedShapes).map(i => shapes[i]);
            updateLineweightSelectorForSelection(selectedObjects);
        }
        
        updatePropertiesPanel();
        addToHistory(`Updated ${property} for ${selectedShapes.size} objects`);
    }
}

/**
 * Update specific point in polyline/spline
 */
function updatePolylinePoint(shapeIndex, pointIndex, coordinate, value) {
    if (shapeIndex >= 0 && shapeIndex < shapes.length && !isNaN(value)) {
        const shape = shapes[shapeIndex];
        if (shape.points && pointIndex >= 0 && pointIndex < shape.points.length) {
            saveState(`Modify point ${pointIndex} ${coordinate}`);
            shape.points[pointIndex][coordinate] = value;
            redraw();
            updatePropertiesPanel(); // Refresh calculated values
            addToHistory(`Updated point ${pointIndex} ${coordinate} for ${shape.type}`);
        }
    }
}

// === New Move Functions ===
function moveSelectedShapes(dx, dy) {
    if (selectedShapes.size === 0) {
        addToHistory('Nothing selected to move', 'error');
        return;
    }

    // Save state before moving
    saveState(`Move ${selectedShapes.size} object(s)`);

    for (const index of selectedShapes) {
        const shape = shapes[index];
        moveShape(shape, dx, dy);
    }
    
    addToHistory(`Moved ${selectedShapes.size} object(s) by (${dx.toFixed(2)}, ${dy.toFixed(2)})`);
    redraw();
}

// Update setMode to handle toolbar button highlighting
function setMode(m) {
    // Clear all active buttons
    document.querySelectorAll('.toolbar-button').forEach(btn => {
        btn.classList.remove('active');
    });

    mode = m;
    
    // Highlight the active tool button
    const toolButtons = {
        'line': 'div[onclick="setMode(\'line\')"]',
        'polyline': 'div[onclick="setMode(\'polyline\')"]',
        'circle': 'div[onclick="setMode(\'circle\')"]',
        'ellipse': 'div[onclick="setMode(\'ellipse\')"]',
        'arc': 'div[onclick="setMode(\'arc\')"]',
        'rectangle': 'div[onclick="setMode(\'rectangle\')"]',
        'polygon': 'div[onclick="setMode(\'polygon\')"]',
        'spline': 'div[onclick="setMode(\'spline\')"]',
        'hatch': 'div[onclick="setMode(\'hatch\')"]',
        'point': 'div[onclick="setMode(\'point\')"]',
        'text': 'div[onclick="setMode(\'text\')"]'
    };
    
    if (toolButtons[m]) {
        const activeButton = document.querySelector(toolButtons[m]);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
    
    isDrawing = false;
    previewX = undefined;
    previewY = undefined;
    startX = undefined;
    startY = undefined;
    polylinePoints = [];
    polylinePreviewActive = false; // Reset preview flag when changing modes
    
    // Reset ellipse drawing state
    ellipseDrawingStep = 0;
    ellipseCenter = { x: 0, y: 0 };
    ellipseMajorRadius = 0;
    ellipsePreviewActive = false;
    
    // Reset arc drawing state
    arcPoints = [];
    arcDrawingStep = 0;
    arcPreviewActive = false;
    
    splinePoints = [];
    splinePreviewActive = false;
    splineStep = 0;
    splineDirection = { x: 0, y: 0 };
    hatchPoints = [];
    
    // Reset move state when changing modes (unless switching to move mode)
    if (m !== 'move' && typeof resetMoveMode === 'function') {
        resetMoveMode();
    }
    
    // Reset copy state when changing modes (unless switching to copy mode)
    if (m !== 'copy' && typeof resetCopyMode === 'function') {
        resetCopyMode();
    }
    
    // Hide length input when changing modes
    hideLengthInput();

    // Set appropriate help message
    const statusMessages = {
        'select': 'Selection mode (default) - Click objects to select, drag to select area',
        'line': 'Step 1/2: Click start point for line',
        'polyline': 'Step 1/?: Click first point for polyline (Escape to finish)',
        'circle': 'Step 1/2: Click center point for circle',
        'ellipse': 'Step 1/3: Click center point for ellipse',
        'arc': 'Step 1/3: Click start point for arc',
        'rectangle': 'Step 1/3: Click first corner for rectangle',
        'polygon': 'Step 1/4: Click center point for polygon',
        'spline': 'Step 1/?: Click first point for spline (use double-click or Escape to finish)',
        'hatch': 'Click points to define hatch boundary',
        'point': 'Step 1/?: Click to place point',
        'text': 'Step 1/2: Click to place text',
        'move': 'Step 1/3: Select objects to move',
        'copy': 'Step 1/3: Select objects to copy',
        'rotate': 'Step 1/2: Click center point for rotation',
        'scale': 'Step 1/2: Click center point for scaling'
    };
    
    updateHelpBar(statusMessages[m] || `${m.charAt(0).toUpperCase() + m.slice(1)} mode active`);
    
    if (m === 'select') {
        updateHelpBar(statusMessages[m]);
        // No button to highlight for select mode since it's the default
    } else if (m === 'move') {
        // Status message is set by startMoveCommand or move handlers
    } else if (m === 'copy') {
        // Status message is set by startCopyCommand or copy handlers
    } else {
        setStatusMessage(`${m.charAt(0).toUpperCase() + m.slice(1)} mode active`);
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

    // Change cursor based on mode
    const canvas = document.getElementById('cadCanvas');
    if (m === 'select' || m === 'move' || m === 'copy') {
        canvas.style.cursor = 'default';
    } else {
        canvas.style.cursor = 'crosshair';
    }

    addToHistory(`Mode set: ${m}`);
}

// === MOVE COMMAND FUNCTIONS ===
function startMoveCommand() {
    if (selectedShapes.size > 0) {
        // Objects already selected, go directly to base point selection
        moveObjectsToMove = new Set(selectedShapes);
        moveStep = 1;
        setMode('move');
        updateHelpBar(`Step 2/3: Click base point for moving ${moveObjectsToMove.size} object(s)`);
        addToHistory(`Moving ${moveObjectsToMove.size} object(s). Click base point for move operation.`);
    } else {
        // No objects selected, start with object selection
        moveStep = 0;
        setMode('move');
        // The help message will be set by setMode() using statusMessages
        addToHistory('Move command: Select objects to move.');
    }
}

function handleMoveMode(x, y, e) {
    switch(moveStep) {
        case 0:
            // Object selection phase
            handleMoveObjectSelection(x, y, e);
            break;
        case 1:
            // Base point selection phase
            handleMoveBasePointSelection(x, y, e);
            break;
        case 2:
            // Destination point selection phase
            handleMoveDestinationSelection(x, y, e);
            break;
    }
}

function handleMoveObjectSelection(x, y, e) {
    // Similar to select mode but for move operation
    if (e.shiftKey) {
        // Multi-select mode - don't clear previous selections
    } else {
        // Clear existing selection unless clicking on already selected object
        let clickedOnSelected = false;
        for (const i of moveObjectsToMove) {
            if (isPointInShape(shapes[i], x, y)) {
                clickedOnSelected = true;
                break;
            }
        }
        if (!clickedOnSelected) {
            moveObjectsToMove.clear();
        }
    }

    let objectWasSelected = false;
    
    // Find and select/deselect objects
    for (let i = shapes.length - 1; i >= 0; i--) {
        if (isPointInShape(shapes[i], x, y)) {
            if (moveObjectsToMove.has(i)) {
                moveObjectsToMove.delete(i);
                if (moveObjectsToMove.size === 0) {
                    updateHelpBar('Step 1/3: Select objects to move');
                }
            } else {
                moveObjectsToMove.add(i);
                objectWasSelected = true;
                // Automatically proceed to base point selection after selecting object
                moveStep = 1;
                updateHelpBar(`Step 2/3: Click base point for moving ${moveObjectsToMove.size} object(s)`);
            }
            redraw();
            return;
        }
    }
    
    // If clicked in empty space and objects already selected, proceed to base point
    if (moveObjectsToMove.size > 0) {
        moveStep = 1;
        updateHelpBar(`Step 2/3: Click base point for moving ${moveObjectsToMove.size} object(s)`);
    } else {
        updateHelpBar('Step 1/3: Select objects to move');
    }
}

function handleMoveBasePointSelection(x, y, e) {
    // Set base point and proceed to destination selection
    moveBasePoint = { x, y };
    moveStep = 2;
    movePreviewActive = true;
    
    // Immediately start showing preview at the base point
    previewX = x;
    previewY = y;
    
    updateHelpBar('Step 3/3: Click destination point to complete move');
    addToHistory(`Base point set at (${x.toFixed(2)}, ${y.toFixed(2)}). Objects now follow cursor.`);
    redraw();
}

function handleMoveDestinationSelection(x, y, e) {
    // Calculate displacement and perform the move
    const dx = x - moveBasePoint.x;
    const dy = y - moveBasePoint.y;
    
    // Move all selected objects
    for (const index of moveObjectsToMove) {
        const shape = shapes[index];
        moveShape(shape, dx, dy);
    }
    
    // Update main selection to match moved objects
    selectedShapes = new Set(moveObjectsToMove);
    
    updateHelpBar('Objects moved! Returning to selection mode...');
    setTimeout(() => {
        updateHelpBar('Use drawing tools to create shapes');
    }, 2000);
    addToHistory(`Moved ${moveObjectsToMove.size} object(s) by (${dx.toFixed(2)}, ${dy.toFixed(2)})`);
    
    // Reset move state
    resetMoveMode();
    redraw();
}

function resetMoveMode() {
    moveStep = 0;
    moveBasePoint = { x: 0, y: 0 };
    moveObjectsToMove.clear();
    movePreviewActive = false;
    // Don't call setMode here to avoid recursion
    if (mode === 'move') {
        mode = 'select';
        updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
    }
}

// === COPY COMMAND FUNCTIONS ===
function startCopyCommand() {
    if (selectedShapes.size > 0) {
        // Objects already selected, go directly to base point selection
        copyObjectsToCopy = new Set(selectedShapes);
        copyStep = 1;
        setMode('copy');
        updateHelpBar(`Step 2/3: Click base point for copying ${copyObjectsToCopy.size} object(s)`);
        addToHistory(`Copying ${copyObjectsToCopy.size} object(s). Click base point for copy operation.`);
    } else {
        // No objects selected, start with object selection
        copyStep = 0;
        setMode('copy');
        // The help message will be set by setMode() using statusMessages
        addToHistory('Copy command: Select objects to copy.');
    }
}

function handleCopyMode(x, y, e) {
    switch(copyStep) {
        case 0:
            // Object selection phase
            handleCopyObjectSelection(x, y, e);
            break;
        case 1:
            // Base point selection phase
            handleCopyBasePointSelection(x, y, e);
            break;
        case 2:
            // Destination point selection phase
            handleCopyDestinationSelection(x, y, e);
            break;
    }
}

function handleCopyObjectSelection(x, y, e) {
    // Similar to select mode but for copy operation
    if (e.shiftKey) {
        // Multi-select mode - don't clear previous selections
    } else {
        // Clear existing selection unless clicking on already selected object
        let clickedOnSelected = false;
        for (const i of copyObjectsToCopy) {
            if (isPointInShape(shapes[i], x, y)) {
                clickedOnSelected = true;
                break;
            }
        }
        if (!clickedOnSelected) {
            copyObjectsToCopy.clear();
        }
    }

    let objectWasSelected = false;
    
    // Find and select/deselect objects
    for (let i = shapes.length - 1; i >= 0; i--) {
        if (isPointInShape(shapes[i], x, y)) {
            if (copyObjectsToCopy.has(i)) {
                copyObjectsToCopy.delete(i);
                if (copyObjectsToCopy.size === 0) {
                    updateHelpBar('Step 1/3: Select objects to copy');
                }
            } else {
                copyObjectsToCopy.add(i);
                objectWasSelected = true;
                // Automatically proceed to base point selection after selecting object
                copyStep = 1;
                updateHelpBar(`Step 2/3: Click base point for copying ${copyObjectsToCopy.size} object(s)`);
            }
            redraw();
            return;
        }
    }
    
    // If clicked in empty space and objects already selected, proceed to base point
    if (copyObjectsToCopy.size > 0) {
        copyStep = 1;
        updateHelpBar(`Step 2/3: Click base point for copying ${copyObjectsToCopy.size} object(s)`);
    } else {
        updateHelpBar('Step 1/3: Select objects to copy');
    }
}

function handleCopyBasePointSelection(x, y, e) {
    // Set base point and proceed to destination selection
    copyBasePoint = { x, y };
    copyStep = 2;
    copyPreviewActive = true;
    
    // Immediately start showing preview at the base point
    previewX = x;
    previewY = y;
    
    updateHelpBar('Step 3/3: Click destination point to complete copy');
    addToHistory(`Base point set at (${x.toFixed(2)}, ${y.toFixed(2)}). Copy preview follows cursor.`);
    redraw();
}

function handleCopyDestinationSelection(x, y, e) {
    // Calculate displacement and perform the copy
    const dx = x - copyBasePoint.x;
    const dy = y - copyBasePoint.y;
    
    // Save state before copying
    saveState(`Copy ${copyObjectsToCopy.size} object(s)`);
    
    // Create copies of all selected objects
    const newShapes = [];
    for (const index of copyObjectsToCopy) {
        const originalShape = shapes[index];
        const copiedShape = safeDeepCopy(originalShape, {}, 'copied shape'); // Safe deep copy
        if (copiedShape && typeof copiedShape === 'object') {
            moveShape(copiedShape, dx, dy); // Move the copy to new position
            
            // Ensure copied shape has current layer properties
            copiedShape.layer = currentLayer;
            copiedShape.color = currentColor;
            copiedShape.lineWeight = currentLineWeight;
            
            shapes.push(copiedShape);
            newShapes.push(shapes.length - 1); // Store index of new shape
        } else {
            console.error('Failed to copy shape:', originalShape);
            addToHistory('Warning: Failed to copy one or more shapes', 'warning');
        }
    }
    
    // Update main selection to match copied objects
    selectedShapes = new Set(newShapes);
    
    updateHelpBar('Objects copied! Returning to selection mode...');
    setTimeout(() => {
        updateHelpBar('Use drawing tools to create shapes');
    }, 2000);
    addToHistory(`Copied ${copyObjectsToCopy.size} object(s) by (${dx.toFixed(2)}, ${dy.toFixed(2)})`);
    
    // Reset copy state
    resetCopyMode();
    redraw();
}

function resetCopyMode() {
    copyStep = 0;
    copyBasePoint = { x: 0, y: 0 };
    copyObjectsToCopy.clear();
    copyPreviewActive = false;
    // Don't call setMode here to avoid recursion
    if (mode === 'copy') {
        mode = 'select';
        updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
    }
}

// === ROTATE COMMAND FUNCTIONS ===
let rotateStep = 0; // 0 = select objects, 1 = select center point, 2 = select angle
let rotateBasePoint = { x: 0, y: 0 };
let rotateObjectsToRotate = new Set();
let rotatePreviewActive = false;
let rotateAngleStart = 0;

function startRotateCommand() {
    if (selectedShapes.size === 0) {
        updateHelpBar('Select objects first to rotate');
        addToHistory('Select objects first', 'error');
        return;
    }
    
    setMode('rotate');
    rotateStep = 1; // Go directly to center point selection
    rotateObjectsToRotate = new Set(selectedShapes);
    // The help message will be set by setMode() using statusMessages
    addToHistory(`Rotating ${rotateObjectsToRotate.size} object(s). Click center point.`);
}

function handleRotateMode(x, y, e) {
    switch(rotateStep) {
        case 1:
            // Select rotation center point
            rotateBasePoint = { x, y };
            rotateStep = 2;
            updateHelpBar('Step 2/2: Move cursor to set rotation angle and click to confirm');
            addToHistory('Center point set. Move cursor to set angle, click to confirm.');
            break;
        case 2:
            // Calculate angle and apply rotation
            const dx = x - rotateBasePoint.x;
            const dy = y - rotateBasePoint.y;
            const angle = Math.atan2(dy, dx);
            rotateSelectedShapes(angle - rotateAngleStart, rotateBasePoint.x, rotateBasePoint.y);
            addToHistory(`Rotation completed at ${(angle * 180 / Math.PI).toFixed(1)} degrees`);
            updateHelpBar('Objects rotated! Returning to selection mode...');
            setTimeout(() => {
                updateHelpBar('Use drawing tools to create shapes');
            }, 2000);
            resetRotateMode();
            break;
    }
}

function rotateSelectedShapes(angle, centerX = null, centerY = null) {
    if (rotateObjectsToRotate.size === 0) return;
    
    // Save state before rotating
    saveState(`Rotate ${rotateObjectsToRotate.size} object(s)`);
    
    // If no center specified, use center of selection
    if (centerX === null || centerY === null) {
        const bounds = getSelectionBounds(rotateObjectsToRotate);
        centerX = (bounds.minX + bounds.maxX) / 2;
        centerY = (bounds.minY + bounds.maxY) / 2;
    }
    
    rotateObjectsToRotate.forEach(index => {
        rotateShape(shapes[index], centerX, centerY, angle);
    });
    
    redraw();
}

function resetRotateMode() {
    rotateStep = 0;
    rotateBasePoint = { x: 0, y: 0 };
    rotateObjectsToRotate.clear();
    rotatePreviewActive = false;
    rotateAngleStart = 0;
    if (mode === 'rotate') {
        mode = 'select';
        updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
    }
}

// === SCALE COMMAND FUNCTIONS ===
let scaleStep = 0; // 0 = select objects, 1 = select center point, 2 = select scale factor
let scaleBasePoint = { x: 0, y: 0 };
let scaleObjectsToScale = new Set();
let scalePreviewActive = false;
let scaleStartDistance = 0;

function startScaleCommand() {
    if (selectedShapes.size === 0) {
        updateHelpBar('Select objects first to scale');
        addToHistory('Select objects first', 'error');
        return;
    }
    
    setMode('scale');
    scaleStep = 1; // Go directly to center point selection
    scaleObjectsToScale = new Set(selectedShapes);
    // The help message will be set by setMode() using statusMessages
    addToHistory(`Scaling ${scaleObjectsToScale.size} object(s). Click center point.`);
}

function handleScaleMode(x, y, e) {
    switch(scaleStep) {
        case 1:
            // Select scale center point
            scaleBasePoint = { x, y };
            scaleStep = 2;
            scaleStartDistance = Math.sqrt((x - scaleBasePoint.x) ** 2 + (y - scaleBasePoint.y) ** 2) || 1;
            updateHelpBar('Step 2/2: Move cursor to set scale factor and click to confirm');
            addToHistory('Center point set. Move cursor to set scale, click to confirm.');
            break;
        case 2:
            // Calculate scale factor and apply scaling
            const distance = Math.sqrt((x - scaleBasePoint.x) ** 2 + (y - scaleBasePoint.y) ** 2);
            const factor = distance / scaleStartDistance;
            scaleSelectedShapes(factor, scaleBasePoint.x, scaleBasePoint.y);
            addToHistory(`Scaling completed with factor ${factor.toFixed(2)}`);
            updateHelpBar('Objects scaled! Returning to selection mode...');
            setTimeout(() => {
                updateHelpBar('Use drawing tools to create shapes');
            }, 2000);
            resetScaleMode();
            break;
    }
}

function scaleSelectedShapes(factor, centerX = null, centerY = null) {
    if (scaleObjectsToScale.size === 0 || factor <= 0) return;
    
    // Save state before scaling
    saveState(`Scale ${scaleObjectsToScale.size} object(s)`);
    
    // If no center specified, use center of selection
    if (centerX === null || centerY === null) {
        const bounds = getSelectionBounds(scaleObjectsToScale);
        centerX = (bounds.minX + bounds.maxX) / 2;
        centerY = (bounds.minY + bounds.maxY) / 2;
    }
    
    scaleObjectsToScale.forEach(index => {
        scaleShape(shapes[index], centerX, centerY, factor);
    });
    
    redraw();
}

function resetScaleMode() {
    scaleStep = 0;
    scaleBasePoint = { x: 0, y: 0 };
    scaleObjectsToScale.clear();
    scalePreviewActive = false;
    scaleStartDistance = 0;
    if (mode === 'scale') {
        mode = 'select';
        updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
    }
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
    
    // Set preview styling - more transparent and visible
    ctx.setLineDash([]);
    ctx.strokeStyle = shape.color || '#ffffff';
    ctx.fillStyle = shape.color || '#ffffff';
    ctx.lineWidth = (shape.lineWeight || 1) / zoom;
    ctx.globalAlpha = 0.5; // 50% transparency for floating effect
    
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
            // For text, draw the actual text but transparent
            if (previewShape.content) {
                ctx.font = `${previewShape.size || 12}px Arial`;
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
    
    // Set preview styling - more transparent and visible
    ctx.setLineDash([]);
    ctx.strokeStyle = shape.color || '#ffffff';
    ctx.fillStyle = shape.color || '#ffffff';
    ctx.lineWidth = (shape.lineWeight || 1) / zoom;
    ctx.globalAlpha = 0.5; // 50% transparency for floating effect
    
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
            // For text, draw the actual text but transparent
            if (previewShape.content) {
                ctx.font = `${previewShape.size || 12}px Arial`;
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

function drawShapeOutline(ctx, shape) {
    // Draw outline around shape for selection highlighting - OPTIMIZED with Unified Shape Handler
    
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

function toggleGrid() {
    showGrid = !showGrid;
    const gridInfo = showGrid ? `Grid ON (spacing: ${getCurrentGridStep()})` : 'Grid OFF';
    addToHistory(gridInfo);
    updateHelpBar(gridInfo);
    updateButton('gridBtn', showGrid);
    redraw();
}

// Helper function to get current grid step for display
function getCurrentGridStep() {
    const gridSettings = getCurrentGridSettings();
    return `${gridSettings.base}`;
}

function toggleOrtho() {
    orthoMode = !orthoMode;
    addToHistory(`Ortho mode ${orthoMode ? 'ON' : 'OFF'}`);
    updateHelpBar(`Ortho mode ${orthoMode ? 'ON' : 'OFF'}`);
    updateButton('orthoBtn', orthoMode);
}

function toggleSnap() {
    snapEnabled = !snapEnabled;
    addToHistory(`Snap ${snapEnabled ? 'ON' : 'OFF'}`);
    updateHelpBar(`Snap ${snapEnabled ? 'ON' : 'OFF'}`);
    updateButton('snapBtn', snapEnabled);
}

function toggleObjectSnap() {
    objectSnapEnabled = !objectSnapEnabled;
    addToHistory(`OSNAP ${objectSnapEnabled ? 'ON' : 'OFF'}`);
    updateHelpBar(`OSNAP ${objectSnapEnabled ? 'ON' : 'OFF'}`);
    updateButton('osnapBtn', objectSnapEnabled);
}

function updateButton(id, state) {
    const el = document.getElementById(id);
    el.style.background = state ? '#4c6fff' : '#3a3a3a';
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
                            : shape.type === 'polygon'
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
    } else if (shape.type === 'polygon') {
        // Simple point-in-polygon test
        let inside = false;
        for (let i = 0, j = shape.points.length - 1; i < shape.points.length; j = i++) {
            const xi = shape.points[i].x, yi = shape.points[i].y;
            const xj = shape.points[j].x, yj = shape.points[j].y;

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
        // Check text selection by bounding box
        if (shape.content && shape.x !== undefined && shape.y !== undefined) {
            const textSize = shape.size || (12 / zoom);
            const textWidth = shape.content.length * textSize * 0.6; // Approximate text width
            const textHeight = textSize;
            
            // Create bounding box around text
            const minX = shape.x - (textWidth * 0.1);
            const maxX = shape.x + textWidth;
            const minY = shape.y - textHeight;
            const maxY = shape.y + (textHeight * 0.3);
            
            return x >= minX && x <= maxX && y >= minY && y <= maxY;
        }
        return false;
    }
    return false;
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
    
    // Sort indices in descending order to avoid index shifting
    const sortedIndices = Array.from(selectedShapes).sort((a, b) => b - a);
    
    // Remove shapes from back to front
    sortedIndices.forEach(index => {
        shapes.splice(index, 1);
    });
    
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

function handleRotateMode(x, y, e) {
    if (selectedShapes.size === 0) {
        addToHistory('No objects selected to rotate', 'error');
        setMode('select');
        return;
    }
    
    if (!rotateCenter.x && !rotateCenter.y) {
        // First click - set rotation center
        rotateCenter = { x, y };
        addToHistory('Rotation center set. Click to specify rotation angle.');
    } else {
        // Second click - perform rotation
        const angle = Math.atan2(y - rotateCenter.y, x - rotateCenter.x);
        
        selectedShapes.forEach(index => {
            rotateShape(shapes[index], rotateCenter.x, rotateCenter.y, angle);
        });
        
        addToHistory(`Rotated ${selectedShapes.size} object(s)`);
        rotateCenter = { x: 0, y: 0 };
        setMode('select');
        redraw();
    }
}

function handleScaleMode(x, y, e) {
    if (selectedShapes.size === 0) {
        addToHistory('No objects selected to scale', 'error');
        setMode('select');
        return;
    }
    
    if (!scaleCenter.x && !scaleCenter.y) {
        // First click - set scale center
        scaleCenter = { x, y };
        scaleStartDistance = 1;
        addToHistory('Scale center set. Click to specify scale factor.');
    } else {
        // Second click - perform scaling
        const currentDistance = Math.sqrt(Math.pow(x - scaleCenter.x, 2) + Math.pow(y - scaleCenter.y, 2));
        const scaleFactor = currentDistance / (scaleStartDistance || 1);
        
        selectedShapes.forEach(index => {
            scaleShape(shapes[index], scaleCenter.x, scaleCenter.y, scaleFactor);
        });
        
        addToHistory(`Scaled ${selectedShapes.size} object(s) by factor ${scaleFactor.toFixed(2)}`);
        scaleCenter = { x: 0, y: 0 };
        setMode('select');
        redraw();
    }
}

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

// === GRID AND ZOOM SYSTEM ===

// Base grid configuration
const BASE_GRID_STEP = 100;
const SUB_GRID_STEP = 20;

/**
 * Get current grid settings based on zoom level with dynamic redistribution
 * @returns {Object} Grid settings with base and sub steps
 */
function getCurrentGridSettings() {
    // Start with base configuration
    let baseStep = BASE_GRID_STEP; // 100
    let subStep = SUB_GRID_STEP;   // 20
    
    // Calculate how many pixels the base grid would take on screen
    const baseGridPixels = baseStep * zoom;
    
    // Track redistribution for internal logic
    let redistributed = false;
    
    // SMART redistribution: maintain visual density between 15-80 pixels per grid step
    // When grid becomes too dense (less than 15 pixels per step) - ZOOM OUT scenario
    if (baseGridPixels < 15) {
        // Scale UP to maintain readability (fewer, larger grid squares)
        let scaleFactor = 1;
        while ((baseStep * scaleFactor * zoom) < 15) {
            scaleFactor *= 5; // Use 5x multiplier for clean scaling
        }
        if (scaleFactor > 1) {
            subStep = baseStep; // Current base becomes new sub
            baseStep = baseStep * scaleFactor;
            redistributed = true;
        }
    }
    // When grid becomes too sparse (more than 80 pixels per step) - ZOOM IN scenario  
    else if (baseGridPixels > 80) {
        // Scale DOWN to show more detail (more, smaller grid squares)
        let scaleFactor = 1;
        while ((baseStep / scaleFactor * zoom) > 80 && (baseStep / scaleFactor) >= 4) {
            scaleFactor *= 5; // Use 5x divisor for clean scaling
        }
        if (scaleFactor > 1) {
            baseStep = baseStep / scaleFactor;
            subStep = baseStep / 5; // New sub is 5x smaller
            // Ensure we don't go below reasonable minimum
            if (baseStep < 4) {
                baseStep = 4;
                subStep = 0; // Disable sub grid when too small
            }
            redistributed = true;
        }
    }
    
    // Ensure sub grid is reasonable or disable it
    if (subStep < 1 || (subStep * zoom) < 3) {
        subStep = 0; // Disable sub grid if too small
    }
    
    return {
        base: baseStep,
        sub: subStep,
        major: baseStep * 5 // Major grid is always 5x base
    };
}

/**
 * Zoom in by a fixed step and recalculate grid
 */
function zoomInStep() {
    const factor = 1.5; // Zoom in factor
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Get world coordinates of center point
    const [mx, my] = screenToWorld(centerX, centerY);
    
    // Apply zoom
    zoom *= factor;
    zoom = Math.max(0.001, Math.min(1000, zoom));
    
    // Recalculate offsets to keep center point fixed
    offsetX = centerX - mx * zoom;
    offsetY = canvas.height - centerY - my * zoom;
    
    // Update grid and redraw
    redraw();
    
    addToHistory(`Zoomed in (${zoom.toFixed(2)}x)`);
}

/**
 * Zoom out by a fixed step and recalculate grid
 */
function zoomOutStep() {
    const factor = 1.5; // Zoom out factor
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Get world coordinates of center point
    const [mx, my] = screenToWorld(centerX, centerY);
    
    // Apply zoom
    zoom /= factor;
    zoom = Math.max(0.001, Math.min(1000, zoom));
    
    // Recalculate offsets to keep center point fixed
    offsetX = centerX - mx * zoom;
    offsetY = canvas.height - centerY - my * zoom;
    
    // Update grid and redraw
    redraw();
    
    addToHistory(`Zoomed out (${zoom.toFixed(2)}x)`);
}

/**
 * Reset zoom to 1:1 and recalculate grid
 */
function resetZoom() {
    zoom = 1.0;
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    
    redraw();
    
    addToHistory('Zoom reset to 1:1');
}

function drawGrid() {
    if (!showGrid) return;

    // Calculate the visible world area
    const startX = -offsetX / zoom;
    const startY = -offsetY / zoom;
    const endX = startX + canvas.width / zoom;
    const endY = startY + canvas.height / zoom;

    // Get current grid settings with dynamic redistribution
    const gridSettings = getCurrentGridSettings();
    const baseStep = gridSettings.base;
    const subStep = gridSettings.sub;
    const majorStep = gridSettings.major;

    // Save context for grid drawing
    ctx.save();
    
    // Calculate opacity based on grid density in pixels - more stable calculation
    const basePixels = baseStep * zoom;
    const subPixels = subStep * zoom;
    const majorPixels = majorStep * zoom;
    
    // Stable opacity calculations that don't change dramatically with zoom
    let baseOpacity = 0.2;   // Slightly more visible base grid
    let subOpacity = 0.1;    // Lighter sub grid
    let majorOpacity = 0.3;  // More visible major grid
    
    // Only adjust opacity slightly based on density for better visibility
    if (basePixels < 20) {
        baseOpacity = Math.max(0.1, basePixels / 100); // Fade out when too dense
    } else if (basePixels > 80) {
        baseOpacity = Math.min(0.35, 0.2 + (basePixels - 80) / 400); // Slightly increase when sparse
    }
    
    if (subPixels < 10 && subStep > 0) {
        subOpacity = Math.max(0.05, subPixels / 100); // Fade out when too dense
    } else if (subPixels > 40 && subStep > 0) {
        subOpacity = Math.min(0.2, 0.1 + (subPixels - 40) / 300); // Slightly increase when sparse
    }
    
    if (majorPixels < 40) {
        majorOpacity = Math.max(0.15, majorPixels / 133); // Fade out when too dense
    } else if (majorPixels > 120) {
        majorOpacity = Math.min(0.5, 0.3 + (majorPixels - 120) / 300); // Increase when sparse
    }
    
    // ALWAYS draw grid relative to 0,0 coordinates
    // Calculate grid boundaries aligned to 0,0
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
    
    // Draw subgrid first (finest, most transparent)
    if (subStep > 0) {
        ctx.globalAlpha = subOpacity;
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 0.5 / zoom;
        
        ctx.beginPath();
        
        // Subgrid vertical lines - always aligned to 0,0
        for (let x = subX0; x <= subX1; x += subStep) {
            // Skip if this line coincides with base or major grid
            if (Math.abs(x % baseStep) < 0.001 || Math.abs(x % majorStep) < 0.001) continue;
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        
        // Subgrid horizontal lines - always aligned to 0,0
        for (let y = subY0; y <= subY1; y += subStep) {
            // Skip if this line coincides with base or major grid
            if (Math.abs(y % baseStep) < 0.001 || Math.abs(y % majorStep) < 0.001) continue;
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        
        ctx.stroke();
    }
    
    // Draw base grid lines - always aligned to 0,0
    ctx.globalAlpha = baseOpacity;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1 / zoom;
    
    ctx.beginPath();
    
    // Base grid vertical lines
    for (let x = baseX0; x <= baseX1; x += baseStep) {
        // Skip if this line coincides with major grid
        if (Math.abs(x % majorStep) < 0.001) continue;
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    
    // Base grid horizontal lines
    for (let y = baseY0; y <= baseY1; y += baseStep) {
        // Skip if this line coincides with major grid
        if (Math.abs(y % majorStep) < 0.001) continue;
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    
    ctx.stroke();
    
    // Draw major grid lines (thickest, most visible) - always aligned to 0,0
    ctx.globalAlpha = majorOpacity;
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5 / zoom;
    
    ctx.beginPath();
    
    // Major vertical lines
    for (let x = majorX0; x <= majorX1; x += majorStep) {
        if (Math.abs(x) < 0.001) continue; // Skip origin, will be drawn separately
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    
    // Major horizontal lines
    for (let y = majorY0; y <= majorY1; y += majorStep) {
        if (Math.abs(y) < 0.001) continue; // Skip origin, will be drawn separately
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    
    ctx.stroke();
    
    // Draw origin axes (X=0 and Y=0) with distinct colors
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2 / zoom;
    
    // X-axis (horizontal line at Y=0)
    if (startY <= 0 && endY >= 0) {
        ctx.strokeStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(endX, 0);
        ctx.stroke();
    }
    
    // Y-axis (vertical line at X=0)
    if (startX <= 0 && endX >= 0) {
        ctx.strokeStyle = '#4444ff';
        ctx.beginPath();
        ctx.moveTo(0, startY);
        ctx.lineTo(0, endY);
        ctx.stroke();
    }

    // Restore context
    ctx.restore();
}

// Optimized redraw with requestAnimationFrame
let pendingDraw = false;

function redraw() {
    if (!pendingDraw) {
        pendingDraw = true;
        requestAnimationFrame(() => {
            _redraw();
            pendingDraw = false;
        });
    }
}

function _redraw() {
    ctx.setTransform(zoom, 0, 0, -zoom, offsetX, canvas.height - offsetY);
    ctx.clearRect(-offsetX / zoom, -offsetY / zoom, canvas.width / zoom, canvas.height / zoom);
    drawGrid();

    // Draw all shapes
    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        
        // Hide original objects that are being moved during preview
        if (mode === 'move' && movePreviewActive && moveStep === 2 && moveObjectsToMove.has(i)) {
            // Skip drawing original objects during move preview to avoid visual confusion
            continue;
        }
        
        renderStandardShapes(ctx, shape, zoom, i);
    }

    // Draw previews
    if (mode === 'line' && isDrawing && startX !== undefined && startY !== undefined && previewX !== undefined && previewY !== undefined) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(previewX, previewY);
        ctx.stroke();
    } else if (mode === 'polyline' && polylinePoints.length > 0 && polylinePreviewActive) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.moveTo(polylinePoints[0].x, polylinePoints[0].y);
        for (let i = 1; i < polylinePoints.length; i++) {
            ctx.lineTo(polylinePoints[i].x, polylinePoints[i].y);
        }
        // Only draw preview line if we have valid preview coordinates
        if (previewX !== undefined && previewY !== undefined) {
            ctx.lineTo(previewX, previewY);
        }
        ctx.stroke();
    } else if (mode === 'circle' && isDrawing) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        const radius = Math.sqrt(Math.pow(previewX - startX, 2) + Math.pow(previewY - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
    } else if (mode === 'ellipse' && ellipsePreviewActive) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        drawEllipsePreview(ctx, previewX, previewY);
    } else if (mode === 'arc' && arcPoints.length > 0) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        
        if (arcDrawingStep === 1) {
            // Drawing line from start to current cursor position
            ctx.beginPath();
            ctx.moveTo(arcPoints[0].x, arcPoints[0].y);
            ctx.lineTo(previewX, previewY);
            ctx.stroke();
        } else if (arcDrawingStep === 2 && arcPoints.length === 2) {
            // Drawing preview arc with variable amplitude based on cursor distance
            const startPoint = arcPoints[0];
            const endPoint = arcPoints[1];
            
            // Calculate the chord (straight line distance between start and end)
            const chordLength = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
            
            // Calculate the distance from cursor to the chord line
            const A = endPoint.y - startPoint.y;
            const B = startPoint.x - endPoint.x;
            const C = endPoint.x * startPoint.y - startPoint.x * endPoint.y;
            const distanceToChord = Math.abs(A * previewX + B * previewY + C) / Math.sqrt(A * A + B * B);
            
            // Calculate the sagitta (height of the arc) based on cursor distance
            const sagitta = Math.max(distanceToChord, 1); // Minimum sagitta to avoid division by zero
            
            // Calculate radius from sagitta and chord length
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
            const crossProduct = (previewX - startPoint.x) * (endPoint.y - startPoint.y) - (previewY - startPoint.y) * (endPoint.x - startPoint.x);
            const side = crossProduct > 0 ? 1 : -1;
            
            // Calculate center position
            const centerDistance = radius - sagitta;
            const centerX = midPointX + side * perpDirX * centerDistance;
            const centerY = midPointY + side * perpDirY * centerDistance;
            
            // Calculate angles
            const startAngle = Math.atan2(startPoint.y - centerY, startPoint.x - centerX);
            const endAngle = Math.atan2(endPoint.y - centerY, endPoint.x - centerX);
            
            // Determine sweep direction
            let drawStartAngle = startAngle;
            let drawEndAngle = endAngle;
            
            if (side > 0) {
                // Counter-clockwise
                if (drawEndAngle < drawStartAngle) {
                    drawEndAngle += 2 * Math.PI;
                }
            } else {
                // Clockwise - swap angles
                if (drawStartAngle < drawEndAngle) {
                    drawStartAngle += 2 * Math.PI;
                }
                [drawStartAngle, drawEndAngle] = [drawEndAngle, drawStartAngle];
            }
            
            // Draw the preview arc
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, drawStartAngle, drawEndAngle);
            ctx.stroke();
            
            // Draw the preview arc with thicker line
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2 / zoom;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, drawStartAngle, drawEndAngle);
            ctx.stroke();
            
            // Calculate and display arc angle in degrees
            let arcAngle = Math.abs(drawEndAngle - drawStartAngle);
            if (arcAngle > Math.PI) {
                arcAngle = 2 * Math.PI - arcAngle; // Show smaller angle
            }
            const degrees = (arcAngle * 180 / Math.PI).toFixed(0);
            
            // Display angle text near the arc (always horizontal)
            ctx.save(); // Save current transformation
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation to screen coordinates
            
            // Position text at the middle of the arc, but convert to screen coordinates
            const midAngle = (drawStartAngle + drawEndAngle) / 2;
            const textRadius = radius + 15 / zoom;
            const worldTextX = centerX + Math.cos(midAngle) * textRadius;
            const worldTextY = centerY + Math.sin(midAngle) * textRadius;
            
            // Convert world coordinates to screen coordinates
            const [screenTextX, screenTextY] = worldToScreen(worldTextX, worldTextY);
            
            ctx.fillStyle = '#0ff';
            ctx.font = '14px Arial'; // Fixed font size for readability
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.fillText(`${degrees}deg`, screenTextX, screenTextY);
            
            ctx.restore(); // Restore previous transformation
            
            // Draw start and end points
            ctx.fillStyle = '#ff0';  // Yellow for start/end points
            ctx.beginPath();
            ctx.arc(startPoint.x, startPoint.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(endPoint.x, endPoint.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
        }
    } else if (mode === 'rectangle' && isDrawing) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        
        if (rectangleStep === 1) {
            // Show line from start to current mouse position (free direction)
            ctx.beginPath();
            ctx.moveTo(rectangleStartX, rectangleStartY);
            ctx.lineTo(previewX, previewY);
            ctx.stroke();
        } else if (rectangleStep === 2) {
            // Show first side and perpendicular preview to cursor
            const dx = rectangleEndX - rectangleStartX;
            const dy = rectangleEndY - rectangleStartY;
            const sideLength = Math.sqrt(dx * dx + dy * dy);
            
            // Unit vectors
            const ux = dx / sideLength;
            const uy = dy / sideLength;
            const vx = -uy; // Perpendicular
            const vy = ux;
            
            // Calculate perpendicular distance from cursor to first side
            const clickDx = previewX - rectangleStartX;
            const clickDy = previewY - rectangleStartY;
            const perpDistance = clickDx * vx + clickDy * vy;
            
            // Calculate rectangle corners
            const corners = [
                { x: rectangleStartX, y: rectangleStartY },
                { x: rectangleEndX, y: rectangleEndY },
                { x: rectangleEndX + vx * perpDistance, y: rectangleEndY + vy * perpDistance },
                { x: rectangleStartX + vx * perpDistance, y: rectangleStartY + vy * perpDistance }
            ];
            
            // Draw rectangle preview
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            ctx.lineTo(corners[1].x, corners[1].y);
            ctx.lineTo(corners[2].x, corners[2].y);
            ctx.lineTo(corners[3].x, corners[3].y);
            ctx.closePath();
            ctx.stroke();
        }
    } else if (mode === 'polygon' && polygonStep === 3) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        
        // Show polygon preview with current radius and rotation
        const radius = Math.sqrt(Math.pow(previewX - polygonCenterX, 2) + Math.pow(previewY - polygonCenterY, 2));
        const mouseAngle = Math.atan2(previewY - polygonCenterY, previewX - polygonCenterX);
        drawPolygonPreview(ctx, polygonCenterX, polygonCenterY, radius, mouseAngle);
    } else if (mode === 'spline' && splinePoints.length > 0) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        
        // Create preview points including current mouse position
        const allPoints = [...splinePoints];
        if (splinePreviewActive) {
            allPoints.push({ x: previewX, y: previewY });
        }
        
        if (allPoints.length > 1) {
            // Draw smooth spline curve using bezier curves
            drawSmoothSpline(ctx, allPoints);
        } else if (allPoints.length === 1) {
            // Just draw a point for the first click
            ctx.beginPath();
            ctx.arc(allPoints[0].x, allPoints[0].y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
        }
    } else if (mode === 'hatch' && hatchPoints.length > 0) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 0.5 / zoom;
        for (let i = 0; i < hatchPoints.length; i += 2) {
            if (i+1 < hatchPoints.length) {
                ctx.beginPath();
                ctx.moveTo(hatchPoints[i].x, hatchPoints[i].y);
                ctx.lineTo(hatchPoints[i+1].x, hatchPoints[i+1].y);
                ctx.stroke();
            }
        }
    }

    // Draw move preview and selected objects visualization
    if (mode === 'move') {
        // Show selected objects for move with different highlighting (only during selection phase)
        if (moveObjectsToMove.size > 0 && moveStep < 2) {
            ctx.save();
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([3 / zoom, 3 / zoom]);
            ctx.globalAlpha = 0.8;
            
            for (const index of moveObjectsToMove) {
                if (index < shapes.length) {
                    const shape = shapes[index];
                    // Draw outline around selected objects
                    drawShapeOutline(ctx, shape);
                }
            }
            ctx.restore();
        }
        
        // Draw move preview during destination selection (floating objects)
        if (movePreviewActive && moveStep === 2 && previewX !== undefined && previewY !== undefined) {
            // Calculate displacement so that base point moves to cursor position
            const dx = previewX - moveBasePoint.x;
            const dy = previewY - moveBasePoint.y;
            
            ctx.save();
            
            // Draw preview of moved objects (floating effect)
            for (const index of moveObjectsToMove) {
                if (index < shapes.length) { // Safety check
                    const shape = shapes[index];
                    drawMovePreview(ctx, shape, dx, dy, zoom);
                }
            }
            
            // Draw displacement vector (only if mouse moved from base point)
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                ctx.setLineDash([2 / zoom, 2 / zoom]);
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 1 / zoom;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(moveBasePoint.x, moveBasePoint.y);
                ctx.lineTo(previewX, previewY);
                ctx.stroke();
            }
            
            // Draw cursor position marker (where base point will move to)
            ctx.setLineDash([]);
            ctx.fillStyle = '#ffff00';
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(previewX, previewY, 3 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw original base point marker (semi-transparent)
            ctx.fillStyle = '#ffff00';
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(moveBasePoint.x, moveBasePoint.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.restore();
        }
    }

    // Draw copy preview and selected objects visualization
    if (mode === 'copy') {
        // Show selected objects for copy with different highlighting (only during selection phase)
        if (copyObjectsToCopy.size > 0 && copyStep < 2) {
            ctx.save();
            ctx.strokeStyle = '#00ff00'; // Green for copy selection
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([3 / zoom, 3 / zoom]);
            ctx.globalAlpha = 0.8;
            
            for (const index of copyObjectsToCopy) {
                if (index < shapes.length) {
                    const shape = shapes[index];
                    // Draw outline around selected objects
                    drawShapeOutline(ctx, shape);
                }
            }
            ctx.restore();
        }
        
        // Draw copy preview during destination selection (floating objects)
        if (copyPreviewActive && copyStep === 2 && previewX !== undefined && previewY !== undefined) {
            // Calculate displacement so that base point moves to cursor position
            const dx = previewX - copyBasePoint.x;
            const dy = previewY - copyBasePoint.y;
            
            ctx.save();
            
            // Draw preview of copied objects (floating effect)
            for (const index of copyObjectsToCopy) {
                if (index < shapes.length) { // Safety check
                    const shape = shapes[index];
                    drawCopyPreview(ctx, shape, dx, dy, zoom);
                }
            }
            
            // Draw displacement vector (only if mouse moved from base point)
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                ctx.setLineDash([2 / zoom, 2 / zoom]);
                ctx.strokeStyle = '#00ff00'; // Green for copy
                ctx.lineWidth = 1 / zoom;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(copyBasePoint.x, copyBasePoint.y);
                ctx.lineTo(previewX, previewY);
                ctx.stroke();
            }
            
            // Draw cursor position marker (where base point will copy to)
            ctx.setLineDash([]);
            ctx.fillStyle = '#00ff00'; // Green for copy
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(previewX, previewY, 3 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw original base point marker (semi-transparent)
            ctx.fillStyle = '#00ff00'; // Green for copy
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(copyBasePoint.x, copyBasePoint.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.restore();
        }
    }

    if (snapMarker) {
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(snapMarker.x, snapMarker.y, 4 / zoom, 0, 2 * Math.PI);
        ctx.fill();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = 1.1;
    const [mx, my] = screenToWorld(e.offsetX, e.offsetY);
    zoom *= (e.deltaY < 0) ? factor : 1 / factor;
    zoom = Math.max(0.001, Math.min(1000, zoom));
    offsetX = e.offsetX - mx * zoom;
    offsetY = canvas.height - e.offsetY - my * zoom;
    
    redraw();
});

// Track double click timing for middle mouse button
let lastMiddleClickTime = 0;

// === Helper functions for drawing previews ===
function drawEllipsePreview(ctx, cursorX, cursorY) {
    if (ellipseDrawingStep === 1) {
        // Preview major radius from center to cursor (same style as circle)
        const majorRadius = Math.sqrt(Math.pow(cursorX - ellipseCenter.x, 2) + Math.pow(cursorY - ellipseCenter.y, 2));
        
        if (majorRadius > 0) {
            ctx.beginPath();
            ctx.arc(ellipseCenter.x, ellipseCenter.y, majorRadius, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        // Draw center point (simple dot like circle)
        ctx.beginPath();
        ctx.arc(ellipseCenter.x, ellipseCenter.y, 2 / zoom, 0, 2 * Math.PI);
        ctx.fill();
        
    } else if (ellipseDrawingStep === 2) {
        // Preview ellipse with major radius fixed and minor radius from cursor
        const minorRadius = Math.sqrt(Math.pow(cursorX - ellipseCenter.x, 2) + Math.pow(cursorY - ellipseCenter.y, 2));
        
        if (ellipseMajorRadius > 0 && minorRadius > 0) {
            // Use the same simple style as circle preview
            if (ctx.ellipse) {
                ctx.beginPath();
                ctx.ellipse(ellipseCenter.x, ellipseCenter.y, ellipseMajorRadius, minorRadius, 0, 0, 2 * Math.PI);
                ctx.stroke();
            } else {
                // Fallback for older browsers - but keep it simple
                ctx.save();
                ctx.translate(ellipseCenter.x, ellipseCenter.y);
                ctx.scale(ellipseMajorRadius, minorRadius);
                ctx.beginPath();
                ctx.arc(0, 0, 1, 0, 2 * Math.PI);
                ctx.restore();
                ctx.stroke();
            }
        }
        
        // Draw center point (simple dot like circle)
        ctx.beginPath();
        ctx.arc(ellipseCenter.x, ellipseCenter.y, 2 / zoom, 0, 2 * Math.PI);
        ctx.fill();
    }
}

// === Mode-specific mouse handlers ===
function handleSelectMode(x, y, e) {
    if (e.shiftKey) {
        // Multi-select mode - don't clear previous selections
    } else {
        // First clear any existing selection
        clearSelection();
    }

    // Check if we're clicking on a selected shape to start moving
    if (selectedShapes.size > 0) {
        let clickedOnSelected = false;
        for (const i of selectedShapes) {
            if (isPointInShape(shapes[i], x, y)) {
                clickedOnSelected = true;
                break;
            }
        }
        
        if (clickedOnSelected) {
            isMoving = true;
            moveStartX = x;
            moveStartY = y;
            return;
        }
    }

    // Start selection window
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
    if (!isDrawing) {
        [startX, startY] = [x, y];
        isDrawing = true;
        showLengthInput(e.offsetX, e.offsetY);
        updateHelpBar('Step 2/2: Click end point, type length + Enter, or use Escape to cancel');
        addToHistory(`Line started at (${x.toFixed(2)}, ${y.toFixed(2)}) - Enter length or click end point`);
    } else {
        // If length input is active, hide it and create line at cursor position
        if (isLengthInputActive) {
            hideLengthInput();
        }
        
        [x, y] = applyOrtho(x, y, startX, startY);
        addShape(createShapeWithProperties({ type: 'line', x1: startX, y1: startY, x2: x, y2: y }));
        isDrawing = false;
        setMode('select');
        addToHistory(`Line created from (${startX.toFixed(2)}, ${startY.toFixed(2)}) to (${x.toFixed(2)}, ${y.toFixed(2)})`);
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
    // Rectangle mode handling with step-by-step construction
    
    if (rectangleStep === 0) {
        // First click - set first point of rectangle
        rectangleStartX = x;
        rectangleStartY = y;
        rectangleStep = 1;
        isDrawing = true;
        
        showLengthInput(e.offsetX, e.offsetY);
        updateLengthInputLabel('Side length:');
        updateHelpBar('Step 2/3: Click second corner, type length + Enter, or use Escape to cancel');
        addToHistory(`Rectangle first point at (${x.toFixed(2)}, ${y.toFixed(2)}) - enter length or click for second point`);
    } else if (rectangleStep === 1) {
        // Second click - set second point with ortho if enabled
        [x, y] = applyOrtho(x, y, rectangleStartX, rectangleStartY);
        rectangleEndX = x;
        rectangleEndY = y;
        rectangleWidth = Math.sqrt(Math.pow(x - rectangleStartX, 2) + Math.pow(y - rectangleStartY, 2));
        rectangleStep = 2;
        
        if (isLengthInputActive) {
            hideLengthInput();
        }
        
        showLengthInput(e.offsetX, e.offsetY);
        updateLengthInputLabel('Width:');
        updateHelpBar('Step 3/3: Click to set width, type width + Enter, or use Escape to cancel');
        addToHistory(`Rectangle second point set - enter width or click for perpendicular side`);
    } else if (rectangleStep === 2) {
        // Third step - set width by clicking perpendicular to the first side
        // Calculate perpendicular distance from click point to the first side line
        const dx = rectangleEndX - rectangleStartX;
        const dy = rectangleEndY - rectangleStartY;
        const sideLength = Math.sqrt(dx * dx + dy * dy);
        
        // Unit vector along the first side
        const ux = dx / sideLength;
        const uy = dy / sideLength;
        
        // Vector from start to click point
        const clickDx = x - rectangleStartX;
        const clickDy = y - rectangleStartY;
        
        // Project click point onto perpendicular direction
        const perpDx = -uy; // Perpendicular unit vector
        const perpDy = ux;
        
        // Calculate perpendicular distance (this is our width)
        rectangleHeight = clickDx * perpDx + clickDy * perpDy;
        
        createFinalRectangle();
        updateHelpBar('Rectangle completed! Select another tool or object.');
        resetRectangleMode();
        
        // Reset help bar to default after 3 seconds
        setTimeout(() => {
            if (mode === 'select') {
                updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
            }
        }, 3000);
        redraw();
    }
}

function resetRectangleMode() {
    rectangleStep = 0;
    rectangleWidth = 0;
    rectangleHeight = 0;
    isDrawing = false;
    hideLengthInput();
    setMode('select');
    
    // Force redraw to clear any preview
    redraw();
}

function createFinalRectangle() {
    // Calculate the four corners of the rectangle
    const dx = rectangleEndX - rectangleStartX;
    const dy = rectangleEndY - rectangleStartY;
    const sideLength = Math.sqrt(dx * dx + dy * dy);
    
    // Unit vectors for the first side
    const ux = dx / sideLength; // Unit vector along first side
    const uy = dy / sideLength;
    const vx = -uy; // Unit vector perpendicular (for width)
    const vy = ux;
    
    // Calculate the four corners
    const corners = [
        { x: rectangleStartX, y: rectangleStartY }, // Start point
        { x: rectangleEndX, y: rectangleEndY }, // End of first side
        { x: rectangleEndX + vx * rectangleHeight, y: rectangleEndY + vy * rectangleHeight }, // Third corner
        { x: rectangleStartX + vx * rectangleHeight, y: rectangleStartY + vy * rectangleHeight } // Fourth corner
    ];
    
    // Close the rectangle by adding the first point again
    const points = [...corners, corners[0]];
    
    addShape({ 
        type: 'polyline', 
        points,
        color: currentColor,
        lineWeight: currentLineWeight,
        linetype: currentLinetype,
        layer: currentLayer
    });
    
    addToHistory(`Rectangle created: side length ${sideLength.toFixed(2)}, width ${Math.abs(rectangleHeight).toFixed(2)}`);
    
    // Force immediate redraw to show the completed rectangle
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

// Draw smooth spline curve using improved bezier curves
function drawSmoothSpline(ctx, points) {
    if (points.length < 2) return;
    
    ctx.beginPath();
    
    if (points.length === 2) {
        // Just draw a straight line for 2 points
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
    } else if (points.length === 3) {
        // For 3 points, use quadratic curve
        ctx.moveTo(points[0].x, points[0].y);
        ctx.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
    } else {
        // For 4+ points, use cubic bezier curves with smoothing
        ctx.moveTo(points[0].x, points[0].y);
        
        // Calculate control points for smooth curves
        const smoothing = 0.2; // Smoothing factor (0-1, lower = smoother)
        
        for (let i = 1; i < points.length - 1; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Calculate control points for smooth curve
            const cp1x = p1.x - smoothing * (p2.x - p0.x);
            const cp1y = p1.y - smoothing * (p2.y - p0.y);
            
            if (i === 1) {
                // First curve segment
                ctx.quadraticCurveTo(cp1x, cp1y, p1.x, p1.y);
            } else {
                // Calculate second control point from previous iteration
                const prevP = points[i - 2];
                const cp2x = p0.x + smoothing * (p1.x - prevP.x);
                const cp2y = p0.y + smoothing * (p1.y - prevP.y);
                
                ctx.bezierCurveTo(cp2x, cp2y, cp1x, cp1y, p1.x, p1.y);
            }
        }
        
        // Final segment to last point
        const lastIdx = points.length - 1;
        const secondLastIdx = lastIdx - 1;
        const thirdLastIdx = Math.max(0, lastIdx - 2);
        
        const p1 = points[secondLastIdx];
        const p2 = points[lastIdx];
        const p0 = points[thirdLastIdx];
        
        const cp2x = p1.x + smoothing * (p2.x - p0.x);
        const cp2y = p1.y + smoothing * (p2.y - p0.y);
        
        ctx.quadraticCurveTo(cp2x, cp2y, p2.x, p2.y);
    }
    
    ctx.stroke();
}

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // Middle mouse button
        e.preventDefault(); // Prevent browser default behavior
        
        // Only handle zoom to fit if we're not in an active drawing mode
        const activeDrawingModes = ['line', 'circle', 'arc', 'ellipse', 'polyline', 'polygon', 'spline', 'text'];
        const isActiveDrawing = activeDrawingModes.includes(mode) && (
            (mode === 'ellipse' && ellipseDrawingStep > 0) ||
            (mode === 'polyline' && polylinePoints.length > 0) ||
            (mode === 'polygon' && polygonPoints.length > 0) ||
            (mode === 'spline' && splinePoints.length > 0) ||
            (mode === 'arc' && arcDrawingStep > 0) ||
            (mode === 'circle' && circleDrawingStep > 0)
        );
        
        if (!isActiveDrawing) {
            const currentTime = Date.now();
            if (currentTime - lastMiddleClickTime < 400) { // Double click detected
                zoomToFit();
                redraw();
                addToHistory('Double-click zoom to fit executed');
                return; // Don't start panning after zoom to fit
            }
            lastMiddleClickTime = currentTime;
        }
        
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvas.style.cursor = 'grab';
        return;
    }

    // Prevent default to avoid conflicts with length input
    e.preventDefault();

    let [x, y] = screenToWorld(e.offsetX, e.offsetY);
    const osnap = findOsnap(x, y);
    if (osnap) [x, y] = [osnap.x, osnap.y];
    [x, y] = applySnap(x, y);

    // Use mode-specific handlers
    switch(mode) {
        case 'select':
            handleSelectMode(x, y, e);
            break;
        case 'move':
            handleMoveMode(x, y, e);
            break;
        case 'copy':
            handleCopyMode(x, y, e);
            break;
        case 'rotate':
            handleRotateMode(x, y, e);
            break;
        case 'scale':
            handleScaleMode(x, y, e);
            break;
        case 'line':
            handleLineMode(x, y, e);
            break;
        case 'polyline':
            handlePolylineMode(x, y, e);
            break;
        case 'circle':
            handleCircleMode(x, y, e);
            break;
        case 'ellipse':
            handleEllipseMode(x, y, e);
            break;
        case 'arc':
            handleArcMode(x, y, e);
            break;
        case 'rectangle':
            handleRectangleMode(x, y, e);
            break;
        case 'polygon':
            if (polygonStep === 0) {
                // First click: set center and ask for number of sides
                polygonCenterX = x;
                polygonCenterY = y;
                polygonStep = 1;
                isDrawing = true;
                showLengthInput(e.offsetX, e.offsetY);
                updateLengthInputLabel('Number of sides:');
                updateHelpBar('Step 2/4: Enter number of sides (3-50) for polygon');
                addToHistory(`Polygon center set at (${x.toFixed(2)}, ${y.toFixed(2)}) - enter number of sides`);
            } else if (polygonStep === 3) {
                // Click to set radius and rotation based on distance and angle from center
                const radius = Math.sqrt(Math.pow(x - polygonCenterX, 2) + Math.pow(y - polygonCenterY, 2));
                const angle = Math.atan2(y - polygonCenterY, x - polygonCenterX);
                polygonRadius = radius;
                polygonAngle = angle;
                createFinalPolygon();
                updateHelpBar('Polygon completed! Returning to selection mode...');
                setTimeout(() => {
                    updateHelpBar('Use drawing tools to create shapes');
                }, 2000);
                resetPolygonMode();
                redraw();
            }
            break;
        case 'spline':
            handleSplineMode(x, y, e);
            break;
        case 'hatch':
            hatchPoints.push({ x, y });
            addToHistory(`Hatch point ${hatchPoints.length} at (${x.toFixed(2)}, ${y.toFixed(2)})`);
            redraw();
            break;
        case 'point':
            addShape(createShapeWithProperties({ type: 'point', x, y }));
            updateHelpBar('Point placed! Click to place another point or press Escape to finish');
            addToHistory(`Point created at (${x.toFixed(2)}, ${y.toFixed(2)})`);
            redraw();
            break;
        case 'text':
            textPosition = { x, y };
            // Show text input dialog
            const [sx, sy] = worldToScreen(x, y);
            textInputOverlay.style.left = `${sx}px`;
            textInputOverlay.style.top = `${sy}px`;
            textInputOverlay.style.display = 'block';
            updateHelpBar('Step 2/2: Enter text and click OK or press Enter to place');
            textInput.focus();
            break;
        case 'paste':
            pasteShapes(x, y);
            break;
        case 'rotate':
            handleRotateMode(x, y, e);
            break;
        case 'scale':
            handleScaleMode(x, y, e);
            break;
        case 'mirror':
            handleMirrorMode(x, y, e);
            break;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 1) { // Middle mouse button
        isPanning = false;
        canvas.style.cursor = 'crosshair';
        return;
    }

    if (isMoving) {
        isMoving = false;
        return;
    }

    if (mode === 'select' && isDrawing) {
        isDrawing = false;
        selectionWindow.style.display = 'none';

        let [x, y] = screenToWorld(e.offsetX, e.offsetY);
        const osnap = findOsnap(x, y);
        if (osnap) [x, y] = [osnap.x, osnap.y];
        [x, y] = applySnap(x, y);

        // Determine if this was a click or a drag
        const dragDistance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));

        if (dragDistance < 5 / zoom) {
            // Single click - select single object
            let found = false;
            for (let i = 0; i < shapes.length; i++) {
                const shape = shapes[i];
                if (isPointInShape(shape, x, y)) {
                    // Check if shape can be modified (layer not locked)
                    if (typeof canModifyShape === 'function' && !canModifyShape(shape)) {
                        addToHistory(`Cannot select object on locked layer: ${shape.layer || 'Default'}`);
                        found = true; // Still consider it found, but don't select
                        break;
                    }
                    
                    if (e.shiftKey && selectedShapes.has(i)) {
                        // If shift is held and object is already selected, deselect it
                        selectedShapes.delete(i);
                    } else {
                        selectedShapes.add(i);
                    }
                    found = true;
                    // Shape selected
                    break;
                }
            }
            if (!found) {
                // No shape found at cursor position
            }
            addToHistory(`Selected ${selectedShapes.size} objects`);
        } else {
            // Drag - window selection
            const isWindowSelection = e.offsetX > selectionWindowStartX;
            let selectedCount = 0;
            let lockedCount = 0;

            for (let i = 0; i < shapes.length; i++) {
                const shape = shapes[i];
                let shouldSelect = false;

                if (isWindowSelection) {
                    // Window selection - must be entirely within window
                    shouldSelect = isShapeInWindow(shape, startX, startY, x, y);
                } else {
                    // Crossing selection - intersects with window
                    shouldSelect = doesShapeIntersectWindow(shape, startX, startY, x, y);
                }

                if (shouldSelect) {
                    // Check if shape can be modified (layer not locked)
                    if (typeof canModifyShape === 'function' && !canModifyShape(shape)) {
                        lockedCount++;
                        continue; // Skip locked shapes
                    }
                    
                    if (e.shiftKey && selectedShapes.has(i)) {
                        selectedShapes.delete(i);
                    } else {
                        selectedShapes.add(i);
                        selectedCount++;
                    }
                }
            }
            
            let message = `${isWindowSelection ? 'Window' : 'Crossing'} selected ${selectedShapes.size} objects`;
            if (lockedCount > 0) {
                message += ` (${lockedCount} objects skipped - on locked layers)`;
            }
            addToHistory(message);
        }

        redraw();
        
        // Update properties panel if it's open
        const propertiesPanel = document.getElementById('propertiesPanel');
        if (propertiesPanel && propertiesPanel.style.display !== 'none') {
            updatePropertiesPanel();
        }
    }
});

let selectionWindowStartX = 0;
let selectionWindowStartY = 0;

canvas.addEventListener('mousemove', (e) => {
    // Store current mouse position
    currentMouseX = e.offsetX;
    currentMouseY = e.offsetY;
    if (isPanning) {
        offsetX += e.clientX - panStartX;
        offsetY -= e.clientY - panStartY;
        panStartX = e.clientX;
        panStartY = e.clientY;
        redraw();
        return;
    }

    if (isMoving) {
        let [x, y] = screenToWorld(e.offsetX, e.offsetY);
        const osnap = findOsnap(x, y);
        if (osnap) [x, y] = [osnap.x, osnap.y];
        [x, y] = applySnap(x, y);
        
        const dx = x - moveStartX;
        const dy = y - moveStartY;
        moveSelectedShapes(dx, dy);
        moveStartX = x;
        moveStartY = y;
        return;
    }

    let [x, y] = screenToWorld(e.offsetX, e.offsetY);
    const osnap = findOsnap(x, y);
    snapMarker = osnap;
    if (osnap) [x, y] = [osnap.x, osnap.y];
    [x, y] = applySnap(x, y);

    if (mode === 'select' && isDrawing) {
        // Update selection window
        const [sx, sy] = worldToScreen(startX, startY);
        const [ex, ey] = worldToScreen(x, y);

        selectionWindow.style.left = `${Math.min(sx, ex)}px`;
        selectionWindow.style.top = `${Math.min(sy, ey)}px`;
        selectionWindow.style.width = `${Math.abs(ex - sx)}px`;
        selectionWindow.style.height = `${Math.abs(ey - sy)}px`;

        // Set class based on selection type (window or crossing)
        const isWindowSelection = e.offsetX > selectionWindowStartX;
        if (isWindowSelection) {
            selectionWindow.className = 'selection-window window-selection';
        } else {
            selectionWindow.className = 'selection-window crossing-selection';
        }
    }
    else if ((mode === 'line' || mode === 'circle' || mode === 'ellipse' || mode === 'polygon') && isDrawing) {
        [x, y] = applyOrtho(x, y, startX, startY);
        [previewX, previewY] = [x, y];
        
        // Update length input position and direction for line, circle and ellipse modes
        if (mode === 'line') {
            updateLengthInputPosition(e.offsetX, e.offsetY);
            // Calculate normalized direction vector
            const dx = x - startX;
            const dy = y - startY;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
                lineDirection.x = dx / length;
                lineDirection.y = dy / length;
            }
        } else if (mode === 'circle') {
            updateLengthInputPosition(e.offsetX, e.offsetY);
            // For circle, we don't need direction, just radius (distance from center)
        } else if (mode === 'ellipse' && ellipsePreviewActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
            // For ellipse, distance from center determines current radius
        }
        
        redraw();
    }
    else if (mode === 'ellipse' && ellipsePreviewActive) {
        [previewX, previewY] = [x, y];
        
        // Update length input position if active
        if (isLengthInputActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
        }
        
        redraw();
    }
    else if (mode === 'rectangle' && isDrawing) {
        // Special ortho handling for rectangle based on step
        if (rectangleStep === 1) {
            // First step - applying ortho to first side direction
            [x, y] = applyOrtho(x, y, rectangleStartX, rectangleStartY);
        }
        // For step 2, we don't apply ortho as the perpendicular is automatic
        
        [previewX, previewY] = [x, y];
        
        // Update length input position if active
        if (isLengthInputActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
        }
        
        redraw();
    }
    else if (mode === 'arc' && arcPoints.length > 0) {
        [previewX, previewY] = [x, y];
        redraw();
    }
    else if (mode === 'polyline' && polylinePoints.length > 0) {
        const last = polylinePoints[polylinePoints.length - 1];
        [x, y] = applyOrtho(x, y, last.x, last.y);
        [previewX, previewY] = [x, y];
        
        // Always show preview when we have points
        polylinePreviewActive = true;
        
        // Update length input position if active
        if (isLengthInputActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
            
            // Calculate normalized direction vector for length input
            const dx = x - last.x;
            const dy = y - last.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
                polylineDirection.x = dx / length;
                polylineDirection.y = dy / length;
            }
        }
        
        redraw();
    }
    else if (mode === 'spline' && splinePoints.length > 0) {
        [previewX, previewY] = [x, y];
        
        // Always show preview when we have points
        splinePreviewActive = true;
        
        // Update length input position if active
        if (isLengthInputActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
            
            // Calculate normalized direction vector for length input
            const last = splinePoints[splinePoints.length - 1];
            const dx = x - last.x;
            const dy = y - last.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
                polylineDirection.x = dx / length; // Reuse polylineDirection for spline
                polylineDirection.y = dy / length;
            }
        }
        
        redraw();
    }
    else if (mode === 'move' && movePreviewActive && moveStep === 2) {
        // Update preview coordinates for move mode - this makes objects follow cursor
        [previewX, previewY] = [x, y];
        redraw();
    }
    else if (mode === 'copy' && copyPreviewActive && copyStep === 2) {
        // Update preview coordinates for copy mode - this makes objects follow cursor
        [previewX, previewY] = [x, y];
        redraw();
    }
    else if (mode === 'rotate' && rotateStep === 2) {
        // Update rotation angle preview
        const dx = x - rotateBasePoint.x;
        const dy = y - rotateBasePoint.y;
        const currentAngle = Math.atan2(dy, dx);
        updateHelpBar(`Rotation angle: ${(currentAngle * 180 / Math.PI).toFixed(1)}°`);
        redraw();
    }
    else if (mode === 'scale' && scaleStep === 2) {
        // Update scale factor preview
        const distance = Math.sqrt((x - scaleBasePoint.x) ** 2 + (y - scaleBasePoint.y) ** 2);
        const factor = distance / scaleStartDistance;
        updateHelpBar(`Scale factor: ${factor.toFixed(2)}`);
        redraw();
    }

    if (!isDrawing) redraw();

    cursorCoordsElement.textContent = `X: ${x.toFixed(2)} Y: ${y.toFixed(2)}`;
});

canvas.addEventListener('mouseleave', () => {
    cursorCoordsElement.textContent = 'X: - Y: -';
});

// Helper function to check if user is currently typing in an input field
function isUserTypingInInput() {
    const activeElement = document.activeElement;
    return activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
    );
}

document.addEventListener('keydown', (e) => {
    // Handle Ctrl+Z (Undo) and Ctrl+Y (Redo)
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        // File Operations
        if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            newDrawing();
            return;
        }
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
        // Layer Manager with Ctrl+L (like AutoCAD)
        if (e.key === 'l' || e.key === 'L') {
            e.preventDefault();
            toggleLayerPanel();
            addToHistory('Layer Manager toggled (Ctrl+L)');
            return;
        }
        // Properties Panel with Ctrl+P (like AutoCAD)
        if (e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            togglePropertiesPanel();
            addToHistory('Properties Panel toggled (Ctrl+P)');
            return;
        }
    }
    
    if (e.key === 'Escape') {
        // Hide polygon input if active
        if (polygonInputActive) {
            cancelPolygonSettings();
            return;
        }
        
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
            updateHelpBar('Step 1/3: Click first corner for rectangle');
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
        else if (mode === 'scale' && scaleStep > 0) {
            resetScaleMode();
            updateHelpBar('Scale operation cancelled. Use drawing tools to create shapes.');
            addToHistory('Scale operation cancelled');
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

function handleLengthInput(length) {
    if (mode === 'line' && isDrawing && length > 0) {
        // Calculate end point based on direction and length
        const angle = Math.atan2(lineDirection.y, lineDirection.x);
        const endX = startX + length * Math.cos(angle);
        const endY = startY + length * Math.sin(angle);
        
        // Create the line
        addShape(createShapeWithProperties({ type: 'line', x1: startX, y1: startY, x2: endX, y2: endY }));
        
        // Reset state
        isDrawing = false;
        hideLengthInput();
        updateHelpBar(`Line created! Length: ${length.toFixed(2)} units. Click for next line or select another tool.`);
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
    } else if (mode === 'rectangle' && isDrawing && length > 0) {
        // Handle rectangle input based on current step
        if (rectangleStep === 1) {
            // Setting first side length manually based on current mouse direction
            let dx = previewX - rectangleStartX;
            let dy = previewY - rectangleStartY;
            
            // Apply ortho to the direction if ortho mode is enabled
            if (orthoMode) {
                [dx, dy] = applyOrtho(dx, dy, 0, 0);
            }
            
            const currentLength = Math.sqrt(dx * dx + dy * dy);
            
            if (currentLength > 0) {
                // Normalize direction and apply length
                const ux = dx / currentLength;
                const uy = dy / currentLength;
                rectangleEndX = rectangleStartX + length * ux;
                rectangleEndY = rectangleStartY + length * uy;
                rectangleWidth = length;
                rectangleStep = 2;
                
                // Update preview coordinates to current mouse position for width preview
                const [mouseWorldX, mouseWorldY] = screenToWorld(currentMouseX, currentMouseY);
                previewX = mouseWorldX;
                previewY = mouseWorldY;
                
                hideLengthInput();
                showLengthInput(currentMouseX, currentMouseY);
                updateLengthInputLabel('Width:');
                updateHelpBar('Step 3/3: Click to set width, type width + Enter, or use Escape to cancel');
                redraw(); // Redraw to show the first side
                addToHistory(`Rectangle first side set to ${length.toFixed(2)} - enter width or click perpendicular`);
            }
        } else if (rectangleStep === 2) {
            // Setting width manually (perpendicular distance)
            rectangleHeight = length;
            
            // Update preview coordinates before finalizing
            const [mouseWorldX, mouseWorldY] = screenToWorld(currentMouseX, currentMouseY);
            previewX = mouseWorldX;
            previewY = mouseWorldY;
            
            createFinalRectangle();
            updateHelpBar('Rectangle completed! Select another tool or object.');
            resetRectangleMode();
            
            // Reset help bar to default after 3 seconds
            setTimeout(() => {
                if (mode === 'select') {
                    updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
                }
            }, 3000);
            
            // Additional redraw to ensure rectangle is visible immediately
            redraw();
        }
    } else if (mode === 'polygon' && polygonStep >= 1) {
        // Handle polygon input based on current step
        if (handlePolygonLengthInput(length)) {
            hideLengthInput();
            redraw();
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
    }
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
             (mode === 'rectangle' && (rectangleStep === 1 || rectangleStep === 2)) ||
             (mode === 'polyline' && polylinePoints.length > 0)) &&
            !e.relatedTarget) { // Only refocus if blur wasn't caused by clicking on another element
            lengthInput.focus();
        }
    }, 100);
});

// Add event listener for text input
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        confirmText();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelText();
    }
});

// Text input functions
function confirmText() {
    if (textInput.value.trim()) {
        addShape(createShapeWithProperties({
            type: 'text',
            x: textPosition.x,
            y: textPosition.y,
            content: textInput.value,
            size: 12 / zoom
        }));
        updateHelpBar('Text placed! Click to place another text or press Escape to finish');
        redraw();
    }
    cancelText();
}

function cancelText() {
    textInput.value = '';
    textInputOverlay.style.display = 'none';
    // Return to step 1 help message
    if (mode === 'text') {
        updateHelpBar('Step 1/2: Click to place text');
    }
}

window.addEventListener('resize', () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    redraw();
});

// Add DXF file input handler
document.getElementById('dxfInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        importDXF(file);
    }
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

// Prompt for new layer name
function promptNewLayer() {
    const name = prompt('Enter new layer name:');
    if (name && name.trim()) {
        createNewLayer(name.trim());
    }
}





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
    
    // AutoCAD-like behavior: if using non-ByLayer lineweight, mark as temporary
    // and reset to ByLayer after creating the object
    if (currentLineWeight !== 'byLayer' && !isTemporaryLineweight) {
        isTemporaryLineweight = true;
        currentLineWeight = 'byLayer';
        updateLineweightDisplay();
        addToHistory('Lineweight reset to ByLayer');
    }
    
    // Auto-return to select mode after creating a shape (AutoCAD-like behavior)
    if (mode !== 'select' && mode !== 'polyline' && mode !== 'spline' && mode !== 'hatch') {
        setMode('select');
    }
}

// === POLYGON INPUT FUNCTIONS ===

function showPolygonInput(x, y) {
    polygonInputActive = true;
    startX = x;
    startY = y;
    
    // Set current values
    document.getElementById('polygonSidesInput').value = polygonSides;
    document.getElementById('polygonDiameterInput').value = polygonDiameter;
    
    // Set radio button state
    document.getElementById('polygonRadiusMode').checked = (polygonMode === 'radius');
    document.getElementById('polygonDiameterMode').checked = (polygonMode === 'diameter');
    
    // Enable/disable diameter input based on mode
    updatePolygonDiameterInput();
    
    // Show the overlay
    document.getElementById('polygonInputOverlay').style.display = 'block';
    
    // Focus on sides input
    document.getElementById('polygonSidesInput').focus();
    document.getElementById('polygonSidesInput').select();
    
    addToHistory(`Polygon center at (${x.toFixed(2)}, ${y.toFixed(2)}) - configure settings`);
}

function updatePolygonDiameterInput() {
    const diameterInput = document.getElementById('polygonDiameterInput');
    const diameterMode = document.getElementById('polygonDiameterMode').checked;
    
    diameterInput.disabled = !diameterMode;
    if (diameterMode) {
        diameterInput.focus();
    }
}

function confirmPolygonSettings() {
    const sidesInput = document.getElementById('polygonSidesInput');
    const diameterInput = document.getElementById('polygonDiameterInput');
    const radiusMode = document.getElementById('polygonRadiusMode').checked;
    
    // Validate sides
    const sides = parseInt(sidesInput.value);
    if (sides < 3 || sides > 50) {
        alert('Number of sides must be between 3 and 50');
        sidesInput.focus();
        return;
    }
    
    // Update global settings
    polygonSides = sides;
    polygonMode = radiusMode ? 'radius' : 'diameter';
    
    if (polygonMode === 'diameter') {
        const diameter = safeParseFloat(diameterInput.value, 0, 'polygon diameter');
        if (diameter <= 0) {
            alert('Diameter must be greater than 0');
            diameterInput.focus();
            return;
        }
        polygonDiameter = diameter;
        
        // Create polygon immediately with specified diameter
        const radius = diameter / 2;
        createPolygon(startX, startY, radius);
        isDrawing = false;
        setMode('select');
    } else {
        // Switch to radius drawing mode
        isDrawing = true;
        addToHistory(`Click to set polygon radius (${polygonSides} sides)`);
    }
    
    hidePolygonInput();
    redraw();
}

function cancelPolygonSettings() {
    hidePolygonInput();
    setMode('select');
    addToHistory('Polygon creation cancelled');
}

function hidePolygonInput() {
    document.getElementById('polygonInputOverlay').style.display = 'none';
    polygonInputActive = false;
}

// Make functions globally accessible
window.confirmPolygonSettings = confirmPolygonSettings;
window.cancelPolygonSettings = cancelPolygonSettings;
window.updatePolygonDiameterInput = updatePolygonDiameterInput;

function createPolygon(centerX, centerY, radius) {
    const points = [];
    for (let i = 0; i < polygonSides; i++) {
        const angle = i * 2 * Math.PI / polygonSides - Math.PI/2;
        points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    }
    
    addShape({ 
        type: 'polygon', 
        points,
        color: currentColor,
        lineWeight: currentLineWeight,
        linetype: currentLinetype,
        layer: currentLayer
    });
    
    addToHistory(`Polygon created: ${polygonSides} sides, radius ${radius.toFixed(2)}`);
}

// === NEW POLYGON FUNCTIONS ===

function resetPolygonMode() {
    polygonStep = 0;
    polygonAngle = 0;
    isDrawing = false;
    hidePolygonRadiusTypeSelector();
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
    
    addShape({ 
        type: 'polygon', 
        points,
        color: currentColor,
        lineWeight: currentLineWeight,
        linetype: currentLinetype,
        layer: currentLayer
    });
    
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
            // Show radius type selector
            showPolygonRadiusTypeSelector();
            updateHelpBar('Step 3/4: Choose radius type (Inscribed or Circumscribed)');
            addToHistory(`Number of sides set to ${polygonSides} - choose radius type`);
        } else {
            addToHistory('Number of sides must be between 3 and 50', 'error');
            return false;
        }
    } else if (polygonStep === 3) {
        // Setting radius manually
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

// === POLYGON RADIUS TYPE SELECTOR FUNCTIONS ===
function showPolygonRadiusTypeSelector() {
    const [sx, sy] = worldToScreen(polygonCenterX, polygonCenterY);
    polygonRadiusTypeSelector.style.left = `${sx + 20}px`;
    polygonRadiusTypeSelector.style.top = `${sy - 40}px`;
    polygonRadiusTypeSelector.style.display = 'block';
    
    // Update button states
    polygonInscribedBtn.classList.toggle('active', polygonRadiusType === 'inscribed');
    polygonCircumscribedBtn.classList.toggle('active', polygonRadiusType === 'circumscribed');
}

function hidePolygonRadiusTypeSelector() {
    polygonRadiusTypeSelector.style.display = 'none';
}

function selectPolygonRadiusType(type) {
    polygonRadiusType = type;
    polygonStep = 3; // Move to radius setting step
    hidePolygonRadiusTypeSelector();
    
    // Show length input for radius
    showLengthInput();
    const label = type === 'inscribed' ? 'Inscribed radius:' : 'Circumscribed radius:';
    updateLengthInputLabel(label);
    setLengthInputValue('');
    updateHelpBar('Step 4/4: Enter radius value or click to set radius and rotation');
    
    const typeText = type === 'inscribed' ? 'inscribed' : 'circumscribed';
    addToHistory(`Selected ${typeText} radius - enter value or click point`);
}

function drawPolygonPreview(ctx, centerX, centerY, radius, rotationAngle) {
    // Calculate actual radius based on type
    let actualRadius = radius;
    if (polygonRadiusType === 'inscribed') {
        // For inscribed polygon, convert apothem to circumradius
        actualRadius = radius / Math.cos(Math.PI / polygonSides);
    }
    
    ctx.beginPath();
    for (let i = 0; i <= polygonSides; i++) {
        const angle = i * 2 * Math.PI / polygonSides - Math.PI/2 + rotationAngle;
        const x = centerX + actualRadius * Math.cos(angle);
        const y = centerY + actualRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

// === GLOBAL FUNCTIONS FOR HTML ===
window.selectPolygonRadiusType = selectPolygonRadiusType;

// Make copy command globally accessible
window.startCopyCommand = startCopyCommand;

// Make layer functions globally accessible
window.toggleLayerPanel = toggleLayerPanel;
window.setCurrentLayer = setCurrentLayer;
window.setCurrentColor = setCurrentColor;
window.setCurrentLineweight = setCurrentLineweight;
window.toggleLineweightDisplay = toggleLineweightDisplay;
window.promptNewLayer = promptNewLayer;
window.openColorPalette = openColorPalette;

// Make layer functions globally accessible
window.toggleLayerPanel = toggleLayerPanel;
window.updateMinimalLayerPanel = updateMinimalLayerPanel;
window.setLayerLineweight = setLayerLineweight;
window.initDragLayer = initDragLayer;

// Make drawing mode functions globally accessible 
window.setMode = setMode;
window.undo = undo;
window.redo = redo;
window.startMoveCommand = startMoveCommand;
window.startRotateCommand = startRotateCommand;
window.startScaleCommand = startScaleCommand;
window.deleteSelectedShapes = deleteSelectedShapes;
window.confirmText = confirmText;
window.cancelText = cancelText;

// Make grid and snap functions globally accessible
window.toggleGrid = toggleGrid;
window.toggleOrtho = toggleOrtho;
window.toggleSnap = toggleSnap;
window.toggleObjectSnap = toggleObjectSnap;
window.toggleCommandHistory = toggleCommandHistory;

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

// === FILE OPERATIONS ===

/**
 * Create a new empty drawing
 */
function newDrawing() {
    if (shapes.length > 0) {
        if (!confirm('Create new drawing? Current work will be lost.')) {
            return;
        }
    }
    
    // Clear all data
    shapes = [];
    selectedShapes.clear();
    
    // Reset layers to default
    layers = [
        { name: '0', color: '#ffffff', visible: true, locked: false, lineWeight: 'byLayer', linetype: 'continuous' }
    ];
    currentLayer = '0';
    
    // Reset view
    zoom = 1.0;
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    
    // Clear history
    undoStack = [];
    redoStack = [];
    
    updateLayerSelector();
    redraw();
    addToHistory('New drawing created');
}

/**
 * Open file dialog to load a drawing
 */
function openDrawing() {
    const fileInput = document.getElementById('fileInput');
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            loadDrawing(file);
        }
        // Reset input
        e.target.value = '';
    };
    fileInput.click();
}

/**
 * Load drawing from file
 */
function loadDrawing(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate file format
            if (!data.version || !data.shapes || !data.layers) {
                throw new Error('Invalid Web1CAD file format');
            }
            
            // Load shapes
            shapes = data.shapes || [];
            
            // Load layers
            layers = data.layers || [
                { name: '0', color: '#ffffff', visible: true, locked: false, lineWeight: 'byLayer', linetype: 'continuous' }
            ];
            
            // Load settings
            currentLayer = data.currentLayer || '0';
            currentColor = data.currentColor || 'byLayer';
            currentLineWeight = data.currentLineWeight || 'byLayer';
            showGrid = data.showGrid !== undefined ? data.showGrid : true;
            snapEnabled = data.snapEnabled !== undefined ? data.snapEnabled : true;
            orthoMode = data.orthoMode !== undefined ? data.orthoMode : false;
            objectSnapEnabled = data.objectSnapEnabled !== undefined ? data.objectSnapEnabled : true;
            
            // Load view settings if available
            if (data.view) {
                zoom = data.view.zoom || 1.0;
                offsetX = data.view.offsetX || canvas.width / 2;
                offsetY = data.view.offsetY || canvas.height / 2;
            }
            
            // Clear selection and history
            selectedShapes.clear();
            undoStack = [];
            redoStack = [];
            
            // Update UI
            updateLayerSelector();
            updateColorDisplay();
            updateButton('gridBtn', showGrid);
            updateButton('snapBtn', snapEnabled);
            updateButton('orthoBtn', orthoMode);
            updateButton('osnapBtn', objectSnapEnabled);
            
            redraw();
            addToHistory(`Drawing loaded: ${file.name} (${shapes.length} objects, ${layers.length} layers)`);
            
        } catch (error) {
            addToHistory(`Failed to load file: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

/**
 * Save current drawing to file
 */
function saveDrawing() {
    try {
        const data = {
            version: '1.0',
            title: 'Web1CAD Drawing',
            created: new Date().toISOString(),
            author: 'Oleh Korobkov',
            copyright: '© 2025 Oleh Korobkov. All rights reserved.',
            software: 'Web1CAD - Professional 2D CAD System',
            license: 'Proprietary - Unauthorized use prohibited',
            shapes: shapes,
            layers: layers,
            currentLayer: currentLayer,
            currentColor: currentColor,
            currentLineWeight: currentLineWeight,
            showGrid: showGrid,
            snapEnabled: snapEnabled,
            orthoMode: orthoMode,
            objectSnapEnabled: objectSnapEnabled,
            view: {
                zoom: zoom,
                offsetX: offsetX,
                offsetY: offsetY
            }
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `drawing_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wcd`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addToHistory(`Drawing saved: ${a.download} (${shapes.length} objects, ${layers.length} layers)`);
        
    } catch (error) {
        addToHistory(`Failed to save drawing: ${error.message}`, 'error');
    }
}

// === END OF CAD APPLICATION ===

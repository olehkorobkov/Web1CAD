let undoStack = [];
let redoStack = [];

function saveState(operationName = 'Unknown Operation') {
    const state = {
        shapes: safeDeepCopy(shapes, [], 'shapes'),
        selectedShapes: new Set(selectedShapes),
        layers: safeDeepCopy(layers, [], 'layers'),
        currentLayer: currentLayer,
        operationName: operationName,
        timestamp: Date.now()
    };
    
    if (!Array.isArray(state.shapes) || !Array.isArray(state.layers)) {
        return;
    }
    
    undoStack.push(state);
    if (undoStack.length > MAX_UNDO_STEPS) {
        undoStack.shift();
    }
    redoStack = [];

    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length === 0) {
        addToHistory('Nothing to undo', 'warning');
        return false;
    }
    
    const currentState = {
        shapes: safeDeepCopy(shapes, [], 'current shapes for redo'),
        selectedShapes: new Set(selectedShapes),
        layers: safeDeepCopy(layers, [], 'current layers for redo'),
        currentLayer: currentLayer,
        operationName: 'Before Undo',
        timestamp: Date.now()
    };
    
    if (Array.isArray(currentState.shapes) && Array.isArray(currentState.layers)) {
        redoStack.push(currentState);
    } else {
        addToHistory('Warning: Could not save current state for redo', 'warning');
    }
    
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
            addToHistory('Error: No state to undo', 'error');
            return false;
        }
    } catch (error) {
        addToHistory('Error: Failed to undo - ' + error.message, 'error');
        return false;
    }
    updateUndoRedoButtons();
    redraw();
    
    addToHistory(`Undone: ${operationName}`);
    updateHelpBar(`Undone: ${operationName}`);
    
    return true;
}

function redo() {
    if (redoStack.length === 0) {
        addToHistory('Nothing to redo', 'warning');
        return false;
    }
    
    const currentState = {
        shapes: safeDeepCopy(shapes, [], 'current shapes for undo'),
        selectedShapes: new Set(selectedShapes),
        layers: safeDeepCopy(layers, [], 'current layers for undo'),
        currentLayer: currentLayer,
        operationName: 'Before Redo',
        timestamp: Date.now()
    };
    
    if (Array.isArray(currentState.shapes) && Array.isArray(currentState.layers)) {
        undoStack.push(currentState);
    } else {
        addToHistory('Warning: Could not save current state for undo', 'warning');
    }
    
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
            addToHistory('Error: No state to redo', 'error');
            return false;
        }
    } catch (error) {
        addToHistory('Error: Failed to redo - ' + error.message, 'error');
        return false;
    }
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
            `Undo: ${undoStack[undoStack.length - 1].operationName || 'Unknown Operation'}` : 
            'Nothing to undo';
    }
    
    if (redoBtn) {
        redoBtn.disabled = redoStack.length === 0;
        redoBtn.title = redoStack.length > 0 ? 
            `Redo: ${redoStack[redoStack.length - 1].operationName || 'Unknown Operation'}` : 
            'Nothing to redo';
    }
}
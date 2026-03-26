let undoStack = [];
let redoStack = [];

// ============================================================================
// PHASE 3.4: Command Pattern Integration
// ============================================================================
// Flag to control undo/redo mode:
// - false: USE SNAPSHOT METHOD (current, stable, tested)
// - true:  USE COMMAND PATTERN (new, more efficient, less RAM)
// 
// Both methods can coexist in same stack. Each entry tracks its type.
// ============================================================================
let useCommandPattern = false;  // START WITH SNAPSHOTS (safe default)

/**
 * Register a command for undo/redo instead of full snapshot
 * 
 * This is called from integration points (shapes.js, move.js, etc.)
 * instead of saveState() when command pattern is enabled.
 * 
 * @param {Command} command - Command object with execute/undo/redo methods
 * @throws {Error} If command invalid
 */
function registerCommand(command) {
    if (!command || typeof command.undo !== 'function' || typeof command.redo !== 'function') {
        console.error('registerCommand: Invalid command object', command);
        return;
    }
    
    // Store command directly in undo stack
    undoStack.push({
        type: 'command',
        command: command,
        timestamp: Date.now()
    });
    
    if (undoStack.length > MAX_UNDO_STEPS) {
        undoStack.shift();
    }
    
    redoStack = [];
    updateUndoRedoButtons();
    
    if (typeof addToHistory === 'function') {
        addToHistory(`Command: ${command.getDescription()}`);
    }
}

function saveState(operationName = 'Unknown Operation') {
    // ========================================================================
    // NEW: Check if should use Command Pattern instead of snapshots
    // ========================================================================
    if (useCommandPattern && typeof createPropertyChangeCommand === 'function') {
        // When command pattern enabled, saveState() becomes a no-op
        // Commands are registered via registerCommand() instead
        // This compatibility shim maintains backward compatibility
        return;
    }
    
    // ========================================================================
    // ORIGINAL SNAPSHOT-BASED METHOD (unchanged)
    // ========================================================================
    const state = {
        type: 'snapshot',  // Mark as snapshot (for hybrid stack support)
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
    
    const entry = undoStack[undoStack.length - 1];
    let operationName = 'Unknown Operation';
    
    // ========================================================================
    // NEW: Handle Command Pattern entries
    // ========================================================================
    if (entry.type === 'command' && entry.command) {
        try {
            // Save current state for redo
            const currentState = {
                type: 'snapshot',
                shapes: safeDeepCopy(shapes, [], 'current shapes for redo'),
                selectedShapes: new Set(selectedShapes),
                layers: safeDeepCopy(layers, [], 'current layers for redo'),
                currentLayer: currentLayer,
                operationName: 'Before Undo',
                timestamp: Date.now()
            };
            
            if (Array.isArray(currentState.shapes) && Array.isArray(currentState.layers)) {
                redoStack.push(currentState);
            }
            
            // Execute command's undo
            const command = entry.command;
            command.undo();
            operationName = command.getDescription();
            
            undoStack.pop();
        } catch (error) {
            addToHistory('Error: Command undo failed - ' + error.message, 'error');
            return false;
        }
        
        updateUndoRedoButtons();
        redraw();
        addToHistory(`Undone: ${operationName}`);
        updateHelpBar(`Undone: ${operationName}`);
        return true;
    }
    
    // ========================================================================
    // ORIGINAL SNAPSHOT-BASED METHOD (unchanged)
    // ========================================================================
    const currentState = {
        type: 'snapshot',
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
    
    const entry = redoStack[redoStack.length - 1];
    let operationName = 'Unknown Operation';
    
    // ========================================================================
    // NEW: Handle Command Pattern entries
    // ========================================================================
    if (entry.type === 'command' && entry.command) {
        try {
            // Save current state for undo
            const currentState = {
                type: 'snapshot',
                shapes: safeDeepCopy(shapes, [], 'current shapes for undo'),
                selectedShapes: new Set(selectedShapes),
                layers: safeDeepCopy(layers, [], 'current layers for undo'),
                currentLayer: currentLayer,
                operationName: 'Before Redo',
                timestamp: Date.now()
            };
            
            if (Array.isArray(currentState.shapes) && Array.isArray(currentState.layers)) {
                undoStack.push(currentState);
            }
            
            // Execute command's redo
            const command = entry.command;
            command.redo();
            operationName = command.getDescription();
            
            redoStack.pop();
        } catch (error) {
            addToHistory('Error: Command redo failed - ' + error.message, 'error');
            return false;
        }
        
        updateUndoRedoButtons();
        redraw();
        addToHistory(`Redone: ${operationName}`);
        updateHelpBar(`Redone: ${operationName}`);
        return true;
    }
    
    // ========================================================================
    // ORIGINAL SNAPSHOT-BASED METHOD (unchanged)
    // ========================================================================
    const currentState = {
        type: 'snapshot',
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
        
        let undoText = 'Nothing to undo';
        if (undoStack.length > 0) {
            const entry = undoStack[undoStack.length - 1];
            // ================================================================
            // NEW: Support both Command and Snapshot entries
            // ================================================================
            if (entry.type === 'command' && entry.command) {
                undoText = `Undo: ${entry.command.getDescription()}`;
            } else if (entry.operationName) {
                undoText = `Undo: ${entry.operationName}`;
            }
        }
        undoBtn.title = undoText;
    }
    
    if (redoBtn) {
        redoBtn.disabled = redoStack.length === 0;
        
        let redoText = 'Nothing to redo';
        if (redoStack.length > 0) {
            const entry = redoStack[redoStack.length - 1];
            // ================================================================
            // NEW: Support both Command and Snapshot entries
            // ================================================================
            if (entry.type === 'command' && entry.command) {
                redoText = `Redo: ${entry.command.getDescription()}`;
            } else if (entry.operationName) {
                redoText = `Redo: ${entry.operationName}`;
            }
        }
        redoBtn.title = redoText;
    }
}
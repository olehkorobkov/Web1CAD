/*
 * Command Pattern Implementation - Web1CAD System
 * Version 251207 (December 7, 2025)
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 * 
 * This module provides a Command Pattern implementation for efficient undo/redo
 * with minimal memory overhead compared to snapshot-based approach.
 * 
 * PHASE 3.4: Command Pattern Migration
 * Status: FOUNDATIONAL - Base classes only, not yet integrated
 */

// ============================================================================
// BASE COMMAND CLASS - Abstract base for all commands
// ============================================================================

/**
 * Base Command Class
 * 
 * All specific commands (Add, Delete, Transform, etc.) inherit from this class.
 * Provides standard interface for execute/undo/redo operations.
 * 
 * @abstract
 */
class Command {
    /**
     * Initialize command with human-readable description
     * 
     * @param {string} description - Operation name shown in undo/redo buttons
     * @throws {Error} If description not provided
     */
    constructor(description) {
        if (!description || typeof description !== 'string') {
            throw new Error('Command requires description string parameter');
        }
        this.description = description;
        this.timestamp = Date.now();
        this.isExecuted = false;
    }
    
    /**
     * Execute the command (apply changes to shapes array)
     * 
     * Subclasses MUST override this method.
     * Called when:
     * 1. Initial execution (command created and applied)
     * 2. Redo operation (reapply after undo)
     * 
     * @abstract
     * @throws {Error} Base class throws - subclass must implement
     */
    execute() {
        throw new Error(`${this.constructor.name}.execute() not implemented`);
    }
    
    /**
     * Undo the command (reverse changes)
     * 
     * Subclasses MUST override this method.
     * Called when user clicks Undo or presses Ctrl+Z.
     * 
     * Must completely reverse all changes made by execute().
     * 
     * @abstract
     * @throws {Error} Base class throws - subclass must implement
     */
    undo() {
        throw new Error(`${this.constructor.name}.undo() not implemented`);
    }
    
    /**
     * Redo the command (reapply after undo)
     * 
     * Subclasses MUST override this method.
     * Called when user clicks Redo or presses Ctrl+Y.
     * 
     * Default implementation calls execute(), but subclasses may optimize.
     * 
     * @virtual
     */
    redo() {
        this.execute();
    }
    
    /**
     * Get human-readable description
     * 
     * Used in undo/redo button tooltips:
     * "Undo: Move 3 objects" or "Redo: Delete 1 object"
     * 
     * @returns {string} Operation description
     */
    getDescription() {
        return this.description;
    }
    
    /**
     * Get approximate memory footprint for diagnostics
     * 
     * Used to verify Command Pattern is actually saving memory.
     * Returns size of JSON serialization of this command.
     * 
     * @returns {number} Approximate bytes
     */
    getMemorySize() {
        try {
            return JSON.stringify(this).length;
        } catch (e) {
            return -1;  // Unserializable (circular reference, etc.)
        }
    }
    
    /**
     * Validate that required global state exists
     * 
     * Safety check before execute/undo/redo.
     * Ensures shapes and layers arrays are accessible.
     * 
     * @returns {boolean} True if state valid, false otherwise
     * @internal
     */
    _validateState() {
        return (
            typeof window !== 'undefined' &&
            Array.isArray(window.shapes) &&
            Array.isArray(window.layers) &&
            typeof window.selectedShapes !== 'undefined'
        );
    }
}

// ============================================================================
// CONCRETE COMMAND IMPLEMENTATIONS
// ============================================================================

/**
 * AddShapeCommand - Add single shape to canvas
 * 
 * Stores only the NEW shape object (not entire snapshot).
 * Memory usage: ~1-2 KB per shape (vs 100+ KB for snapshot)
 * 
 * @extends Command
 */
class AddShapeCommand extends Command {
    /**
     * Prepare to add shape
     * 
     * @param {Object} shape - Shape object to add (must have uuid)
     * @throws {Error} If shape missing uuid or type
     */
    constructor(shape) {
        if (!shape || !shape.uuid || !shape.type) {
            throw new Error('AddShapeCommand requires shape with uuid and type');
        }
        super(`Create ${shape.type}`);
        
        // Store deep copy of ONLY the new shape (not entire array)
        this.shape = safeDeepCopy(shape);
        this.uuid = shape.uuid;
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Prepared: ${this.getDescription()}`);
        }
    }
    
    /**
     * Execute add operation
     * 
     * For initial execution, shape is already in shapes array.
     * This method exists for redo (re-add after delete).
     * 
     * Called by:
     * - redo() when undoing a delete
     * - Initially from addShape() in shapes.js
     */
    execute() {
        if (!this._validateState()) return;
        
        // Shape should already exist (added by addShape() before command created)
        // This is called on redo to re-add shapes
        // For undo/redo symmetry
    }
    
    /**
     * Undo: Remove the added shape
     * 
     * Finds shape by UUID and removes from array.
     * Also deselects it if currently selected.
     */
    undo() {
        if (!this._validateState()) return;
        
        const shapes = window.shapes;
        const index = shapes.findIndex(s => s.uuid === this.uuid);
        
        if (index !== -1) {
            shapes.splice(index, 1);
            window.selectedShapes.delete(this.uuid);
            
            if (typeof addToHistory === 'function') {
                addToHistory(`Undone: ${this.getDescription()}`);
            }
        }
    }
    
    /**
     * Redo: Re-add the shape
     * 
     * Adds deep copy of shape back to array.
     */
    redo() {
        if (!this._validateState()) return;
        
        const shapes = window.shapes;
        // Check if already exists (may have been re-added by other operation)
        const exists = shapes.find(s => s.uuid === this.uuid);
        
        if (!exists) {
            shapes.push(safeDeepCopy(this.shape));
            
            if (typeof addToHistory === 'function') {
                addToHistory(`Redone: ${this.getDescription()}`);
            }
        }
    }
    
    /**
     * Get memory footprint
     * @override
     * @returns {number} Bytes (should be ~1000-2000 for shape)
     */
    getMemorySize() {
        // Shape is the main data, rest is minimal
        try {
            return JSON.stringify(this.shape).length + 100;
        } catch (e) {
            return super.getMemorySize();
        }
    }
}

/**
 * DeleteShapeCommand - Delete selected shapes
 * 
 * Stores deleted shapes with original positions for restoration.
 * Memory usage: ~1-2 KB per shape (vs 100+ KB for snapshot)
 * 
 * @extends Command
 */
class DeleteShapeCommand extends Command {
    /**
     * Prepare to delete shapes
     * 
     * @param {Array<Object>} shapesToDelete - Shapes to delete (must have uuid)
     * @throws {Error} If shapes array empty
     */
    constructor(shapesToDelete) {
        if (!Array.isArray(shapesToDelete) || shapesToDelete.length === 0) {
            throw new Error('DeleteShapeCommand requires non-empty shapes array');
        }
        
        super(`Delete ${shapesToDelete.length} object(s)`);
        
        // Store each deleted shape with its original array position
        // This allows restoration in correct order
        this.deletedShapes = shapesToDelete.map((shape, index) => ({
            shape: safeDeepCopy(shape),
            originalIndex: window.shapes.indexOf(shape),
            uuid: shape.uuid
        }));
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Prepared: ${this.getDescription()}`);
        }
    }
    
    /**
     * Execute delete operation
     * 
     * Shapes are already deleted when command created.
     * This method handles redo.
     */
    execute() {
        if (!this._validateState()) return;
        // Shapes already deleted - no action needed
    }
    
    /**
     * Undo: Restore deleted shapes
     * 
     * Restores all shapes at their original indices.
     * Also restores selection if they were selected.
     */
    undo() {
        if (!this._validateState()) return;
        
        const shapes = window.shapes;
        
        // Restore shapes in order (important for array indices)
        this.deletedShapes.forEach(item => {
            shapes.splice(item.originalIndex, 0, safeDeepCopy(item.shape));
        });
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Undone: ${this.getDescription()}`);
        }
    }
    
    /**
     * Redo: Delete shapes again
     * 
     * Removes all deleted UUIDs from shapes array.
     * More reliable than using indices (indices change).
     */
    redo() {
        if (!this._validateState()) return;
        
        const shapes = window.shapes;
        const uuidsToDelete = new Set(this.deletedShapes.map(item => item.uuid));
        
        // Filter out deleted shapes
        let deleteCount = 0;
        for (let i = shapes.length - 1; i >= 0; i--) {
            if (uuidsToDelete.has(shapes[i].uuid)) {
                shapes.splice(i, 1);
                deleteCount++;
                window.selectedShapes.delete(shapes[i].uuid);
            }
        }
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Redone: ${this.getDescription()}`);
        }
    }
    
    /**
     * Get memory footprint
     * @override
     * @returns {number} Bytes
     */
    getMemorySize() {
        try {
            return this.deletedShapes.reduce((sum, item) => {
                return sum + JSON.stringify(item.shape).length;
            }, 200);  // Base overhead
        } catch (e) {
            return super.getMemorySize();
        }
    }
}

/**
 * TransformCommand - Move, Rotate, Scale shapes
 * 
 * Stores only shape UUIDs and transformation delta.
 * Memory usage: ~50-200 bytes per shape (vs 100+ KB for snapshot)
 * BEST memory improvement!
 * 
 * @extends Command
 */
class TransformCommand extends Command {
    /**
     * Prepare transformation
     * 
     * @param {string} type - 'move', 'rotate', or 'scale'
     * @param {Array<string>} shapeUuids - UUIDs of shapes to transform
     * @param {Object} delta - Transformation details (contents depend on type)
     * @throws {Error} If invalid type or empty UUIDs
     */
    constructor(type, shapeUuids, delta) {
        if (!['move', 'rotate', 'scale'].includes(type)) {
            throw new Error(`Invalid transform type: ${type}. Expected: move, rotate, or scale`);
        }
        
        if (!Array.isArray(shapeUuids) || shapeUuids.length === 0) {
            throw new Error('TransformCommand requires non-empty UUIDs array');
        }
        
        if (!delta || typeof delta !== 'object') {
            throw new Error('TransformCommand requires delta object');
        }
        
        const typeNames = {
            move: 'Move',
            rotate: 'Rotate',
            scale: 'Scale'
        };
        
        super(`${typeNames[type]} ${shapeUuids.length} object(s)`);
        
        this.type = type;
        this.shapeUuids = shapeUuids;
        this.delta = delta;  // { dx, dy } or { cx, cy, angle } or { cx, cy, factor }
        
        if (typeof addToHistory === 'function') {
            const details = this._formatDelta();
            addToHistory(`Prepared: ${this.getDescription()} ${details}`);
        }
    }
    
    /**
     * Format delta details for logging
     * @private
     * @returns {string}
     */
    _formatDelta() {
        switch (this.type) {
            case 'move':
                return `(${this.delta.dx.toFixed(2)}, ${this.delta.dy.toFixed(2)})`;
            case 'rotate':
                return `by ${(this.delta.angle * 180 / Math.PI).toFixed(1)}°`;
            case 'scale':
                return `by ${this.delta.factor.toFixed(2)}x`;
            default:
                return '';
        }
    }
    
    /**
     * Execute transformation
     * 
     * Transformations already applied when command created.
     * This method handles redo.
     */
    execute() {
        if (!this._validateState()) return;
        // Transformations already applied
    }
    
    /**
     * Undo: Reverse transformation
     * 
     * Applies inverse transformation to each shape.
     * - move: subtract delta
     * - rotate: negate angle
     * - scale: invert factor
     */
    undo() {
        if (!this._validateState()) return;
        
        const shapes = window.shapes;
        
        this.shapeUuids.forEach(uuid => {
            const shape = shapes.find(s => s.uuid === uuid);
            if (!shape) return;  // Shape was deleted - skip
            
            switch (this.type) {
                case 'move':
                    if (typeof moveShape === 'function') {
                        moveShape(shape, -this.delta.dx, -this.delta.dy);
                    }
                    break;
                    
                case 'rotate':
                    if (typeof rotateShape === 'function') {
                        rotateShape(shape, this.delta.cx, this.delta.cy, -this.delta.angle);
                    }
                    break;
                    
                case 'scale':
                    if (typeof scaleShape === 'function') {
                        scaleShape(shape, this.delta.cx, this.delta.cy, 1 / this.delta.factor);
                    }
                    break;
            }
        });
        
        // Invalidate rendering caches
        this._invalidateCaches();
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Undone: ${this.getDescription()}`);
        }
    }
    
    /**
     * Redo: Reapply transformation
     * 
     * Applies original transformation again.
     */
    redo() {
        if (!this._validateState()) return;
        
        const shapes = window.shapes;
        
        this.shapeUuids.forEach(uuid => {
            const shape = shapes.find(s => s.uuid === uuid);
            if (!shape) return;  // Shape was deleted - skip
            
            switch (this.type) {
                case 'move':
                    if (typeof moveShape === 'function') {
                        moveShape(shape, this.delta.dx, this.delta.dy);
                    }
                    break;
                    
                case 'rotate':
                    if (typeof rotateShape === 'function') {
                        rotateShape(shape, this.delta.cx, this.delta.cy, this.delta.angle);
                    }
                    break;
                    
                case 'scale':
                    if (typeof scaleShape === 'function') {
                        scaleShape(shape, this.delta.cx, this.delta.cy, this.delta.factor);
                    }
                    break;
            }
        });
        
        // Invalidate rendering caches
        this._invalidateCaches();
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Redone: ${this.getDescription()}`);
        }
    }
    
    /**
     * Invalidate all affected caches
     * 
     * Called after any transformation to ensure:
     * - Viewport shows correct shapes
     * - QuadTree reflects new positions
     * - Bounds cache updated
     * 
     * @private
     */
    _invalidateCaches() {
        const affectedUuids = this.shapeUuids;
        
        if (typeof invalidateShapeSetBoundsCache === 'function') {
            invalidateShapeSetBoundsCache(affectedUuids);
        }
        if (typeof invalidateQuadTree === 'function') {
            invalidateQuadTree();
        }
        if (typeof invalidateViewportCache === 'function') {
            invalidateViewportCache();
        }
    }
    
    /**
     * Get memory footprint
     * @override
     * @returns {number} Bytes (very efficient!)
     */
    getMemorySize() {
        // Only UUIDs and delta stored
        return (
            this.shapeUuids.length * 40 +  // UUID strings (~40 bytes each including overhead)
            JSON.stringify(this.delta).length +
            50  // Base overhead
        );
    }
}

/**
 * PropertyChangeCommand - Modify shape properties
 * 
 * Stores shape UUIDs and property name/value changes.
 * Memory usage: ~100-500 bytes per operation (vs 100+ KB for snapshot)
 * 
 * @extends Command
 */
class PropertyChangeCommand extends Command {
    /**
     * Prepare property change
     * 
     * @param {Array<string>} shapeUuids - Shape UUIDs to modify
     * @param {string} property - Property name (e.g., 'color', 'lineWeight')
     * @param {*} oldValue - Previous value
     * @param {*} newValue - New value
     * @throws {Error} If invalid parameters
     */
    constructor(shapeUuids, property, oldValue, newValue) {
        if (!Array.isArray(shapeUuids) || shapeUuids.length === 0) {
            throw new Error('PropertyChangeCommand requires non-empty UUIDs array');
        }
        
        if (!property || typeof property !== 'string') {
            throw new Error('PropertyChangeCommand requires property name');
        }
        
        const count = shapeUuids.length;
        const plural = count === 1 ? '' : 's';
        super(`Modify ${property}${plural !== '' ? ' for ' + count + ' object(s)' : ''}`);
        
        this.shapeUuids = shapeUuids;
        this.property = property;
        this.oldValue = oldValue;
        this.newValue = newValue;
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Prepared: ${this.getDescription()}`);
        }
    }
    
    /**
     * Execute property change
     * 
     * Changes already applied when command created.
     * This handles redo.
     */
    execute() {
        if (!this._validateState()) return;
        // Change already applied
    }
    
    /**
     * Undo: Restore old property value
     */
    undo() {
        if (!this._validateState()) return;
        
        const shapes = window.shapes;
        
        this.shapeUuids.forEach(uuid => {
            const shape = shapes.find(s => s.uuid === uuid);
            if (shape) {
                shape[this.property] = this.oldValue;
            }
        });
        
        if (typeof invalidateViewportCache === 'function') {
            invalidateViewportCache();
        }
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Undone: ${this.getDescription()}`);
        }
    }
    
    /**
     * Redo: Restore new property value
     */
    redo() {
        if (!this._validateState()) return;
        
        const shapes = window.shapes;
        
        this.shapeUuids.forEach(uuid => {
            const shape = shapes.find(s => s.uuid === uuid);
            if (shape) {
                shape[this.property] = this.newValue;
            }
        });
        
        if (typeof invalidateViewportCache === 'function') {
            invalidateViewportCache();
        }
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Redone: ${this.getDescription()}`);
        }
    }
    
    /**
     * Get memory footprint
     * @override
     * @returns {number} Bytes
     */
    getMemorySize() {
        return (
            this.shapeUuids.length * 40 +  // UUID strings
            this.property.length +
            JSON.stringify(this.oldValue).length +
            JSON.stringify(this.newValue).length +
            100
        );
    }
}

/**
 * BatchCommand - Execute multiple commands as atomic operation
 * 
 * Useful for complex operations that logically form single undo step.
 * Example: Explode shape into primitives = delete original + add decomposed shapes
 * 
 * @extends Command
 */
class BatchCommand extends Command {
    /**
     * Prepare batch of commands
     * 
     * @param {string} description - Overall operation name
     * @param {Array<Command>} commands - Commands to execute in sequence
     * @throws {Error} If commands not array or empty
     */
    constructor(description, commands) {
        if (!Array.isArray(commands) || commands.length === 0) {
            throw new Error('BatchCommand requires non-empty commands array');
        }
        
        super(description);
        this.commands = commands;
    }
    
    /**
     * Execute all commands in sequence
     */
    execute() {
        this.commands.forEach(cmd => cmd.execute());
    }
    
    /**
     * Undo all commands in reverse sequence
     * 
     * Important: Undo in REVERSE order so state remains consistent.
     */
    undo() {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Undone: ${this.getDescription()}`);
        }
    }
    
    /**
     * Redo all commands in forward sequence
     */
    redo() {
        this.commands.forEach(cmd => cmd.redo());
        
        if (typeof addToHistory === 'function') {
            addToHistory(`Redone: ${this.getDescription()}`);
        }
    }
    
    /**
     * Get combined memory footprint
     * @override
     * @returns {number} Bytes
     */
    getMemorySize() {
        return this.commands.reduce((sum, cmd) => {
            return sum + (typeof cmd.getMemorySize === 'function' ? cmd.getMemorySize() : 0);
        }, 50);
    }
}

// ============================================================================
// COMMAND FACTORY FUNCTIONS
// ============================================================================

/**
 * Factory functions to create commands from common operations
 * 
 * These will be called from integration points (shapes.js, move.js, etc.)
 * instead of calling saveState() directly.
 */

/**
 * Create AddShapeCommand for new shape
 * @param {Object} shape - Shape to add
 * @returns {AddShapeCommand}
 */
function createAddShapeCommand(shape) {
    return new AddShapeCommand(shape);
}

/**
 * Create DeleteShapeCommand for deleted shapes
 * @param {Array<Object>} shapes - Shapes being deleted
 * @returns {DeleteShapeCommand}
 */
function createDeleteShapeCommand(shapes) {
    return new DeleteShapeCommand(shapes);
}

/**
 * Create TransformCommand for move operation
 * @param {Array<string>} uuids - Shape UUIDs
 * @param {number} dx - X displacement
 * @param {number} dy - Y displacement
 * @returns {TransformCommand}
 */
function createMoveCommand(uuids, dx, dy) {
    return new TransformCommand('move', uuids, { dx, dy });
}

/**
 * Create TransformCommand for rotate operation
 * @param {Array<string>} uuids - Shape UUIDs
 * @param {number} cx - Rotation center X
 * @param {number} cy - Rotation center Y
 * @param {number} angle - Rotation angle in radians
 * @returns {TransformCommand}
 */
function createRotateCommand(uuids, cx, cy, angle) {
    return new TransformCommand('rotate', uuids, { cx, cy, angle });
}

/**
 * Create TransformCommand for scale operation
 * @param {Array<string>} uuids - Shape UUIDs
 * @param {number} cx - Scale center X
 * @param {number} cy - Scale center Y
 * @param {number} factor - Scale factor
 * @returns {TransformCommand}
 */
function createScaleCommand(uuids, cx, cy, factor) {
    return new TransformCommand('scale', uuids, { cx, cy, factor });
}

/**
 * Create PropertyChangeCommand for shape property modification
 * @param {Array<string>} uuids - Shape UUIDs
 * @param {string} property - Property name
 * @param {*} oldValue - Previous value
 * @param {*} newValue - New value
 * @returns {PropertyChangeCommand}
 */
function createPropertyChangeCommand(uuids, property, oldValue, newValue) {
    return new PropertyChangeCommand(uuids, property, oldValue, newValue);
}

// ============================================================================
// EXPORT & AVAILABILITY
// ============================================================================

// Make all classes and factories globally available
const commandClasses = {
    Command,
    AddShapeCommand,
    DeleteShapeCommand,
    TransformCommand,
    PropertyChangeCommand,
    BatchCommand
};

const commandFactories = {
    createAddShapeCommand,
    createDeleteShapeCommand,
    createMoveCommand,
    createRotateCommand,
    createScaleCommand,
    createPropertyChangeCommand
};

// Export for use in HTML or modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ...commandClasses, ...commandFactories };
}

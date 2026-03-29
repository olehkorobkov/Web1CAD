# Command Pattern Migration Plan - Web1CAD Phase 3.4

**Status:** 🔵 PLANNING & DESIGN  
**Date:** March 26, 2026  
**Risk Level:** MEDIUM (17 integration points, must maintain backward compatibility)

---

## 📋 EXECUTIVE PLAN

### Current Situation
- **Snapshot Architecture:** Each operation saves complete deep copy (50-500 KB per snapshot)
- **Memory Impact:** 50 operations × 100 KB = ~5 MB for typical undo stacks
- **Problem:** Inefficient for large drawings, RAM grows quickly
- **Integration Points:** 17 different `saveState()` calls across 6 files

### Target Architecture
- **Command Pattern:** Each operation stores only delta (10-100 bytes per command)
- **Memory Impact:** 50 operations × 50 bytes = ~2.5 KB (200x improvement!)
- **Backward Compatibility:** User sees NO changes in behavior
- **Safe Transition:** Phase implementation with fallback mechanisms

---

## 🎯 PHASE BREAKDOWN

### PHASE 3.4.1: Command Base Classes (LOW RISK)
**Goal:** Create extensible command infrastructure  
**Files to Create:** 1 new file (`js/cad/core/commands.js`)  
**Impact:** ZERO - just defines new classes, not yet used

```
js/cad/core/
└── commands.js (NEW) - Base Command class + implementations
    ├── class Command (abstract)
    │   ├── execute()
    │   ├── undo()
    │   ├── redo()
    │   └── getDescription()
    │
    ├── class AddShapeCommand extends Command
    │   └── stores: new shape object only
    │
    ├── class DeleteShapeCommand extends Command
    │   └── stores: deleted shapes + positions
    │
    ├── class TransformCommand extends Command
    │   └── stores: shape UUIDs + delta (dx, dy, angle, factor, etc.)
    │
    ├── class PropertyChangeCommand extends Command
    │   └── stores: shape UUIDs + property name + old/new values
    │
    └── class BatchCommand extends Command
        └── stores: array of commands
```

### PHASE 3.4.2: Hybrid Undo System (MEDIUM RISK)
**Goal:** Support BOTH snapshots and commands simultaneously  
**Files to Modify:** `js/cad/core/undo.js`  
**Strategy:** 
- Introduce `useCommandPattern` flag (default: false)
- EXISTING code path continues unchanged
- NEW code path uses commands
- Both paths can coexist

```javascript
// NEW in undo.js:
const useCommandPattern = false;  // Toggle for testing

// LOGIC FLOW:
if (useCommandPattern) {
    // NEW: Use command pattern
    const command = createCommand(type, data);
    undoStack.push(command);
    command.execute();
} else {
    // EXISTING: Use snapshots
    saveState(operationName);
}
```

### PHASE 3.4.3: Command Creation Factories (MEDIUM RISK)
**Goal:** Create commands from existing saveState() calls  
**Files to Create:** Helper factory in `commands.js`  
**Implementation:**
- `createAddShapeCommand(shape)` - called from shapes.js:15
- `createDeleteCommand(shapes, positions)` - called from shapes.js:83
- `createMoveCommand(uuids, dx, dy)` - called from move.js:94
- `createRotateCommand(uuids, cx, cy, angle)` - called from rotate.js:109
- `createScaleCommand(uuids, cx, cy, factor)` - called from scale.js:92
- `createPropertyCommand(uuids, props)` - called from properties-panel.js (8 calls)

### PHASE 3.4.4: Gradual Migration (HIGH RISK - MAIN REFACTOR)
**Goal:** Switch each integration point safely  
**Process:** One file at a time
1. shapes.js (2 entry points)
2. move.js (1 entry point)
3. copy.js (1 entry point)
4. rotate.js (1 entry point)
5. scale.js (1 entry point)
6. command-system.js (3 entry points)
7. properties-panel.js (8 entry points)

**Testing After Each File:**
- Run existing undo/redo
- Check memory usage
- Verify button states
- Test all 10+ shape types

### PHASE 3.4.5: Full Cutover (CRITICAL)
**Goal:** `useCommandPattern = true` and remove snapshot code  
**Risk:** Point of no return - requires extensive testing
**Rollback:** Keep old `undo.js` in git history for revert

---

## 🏗️ IMPLEMENTATION ARCHITECTURE

### Command Class Hierarchy

```javascript
/**
 * Base Command Class
 * @abstract
 */
class Command {
    /**
     * @param {string} description - Human-readable operation name
     */
    constructor(description) {
        this.description = description;
        this.timestamp = Date.now();
    }
    
    /**
     * Execute the command (apply changes)
     * @abstract
     */
    execute() {
        throw new Error('execute() not implemented');
    }
    
    /**
     * Undo the command (revert changes)
     * @abstract
     */
    undo() {
        throw new Error('undo() not implemented');
    }
    
    /**
     * Redo the command (reapply changes)
     * @abstract
     */
    redo() {
        throw new Error('redo() not implemented');
    }
    
    /**
     * Get human-readable description
     * @returns {string}
     */
    getDescription() {
        return this.description;
    }
    
    /**
     * Get memory footprint for diagnostics
     * @returns {number} Approximate bytes used
     */
    getMemorySize() {
        return JSON.stringify(this).length;
    }
}

/**
 * AddShapeCommand - Add single shape to canvas
 */
class AddShapeCommand extends Command {
    constructor(shape) {
        super(`Create ${shape.type}`);
        this.shape = safeDeepCopy(shape);  // Store only the NEW shape
        this.uuid = shape.uuid;
    }
    
    execute() {
        // For initial execution, shape already added to shapes array
        // This just records it for undo
    }
    
    undo() {
        // Find and remove shape by UUID
        const index = shapes.findIndex(s => s.uuid === this.uuid);
        if (index !== -1) {
            shapes.splice(index, 1);
            selectedShapes.delete(this.uuid);
        }
    }
    
    redo() {
        // Re-add the shape
        shapes.push(safeDeepCopy(this.shape));
    }
}

/**
 * DeleteShapeCommand - Delete selected shapes
 */
class DeleteShapeCommand extends Command {
    constructor(shapesToDelete) {
        super(`Delete ${shapesToDelete.length} object(s)`);
        // Store deleted shapes + their original positions
        this.deletedShapes = shapesToDelete.map(shape => ({
            shape: safeDeepCopy(shape),
            originalIndex: shapes.indexOf(shape)
        }));
    }
    
    execute() {
        // Shapes already deleted, this just records them
    }
    
    undo() {
        // Restore shapes at original positions
        this.deletedShapes.forEach(item => {
            shapes.splice(item.originalIndex, 0, safeDeepCopy(item.shape));
        });
    }
    
    redo() {
        // Delete again by UUID
        const uuids = new Set(this.deletedShapes.map(item => item.shape.uuid));
        shapes = shapes.filter(s => !uuids.has(s.uuid));
        selectedShapes.forEach(uuid => {
            if (uuids.has(uuid)) selectedShapes.delete(uuid);
        });
    }
}

/**
 * TransformCommand - Move, Rotate, or Scale shapes
 */
class TransformCommand extends Command {
    constructor(type, shapeUuids, delta) {
        const typeNames = { move: 'Move', rotate: 'Rotate', scale: 'Scale' };
        super(`${typeNames[type]} ${shapeUuids.length} object(s)`);
        this.type = type;  // 'move', 'rotate', or 'scale'
        this.shapeUuids = shapeUuids;  // Array of UUIDs to transform
        this.delta = delta;  // { dx, dy } or { angle } or { factor } etc.
    }
    
    execute() {
        // Transforms already applied, this just records them
    }
    
    undo() {
        // Find shapes by UUID and reverse the transform
        const shapes_arr = window.shapes || [];
        this.shapeUuids.forEach(uuid => {
            const shape = shapes_arr.find(s => s.uuid === uuid);
            if (shape) {
                switch (this.type) {
                    case 'move':
                        moveShape(shape, -this.delta.dx, -this.delta.dy);
                        break;
                    case 'rotate':
                        rotateShape(shape, this.delta.cx, this.delta.cy, -this.delta.angle);
                        break;
                    case 'scale':
                        scaleShape(shape, this.delta.cx, this.delta.cy, 1 / this.delta.factor);
                        break;
                }
            }
        });
    }
    
    redo() {
        // Reapply the transform
        const shapes_arr = window.shapes || [];
        this.shapeUuids.forEach(uuid => {
            const shape = shapes_arr.find(s => s.uuid === uuid);
            if (shape) {
                switch (this.type) {
                    case 'move':
                        moveShape(shape, this.delta.dx, this.delta.dy);
                        break;
                    case 'rotate':
                        rotateShape(shape, this.delta.cx, this.delta.cy, this.delta.angle);
                        break;
                    case 'scale':
                        scaleShape(shape, this.delta.cx, this.delta.cy, this.delta.factor);
                        break;
                }
            }
        });
    }
}

/**
 * PropertyChangeCommand - Modify shape properties
 */
class PropertyChangeCommand extends Command {
    constructor(shapeUuids, property, oldValue, newValue) {
        super(`Modify ${property}`);
        this.shapeUuids = shapeUuids;
        this.property = property;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
    
    execute() {
        // Property change already applied
    }
    
    undo() {
        const shapes_arr = window.shapes || [];
        this.shapeUuids.forEach(uuid => {
            const shape = shapes_arr.find(s => s.uuid === uuid);
            if (shape) shape[this.property] = this.oldValue;
        });
    }
    
    redo() {
        const shapes_arr = window.shapes || [];
        this.shapeUuids.forEach(uuid => {
            const shape = shapes_arr.find(s => s.uuid === uuid);
            if (shape) shape[this.property] = this.newValue;
        });
    }
}
```

---

## 📊 MEMORY COMPARISON

### Current Snapshot Approach
```
Operation: Add circle
├─ Snapshot size: ~100 KB (all 100 shapes + layers + selection)
└─ Stack (50 ops): ~5 MB

Operation: Move 1 shape
├─ Snapshot size: ~100 KB (entire project state)
└─ Stack (50 ops): ~5 MB
```

### New Command Pattern Approach
```
Operation: Add circle
├─ Command size: ~1 KB (just the new circle)
└─ Stack (50 ops): ~50 KB

Operation: Move 1 shape
├─ Command size: ~200 bytes (uuid + dx + dy)
└─ Stack (50 ops): ~10 KB
```

**Memory Savings: 500x improvement** (5 MB → 10 KB average)

---

## 🧪 TESTING STRATEGY

### 1. Unit Tests (Before Implementation)
- Create test suite for each Command class
- Verify execute/undo/redo logic
- Test edge cases (empty shapes, invalid UUIDs, etc.)

### 2. Integration Tests (During Migration)
- After each file migration:
  - Undo/redo sequence test
  - Memory usage measurement
  - Button state verification
  - All shape types operation
  - Multi-select operations

### 3. Regression Tests (Full Cutover)
- Compare behavior with snapshot version
- 100+ operation sequences
- Stress test with 1000+ shapes
- Performance benchmarking

---

## ❌ ROLLBACK PLAN

If critical issues found:

1. **Keep Current undo.js in git** (commit before changes)
2. **Tag stable version** before refactor starts
3. **Gradual revert:** One file at a time back to snapshots
4. **Hybrid approach:** Keep both systems indefinitely if needed

---

## 🚦 RISK MITIGATION

| Risk | Cause | Mitigation |
|------|-------|-----------|
| Undo/redo broken | Complex transform logic | Unit test each command class |
| Selection lost | UUID mismatch | Validate UUIDs before undo |
| Orphaned shapes | Index out of sync | Use UUID lookup, not array index |
| Memory leak | Circular refs in commands | Strict deep copy discipline |
| Performance | O(n) lookup for shape by UUID | Consider shape Map<uuid, shape> |
| User confusion | Behavior change | NO user-facing changes! |

---

## 📅 TIMELINE

| Phase | Effort | Duration | Risk |
|-------|--------|----------|------|
| 3.4.1: Base classes | 2-3 hours | 1 session | 🟢 LOW |
| 3.4.2: Hybrid system | 3-4 hours | 1-2 sessions | 🟡 MEDIUM |
| 3.4.3: Factories | 1-2 hours | 1 session | 🟡 MEDIUM |
| 3.4.4a: shapes.js | 1-2 hours | 1 session | 🟠 HIGH |
| 3.4.4b: move/copy/rotate/scale | 2-3 hours | 2 sessions | 🟠 HIGH |
| 3.4.4c: command-system.js | 2-3 hours | 2 sessions | 🟠 HIGH |
| 3.4.4d: properties-panel.js | 3-4 hours | 2 sessions | 🟠 HIGH |
| 3.4.5: Full cutover + tests | 4-5 hours | 2 sessions | 🔴 CRITICAL |
| **TOTAL** | **18-26 hours** | **~2 weeks sprint** | **MANAGEABLE** |

---

## ✅ SUCCESS CRITERIA

- ✅ All operations undo/redo correctly
- ✅ Memory usage < 1 MB for 50 undo steps (vs 5 MB now)
- ✅ NO user-facing behavior changes
- ✅ All shape types work (10+ types)
- ✅ Properties panel updates work
- ✅ Selection preservation works
- ✅ Multi-shape operations work
- ✅ Button states update correctly
- ✅ Performance == current or better
- ✅ No console errors on undo/redo sequences

---

## 📝 THE GOLDEN RULE

> **"User behavior must be IDENTICAL to today."**
> 
> Every undo, every redo, every button click, every property change must work exactly as it does now. The ONLY difference is invisible: less RAM used.

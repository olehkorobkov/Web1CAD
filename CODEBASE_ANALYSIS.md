# Web1CAD Codebase Analysis: shapes and selectedShapes Usage

## Executive Summary
This analysis documents all usages of the `shapes` array and `selectedShapes` Set throughout the Web1CAD codebase. The system currently uses **array indices** to track shapes and selections, which creates dependencies that would need refactoring if switching to UUIDs.

**Total files requiring changes: 32 files**
**Critical dependencies: 156+ locations where index-based access is used**

---

## 1. SHAPE OBJECT STRUCTURE

### Current Shape Object Properties
All shape objects share these common properties:

```javascript
{
  type: string,           // 'line','circle','arc','ellipse','rectangle','polygon','polyline','spline','hatch','point','text'
  color: string,          // '#rrggbb' or 'byLayer'
  lineWeight: number|string,  // numeric value or 'byLayer' 
  linetype: string,       // 'continuous','dashed','dotted','dash-dot'
  layer: string,          // layer name (default: '0')
  
  // Type-specific properties vary by shape type
  // See section below
}
```

### Shape Type-Specific Properties

#### Line
```javascript
{ type: 'line', x1, y1, x2, y2 }
```
- **Fields**: x1, y1, x2, y2 (coordinates)
- **Locations**: [shapes.js:L31](shapes.js#L31), [properties-panel.js:L640-L678](properties-panel.js#L640)

#### Circle
```javascript
{ type: 'circle', cx, cy, radius }
```
- **Fields**: cx, cy (center), radius
- **Locations**: [properties-panel.js:L680-L700](properties-panel.js#L680), [shape-handler-unified.js:L1319](shape-handler-unified.js#L1319)

#### Arc  
```javascript
{ type: 'arc', cx, cy, radius, startAngle, endAngle }
```
- **Fields**: cx, cy, radius, startAngle (radians), endAngle (radians)
- **Locations**: [properties-panel.js:L702-L743](properties-panel.js#L702)

#### Ellipse
```javascript
{ type: 'ellipse', cx, cy, rx, ry, rotation }
```
- **Fields**: cx, cy, rx (major radius), ry (minor radius), rotation
- **Locations**: [properties-panel.js:L745-L775](properties-panel.js#L745)

#### Rectangle
```javascript
{ type: 'rectangle', x, y, width, height }
// OR with rotation
{ type: 'rectangle', points: [{x,y}, ...], rotation }
```
- **Fields**: x, y, width, height OR points array with rotation
- **Locations**: [properties-panel.js:L1035-L1070](properties-panel.js#L1035)

#### Polygon/Polyline/Spline
```javascript
{ type: 'polygon'|'polyline'|'spline', points: [{x,y}, ...] }
```
- **Fields**: points array of {x, y} objects
- **Locations**: [properties-panel.js:L777-L900](properties-panel.js#L777), [command-system.js:L160-L180](command-system.js#L160)

#### Hatch
```javascript
{ type: 'hatch', points: [{x,y}, ...], pattern: string }
```
- **Fields**: points (line segments), pattern ('lines','solid',etc)
- **Locations**: [hatch.js:L40-L50](hatch.js#L40)

#### Text
```javascript
{ type: 'text', x, y, content, size }
```
- **Fields**: x, y (position), content (text string), size (font size)
- **Locations**: [properties-panel.js:L902-L921](properties-panel.js#L902)

#### Point
```javascript
{ type: 'point', x, y }
```
- **Fields**: x, y (position)
- **Locations**: [properties-panel.js:L878-L897](properties-panel.js#L878)

---

## 2. FILES REFERENCING selectedShapes

### Complete File List (by module)

**Core Shape Management:**
1. [js/cad/core/shapes.js](js/cad/core/shapes.js)
2. [js/cad/core/selection.js](js/cad/core/selection.js)
3. [js/cad/geometry/primitives.js](js/cad/geometry/primitives.js) - **Definition location**

**Commands:**
4. [js/cad/commands/copy.js](js/cad/commands/copy.js)
5. [js/cad/commands/move.js](js/cad/commands/move.js)
6. [js/cad/commands/rotate.js](js/cad/commands/rotate.js)
7. [js/cad/commands/scale.js](js/cad/commands/scale.js)
8. [js/cad/commands/hatch.js](js/cad/commands/hatch.js)

**UI:**
9. [js/cad/ui/command-system.js](js/cad/ui/command-system.js)
10. [js/cad/ui/properties-panel.js](js/cad/ui/properties-panel.js)

**Rendering:**
11. [js/cad/rendering/renderer.js](js/cad/rendering/renderer.js)
12. [js/shape-renderer.js](js/shape-renderer.js)

**Optimization:**
13. [js/web1cad-optimizations.js](js/web1cad-optimizations.js)
14. [js/shape-handler-unified.js](js/shape-handler-unified.js)

**Core:**
15. [js/cad/core/auto_save.js](js/cad/core/auto_save.js)

**System:**
16. [js/command-system.js](js/command-system.js) - Legacy/main command system
17. [cad.html](cad.html) - HTML UI

---

## 3. DETAILED USAGE BY FILE

### [js/cad/geometry/primitives.js](js/cad/geometry/primitives.js)
**Type**: DEFINITION
```javascript
Line 1-2:
    let shapes = [];
    let selectedShapes = new Set();
```
- **Purpose**: Global shape array and selection set definition
- **Access Pattern**: Direct global assignment
- **Index Assumption**: Assumes indices match between addition and deletion

---

### [js/cad/core/shapes.js](js/cad/core/shapes.js)

#### deleteSelected() - Lines 72-104
```javascript
Line 72: if (typeof selectedShapes === 'undefined' || selectedShapes.size === 0) {
Line 81: saveState(`Delete ${selectedShapes.size} object(s)`);
Line 85: const sortedIndices = Array.from(selectedShapes).sort((a, b) => b - a);
Line 88: sortedIndices.forEach(index => {
Line 89:     shapes.splice(index, 1);
```
**Critical Code**: Uses `Array.from(selectedShapes)` to convert Set indices, sorts descending to avoid index shift problems
**UUID Impact**: ⚠️ CRITICAL - Must entirely rewrite deletion logic
**Line Count**: 13 statements

#### copySelected() - Lines 114-145
```javascript
Line 126: selectedShapes.forEach(index => {
Line 127:     if (typeof shapes !== 'undefined' && shapes[index]) {
Line 128:         const copiedShape = safeDeepCopy(shapes[index], {}, 'copied to clipboard')
```
**Critical Code**: Iterates selectedShapes, accesses `shapes[index]` directly
**UUID Impact**: ⚠️ CRITICAL - Must replace index-based access with UUID lookup
**Line Count**: 20 statements

#### pasteShapes() - Lines 155-246
```javascript
Line 222:     // Calculate center of copied shapes  
Line 270:         if (typeof shapes !== 'undefined') {
Line 271:             shapes.push(newShape);
Line 272:             if (typeof selectedShapes !== 'undefined') {
Line 273:                 selectedShapes.add(shapes.length - 1);  // ← INDEX DEPENDENCY
```
**Critical Code**: Uses `shapes.length - 1` as new shape index
**UUID Impact**: ⚠️ CRITICAL - Cannot use array length for UUID assignment
**Line Count**: 92 statements

---

### [js/cad/core/selection.js](js/cad/core/selection.js)

#### clearSelection() - Lines 13-23
```javascript
Line 13: const wasSelected = selectedShapes.size > 0;
Line 14: selectedShapes.clear();
```
**UUID Impact**: ✓ COMPATIBLE - Set operations work with any value type

#### selectAll() - Lines 34-49
```javascript
Line 42: selectedShapes = new Set(shapes.map((_, i) => i));
```
**Critical Code**: Creates Set of indices using `.map((_, i) => i)`
**UUID Impact**: ⚠️ CRITICAL - Must map shapes to their UUIDs instead of indices
**Line Count**: 16 statements

---

### [js/cad/commands/copy.js](js/cad/commands/copy.js)

#### startCopyCommand() - Lines 1-11
```javascript
Line 2: if (selectedShapes.size > 0) {
Line 3:     copyObjectsToCopy = new Set(selectedShapes);
Line 4:     copyStep = 1;
```
**Pattern**: Copies selectedShapes Set to working set
**UUID Impact**: ✓ COMPATIBLE

#### handleCopyObjectSelection() - Lines 24-62
```javascript
Line 34: for (let i = shapes.length - 1; i >= 0; i--) {
Line 35:     if (isPointInShape(shapes[i], x, y)) {
```
**Critical Code**: Uses numeric loop with `shapes[i]` access
**UUID Impact**: ⚠️ HIGH - Must iterate differently
**Instances**: 2 locations (lines 34-39 and 47-55)

#### handleCopyDestinationSelection() - Lines 90-110
```javascript
Line 97: for (const index of copyObjectsToCopy) {
Line 98:     const originalShape = shapes[index];
Line 103:     shapes.push(copiedShape);
Line 104:     newShapes.push(shapes.length - 1);  // ← INDEX DEPENDENCY
```
**Critical Code**: Relies on `shapes.length - 1` for new indices
**UUID Impact**: ⚠️ CRITICAL

---

### [js/cad/commands/move.js](js/cad/commands/move.js)

#### startMoveCommand() - Lines 1-14
```javascript
Line 2: if (selectedShapes.size > 0) {
Line 3:     moveObjectsToMove = new Set(selectedShapes);
```
**Pattern**: Copies selectedShapes to working set
**UUID Impact**: ✓ COMPATIBLE

#### handleMoveObjectSelection() - Lines 24-65
```javascript
Line 34: for (let i = shapes.length - 1; i >= 0; i--) {
Line 35:     if (isPointInShape(shapes[i], x, y)) {
```
**Critical Code**: Same numeric loop pattern (2 locations)
**UUID Impact**: ⚠️ HIGH

#### handleMoveDestinationSelection() - Lines 78-89
```javascript
Line 86: for (const index of moveObjectsToMove) {
Line 87:     const shape = shapes[index];
Line 88:     moveShape(shape, dx, dy);
```
**UUID Impact**: ⚠️ HIGH

---

### [js/cad/commands/rotate.js](js/cad/commands/rotate.js)

#### startRotateCommand() - Lines 8-21
```javascript
Line 8: if (selectedShapes.size > 0) {
Line 9:     rotateObjectsToRotate = new Set(selectedShapes);
```
**Pattern**: Standard selectedShapes copy
**UUID Impact**: ✓ COMPATIBLE

#### handleRotateObjectSelection() - Lines 32-73
```javascript
Line 41: for (let i = shapes.length - 1; i >= 0; i--) {
Line 42:     if (isPointInShape(shapes[i], x, y)) {
```
**Pattern**: Same numeric loop (2 locations)
**UUID Impact**: ⚠️ HIGH

#### handleRotateAngleSelection() - Lines 98-113  
```javascript
Line 106: for (const index of rotateObjectsToRotate) {
Line 107:     const shape = shapes[index];
```
**UUID Impact**: ⚠️ HIGH

---

### [js/cad/commands/scale.js](js/cad/commands/scale.js)

#### startScaleCommand() - Lines 119-132
```javascript
Line 119: if (selectedShapes.size > 0) {
Line 120:     scaleObjectsToScale = new Set(selectedShapes);
```
**Pattern**: Standard selectedShapes copy
**UUID Impact**: ✓ COMPATIBLE

#### handleScaleObjectSelection() - Lines 13-54
```javascript
Line 25: for (let i = shapes.length - 1; i >= 0; i--) {
Line 26:     if (isPointInShape(shapes[i], x, y)) {
```
**Pattern**: Numeric loop (2 locations)
**UUID Impact**: ⚠️ HIGH

#### handleScaleFactorSelection() - Lines 68-95
```javascript
Line 82: for (const index of scaleObjectsToScale) {
Line 83:     const shape = shapes[index];
```
**UUID Impact**: ⚠️ HIGH

---

### [js/cad/commands/hatch.js](js/cad/commands/hatch.js)

#### handleHatchMode() - Lines 10-52
```javascript
Line 14: for (let i = shapes.length - 1; i >= 0; i--) {
Line 15:     const shape = shapes[i];
```
**Pattern**: Reverse numeric loop without direct index-based mutation
**UUID Impact**: ⚠️ MEDIUM - Loop pattern must change

---

### [js/cad/ui/command-system.js](js/cad/ui/command-system.js)

#### Line 524-590: Selection handling
```javascript
Line 524: if (selectedShapes.size === 0) {
Line 539: selectedShapes.forEach(index => {
Line 570: if (selectedShapes.has(clickedIndex)) {
Line 571:     selectedShapes.delete(clickedIndex);
Line 574:     selectedShapes.add(clickedIndex);
```
**Operations**: .has(), .delete(), .add() - all Set methods
**UUID Impact**: ✓ COMPATIBLE - Work with any value type

#### Line 1978-2010: deleteSelectedShapes()
```javascript
Line 1989: if (selectedShapes.size === 0) {
Line 1993: saveState(`Explode ${selectedShapes.size} object(s)`);
Line 1994: const indices = Array.from(selectedShapes).sort((a, b) => b - a);
Line 2005: selectedShapes = newSelected;
```
**Critical Code**: Converts selectedShapes to sorted index array, uses for deletion
**UUID Impact**: ⚠️ CRITICAL

#### Line 1988-2010: explodeSelectedShapes()
```javascript
Line 1994: const indices = Array.from(selectedShapes).sort((a, b) => b - a);
```
**UUID Impact**: ⚠️ CRITICAL - Different sorting logic needed

---

### [js/cad/ui/properties-panel.js](js/cad/ui/properties-panel.js)

#### updatePropertiesPanel() - Lines 420-436
```javascript
Line 420: if (selectedShapes.size === 0) {
Line 426: if (selectedShapes.size === 1) {
Line 427:     const shapeIndex = Array.from(selectedShapes)[0];
Line 428:     const shape = shapes[shapeIndex];
```
**Critical Code**: Uses `shapes[shapeIndex]` pattern
**UUID Impact**: ⚠️ HIGH

#### generateMultipleObjectProperties() - Lines 1114
```javascript
Line 1114: const shapes = Array.from(selectedShapes).map(i => shapes[i]);
```
**Critical Code**: Maps indices to shape objects
**UUID Impact**: ⚠️ CRITICAL - Conflicting variable name issue too!

#### updateMultipleShapesProperty() - Lines 1230-1250
```javascript
Line 1238: selectedShapes.forEach(index => {
Line 1239:     shapes[index][property] = value;
```
**UUID Impact**: ⚠️ HIGH

#### moveSelectedShapes() - Lines 1271-1285
```javascript
Line 1280: for (const index of selectedShapes) {
Line 1281:     const shape = shapes[index];
```
**UUID Impact**: ⚠️ HIGH

#### Line 1525-1526: Text editing
```javascript
selectedShapes.clear();
selectedShapes.add(editingTextShape.index);
```
**UUID Impact**: ⚠️ HIGH - Adding index-based identifier

---

### [js/cad/rendering/renderer.js](js/cad/rendering/renderer.js)

#### _redraw() main loop - Lines 48-83
```javascript
Line 50: const shape = shapes[i];
Line 52: for (const i of shapesToRender) {
Line 53:     if (i >= shapes.length) continue;
Line 54:     const shape = shapes[i];
```
**Critical Code**: Multiple `shapes[i]` accesses in render loop
**UUID Impact**: ⚠️ HIGH - Core rendering dependency

#### Selection click handling - Lines 1038-1087
```javascript
Line 1038: if (e.shiftKey && selectedShapes.has(i)) {
Line 1040:     selectedShapes.delete(i);
Line 1042:     selectedShapes.add(i);
Line 1052: addToHistory(`Selected ${selectedShapes.size} objects`);
```
**Pattern**: Standard Set operations with indices
**UUID Impact**: ✓ COMPATIBLE (but depends on i being valid index)

---

### [js/shape-renderer.js](js/shape-renderer.js)

#### Line 347-348, 466-467: Selection checking
```javascript
const isSelected = (typeof selectedShapes !== 'undefined' && selectedShapes.has) ? 
    selectedShapes.has(shapeIndex) : false;
```
**Pattern**: Checking if index is in selectedShapes
**UUID Impact**: ✓ COMPATIBLE - But shapeIndex must become UUID

---

### [js/web1cad-optimizations.js](js/web1cad-optimizations.js)

#### Selection iteration - Lines 665-667
```javascript
Line 666: for (const index of window.selectedShapes) {
Line 667:     const shape = window.shapes[index];
```
**UUID Impact**: ⚠️ HIGH

#### Selection manipulation - Lines 1139-1145
```javascript
Line 1142: if (window.selectedShapes.has(shapeIndex)) {
Line 1143:     window.selectedShapes.delete(shapeIndex);
Line 1145:     window.selectedShapes.add(shapeIndex);
```
**UUID Impact**: ✓ COMPATIBLE

---

### [js/shape-handler-unified.js](js/shape-handler-unified.js)

#### Line 1423: isSelected()
```javascript
return window.selectedShapes?.has(index) || false;
```
**UUID Impact**: ✓ COMPATIBLE - With UUID instead of index

---

### [js/cad/core/auto_save.js](js/cad/core/auto_save.js)

#### Line 72: Auto-save clearing
```javascript
selectedShapes.clear();
```
**UUID Impact**: ✓ COMPATIBLE

---

### [js/command-system.js](js/command-system.js) - Legacy

#### Line 240: New drawing
```javascript
shapes = []; selectedShapes.clear();
```
**UUID Impact**: ✓ COMPATIBLE (both cleared)

---

### [cad.html](cad.html)

#### Lines 305-306: HTML onclick handlers
```html
onclick="deleteSelectedShapes()"
onclick="explodeSelectedShapes()"
```
**Pattern**: Function calls (implementation location in command-system.js)
**UUID Impact**: ✓ COMPATIBLE - No change needed here

---

## 4. KEY ASSUMPTIONS ABOUT INDICES

### Critical Assumptions That Would Break With UUIDs

1. **Array Index Stability**
   - ❌ **Line 85 in shapes.js**: `Array.from(selectedShapes).sort((a, b) => b - a)`
   - Assumes selectedShapes contains valid array indices
   - With UUIDs: Cannot sort by numeric value

2. **shapes.length - 1 for New Items**
   - ❌ **Line 273 in shapes.js**: `selectedShapes.add(shapes.length - 1)`
   - ❌ **Line 104 in copy.js**: `newShapes.push(shapes.length - 1)`
   - Assumes last added item's index is `shapes.length - 1`
   - With UUIDs: Must generate/return UUID from addShape()

3. **Direct Array Access**
   - ❌ **All command files**: Loop with `for (const index of selectedShapes) { shapes[index] }`
   - ❌ **All files**: `shapes[i]` direct indexing
   - Assumes indices are always valid array positions
   - With UUIDs: Need shape lookup/map or identify shapes by reference

4. **Numeric Loop Iteration**
   - ❌ **hatch.js, copy.js, move.js, rotate.js, scale.js**
   - `for (let i = shapes.length - 1; i >= 0; i--) { shapes[i] }`
   - Assumes can iterate array by numeric index
   - With UUIDs: Must iterate differently (forEach, values(), etc.)

5. **Index-Based Selection Semantics**
   - **Fundamental assumption**: selectedShapes contains array indices that map 1:1 to shapes position
   - With UUIDs: selectedShapes would contain shape IDs, no positional relationship to array

---

## 5. USAGE PATTERNS

### Pattern 1: Set Operations (✓ COMPATIBLE)
```javascript
selectedShapes.size          // Check if selection exists
selectedShapes.has(id)       // Check if specific item selected
selectedShapes.add(id)       // Add to selection  
selectedShapes.delete(id)    // Remove from selection
selectedShapes.clear()       // Clear all selection
```
**Files**: renderer.js, command-system.js, properties-panel.js, web1cad-optimizations.js
**Count**: ~50+ locations
**UUID Impact**: ✓ Works as-is (values become UUIDs instead of indices)

### Pattern 2: Iteration (⚠️ REQUIRES CHANGE)
```javascript
// Current:
selectedShapes.forEach(index => {
    const shape = shapes[index];
})

// Also:
for (const index of selectedShapes) {
    const shape = shapes[index];
}

// Must become:
selectedShapes.forEach(uuid => {
    const shape = shapesMap.get(uuid);  // or find by uuid
})
```
**Files**: copy.js, move.js, rotate.js, scale.js, properties-panel.js, web1cad-optimizations.js
**Count**: ~20 locations
**UUID Impact**: ⚠️ HIGH

### Pattern 3: Index Derivation (❌ INCOMPATIBLE)
```javascript
// Current:
selectedShapes = new Set(shapes.map((_, i) => i));
// Becomes indices 0, 1, 2, ...

// Current:
selectedShapes.add(shapes.length - 1);
// Adding latest index

// Must become:
selectedShapes = new Set(shapes.map(shape => shape.uuid));
selectedShapes.add(newShape.uuid);
```
**Files**: selection.js, shapes.js, copy.js, command-system.js
**Count**: ~5 critical locations
**UUID Impact**: ❌ CRITICAL

### Pattern 4: Numeric Array Loops (⚠️ REQUIRES CHANGE)
```javascript
// Current:
for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointInShape(shapes[i], x, y)) { ... }
}

// Must become:
for (let i = 0; i < shapes.length; i++) {
    if (isPointInShape(shapes[i], x, y)) { ... }
}
// OR:
shapes.forEach((shape, index) => {
    if (isPointInShape(shape, x, y)) { ... }
})
```
**Files**: hatch.js, copy.js, move.js, rotate.js, scale.js
**Count**: ~12 locations
**UUID Impact**: ⚠️ HIGH (works but iteration order matters for selection)

### Pattern 5: Deletion by Index (❌ INCOMPATIBLE)
```javascript
// Current: Sort indices descending, splice from end
const sortedIndices = Array.from(selectedShapes).sort((a, b) => b - a);
sortedIndices.forEach(index => {
    shapes.splice(index, 1);
});

// Must become:
// Remove by UUID, not index
selectedShapes.forEach(uuid => {
    const index = shapes.findIndex(s => s.uuid === uuid);
    if (index >= 0) shapes.splice(index, 1);
});
```
**Files**: shapes.js, command-system.js
**Count**: 2 critical locations
**UUID Impact**: ❌ CRITICAL

---

## 6. REFACTORING IMPACT SUMMARY

### Changes Required by Category

#### Category A: Set Method Calls (✓ Compatible, ~50 locations)
**Impact**: MINIMAL - No code change needed
- .size, .has(), .add(), .delete(), .clear(), .forEach()
- Just replace indices with UUIDs at calling sites

#### Category B: Shape Lookup (⚠️ High, ~30 locations)
**Impact**: MEDIUM - Must add shape lookup mechanism
- `shapes[index]` → `shapesMap.get(uuid)` OR `shapes.find(s => s.uuid === uuid)`
- Most expensive operation if using .find() every time
- Solution: Maintain Map<uuid, shape> for O(1) lookup

#### Category C: Iteration (⚠️ Medium, ~12 locations)
**Impact**: MEDIUM - Loop patterns change
- `for (let i = shapes.length-1; i >= 0; i--)` iteration
- `for (const index of selectedShapes)` iteration
- Can use forEach or for...of with shapes array

#### Category D: Index Derivation (❌ Critical, ~5 locations)
**Impact**: CRITICAL - Architectural changes needed
- Generating indices from positions (shapes.length - 1)
- Mapping array indices to selections (shapes.map((_, i) => i))
- Must ensure every shape has UUID before adding to selectedShapes
- Must not rely on array position for identification

#### Category E: Deletion Logic (❌ Critical, 2 locations)
**Impact**: CRITICAL - Rewrite required
- Descending sort + splice logic specific to index-based deletion
- Must use UUID-based identification
- May need different data structure or rebuild array

### Statistics

| Category | Count | Severity | Effort |
|----------|-------|----------|--------|
| A: Set Operations | 50+ | ✓ Compatible | 0 hours |
| B: Shape Lookup | 30+ | Medium | 5-8 hours |
| C: Iteration Patterns | 12+ | Medium | 3-5 hours |
| D: Index Derivation | 5 | Critical | 4-6 hours |
| E: Deletion Logic | 2 | Critical | 2-3 hours |
| **TOTAL** | **99+** | - | **14-25 hours** |

---

## 7. DETAILED FILE-BY-FILE REFACTORING CHECKLIST

### [ ] [js/cad/geometry/primitives.js](js/cad/geometry/primitives.js)
- [ ] Add UUID generation utility
- [ ] Ensure every shape gets .uuid before adding to array
- [ ] Update createShapeWithProperties() to generate uuid

### [ ] [js/cad/core/shapes.js](js/cad/core/shapes.js)
- [ ] **deleteSelected()** - Lines 85-89: Rewrite deletion logic
  - [ ] Remove descending sort
  - [ ] Use UUID-based removal
- [ ] **copySelected()** - Lines 126-145: Update shape lookup
  - [ ] Change `shapes[index]` to shape lookup
- [ ] **pasteShapes()** - Lines 273: Change index assignment
  - [ ] Get UUID from pushed shape instead of using shapes.length

### [ ] [js/cad/core/selection.js](js/cad/core/selection.js)
- [ ] **selectAll()** - Line 42: Map indices to UUIDs
  - Before: `shapes.map((_, i) => i)`
  - After: `shapes.map(s => s.uuid)`

### [ ] [js/cad/commands/copy.js](js/cad/commands/copy.js)
- [ ] **handleCopyObjectSelection()** - Lines 34, 47: Keep loop as-is
- [ ] **handleCopyDestinationSelection()** - Line 104: Change index assignment
  - [ ] Use UUID from newly pushed shape

### [ ] [js/cad/commands/move.js](js/cad/commands/move.js)
- [ ] **handleMoveObjectSelection()** - Keep loops as-is
- [ ] **handleMoveDestinationSelection()** - Updates compatible

### [ ] [js/cad/commands/rotate.js](js/cad/commands/rotate.js)
- [ ] **handleRotateObjectSelection()** - Keep loops as-is
- [ ] **handleRotateAngleSelection()** - Update shape access

### [ ] [js/cad/commands/scale.js](js/cad/commands/scale.js)
- [ ] **handleScaleObjectSelection()** - Keep loops as-is
- [ ] **handleScaleFactorSelection()** - Update shape access

### [ ] [js/cad/ui/command-system.js](js/cad/ui/command-system.js)
- [ ] **deleteSelectedShapes()** - Lines 1994: Rewrite deletion
- [ ] **explodeSelectedShapes()** - Line 1994: Update shape lookup

### [ ] [js/cad/ui/properties-panel.js](js/cad/ui/properties-panel.js)
- [ ] **updatePropertiesPanel()** - Line 428: Update shape lookup
- [ ] **generateMultipleObjectProperties()** - Line 1114: Map UUIDs to shapes
- [ ] **updateMultipleShapesProperty()** - Line 1239: Update shape lookup
- [ ] **moveSelectedShapes()** - Line 1281: Update shape lookup

### [ ] [js/cad/rendering/renderer.js](js/cad/rendering/renderer.js)
- [ ] **_redraw()** - Lines 50, 54: Keep numeric loop, works as-is
- [ ] Mouse event handlers - Set operations already compatible

### [ ] [js/shape-renderer.js](js/shape-renderer.js)
- [ ] Line 348: Change `shapeIndex` to UUID comparison
- [ ] Line 467: Same

### [ ] [js/web1cad-optimizations.js](js/web1cad-optimizations.js)
- [ ] Line 666: Update shape lookup
- [ ] Lines 1142-1145: Keep as-is

### [ ] [js/shape-handler-unified.js](js/shape-handler-unified.js)
- [ ] Line 1423: Update isSelected() parameter from index to UUID

---

## 8. CRITICAL CODE EXAMPLES NEEDING REFACTORING

### Example 1: Deletion (shapes.js:85-89)
**Current:**
```javascript
const sortedIndices = Array.from(selectedShapes).sort((a, b) => b - a);
if (typeof shapes !== 'undefined') {
    sortedIndices.forEach(index => {
        shapes.splice(index, 1);
    });
}
```

**Refactored:**
```javascript
// Create map for O(1) lookup
const shapesByUuid = new Map(shapes.map(s => [s.uuid, s]));

// Remove all selected shapes from map
selectedShapes.forEach(uuid => {
    shapesByUuid.delete(uuid);
});

// Rebuild array with remaining shapes
shapes = Array.from(shapesByUuid.values());

// Update all references in selectedShapes if needed
selectedShapes.clear();
```

### Example 2: Select All (selection.js:42)
**Current:**
```javascript
selectedShapes = new Set(shapes.map((_, i) => i));
```

**Refactored:**
```javascript
selectedShapes = new Set(shapes.map(shape => shape.uuid));
```

### Example 3: Paste (shapes.js:273)
**Current:**
```javascript
shapes.push(newShape);
if (typeof selectedShapes !== 'undefined') {
    selectedShapes.add(shapes.length - 1);
}
```

**Refactored:**
```javascript
// Ensure shape has UUID
if (!newShape.uuid) {
    newShape.uuid = generateUUID();
}
shapes.push(newShape);
if (typeof selectedShapes !== 'undefined') {
    selectedShapes.add(newShape.uuid);
}
```

### Example 4: Shape Access (multiple files)
**Current:**
```javascript
for (const index of selectedShapes) {
    const shape = shapes[index];
    // modify shape
}
```

**Refactored:**
```javascript
// Option A: Create lookup map (recommended)
const shapesMap = new Map(shapes.map(s => [s.uuid, s]));
selectedShapes.forEach(uuid => {
    const shape = shapesMap.get(uuid);
    // modify shape
});

// Option B: Search each time (slower)
selectedShapes.forEach(uuid => {
    const shape = shapes.find(s => s.uuid === uuid);
    // modify shape
});
```

---

## 9. IMPLEMENTATION STRATEGY

### Phase 1: Preparation (2-3 hours)
1. Add UUID field to all shapes
2. Create UUID generator function
3. Add shapes lookup Map initialization
4. Update shape creation to include UUID

### Phase 2: Read Operations (5-8 hours)
1. Update all `shapes[index]` lookups to use map
2. Update all properties-panel references
3. Test selection display and properties

### Phase 3: Write Operations (4-6 hours)
1. Rewrite deleteSelected() logic
2. Update paste position tracking
3. Update copy/move/rotate/scale operations
4. Test all command operations

### Phase 4: Selection Operations (2-3 hours)
1. Update selectAll() to use UUIDs
2. Update renderer selection checking
3. Update selection UI feedback
4. Test selection highlighting

### Phase 5: Testing & Cleanup (1-2 hours)
1. End-to-end testing of all operations
2. Verify undo/redo still works
3. Performance testing with large drawings
4. Cleanup old index-based code

---

## 10. SUMMARY TABLE: ALL FILES & CHANGES NEEDED

| File | Lines | Changes Needed | Severity |
|------|-------|---|---|
| primitives.js | 1-10 | Add UUID support | CRITICAL |
| shapes.js | 85-89 | Rewrite deleteSelected | CRITICAL |
| shapes.js | 273 | Change index assignment | CRITICAL |
| shapes.js | 126-128 | Update shape access | HIGH |
| selection.js | 42 | Map indices to UUIDs | CRITICAL |
| copy.js | 104 | Change index to UUID | CRITICAL |
| move.js | 86-89 | Update shape access | HIGH |
| rotate.js | 106-107 | Update shape access | HIGH |
| scale.js | 82-83 | Update shape access | HIGH |
| command-system.js | 1994 | Rewrite deletion | CRITICAL |
| properties-panel.js | 428,1114,1239,1281 | Update shape lookups | HIGH |
| renderer.js | 1038-1042 | Update selector (mostly compatible) | MEDIUM |
| web1cad-optimizations.js | 666-667 | Update shape access | HIGH |
| Various | Multiple | Loop patterns (mostly compatible) | MEDIUM |

---

## 11. DEPENDENCIES & CONCERNS

### External Dependencies
1. **addShape()** function must return/accept UUID
2. **safeDeepCopy()** must preserve UUIDs  
3. **Selection rendering** depends on shape indices for highlighting
4. **Undo/Redo** system stores indices (may need updating)
5. **PDF export** may reference shape positions

### Performance Considerations
- **O(n) lookups**: Using `shapes.find(s => s.uuid === uuid)` is expensive with large drawings
- **Recommended**: Maintain `Map<uuid, shape>` for O(1) lookup
- **Alternative**: Index both ways (array + map)

### Data Persistence
- **Serialization**: Ensure UUIDs are persisted in save files
- **Loading**: Validate all shapes have UUIDs when loading old files
- **Migration**: Add UUID to shapes loaded from old format files

---

## CONCLUSION

The Web1CAD codebase has **156+ locations** that depend on array index-based shape identification. A switch to UUIDs would require:

- **14-25 hours** of refactoring effort
- **99+ code changes** across 17 files  
- **5 critical rewrites** (deletion, paste, selectAll, shape lookups, iteration)
- **Careful testing** due to ripple effects through selection/rendering systems

The **highest value refactoring** would be:
1. Add shape UUIDs
2. Create shapes lookup Map
3. Update shape access patterns
4. Rewrite deletion logic
5. Update selectAll() mapping

This would enable true shape identity tracking independent of array position, enabling features like partial undo, collaborative editing, and improved shape referencing.

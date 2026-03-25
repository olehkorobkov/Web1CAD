function startCopyCommand() {
    if (selectedShapes.size > 0) {
        copyObjectsToCopy = new Set(selectedShapes);
        copyStep = 1;
        setMode('copy');
        updateHelpBar(`Step 2/3: Click base point for copying ${copyObjectsToCopy.size} object(s)`);
        addToHistory(`Copying ${copyObjectsToCopy.size} object(s). Click base point for copy operation.`);
    } else {
        copyStep = 0;
        setMode('copy');
        addToHistory('Copy command: Select objects to copy.');
    }
}

function handleCopyMode(x, y, e) {
    switch(copyStep) {
        case 0:
            handleCopyObjectSelection(x, y, e);
            break;
        case 1:
            handleCopyBasePointSelection(x, y, e);
            break;
        case 2:
            handleCopyDestinationSelection(x, y, e);
            break;
    }
}

function handleCopyObjectSelection(x, y, e) {
    if (e.shiftKey) {
    } else {
        let clickedOnSelected = false;
        // PHASE 1D: Check if clicked on any selected shape (by UUID)
        for (const uuid of copyObjectsToCopy) {
            const shape = getShapeById(uuid);
            if (shape && isPointInShape(shape, x, y)) {
                clickedOnSelected = true;
                break;
            }
        }
        if (!clickedOnSelected) {
            copyObjectsToCopy.clear();
        }
    }

    let objectWasSelected = false;
    
    // Find which shape was clicked (iterate from end for top-most)
    for (let i = shapes.length - 1; i >= 0; i--) {
        if (isPointInShape(shapes[i], x, y)) {
            // PHASE 1D: Use shape.uuid instead of index
            const shapeUuid = shapes[i].uuid;
            if (copyObjectsToCopy.has(shapeUuid)) {
                copyObjectsToCopy.delete(shapeUuid);
                if (copyObjectsToCopy.size === 0) {
                    updateHelpBar('Step 1/3: Select objects to copy');
                }
            } else {
                copyObjectsToCopy.add(shapeUuid);
                objectWasSelected = true;
                copyStep = 1;
                updateHelpBar(`Step 2/3: Click base point for copying ${copyObjectsToCopy.size} object(s)`);
            }
            redraw();
            return;
        }
    }
    
    if (copyObjectsToCopy.size > 0) {
        copyStep = 1;
        updateHelpBar(`Step 2/3: Click base point for copying ${copyObjectsToCopy.size} object(s)`);
    } else {
        updateHelpBar('Step 1/3: Select objects to copy');
    }
}

function handleCopyBasePointSelection(x, y, e) {
    copyBasePoint = { x, y };
    copyStep = 2;
    copyPreviewActive = true;
    
    previewX = x;
    previewY = y;
    
    updateHelpBar('Step 3/3: Click destination point to complete copy');
    addToHistory(`Base point set at (${x.toFixed(2)}, ${y.toFixed(2)}). Copy preview follows cursor.`);
    redraw();
}

function handleCopyDestinationSelection(x, y, e) {
    const dx = x - copyBasePoint.x;
    const dy = y - copyBasePoint.y;
    
    saveState(`Copy ${copyObjectsToCopy.size} object(s)`);
    
    const newShapeUuids = [];
    // PHASE 1D: Iterate over UUIDs instead of indices
    for (const uuid of copyObjectsToCopy) {
        const originalShape = getShapeById(uuid);
        if (!originalShape) continue;
        
        const copiedShape = safeDeepCopy(originalShape, {}, 'copied shape'); 
        if (copiedShape && typeof copiedShape === 'object') {
            // PHASE 1D: Generate new UUID for the copy (not reuse original)
            copiedShape.uuid = generateShapeUUID();
            
            moveShape(copiedShape, dx, dy); 
            
            copiedShape.layer = currentLayer;
            copiedShape.color = currentColor;
            copiedShape.lineWeight = currentLineWeight;
            
            shapes.push(copiedShape);
            newShapeUuids.push(copiedShape.uuid);  // Use UUID instead of array index
        } else {
            console.error('Failed to copy shape with UUID:', uuid);
            addToHistory('Warning: Failed to copy one or more shapes', 'warning');
        }
    }
    
    // PHASE 1D: Select copied shapes by UUID
    selectedShapes = new Set(newShapeUuids);
    
    // Invalidate caches after new shapes are added (PHASE 2/3)
    if (typeof invalidateShapeSetBoundsCache === 'function') {
        invalidateShapeSetBoundsCache(new Set(newShapeUuids));
    }
    if (typeof invalidateQuadTree === 'function') {
        invalidateQuadTree();
    }
    if (typeof invalidateViewportCache === 'function') {
        invalidateViewportCache();
    }
    
    updateHelpBar('Objects copied! Returning to selection mode...');
    setTimeout(() => {
        updateHelpBar('Use drawing tools to create shapes');
    }, 2000);
    addToHistory(`Copied ${copyObjectsToCopy.size} object(s) by (${dx.toFixed(2)}, ${dy.toFixed(2)})`);
    
    resetCopyMode();
    redraw();
}

function resetCopyMode() {
    copyStep = 0;
    copyBasePoint = { x: 0, y: 0 };
    copyObjectsToCopy.clear();
    copyPreviewActive = false;
    if (mode === 'copy') {
        mode = 'select';
        updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
    }
}

window.startCopyCommand = startCopyCommand;
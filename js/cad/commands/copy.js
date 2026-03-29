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
    
    const newShapes = [];
    for (const index of copyObjectsToCopy) {
        const originalShape = shapes[index];
        const copiedShape = safeDeepCopy(originalShape, {}, 'copied shape'); 
        if (copiedShape && typeof copiedShape === 'object') {
            moveShape(copiedShape, dx, dy); 
            
            copiedShape.layer = currentLayer;
            copiedShape.color = currentColor;
            copiedShape.lineWeight = currentLineWeight;
            
            shapes.push(copiedShape);
            newShapes.push(shapes.length - 1); 
        } else {
            console.error('Failed to copy shape:', originalShape);
            addToHistory('Warning: Failed to copy one or more shapes', 'warning');
        }
    }
    
    selectedShapes = new Set(newShapes);
    
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
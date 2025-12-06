function startMoveCommand() {
    if (selectedShapes.size > 0) {
        moveObjectsToMove = new Set(selectedShapes);
        moveStep = 1;
        setMode('move');
        updateHelpBar(`Step 2/3: Click base point for moving ${moveObjectsToMove.size} object(s)`);
        addToHistory(`Moving ${moveObjectsToMove.size} object(s). Click base point for move operation.`);
    } else {
        moveStep = 0;
        setMode('move');
        addToHistory('Move command: Select objects to move.');
    }
}

function handleMoveMode(x, y, e) {
    switch(moveStep) {
        case 0:
            handleMoveObjectSelection(x, y, e);
            break;
        case 1:
            handleMoveBasePointSelection(x, y, e);
            break;
        case 2:
            handleMoveDestinationSelection(x, y, e);
            break;
    }
}

function handleMoveObjectSelection(x, y, e) {
    if (e.shiftKey) {
    } else {
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
                moveStep = 1;
                updateHelpBar(`Step 2/3: Click base point for moving ${moveObjectsToMove.size} object(s)`);
            }
            redraw();
            return;
        }
    }
    
    if (moveObjectsToMove.size > 0) {
        moveStep = 1;
        updateHelpBar(`Step 2/3: Click base point for moving ${moveObjectsToMove.size} object(s)`);
    } else {
        updateHelpBar('Step 1/3: Select objects to move');
    }
}

function handleMoveBasePointSelection(x, y, e) {
    moveBasePoint = { x, y };
    moveStep = 2;
    movePreviewActive = true;
    
    previewX = x;
    previewY = y;
    
    updateHelpBar('Step 3/3: Click destination point to complete move');
    addToHistory(`Base point set at (${x.toFixed(2)}, ${y.toFixed(2)}). Objects now follow cursor.`);
    redraw();
}

function handleMoveDestinationSelection(x, y, e) {
    const dx = x - moveBasePoint.x;
    const dy = y - moveBasePoint.y;
    
    for (const index of moveObjectsToMove) {
        const shape = shapes[index];
        moveShape(shape, dx, dy);
    }
    
    selectedShapes = new Set(moveObjectsToMove);
    
    updateHelpBar('Objects moved! Returning to selection mode...');
    setTimeout(() => {
        updateHelpBar('Use drawing tools to create shapes');
    }, 2000);
    addToHistory(`Moved ${moveObjectsToMove.size} object(s) by (${dx.toFixed(2)}, ${dy.toFixed(2)})`);
    
    resetMoveMode();
    redraw();
}

function resetMoveMode() {
    moveStep = 0;
    moveBasePoint = { x: 0, y: 0 };
    moveObjectsToMove.clear();
    movePreviewActive = false;
    if (mode === 'move') {
        mode = 'select';
        updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
    }
}

window.startMoveCommand = startMoveCommand;

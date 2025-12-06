let rotateStep = 0; 
let rotateBasePoint = { x: 0, y: 0 };
let rotateObjectsToRotate = new Set();
let rotatePreviewActive = false;
let rotateStartAngle = 0;

function startRotateCommand() {
    if (selectedShapes.size > 0) {
        rotateObjectsToRotate = new Set(selectedShapes);
        rotateStep = 1;
        setMode('rotate');
        updateHelpBar(`Step 2/3: Click center point for rotating ${rotateObjectsToRotate.size} object(s)`);
        addToHistory(`Rotating ${rotateObjectsToRotate.size} object(s). Click center point for rotation.`);
    } else {
        rotateStep = 0;
        setMode('rotate');
        updateHelpBar('Step 1/3: Select objects to rotate');
        addToHistory('Rotate command: Select objects to rotate.');
    }
}

function handleRotateMode(x, y, e) {
    switch(rotateStep) {
        case 0:
            handleRotateObjectSelection(x, y, e);
            break;
        case 1:
            handleRotateCenterPointSelection(x, y, e);
            break;
        case 2:
            handleRotateAngleSelection(x, y, e);
            break;
    }
}

function handleRotateObjectSelection(x, y, e) {
    if (e.shiftKey) {
    } else {
        let clickedOnSelected = false;
        for (const i of rotateObjectsToRotate) {
            if (isPointInShape(shapes[i], x, y)) {
                clickedOnSelected = true;
                break;
            }
        }
        if (!clickedOnSelected) {
            rotateObjectsToRotate.clear();
        }
    }

    let objectWasSelected = false;
    
    for (let i = shapes.length - 1; i >= 0; i--) {
        if (isPointInShape(shapes[i], x, y)) {
            if (rotateObjectsToRotate.has(i)) {
                rotateObjectsToRotate.delete(i);
                if (rotateObjectsToRotate.size === 0) {
                    updateHelpBar('Step 1/3: Select objects to rotate');
                }
            } else {
                rotateObjectsToRotate.add(i);
                objectWasSelected = true;
                rotateStep = 1;
                updateHelpBar(`Step 2/3: Click center point for rotating ${rotateObjectsToRotate.size} object(s)`);
            }
            redraw();
            return;
        }
    }
    
    if (rotateObjectsToRotate.size > 0) {
        rotateStep = 1;
        updateHelpBar(`Step 2/3: Click center point for rotating ${rotateObjectsToRotate.size} object(s)`);
    } else {
        updateHelpBar('Step 1/3: Select objects to rotate');
    }
}

function handleRotateCenterPointSelection(x, y, e) {
    rotateBasePoint = { x, y };
    rotateStep = 2;
    rotatePreviewActive = true;
    rotateStartAngle = 0; 
    
    previewX = x;
    previewY = y;
    
    showAngleInput(e.offsetX, e.offsetY);
    
    updateHelpBar('Step 3/3: Move cursor to set rotation angle, type angle + Enter, or click to confirm');
    addToHistory(`Center point set at (${x.toFixed(2)}, ${y.toFixed(2)}). Enter angle in degrees or move cursor for rotation.`);
    redraw();
}

function handleRotateAngleSelection(x, y, e) {
    if (isLengthInputActive) {
        hideLengthInput();
    }
    
    const dx = x - rotateBasePoint.x;
    const dy = y - rotateBasePoint.y;
    const currentAngle = Math.atan2(dy, dx);
    const rotationAngle = currentAngle - rotateStartAngle;
    
    saveState(`Rotate ${rotateObjectsToRotate.size} object(s)`);
    
    for (const index of rotateObjectsToRotate) {
        const shape = shapes[index];
        rotateShape(shape, rotateBasePoint.x, rotateBasePoint.y, rotationAngle);
    }
    
    selectedShapes = new Set(rotateObjectsToRotate);
    
    updateHelpBar('Objects rotated! Returning to selection mode...');
    setTimeout(() => {
        updateHelpBar('Use drawing tools to create shapes');
    }, 2000);
    addToHistory(`Rotated ${rotateObjectsToRotate.size} object(s) by ${(rotationAngle * 180 / Math.PI).toFixed(1)} degrees`);
    
    resetRotateMode();
    redraw();
}

function resetRotateMode() {
    rotateStep = 0;
    rotateBasePoint = { x: 0, y: 0 };
    rotateObjectsToRotate.clear();
    rotatePreviewActive = false;
    rotateStartAngle = 0;
    if (mode === 'rotate') {
        mode = 'select';
        updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
    }
}

window.startRotateCommand = startRotateCommand;
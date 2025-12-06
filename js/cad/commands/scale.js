let scaleStep = 0; 
let scaleBasePoint = { x: 0, y: 0 };
let scaleObjectsToScale = new Set();
let scalePreviewActive = false;

function handleScaleMode(x, y, e) {
    switch(scaleStep) {
        case 0:
            handleScaleObjectSelection(x, y, e);
            break;
        case 1:
            handleScaleBasePointSelection(x, y, e);
            break;
        case 2:
            handleScaleFactorSelection(x, y, e);
            break;
    }
}

function handleScaleObjectSelection(x, y, e) {
    if (e.shiftKey) {
    } else {
        let clickedOnSelected = false;
        for (const i of scaleObjectsToScale) {
            if (isPointInShape(shapes[i], x, y)) {
                clickedOnSelected = true;
                break;
            }
        }
        if (!clickedOnSelected) {
            scaleObjectsToScale.clear();
        }
    }

    let objectWasSelected = false;
    
    for (let i = shapes.length - 1; i >= 0; i--) {
        if (isPointInShape(shapes[i], x, y)) {
            if (scaleObjectsToScale.has(i)) {
                scaleObjectsToScale.delete(i);
                if (scaleObjectsToScale.size === 0) {
                    updateHelpBar('Step 1/3: Select objects to scale');
                }
            } else {
                scaleObjectsToScale.add(i);
                objectWasSelected = true;
                scaleStep = 1;
                updateHelpBar(`Step 2/3: Click base point for scaling ${scaleObjectsToScale.size} object(s)`);
            }
            redraw();
            return;
        }
    }
    
    if (scaleObjectsToScale.size > 0) {
        scaleStep = 1;
        updateHelpBar(`Step 2/3: Click base point for scaling ${scaleObjectsToScale.size} object(s)`);
    } else {
        updateHelpBar('Step 1/3: Select objects to scale');
    }
}

function handleScaleBasePointSelection(x, y, e) {
    scaleBasePoint = { x, y };
    scaleStep = 2;
    scalePreviewActive = true;
    
    previewX = x;
    previewY = y;
    
    showScaleInput(e.offsetX, e.offsetY);
    
    updateHelpBar('Step 3/3: Move cursor to set scale factor, type factor + Enter, or click to confirm');
    addToHistory(`Base point set at (${x.toFixed(2)}, ${y.toFixed(2)}). Enter scale factor or move cursor for scaling.`);
    redraw();
}

function handleScaleFactorSelection(x, y, e) {
    if (isLengthInputActive) {
        hideLengthInput();
    }
    
    const dx = x - scaleBasePoint.x;
    const dy = y - scaleBasePoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const scaleFactor = Math.max(0.01, distance / 100); 
    
    saveState(`Scale ${scaleObjectsToScale.size} object(s)`);
    
    for (const index of scaleObjectsToScale) {
        const shape = shapes[index];
        scaleShape(shape, scaleBasePoint.x, scaleBasePoint.y, scaleFactor);
    }
    
    selectedShapes = new Set(scaleObjectsToScale);
    
    updateHelpBar('Objects scaled! Returning to selection mode...');
    setTimeout(() => {
        updateHelpBar('Use drawing tools to create shapes');
    }, 2000);
    addToHistory(`Scaled ${scaleObjectsToScale.size} object(s) by factor ${scaleFactor.toFixed(2)} around (${scaleBasePoint.x.toFixed(2)}, ${scaleBasePoint.y.toFixed(2)})`);
    
    resetScaleMode();
    redraw();
}

function resetScaleMode() {
    scaleStep = 0;
    scaleBasePoint = { x: 0, y: 0 };
    scaleObjectsToScale.clear();
    scalePreviewActive = false;
    if (mode === 'scale') {
        mode = 'select';
        updateHelpBar('Selection mode (default) - Click objects to select, drag to select area');
    }
}

function startScaleCommand() {
    if (selectedShapes.size > 0) {
        scaleObjectsToScale = new Set(selectedShapes);
        scaleStep = 1;
        setMode('scale');
        updateHelpBar(`Step 2/3: Click base point for scaling ${scaleObjectsToScale.size} object(s)`);
        addToHistory(`Scaling ${scaleObjectsToScale.size} object(s). Click base point for scale center.`);
    } else {
        scaleStep = 0;
        setMode('scale');
        updateHelpBar('Step 1/3: Select objects to scale');
        addToHistory('Scale command: Select objects to scale.');
    }
}

window.startScaleCommand = startScaleCommand;
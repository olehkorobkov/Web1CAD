/*
 * Command System Module - Web1CAD System
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 * If you see this code elsewhere, it was copied.
 */

// === Command System Module ===
// This module handles command line interface and command execution

// Command executor
function executeCommand(cmd) {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0].toLowerCase();

    try {
        switch(command) {
            case 'line':
                // Usage: line from x1 y1 x2 y2
                if (parts.length === 6 && parts[1] === 'from') {
                    // Use safe parsing with proper error handling
                    const coords = [
                        safeParseFloat(parts[2], NaN, 'x1'),
                        safeParseFloat(parts[3], NaN, 'y1'), 
                        safeParseFloat(parts[4], NaN, 'x2'),
                        safeParseFloat(parts[5], NaN, 'y2')
                    ];
                    
                    if (coords.some(v => isNaN(v))) {
                        addToHistory('Invalid coordinates for line', 'error');
                        return;
                    }
                    
                    const [x1, y1, x2, y2] = coords;
                    addShape({ type: 'line', x1, y1, x2, y2 });
                    addToHistory(`Line created from (${x1}, ${y1}) to (${x2}, ${y2})`);
                    redraw();
                    commandInput.focus();
                } else {
                    setMode('line');
                }
                break;

            case 'circle':
                // Usage: circle center cx cy radius
                if (parts.length === 5 && parts[1] === 'center') {
                    // Use safe parsing with proper error handling
                    const coords = [
                        safeParseFloat(parts[2], NaN, 'cx'),
                        safeParseFloat(parts[3], NaN, 'cy'), 
                        safeParseFloat(parts[4], NaN, 'radius')
                    ];
                    
                    if (coords.some(v => isNaN(v)) || coords[2] <= 0) {
                        addToHistory('Invalid parameters for circle (radius must be > 0)', 'error');
                        return;
                    }
                    
                    const [cx, cy, radius] = coords;
                    addShape({ type: 'circle', cx, cy, radius });
                    addToHistory(`Circle created at (${cx}, ${cy}) with radius ${radius}`);
                    redraw();
                } else {
                    setMode('circle');
                }
                break;

            case 'arc':
                // Usage: arc center cx cy radius startAngle endAngle
                if (parts.length === 7 && parts[1] === 'center') {
                    // Use safe parsing with proper error handling
                    const coords = [
                        safeParseFloat(parts[2], NaN, 'cx'),
                        safeParseFloat(parts[3], NaN, 'cy'), 
                        safeParseFloat(parts[4], NaN, 'radius'),
                        safeParseFloat(parts[5], NaN, 'startAngle'),
                        safeParseFloat(parts[6], NaN, 'endAngle')
                    ];
                    
                    if (coords.some(v => isNaN(v)) || coords[2] <= 0) {
                        addToHistory('Invalid parameters for arc (radius must be > 0)', 'error');
                        return;
                    }
                    
                    const [cx, cy, radius, startAngle, endAngle] = coords;
                    addShape({ type: 'arc', cx, cy, radius, startAngle, endAngle });
                    addToHistory(`Arc created at (${cx}, ${cy}) with radius ${radius}`);
                    redraw();
                } else {
                    setMode('arc');
                }
                break;

            case 'rectangle':
                // Usage: rectangle from x y width height
                if (parts.length === 6 && parts[1] === 'from') {
                    // Use safe parsing with proper error handling
                    const coords = [
                        safeParseFloat(parts[2], NaN, 'x'),
                        safeParseFloat(parts[3], NaN, 'y'), 
                        safeParseFloat(parts[4], NaN, 'width'),
                        safeParseFloat(parts[5], NaN, 'height')
                    ];
                    
                    if (coords.some(v => isNaN(v)) || coords[2] <= 0 || coords[3] <= 0) {
                        addToHistory('Invalid parameters for rectangle (width and height must be > 0)', 'error');
                        return;
                    }
                    
                    const [x, y, width, height] = coords;
                    addShape({ type: 'rectangle', x, y, width, height });
                    addToHistory(`Rectangle created from (${x}, ${y}) with dimensions ${width}x${height}`);
                    redraw();
                } else {
                    setMode('rectangle');
                }
                break;

            case 'polygon':
                // Usage: polygon sides N radius R [cx cy]
                if ((parts.length === 4 || parts.length === 6) && parts[1] === 'sides') {
                    const polygonSides = parseInt(parts[2]);
                    const radius = safeParseFloat(parts[3], NaN, 'polygon radius');
                    let cx = 0, cy = 0;
                    if (parts.length === 6) {
                        cx = safeParseFloat(parts[4], NaN, 'polygon cx');
                        cy = safeParseFloat(parts[5], NaN, 'polygon cy');
                    }
                    if (isNaN(polygonSides) || isNaN(radius) || isNaN(cx) || isNaN(cy) || 
                        polygonSides < 3 || polygonSides > 50 || radius <= 0) {
                        addToHistory('Invalid parameters for polygon (sides: 3-50, radius > 0)', 'error');
                        return;
                    }
                    const points = [];
                    for (let i = 0; i < polygonSides; i++) {
                        const angle = i * 2 * Math.PI / polygonSides - Math.PI/2;
                        points.push({
                            x: cx + radius * Math.cos(angle),
                            y: cy + radius * Math.sin(angle)
                        });
                    }
                    addShape({ type: 'polygon', points });
                    addToHistory(`Polygon created with ${polygonSides} sides, radius ${radius}, center (${cx}, ${cy})`);
                    redraw();
                } else {
                    setMode('polygon');
                }
                break;

            case 'point':
                if (parts.length === 3) {
                    // Use safe parsing with proper error handling
                    const coords = [
                        safeParseFloat(parts[1], NaN, 'point x'),
                        safeParseFloat(parts[2], NaN, 'point y')
                    ];
                    
                    if (coords.some(v => isNaN(v))) {
                        addToHistory('Invalid coordinates for point', 'error');
                        return;
                    }
                    
                    const [x, y] = coords;
                    addShape({ type: 'point', x, y });
                    addToHistory(`Point created at (${x}, ${y})`);
                    redraw();
                } else {
                    setMode('point');
                }
                break;

            case 'text':
                if (parts.length >= 3) {
                    const x = parseFloat(parts[1]);
                    const y = parseFloat(parts[2]);
                    if ([x, y].some(v => isNaN(v))) {
                        addToHistory('Invalid coordinates for text', 'error');
                        return;
                    }
                    const content = parts.slice(3).join(' ');
                    addShape({
                        type: 'text',
                        x,
                        y,
                        content,
                        size: 12 / zoom
                    });
                    addToHistory(`Text created at (${x}, ${y}): ${content}`);
                    redraw();
                } else {
                    setMode('text');
                }
                break;

            case 'grid':
                if (parts[1] === 'on') {
                    showGrid = true;
                    addToHistory('Grid ON');
                } else if (parts[1] === 'off') {
                    showGrid = false;
                    addToHistory('Grid OFF');
                }
                redraw();
                break;

            case 'clear':
                shapes = [];
                selectedShapes.clear();
                addToHistory('Drawing cleared');
                redraw();
                break;

            case 'select':
                if (parts[1] === 'all') {
                    selectAll();
                } else {
                    setMode('select');
                }
                break;

            case 'move':
                if (parts.length === 3) {
                    const dx = parseFloat(parts[1]);
                    const dy = parseFloat(parts[2]);
                    if ([dx, dy].some(v => isNaN(v))) {
                        addToHistory('Invalid move values', 'error');
                        return;
                    }
                    moveSelectedShapes(dx, dy);
                } else {
                    startMoveCommand();
                }
                break;

            case 'copy':
            case 'cp':
                startCopyCommand();
                break;

            case 'zoom':
                if (parts[1] === 'extents' || parts[1] === 'fit' || parts[1] === 'all') {
                    zoomToFit();
                    redraw();
                    addToHistory(`Zoom ${parts[1]} executed`);
                } else {
                    addToHistory('Usage: zoom extents|fit|all', 'error');
                }
                break;

            case 'help':
                addToHistory('Drawing commands: line, circle, arc, rectangle, polygon, point, text');
                addToHistory('View commands: grid [on|off], zoom extents');
                addToHistory('Edit commands: select [all], move dx dy, delete, undo, redo');
                addToHistory('Other: layer, help');
                addToHistory('Polygon tool: Click polygon button -> set sides (3+) -> choose radius mode or enter diameter');
                break;

            case 'undo':
                undoAction();
                break;

            case 'redo':
                redoAction();
                break;

            case 'layer':
                toggleLayerManager();
                break;

            case 'delete':
                deleteSelectedShapes();
                break;

            case 'move':
                // Usage: move (starts move mode)
                if (selectedShapes.size > 0) {
                    startMoveCommand();
                    addToHistory('Move mode started');
                } else {
                    addToHistory('Select objects first to move', 'error');
                }
                break;

            case 'copy':
                // Usage: copy (starts copy mode)
                if (selectedShapes.size > 0) {
                    startCopyCommand();
                    addToHistory('Copy mode started');
                } else {
                    addToHistory('Select objects first to copy', 'error');
                }
                break;

            case 'erase':
            case 'delete':
                // Usage: erase (deletes selected objects)
                if (selectedShapes.size > 0) {
                    deleteSelectedShapes();
                    addToHistory(`Deleted ${selectedShapes.size} objects`);
                } else {
                    addToHistory('No objects selected to delete', 'error');
                }
                break;

            case 'zoom':
                // Usage: zoom [scale] or zoom fit
                if (parts.length > 1) {
                    if (parts[1] === 'fit') {
                        // Zoom to fit all objects
                        zoomToFit();
                        addToHistory('Zoomed to fit');
                    } else {
                        const scale = parseFloat(parts[1]);
                        if (!isNaN(scale) && scale > 0) {
                            zoom = scale;
                            redraw();
                            addToHistory(`Zoom set to ${scale}`);
                        } else {
                            addToHistory('Invalid zoom scale', 'error');
                        }
                    }
                } else {
                    addToHistory('Usage: zoom [scale] or zoom fit', 'error');
                }
                break;

            case 'layer':
                // Usage: layer [name] or layer new [name]
                if (parts.length > 1) {
                    if (parts[1] === 'new' && parts.length > 2) {
                        const layerName = parts.slice(2).join(' ');
                        if (!layers[layerName]) {
                            layers[layerName] = {
                                name: layerName,
                                visible: true,
                                color: '#ffffff',
                                lineType: 'solid'
                            };
                            // Update layer selector
                            const layerSelect = document.getElementById('layerSelect');
                            const option = document.createElement('option');
                            option.value = layerName;
                            option.textContent = layerName;
                            layerSelect.appendChild(option);
                            layerSelect.value = layerName;
                            currentLayer = layerName;
                            addToHistory(`Created layer: ${layerName}`);
                        } else {
                            addToHistory(`Layer ${layerName} already exists`, 'error');
                        }
                    } else {
                        const layerName = parts.slice(1).join(' ');
                        if (layers[layerName]) {
                            currentLayer = layerName;
                            document.getElementById('layerSelect').value = layerName;
                            addToHistory(`Switched to layer: ${layerName}`);
                        } else {
                            addToHistory(`Layer ${layerName} not found`, 'error');
                        }
                    }
                } else {
                    addToHistory(`Current layer: ${currentLayer}`, 'info');
                }
                break;

            case 'rotate':
                // Usage: rotate [angle] or just rotate to start interactive mode
                if (selectedShapes.size > 0) {
                    if (parts.length > 1) {
                        const angle = parseFloat(parts[1]) * Math.PI / 180; // Convert degrees to radians
                        if (!isNaN(angle)) {
                            rotateSelectedShapes(angle);
                            addToHistory(`Rotated ${selectedShapes.size} objects by ${parts[1]} degrees`);
                        } else {
                            addToHistory('Invalid angle value', 'error');
                        }
                    } else {
                        startRotateCommand();
                        addToHistory('Rotate mode started - click center point');
                    }
                } else {
                    addToHistory('Select objects first to rotate', 'error');
                }
                break;

            case 'scale':
                // Usage: scale [factor] or just scale to start interactive mode
                if (selectedShapes.size > 0) {
                    if (parts.length > 1) {
                        const factor = parseFloat(parts[1]);
                        if (!isNaN(factor) && factor > 0) {
                            scaleSelectedShapes(factor);
                            addToHistory(`Scaled ${selectedShapes.size} objects by factor ${factor}`);
                        } else {
                            addToHistory('Invalid scale factor', 'error');
                        }
                    } else {
                        startScaleCommand();
                        addToHistory('Scale mode started - click center point');
                    }
                } else {
                    addToHistory('Select objects first to scale', 'error');
                }
                break;

            case 'undo':
                // Usage: undo
                if (undo()) {
                    // Success message handled in undo() function
                } else {
                    addToHistory('Nothing to undo', 'warning');
                }
                break;

            case 'redo':
                // Usage: redo
                if (redo()) {
                    // Success message handled in redo() function
                } else {
                    addToHistory('Nothing to redo', 'warning');
                }
                break;

            case 'cleanup':
                // Usage: cleanup - manual memory cleanup
                if (typeof window.cleanup === 'function') {
                    window.cleanup();
                } else {
                    addToHistory('Cleanup function not available', 'error');
                }
                break;

            case 'layer':
                // Layer management commands
                if (parts.length === 1) {
                    // Show current layer info
                    addToHistory(`Current layer: ${currentLayer}`, 'info');
                } else if (parts.length === 2) {
                    // Set current layer
                    const layerName = parts[1];
                    const layer = layers.find(l => l.name === layerName);
                    if (layer) {
                        currentLayer = layerName;
                        updateLayerSelector();
                        updateLayerPanel();
                        addToHistory(`Current layer set to: ${layerName}`);
                        redraw();
                    } else {
                        addToHistory(`Layer not found: ${layerName}`, 'error');
                    }
                } else if (parts.length === 3) {
                    const action = parts[1].toLowerCase();
                    const layerName = parts[2];
                    
                    switch (action) {
                        case 'new':
                        case 'create':
                            createNewLayer(layerName);
                            break;
                        case 'delete':
                        case 'remove':
                            deleteLayer(layerName);
                            break;
                        case 'show':
                        case 'visible':
                            const showLayer = layers.find(l => l.name === layerName);
                            if (showLayer) {
                                showLayer.visible = true;
                                updateLayerPanel();
                                addToHistory(`Layer ${layerName} set to visible`);
                                redraw();
                            } else {
                                addToHistory(`Layer not found: ${layerName}`, 'error');
                            }
                            break;
                        case 'hide':
                        case 'invisible':
                            const hideLayer = layers.find(l => l.name === layerName);
                            if (hideLayer) {
                                hideLayer.visible = false;
                                updateLayerPanel();
                                addToHistory(`Layer ${layerName} set to hidden`);
                                redraw();
                            } else {
                                addToHistory(`Layer not found: ${layerName}`, 'error');
                            }
                            break;
                        case 'lock':
                            const lockLayer = layers.find(l => l.name === layerName);
                            if (lockLayer) {
                                lockLayer.locked = true;
                                updateLayerPanel();
                                addToHistory(`Layer ${layerName} locked`);
                            } else {
                                addToHistory(`Layer not found: ${layerName}`, 'error');
                            }
                            break;
                        case 'unlock':
                            const unlockLayer = layers.find(l => l.name === layerName);
                            if (unlockLayer) {
                                unlockLayer.locked = false;
                                updateLayerPanel();
                                addToHistory(`Layer ${layerName} unlocked`);
                            } else {
                                addToHistory(`Layer not found: ${layerName}`, 'error');
                            }
                            break;
                        default:
                            addToHistory(`Unknown layer action: ${action}`, 'error');
                    }
                } else {
                    addToHistory('Usage: layer [layername] | layer new/delete/show/hide/lock/unlock layername', 'error');
                }
                break;

            default:
                addToHistory(`Unknown command: ${command}`, 'error');
        }
    } catch (e) {
        addToHistory(`Error: ${e.message}`, 'error');
    }
}

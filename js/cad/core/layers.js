let currentLayer = "0";
let currentColor = "byLayer";
let currentLineWeight = "byLayer";
let currentLinetype = "byLayer";
let isTemporaryLineweight = false;

let layers = [
    { name: '0', color: '#ffffff', visible: true, locked: false, lineWeight: 0.25, linetype: 'continuous' }
];

function initializeLayers() {
    if (layers.length === 0) {
        layers.push({
            name: '0',
            visible: true,
            locked: false,
            color: '#ffffff',
            lineWeight: 0.25,
            linetype: 'continuous'
        });
    }
    if (!currentLayer && layers.length > 0) {
        currentLayer = layers[0].name;
    }
    updateLayerSelector();
    updateMinimalLayerPanel();
}

function setCurrentLayer(layerName) {
    currentLayer = layerName;
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        currentColor = layer.color;
        currentLineWeight = layer.lineWeight;
        currentLinetype = layer.linetype;
        updateColorDisplay();
        updateLinetypeDisplay();
        redraw();
    }
}

function setCurrentColor(color) {
    currentColor = color;
    const colorSelect = document.getElementById('colorSelect');
    if (colorSelect) {
        const matchingOption = Array.from(colorSelect.options).find(option => option.value === color);
        if (matchingOption) {
            colorSelect.value = color;
        }
    }
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker && color !== 'byLayer') {
        colorPicker.value = color;
    }
    if (color !== 'byLayer') {
        const layer = layers.find(l => l.name === currentLayer);
        if (layer && layer.name !== '0') {
            layer.color = color;
            redraw();
        }
    }
}

function openColorPalette() {
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.click();
    }
}

function setCurrentLineweight(lineweight) {
    if (lineweight === '*MULTI*') {
        return;
    }
    clearMultiDisplay();
    if (lineweight !== 'byLayer') {
        lineweight = parseFloat(lineweight);
    }
    currentLineWeight = lineweight;
    isTemporaryLineweight = false;
    const lineweightSelect = document.getElementById('lineweightSelect');
    if (lineweightSelect) {
        lineweightSelect.onchange = function() { setCurrentLineweight(this.value); };
    }
    updateLineweightDisplay();
    redraw();
    addToHistory(`Current lineweight set to: ${lineweight === 'byLayer' ? 'ByLayer' : lineweight + ' mm'}`);
}

function updateLineweightDisplay() {
    const lineweightSelect = document.getElementById('lineweightSelect');
    if (lineweightSelect) {
        if (isTemporaryLineweight && currentLineWeight !== 'byLayer') {
            lineweightSelect.value = currentLineWeight;
        } else {
            lineweightSelect.value = 'byLayer';
        }
    }
    const lwtBtn = document.getElementById('lwtBtn');
    if (lwtBtn) {
        if (showLineweights) {
            lwtBtn.classList.add('active');
        } else {
            lwtBtn.classList.remove('active');
        }
    }
}

function updateLineweightSelectorForSelection(selection) {
    const lineweightSelect = document.getElementById('lineweightSelect');
    if (!lineweightSelect) return;
    clearMultiDisplay();
    if (!selection) {
        if (isTemporaryLineweight && currentLineWeight !== 'byLayer') {
            lineweightSelect.value = currentLineWeight;
        } else {
            lineweightSelect.value = 'byLayer';
        }
        lineweightSelect.onchange = function() { setCurrentLineweight(this.value); };
        return;
    }
    if (Array.isArray(selection)) {
        const lineweights = selection.map(shape => shape.lineWeight || shape.lineweight || 'byLayer');
        const firstLineweight = lineweights[0];
        const allSame = lineweights.every(lw => lw === firstLineweight);
        if (allSame) {
            lineweightSelect.value = firstLineweight;
        } else {
            showMultiDisplay();
        }
        lineweightSelect.onchange = function() {
            if (this.value !== '*MULTI*') {
                clearMultiDisplay();
                updateMultipleShapesProperty('lineWeight', this.value);
            }
        };
    } else {
        const objectLineweight = selection.lineWeight || selection.lineweight || 'byLayer';
        let selectValue = objectLineweight;
        if (typeof objectLineweight === 'number') {
            selectValue = objectLineweight.toFixed(2);
        }
        lineweightSelect.value = selectValue;
        if (lineweightSelect.value !== selectValue) {
            lineweightSelect.value = objectLineweight;
        }
        lineweightSelect.onchange = function() {
            if (selectedShapes.size === 1) {
                const shapeIndex = Array.from(selectedShapes)[0];
                updateShapeProperty(shapeIndex, 'lineWeight', this.value);
            }
        };
    }
}

function showMultiDisplay() {
    const lineweightSelect = document.getElementById('lineweightSelect');
    if (!lineweightSelect) return;
    const multiOption = document.createElement('option');
    multiOption.value = '*MULTI*';
    multiOption.textContent = '*Multi*';
    multiOption.selected = true;
    multiOption.id = 'multiOption';
    lineweightSelect.insertBefore(multiOption, lineweightSelect.firstChild);
    lineweightSelect.value = '*MULTI*';
}

function clearMultiDisplay() {
    const multiOption = document.getElementById('multiOption');
    if (multiOption) {
        multiOption.remove();
    }
}

function setCurrentLinetype(linetype) {
    currentLinetype = linetype;
    updateLinetypeDisplay();
    addToHistory(`Current linetype set to: ${linetype === 'byLayer' ? 'ByLayer' : linetype}`);
}

function updateLinetypeDisplay() {
    const linetypeSelect = document.getElementById('linetypeSelect');
    if (linetypeSelect) {
        linetypeSelect.value = currentLinetype;
    }
}

function showLinetypePreview() {
    const existingModal = document.getElementById('linetypePreviewModal');
    if (existingModal) {
        existingModal.remove();
    }
    const modal = document.createElement('div');
    modal.id = 'linetypePreviewModal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2a2a2a;
        border: 2px solid #555;
        border-radius: 8px;
        padding: 20px;
        z-index: 1000;
        width: 400px;
        max-height: 500px;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="color: #fff; margin: 0;">Line Type Preview</h3>
            <button onclick="document.getElementById('linetypePreviewModal').remove()" 
                    style="background: #555; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">×</button>
        </div>
        <div style="color: #ccc; margin-bottom: 15px;">Click a line type to select it:</div>
    `;
    LINETYPE_VALUES.forEach(linetype => {
        if (linetype.value === 'byLayer') return;
        const canvasId = `preview_${linetype.value}`;
        html += `
            <div style="margin-bottom: 10px; padding: 8px; border: 1px solid #444; border-radius: 4px; cursor: pointer; background: #333;" 
                 onclick="setCurrentLinetype('${linetype.value}'); document.getElementById('linetypePreviewModal').remove();"
                 onmouseover="this.style.background='#444'" 
                 onmouseout="this.style.background='#333'">
                <div style="color: #fff; font-size: 12px; margin-bottom: 5px;">${linetype.label}</div>
                <canvas id="${canvasId}" width="350" height="20" style="background: #222; border-radius: 2px;"></canvas>
            </div>
        `;
    });
    modal.innerHTML = html;
    document.body.appendChild(modal);
    setTimeout(() => {
        LINETYPE_VALUES.forEach(linetype => {
            if (linetype.value === 'byLayer') return;
            const canvas = document.getElementById(`preview_${linetype.value}`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const pattern = LINETYPE_PATTERNS[linetype.value] || [];
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.setLineDash(pattern);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(10, 10);
                ctx.lineTo(340, 10);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });
    }, 100);
    addToHistory('Line type preview opened');
}

function setCurrentLineWeight(weight) {
    currentLineWeight = safeParseFloat(weight, 1, 'line weight');
    const layer = layers.find(l => l.name === currentLayer);
    if (layer && layer.name !== 'Default') {
        layer.lineWeight = currentLineWeight;
        redraw();
    }
}

function createNewLayer(name = null, color = '#ffffff', visible = true, locked = false) {
    if (!name) {
        name = prompt("Enter new layer name:");
        if (!name) return false;
    }
    if (layers.some(l => l.name === name)) {
        addToHistory(`Error: Layer "${name}" already exists`, 'error');
        return false;
    }
    const newLayer = {
        name: name,
        color: color,
        visible: visible,
        locked: locked,
        lineWeight: 1.0,
        linetype: 'continuous'
    };
    layers.push(newLayer);
    currentLayer = name;
    updateLayerSelector();
    updateMinimalLayerPanel();
    addToHistory(`Created layer: ${name}`);
    return true;
}

function showNewLayerForm() {
    const form = document.getElementById('newLayerForm');
    const input = document.getElementById('newLayerNameInput');
    const button = document.querySelector('.add-layer-btn');
    button.style.display = 'none';
    form.style.display = 'block';
    input.value = '';
    input.focus();
    input.onkeypress = function(e) {
        if (e.key === 'Enter') {
            confirmNewLayer();
        } else if (e.key === 'Escape') {
            cancelNewLayer();
        }
    };
}

function confirmNewLayer() {
    const input = document.getElementById('newLayerNameInput');
    const name = input.value.trim();
    if (!name) {
        cancelNewLayer();
        return;
    }
    if (layers.some(l => l.name === name)) {
        input.style.borderColor = '#f44336';
        input.style.background = '#3a2222';
        addToHistory(`Error: Layer "${name}" already exists`, 'error');
        setTimeout(() => {
            input.style.borderColor = '#555';
            input.style.background = '#333';
        }, 2000);
        input.select();
        return;
    }
    const success = createNewLayer(name);
    if (success) {
        hideNewLayerForm();
    }
}

function cancelNewLayer() {
    hideNewLayerForm();
}

function hideNewLayerForm() {
    const form = document.getElementById('newLayerForm');
    const button = document.querySelector('.add-layer-btn');
    form.style.display = 'none';
    button.style.display = 'block';
    document.getElementById('newLayerNameInput').value = '';
}

function deleteLayer(layerName) {
    if (layerName === '0') {
        addToHistory('Error: Cannot delete layer "0"', 'error');
        return false;
    }
    const layerIndex = layers.findIndex(l => l.name === layerName);
    if (layerIndex === -1) {
        addToHistory(`Error: Layer "${layerName}" not found`, 'error');
        return false;
    }
    let reassignedCount = 0;
    shapes.forEach(shape => {
        if (shape.layer === layerName) {
            shape.layer = '0';
            reassignedCount++;
        }
    });
    layers.splice(layerIndex, 1);
    if (currentLayer === layerName) {
        setCurrentLayer('0');
    }
    updateLayerSelector();
    updateMinimalLayerPanel();
    redraw();
    addToHistory(`Deleted layer: ${layerName} (${reassignedCount} shapes moved to layer "0")`);
    return true;
}

function renameLayer(oldName, newName = null) {
    if (oldName === 'Default') {
        addToHistory('Error: Cannot rename Default layer', 'error');
        return false;
    }
    if (!newName) {
        newName = prompt(`Rename layer "${oldName}" to:`, oldName);
        if (!newName || newName === oldName) return false;
    }
    if (layers.some(l => l.name === newName)) {
        addToHistory(`Error: Layer "${newName}" already exists`, 'error');
        return false;
    }
    const layer = layers.find(l => l.name === oldName);
    if (!layer) {
        addToHistory(`Error: Layer "${oldName}" not found`, 'error');
        return false;
    }
    layer.name = newName;
    shapes.forEach(shape => {
        if (shape.layer === oldName) {
            shape.layer = newName;
        }
    });
    if (currentLayer === oldName) {
        currentLayer = newName;
    }
    updateLayerSelector();
    updateMinimalLayerPanel();
    addToHistory(`Renamed layer: ${oldName} → ${newName}`);
    return true;
}

function toggleLayerVisibility(layerName) {
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        layer.visible = !layer.visible;
        updateMinimalLayerPanel();
        redraw();
        addToHistory(`${layer.visible ? 'Showed' : 'Hidden'} layer: ${layerName}`);
    }
}

function toggleLayerLock(layerName) {
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        layer.locked = !layer.locked;
        updateMinimalLayerPanel();
        redraw();
        addToHistory(`${layer.locked ? 'Locked' : 'Unlocked'} layer: ${layerName}`);
    }
}

function setLayerColor(layerName, color) {
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        layer.color = color;
        updateMinimalLayerPanel();
        redraw();
        addToHistory(`Changed color of layer ${layerName} to ${color}`);
    }
}

function setLayerLineweight(layerName, lineWeight) {
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        layer.lineWeight = parseFloat(lineWeight);
        updateMinimalLayerPanel();
        redraw();
        addToHistory(`Changed lineweight of layer ${layerName} to ${lineWeight}`);
    }
}

function setLayerLinetype(layerName, linetype) {
    const layer = layers.find(l => l.name === layerName);
    if (layer) {
        layer.linetype = linetype;
        updateMinimalLayerPanel();
        redraw();
        addToHistory(`Changed linetype of layer ${layerName} to ${linetype}`);
    }
}

function getShapeLayer(shape) {
    const layerName = shape.layer || '0';
    return layers.find(l => l.name === layerName) || layers.find(l => l.name === '0');
}

function shouldRenderShape(shape) {
    const layer = getShapeLayer(shape);
    return layer && layer.visible;
}

function canModifyShape(shape) {
    const layer = getShapeLayer(shape);
    return layer && !layer.locked;
}

function updateLayerSelector() {
    const layerSelect = document.getElementById('layerSelect');
    if (!layerSelect) return;
    layerSelect.innerHTML = '';
    layers.forEach(layer => {
        const option = document.createElement('option');
        option.value = layer.name;
        option.textContent = layer.name;
        option.selected = layer.name === currentLayer;
        layerSelect.appendChild(option);
    });
}

function updateMinimalLayerPanel() {
    const layerList = document.getElementById('layerList');
    if (!layerList) return;
    layerList.innerHTML = '';
    layers.forEach(layer => {
        const div = document.createElement('div');
        div.className = 'layer-item';
        div.innerHTML = `
            <input type="radio" name="activeLayer" ${layer.name === currentLayer ? 'checked' : ''} onchange="setCurrentLayer('${layer.name}')">
            <span class="layer-name">${layer.name}</span>
            <button onclick="toggleLayerVisibility('${layer.name}')">${layer.visible ? '👁' : '🚫'}</button>
            <button onclick="toggleLayerLock('${layer.name}')">${layer.locked ? '🔒' : '🔓'}</button>
            <input type="color" value="${layer.color}" onchange="setLayerColor('${layer.name}', this.value)">
            <select onchange="setLayerLineweight('${layer.name}', this.value)">
                <option value="0.00"${layer.lineWeight === 0.00 ? ' selected' : ''}>0.00</option>
                <option value="0.05"${layer.lineWeight === 0.05 ? ' selected' : ''}>0.05</option>
                <option value="0.09"${layer.lineWeight === 0.09 ? ' selected' : ''}>0.09</option>
                <option value="0.13"${layer.lineWeight === 0.13 ? ' selected' : ''}>0.13</option>
                <option value="0.18"${layer.lineWeight === 0.18 ? ' selected' : ''}>0.18</option>
                <option value="0.25"${layer.lineWeight === 0.25 ? ' selected' : ''}>0.25</option>
                <option value="0.30"${layer.lineWeight === 0.30 ? ' selected' : ''}>0.30</option>
                <option value="0.35"${layer.lineWeight === 0.35 ? ' selected' : ''}>0.35</option>
                <option value="0.50"${layer.lineWeight === 0.50 ? ' selected' : ''}>0.50</option>
                <option value="0.70"${layer.lineWeight === 0.70 ? ' selected' : ''}>0.70</option>
                <option value="1.00"${layer.lineWeight === 1.00 ? ' selected' : ''}>1.00</option>
                <option value="1.40"${layer.lineWeight === 1.40 ? ' selected' : ''}>1.40</option>
                <option value="2.00"${layer.lineWeight === 2.00 ? ' selected' : ''}>2.00</option>
            </select>
            <select onchange="setLayerLinetype('${layer.name}', this.value)">
                <option value="continuous"${layer.linetype === 'continuous' ? ' selected' : ''}>Continuous</option>
                <option value="dashed"${layer.linetype === 'dashed' ? ' selected' : ''}>Dashed</option>
                <option value="dotted"${layer.linetype === 'dotted' ? ' selected' : ''}>Dotted</option>
                <option value="dashdot"${layer.linetype === 'dashdot' ? ' selected' : ''}>Dash-Dot</option>
                <option value="center"${layer.linetype === 'center' ? ' selected' : ''}>Center Line</option>
            </select>
            ${layer.name !== '0' ? `<button onclick="deleteLayer('${layer.name}')">X</button>` : ''}
        `;
        layerList.appendChild(div);
    });
}

window.setCurrentLayer = setCurrentLayer;
window.setCurrentColor = setCurrentColor;
window.setCurrentLineweight = setCurrentLineweight;
window.openColorPalette = openColorPalette;
window.getShapeLayer = getShapeLayer; 

window.updateMinimalLayerPanel = updateMinimalLayerPanel;
window.setLayerLineweight = setLayerLineweight;
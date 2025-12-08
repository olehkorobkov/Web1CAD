const commandInput = document.getElementById('commandInput');
const commandHistoryElement = document.getElementById('commandHistory');
const cursorCoordsElement = document.getElementById('cursorCoords');
const helpBarElement = document.getElementById('helpBar');

if (!commandInput || !commandHistoryElement || !cursorCoordsElement || !helpBarElement) {
    console.error('Critical DOM elements missing. Please check HTML structure.');
}

let statusTimeout = null;

// canvas and ctx are now defined in /rendering/context.js

const selectionWindow = document.getElementById('selectionWindow');
const textInputOverlay = document.getElementById('textInputOverlay');
const textInput = document.getElementById('textInput');
const lengthInputOverlay = document.getElementById('lengthInput');
const lengthInput = document.getElementById('lengthValue');

// mode is now defined in /core/state.js

let showGrid = true;
let orthoMode = false;
let snapEnabled = false;
let objectSnapEnabled = false;
let snapMarker = null;
let showLineweights = false;

// Set initial help bar
document.addEventListener('DOMContentLoaded', function() {
    updateHelpBar('Ready');
    updateUndoRedoButtons();
    setMode('select');
    initializeLayers();
    checkForAutoSave();
    scheduleAutoSave();
    validateAndUpgradeShapes();

    const lwtBtn = document.getElementById('lwtBtn');
    if (lwtBtn) {
        lwtBtn.classList.toggle('active', showLineweights);
    }
    updateButton('gridBtn', showGrid);
    updateButton('orthoBtn', orthoMode);
    updateButton('snapBtn', snapEnabled);
    updateButton('osnapBtn', objectSnapEnabled);
    setCurrentLineweight('byLayer');
    updateLineweightDisplay();

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    if (typeof window.renderDiagnostics !== 'undefined' && typeof window.renderStabilizer !== 'undefined') {
        console.log('Render stabilization system initialized');
        window.debugRender = function() {
            console.log('Current render state:');
            console.log('- Zoom level:', zoom);
            console.log('- Offset:', offsetX, offsetY);
            console.log('- Objects count:', shapes.length);
            console.log('- Canvas size:', canvas.width, canvas.height);
            if (typeof diagnoseRendering === 'function') {
                const diagnostics = diagnoseRendering();
                console.log('- Diagnostics:', diagnostics);
            }
        };
        window.testRenderStability = function() {
            console.log('Testing render stability at extreme zoom levels...');
            const originalZoom = zoom;
            const testZooms = [0.001, 0.1, 1, 10, 100, 1000, 10000];
            testZooms.forEach(testZoom => {
                zoom = testZoom;
                try {
                    _redraw();
                    console.log(`✓ Zoom ${testZoom}: OK`);
                } catch (e) {
                    console.error(`✗ Zoom ${testZoom}: ${e.message}`);
                }
            });
            zoom = originalZoom;
            _redraw();
            console.log('Stability test completed, zoom restored to:', zoom);
        };
        let lastDiagnosticTime = 0;
        setInterval(() => {
            const now = Date.now();
            if (typeof diagnoseRendering === 'function' && shapes.length > 0) {
                if (now - lastDiagnosticTime > 5000) {
                    const diagnostics = diagnoseRendering();
                    if (diagnostics.criticalIssues && diagnostics.criticalIssues.length > 0) {
                        console.warn('Critical rendering issues detected:', diagnostics.criticalIssues);
                        if (typeof fixRenderingIssues === 'function') {
                            fixRenderingIssues();
                        }
                    }
                    if (diagnostics.performance && diagnostics.performance.averageFrameTime > 33) {
                        console.warn(`Poor performance detected: ${diagnostics.performance.averageFrameTime.toFixed(2)}ms/frame`);
                    }
                    lastDiagnosticTime = now;
                }
            }
        }, 5000);
    } else {
        console.warn('Render stabilization system not available - some zoom issues may occur');
    }

    const topToolbar = document.querySelector('.top-toolbar');
    if (topToolbar) {
        topToolbar.addEventListener('wheel', function(e) {
            e.preventDefault();
        }, { passive: false });
    }
    saveState('Initial state');
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                loadDrawing(file);
            }
            e.target.value = '';
        });
    }
    redraw();
});

commandInput.addEventListener('keydown', handleCommandInput);
commandHistoryElement.addEventListener('wheel', (e) => e.stopPropagation());

function toggleLineweightDisplay() {
    showLineweights = !showLineweights;
    const lwtBtn = document.getElementById('lwtBtn');
    if (lwtBtn) {
        if (showLineweights) {
            lwtBtn.classList.add('active');
        } else {
            lwtBtn.classList.remove('active');
        }
    }
    redraw();
    addToHistory(`Lineweight display ${showLineweights ? 'enabled' : 'disabled'}`);
}

function updateColorDisplay() {
    const colorSelect = document.getElementById('colorSelect');
    if (colorSelect) {
        const matchingOption = Array.from(colorSelect.options).find(option => option.value === currentColor);
        if (matchingOption) {
            colorSelect.value = currentColor;
        }
    }
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker && currentColor !== 'byLayer') {
        colorPicker.value = currentColor;
    }
}

function toggleLayerPanel() {
    const panel = document.getElementById('layerPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        updateMinimalLayerPanel();
        initDragLayer();
    } else {
        panel.style.display = 'none';
    }
}

function initDragLayer() {
    const panel = document.getElementById('layerPanel');
    const header = document.getElementById('layerPanelHeader');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    const rect = panel.getBoundingClientRect();
    let panelX = rect.left;
    let panelY = rect.top;

    header.addEventListener('mousedown', function(e) {
        if (e.target.tagName === 'BUTTON') return;
        if (e.target === header || e.target.tagName === 'SPAN') {
            isDragging = true;
            header.style.cursor = 'grabbing';
            const rect = panel.getBoundingClientRect();
            panelX = rect.left;
            panelY = rect.top;
            initialX = e.clientX - panelX;
            initialY = e.clientY - panelY;
            panel.style.position = 'fixed';
            panel.style.top = panelY + 'px';
            panel.style.left = panelX + 'px';
            panel.style.right = 'auto';
            panel.style.transform = 'none';
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            const panelRect = panel.getBoundingClientRect();
            const maxX = window.innerWidth - panelRect.width;
            const maxY = window.innerHeight - panelRect.height;
            currentX = Math.max(0, Math.min(maxX, currentX));
            currentY = Math.max(0, Math.min(maxY, currentY));
            panel.style.left = currentX + 'px';
            panel.style.top = currentY + 'px';
            panelX = currentX;
            panelY = currentY;
        }
    });

    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
        }
    });
}

function zoomToFit() {
    if (shapes.length === 0) {
        zoom = 3.7;
        offsetX = 0;
        offsetY = 0;
        return;
    }
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(shape => {
        if (window.shapeHandler) {
            const bounds = window.shapeHandler.execute('getBounds', shape.type, shape);
            if (bounds !== null) {
                minX = Math.min(minX, bounds.minX);
                minY = Math.min(minY, bounds.minY);
                maxX = Math.max(maxX, bounds.maxX);
                maxY = Math.max(maxY, bounds.maxY);
                return;
            }
        }
        switch(shape.type) {
            case 'line':
                minX = Math.min(minX, shape.x1, shape.x2);
                minY = Math.min(minY, shape.y1, shape.y2);
                maxX = Math.max(maxX, shape.x1, shape.x2);
                maxY = Math.max(maxY, shape.y1, shape.y2);
                break;
            case 'polyline':
            case 'spline':
            case 'hatch':
                shape.points.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                break;
            case 'circle':
                minX = Math.min(minX, shape.cx - shape.radius);
                minY = Math.min(minY, shape.cy - shape.radius);
                maxX = Math.max(maxX, shape.cx + shape.radius);
                maxY = Math.max(maxY, shape.cy + shape.radius);
                break;
            case 'ellipse':
                if (shape.rotation && shape.rotation !== 0) {
                    const cos = Math.cos(shape.rotation);
                    const sin = Math.sin(shape.rotation);
                    const a = shape.rx;
                    const b = shape.ry;
                    const extentX = Math.sqrt(a * a * cos * cos + b * b * sin * sin);
                    const extentY = Math.sqrt(a * a * sin * sin + b * b * cos * cos);
                    minX = Math.min(minX, shape.cx - extentX);
                    minY = Math.min(minY, shape.cy - extentY);
                    maxX = Math.max(maxX, shape.cx + extentX);
                    maxY = Math.max(maxY, shape.cy + extentY);
                } else {
                    minX = Math.min(minX, shape.cx - shape.rx);
                    minY = Math.min(minY, shape.cy - shape.ry);
                    maxX = Math.max(maxX, shape.cx + shape.rx);
                    maxY = Math.max(maxY, shape.cy + shape.ry);
                }
                break;
            case 'arc':
                const arcPoints = [];
                for (let angle = shape.startAngle; angle <= shape.endAngle; angle += 0.1) {
                    arcPoints.push({
                        x: shape.cx + shape.radius * Math.cos(angle),
                        y: shape.cy + shape.radius * Math.sin(angle)
                    });
                }
                arcPoints.push({ x: shape.cx, y: shape.cy });
                arcPoints.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                break;
            case 'polygon':
                shape.points.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                break;
            case 'point':
            case 'text':
                minX = Math.min(minX, shape.x);
                minY = Math.min(minY, shape.y);
                maxX = Math.max(maxX, shape.x);
                maxY = Math.max(maxY, shape.y);
                break;
        }
    });
    const padding = 20;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    const canvasRatio = canvas.width / canvas.height;
    const drawingRatio = drawingWidth / drawingHeight;
    if (drawingRatio > canvasRatio) {
        zoom = canvas.width / drawingWidth;
    } else {
        zoom = canvas.height / drawingHeight;
    }
    offsetX = canvas.width / 2 - (minX + drawingWidth / 2) * zoom;
    offsetY = canvas.height / 2 - (minY + drawingHeight / 2) * zoom;
    addToHistory('Zoomed to fit all objects');
}

function togglePropertiesPanel() {
    const panel = document.getElementById('propertiesPanel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        updatePropertiesPanel();
        initDragProperties();
    } else {
        panel.style.display = 'none';
    }
}

function initDragProperties() {
    const panel = document.getElementById('propertiesPanel');
    const header = document.getElementById('propertiesHeader');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    const rect = panel.getBoundingClientRect();
    let panelX = rect.left;
    let panelY = rect.top;
    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        panel.classList.add('dragging');
        initialX = e.clientX - panelX;
        initialY = e.clientY - panelY;
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            panelX = currentX;
            panelY = currentY;
            panel.style.position = 'fixed';
            panel.style.left = currentX + 'px';
            panel.style.top = currentY + 'px';
        }
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.classList.remove('dragging');
        }
    });
}

// === HATCH PANEL ===
function toggleHatchPanel() {
    const panel = document.getElementById('hatchPanel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        initDragHatch();
    } else {
        panel.style.display = 'none';
    }
}

function initDragHatch() {
    const panel = document.getElementById('hatchPanel');
    const header = document.getElementById('hatchPanelHeader');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    const rect = panel.getBoundingClientRect();
    let panelX = rect.left;
    let panelY = rect.top;
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        panel.classList.add('dragging');
        initialX = e.clientX - panelX;
        initialY = e.clientY - panelY;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            panelX = currentX;
            panelY = currentY;
            panel.style.position = 'fixed';
            panel.style.left = currentX + 'px';
            panel.style.top = currentY + 'px';
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.classList.remove('dragging');
        }
    });
}

function updatePropertiesPanel() {
    const content = document.getElementById('propertiesContent');
    if (!content) return;
    if (selectedShapes.size === 0) {
        content.innerHTML = '<div class="no-selection">No object selected</div>';
        clearMultiDisplay();
        updateLineweightSelectorForSelection(null);
        return;
    }
    if (selectedShapes.size === 1) {
        const shapeIndex = Array.from(selectedShapes)[0];
        const shape = shapes[shapeIndex];
        content.innerHTML = generateSingleObjectProperties(shape, shapeIndex);
        updateLineweightSelectorForSelection(shape);
    } else {
        content.innerHTML = generateMultipleObjectProperties();
        const selectedObjects = Array.from(selectedShapes).map(i => shapes[i]);
        updateLineweightSelectorForSelection(selectedObjects);
    }
}

function calculateShapeArea(shape) {
    if (window.shapeHandler) {
        const area = window.shapeHandler.execute('area', shape.type, shape);
        if (area !== null && area !== undefined) {
            return area;
        }
    }
    switch (shape.type) {
        case 'circle':
            return Math.PI * shape.radius * shape.radius;
        case 'ellipse':
            return Math.PI * shape.rx * shape.ry;
        case 'polygon':
            if (!shape.points || shape.points.length < 3) return 0;
            let area = 0;
            for (let i = 0; i < shape.points.length; i++) {
                const j = (i + 1) % shape.points.length;
                area += shape.points[i].x * shape.points[j].y;
                area -= shape.points[j].x * shape.points[i].y;
            }
            return Math.abs(area) / 2;
        case 'rectangle':
            if (shape.points && shape.points.length >= 4) {
                let area = 0;
                for (let i = 0; i < 4; i++) {
                    const j = (i + 1) % 4;
                    area += shape.points[i].x * shape.points[j].y;
                    area -= shape.points[j].x * shape.points[i].y;
                }
                return Math.abs(area) / 2;
            } else if (shape.width && shape.height) {
                return Math.abs(shape.width * shape.height);
            }
            return 0;
        case 'polyline':
            if (!shape.points || shape.points.length < 3) return 0;
            const firstPoint = shape.points[0];
            const lastPoint = shape.points[shape.points.length - 1];
            const distance = Math.sqrt(
                Math.pow(lastPoint.x - firstPoint.x, 2) + 
                Math.pow(lastPoint.y - firstPoint.y, 2)
            );
            if (distance < 0.1) {
                let polylineArea = 0;
                for (let i = 0; i < shape.points.length; i++) {
                    const j = (i + 1) % shape.points.length;
                    polylineArea += shape.points[i].x * shape.points[j].y;
                    polylineArea -= shape.points[j].x * shape.points[i].y;
                }
                return Math.abs(polylineArea) / 2;
            }
            return 0;
        case 'arc':
            return 0;
        case 'hatch':
            if (!shape.points || shape.points.length < 3) return 0;
            let hatchArea = 0;
            for (let i = 0; i < shape.points.length; i++) {
                const j = (i + 1) % shape.points.length;
                hatchArea += shape.points[i].x * shape.points[j].y;
                hatchArea -= shape.points[j].x * shape.points[i].y;
            }
            return Math.abs(hatchArea) / 2;
        case 'line':
        case 'point':
        case 'text':
        case 'spline':
        default:
            return 0;
    }
}


/**
 * Generate properties HTML for a single object
 */
function generateSingleObjectProperties(shape, index) {
    let html = '<div class="properties-list">';
    
    // General properties
    html += '<div class="property-group">';
    html += '<div class="property-group-title">General</div>';
    html += `<div class="property-row">
        <div class="property-label">Type:</div>
        <div class="property-value">
            <input type="text" class="property-readonly" value="${shape.type}" readonly>
        </div>
    </div>`;
    html += `<div class="property-row">
        <div class="property-label">Layer:</div>
        <div class="property-value">
            <select class="property-select" onchange="updateShapeProperty(${index}, 'layer', this.value)">
                ${layers.map(layer => 
                    `<option value="${layer.name}" ${shape.layer === layer.name ? 'selected' : ''}>${layer.name}</option>`
                ).join('')}
            </select>
        </div>
    </div>`;
    html += `<div class="property-row">
        <div class="property-label">Color:</div>
        <div class="property-value">
            <select class="property-select" onchange="updateShapeProperty(${index}, 'color', this.value)">
                <option value="byLayer" ${shape.color === 'byLayer' ? 'selected' : ''}>ByLayer</option>
                <option value="#ffffff" ${shape.color === '#ffffff' ? 'selected' : ''}>White</option>
                <option value="#ff0000" ${shape.color === '#ff0000' ? 'selected' : ''}>Red</option>
                <option value="#00ff00" ${shape.color === '#00ff00' ? 'selected' : ''}>Green</option>
                <option value="#0000ff" ${shape.color === '#0000ff' ? 'selected' : ''}>Blue</option>
                <option value="#ffff00" ${shape.color === '#ffff00' ? 'selected' : ''}>Yellow</option>
                <option value="#ff00ff" ${shape.color === '#ff00ff' ? 'selected' : ''}>Magenta</option>
                <option value="#00ffff" ${shape.color === '#00ffff' ? 'selected' : ''}>Cyan</option>
            </select>
        </div>
    </div>`;
    html += `<div class="property-row">
        <div class="property-label">Lineweight:</div>
        <div class="property-value">
            <select class="property-select" onchange="updateShapeProperty(${index}, 'lineWeight', this.value)">
                <option value="byLayer" ${shape.lineWeight === 'byLayer' ? 'selected' : ''}>ByLayer</option>
                ${LINEWEIGHT_VALUES.slice(1).map(lw => 
                    `<option value="${lw.value}" ${shape.lineWeight == lw.value ? 'selected' : ''}>${lw.label}</option>`
                ).join('')}
            </select>
        </div>
    </div>`;
    html += `<div class="property-row">
        <div class="property-label">Linetype:</div>
        <div class="property-value">
            <select class="property-select" onchange="updateShapeProperty(${index}, 'linetype', this.value)">
                ${LINETYPE_VALUES.map(lt => 
                    `<option value="${lt.value}" ${shape.linetype === lt.value ? 'selected' : ''}>${lt.label}</option>`
                ).join('')}
            </select>
        </div>
    </div>`;
    html += '</div>';
    
    // Geometry properties based on shape type
    html += '<div class="property-group">';
    html += '<div class="property-group-title">Geometry</div>';
    
    switch (shape.type) {
        case 'line':
            html += `<div class="property-row">
                <div class="property-label">Start X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.x1.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'x1', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Start Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.y1.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'y1', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">End X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.x2.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'x2', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">End Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.y2.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'y2', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            const length = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
            html += `<div class="property-row">
                <div class="property-label">Length:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${length.toFixed(2)}" readonly>
                </div>
            </div>`;
            // Lines don't have area - skip area display
            break;
            
        case 'circle':
            html += `<div class="property-row">
                <div class="property-label">Center X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cx.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cx', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Center Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cy.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cy', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Radius:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.radius.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'radius', parseFloat(this.value))" step="0.01" min="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Area:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${(Math.PI * shape.radius * shape.radius).toFixed(2)}" readonly>
                </div>
            </div>`;
            break;
            
        case 'ellipse':
            html += `<div class="property-row">
                <div class="property-label">Center X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cx.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cx', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Center Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cy.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cy', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Major Radius:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.rx.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'rx', Math.max(0.01, parseFloat(this.value)))" step="0.01" min="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Minor Radius:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.ry.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'ry', Math.max(0.01, parseFloat(this.value)))" step="0.01" min="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Rotation:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${(shape.rotation || 0).toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'rotation', parseFloat(this.value))" step="0.1">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Area:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${(Math.PI * shape.rx * shape.ry).toFixed(2)}" readonly>
                </div>
            </div>`;
            break;
            
        case 'arc':
            html += `<div class="property-row">
                <div class="property-label">Center X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cx.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cx', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Center Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.cy.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'cy', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Radius:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.radius.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'radius', parseFloat(this.value))" step="0.01" min="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Start Angle:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${(shape.startAngle * 180 / Math.PI).toFixed(1)}" 
                           onchange="updateShapeGeometry(${index}, 'startAngle', parseFloat(this.value) * Math.PI / 180)" step="1">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">End Angle:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${(shape.endAngle * 180 / Math.PI).toFixed(1)}" 
                           onchange="updateShapeGeometry(${index}, 'endAngle', parseFloat(this.value) * Math.PI / 180)" step="1">
                </div>
            </div>`;
            const arcLength = Math.abs(shape.endAngle - shape.startAngle) * shape.radius;
            html += `<div class="property-row">
                <div class="property-label">Arc Length:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${arcLength.toFixed(2)}" readonly>
                </div>
            </div>`;
            // Arcs are open curves - no area display
            break;
            
        case 'point':
            html += `<div class="property-row">
                <div class="property-label">X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.x.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'x', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.y.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'y', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            // Points don't have area - skip area display
            break;
            
        case 'text':
            html += `<div class="property-row">
                <div class="property-label">X:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.x.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'x', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Y:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.y.toFixed(2)}" 
                           onchange="updateShapeGeometry(${index}, 'y', parseFloat(this.value))" step="0.01">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Text:</div>
                <div class="property-value">
                    <input type="text" class="property-input" value="${shape.content || ''}" 
                           onchange="updateShapeGeometry(${index}, 'content', this.value)">
                </div>
            </div>`;
            html += `<div class="property-row">
                <div class="property-label">Size:</div>
                <div class="property-value">
                    <input type="number" class="property-input" value="${shape.size || 12}" 
                           onchange="updateShapeGeometry(${index}, 'size', parseFloat(this.value))" step="1" min="1">
                </div>
            </div>`;
            // Text doesn't have area - skip area display
            break;
            
        case 'polyline':
            // Show if this is actually a polygon
            if (shape.isPolygon) {
                html += `<div class="property-row">
                    <div class="property-label">Object Type:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="Polygon (as Polyline)" readonly>
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Sides:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${shape.polygonSides || 'N/A'}" readonly>
                    </div>
                </div>`;
                if (shape.polygonRadius) {
                    html += `<div class="property-row">
                        <div class="property-label">Radius:</div>
                        <div class="property-value">
                            <input type="text" class="property-readonly" value="${shape.polygonRadius.toFixed(2)}" readonly>
                        </div>
                    </div>`;
                }
                if (shape.polygonRadiusType) {
                    html += `<div class="property-row">
                        <div class="property-label">Radius Type:</div>
                        <div class="property-value">
                            <input type="text" class="property-readonly" value="${shape.polygonRadiusType}" readonly>
                        </div>
                    </div>`;
                }
                if (shape.polygonCenter) {
                    html += `<div class="property-row">
                        <div class="property-label">Center X:</div>
                        <div class="property-value">
                            <input type="text" class="property-readonly" value="${shape.polygonCenter.x.toFixed(2)}" readonly>
                        </div>
                    </div>`;
                    html += `<div class="property-row">
                        <div class="property-label">Center Y:</div>
                        <div class="property-value">
                            <input type="text" class="property-readonly" value="${shape.polygonCenter.y.toFixed(2)}" readonly>
                        </div>
                    </div>`;
                }
            }
            
            html += `<div class="property-row">
                <div class="property-label">Vertices:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${shape.points ? shape.points.length : 0}" readonly>
                </div>
            </div>`;
            if (shape.points && shape.points.length > 0) {
                let totalLength = 0;
                for (let i = 1; i < shape.points.length; i++) {
                    const dx = shape.points[i].x - shape.points[i-1].x;
                    const dy = shape.points[i].y - shape.points[i-1].y;
                    totalLength += Math.sqrt(dx * dx + dy * dy);
                }
                html += `<div class="property-row">
                    <div class="property-label">Length:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${totalLength.toFixed(2)}" readonly>
                    </div>
                </div>`;
                
                // Show first and last point coordinates
                html += `<div class="property-row">
                    <div class="property-label">Start X:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[0].x.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, 0, 'x', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Start Y:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[0].y.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, 0, 'y', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                
                const lastIndex = shape.points.length - 1;
                html += `<div class="property-row">
                    <div class="property-label">End X:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[lastIndex].x.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, ${lastIndex}, 'x', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">End Y:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[lastIndex].y.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, ${lastIndex}, 'y', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                
                // Calculate and display area only for closed polylines
                const polylineArea = calculateShapeArea(shape);
                if (polylineArea > 0) {
                    html += `<div class="property-row">
                        <div class="property-label">Area:</div>
                        <div class="property-value">
                            <input type="text" class="property-readonly" value="${polylineArea.toFixed(2)}" readonly>
                        </div>
                    </div>`;
                } else {
                    html += `<div class="property-row">
                        <div class="property-label">Status:</div>
                        <div class="property-value">
                            <input type="text" class="property-readonly" value="Open polyline" readonly>
                        </div>
                    </div>`;
                }
            }
            break;
            
        case 'polygon':
            html += `<div class="property-row">
                <div class="property-label">Vertices:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${shape.points ? shape.points.length : 0}" readonly>
                </div>
            </div>`;
            if (shape.points && shape.points.length > 2) {
                // Calculate area using shoelace formula
                let area = 0;
                for (let i = 0; i < shape.points.length; i++) {
                    const j = (i + 1) % shape.points.length;
                    area += shape.points[i].x * shape.points[j].y;
                    area -= shape.points[j].x * shape.points[i].y;
                }
                area = Math.abs(area) / 2;
                
                html += `<div class="property-row">
                    <div class="property-label">Area:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${area.toFixed(2)}" readonly>
                    </div>
                </div>`;
                
                // Calculate perimeter
                let perimeter = 0;
                for (let i = 0; i < shape.points.length; i++) {
                    const j = (i + 1) % shape.points.length;
                    const dx = shape.points[j].x - shape.points[i].x;
                    const dy = shape.points[j].y - shape.points[i].y;
                    perimeter += Math.sqrt(dx * dx + dy * dy);
                }
                
                html += `<div class="property-row">
                    <div class="property-label">Perimeter:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${perimeter.toFixed(2)}" readonly>
                    </div>
                </div>`;
                
                // Show center coordinates
                let centerX = 0, centerY = 0;
                shape.points.forEach(point => {
                    centerX += point.x;
                    centerY += point.y;
                });
                centerX /= shape.points.length;
                centerY /= shape.points.length;
                
                html += `<div class="property-row">
                    <div class="property-label">Center X:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${centerX.toFixed(2)}" readonly>
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Center Y:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${centerY.toFixed(2)}" readonly>
                    </div>
                </div>`;
            }
            break;
            
        case 'spline':
            html += `<div class="property-row">
                <div class="property-label">Control Points:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${shape.points ? shape.points.length : 0}" readonly>
                </div>
            </div>`;
            if (shape.points && shape.points.length > 0) {
                html += `<div class="property-row">
                    <div class="property-label">Start X:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[0].x.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, 0, 'x', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Start Y:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.points[0].y.toFixed(2)}" 
                               onchange="updatePolylinePoint(${index}, 0, 'y', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                
                if (shape.points.length > 1) {
                    const lastIndex = shape.points.length - 1;
                    html += `<div class="property-row">
                        <div class="property-label">End X:</div>
                        <div class="property-value">
                            <input type="number" class="property-input" value="${shape.points[lastIndex].x.toFixed(2)}" 
                                   onchange="updatePolylinePoint(${index}, ${lastIndex}, 'x', parseFloat(this.value))" step="0.01">
                        </div>
                    </div>`;
                    html += `<div class="property-row">
                        <div class="property-label">End Y:</div>
                        <div class="property-value">
                            <input type="number" class="property-input" value="${shape.points[lastIndex].y.toFixed(2)}" 
                                   onchange="updatePolylinePoint(${index}, ${lastIndex}, 'y', parseFloat(this.value))" step="0.01">
                        </div>
                    </div>`;
                }
                
                // Splines are open curves - no area
                html += `<div class="property-row">
                    <div class="property-label">Type:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="Open curve" readonly>
                    </div>
                </div>`;
            }
            break;
            
        case 'hatch':
            html += `<div class="property-row">
                <div class="property-label">Hatch Lines:</div>
                <div class="property-value">
                    <input type="text" class="property-readonly" value="${shape.points ? Math.floor(shape.points.length / 2) : 0}" readonly>
                </div>
            </div>`;
            if (shape.points && shape.points.length > 0) {
                let totalLength = 0;
                for (let i = 0; i < shape.points.length; i += 2) {
                    if (i + 1 < shape.points.length) {
                        const dx = shape.points[i + 1].x - shape.points[i].x;
                        const dy = shape.points[i + 1].y - shape.points[i].y;
                        totalLength += Math.sqrt(dx * dx + dy * dy);
                    }
                }
                html += `<div class="property-row">
                    <div class="property-label">Total Length:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${totalLength.toFixed(2)}" readonly>
                    </div>
                </div>`;
                
                // Calculate and display area for hatch
                const hatchArea = calculateShapeArea(shape);
                html += `<div class="property-row">
                    <div class="property-label">Area:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${hatchArea.toFixed(2)}" readonly>
                    </div>
                </div>`;
            }
            break;
            
        case 'rectangle':
            if (shape.width !== undefined && shape.height !== undefined) {
                html += `<div class="property-row">
                    <div class="property-label">X:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.x.toFixed(2)}" 
                               onchange="updateShapeGeometry(${index}, 'x', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Y:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.y.toFixed(2)}" 
                               onchange="updateShapeGeometry(${index}, 'y', parseFloat(this.value))" step="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Width:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.width.toFixed(2)}" 
                               onchange="updateShapeGeometry(${index}, 'width', parseFloat(this.value))" step="0.01" min="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Height:</div>
                    <div class="property-value">
                        <input type="number" class="property-input" value="${shape.height.toFixed(2)}" 
                               onchange="updateShapeGeometry(${index}, 'height', parseFloat(this.value))" step="0.01" min="0.01">
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Area:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${(shape.width * shape.height).toFixed(2)}" readonly>
                    </div>
                </div>`;
                html += `<div class="property-row">
                    <div class="property-label">Perimeter:</div>
                    <div class="property-value">
                        <input type="text" class="property-readonly" value="${(2 * (shape.width + shape.height)).toFixed(2)}" readonly>
                    </div>
                </div>`;
            }
            break;
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
}



/**
 * Generate properties HTML for multiple selected objects
 */
function generateMultipleObjectProperties() {
    const shapes = Array.from(selectedShapes).map(i => shapes[i]);
    let html = '<div class="properties-list">';
    
    html += '<div class="property-group">';
    html += '<div class="property-group-title">Multiple Objects Selected</div>';
    html += `<div class="property-row">
        <div class="property-label">Count:</div>
        <div class="property-value">
            <input type="text" class="property-readonly" value="${selectedShapes.size}" readonly>
        </div>
    </div>`;
    
    // Show common properties if they're the same across all objects
    const firstShape = shapes[0];
    const sameLayer = shapes.every(s => s.layer === firstShape.layer);
    const sameColor = shapes.every(s => s.color === firstShape.color);
    const sameLineWeight = shapes.every(s => s.lineWeight === firstShape.lineWeight);
    const sameLinetype = shapes.every(s => s.linetype === firstShape.linetype);
    
    if (sameLayer) {
        html += `<div class="property-row">
            <div class="property-label">Layer:</div>
            <div class="property-value">
                <select class="property-select" onchange="updateMultipleShapesProperty('layer', this.value)">
                    ${layers.map(layer => 
                        `<option value="${layer.name}" ${firstShape.layer === layer.name ? 'selected' : ''}>${layer.name}</option>`
                    ).join('')}
                </select>
            </div>
        </div>`;
    }
    
    if (sameColor) {
        html += `<div class="property-row">
            <div class="property-label">Color:</div>
            <div class="property-value">
                <select class="property-select" onchange="updateMultipleShapesProperty('color', this.value)">
                    <option value="byLayer" ${firstShape.color === 'byLayer' ? 'selected' : ''}>ByLayer</option>
                    <option value="#ffffff" ${firstShape.color === '#ffffff' ? 'selected' : ''}>White</option>
                    <option value="#ff0000" ${firstShape.color === '#ff0000' ? 'selected' : ''}>Red</option>
                    <option value="#00ff00" ${firstShape.color === '#00ff00' ? 'selected' : ''}>Green</option>
                    <option value="#0000ff" ${firstShape.color === '#0000ff' ? 'selected' : ''}>Blue</option>
                    <option value="#ffff00" ${firstShape.color === '#ffff00' ? 'selected' : ''}>Yellow</option>
                    <option value="#ff00ff" ${firstShape.color === '#ff00ff' ? 'selected' : ''}>Magenta</option>
                    <option value="#00ffff" ${firstShape.color === '#00ffff' ? 'selected' : ''}>Cyan</option>
                </select>
            </div>
        </div>`;
    }
    
    // Calculate total area of all selected objects
    let totalArea = 0;
    let hasClosedShapes = false;
    shapes.forEach(shape => {
        const area = calculateShapeArea(shape);
        totalArea += area;
        if (area > 0) hasClosedShapes = true;
    });
    
    // Only show total area if there are closed shapes
    if (hasClosedShapes) {
        html += `<div class="property-row">
            <div class="property-label">Total Area:</div>
            <div class="property-value">
                <input type="text" class="property-readonly" value="${totalArea.toFixed(2)}" readonly>
            </div>
        </div>`;
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

/**
 * Update a single shape property
 */
function updateShapeProperty(index, property, value) {
    if (index >= 0 && index < shapes.length) {
        saveState(`Modify ${property}`);
        
        // Convert lineWeight to proper type
        if (property === 'lineWeight' && value !== 'byLayer') {
            value = parseFloat(value);
        }
        
        shapes[index][property] = value;
        redraw();
        
        // If lineweight was changed, update the lineweight selector
        if (property === 'lineWeight') {
            updateLineweightSelectorForSelection(shapes[index]);
        }
        
        addToHistory(`Updated ${property} for ${shapes[index].type}`);
    }
}

/**
 * Update shape geometry property
 */
function updateShapeGeometry(index, property, value) {
    if (index >= 0 && index < shapes.length && !isNaN(value)) {
        saveState(`Modify geometry`);
        shapes[index][property] = value;
        redraw();
        updatePropertiesPanel(); // Refresh calculated values
        addToHistory(`Updated ${property} for ${shapes[index].type}`);
    }
}

/**
 * Update property for multiple selected shapes
 */
function updateMultipleShapesProperty(property, value) {
    if (selectedShapes.size > 0) {
        saveState(`Modify ${property} for ${selectedShapes.size} objects`);
        
        // Convert lineWeight to proper type
        if (property === 'lineWeight' && value !== 'byLayer') {
            value = parseFloat(value);
        }
        
        selectedShapes.forEach(index => {
            shapes[index][property] = value;
        });
        redraw();
        
        // If lineweight was changed, update the lineweight selector
        if (property === 'lineWeight') {
            const selectedObjects = Array.from(selectedShapes).map(i => shapes[i]);
            updateLineweightSelectorForSelection(selectedObjects);
        }
        
        updatePropertiesPanel();
        addToHistory(`Updated ${property} for ${selectedShapes.size} objects`);
    }
}

/**
 * Update specific point in polyline/spline
 */
function updatePolylinePoint(shapeIndex, pointIndex, coordinate, value) {
    if (shapeIndex >= 0 && shapeIndex < shapes.length && !isNaN(value)) {
        const shape = shapes[shapeIndex];
        if (shape.points && pointIndex >= 0 && pointIndex < shape.points.length) {
            saveState(`Modify point ${pointIndex} ${coordinate}`);
            shape.points[pointIndex][coordinate] = value;
            redraw();
            updatePropertiesPanel(); // Refresh calculated values
            addToHistory(`Updated point ${pointIndex} ${coordinate} for ${shape.type}`);
        }
    }
}

// === New Move Functions ===
function moveSelectedShapes(dx, dy) {
    if (selectedShapes.size === 0) {
        addToHistory('Nothing selected to move', 'error');
        return;
    }

    // Save state before moving
    saveState(`Move ${selectedShapes.size} object(s)`);

    for (const index of selectedShapes) {
        const shape = shapes[index];
        moveShape(shape, dx, dy);
    }
    
    addToHistory(`Moved ${selectedShapes.size} object(s) by (${dx.toFixed(2)}, ${dy.toFixed(2)})`);
    redraw();
}

// setMode is now defined in /core/state.js

function updateButton(id, state) {
    const el = document.getElementById(id);
    if (el) {
        if (state) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    }
}

function toggleGrid() {
    showGrid = !showGrid;
    const gridInfo = showGrid ? `Grid ON (spacing: ${getCurrentGridStep()})` : 'Grid OFF';
    addToHistory(gridInfo);
    updateHelpBar(gridInfo);
    updateButton('gridBtn', showGrid);
    redraw();
}

// Helper function to get current grid step for display
function getCurrentGridStep() {
    const gridSettings = getCurrentGridSettings();
    return `${gridSettings.base}`;
}

function toggleOrtho() {
    orthoMode = !orthoMode;
    addToHistory(`Ortho mode ${orthoMode ? 'ON' : 'OFF'}`);
    updateHelpBar(`Ortho mode ${orthoMode ? 'ON' : 'OFF'}`);
    updateButton('orthoBtn', orthoMode);
}

function toggleSnap() {
    snapEnabled = !snapEnabled;
    addToHistory(`Snap ${snapEnabled ? 'ON' : 'OFF'}`);
    updateHelpBar(`Snap ${snapEnabled ? 'ON' : 'OFF'}`);
    updateButton('snapBtn', snapEnabled);
}

function toggleObjectSnap() {
    objectSnapEnabled = !objectSnapEnabled;
    addToHistory(`OSNAP ${objectSnapEnabled ? 'ON' : 'OFF'}`);
    updateHelpBar(`OSNAP ${objectSnapEnabled ? 'ON' : 'OFF'}`);
    updateButton('osnapBtn', objectSnapEnabled);
}

let textEditingMode = false;
let editingTextShape = null;
let textEditDialog = null;

function startTextEditing(shape, shapeIndex) {
    if (textEditingMode) return; // Already editing
    
    textEditingMode = true;
    editingTextShape = { shape, index: shapeIndex };
    
    // Create edit dialog
    showTextEditDialog(shape);
    
    if (shapeIndex === -1) {
        addToHistory(`Creating new text...`);
    } else {
        addToHistory(`Started editing text: "${shape.content}"`);
    }
}

function showTextEditDialog(shape) {
    // Create modal dialog for text editing
    textEditDialog = document.createElement('div');
    textEditDialog.className = 'text-edit-dialog';
    textEditDialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2a2a2a;
        border: 2px solid #4c6fff;
        border-radius: 8px;
        padding: 20px;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        min-width: 300px;
    `;
    
    textEditDialog.innerHTML = `
        <h3 style="margin-top: 0; color: #4c6fff;">Edit Text</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">Text Content:</label>
            <textarea id="textContentEdit" style="
                width: 100%; 
                height: 80px; 
                background: #1a1a1a; 
                color: white; 
                border: 1px solid #555; 
                border-radius: 4px; 
                padding: 8px;
                font-family: monospace;
                resize: vertical;
            ">${shape.content || ''}</textarea>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">Text Height:</label>
            <input type="number" id="textHeightEdit" value="${shape.size || shape.height || 12}" step="0.1" min="0.1" style="
                width: 100px; 
                background: #1a1a1a; 
                color: white; 
                border: 1px solid #555; 
                border-radius: 4px; 
                padding: 8px;
            ">
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">Text Alignment:</label>
            <select id="textAlignEdit" style="
                width: 120px; 
                background: #1a1a1a; 
                color: white; 
                border: 1px solid #555; 
                border-radius: 4px; 
                padding: 8px;
            ">
                <option value="left" ${(shape.align === 'left' || !shape.align) ? 'selected' : ''}>Left</option>
                <option value="center" ${shape.align === 'center' ? 'selected' : ''}>Center</option>
                <option value="right" ${shape.align === 'right' ? 'selected' : ''}>Right</option>
                <option value="middle" ${shape.align === 'middle' ? 'selected' : ''}>Middle</option>
            </select>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">Rotation (degrees):</label>
            <input type="number" id="textRotationEdit" value="${shape.rotation || 0}" step="1" min="-360" max="360" style="
                width: 100px; 
                background: #1a1a1a; 
                color: white; 
                border: 1px solid #555; 
                border-radius: 4px; 
                padding: 8px;
            ">
        </div>
        <div style="text-align: right; margin-top: 20px;">
            <button id="textEditCancel" style="
                background: #666; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                padding: 10px 20px; 
                margin-right: 10px; 
                cursor: pointer;
            ">Cancel</button>
            <button id="textEditOK" style="
                background: #4c6fff; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                padding: 10px 20px; 
                cursor: pointer;
            ">OK</button>
        </div>
    `;
    
    document.body.appendChild(textEditDialog);
    
    // Focus on text content
    const textArea = document.getElementById('textContentEdit');
    textArea.focus();
    textArea.select();
    
    // Add event handlers
    document.getElementById('textEditOK').addEventListener('click', confirmTextEdit);
    document.getElementById('textEditCancel').addEventListener('click', cancelTextEdit);
    
    // Handle Enter key for quick OK (Ctrl+Enter or Alt+Enter)
    textArea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.altKey) && e.key === 'Enter') {
            e.preventDefault();
            confirmTextEdit();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelTextEdit();
        }
    });
}

function confirmTextEdit() {
    if (!editingTextShape || !textEditDialog) return;
    
    const newContent = document.getElementById('textContentEdit').value;
    const newHeight = parseFloat(document.getElementById('textHeightEdit').value) || 12;
    const newAlign = document.getElementById('textAlignEdit').value;
    const newRotation = parseFloat(document.getElementById('textRotationEdit').value) || 0;
    
    // Check if this is a new text (index -1) or editing existing
    if (editingTextShape.index === -1) {
        // Creating new text
        if (!newContent.trim()) {
            addToHistory('Text creation cancelled - empty content');
            closeTextEditDialog();
            setMode('select'); // Return to select mode
            return;
        }
        
        // Update the temporary shape with dialog values
        const shape = editingTextShape.shape;
        shape.content = newContent;
        shape.size = newHeight;
        shape.height = newHeight;
        shape.align = newAlign;
        shape.rotation = newRotation;
        
        // Add the new text shape
        saveState('Create text');
        addShape(createShapeWithProperties(shape));
        addToHistory(`Text created: "${newContent}" at (${shape.x.toFixed(2)}, ${shape.y.toFixed(2)})`);
        
        // Clean up
        delete window.pendingTextShape;
        closeTextEditDialog();
        redraw();
        setMode('select'); // Return to select mode
    } else {
        // Editing existing text
        saveState('Edit text');
        
        const shape = editingTextShape.shape;
        shape.content = newContent;
        shape.size = newHeight;
        shape.height = newHeight;
        shape.align = newAlign;
        shape.rotation = newRotation;
        
        // Mark shape as selected for visual feedback
        selectedShapes.clear();
        selectedShapes.add(editingTextShape.index);
        
        addToHistory(`Text edited: "${newContent}" (${newHeight} height, ${newAlign} align, ${newRotation}° rotation)`);
        
        // Clean up and redraw
        closeTextEditDialog();
        redraw();
        
        // Update properties panel if open
        const propertiesPanel = document.getElementById('propertiesPanel');
        if (propertiesPanel && propertiesPanel.style.display !== 'none') {
            updatePropertiesPanel();
        }
    }
}

function cancelTextEdit() {
    // Check if this was a new text creation
    if (editingTextShape && editingTextShape.index === -1) {
        addToHistory('Text creation cancelled');
        delete window.pendingTextShape;
        setMode('select'); // Return to select mode
    } else {
        addToHistory('Text editing cancelled');
    }
    closeTextEditDialog();
}

function closeTextEditDialog() {
    textEditingMode = false;
    editingTextShape = null;
    
    if (textEditDialog) {
        document.body.removeChild(textEditDialog);
        textEditDialog = null;
    }
}

// Helper function to check if user is currently typing in an input field
function isUserTypingInInput() {
    const activeElement = document.activeElement;
    return activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
    );
}

// Add event listener for text input
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        confirmText();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelText();
    }
});

// Text input functions
function confirmText() {
    if (textInput.value.trim()) {
        addShape(createShapeWithProperties({
            type: 'text',
            x: textPosition.x,
            y: textPosition.y,
            content: textInput.value,
            size: 12  // Use fixed world size, not divided by zoom
        }));
        updateHelpBar('Text placed! Click to place another text or press Escape to finish');
        redraw();
    }
    cancelText();
}

function cancelText() {
    textInput.value = '';
    textInputOverlay.style.display = 'none';
    // Return to step 1 help message
    if (mode === 'text') {
        updateHelpBar('Step 1/2: Click to place text');
    }
}

// Make grid and snap functions globally accessible
window.toggleGrid = toggleGrid;
window.toggleOrtho = toggleOrtho;
window.toggleSnap = toggleSnap;
window.toggleObjectSnap = toggleObjectSnap;
window.toggleCommandHistory = toggleCommandHistory;


// === POLYGON DROPDOWN FUNCTIONS ===
// (Polygon now uses simple setMode('polygon') - dropdown removed for stability)

window.toggleLayerPanel = toggleLayerPanel;
window.toggleLineweightDisplay = toggleLineweightDisplay;
window.initDragLayer = initDragLayer;

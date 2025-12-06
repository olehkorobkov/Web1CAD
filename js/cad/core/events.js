function updateHelpBar(message) {
    if (helpBarElement) {
        helpBarElement.textContent = message;
    }
}

function setStatusMessage(message, persistent = false) {
    if (helpBarElement && message) {
        helpBarElement.textContent = message;
        
        if (statusTimeout) {
            clearTimeout(statusTimeout);
            statusTimeout = null;
        }
        
        if (!persistent && message !== '') {
            statusTimeout = setTimeout(() => {
                clearStatusMessage();
            }, 3000);
        }
    }
}

function clearStatusMessage() {
    if (helpBarElement) {
        helpBarElement.textContent = 'Ready';
    }
    if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
    }
}

function toggleCommandHistory() {
    const commandSection = document.querySelector('.command-section');
    const helpBar = document.querySelector('.help-bar');
    
    isHistoryVisible = !isHistoryVisible;
    
    if (isHistoryVisible) {
        commandHistoryElement.classList.add('show');
        commandHistoryElement.style.display = 'block';
        helpBar.classList.add('command-active');
    } else {
        commandHistoryElement.classList.remove('show');
        commandHistoryElement.style.display = 'none';
        helpBar.classList.remove('command-active');
    }
    
    const toggleButton = document.querySelector('.command-toggle');
    if (toggleButton) {
        toggleButton.textContent = isHistoryVisible ? '▼' : '▲';
        toggleButton.title = isHistoryVisible ? 'Hide command history' : 'Show command history';
    }
}

function addToHistory(text, type = 'success') {
    const line = document.createElement('div');
    line.className = `command-${type}`;
    line.textContent = '> ' + text;
    commandHistoryElement.appendChild(line);
    commandHistory.push(text);
    commandHistoryElement.scrollTop = commandHistoryElement.scrollHeight;
}

function handleCommandInput(e) {
    if (e.key === 'Enter') {
        if (this.value.trim() !== '') {
            executeCommand(this.value);
        }
        this.value = '';
        historyIndex = -1;
        tempCommand = '';
        this.blur();
    } else if (e.key === 'Escape') {
        this.value = '';
        historyIndex = -1;
        tempCommand = '';
        this.blur();
        e.preventDefault();
    } else if (e.key === 'ArrowUp') {
        if (historyIndex < commandHistory.length - 1) {
            if (historyIndex === -1) tempCommand = this.value;
            historyIndex++;
            this.value = commandHistory[commandHistory.length - 1 - historyIndex];
        }
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        if (historyIndex > 0) {
            historyIndex--;
            this.value = commandHistory[commandHistory.length - 1 - historyIndex];
        } else if (historyIndex === 0) {
            historyIndex = -1;
            this.value = tempCommand;
        }
        e.preventDefault();
    }
}

document.getElementById('dxfInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        importDXF(file);
    }
});

function openDrawing() {
    const fileInput = document.getElementById('fileInput');
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            loadDrawing(file);
        }
        e.target.value = '';
    };
    fileInput.click();
}

function loadDrawing(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.version || !data.shapes || !data.layers) {
                throw new Error('Invalid Web1CAD file format');
            }
            
            shapes = data.shapes || [];
            
            layers = data.layers || [
                { name: '0', color: '#ffffff', visible: true, locked: false, lineWeight: 'byLayer', linetype: 'continuous' }
            ];
            
            currentLayer = data.currentLayer || '0';
            currentColor = data.currentColor || 'byLayer';
            currentLineWeight = data.currentLineWeight || 'byLayer';
            showGrid = data.showGrid !== undefined ? data.showGrid : true;
            snapEnabled = data.snapEnabled !== undefined ? data.snapEnabled : true;
            orthoMode = data.orthoMode !== undefined ? data.orthoMode : false;
            objectSnapEnabled = data.objectSnapEnabled !== undefined ? data.objectSnapEnabled : true;
            
            if (data.view) {
                zoom = data.view.zoom || 3.7; 
                offsetX = data.view.offsetX || canvas.width / 2;
                offsetY = data.view.offsetY || canvas.height / 2;
            }
            
            selectedShapes.clear();
            undoStack = [];
            redoStack = [];
            
            invalidateViewportCache();
            
            updateLayerSelector();
            updateColorDisplay();
            updateButton('gridBtn', showGrid);
            updateButton('snapBtn', snapEnabled);
            updateButton('orthoBtn', orthoMode);
            updateButton('osnapBtn', objectSnapEnabled);
            
            redraw();
            addToHistory(`Drawing loaded: ${file.name} (${shapes.length} objects, ${layers.length} layers)`);
            
        } catch (error) {
            addToHistory(`Failed to load file: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

function saveDrawing() {
    try {
        if (!Array.isArray(shapes)) {
            throw new Error('Invalid shapes data structure');
        }
        if (!Array.isArray(layers)) {
            throw new Error('Invalid layers data structure');
        }
        
        const data = {
            version: '250512',
            title: 'Web1CAD Drawing',
            created: new Date().toISOString(),
            author: 'Oleh Korobkov',
            copyright: '© 2025 Oleh Korobkov. All rights reserved.',
            software: 'Web1CAD - Professional 2D CAD System 250512 Beta',
            license: 'Proprietary - Unauthorized use prohibited',
            shapes: shapes,
            layers: layers,
            currentLayer: currentLayer,
            currentColor: currentColor,
            currentLineWeight: currentLineWeight,
            showGrid: showGrid,
            snapEnabled: snapEnabled,
            orthoMode: orthoMode,
            objectSnapEnabled: objectSnapEnabled,
            view: {
                zoom: zoom,
                offsetX: offsetX,
                offsetY: offsetY
            }
        };
        
        const json = JSON.stringify(data, null, 2);
        if (!json || json.length === 0) {
            throw new Error('Failed to serialize drawing data');
        }
        
        const blob = new Blob([json], { type: 'application/json' });
        if (!blob || blob.size === 0) {
            throw new Error('Failed to create file blob');
        }
        
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `drawing_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wcd`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        hasUnsavedChanges = false;
        localStorage.removeItem('web1cad_autosave');
        
        addToHistory(`Drawing saved: ${a.download} (${shapes.length} objects, ${layers.length} layers)`);
        
    } catch (error) {
        console.error('Save error:', error);
        addToHistory(`Failed to save drawing: ${error.message}`, 'error');
        alert(`Error saving file: ${error.message}`);
    }
}

// Export functions to window for HTML onclick handlers
window.openDrawing = openDrawing;
window.saveDrawing = saveDrawing;
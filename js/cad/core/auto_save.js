let autoSaveTimer = null;
let hasUnsavedChanges = false;

function markAsChanged() {
    hasUnsavedChanges = true;
    scheduleAutoSave();
}

function scheduleAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    autoSaveTimer = setTimeout(performAutoSave, AUTO_SAVE_INTERVAL);
}

function performAutoSave() {
    if (hasUnsavedChanges && shapes.length > 0) {
        try {
            const data = {
                version: '251207',
                autoSave: true,
                timestamp: new Date().toISOString(),
                shapes: shapes,
                layers: layers,
                currentLayer: currentLayer,
                view: { zoom: zoom, offsetX: offsetX, offsetY: offsetY }
            };
            localStorage.setItem('web1cad_autosave', JSON.stringify(data));
            console.log('Auto-save completed');
        } catch (error) {
            console.warn('Auto-save failed:', error.message);
        }
    }
}

function checkForAutoSave() {
    try {
        const autoSaveData = localStorage.getItem('web1cad_autosave');
        if (autoSaveData) {
            const data = JSON.parse(autoSaveData);
            const saveTime = new Date(data.timestamp);
            const now = new Date();
            const minutesAgo = Math.floor((now - saveTime) / 60000);

            if (minutesAgo < 60 && data.shapes && data.shapes.length > 0) {
                const restore = confirm(
                    `Auto-saved drawing found from ${minutesAgo} minutes ago with ${data.shapes.length} objects. Restore it?`
                );
                if (restore) {
                    restoreFromAutoSave(data);
                    return true;
                }
            }
        }
    } catch (error) {
        console.warn('Failed to check auto-save:', error.message);
    }
    return false;
}

function restoreFromAutoSave(data) {
    try {
        shapes = data.shapes || [];
        layers = data.layers || [];
        currentLayer = data.currentLayer || '0';

        if (data.view) {
            zoom = data.view.zoom || 3.7;
            offsetX = data.view.offsetX || 0;
            offsetY = data.view.offsetY || 0;
        }

        selectedShapes.clear();
        initializeLayers();
        redraw();

        addToHistory(`Restored from auto-save: ${shapes.length} objects`);
        localStorage.removeItem('web1cad_autosave');
    } catch (error) {
        console.error('Failed to restore from auto-save:', error);
        addToHistory('Failed to restore auto-save', 'error');
    }
}
let redrawDebounceTimer = null;

function debouncedRedraw() {
    if (redrawDebounceTimer) {
        clearTimeout(redrawDebounceTimer);
    }
    redrawDebounceTimer = setTimeout(() => {
        _redraw();
        redrawDebounceTimer = null;
    }, REDRAW_DEBOUNCE_MS);
}
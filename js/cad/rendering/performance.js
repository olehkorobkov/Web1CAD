let performanceStats = {
    frameTime: 0,
    lastFrameTime: performance.now(),
    fps: 60,
    frameCount: 0
};

let renderingStats = {
    totalShapes: 0,
    culledShapes: 0,
    visibleShapes: 0,
    lastCullTime: 0
};

function updatePerformanceStats() {
    const now = performance.now();
    performanceStats.frameTime = now - performanceStats.lastFrameTime;
    performanceStats.lastFrameTime = now;
    performanceStats.frameCount++;

    if (performanceStats.frameCount % 60 === 0) {
        performanceStats.fps = Math.round(1000 / performanceStats.frameTime);

        if (performanceStats.fps < 30 && shapes.length > 1000) {
            // Performance warning: low FPS with many objects
        }
    }
}

window.showViewportStats = function() {
    // Viewport optimization statistics
};
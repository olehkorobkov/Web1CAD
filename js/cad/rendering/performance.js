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
            console.warn(`Performance warning: ${performanceStats.fps} FPS with ${shapes.length} objects`);
        }
    }
}

window.showViewportStats = function() {
    console.group('🔍 Viewport Optimization Statistics');
    console.log(`Total shapes: ${shapes.length}`);
    console.log(`Visible shapes: ${viewportCache.visibleShapes.size}`);
    console.log(`Culled shapes: ${shapes.length - viewportCache.visibleShapes.size}`);
    console.log(`Culling efficiency: ${((shapes.length - viewportCache.visibleShapes.size) / shapes.length * 100).toFixed(1)}%`);
    console.log(`Last cull time: ${renderingStats.lastCullTime.toFixed(2)}ms`);
    console.log(`Current FPS: ${performanceStats.fps}`);
    console.log(`Viewport bounds:`, viewportCache.bounds);
    console.groupEnd();
};
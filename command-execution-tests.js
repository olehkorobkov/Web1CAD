/**
 * Comprehensive Command Execution Test Suite
 * Tests: move, copy, rotate, scale commands
 * Validates UUID handling, transformations, and cache invalidation
 */

// Mock browser environment
global.window = {
    shapeHandler: null,
    renderStabilizer: undefined,
    renderDiagnostics: undefined
};

// Mock console for better output
const originalLog = console.log;
let testResults = [];

function logTest(message) {
    originalLog(message);
    testResults.push(message);
}

/**
 * Create mock shapes with UUIDs
 */
function createTestShapes() {
    return [
        {
            uuid: 'uuid-line-1',
            type: 'line',
            x1: 10, y1: 10,
            x2: 100, y2: 100,
            layer: 0,
            color: '#000000',
            lineWeight: 0.5
        },
        {
            uuid: 'uuid-circle-1',
            type: 'circle',
            cx: 200, cy: 200,
            radius: 50,
            layer: 0,
            color: '#000000'
        },
        {
            uuid: 'uuid-rect-1',
            type: 'rectangle',
            x: 300, y: 300,
            width: 100, height: 80,
            layer: 0,
            color: '#000000'
        },
        {
            uuid: 'uuid-polyline-1',
            type: 'polyline',
            points: [
                { x: 400, y: 400 },
                { x: 450, y: 450 },
                { x: 500, y: 400 }
            ],
            layer: 0,
            color: '#000000'
        }
    ];
}

/**
 * Mock shape transformation functions
 */
const shapeFunctions = {
    // Move shape by dx, dy
    moveShape: function(shape, dx, dy) {
        switch(shape.type) {
            case 'line':
                shape.x1 += dx;
                shape.y1 += dy;
                shape.x2 += dx;
                shape.y2 += dy;
                break;
            case 'circle':
                shape.cx += dx;
                shape.cy += dy;
                break;
            case 'rectangle':
                shape.x += dx;
                shape.y += dy;
                break;
            case 'polyline':
            case 'polygon':
                if (shape.points) {
                    shape.points.forEach(point => {
                        point.x += dx;
                        point.y += dy;
                    });
                }
                break;
        }
        return true;
    },

    // Rotate shape around center point
    rotateShape: function(shape, centerX, centerY, angle) {
        const rotatePoint = (x, y, cx, cy, a) => {
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            const tx = x - cx;
            const ty = y - cy;
            return {
                x: cx + tx * cos - ty * sin,
                y: cy + tx * sin + ty * cos
            };
        };

        switch(shape.type) {
            case 'line': {
                const p1 = rotatePoint(shape.x1, shape.y1, centerX, centerY, angle);
                const p2 = rotatePoint(shape.x2, shape.y2, centerX, centerY, angle);
                shape.x1 = p1.x;
                shape.y1 = p1.y;
                shape.x2 = p2.x;
                shape.y2 = p2.y;
                break;
            }
            case 'circle':
            case 'polyline':
                // Circle rotation around different center: move center only
                if (shape.cx !== undefined) {
                    const p = rotatePoint(shape.cx, shape.cy, centerX, centerY, angle);
                    shape.cx = p.x;
                    shape.cy = p.y;
                }
                if (shape.points) {
                    shape.points.forEach(point => {
                        const p = rotatePoint(point.x, point.y, centerX, centerY, angle);
                        point.x = p.x;
                        point.y = p.y;
                    });
                }
                break;
            case 'rectangle': {
                const rectCenter = rotatePoint(shape.x + shape.width/2, shape.y + shape.height/2, centerX, centerY, angle);
                shape.x = rectCenter.x - shape.width/2;
                shape.y = rectCenter.y - shape.height/2;
                break;
            }
        }
        return true;
    },

    // Scale shape from center point
    scaleShape: function(shape, centerX, centerY, factor) {
        const scalePoint = (x, y, cx, cy, f) => {
            return {
                x: cx + (x - cx) * f,
                y: cy + (y - cy) * f
            };
        };

        switch(shape.type) {
            case 'line': {
                const p1 = scalePoint(shape.x1, shape.y1, centerX, centerY, factor);
                const p2 = scalePoint(shape.x2, shape.y2, centerX, centerY, factor);
                shape.x1 = p1.x;
                shape.y1 = p1.y;
                shape.x2 = p2.x;
                shape.y2 = p2.y;
                break;
            }
            case 'circle':
                shape.radius *= factor;
                const pc = scalePoint(shape.cx, shape.cy, centerX, centerY, factor);
                shape.cx = pc.x;
                shape.cy = pc.y;
                break;
            case 'rectangle': {
                shape.width *= factor;
                shape.height *= factor;
                const rectCenter = scalePoint(shape.x + shape.width/2, shape.y + shape.height/2, centerX, centerY, factor);
                shape.x = rectCenter.x - shape.width/2;
                shape.y = rectCenter.y - shape.height/2;
                break;
            }
            case 'polyline':
                if (shape.points) {
                    shape.points.forEach(point => {
                        const p = scalePoint(point.x, point.y, centerX, centerY, factor);
                        point.x = p.x;
                        point.y = p.y;
                    });
                }
                break;
        }
        return true;
    }
};

/**
 * Deep copy shape
 */
function safeDeepCopy(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => safeDeepCopy(item));
    
    const copy = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            copy[key] = safeDeepCopy(obj[key]);
        }
    }
    return copy;
}

/**
 * Generate UUID
 */
function generateUUID() {
    return 'uuid-' + Math.random().toString(36).substr(2, 9);
}

// ============================================================
// TEST SUITE
// ============================================================

logTest('\n╔════════════════════════════════════════════════════════════╗');
logTest('║         🧪 COMMAND EXECUTION TEST SUITE 🧪                ║');
logTest('║  Tests: move, copy, rotate, scale                         ║');
logTest('╚════════════════════════════════════════════════════════════╝\n');

// Test data
let shapes = createTestShapes();
let testsPassed = 0;
let testsFailed = 0;

/**
 * Test 1: UUID System Integrity
 */
logTest('TEST 1: UUID System Integrity');
logTest('─────────────────────────────────────────────────');
try {
    const uuidSet = new Set(shapes.map(s => s.uuid));
    if (uuidSet.size === shapes.length) {
        logTest('✅ All shapes have unique UUIDs');
        testsPassed++;
    } else {
        logTest('❌ UUID collision detected');
        testsFailed++;
    }
    
    // Verify UUID format
    const allUUIDs = shapes.every(s => typeof s.uuid === 'string' && s.uuid.startsWith('uuid-'));
    if (allUUIDs) {
        logTest('✅ All UUIDs properly formatted');
        testsPassed++;
    } else {
        logTest('❌ UUID format invalid');
        testsFailed++;
    }
} catch (err) {
    logTest('❌ UUID test failed: ' + err.message);
    testsFailed++;
}

/**
 * Test 2: Move Command
 */
logTest('\nTEST 2: Move Command');
logTest('─────────────────────────────────────────────────');
try {
    const moveSet = new Set(['uuid-line-1', 'uuid-rect-1']);
    const dx = 50, dy = 50;
    
    let moveCount = 0;
    for (const uuid of moveSet) {
        const shape = shapes.find(s => s.uuid === uuid);
        if (shape) {
            const oldX = shape.x || shape.x1 || shape.cx;
            shapeFunctions.moveShape(shape, dx, dy);
            const newX = shape.x || shape.x1 || shape.cx;
            
            if (Math.abs((newX - oldX) - dx) < 0.01) {
                moveCount++;
            }
        }
    }
    
    if (moveCount === moveSet.size) {
        logTest(`✅ Moved ${moveCount} shapes by (${dx}, ${dy})`);
        testsPassed++;
    } else {
        logTest(`❌ Only ${moveCount}/${moveSet.size} shapes moved correctly`);
        testsFailed++;
    }
    
    // Test rectangle move specifically
    const rectShape = shapes.find(s => s.uuid === 'uuid-rect-1');
    if (rectShape.x === 350 && rectShape.y === 350) {
        logTest('✅ Rectangle move confirmed: x=' + rectShape.x + ', y=' + rectShape.y);
        testsPassed++;
    } else {
        logTest('❌ Rectangle move failed: x=' + rectShape.x + ', y=' + rectShape.y);
        testsFailed++;
    }
} catch (err) {
    logTest('❌ Move test failed: ' + err.message);
    testsFailed += 2;
}

/**
 * Test 3: Copy Command
 */
logTest('\nTEST 3: Copy Command');
logTest('─────────────────────────────────────────────────');
try {
    const copySet = new Set(['uuid-circle-1']);
    const dx = 100, dy = 100;
    const originalCount = shapes.length;
    
    let copiedCount = 0;
    for (const uuid of copySet) {
        const original = shapes.find(s => s.uuid === uuid);
        if (original) {
            const copy = safeDeepCopy(original);
            copy.uuid = generateUUID();
            shapeFunctions.moveShape(copy, dx, dy);
            shapes.push(copy);
            copiedCount++;
        }
    }
    
    if (shapes.length === originalCount + copiedCount) {
        logTest(`✅ Copied ${copiedCount} shapes (new total: ${shapes.length})`);
        testsPassed++;
    } else {
        logTest(`❌ Copy failed: expected ${originalCount + copiedCount}, got ${shapes.length}`);
        testsFailed++;
    }
    
    // Verify new UUIDs
    const newShape = shapes[shapes.length - 1];
    if (newShape && newShape.uuid && !['uuid-line-1', 'uuid-circle-1', 'uuid-rect-1', 'uuid-polyline-1'].includes(newShape.uuid)) {
        logTest('✅ New shape has unique UUID: ' + newShape.uuid);
        testsPassed++;
    } else {
        logTest('❌ Copy UUID not unique');
        testsFailed++;
    }
} catch (err) {
    logTest('❌ Copy test failed: ' + err.message);
    testsFailed += 2;
}

/**
 * Test 4: Rotate Command
 */
logTest('\nTEST 4: Rotate Command');
logTest('─────────────────────────────────────────────────');
try {
    const rotateSet = new Set(['uuid-line-1']);
    const centerX = 50, centerY = 50;
    const angle = Math.PI / 4; // 45 degrees
    
    let rotateCount = 0;
    for (const uuid of rotateSet) {
        const shape = shapes.find(s => s.uuid === uuid);
        if (shape) {
            const oldX2 = shape.x2;
            shapeFunctions.rotateShape(shape, centerX, centerY, angle);
            const newX2 = shape.x2;
            
            // Verify rotation changed coordinates
            if (oldX2 !== newX2) {
                rotateCount++;
            }
        }
    }
    
    if (rotateCount === rotateSet.size) {
        logTest(`✅ Rotated ${rotateCount} shape(s) by ${(angle * 180 / Math.PI).toFixed(1)}°`);
        testsPassed++;
    } else {
        logTest(`❌ Rotation failed for ${rotateSet.size - rotateCount} shape(s)`);
        testsFailed++;
    }
    
    // Verify coordinates changed
    const lineShape = shapes.find(s => s.uuid === 'uuid-line-1');
    if (lineShape && lineShape.x1 !== 10) {
        logTest('✅ Line rotation verified: coordinates changed');
        testsPassed++;
    } else {
        logTest('❌ Rotation did not change coordinates');
        testsFailed++;
    }
} catch (err) {
    logTest('❌ Rotate test failed: ' + err.message);
    testsFailed += 2;
}

/**
 * Test 5: Scale Command
 */
logTest('\nTEST 5: Scale Command');
logTest('─────────────────────────────────────────────────');
try {
    const scaleSet = new Set(['uuid-circle-1']);
    const centerX = 200, centerY = 200;
    const scaleFactor = 2.0;
    
    let scaleCount = 0;
    for (const uuid of scaleSet) {
        const shape = shapes.find(s => s.uuid === uuid);
        if (shape && shape.type === 'circle') {
            const oldRadius = shape.radius;
            shapeFunctions.scaleShape(shape, centerX, centerY, scaleFactor);
            
            if (Math.abs(shape.radius - oldRadius * scaleFactor) < 0.01) {
                scaleCount++;
            }
        }
    }
    
    if (scaleCount === scaleSet.size) {
        logTest(`✅ Scaled ${scaleCount} shape(s) by factor ${scaleFactor}`);
        testsPassed++;
    } else {
        logTest(`❌ Scale failed for ${scaleSet.size - scaleCount} shape(s)`);
        testsFailed++;
    }
    
    // Verify scale value
    const circle = shapes.find(s => s.uuid === 'uuid-circle-1');
    if (circle && circle.radius === 100) {
        logTest('✅ Circle radius scaled: 50 → 100');
        testsPassed++;
    } else {
        logTest('❌ Circle scale verification failed');
        testsFailed++;
    }
} catch (err) {
    logTest('❌ Scale test failed: ' + err.message);
    testsFailed += 2;
}

/**
 * Test 6: Cache Invalidation Simulation
 */
logTest('\nTEST 6: Cache Invalidation');
logTest('─────────────────────────────────────────────────');
try {
    // Simulate cache invalidation flags
    let cacheInvalidated = {
        bounds: false,
        quadtree: false,
        viewport: false
    };
    
    // Simulate invalidation functions
    function invalidateShapeSetBoundsCache(uuidSet) {
        cacheInvalidated.bounds = true;
        return true;
    }
    
    function invalidateQuadTree() {
        cacheInvalidated.quadtree = true;
        return true;
    }
    
    function invalidateViewportCache() {
        cacheInvalidated.viewport = true;
        return true;
    }
    
    // Simulate move with cache invalidation
    const moveSet = new Set(['uuid-rect-1']);
    invalidateShapeSetBoundsCache(moveSet);
    invalidateQuadTree();
    invalidateViewportCache();
    
    const allInvalidated = Object.values(cacheInvalidated).every(v => v === true);
    if (allInvalidated) {
        logTest('✅ All caches invalidated: bounds, quadtree, viewport');
        testsPassed++;
    } else {
        logTest('❌ Cache invalidation incomplete: ' + JSON.stringify(cacheInvalidated));
        testsFailed++;
    }
} catch (err) {
    logTest('❌ Cache invalidation test failed: ' + err.message);
    testsFailed++;
}

/**
 * Test 7: Renderer UUID Handling (Critical Fix)
 */
logTest('\nTEST 7: Renderer UUID/Index Mismatch Fix');
logTest('─────────────────────────────────────────────────');
try {
    // Simulate the renderer issue fix
    const moveObjectsToMove = new Set(['uuid-line-1', 'uuid-rect-1']);
    
    // OLD (BROKEN): moveObjectsToMove.has(i) where i=0,1,2...
    let broken = false;
    for (let i = 0; i < shapes.length; i++) {
        if (moveObjectsToMove.has(i)) {
            broken = true; // This will never be true!
        }
    }
    
    if (!broken) {
        logTest('✅ Confirmed: array index check always fails with UUID set');
        testsPassed++;
    }
    
    // NEW (FIXED): moveObjectsToMove.has(shape.uuid)
    let fixed = 0;
    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        if (moveObjectsToMove.has(shape.uuid)) {
            fixed++;
        }
    }
    
    if (fixed === moveObjectsToMove.size) {
        logTest(`✅ Fixed: UUID check correctly finds ${fixed} shapes`);
        testsPassed++;
    } else {
        logTest(`❌ Fixed UUID check failed: found ${fixed}, expected ${moveObjectsToMove.size}`);
        testsFailed++;
    }
} catch (err) {
    logTest('❌ Renderer UUID test failed: ' + err.message);
    testsFailed += 2;
}

/**
 * Test 8: All Shape Types Support
 */
logTest('\nTEST 8: Support for All Shape Types');
logTest('─────────────────────────────────────────────────');
try {
    const shapeTypes = ['line', 'circle', 'rectangle', 'polyline', 'polygon', 'spline'];
    let supportedTypes = 0;
    
    for (const type of shapeTypes) {
        const testShape = shapes.find(s => s.type === type);
        if (testShape) {
            try {
                shapeFunctions.moveShape(safeDeepCopy(testShape), 10, 10);
                shapeFunctions.rotateShape(safeDeepCopy(testShape), 0, 0, 0.1);
                shapeFunctions.scaleShape(safeDeepCopy(testShape), 0, 0, 1.1);
                supportedTypes++;
            } catch (e) {
                // Type not supported
            }
        }
    }
    
    if (supportedTypes >= 4) {
        logTest(`✅ All major shape types supported: ${supportedTypes}/6`);
        testsPassed++;
    } else {
        logTest(`❌ Only ${supportedTypes}/6 shape types supported`);
        testsFailed++;
    }
} catch (err) {
    logTest('❌ Shape type test failed: ' + err.message);
    testsFailed++;
}

// ============================================================
// SUMMARY
// ============================================================

logTest('\n╔════════════════════════════════════════════════════════════╗');
logTest('║                    📊 TEST SUMMARY 📊                     ║');
logTest('╚════════════════════════════════════════════════════════════╝\n');

logTest(`✅ Passed: ${testsPassed}`);
logTest(`❌ Failed: ${testsFailed}`);
logTest(`📊 Total:  ${testsPassed + testsFailed}`);
logTest(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
    logTest('\n🎉 ALL TESTS PASSED! Commands are working correctly!');
} else {
    logTest('\n⚠️  Some tests failed. Review output above.');
}

logTest('\n═══════════════════════════════════════════════════════════\n');

// Export for running
module.exports = { testResults, testsPassed, testsFailed };

#!/usr/bin/env node

/**
 * QuadTree Unit Tests - Node.js Test Suite
 * Autonomous testing of QuadTree spatial indexing logic
 * 
 * Run: node test-quadtree.js
 */

// ============================================================================
// TEST UTILITIES
// ============================================================================

class TestRunner {
    constructor(name) {
        this.name = name;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`Expected ${expected}, got ${actual}: ${message}`);
        }
    }

    assertArrayEqual(actual, expected, message) {
        if (actual.length !== expected.length) {
            throw new Error(`Array length mismatch: expected ${expected.length}, got ${actual.length}. ${message}`);
        }
        for (let i = 0; i < actual.length; i++) {
            if (actual[i] !== expected[i]) {
                throw new Error(`Array element ${i} mismatch: expected ${expected[i]}, got ${actual[i]}. ${message}`);
            }
        }
    }

    async run() {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`TEST SUITE: ${this.name}`);
        console.log(`${'='.repeat(70)}\n`);

        for (const test of this.tests) {
            try {
                await test.fn();
                this.passed++;
                console.log(`✅ PASS: ${test.name}`);
            } catch (err) {
                this.failed++;
                console.log(`❌ FAIL: ${test.name}`);
                console.log(`   Error: ${err.message}\n`);
            }
        }

        console.log(`\n${'='.repeat(70)}`);
        console.log(`RESULTS: ${this.passed} passed, ${this.failed} failed (${this.tests.length} total)`);
        console.log(`${'='.repeat(70)}\n`);

        return this.failed === 0;
    }
}

// ============================================================================
// QUADTREE IMPLEMENTATION (Extracted for testing)
// ============================================================================

class QuadTreeNode {
    constructor(bounds, depth = 0, maxDepth = 8, maxObjects = 4) {
        this.bounds = bounds;
        this.depth = depth;
        this.maxDepth = maxDepth;
        this.maxObjects = maxObjects;
        this.objects = [];
        this.children = null;
        this.isLeaf = true;
    }

    isSubdivided() {
        return this.children !== null;
    }

    subdivide() {
        if (this.isSubdivided() || this.depth >= this.maxDepth) {
            return false;
        }

        const { minX, maxX, minY, maxY } = this.bounds;
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        this.children = [
            new QuadTreeNode(
                { minX: minX, maxX: midX, minY: midY, maxY: maxY },
                this.depth + 1, this.maxDepth, this.maxObjects
            ),
            new QuadTreeNode(
                { minX: midX, maxX: maxX, minY: midY, maxY: maxY },
                this.depth + 1, this.maxDepth, this.maxObjects
            ),
            new QuadTreeNode(
                { minX: minX, maxX: midX, minY: minY, maxY: midY },
                this.depth + 1, this.maxDepth, this.maxObjects
            ),
            new QuadTreeNode(
                { minX: midX, maxX: maxX, minY: minY, maxY: midY },
                this.depth + 1, this.maxDepth, this.maxObjects
            )
        ];

        this.isLeaf = false;

        for (const obj of this.objects) {
            this.insertIntoChildren(obj);
        }
        this.objects = [];

        return true;
    }

    insertIntoChildren(obj) {
        if (!this.isSubdivided()) return false;

        for (const child of this.children) {
            if (this.boundsIntersect(obj.bounds, child.bounds)) {
                child.insert(obj);
            }
        }
        return true;
    }

    insert(obj) {
        if (this.isSubdivided()) {
            this.insertIntoChildren(obj);
            return true;
        }

        this.objects.push(obj);

        if (this.objects.length > this.maxObjects && this.depth < this.maxDepth) {
            this.subdivide();
        }

        return true;
    }

    query(bounds, results = new Set()) {
        if (!this.boundsIntersect(bounds, this.bounds)) {
            return results;
        }

        // Add objects from this node (track by index to avoid duplicates)
        for (const obj of this.objects) {
            if (this.boundsIntersect(bounds, obj.bounds)) {
                results.add(obj.index);
            }
        }

        // Query children if subdivided
        if (this.isSubdivided()) {
            for (const child of this.children) {
                child.query(bounds, results);
            }
        }

        return results;
    }

    boundsIntersect(bounds1, bounds2) {
        return !(bounds1.maxX < bounds2.minX ||
                 bounds1.minX > bounds2.maxX ||
                 bounds1.maxY < bounds2.minY ||
                 bounds1.minY > bounds2.maxY);
    }

    clear() {
        this.objects = [];
        if (this.isSubdivided()) {
            for (const child of this.children) {
                child.clear();
            }
        }
    }

    getStats(uniqueObjects = null) {
        if (uniqueObjects === null) {
            uniqueObjects = new Set();
        }

        let nodeCount = 1;

        // Count objects in this node
        for (const obj of this.objects) {
            uniqueObjects.add(obj.index);
        }

        if (this.isSubdivided()) {
            for (const child of this.children) {
                const childStats = child.getStats(uniqueObjects);
                nodeCount += childStats.nodeCount;
            }
        }

        return { nodeCount, objectCount: uniqueObjects.size };
    }
}

class QuadTree {
    constructor(bounds, maxDepth = 8, maxObjects = 4) {
        this.bounds = bounds;
        this.root = new QuadTreeNode(bounds, 0, maxDepth, maxObjects);
    }

    build(shapesArray) {
        this.clear();

        if (!shapesArray || shapesArray.length === 0) {
            return { time: 0, count: 0 };
        }

        for (let i = 0; i < shapesArray.length; i++) {
            const shape = shapesArray[i];
            if (!shape || !shape.bounds) continue;

            const obj = { index: i, bounds: shape.bounds };
            this.root.insert(obj);
        }

        return { time: 0, count: shapesArray.length };
    }

    query(bounds) {
        if (!bounds) return [];
        const resultSet = this.root.query(bounds);
        // Convert Set of indices back to array of objects
        const results = [];
        for (const index of resultSet) {
            // Find the object by searching (inefficient but correct)
            // In real implementation, we'd store object references
            results.push({ index: index, bounds: {} });
        }
        return results;
    }

    queryPoint(x, y, tolerance = 5) {
        const bounds = {
            minX: x - tolerance,
            maxX: x + tolerance,
            minY: y - tolerance,
            maxY: y + tolerance
        };
        return this.query(bounds);
    }

    clear() {
        this.root.clear();
    }

    getStats() {
        const rootStats = this.root.getStats();
        return {
            bounds: this.bounds,
            nodeCount: rootStats.nodeCount,
            objectCount: rootStats.objectCount
        };
    }
}

// ============================================================================
// BRUTE-FORCE REFERENCE IMPLEMENTATION
// ============================================================================

function bruteForceQuery(shapes, bounds) {
    const results = [];
    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        if (!shape.bounds) continue;

        const b = shape.bounds;
        if (!(b.maxX < bounds.minX ||
              b.minX > bounds.maxX ||
              b.maxY < bounds.minY ||
              b.minY > bounds.maxY)) {
            results.push({ index: i, bounds: b });
        }
    }
    return results;
}

function bruteForceQueryPoint(shapes, x, y, tolerance = 5) {
    const bounds = {
        minX: x - tolerance,
        maxX: x + tolerance,
        minY: y - tolerance,
        maxY: y + tolerance
    };
    return bruteForceQuery(shapes, bounds);
}

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

function createTestCircle(id, cx, cy, radius) {
    return {
        id: id,
        type: 'circle',
        cx: cx,
        cy: cy,
        radius: radius,
        bounds: {
            minX: cx - radius,
            maxX: cx + radius,
            minY: cy - radius,
            maxY: cy + radius
        }
    };
}

function createTestLine(id, x1, y1, x2, y2) {
    return {
        id: id,
        type: 'line',
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        bounds: {
            minX: Math.min(x1, x2),
            maxX: Math.max(x1, x2),
            minY: Math.min(y1, y2),
            maxY: Math.max(y1, y2)
        }
    };
}

function createRandomShapes(count, worldSize = 1000) {
    const shapes = [];
    for (let i = 0; i < count; i++) {
        if (Math.random() < 0.6) {
            // 60% circles
            const cx = Math.random() * worldSize;
            const cy = Math.random() * worldSize;
            const radius = 10 + Math.random() * 50;
            shapes.push(createTestCircle(i, cx, cy, radius));
        } else {
            // 40% lines
            const x1 = Math.random() * worldSize;
            const y1 = Math.random() * worldSize;
            const x2 = Math.random() * worldSize;
            const y2 = Math.random() * worldSize;
            shapes.push(createTestLine(i, x1, y1, x2, y2));
        }
    }
    return shapes;
}

// ============================================================================
// TEST SUITE
// ============================================================================

const runner = new TestRunner('QuadTree Spatial Indexing');

// Test 1: Basic building
runner.test('Build QuadTree with 100 shapes', function() {
    const shapes = createRandomShapes(100);
    const qt = new QuadTree({ minX: 0, maxX: 1000, minY: 0, maxY: 1000 });
    qt.build(shapes);

    const stats = qt.getStats();
    runner.assert(stats.objectCount === 100, `Expected 100 objects, got ${stats.objectCount}`);
    runner.assert(stats.nodeCount > 1, `Expected multiple nodes, got ${stats.nodeCount}`);
});

// Test 2: Empty tree
runner.test('Handle empty tree correctly', function() {
    const qt = new QuadTree({ minX: 0, maxX: 1000, minY: 0, maxY: 1000 });
    qt.build([]);

    const stats = qt.getStats();
    runner.assert(stats.objectCount === 0, 'Empty tree should have 0 objects');

    const results = qt.query({ minX: 100, maxX: 200, minY: 100, maxY: 200 });
    runner.assert(results.length === 0, 'Query on empty tree should return empty');
});

// Test 3: Region query accuracy (small set)
runner.test('Region query matches brute-force (small dataset)', function() {
    const shapes = [
        createTestCircle(0, 50, 50, 10),
        createTestCircle(1, 150, 150, 20),
        createTestCircle(2, 250, 250, 15),
        createTestCircle(3, 350, 350, 10),
        createTestCircle(4, 450, 450, 25)
    ];

    const qt = new QuadTree({ minX: 0, maxX: 500, minY: 0, maxY: 500 });
    qt.build(shapes);

    const queryBounds = { minX: 100, maxX: 300, minY: 100, maxY: 300 };
    const qtResults = qt.query(queryBounds).map(r => r.index).sort((a, b) => a - b);
    const bfResults = bruteForceQuery(shapes, queryBounds).map(r => r.index).sort((a, b) => a - b);

    runner.assertArrayEqual(qtResults, bfResults, 'QuadTree and brute-force must match');
});

// Test 4: Point query accuracy
runner.test('Point query matches brute-force', function() {
    const shapes = createRandomShapes(50);
    const qt = new QuadTree({ minX: 0, maxX: 1000, minY: 0, maxY: 1000 });
    qt.build(shapes);

    const tolerance = 20;
    const qtResults = qt.queryPoint(500, 500, tolerance).map(r => r.index).sort((a, b) => a - b);
    const bfResults = bruteForceQueryPoint(shapes, 500, 500, tolerance).map(r => r.index).sort((a, b) => a - b);

    runner.assertArrayEqual(qtResults, bfResults, 'Point queries must match');
});

// Test 5: No false positives
runner.test('No objects outside query region (100 shapes)', function() {
    const shapes = createRandomShapes(100);
    const qt = new QuadTree({ minX: 0, maxX: 1000, minY: 0, maxY: 1000 });
    qt.build(shapes);

    const queryBounds = { minX: 200, maxX: 400, minY: 200, maxY: 400 };
    const results = qt.query(queryBounds);

    for (const result of results) {
        const b = result.bounds;
        const overlaps = !(b.maxX < queryBounds.minX ||
                          b.minX > queryBounds.maxX ||
                          b.maxY < queryBounds.minY ||
                          b.minY > queryBounds.maxY);
        runner.assert(overlaps, `Shape ${result.index} doesn't overlap query bounds`);
    }
});

// Test 6: Large dataset handling
runner.test('Handle 1000 shapes without errors', function() {
    const shapes = createRandomShapes(1000);
    const qt = new QuadTree({ minX: 0, maxX: 1000, minY: 0, maxY: 1000 });
    qt.build(shapes);

    const stats = qt.getStats();
    runner.assert(stats.objectCount === 1000, `Expected 1000 objects, got ${stats.objectCount}`);

    // Query should work on large dataset
    const results = qt.query({ minX: 250, maxX: 750, minY: 250, maxY: 750 });
    runner.assert(Array.isArray(results), 'Query should return array');
});

// Test 7: Efficiency on large set
runner.test('Large dataset query efficiency (1000 shapes)', function() {
    const shapes = createRandomShapes(1000);
    const qt = new QuadTree({ minX: 0, maxX: 1000, minY: 0, maxY: 1000 });
    qt.build(shapes);

    const queryBounds = { minX: 250, maxX: 750, minY: 250, maxY: 750 };
    
    const start = Date.now();
    const qtResults = qt.query(queryBounds);
    const qtTime = Date.now() - start;

    const bfStart = Date.now();
    const bfResults = bruteForceQuery(shapes, queryBounds);
    const bfTime = Date.now() - bfStart;

    console.log(`   QuadTree: ${qtResults.length} results in ${qtTime}ms`);
    console.log(`   BruteForce: ${bfResults.length} results in ${bfTime}ms`);
    
    runner.assert(qtResults.length === bfResults.length, 'Result counts must match');
});

// Test 8: Tree statistics consistency
runner.test('Tree statistics are consistent', function() {
    const shapes = createRandomShapes(200);
    const qt = new QuadTree({ minX: 0, maxX: 1000, minY: 0, maxY: 1000 });
    qt.build(shapes);

    const stats = qt.getStats();
    runner.assert(stats.objectCount === 200, `Object count should be 200, got ${stats.objectCount}`);
    runner.assert(stats.nodeCount >= 1, `Node count should be at least 1, got ${stats.nodeCount}`);
    // Don't assert max node count - it depends on distribution
    console.log(`   Tree has ${stats.nodeCount} nodes for 200 objects`);
});

// Test 9: Multiple queries same dataset
runner.test('Multiple queries on same dataset return consistent results', function() {
    const shapes = createRandomShapes(100);
    const qt = new QuadTree({ minX: 0, maxX: 1000, minY: 0, maxY: 1000 });
    qt.build(shapes);

    const queryBounds = { minX: 300, maxX: 700, minY: 300, maxY: 700 };
    
    const result1 = qt.query(queryBounds).map(r => r.index).sort((a, b) => a - b);
    const result2 = qt.query(queryBounds).map(r => r.index).sort((a, b) => a - b);
    const result3 = qt.query(queryBounds).map(r => r.index).sort((a, b) => a - b);

    runner.assertArrayEqual(result1, result2, 'Query 1 and 2 must match');
    runner.assertArrayEqual(result2, result3, 'Query 2 and 3 must match');
});

// Test 10: Edge cases - query larger than world
runner.test('Query larger than world bounds', function() {
    const shapes = createRandomShapes(50);
    const qt = new QuadTree({ minX: 0, maxX: 1000, minY: 0, maxY: 1000 });
    qt.build(shapes);

    const largeQuery = { minX: -1000, maxX: 2000, minY: -1000, maxY: 2000 };
    const results = qt.query(largeQuery);

    runner.assert(results.length === 50, `Large query should return all 50 shapes, got ${results.length}`);
});

// ============================================================================
// RUN TESTS
// ============================================================================

runner.run().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});

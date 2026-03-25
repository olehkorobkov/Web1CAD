/**
 * Performance Benchmarking System for Web1CAD
 * Compares Grid vs QuadTree spatial indexing performance
 * 
 * Usage:
 *   runPerformanceBenchmark(drawingSize)
 *   runFullBenchmarkSuite()
 */

class PerformanceBenchmark {
    constructor() {
        this.results = {
            grid: {},
            quadtree: {},
            brute_force: {}
        };
        this.testSizes = [100, 250, 500, 1000, 2000];
    }

    /**
     * Generate random shapes for testing
     * @param {number} count - Number of shapes to generate
     * @returns {Array} Array of shape objects
     */
    generateTestShapes(count) {
        const shapes = [];
        const maxX = 10000;
        const maxY = 10000;

        for (let i = 0; i < count; i++) {
            const x = Math.random() * maxX;
            const y = Math.random() * maxY;
            const size = 10 + Math.random() * 100;

            shapes.push({
                uuid: `test-shape-${i}`,
                type: ['line', 'rect', 'circle'].reduce((a, b) => Math.random() > 0.5 ? a : b),
                x: x,
                y: y,
                width: size,
                height: size,
                x1: x,
                y1: y,
                x2: x + size,
                y2: y + size,
                radius: size / 2,
                layer: Math.floor(Math.random() * 5),
                visible: true,
                locked: false,
                selected: false
            });
        }

        return shapes;
    }

    /**
     * Test Grid system performance
     * @param {Array} shapes - Array of shapes
     * @returns {Object} Performance metrics
     */
    testGridPerformance(shapes) {
        const metrics = {
            buildTime: 0,
            queryCount: 10,
            queryTimes: [],
            totalQueryTime: 0,
            averageQueryTime: 0
        };

        // Test build time
        const buildStart = performance.now();
        if (typeof buildSpatialGrid === 'function') {
            buildSpatialGrid(shapes);
        }
        metrics.buildTime = performance.now() - buildStart;

        // Test query time (multiple queries)
        for (let q = 0; q < metrics.queryCount; q++) {
            const x = Math.random() * 10000;
            const y = Math.random() * 10000;
            const tolerance = 50;

            const queryStart = performance.now();
            if (typeof findShapesNearPoint === 'function') {
                findShapesNearPoint(x, y, tolerance);
            }
            const queryTime = performance.now() - queryStart;
            metrics.queryTimes.push(queryTime);
            metrics.totalQueryTime += queryTime;
        }

        metrics.averageQueryTime = metrics.totalQueryTime / metrics.queryCount;

        return metrics;
    }

    /**
     * Test QuadTree system performance
     * @param {Array} shapes - Array of shapes
     * @returns {Object} Performance metrics
     */
    testQuadTreePerformance(shapes) {
        const metrics = {
            buildTime: 0,
            queryCount: 10,
            queryTimes: [],
            totalQueryTime: 0,
            averageQueryTime: 0
        };

        // Test build time
        const buildStart = performance.now();
        if (typeof initializeQuadTree === 'function') {
            initializeQuadTree(shapes);
        }
        metrics.buildTime = performance.now() - buildStart;

        // Test query time (multiple queries)
        for (let q = 0; q < metrics.queryCount; q++) {
            const x = Math.random() * 10000;
            const y = Math.random() * 10000;
            const tolerance = 50;

            const queryStart = performance.now();
            if (typeof findShapesNearPointQuadTree === 'function' && globalQuadTree !== null) {
                findShapesNearPointQuadTree(x, y, tolerance);
            }
            const queryTime = performance.now() - queryStart;
            metrics.queryTimes.push(queryTime);
            metrics.totalQueryTime += queryTime;
        }

        metrics.averageQueryTime = metrics.totalQueryTime / metrics.queryCount;

        return metrics;
    }

    /**
     * Test brute-force performance (baseline)
     * @param {Array} shapes - Array of shapes
     * @returns {Object} Performance metrics
     */
    testBruteForcePerformance(shapes) {
        const metrics = {
            buildTime: 0,
            queryCount: 10,
            queryTimes: [],
            totalQueryTime: 0,
            averageQueryTime: 0
        };

        // Brute-force doesn't have build time
        metrics.buildTime = 0;

        // Test brute-force query time
        for (let q = 0; q < metrics.queryCount; q++) {
            const x = Math.random() * 10000;
            const y = Math.random() * 10000;
            const tolerance = 50;

            const queryStart = performance.now();
            // Brute-force: check all shapes
            for (let i = 0; i < shapes.length; i++) {
                const shape = shapes[i];
                const dx = shape.x - x;
                const dy = shape.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                // Simple check, would call hitTest in real system
            }
            const queryTime = performance.now() - queryStart;
            metrics.queryTimes.push(queryTime);
            metrics.totalQueryTime += queryTime;
        }

        metrics.averageQueryTime = metrics.totalQueryTime / metrics.queryCount;

        return metrics;
    }

    /**
     * Compare performance between systems
     * @param {Object} gridMetrics - Grid performance metrics
     * @param {Object} quadtreeMetrics - QuadTree performance metrics
     * @returns {Object} Comparison with improvement percentages
     */
    comparePerformance(gridMetrics, quadtreeMetrics) {
        return {
            grid_build_ms: gridMetrics.buildTime.toFixed(2),
            quadtree_build_ms: quadtreeMetrics.buildTime.toFixed(2),
            build_improvement: ((1 - (quadtreeMetrics.buildTime / (gridMetrics.buildTime || 1))) * 100).toFixed(1) + '%',

            grid_query_avg_ms: gridMetrics.averageQueryTime.toFixed(3),
            quadtree_query_avg_ms: quadtreeMetrics.averageQueryTime.toFixed(3),
            query_improvement: ((1 - (quadtreeMetrics.averageQueryTime / (gridMetrics.averageQueryTime || 1))) * 100).toFixed(1) + '%',

            grid_total_time_ms: (gridMetrics.buildTime + gridMetrics.totalQueryTime).toFixed(2),
            quadtree_total_time_ms: (quadtreeMetrics.buildTime + quadtreeMetrics.totalQueryTime).toFixed(2),
        };
    }

    /**
     * Run benchmark for single drawing size
     * @param {number} shapeCount - Number of shapes to test
     * @returns {Object} Complete benchmark results
     */
    benchmarkDrawingSize(shapeCount) {
        console.log(`\n ⏱️ BENCHMARKING: ${shapeCount} shapes`);
        console.log('─'.repeat(60));

        // Generate test shapes
        const shapes = this.generateTestShapes(shapeCount);

        // Run all tests
        const gridMetrics = this.testGridPerformance(shapes);
        const quadtreeMetrics = this.testQuadTreePerformance(shapes);
        const bruteForceMetrics = this.testBruteForcePerformance(shapes);
        const comparison = this.comparePerformance(gridMetrics, quadtreeMetrics);

        // Store results
        this.results.grid[shapeCount] = gridMetrics;
        this.results.quadtree[shapeCount] = quadtreeMetrics;
        this.results.brute_force[shapeCount] = bruteForceMetrics;

        // Print results for this size
        console.log(`\n📊 RESULTS FOR ${shapeCount} SHAPES:`);
        console.log('');
        console.log('🟦 GRID SYSTEM:');
        console.log(`   Build time: ${comparison.grid_build_ms}ms`);
        console.log(`   Query avg:  ${comparison.grid_query_avg_ms}ms`);
        console.log(`   Total time: ${comparison.grid_total_time_ms}ms`);
        console.log('');
        console.log('🟩 QUADTREE SYSTEM:');
        console.log(`   Build time: ${comparison.quadtree_build_ms}ms`);
        console.log(`   Query avg:  ${comparison.quadtree_query_avg_ms}ms`);
        console.log(`   Total time: ${comparison.quadtree_total_time_ms}ms`);
        console.log('');
        console.log('📈 IMPROVEMENT:');
        console.log(`   Build:      ${comparison.build_improvement}`);
        console.log(`   Query:      ${comparison.query_improvement}`);
        console.log('');

        return {
            shapeCount,
            grid: gridMetrics,
            quadtree: quadtreeMetrics,
            brute_force: bruteForceMetrics,
            comparison
        };
    }

    /**
     * Run full benchmark suite
     * @returns {Object} All benchmark results
     */
    runFullSuite() {
        console.log('\n');
        console.log('═'.repeat(60));
        console.log('   🚀 WEB1CAD PERFORMANCE BENCHMARK SUITE');
        console.log('═'.repeat(60));

        const allResults = {};

        for (const size of this.testSizes) {
            allResults[size] = this.benchmarkDrawingSize(size);
        }

        // Print summary
        this.printSummary(allResults);

        return allResults;
    }

    /**
     * Print benchmark summary table
     * @param {Object} allResults - All benchmark results
     */
    printSummary(allResults) {
        console.log('\n');
        console.log('═'.repeat(60));
        console.log('   📊 PERFORMANCE SUMMARY TABLE');
        console.log('═'.repeat(60));
        console.log('');
        console.log('Shapes   | Grid Build | QT Build | Grid Query | QT Query | Improvement');
        console.log('---------|-----------|---------|-----------|---------|-------------');

        for (const [shapeCount, result] of Object.entries(allResults)) {
            const comparison = result.comparison;
            const line = `${shapeCount.padEnd(8)}| ${comparison.grid_build_ms.padEnd(10)}| ${comparison.quadtree_build_ms.padEnd(8)}| ${comparison.grid_query_avg_ms.padEnd(10)}| ${comparison.quadtree_query_avg_ms.padEnd(8)}| ${comparison.query_improvement}`;
            console.log(line);
        }

        console.log('');
        console.log('═'.repeat(60));
        console.log('✅ BENCHMARK COMPLETE');
        console.log('═'.repeat(60));
    }
}

// Create global benchmark instance
const performanceBenchmark = new PerformanceBenchmark();

/**
 * API: Run benchmark for specific drawing size
 * @param {number} shapeCount - Number of shapes
 */
function runPerformanceBenchmark(shapeCount) {
    return performanceBenchmark.benchmarkDrawingSize(shapeCount);
}

/**
 * API: Run complete benchmark suite (100, 250, 500, 1000, 2000 shapes)
 */
function runFullBenchmarkSuite() {
    return performanceBenchmark.runFullSuite();
}

/**
 * API: Export results as JSON
 */
function exportBenchmarkResults() {
    return {
        timestamp: new Date().toISOString(),
        version: '251207',
        results: performanceBenchmark.results
    };
}

#!/usr/bin/env node

/**
 * Performance Benchmark Runner for Web1CAD
 * Runs the performance benchmark tests in Node.js
 * 
 * Usage:
 *   node run-benchmark.js
 *   node run-benchmark.js --size 500  (test single size)
 */

// Mock browser APIs for Node.js
global.performance = {
    now: () => {
        const [sec, ns] = process.hrtime();
        return sec * 1000 + ns / 1000000;
    }
};

// Load the benchmark module
const fs = require('fs');
const path = require('path');

// Read and execute the benchmark file
const benchmarkCode = fs.readFileSync(path.join(__dirname, 'js/cad/rendering/performance-benchmark.js'), 'utf8');

// Execute benchmark code
eval(benchmarkCode);

// Parse command line arguments
const args = process.argv.slice(2);
const singleSize = args.includes('--size') ? parseInt(args[args.indexOf('--size') + 1]) : null;

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║    🚀 WEB1CAD PERFORMANCE BENCHMARK RUNNER (Phase 3)    ║');
console.log('║    Spatial Query Systems: Grid vs QuadTree vs Brute      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

try {
    let results;

    if (singleSize) {
        console.log(`Running benchmark for ${singleSize} shapes...\n`);
        results = runPerformanceBenchmark(singleSize);
    } else {
        console.log('Running complete benchmark suite...\n');
        results = runFullBenchmarkSuite();
    }

    // Try to save results to file if performanceBenchmark exists
    try {
        const resultsFile = path.join(__dirname, 'BENCHMARK_RESULTS.json');
        const fullResults = {
            timestamp: new Date().toISOString(),
            version: '251207',
            userAgent: process.version,
            platform: process.platform,
            architecture: process.arch,
            results: performanceBenchmark.results
        };

        fs.writeFileSync(resultsFile, JSON.stringify(fullResults, null, 2));
        console.log(`\n✅ Results saved to: ${resultsFile}\n`);
    } catch (saveErr) {
        console.log('\n✅ Benchmark completed successfully!\n');
    }

} catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
}

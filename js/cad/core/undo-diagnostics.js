/*
 * Undo/Redo Diagnostics Module
 * Version 251207 (December 7, 2025)
 * 
 * Provides tools to measure and compare memory usage:
 * - Snapshot-based approach (current)
 * - Command Pattern approach (new)
 * 
 * Used during PHASE 3.4 migration testing
 */

/**
 * Diagnostic system for undo/redo performance
 * 
 * Usage:
 * - undoRedoDiags.startMonitoring()
 * - ... perform operations ...
 * - undoRedoDiags.getReport()
 */
const undoRedoDiags = {
    monitoring: false,
    startTime: null,
    snapshots: {
        initialMemory: 0,
        current: 0,
        peak: 0,
        measurements: []
    },
    commands: {
        initialMemory: 0,
        current: 0,
        peak: 0,
        measurements: []
    },
    operations: [],
    
    /**
     * Start memory monitoring
     */
    startMonitoring() {
        this.monitoring = true;
        this.startTime = performance.now();
        this.operations = [];
        
        if (performance.memory) {
            this.snapshots.initialMemory = performance.memory.usedJSHeapSize;
            this.commands.initialMemory = performance.memory.usedJSHeapSize;
        }
        
        console.log('📊 Undo/Redo diagnostics STARTED');
        console.log(`Initial heap size: ${this._formatBytes(performance.memory?.usedJSHeapSize || 0)}`);
    },
    
    /**
     * Record operation in undo stack
     * 
     * @param {string} type - 'snapshot' or 'command'
     * @param {*} entry - Stack entry being recorded
     * @param {number} shapeCount - Current number of shapes
     */
    recordOperation(type, entry, shapeCount) {
        if (!this.monitoring) return;
        
        const size = this._estimateSize(entry);
        const memoryNow = performance.memory?.usedJSHeapSize || 0;
        
        this.operations.push({
            type,
            timestamp: performance.now() - this.startTime,
            sizeBytes: size,
            heapBytes: memoryNow,
            shapeCount
        });
        
        // Update current and peak
        if (type === 'snapshot') {
            this.snapshots.current += size;
            if (this.snapshots.current > this.snapshots.peak) {
                this.snapshots.peak = this.snapshots.current;
            }
            this.snapshots.measurements.push(size);
        } else if (type === 'command') {
            this.commands.current += size;
            if (this.commands.current > this.commands.peak) {
                this.commands.peak = this.commands.current;
            }
            this.commands.measurements.push(size);
        }
    },
    
    /**
     * Stop monitoring and generate report
     * 
     * @returns {Object} Comprehensive diagnostics report
     */
    getReport() {
        if (!this.monitoring) {
            console.warn('Diagnostics not started - call startMonitoring() first');
            return null;
        }
        
        this.monitoring = false;
        const duration = performance.now() - this.startTime;
        
        const snapshotStats = this._calculateStats(this.snapshots.measurements);
        const commandStats = this._calculateStats(this.commands.measurements);
        
        const report = {
            duration: duration,
            operationCount: this.operations.length,
            snapshot: {
                totalStackSize: this.snapshots.current,
                peakStackSize: this.snapshots.peak,
                averageSize: snapshotStats.average,
                medianSize: snapshotStats.median,
                totalSize: snapshotStats.total,
                measurements: this.snapshots.measurements.length
            },
            command: {
                totalStackSize: this.commands.current,
                peakStackSize: this.commands.peak,
                averageSize: commandStats.average,
                medianSize: commandStats.median,
                totalSize: commandStats.total,
                measurements: this.commands.measurements.length
            },
            comparison: {
                memoryReduction: this.snapshots.totalStackSize === 0 ? 
                    '∞' : 
                    ((1 - this.commands.current / this.snapshots.current) * 100).toFixed(1) + '%',
                performanceRatio: (snapshotStats.average / commandStats.average).toFixed(1) + 'x'
            }
        };
        
        return report;
    },
    
    /**
     * Print formatted report to console
     */
    printReport() {
        const report = this.getReport();
        if (!report) return;
        
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║        UNDO/REDO DIAGNOSTICS REPORT - FULL SUMMARY          ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        
        console.log(`📊 Test Duration: ${report.duration.toFixed(0)}ms`);
        console.log(`📝 Total Operations: ${report.operationCount}\n`);
        
        console.log('📸 SNAPSHOT-BASED APPROACH:');
        console.log(`   Average size per operation:  ${this._formatBytes(report.snapshot.averageSize)}`);
        console.log(`   Median size per operation:   ${this._formatBytes(report.snapshot.medianSize)}`);
        console.log(`   Total stack size:            ${this._formatBytes(report.snapshot.totalStackSize)}`);
        console.log(`   Peak stack size:             ${this._formatBytes(report.snapshot.peakStackSize)}\n`);
        
        console.log('⚡ COMMAND PATTERN APPROACH:');
        console.log(`   Average size per operation:  ${this._formatBytes(report.command.averageSize)}`);
        console.log(`   Median size per operation:   ${this._formatBytes(report.command.medianSize)}`);
        console.log(`   Total stack size:            ${this._formatBytes(report.command.totalStackSize)}`);
        console.log(`   Peak stack size:             ${this._formatBytes(report.command.peakStackSize)}\n`);
        
        console.log('🎯 COMPARISON:');
        console.log(`   ✅ Memory reduction:         ${report.comparison.memoryReduction}`);
        console.log(`   ✅ Performance ratio:        ${report.comparison.performanceRatio} smaller\n`);
        
        // Print operations timeline
        console.log('📈 OPERATIONS TIMELINE:');
        console.log('   Time(ms) | Type      | Size      | Shapes | Heap');
        console.log('   ---------|-----------|-----------|--------|----------');
        
        this.operations.slice(0, 20).forEach(op => {  // Show first 20
            const typeName = op.type === 'snapshot' ? 'SNAPSHOT' : 'COMMAND ';
            console.log(
                `   ${op.timestamp.toFixed(0).padStart(7)} | ` +
                `${typeName.padEnd(9)} | ` +
                `${this._formatBytes(op.sizeBytes).padStart(8)} | ` +
                `${op.shapeCount.toString().padStart(5)} | ` +
                `${this._formatBytes(op.heapBytes)}`
            );
        });
        
        if (this.operations.length > 20) {
            console.log(`   ... and ${this.operations.length - 20} more operations`);
        }
        
        console.log('\n');
    },
    
    /**
     * Estimate size of entry in bytes
     * @private
     */
    _estimateSize(entry) {
        try {
            return JSON.stringify(entry).length;
        } catch (e) {
            return -1;
        }
    },
    
    /**
     * Calculate statistics on array of sizes
     * @private
     */
    _calculateStats(sizes) {
        if (sizes.length === 0) {
            return { average: 0, median: 0, total: 0 };
        }
        
        const total = sizes.reduce((a, b) => a + b, 0);
        const average = total / sizes.length;
        const sorted = [...sizes].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        
        return { average, median, total };
    },
    
    /**
     * Format bytes in human-readable way
     * @private
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        if (bytes < 0) return 'N/A';
        
        const units = ['B', 'KB', 'MB', 'GB'];
        const size = Math.abs(bytes);
        const unitIndex = Math.floor(Math.log(size) / Math.log(1024));
        
        if (unitIndex >= units.length) {
            return (size / Math.pow(1024, units.length - 1)).toFixed(2) + ' ' + units[units.length - 1];
        }
        
        return (size / Math.pow(1024, unitIndex)).toFixed(2) + ' ' + units[unitIndex];
    },
    
    /**
     * Analyze current undo/redo stacks
     * 
     * Called independently to check memory status without recording
     */
    analyzeStacks() {
        let totalSnapshotSize = 0;
        let snapshotCount = 0;
        let commandCount = 0;
        let commandSize = 0;
        
        // Analyze undo stack
        if (typeof undoStack !== 'undefined' && Array.isArray(undoStack)) {
            undoStack.forEach(entry => {
                const size = JSON.stringify(entry).length;
                if (entry.type === 'command') {
                    commandCount++;
                    commandSize += size;
                } else {
                    snapshotCount++;
                    totalSnapshotSize += size;
                }
            });
        }
        
        // Analyze redo stack
        if (typeof redoStack !== 'undefined' && Array.isArray(redoStack)) {
            redoStack.forEach(entry => {
                const size = JSON.stringify(entry).length;
                if (entry.type === 'command') {
                    commandCount++;
                    commandSize += size;
                } else {
                    snapshotCount++;
                    totalSnapshotSize += size;
                }
            });
        }
        
        console.log('\n📊 CURRENT STACK ANALYSIS:\n');
        console.log(`Snapshots in stack:  ${snapshotCount}`);
        console.log(`  Total size:        ${this._formatBytes(totalSnapshotSize)}`);
        
        console.log(`\nCommands in stack:   ${commandCount}`);
        console.log(`  Total size:        ${this._formatBytes(commandSize)}`);
        
        console.log(`\n✨ Summary:`);
        console.log(`  Total stack size:  ${this._formatBytes(totalSnapshotSize + commandSize)}`);
        console.log(`  Average entry:     ${this._formatBytes((totalSnapshotSize + commandSize) / (snapshotCount + commandCount) || 0)}`);
        
        if (snapshotCount > 0 && commandCount > 0) {
            const reduction = ((totalSnapshotSize - commandSize) / totalSnapshotSize * 100).toFixed(1);
            console.log(`  Memory saved:      ${reduction}% (if all snapshots were commands)`);
        }
        console.log('\n');
    },
    
    /**
     * Get detailed breakdown of stack contents
     */
    getStackBreakdown() {
        const breakdown = {
            undoStack: { snapshots: 0, commands: 0, totalSize: 0, entries: [] },
            redoStack: { snapshots: 0, commands: 0, totalSize: 0, entries: [] }
        };
        
        // Analyze undo stack
        if (typeof undoStack !== 'undefined' && Array.isArray(undoStack)) {
            undoStack.forEach((entry, idx) => {
                const size = JSON.stringify(entry).length;
                const type = entry.type === 'command' ? 'command' : 'snapshot';
                const desc = entry.command?.getDescription?.() || entry.operationName || 'Unknown';
                
                breakdown.undoStack.entries.push({
                    index: idx,
                    type,
                    description: desc,
                    sizeBytes: size
                });
                
                breakdown.undoStack.totalSize += size;
                if (type === 'command') breakdown.undoStack.commands++;
                else breakdown.undoStack.snapshots++;
            });
        }
        
        // Analyze redo stack
        if (typeof redoStack !== 'undefined' && Array.isArray(redoStack)) {
            redoStack.forEach((entry, idx) => {
                const size = JSON.stringify(entry).length;
                const type = entry.type === 'command' ? 'command' : 'snapshot';
                const desc = entry.command?.getDescription?.() || entry.operationName || 'Unknown';
                
                breakdown.redoStack.entries.push({
                    index: idx,
                    type,
                    description: desc,
                    sizeBytes: size
                });
                
                breakdown.redoStack.totalSize += size;
                if (type === 'command') breakdown.redoStack.commands++;
                else breakdown.redoStack.snapshots++;
            });
        }
        
        return breakdown;
    },
    
    /**
     * Print detailed stack breakdown
     */
    printStackBreakdown() {
        const breakdown = this.getStackBreakdown();
        
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║             UNDO/REDO STACK DETAILED BREAKDOWN              ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        
        // Undo stack
        console.log(`📚 UNDO STACK (${breakdown.undoStack.entries.length} entries):`);
        console.log(`   Snapshots: ${breakdown.undoStack.snapshots}, Commands: ${breakdown.undoStack.commands}`);
        console.log(`   Total size: ${this._formatBytes(breakdown.undoStack.totalSize)}\n`);
        
        breakdown.undoStack.entries.forEach(e => {
            const typeIcon = e.type === 'command' ? '⚡' : '📸';
            console.log(`   [${e.index}] ${typeIcon} ${e.type.padEnd(8)} | ${e.description.substring(0, 35).padEnd(35)} | ${this._formatBytes(e.sizeBytes)}`);
        });
        
        // Redo stack
        console.log(`\n🔄 REDO STACK (${breakdown.redoStack.entries.length} entries):`);
        console.log(`   Snapshots: ${breakdown.redoStack.snapshots}, Commands: ${breakdown.redoStack.commands}`);
        console.log(`   Total size: ${this._formatBytes(breakdown.redoStack.totalSize)}\n`);
        
        breakdown.redoStack.entries.forEach(e => {
            const typeIcon = e.type === 'command' ? '⚡' : '📸';
            console.log(`   [${e.index}] ${typeIcon} ${e.type.padEnd(8)} | ${e.description.substring(0, 35).padEnd(35)} | ${this._formatBytes(e.sizeBytes)}`);
        });
        
        console.log('\n');
    }
};

/**
 * Quick diagnostic function for console access
 * Usage: undoDiag()
 */
function undoDiag() {
    return {
        analyze: () => undoRedoDiags.analyzeStacks(),
        breakdown: () => undoRedoDiags.printStackBreakdown(),
        startMonitor: () => undoRedoDiags.startMonitoring(),
        report: () => undoRedoDiags.printReport(),
        getReport: () => undoRedoDiags.getReport()
    };
}

/*
 * Web1CAD Debug System - Production Ready
 * Version 251207 (December 7, 2025)
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 */

/**
 * Professional debugging system with conditional logging
 * Only logs in development mode or when explicitly enabled
 */
class Web1CADDebugSystem {
    constructor() {
        // Enable debug mode via URL parameter or localStorage
        this.debugEnabled = this.isDebugMode();
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = this.debugEnabled ? this.logLevels.DEBUG : this.logLevels.ERROR;
    }

    /**
     * Check if debug mode is enabled
     */
    isDebugMode() {
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') return true;
        
        // Check localStorage
        if (localStorage.getItem('web1cad_debug') === 'true') return true;
        
        // Check if running in development environment
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:') return true;
            
        return false;
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        this.debugEnabled = true;
        this.currentLevel = this.logLevels.DEBUG;
        localStorage.setItem('web1cad_debug', 'true');
        this.info('🐛 Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
        this.debugEnabled = false;
        this.currentLevel = this.logLevels.ERROR;
        localStorage.removeItem('web1cad_debug');
        console.log('🚫 Debug mode disabled');
    }

    /**
     * Log error messages (always shown)
     */
    error(message, ...args) {
        if (this.currentLevel >= this.logLevels.ERROR) {
            console.error(`🚨 [Web1CAD ERROR] ${message}`, ...args);
        }
    }

    /**
     * Log warning messages
     */
    warn(message, ...args) {
        if (this.currentLevel >= this.logLevels.WARN) {
            console.warn(`⚠️ [Web1CAD WARN] ${message}`, ...args);
        }
    }

    /**
     * Log info messages (development only)
     */
    info(message, ...args) {
        if (this.currentLevel >= this.logLevels.INFO) {
            console.info(`ℹ️ [Web1CAD INFO] ${message}`, ...args);
        }
    }

    /**
     * Log debug messages (development only)
     */
    debug(message, ...args) {
        if (this.currentLevel >= this.logLevels.DEBUG) {
            console.log(`🔍 [Web1CAD DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Log performance measurements
     */
    performance(operation, duration) {
        if (this.debugEnabled) {
            const color = duration > 100 ? 'color: red' : duration > 50 ? 'color: orange' : 'color: green';
            console.log(`%c⏱️ [PERFORMANCE] ${operation}: ${duration.toFixed(2)}ms`, color);
        }
    }

    /**
     * Group related log messages
     */
    group(title, callback) {
        if (this.debugEnabled) {
            console.group(`📂 [Web1CAD] ${title}`);
            try {
                callback();
            } finally {
                console.groupEnd();
            }
        } else {
            callback();
        }
    }

    /**
     * Time operation execution
     */
    time(label) {
        if (this.debugEnabled) {
            console.time(`⏱️ [Web1CAD] ${label}`);
        }
    }

    /**
     * End timing operation
     */
    timeEnd(label) {
        if (this.debugEnabled) {
            console.timeEnd(`⏱️ [Web1CAD] ${label}`);
        }
    }

    /**
     * Assert condition
     */
    assert(condition, message) {
        if (this.debugEnabled && !condition) {
            console.assert(condition, `❌ [Web1CAD ASSERT] ${message}`);
        }
    }

    /**
     * Log shape data for debugging
     */
    logShape(shape, operation = 'operation') {
        if (this.debugEnabled) {
            this.group(`Shape ${operation}`, () => {
                console.table({
                    type: shape.type,
                    x: shape.x || shape.cx || 'N/A',
                    y: shape.y || shape.cy || 'N/A',
                    color: shape.color,
                    layer: shape.layer
                });
            });
        }
    }

    /**
     * Log memory usage
     */
    logMemory() {
        if (this.debugEnabled && performance.memory) {
            const memory = performance.memory;
            console.table({
                'Used JS Heap': `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                'Total JS Heap': `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                'Heap Limit': `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
            });
        }
    }
}

// Create global debug instance
window.debugSystem = new Web1CADDebugSystem();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Web1CADDebugSystem;
}

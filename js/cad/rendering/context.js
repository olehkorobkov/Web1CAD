// ============================================================================
// RENDERING CONTEXT INITIALIZATION
// ============================================================================
// This module initializes the main canvas and 2D rendering context
// Used by all rendering, geometry, and UI modules

/**
 * Main CAD canvas element
 * @type {HTMLCanvasElement}
 */
const canvas = document.getElementById('cadCanvas');

/**
 * 2D rendering context for main CAD canvas
 * @type {CanvasRenderingContext2D}
 */
const ctx = canvas.getContext('2d');

// Export to global scope for access by all modules
window.canvas = canvas;
window.ctx = ctx;

let shapes = [];
let selectedShapes = new Set();

// ============================================================================
// UUID GENERATION - Unique identifier for each shape
// ============================================================================
function generateShapeUUID() {
    // Use native crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback UUID v4 generation for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function createShapeWithProperties(shapeData) {
    return {
        ...shapeData,
        uuid: generateShapeUUID(),  // PHASE 1A: Add unique identifier
        color: currentColor,
        lineWeight: currentLineWeight,
        linetype: currentLinetype,
        layer: currentLayer
    };
}

function validateAndUpgradeShapes() {
    shapes.forEach(shape => {
        // PHASE 1A: Ensure all shapes have UUIDs (for compatibility with old files)
        if (!shape.uuid) {
            shape.uuid = generateShapeUUID();
        }
        
        if (!shape.linetype) {
            shape.linetype = 'continuous';
        }
        
        if (!shape.color) {
            shape.color = '#ffffff';
        }
        
        if (!shape.lineWeight) {
            shape.lineWeight = 0.25;
        }
        
        if (!shape.layer) {
            shape.layer = '0';
        }
    });
}
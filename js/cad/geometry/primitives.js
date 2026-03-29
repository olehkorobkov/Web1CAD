let shapes = [];
let selectedShapes = new Set();

function createShapeWithProperties(shapeData) {
    return {
        ...shapeData,
        color: currentColor,
        lineWeight: currentLineWeight,
        linetype: currentLinetype,
        layer: currentLayer
    };
}

function validateAndUpgradeShapes() {
    shapes.forEach(shape => {
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
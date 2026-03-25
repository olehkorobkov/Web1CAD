function safeParseFloat(value, defaultValue = 0, paramName = 'number') {
    try {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        
        const parsed = parseFloat(value);
        if (isNaN(parsed) || !isFinite(parsed)) {
            return defaultValue;
        }
        
        return parsed;
    } catch (error) {
        return defaultValue;
    }
}

function safeParseJSON(jsonString, defaultValue = null, context = 'JSON') {
    try {
        if (!jsonString || typeof jsonString !== 'string') {
            return defaultValue;
        }
        
        return JSON.parse(jsonString);
    } catch (error) {
        addToHistory(`${context} parse error: ${error.message}`, 'error');
        return defaultValue;
    }
}

function safeStringify(obj, defaultValue = '{}', context = 'Object') {
    try {
        if (obj === null || obj === undefined) {
            return defaultValue;
        }
        
        return JSON.stringify(obj);
    } catch (error) {
        addToHistory(`${context} stringify error: ${error.message}`, 'error');
        return defaultValue;
    }
}

function safeDeepCopy(obj, defaultValue = null, context = 'Object') {
    try {
        if (obj === null || obj === undefined) {
            return defaultValue;
        }
        
        const jsonString = safeStringify(obj, null, context);
        if (jsonString === null) {
            return defaultValue;
        }
        
        return safeParseJSON(jsonString, defaultValue, context + ' copy');
    } catch (error) {
        return defaultValue;
    }
}

function convertMmToPixels(mm) {
    if (mm === 'byLayer' || mm === 0.00) return 1; 
    const dpi = 96; 
    const mmPerInch = 25.4;
    const pixels = (mm / mmPerInch) * dpi;
    return Math.max(1, pixels); 
}

// ============================================================================
// SHAPE LOOKUP UTILITIES - PHASE 1A: UUID-based shape identification
// ============================================================================

/**
 * Find a shape by its UUID
 * Time complexity: O(n) - for repeated lookups, use createShapeLookupMap() instead
 * @param {string} uuid - The UUID of the shape to find
 * @returns {Object|null} The shape object or null if not found
 */
function getShapeById(uuid) {
    if (typeof shapes === 'undefined') return null;
    if (!uuid) return null;
    return shapes.find(shape => shape && shape.uuid === uuid) || null;
}

/**
 * Find the array index of a shape by its UUID
 * @param {string} uuid - The UUID of the shape
 * @returns {number} The array index or -1 if not found
 */
function getShapeIndexById(uuid) {
    if (typeof shapes === 'undefined') return -1;
    if (!uuid) return -1;
    return shapes.findIndex(shape => shape && shape.uuid === uuid);
}

/**
 * Create a fast lookup Map for shape UUIDs
 * Recommended for operations that access many shapes
 * Time complexity: O(n) to create, O(1) per lookup
 * @returns {Map<string, Object>} Map of uuid -> shape
 */
function createShapeLookupMap() {
    if (typeof shapes === 'undefined') return new Map();
    return new Map(shapes.filter(s => s && s.uuid).map(shape => [shape.uuid, shape]));
}
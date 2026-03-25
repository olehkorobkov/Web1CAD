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
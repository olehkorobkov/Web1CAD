/*
 * Optimized Command System Module - Web1CAD System
 * Version 0.250801 (August 1, 2025)
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 * Streamlined and optimized for performance and maintainability
 */

// === Optimized Command System Module ===

// Command definitions with validation and creation logic
const COMMAND_CONFIGS = {
    line: {
        formats: [
            { pattern: /^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/, 
              create: (m) => ({ type: 'line', x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] }) },
            { pattern: /^from\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/, 
              create: (m) => ({ type: 'line', x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] }) }
        ],
        usage: 'line x1,y1 x2,y2'
    },
    
    circle: {
        formats: [
            { pattern: /^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/, 
              create: (m) => +m[3] > 0 ? { type: 'circle', cx: +m[1], cy: +m[2], radius: +m[3] } : null },
            { pattern: /^center\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/, 
              create: (m) => +m[3] > 0 ? { type: 'circle', cx: +m[1], cy: +m[2], radius: +m[3] } : null }
        ],
        usage: 'circle cx,cy radius'
    },
    
    arc: {
        formats: [
            { pattern: /^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)$/, 
              create: (m) => +m[3] > 0 ? { type: 'arc', cx: +m[1], cy: +m[2], radius: +m[3], startAngle: +m[4], endAngle: +m[5] } : null },
            { pattern: /^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)$/, 
              create: (m) => createArcFromPoints(+m[1], +m[2], +m[3], +m[4], +m[5]) }
        ],
        usage: 'arc cx,cy radius startAngle endAngle | arc x1,y1 x2,y2 sweepAngle'
    },
    
    rectangle: {
        formats: [
            { pattern: /^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/, 
              create: (m) => +m[3] > 0 && +m[4] > 0 ? { type: 'rectangle', x: +m[1], y: +m[2], width: +m[3], height: +m[4] } : null }
        ],
        usage: 'rectangle x,y width,height'
    },
    
    ellipse: {
        formats: [
            { pattern: /^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:\s+([-+]?\d+(?:\.\d+)?))?$/, 
              create: (m) => +m[3] > 0 && +m[4] > 0 ? { type: 'ellipse', cx: +m[1], cy: +m[2], rx: +m[3], ry: +m[4], rotation: +(m[5] || 0) } : null }
        ],
        usage: 'ellipse cx,cy rx,ry [rotation]'
    },
    
    polygon: {
        formats: [
            { pattern: /^sides\s+(\d+)\s+(\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?))?$/, 
              create: (m) => createPolygon(+m[1], +m[2], +(m[3] || 0), +(m[4] || 0)) }
        ],
        usage: 'polygon sides N radius [cx cy]'
    },
    
    polyline: {
        formats: [
            { pattern: /^((?:\d+(?:\.\d+)?),\d+(?:\.\d+)?(?:\s+|$))+$/, 
              create: (m) => createPointsShape('polyline', m[0]) }
        ],
        usage: 'polyline x1,y1 x2,y2 x3,y3 ...'
    },
    
    spline: {
        formats: [
            { pattern: /^((?:\d+(?:\.\d+)?),\d+(?:\.\d+)?(?:\s+|$))+$/, 
              create: (m) => createPointsShape('spline', m[0]) }
        ],
        usage: 'spline x1,y1 x2,y2 x3,y3 ... (min 3 points)'
    },
    
    hatch: {
        formats: [
            { pattern: /^((?:\d+(?:\.\d+)?),\d+(?:\.\d+)?(?:\s+|$))+$/, 
              create: (m) => createPointsShape('hatch', m[0]) }
        ],
        usage: 'hatch x1,y1 x2,y2 x3,y3 x4,y4 ... (pairs)'
    },
    
    point: {
        formats: [
            { pattern: /^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/, 
              create: (m) => ({ type: 'point', x: +m[1], y: +m[2] }) }
        ],
        usage: 'point x,y'
    },
    
    text: {
        formats: [
            { pattern: /^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\s+(.+)$/, 
              create: (m) => ({ type: 'text', x: +m[1], y: +m[2], content: m[3], size: 12 / (window.zoom || 1) }) }
        ],
        usage: 'text x,y "content"'
    }
};

// Utility functions
function createArcFromPoints(x1, y1, x2, y2, sweepAngle) {
    const dx = x2 - x1, dy = y2 - y1;
    const chord = Math.sqrt(dx * dx + dy * dy);
    if (chord === 0) return null;
    
    const sweepRadians = (sweepAngle * Math.PI) / 180;
    const radius = chord / (2 * Math.sin(Math.abs(sweepRadians) / 2));
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
    const h = radius * Math.cos(Math.abs(sweepRadians) / 2);
    const perpX = -dy / chord, perpY = dx / chord;
    const cx = midX + (sweepAngle > 0 ? h : -h) * perpX;
    const cy = midY + (sweepAngle > 0 ? h : -h) * perpY;
    const startAngle = Math.atan2(y1 - cy, x1 - cx);
    
    return { type: 'arc', cx, cy, radius, startAngle, endAngle: startAngle + sweepRadians };
}

function createPolygon(sides, radius, cx = 0, cy = 0) {
    if (sides < 3 || sides > 50 || radius <= 0) return null;
    const points = [];
    for (let i = 0; i < sides; i++) {
        const angle = i * 2 * Math.PI / sides - Math.PI/2;
        points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    return { type: 'polygon', points };
}

function createPointsShape(type, coordString) {
    const coords = coordString.trim().split(/\s+/);
    const points = [];
    
    for (const coord of coords) {
        const [x, y] = coord.split(',').map(Number);
        if (isNaN(x) || isNaN(y)) return null;
        points.push({ x, y });
    }
    
    // Validation based on shape type
    if ((type === 'polyline' && points.length < 2) || 
        (type === 'spline' && points.length < 3) ||
        (type === 'hatch' && (points.length < 2 || points.length % 2 !== 0))) {
        return null;
    }
    
    return { type, points };
}

// Main command execution functions
function executeMultipleCommands(input) {
    const commands = input.replace(/\n/g, ' ').trim()
        .match(/\b(line|circle|rectangle|polygon|polyline|arc|ellipse|spline|hatch|point|text)\s+[^a-z]*/gi);
    
    if (commands && commands.length > 1) {
        let processed = 0;
        commands.forEach(cmd => {
            if (executeSingleCommand(cmd.trim())) processed++;
        });
        if (processed > 1) addToHistory(`Created ${processed} objects`, 'success');
    } else {
        executeSingleCommand(input);
    }
}

function executeCommand(cmd) {
    executeMultipleCommands(cmd);
}

function executeSingleCommand(cmd) {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const params = parts.slice(1).join(' ');
    
    // Handle geometry commands
    const config = COMMAND_CONFIGS[command];
    if (config) {
        for (const format of config.formats) {
            const match = params.match(format.pattern);
            if (match) {
                const shape = format.create(match);
                if (shape) {
                    addShape(shape);
                    redraw();
                    return true;
                } else {
                    addToHistory(`Invalid parameters for ${command}`, 'error');
                    return false;
                }
            }
        }
        addToHistory(`Usage: ${config.usage}`, 'error');
        return false;
    }
    
    // Handle system commands
    switch(command) {
        case 'grid':
            if (params === 'on') { showGrid = true; addToHistory('Grid ON'); }
            else if (params === 'off') { showGrid = false; addToHistory('Grid OFF'); }
            redraw();
            return true;
            
        case 'clear':
            shapes = []; selectedShapes.clear(); 
            addToHistory('Drawing cleared'); redraw();
            return true;
            
        case 'select':
            if (params === 'all') selectAll();
            else setMode('select');
            return true;
            
        case 'move':
            const moveCoords = params.match(/^([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)$/);
            if (moveCoords) moveSelectedShapes(+moveCoords[1], +moveCoords[2]);
            else startMoveCommand();
            return true;
            
        case 'copy': case 'cp':
            startCopyCommand();
            return true;
            
        case 'zoom':
            if (['extents', 'fit', 'all'].includes(params)) {
                zoomToFit(); redraw(); addToHistory(`Zoom ${params}`);
            } else {
                const scale = parseFloat(params);
                if (scale > 0) { zoom = scale; redraw(); addToHistory(`Zoom: ${scale}`); }
            }
            return true;
            
        case 'delete': case 'erase':
            deleteSelectedShapes();
            return true;
            
        case 'undo': 
            undoAction(); 
            return true;
            
        case 'redo': 
            redoAction(); 
            return true;
            
        case 'help':
            addToHistory('Commands: line x1,y1 x2,y2 | circle cx,cy r | arc cx,cy r a1 a2 | grid on/off | zoom fit | select all | help');
            return true;
            
        default:
            // Try to set tool mode
            if (['line', 'circle', 'arc', 'rectangle', 'polygon', 'polyline', 'ellipse', 'spline', 'hatch', 'point', 'text'].includes(command)) {
                setMode(command);
                return true;
            }
            addToHistory(`Unknown command: ${command}`, 'error');
            return false;
    }
}

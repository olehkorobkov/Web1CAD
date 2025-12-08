/*
 * Hatch Geometry Module - Web1CAD System
 * Version 251207 (December 7, 2025)
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 * 
 * This module contains geometric functions for generating hatch patterns
 */

// === HATCH PATTERN GENERATION ===

// Main function to generate hatch pattern
function generateHatchPattern(shape, angleDeg = 45, spacing = 10, pattern = 'lines') {
    const angle = angleDeg * Math.PI / 180;
    
    // Get bounding box
    const bounds = getShapeBounds(shape);
    const { minX, maxX, minY, maxY } = bounds;
    
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const perpX = -dy;
    const perpY = dx;
    
    const diagonal = Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const numLines = Math.ceil(diagonal / spacing) * 2;
    
    let hatchLines = [];
    
    // Generate pattern based on type
    switch (pattern) {
        case 'lines':
            // Parallel lines at angle
            hatchLines = generateParallelLines(shape, centerX, centerY, dx, dy, perpX, perpY, diagonal, spacing, numLines);
            break;
            
        case 'cross':
            // Cross hatch: lines at angle + lines at angle+90°
            const lines1 = generateParallelLines(shape, centerX, centerY, dx, dy, perpX, perpY, diagonal, spacing, numLines);
            const lines2 = generateParallelLines(shape, centerX, centerY, perpX, perpY, -dx, -dy, diagonal, spacing, numLines);
            hatchLines = [...lines1, ...lines2];
            break;
            
        case 'grid':
            // Grid: always horizontal + vertical (ignores angle)
            const dx1 = 1, dy1 = 0, perpX1 = 0, perpY1 = 1;
            const dx2 = 0, dy2 = 1, perpX2 = 1, perpY2 = 0;
            const hLines = generateParallelLines(shape, centerX, centerY, dx1, dy1, perpX1, perpY1, diagonal, spacing, numLines);
            const vLines = generateParallelLines(shape, centerX, centerY, dx2, dy2, perpX2, perpY2, diagonal, spacing, numLines);
            hatchLines = [...hLines, ...vLines];
            break;
            
        case 'dots':
            // Dot pattern
            hatchLines = generateDotPattern(shape, bounds, spacing);
            break;
            
        case 'brick':
            // Brick pattern with offset
            hatchLines = generateBrickPattern(shape, bounds, spacing, diagonal);
            break;
    }
    
    return hatchLines;
}

// Get bounding box of a shape
function getShapeBounds(shape) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    if (shape.type === 'circle') {
        minX = shape.cx - shape.radius;
        maxX = shape.cx + shape.radius;
        minY = shape.cy - shape.radius;
        maxY = shape.cy + shape.radius;
    } else if (shape.type === 'rectangle') {
        minX = shape.x;
        maxX = shape.x + shape.width;
        minY = shape.y;
        maxY = shape.y + shape.height;
    } else if (shape.points) {
        shape.points.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });
    }
    
    return { minX, maxX, minY, maxY };
}

// Generate parallel lines in one direction
function generateParallelLines(shape, centerX, centerY, dx, dy, perpX, perpY, diagonal, spacing, numLines) {
    const hatchLines = [];
    
    for (let i = -numLines / 2; i < numLines / 2; i++) {
        const offset = i * spacing;
        const cx = centerX + perpX * offset;
        const cy = centerY + perpY * offset;
        const ext = diagonal * 1.5;
        
        const x1 = cx - dx * ext;
        const y1 = cy - dy * ext;
        const x2 = cx + dx * ext;
        const y2 = cy + dy * ext;
        
        // Find intersections with shape boundary
        const intersections = findLineShapeIntersections(x1, y1, x2, y2, shape);
        
        if (intersections.length >= 2) {
            // Sort intersections along the line direction
            intersections.sort((a, b) => {
                const projA = (a.x - x1) * dx + (a.y - y1) * dy;
                const projB = (b.x - x1) * dx + (b.y - y1) * dy;
                return projA - projB;
            });
            
            // Create line segments between pairs of intersections
            for (let j = 0; j < intersections.length - 1; j += 2) {
                hatchLines.push(intersections[j]);
                hatchLines.push(intersections[j + 1]);
            }
        }
    }
    
    return hatchLines;
}

// Generate dot pattern
function generateDotPattern(shape, bounds, spacing) {
    const { minX, maxX, minY, maxY } = bounds;
    const dots = [];
    
    for (let x = minX; x <= maxX; x += spacing) {
        for (let y = minY; y <= maxY; y += spacing) {
            if (isPointInsideShape(x, y, shape)) {
                // Create small dot (cross shape)
                const size = 1.5;
                dots.push({x: x - size, y: y});
                dots.push({x: x + size, y: y});
                dots.push({x: x, y: y - size});
                dots.push({x: x, y: y + size});
            }
        }
    }
    
    return dots;
}

// Generate brick pattern
function generateBrickPattern(shape, bounds, spacing, diagonal) {
    const { minX, maxX, minY, maxY } = bounds;
    const bricks = [];
    const brickHeight = spacing;
    const brickWidth = spacing * 2;
    
    // Generate horizontal lines (mortar)
    for (let y = minY; y <= maxY; y += brickHeight) {
        const x1 = minX - diagonal;
        const y1 = y;
        const x2 = maxX + diagonal;
        const y2 = y;
        
        const intersections = findLineShapeIntersections(x1, y1, x2, y2, shape);
        if (intersections.length >= 2) {
            intersections.sort((a, b) => a.x - b.x);
            for (let j = 0; j < intersections.length - 1; j += 2) {
                bricks.push(intersections[j]);
                bricks.push(intersections[j + 1]);
            }
        }
    }
    
    // Generate vertical lines (brick separators) with offset pattern
    let rowIndex = 0;
    for (let y = minY; y <= maxY; y += brickHeight) {
        const offset = (rowIndex % 2 === 0) ? 0 : brickWidth / 2;
        
        for (let x = minX + offset; x <= maxX; x += brickWidth) {
            const x1 = x;
            const y1 = y;
            const x2 = x;
            const y2 = y + brickHeight;
            
            // Check if line should be drawn
            const startInside = isPointInsideShape(x1, y1, shape);
            const endInside = isPointInsideShape(x2, y2, shape);
            
            if (startInside || endInside) {
                const intersections = findLineShapeIntersections(x1, y1, x2, y2, shape);
                if (intersections.length >= 2) {
                    intersections.sort((a, b) => a.y - b.y);
                    bricks.push(intersections[0]);
                    bricks.push(intersections[intersections.length - 1]);
                } else if (startInside && endInside) {
                    bricks.push({x: x1, y: y1});
                    bricks.push({x: x2, y: y2});
                }
            }
        }
        rowIndex++;
    }
    
    return bricks;
}

// Check if point is inside shape
function isPointInsideShape(x, y, shape) {
    if (shape.type === 'circle') {
        const dist = Math.sqrt(Math.pow(x - shape.cx, 2) + Math.pow(y - shape.cy, 2));
        return dist <= shape.radius;
    } else if (shape.type === 'rectangle') {
        return x >= shape.x && x <= shape.x + shape.width && 
               y >= shape.y && y <= shape.y + shape.height;
    } else if (shape.points) {
        return isPointInPolygon(x, y, shape.points);
    }
    return false;
}

// Find line intersections with shape boundary
function findLineShapeIntersections(x1, y1, x2, y2, shape) {
    const intersections = [];
    
    if (shape.type === 'circle') {
        // Circle-line intersection using quadratic formula
        const cx = shape.cx, cy = shape.cy, r = shape.radius;
        const dx = x2 - x1, dy = y2 - y1;
        const fx = x1 - cx, fy = y1 - cy;
        
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - r * r;
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant >= 0) {
            const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
            const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
            
            if (t1 >= 0 && t1 <= 1) {
                intersections.push({ x: x1 + t1 * dx, y: y1 + t1 * dy });
            }
            if (t2 >= 0 && t2 <= 1) {
                intersections.push({ x: x1 + t2 * dx, y: y1 + t2 * dy });
            }
        }
    } else if (shape.points) {
        // Polygon intersection - check each edge
        for (let i = 0; i < shape.points.length; i++) {
            const j = (i + 1) % shape.points.length;
            const p1 = shape.points[i];
            const p2 = shape.points[j];
            
            const int = lineSegmentIntersection(x1, y1, x2, y2, p1.x, p1.y, p2.x, p2.y);
            if (int) {
                intersections.push(int);
            }
        }
    } else if (shape.type === 'rectangle') {
        // Rectangle edges
        const edges = [
            [shape.x, shape.y, shape.x + shape.width, shape.y],
            [shape.x + shape.width, shape.y, shape.x + shape.width, shape.y + shape.height],
            [shape.x + shape.width, shape.y + shape.height, shape.x, shape.y + shape.height],
            [shape.x, shape.y + shape.height, shape.x, shape.y]
        ];
        
        edges.forEach(edge => {
            const int = lineSegmentIntersection(x1, y1, x2, y2, edge[0], edge[1], edge[2], edge[3]);
            if (int) intersections.push(int);
        });
    }
    
    return intersections;
}

// Line segment intersection test
function lineSegmentIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    }
    return null;
}

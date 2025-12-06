/*
 * Unified Shape Handler - Enhanced Web1CAD System v250512
 * Developed by Oleh Korobkov
 * © 2025 Oleh Korobkov. All rights reserved.
 * 
 * OPTIMIZATION: Unifying all shape operations in one module
 * INTEGRATION: Enhanced with compatibility for new rendering core
 */

// === UNIFIED SHAPE OPERATIONS SYSTEM ===
class ShapeHandler {
    constructor() {
        // Type caching for fast access
        this.shapeTypes = new Set(['line', 'circle', 'arc', 'ellipse', 'polyline', 'rectangle', 'spline', 'text', 'point', 'hatch']);
        
        // Enhanced rendering compatibility flag
        this.enhancedRenderingAvailable = typeof drawShape === 'function';
        
        // Methods for each shape type (unified)
        this.operations = {
            line: {
                draw: this.drawLine.bind(this),
                render: this.renderLine.bind(this),
                enhancedRender: this.enhancedRenderLine.bind(this),
                hitTest: this.hitTestLine.bind(this),
                hover: this.hoverLine.bind(this),
                move: this.moveLine.bind(this),
                copy: this.copyLine.bind(this),
                getHandles: this.getLineHandles.bind(this),
                getBounds: this.getLineBounds.bind(this),
                rotate: this.rotateLine.bind(this),
                scale: this.scaleLine.bind(this),
                mirror: this.mirrorLine.bind(this)
            },
            circle: {
                draw: this.drawCircle.bind(this),
                render: this.renderCircle.bind(this),
                enhancedRender: this.enhancedRenderCircle.bind(this),
                hitTest: this.hitTestCircle.bind(this),
                move: this.moveCircle.bind(this),
                copy: this.copyCircle.bind(this),
                getHandles: this.getCircleHandles.bind(this),
                getBounds: this.getCircleBounds.bind(this),
                rotate: this.rotateCircle.bind(this),
                scale: this.scaleCircle.bind(this),
                mirror: this.mirrorCircle.bind(this)
            },
            arc: {
                draw: this.drawArc.bind(this),
                enhancedRender: this.enhancedRenderArc.bind(this),
                rotate: this.rotateArc.bind(this),
                scale: this.scaleArc.bind(this),
                mirror: this.mirrorArc.bind(this)
            },
            ellipse: {
                draw: this.drawEllipse.bind(this),
                enhancedRender: this.enhancedRenderEllipse.bind(this),
                rotate: this.rotateEllipse.bind(this),
                scale: this.scaleEllipse.bind(this),
                mirror: this.mirrorEllipse.bind(this)
            },
            point: {
                draw: this.drawPoint.bind(this),
                enhancedRender: this.enhancedRenderPoint.bind(this),
                rotate: this.rotatePoint.bind(this),
                scale: this.scalePoint.bind(this),
                mirror: this.mirrorPoint.bind(this)
            },
            text: {
                draw: this.drawText.bind(this),
                enhancedRender: this.enhancedRenderText.bind(this),
                rotate: this.rotateText.bind(this),
                scale: this.scaleText.bind(this),
                mirror: this.mirrorText.bind(this)
            },
            polyline: {
                draw: this.drawPolyline.bind(this),
                enhancedRender: this.enhancedRenderPolyline.bind(this),
                hitTest: this.hitTestPolyline.bind(this),
                highlight: this.highlightPolyline.bind(this),
                hover: this.hoverPolyline.bind(this),
                area: this.areaPolyline.bind(this),
                bounds: this.boundsPolyline.bind(this),
                rotate: this.rotatePolyline.bind(this),
                scale: this.scalePolyline.bind(this),
                mirror: this.mirrorPolyline.bind(this)
            },
            spline: {
                draw: this.drawSpline.bind(this),
                enhancedRender: this.enhancedRenderSpline.bind(this),
                highlight: this.highlightSpline.bind(this),
                hover: this.hoverSpline.bind(this),
                outline: this.outlineSpline.bind(this),
                hitTest: this.hitTestSpline.bind(this),
                area: this.areaSpline.bind(this),
                bounds: this.boundsSpline.bind(this),
                getHandles: this.getSplineHandles.bind(this),
                rotate: this.rotateSpline.bind(this),
                scale: this.scaleSpline.bind(this),
                mirror: this.mirrorSpline.bind(this)
            },
            hatch: {
                draw: this.drawHatch.bind(this),
                enhancedRender: this.enhancedRenderHatch.bind(this),
                rotate: this.rotateHatch.bind(this),
                scale: this.scaleHatch.bind(this),
                mirror: this.mirrorHatch.bind(this)
            },
            rectangle: {
                draw: this.drawRectangle.bind(this),
                enhancedRender: this.enhancedRenderRectangle.bind(this),
                rotate: this.rotateRectangle.bind(this),
                scale: this.scaleRectangle.bind(this),
                mirror: this.mirrorRectangle.bind(this),
                highlight: this.highlightRectangle.bind(this),
                getHandles: this.getRectangleHandles.bind(this)
            }
        };

        // Add highlight, getHandles, outline, isInWindow, intersectsWindow, area and bounds operations to all shapes
        Object.keys(this.operations).forEach(shapeType => {
            if (!this.operations[shapeType].highlight) {
                this.operations[shapeType].highlight = this[`highlight${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`]?.bind(this);
            }
            if (!this.operations[shapeType].getHandles) {
                this.operations[shapeType].getHandles = this[`get${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}Handles`]?.bind(this);
            }
            if (!this.operations[shapeType].outline) {
                this.operations[shapeType].outline = this[`outline${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`]?.bind(this);
            }
            if (!this.operations[shapeType].isInWindow) {
                this.operations[shapeType].isInWindow = this[`is${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}InWindow`]?.bind(this);
            }
            if (!this.operations[shapeType].intersectsWindow) {
                this.operations[shapeType].intersectsWindow = this[`${shapeType}IntersectsWindow`]?.bind(this);
            }
            if (!this.operations[shapeType].area) {
                this.operations[shapeType].area = this[`area${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`]?.bind(this);
            }
            if (!this.operations[shapeType].bounds) {
                this.operations[shapeType].bounds = this[`bounds${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`]?.bind(this);
            }
        });
    }

    // UNIFIED METHOD FOR ALL OPERATIONS
    execute(operation, shapeType, ...args) {
        const ops = this.operations[shapeType];
        if (!ops || !ops[operation]) {
            console.warn(`Unsupported operation: ${operation} for ${shapeType}`);
            return null;
        }
        return ops[operation](...args);
    }

    // BATCH OPERATIONS FOR PERFORMANCE IMPROVEMENT
    executeBatch(operation, shapes, ...args) {
        const results = [];
        for (const shape of shapes) {
            const result = this.execute(operation, shape.type, shape, ...args);
            if (result !== null) results.push(result);
        }
        return results;
    }

                // Helper method for ellipse bounds
    getEllipseBounds(ellipse) {
        if (typeof getEllipseBounds === 'function') {
            return getEllipseBounds(ellipse);
        }
        // Fallback simple bounding box
        return {
            minX: ellipse.cx - ellipse.rx,
            maxX: ellipse.cx + ellipse.rx,
            minY: ellipse.cy - ellipse.ry,
            maxY: ellipse.cy + ellipse.ry
        };
    }

    // === AREA CALCULATION METHODS ===
    areaCircle(shape) {
        return Math.PI * shape.radius * shape.radius;
    }

    areaEllipse(shape) {
        return Math.PI * shape.rx * shape.ry;
    }

    areaRectangle(shape) {
        if (shape.points && shape.points.length >= 4) {
            // If rectangle is defined by points, use shoelace formula
            let area = 0;
            for (let i = 0; i < shape.points.length; i++) {
                const j = (i + 1) % shape.points.length;
                area += shape.points[i].x * shape.points[j].y;
                area -= shape.points[j].x * shape.points[i].y;
            }
            return Math.abs(area) / 2;
        } else {
            // Standard width x height rectangle
            return shape.width * shape.height;
        }
    }

    areaHatch(shape) {
        if (!shape.points || shape.points.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < shape.points.length; i++) {
            const j = (i + 1) % shape.points.length;
            area += shape.points[i].x * shape.points[j].y;
            area -= shape.points[j].x * shape.points[i].y;
        }
        return Math.abs(area) / 2;
    }

    areaLine(shape) {
        return 0; // Lines have no area
    }

    areaPolyline(shape) {
        // Check if polyline is closed (first and last points are the same or very close)
        if (!shape.points || shape.points.length < 3) return 0;
        
        const firstPoint = shape.points[0];
        const lastPoint = shape.points[shape.points.length - 1];
        const distance = Math.sqrt(
            Math.pow(lastPoint.x - firstPoint.x, 2) + 
            Math.pow(lastPoint.y - firstPoint.y, 2)
        );
        
        // Consider closed if distance between first and last point is less than 0.1 unit
        if (distance < 0.1) {
            let polylineArea = 0;
            // Use shoelace formula for all points including the closing segment
            for (let i = 0; i < shape.points.length; i++) {
                const j = (i + 1) % shape.points.length;
                polylineArea += shape.points[i].x * shape.points[j].y;
                polylineArea -= shape.points[j].x * shape.points[i].y;
            }
            return Math.abs(polylineArea) / 2;
        }
        
        return 0; // Open polylines have no area
    }

    areaSpline(shape) {
        return 0; // Splines have no area unless closed
    }

    areaArc(shape) {
        return 0; // Arcs have no area
    }

    areaPoint(shape) {
        return 0; // Points have no area
    }

    areaText(shape) {
        return 0; // Text has no geometric area
    }

    // === BOUNDS CALCULATION METHODS ===
    boundsLine(shape) {
        return {
            minX: Math.min(shape.x1, shape.x2),
            maxX: Math.max(shape.x1, shape.x2),
            minY: Math.min(shape.y1, shape.y2),
            maxY: Math.max(shape.y1, shape.y2)
        };
    }

    boundsCircle(shape) {
        return {
            minX: shape.cx - shape.radius,
            maxX: shape.cx + shape.radius,
            minY: shape.cy - shape.radius,
            maxY: shape.cy + shape.radius
        };
    }

    boundsEllipse(shape) {
        return this.getEllipseBounds(shape);
    }

    boundsArc(shape) {
        // Conservative bounds - use full circle
        return this.boundsCircle(shape);
    }

    boundsPoint(shape) {
        return {
            minX: shape.x,
            maxX: shape.x,
            minY: shape.y,
            maxY: shape.y
        };
    }

    boundsText(shape) {
        // Approximate text bounds
        const size = shape.fontSize || 12;
        const length = (shape.content || '').length;
        const width = length * size * 0.6; // Approximate character width
        return {
            minX: shape.x,
            maxX: shape.x + width,
            minY: shape.y - size,
            maxY: shape.y
        };
    }

    boundsPolyline(shape) {
        if (!shape.points || shape.points.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        shape.points.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        return { minX, maxX, minY, maxY };
    }

    boundsPolygon(shape) {
        return this.boundsPolyline(shape);
    }

    boundsSpline(shape) {
        return this.boundsPolyline(shape);
    }

    boundsHatch(shape) {
        return this.boundsPolyline(shape);
    }

    boundsRectangle(shape) {
        if (shape.points && shape.points.length >= 4) {
            return this.boundsPolyline(shape);
        } else {
            return {
                minX: shape.x,
                maxX: shape.x + shape.width,
                minY: shape.y,
                maxY: shape.y + shape.height
            };
        }
    }

    // === TRANSFORM OPERATIONS ===
    rotateShape(shape, angle, centerX, centerY) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const rotatePoint = (x, y) => {
            const dx = x - centerX;
            const dy = y - centerY;
            return {
                x: centerX + dx * cos - dy * sin,
                y: centerY + dx * sin + dy * cos
            };
        };

        switch(shape.type) {
            case 'line':
                const p1 = rotatePoint(shape.x1, shape.y1);
                const p2 = rotatePoint(shape.x2, shape.y2);
                shape.x1 = p1.x; shape.y1 = p1.y;
                shape.x2 = p2.x; shape.y2 = p2.y;
                break;
            case 'circle':
            case 'arc':
                const center = rotatePoint(shape.cx, shape.cy);
                shape.cx = center.x;
                shape.cy = center.y;
                if (shape.type === 'arc') {
                    shape.startAngle += angle;
                    shape.endAngle += angle;
                }
                break;
            case 'ellipse':
                const ellipseCenter = rotatePoint(shape.cx, shape.cy);
                shape.cx = ellipseCenter.x;
                shape.cy = ellipseCenter.y;
                shape.rotation = (shape.rotation || 0) + angle;
                break;
            case 'rectangle':
                if (shape.points && shape.points.length >= 4) {
                    shape.points.forEach(point => {
                        const rotated = rotatePoint(point.x, point.y);
                        point.x = rotated.x;
                        point.y = rotated.y;
                    });
                } else {
                    const corner = rotatePoint(shape.x, shape.y);
                    shape.x = corner.x;
                    shape.y = corner.y;
                    shape.rotation = (shape.rotation || 0) + angle;
                }
                break;
            case 'polyline':
            case 'spline':
            case 'hatch':
                if (shape.points) {
                    shape.points.forEach(point => {
                        const rotated = rotatePoint(point.x, point.y);
                        point.x = rotated.x;
                        point.y = rotated.y;
                    });
                }
                break;
            case 'point':
                const rotatedPoint = rotatePoint(shape.x, shape.y);
                shape.x = rotatedPoint.x;
                shape.y = rotatedPoint.y;
                break;
            case 'text':
                const textCenter = rotatePoint(shape.x, shape.y);
                shape.x = textCenter.x;
                shape.y = textCenter.y;
                shape.rotation = (shape.rotation || 0) + angle;
                break;
        }
    }

    scaleShape(shape, factor, centerX, centerY) {
        const scalePoint = (x, y) => {
            return {
                x: centerX + (x - centerX) * factor,
                y: centerY + (y - centerY) * factor
            };
        };

        switch(shape.type) {
            case 'line':
                const p1 = scalePoint(shape.x1, shape.y1);
                const p2 = scalePoint(shape.x2, shape.y2);
                shape.x1 = p1.x; shape.y1 = p1.y;
                shape.x2 = p2.x; shape.y2 = p2.y;
                break;
            case 'circle':
            case 'arc':
                const center = scalePoint(shape.cx, shape.cy);
                shape.cx = center.x;
                shape.cy = center.y;
                shape.radius *= factor;
                break;
            case 'ellipse':
                const ellipseCenter = scalePoint(shape.cx, shape.cy);
                shape.cx = ellipseCenter.x;
                shape.cy = ellipseCenter.y;
                shape.rx *= factor;
                shape.ry *= factor;
                break;
            case 'rectangle':
                if (shape.points && shape.points.length >= 4) {
                    shape.points.forEach(point => {
                        const scaled = scalePoint(point.x, point.y);
                        point.x = scaled.x;
                        point.y = scaled.y;
                    });
                } else {
                    const corner = scalePoint(shape.x, shape.y);
                    shape.x = corner.x;
                    shape.y = corner.y;
                    shape.width *= factor;
                    shape.height *= factor;
                }
                break;
            case 'polyline':
            case 'spline':
            case 'hatch':
                if (shape.points) {
                    shape.points.forEach(point => {
                        const scaled = scalePoint(point.x, point.y);
                        point.x = scaled.x;
                        point.y = scaled.y;
                    });
                }
                break;
            case 'point':
                const scaledPoint = scalePoint(shape.x, shape.y);
                shape.x = scaledPoint.x;
                shape.y = scaledPoint.y;
                break;
            case 'text':
                const textCenter = scalePoint(shape.x, shape.y);
                shape.x = textCenter.x;
                shape.y = textCenter.y;
                if (shape.fontSize) {
                    shape.fontSize *= factor;
                }
                break;
        }
    }

    mirrorShape(shape, x1, y1, x2, y2) {
        // Calculate mirror line normal
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / length; // Normal x component
        const ny = dx / length;  // Normal y component

        const mirrorPoint = (x, y) => {
            const dot = 2 * ((x - x1) * nx + (y - y1) * ny);
            return {
                x: x - dot * nx,
                y: y - dot * ny
            };
        };

        switch(shape.type) {
            case 'line':
                const p1 = mirrorPoint(shape.x1, shape.y1);
                const p2 = mirrorPoint(shape.x2, shape.y2);
                shape.x1 = p1.x; shape.y1 = p1.y;
                shape.x2 = p2.x; shape.y2 = p2.y;
                break;
            case 'circle':
                const center = mirrorPoint(shape.cx, shape.cy);
                shape.cx = center.x;
                shape.cy = center.y;
                break;
            case 'ellipse':
                const ellipseCenter = mirrorPoint(shape.cx, shape.cy);
                shape.cx = ellipseCenter.x;
                shape.cy = ellipseCenter.y;
                // Mirror rotation angle
                shape.rotation = -shape.rotation || 0;
                break;
            case 'arc':
                const arcCenter = mirrorPoint(shape.cx, shape.cy);
                shape.cx = arcCenter.x;
                shape.cy = arcCenter.y;
                // Mirror angles
                const oldStart = shape.startAngle;
                const oldEnd = shape.endAngle;
                shape.startAngle = Math.PI - oldEnd;
                shape.endAngle = Math.PI - oldStart;
                break;
            case 'rectangle':
                if (shape.points && shape.points.length >= 4) {
                    shape.points.forEach(point => {
                        const mirrored = mirrorPoint(point.x, point.y);
                        point.x = mirrored.x;
                        point.y = mirrored.y;
                    });
                } else {
                    const corner = mirrorPoint(shape.x, shape.y);
                    shape.x = corner.x;
                    shape.y = corner.y;
                }
                break;
            case 'polyline':
            case 'spline':
            case 'hatch':
                if (shape.points) {
                    shape.points.forEach(point => {
                        const mirrored = mirrorPoint(point.x, point.y);
                        point.x = mirrored.x;
                        point.y = mirrored.y;
                    });
                }
                break;
            case 'point':
                const mirroredPoint = mirrorPoint(shape.x, shape.y);
                shape.x = mirroredPoint.x;
                shape.y = mirroredPoint.y;
                break;
            case 'text':
                const textCenter = mirrorPoint(shape.x, shape.y);
                shape.x = textCenter.x;
                shape.y = textCenter.y;
                break;
        }
    }

    // === WINDOW INTERSECTION METHODS ===
    isLineInWindow(shape, minX, maxX, minY, maxY) {
        return (shape.x1 >= minX && shape.x1 <= maxX && shape.y1 >= minY && shape.y1 <= maxY) &&
               (shape.x2 >= minX && shape.x2 <= maxX && shape.y2 >= minY && shape.y2 <= maxY);
    }

    isCircleInWindow(shape, minX, maxX, minY, maxY) {
        return (shape.cx - shape.radius >= minX && shape.cx + shape.radius <= maxX &&
               shape.cy - shape.radius >= minY && shape.cy + shape.radius <= maxY);
    }

    isArcInWindow(shape, minX, maxX, minY, maxY) {
        return (shape.cx >= minX && shape.cx <= maxX && shape.cy >= minY && shape.cy <= maxY);
    }

    isEllipseInWindow(shape, minX, maxX, minY, maxY) {
        const ellipseBounds = this.getEllipseBounds(shape);
        return (ellipseBounds.minX >= minX && ellipseBounds.maxX <= maxX &&
               ellipseBounds.minY >= minY && ellipseBounds.maxY <= maxY);
    }

    isPointInWindow(shape, minX, maxX, minY, maxY) {
        return (shape.x >= minX && shape.x <= maxX && shape.y >= minY && shape.y <= maxY);
    }

    isTextInWindow(shape, minX, maxX, minY, maxY) {
        return (shape.x >= minX && shape.x <= maxX && shape.y >= minY && shape.y <= maxY);
    }

    isPolylineInWindow(shape, minX, maxX, minY, maxY) {
        if (!shape.points || shape.points.length === 0) return false;
        return shape.points.every(point => 
            point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY);
    }

    isSplineInWindow(shape, minX, maxX, minY, maxY) {
        return this.isPolylineInWindow(shape, minX, maxX, minY, maxY);
    }

    isHatchInWindow(shape, minX, maxX, minY, maxY) {
        return this.isPolylineInWindow(shape, minX, maxX, minY, maxY);
    }

    isRectangleInWindow(shape, minX, maxX, minY, maxY) {
        return (shape.x >= minX && shape.x + shape.width <= maxX && 
                shape.y >= minY && shape.y + shape.height <= maxY);
    }

    // Intersection methods
    lineIntersectsWindow(shape, minX, maxX, minY, maxY) {
        // Use external lineIntersectsRect function if available
        if (typeof lineIntersectsRect === 'function') {
            return lineIntersectsRect(shape.x1, shape.y1, shape.x2, shape.y2, minX, minY, maxX, maxY);
        }
        return false;
    }

    circleIntersectsWindow(shape, minX, maxX, minY, maxY) {
        // Use external circleIntersectsRect function if available
        if (typeof circleIntersectsRect === 'function') {
            return circleIntersectsRect(shape.cx, shape.cy, shape.radius, minX, minY, maxX, maxY);
        }
        return false;
    }

    arcIntersectsWindow(shape, minX, maxX, minY, maxY) {
        return this.circleIntersectsWindow(shape, minX, maxX, minY, maxY);
    }

    ellipseIntersectsWindow(shape, minX, maxX, minY, maxY) {
        // Use external ellipseIntersectsRect function if available
        if (typeof ellipseIntersectsRect === 'function') {
            return ellipseIntersectsRect(shape, minX, minY, maxX, maxY);
        }
        return false;
    }

    pointIntersectsWindow(shape, minX, maxX, minY, maxY) {
        return this.isPointInWindow(shape, minX, maxX, minY, maxY);
    }

    textIntersectsWindow(shape, minX, maxX, minY, maxY) {
        return this.isTextInWindow(shape, minX, maxX, minY, maxY);
    }

    polylineIntersectsWindow(shape, minX, maxX, minY, maxY) {
        if (!shape.points || shape.points.length === 0) return false;
        if (typeof lineIntersectsRect !== 'function') return false;
        
        for (let i = 0; i < shape.points.length - 1; i++) {
            if (lineIntersectsRect(shape.points[i].x, shape.points[i].y,
                                 shape.points[i + 1].x, shape.points[i + 1].y,
                                 minX, minY, maxX, maxY)) {
                return true;
            }
        }
        return false;
    }

    polygonIntersectsWindow(shape, minX, maxX, minY, maxY) {
        return this.polylineIntersectsWindow(shape, minX, maxX, minY, maxY);
    }

    splineIntersectsWindow(shape, minX, maxX, minY, maxY) {
        return this.polylineIntersectsWindow(shape, minX, maxX, minY, maxY);
    }

    hatchIntersectsWindow(shape, minX, maxX, minY, maxY) {
        if (!shape.points || shape.points.length === 0) return false;
        if (typeof lineIntersectsRect !== 'function') return false;
        
        for (let i = 0; i < shape.points.length; i += 2) {
            if (i + 1 < shape.points.length) {
                if (lineIntersectsRect(shape.points[i].x, shape.points[i].y,
                                     shape.points[i + 1].x, shape.points[i + 1].y,
                                     minX, minY, maxX, maxY)) {
                    return true;
                }
            }
        }
        return false;
    }

    rectangleIntersectsWindow(shape, minX, maxX, minY, maxY) {
        // Rectangle intersection with window
        return !(shape.x + shape.width < minX || shape.x > maxX || 
                shape.y + shape.height < minY || shape.y > maxY);
    }

    // === OUTLINE METHODS ===
    outlineLine(ctx, shape) {
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
        return true;
    }

    outlineCircle(ctx, shape) {
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.radius, 0, 2 * Math.PI);
        ctx.stroke();
        return true;
    }

    outlineArc(ctx, shape) {
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.radius, shape.startAngle, shape.endAngle);
        ctx.stroke();
        return true;
    }

    outlineEllipse(ctx, shape) {
        ctx.beginPath();
        ctx.ellipse(
            shape.cx, 
            shape.cy, 
            shape.rx, 
            shape.ry, 
            shape.rotation || 0, 
            shape.startAngle || 0, 
            shape.endAngle || 2 * Math.PI
        );
        ctx.stroke();
        return true;
    }

    outlinePoint(ctx, shape) {
        ctx.beginPath();
        const zoom = window.currentZoom || 1;
        ctx.arc(shape.x, shape.y, 3 / zoom, 0, 2 * Math.PI);
        ctx.stroke();
        return true;
    }

    outlineText(ctx, shape) {
        const zoom = window.currentZoom || 1;
        const textSize = shape.size || (12 / zoom);
        const textWidth = shape.content ? shape.content.length * textSize * 0.6 : 10;
        ctx.strokeRect(shape.x - 2, shape.y - textSize, textWidth + 4, textSize + 4);
        return true;
    }

    outlinePolyline(ctx, shape) {
        if (!shape.points || shape.points.length < 2) return false;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
        return true;
    }

    outlinePolygon(ctx, shape) {
        if (!shape.points || shape.points.length < 3) return false;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        return true;
    }

    outlineSpline(ctx, shape) {
        if (!shape.points || shape.points.length < 2) return false;
        // Use smooth spline rendering
        if (typeof drawSmoothSpline === 'function') {
            drawSmoothSpline(ctx, shape.points);
        } else {
            // Fallback to simple polyline
            this.outlinePolyline(ctx, shape);
        }
        return true;
    }

    outlineHatch(ctx, shape) {
        if (!shape.points || shape.points.length < 2) return false;
        ctx.beginPath();
        for (let i = 0; i < shape.points.length; i += 2) {
            if (i + 1 < shape.points.length) {
                ctx.moveTo(shape.points[i].x, shape.points[i].y);
                ctx.lineTo(shape.points[i + 1].x, shape.points[i + 1].y);
            }
        }
        ctx.stroke();
        return true;
    }

    outlineRectangle(ctx, shape) {
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, shape.width, shape.height);
        ctx.stroke();
        return true;
    }

    // === HIGHLIGHT METHODS ===
    getLineHandles(shape, zoom) {
        const handles = [];
        const handleSize = 4 / zoom;
        
        // Endpoint handles
        handles.push({
            x: shape.x1, y: shape.y1, 
            type: 'endpoint', size: handleSize
        });
        handles.push({
            x: shape.x2, y: shape.y2, 
            type: 'endpoint', size: handleSize
        });
        
        // Midpoint handle
        handles.push({
            x: (shape.x1 + shape.x2) / 2, 
            y: (shape.y1 + shape.y2) / 2, 
            type: 'midpoint', size: handleSize
        });
        
        return handles;
    }

    getCircleHandles(shape, zoom) {
        const handles = [];
        const handleSize = 4 / zoom;
        
        // Center handle
        handles.push({
            x: shape.cx, y: shape.cy, 
            type: 'center', size: handleSize
        });
        
        // Cardinal direction handles
        handles.push({
            x: shape.cx + shape.radius, y: shape.cy, 
            type: 'midpoint', size: handleSize
        });
        handles.push({
            x: shape.cx - shape.radius, y: shape.cy, 
            type: 'midpoint', size: handleSize
        });
        handles.push({
            x: shape.cx, y: shape.cy + shape.radius, 
            type: 'midpoint', size: handleSize
        });
        handles.push({
            x: shape.cx, y: shape.cy - shape.radius, 
            type: 'midpoint', size: handleSize
        });
        
        return handles;
    }

    getArcHandles(shape, zoom) {
        const handles = [];
        const handleSize = 4 / zoom;
        
        // Center handle
        handles.push({
            x: shape.cx, y: shape.cy, 
            type: 'center', size: handleSize
        });
        
        // Start and end point handles
        const startX = shape.cx + shape.radius * Math.cos(shape.startAngle);
        const startY = shape.cy + shape.radius * Math.sin(shape.startAngle);
        const endX = shape.cx + shape.radius * Math.cos(shape.endAngle);
        const endY = shape.cy + shape.radius * Math.sin(shape.endAngle);
        
        handles.push({
            x: startX, y: startY, 
            type: 'endpoint', size: handleSize
        });
        handles.push({
            x: endX, y: endY, 
            type: 'endpoint', size: handleSize
        });
        
        return handles;
    }

    getEllipseHandles(shape, zoom) {
        const handles = [];
        const handleSize = 4 / zoom;
        const rotation = shape.rotation || 0;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        // Center handle
        handles.push({
            x: shape.cx, y: shape.cy, 
            type: 'center', size: handleSize
        });
        
        // Major and minor axis handles
        handles.push({
            x: shape.cx + shape.rx * cos, 
            y: shape.cy + shape.rx * sin, 
            type: 'midpoint', size: handleSize
        });
        handles.push({
            x: shape.cx - shape.rx * cos, 
            y: shape.cy - shape.rx * sin, 
            type: 'midpoint', size: handleSize
        });
        handles.push({
            x: shape.cx - shape.ry * sin, 
            y: shape.cy + shape.ry * cos, 
            type: 'midpoint', size: handleSize
        });
        handles.push({
            x: shape.cx + shape.ry * sin, 
            y: shape.cy - shape.ry * cos, 
            type: 'midpoint', size: handleSize
        });
        
        return handles;
    }

    getPointHandles(shape, zoom) {
        const handleSize = 4 / zoom;
        return [{
            x: shape.x, y: shape.y, 
            type: 'center', size: handleSize
        }];
    }

    getTextHandles(shape, zoom) {
        const handles = [];
        const handleSize = 4 / zoom;
        const textSize = shape.size || 12;
        const textWidth = shape.content ? shape.content.length * textSize * 0.6 : textSize;
        const textHeight = textSize;
        
        // Minimal text handles: insertion point + 1 extent handle
        handles.push({
            x: shape.x, y: shape.y, 
            type: 'endpoint', size: handleSize
        });
        handles.push({
            x: shape.x + textWidth, y: shape.y + textHeight, 
            type: 'midpoint', size: handleSize
        });
        
        return handles;
    }

    getPolylineHandles(shape, zoom) {
        if (!shape.points || shape.points.length === 0) return [];
        const handles = [];
        const handleSize = 4 / zoom;
        
        shape.points.forEach((point, index) => {
            const isEndpoint = index === 0 || index === shape.points.length - 1;
            handles.push({
                x: point.x, y: point.y, 
                type: isEndpoint ? 'endpoint' : 'midpoint', 
                size: handleSize
            });
        });
        
        return handles;
    }

    getPolygonHandles(shape, zoom) {
        if (!shape.points || shape.points.length === 0) return [];
        const handles = [];
        const handleSize = 4 / zoom;
        
        shape.points.forEach(point => {
            handles.push({
                x: point.x, y: point.y, 
                type: 'midpoint', size: handleSize
            });
        });
        
        return handles;
    }

    getSplineHandles(shape, zoom) {
        if (!shape.points || shape.points.length === 0) return [];
        const handles = [];
        const handleSize = 4 / zoom;
        
        shape.points.forEach((point, index) => {
            const isEndpoint = index === 0 || index === shape.points.length - 1;
            handles.push({
                x: point.x, y: point.y, 
                type: isEndpoint ? 'endpoint' : 'midpoint', 
                size: handleSize
            });
        });
        
        return handles;
    }

    getHatchHandles(shape, zoom) {
        if (!shape.points || shape.points.length === 0) return [];
        const handles = [];
        const handleSize = 4 / zoom;
        
        // Show handles for every other point to reduce clutter
        shape.points.forEach((point, index) => {
            if (index % 2 === 0) { // Only start points of hatch lines
                handles.push({
                    x: point.x, y: point.y, 
                    type: 'endpoint', size: handleSize
                });
            }
        });
        
        return handles;
    }

    getRectangleHandles(shape, zoom) {
        const handles = [];
        const handleSize = 4 / zoom;
        
        // Corner handles
        handles.push({
            x: shape.x, y: shape.y, 
            type: 'endpoint', size: handleSize
        });
        handles.push({
            x: shape.x + shape.width, y: shape.y, 
            type: 'endpoint', size: handleSize
        });
        handles.push({
            x: shape.x + shape.width, y: shape.y + shape.height, 
            type: 'endpoint', size: handleSize
        });
        handles.push({
            x: shape.x, y: shape.y + shape.height, 
            type: 'endpoint', size: handleSize
        });
        
        // Midpoint handles
        handles.push({
            x: shape.x + shape.width / 2, y: shape.y, 
            type: 'midpoint', size: handleSize
        });
        handles.push({
            x: shape.x + shape.width, y: shape.y + shape.height / 2, 
            type: 'midpoint', size: handleSize
        });
        handles.push({
            x: shape.x + shape.width / 2, y: shape.y + shape.height, 
            type: 'midpoint', size: handleSize
        });
        handles.push({
            x: shape.x, y: shape.y + shape.height / 2, 
            type: 'midpoint', size: handleSize
        });
        
        return handles;
    }

    // === DRAW METHODS ===
    highlightLine(ctx, shape, zoom) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
        return true;
    }

    highlightCircle(ctx, shape, zoom) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.radius, 0, 2 * Math.PI);
        ctx.stroke();
        return true;
    }

    highlightArc(ctx, shape, zoom) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.radius, shape.startAngle, shape.endAngle);
        ctx.stroke();
        return true;
    }

    highlightEllipse(ctx, shape, zoom) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.ellipse(
            shape.cx, 
            shape.cy, 
            shape.rx, 
            shape.ry, 
            shape.rotation || 0, 
            shape.startAngle || 0, 
            shape.endAngle || 2 * Math.PI
        );
        ctx.stroke();
        return true;
    }

    highlightPoint(ctx, shape, zoom) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, 4 / zoom, 0, 2 * Math.PI);
        ctx.stroke();
        return true;
    }

    highlightText(ctx, shape, zoom) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        // FIXED: text as geometric shape
        const worldSize = shape.size || 12; // World units
        ctx.font = `${worldSize}px Arial`; // Use world size directly
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.save();
        ctx.translate(shape.x, shape.y);
        if (shape.rotation) ctx.rotate(shape.rotation);
        ctx.scale(1, -1);
        ctx.strokeText(shape.content || '', 0, 0);
        ctx.restore();
        return true;
    }

    highlightPolyline(ctx, shape, zoom) {
        if (!shape.points || shape.points.length < 2) return false;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
        return true;
    }

    highlightPolygon(ctx, shape, zoom) {
        if (!shape.points || shape.points.length < 3) return false;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        return true;
    }

    highlightSpline(ctx, shape, zoom) {
        if (!shape.points || shape.points.length < 2) return false;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        // Use smooth spline rendering
        if (typeof drawSmoothSpline === 'function') {
            drawSmoothSpline(ctx, shape.points);
        } else {
            // Fallback to simple polyline
            this.highlightPolyline(ctx, shape, zoom);
        }
        return true;
    }

    highlightHatch(ctx, shape, zoom) {
        if (!shape.points || shape.points.length < 2) return false;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        for (let i = 0; i < shape.points.length; i += 2) {
            if (i + 1 < shape.points.length) {
                ctx.beginPath();
                ctx.moveTo(shape.points[i].x, shape.points[i].y);
                ctx.lineTo(shape.points[i + 1].x, shape.points[i + 1].y);
                ctx.stroke();
            }
        }
        return true;
    }

    highlightRectangle(ctx, shape, zoom) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, shape.width, shape.height);
        ctx.stroke();
        return true;
    }
    drawLine(ctx, shape, zoom) {
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
    }

    renderLine(ctx, shape, zoom, index) {
        this.applyShapeStyles(ctx, shape, zoom);
        this.drawLine(ctx, shape, zoom);
        if (this.isSelected(index)) {
            this.drawSelectionHighlight(ctx, shape, zoom);
        }
    }

    hitTestLine(shape, x, y, tolerance = 5) {
        return distanceToLineSegment(x, y, shape.x1, shape.y1, shape.x2, shape.y2) < tolerance;
    }

    moveLine(shape, dx, dy) {
        shape.x1 += dx;
        shape.y1 += dy;
        shape.x2 += dx;
        shape.y2 += dy;
        return shape;
    }

    copyLine(shape) {
        return {
            type: 'line',
            x1: shape.x1,
            y1: shape.y1,
            x2: shape.x2,
            y2: shape.y2,
            color: shape.color,
            lineWeight: shape.lineWeight,
            layer: shape.layer
        };
    }

    getLineHandles(shape) {
        return [
            { x: shape.x1, y: shape.y1, type: 'endpoint' },
            { x: shape.x2, y: shape.y2, type: 'endpoint' },
            { x: (shape.x1 + shape.x2) / 2, y: (shape.y1 + shape.y2) / 2, type: 'midpoint' }
        ];
    }

    getLineBounds(shape) {
        return {
            minX: Math.min(shape.x1, shape.x2),
            minY: Math.min(shape.y1, shape.y2),
            maxX: Math.max(shape.x1, shape.x2),
            maxY: Math.max(shape.y1, shape.y2)
        };
    }

    // === CIRCLE OPERATIONS ===
    drawCircle(ctx, shape, zoom) {
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.radius, 0, 2 * Math.PI);
        ctx.stroke();
    }

    renderCircle(ctx, shape, zoom, index) {
        this.applyShapeStyles(ctx, shape, zoom);
        this.drawCircle(ctx, shape, zoom);
        if (this.isSelected(index)) {
            this.drawSelectionHighlight(ctx, shape, zoom);
        }
    }

    hitTestCircle(shape, x, y, tolerance = 5) {
        const dx = x - shape.cx;
        const dy = y - shape.cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return Math.abs(distance - shape.radius) < tolerance;
    }

    hitTestPolyline(shape, x, y, tolerance = 5) {
        if (!shape.points || shape.points.length < 2) return false;
        
        // Check distance to each line segment of the polyline
        for (let i = 0; i < shape.points.length - 1; i++) {
            const p1 = shape.points[i];
            const p2 = shape.points[i + 1];
            if (distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y) < tolerance) {
                return true;
            }
        }
        return false;
    }

    hitTestSpline(shape, x, y, tolerance = 5) {
        // For spline, use the same logic as polyline since spline consists of connected points
        return this.hitTestPolyline(shape, x, y, tolerance);
    }

    moveCircle(shape, dx, dy) {
        shape.cx += dx;
        shape.cy += dy;
        return shape;
    }

    copyCircle(shape) {
        return {
            type: 'circle',
            cx: shape.cx,
            cy: shape.cy,
            radius: shape.radius,
            color: shape.color,
            lineWeight: shape.lineWeight,
            layer: shape.layer
        };
    }

    getCircleHandles(shape) {
        return [
            { x: shape.cx, y: shape.cy, type: 'center' },
            { x: shape.cx + shape.radius, y: shape.cy, type: 'midpoint' },
            { x: shape.cx - shape.radius, y: shape.cy, type: 'midpoint' },
            { x: shape.cx, y: shape.cy + shape.radius, type: 'midpoint' },
            { x: shape.cx, y: shape.cy - shape.radius, type: 'midpoint' }
        ];
    }

    getCircleBounds(shape) {
        return {
            minX: shape.cx - shape.radius,
            minY: shape.cy - shape.radius,
            maxX: shape.cx + shape.radius,
            maxY: shape.cy + shape.radius
        };
    }

    // === UTILITY METHODS ===
    applyShapeStyles(ctx, shape, zoom, forPdfPreview = false) {
        // Check for global PDF preview mode
        const isPdfPreview = forPdfPreview || window.pdfPreviewMode;
        
        // Optimized style setup
        const layer = this.getLayer(shape.layer);
        
        ctx.strokeStyle = this.resolveColor(shape, layer, isPdfPreview);
        ctx.fillStyle = this.resolveColor(shape, layer, isPdfPreview); // Also set fillStyle for text
        ctx.lineWidth = this.resolveLineweight(shape, layer) / zoom;
        this.setLineDash(ctx, shape, layer);
        
        if (shape.locked) {
            ctx.globalAlpha = 0.5;
        }
    }

    resolveColor(shape, layer, forPdfPreview = false) {
        // Check for global PDF preview mode
        const isPdfPreview = forPdfPreview || window.pdfPreviewMode;
        
        let color = shape.color === 'byLayer' ? (layer?.color || '#ffffff') : (shape.color || '#ffffff');
        
        // Convert white to black for PDF preview
        if (isPdfPreview && window.convertWhiteToBlackForPreview) {
            color = window.convertWhiteToBlackForPreview(color);
        }
        
        return color;
    }

    resolveLineweight(shape, layer) {
        return shape.lineWeight === 'byLayer' ? (layer?.lineWeight || 0.25) : (shape.lineWeight || 0.25);
    }

    setLineDash(ctx, shape, layer) {
        const linetype = shape.linetype === 'byLayer' ? (layer?.linetype || 'continuous') : (shape.linetype || 'continuous');
        
        switch(linetype) {
            case 'dashed': ctx.setLineDash([5, 5]); break;
            case 'dotted': ctx.setLineDash([1, 4]); break;
            case 'dash-dot': ctx.setLineDash([5, 3, 1, 3]); break;
            default: ctx.setLineDash([]);
        }
    }

    drawSelectionHighlight(ctx, shape, zoom) {
        ctx.save();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([3 / zoom, 3 / zoom]);
        this.execute('draw', shape.type, ctx, shape, zoom);
        ctx.restore();
    }

    // Stub methods that depend on external state
    getLayer(layerName) {
        return window.layers?.find(l => l.name === layerName) || null;
    }

    isSelected(index) {
        return window.selectedShapes?.has(index) || false;
    }

    // === ROTATE OPERATIONS ===
    rotateLine(shape, centerX, centerY, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Rotate point 1
        const dx1 = shape.x1 - centerX;
        const dy1 = shape.y1 - centerY;
        shape.x1 = centerX + dx1 * cos - dy1 * sin;
        shape.y1 = centerY + dx1 * sin + dy1 * cos;
        
        // Rotate point 2
        const dx2 = shape.x2 - centerX;
        const dy2 = shape.y2 - centerY;
        shape.x2 = centerX + dx2 * cos - dy2 * sin;
        shape.y2 = centerY + dx2 * sin + dy2 * cos;
        
        return shape;
    }

    rotateCircle(shape, centerX, centerY, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Rotate center point
        const dx = shape.cx - centerX;
        const dy = shape.cy - centerY;
        shape.cx = centerX + dx * cos - dy * sin;
        shape.cy = centerY + dx * sin + dy * cos;
        
        return shape;
    }

    rotateArc(shape, centerX, centerY, angle) {
        // Rotate center like circle
        this.rotateCircle(shape, centerX, centerY, angle);
        
        // Rotate angles
        shape.startAngle += angle;
        shape.endAngle += angle;
        
        return shape;
    }

    rotateEllipse(shape, centerX, centerY, angle) {
        // Rotate center like circle
        this.rotateCircle(shape, centerX, centerY, angle);
        
        // Update rotation
        shape.rotation = (shape.rotation || 0) + angle;
        
        return shape;
    }

    rotatePoint(shape, centerX, centerY, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const dx = shape.x - centerX;
        const dy = shape.y - centerY;
        shape.x = centerX + dx * cos - dy * sin;
        shape.y = centerY + dx * sin + dy * cos;
        
        return shape;
    }

    rotateText(shape, centerX, centerY, angle) {
        // Rotate position like point
        this.rotatePoint(shape, centerX, centerY, angle);
        
        // Update text rotation if supported
        if (shape.rotation !== undefined) {
            shape.rotation = (shape.rotation || 0) + angle;
        }
        
        return shape;
    }

    rotatePolyline(shape, centerX, centerY, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        if (shape.points) {
            shape.points.forEach(point => {
                const dx = point.x - centerX;
                const dy = point.y - centerY;
                point.x = centerX + dx * cos - dy * sin;
                point.y = centerY + dx * sin + dy * cos;
            });
        }
        
        return shape;
    }

    // Aliases for same rotation logic
    rotatePolygon(shape, centerX, centerY, angle) {
        return this.rotatePolyline(shape, centerX, centerY, angle);
    }

    rotateSpline(shape, centerX, centerY, angle) {
        return this.rotatePolyline(shape, centerX, centerY, angle);
    }

    rotateHatch(shape, centerX, centerY, angle) {
        return this.rotatePolyline(shape, centerX, centerY, angle);
    }

    rotateRectangle(shape, centerX, centerY, angle) {
        // Rotate corner point
        this.rotatePoint(shape, centerX, centerY, angle);
        
        // Note: Rectangle rotation might need conversion to polygon for proper display
        return shape;
    }

    // === SCALE OPERATIONS ===
    scaleLine(shape, centerX, centerY, factor) {
        // Scale point 1
        shape.x1 = centerX + (shape.x1 - centerX) * factor;
        shape.y1 = centerY + (shape.y1 - centerY) * factor;
        
        // Scale point 2
        shape.x2 = centerX + (shape.x2 - centerX) * factor;
        shape.y2 = centerY + (shape.y2 - centerY) * factor;
        
        return shape;
    }

    scaleCircle(shape, centerX, centerY, factor) {
        // Scale center position
        shape.cx = centerX + (shape.cx - centerX) * factor;
        shape.cy = centerY + (shape.cy - centerY) * factor;
        
        // Scale radius
        shape.radius *= factor;
        
        return shape;
    }

    scaleArc(shape, centerX, centerY, factor) {
        // Scale like circle
        return this.scaleCircle(shape, centerX, centerY, factor);
    }

    scaleEllipse(shape, centerX, centerY, factor) {
        // Scale center position
        shape.cx = centerX + (shape.cx - centerX) * factor;
        shape.cy = centerY + (shape.cy - centerY) * factor;
        
        // Scale radii
        shape.rx *= factor;
        shape.ry *= factor;
        
        return shape;
    }

    scalePoint(shape, centerX, centerY, factor) {
        shape.x = centerX + (shape.x - centerX) * factor;
        shape.y = centerY + (shape.y - centerY) * factor;
        
        return shape;
    }

    scaleText(shape, centerX, centerY, factor) {
        // Scale position like point
        this.scalePoint(shape, centerX, centerY, factor);
        
        // Scale text size if present
        if (shape.size) {
            shape.size *= factor;
        }
        
        return shape;
    }

    scalePolyline(shape, centerX, centerY, factor) {
        if (shape.points) {
            shape.points.forEach(point => {
                point.x = centerX + (point.x - centerX) * factor;
                point.y = centerY + (point.y - centerY) * factor;
            });
        }
        
        return shape;
    }

    // Aliases for same scaling logic
    scalePolygon(shape, centerX, centerY, factor) {
        return this.scalePolyline(shape, centerX, centerY, factor);
    }

    scaleSpline(shape, centerX, centerY, factor) {
        return this.scalePolyline(shape, centerX, centerY, factor);
    }

    scaleHatch(shape, centerX, centerY, factor) {
        return this.scalePolyline(shape, centerX, centerY, factor);
    }

    scaleRectangle(shape, centerX, centerY, factor) {
        // Scale corner position
        this.scalePoint(shape, centerX, centerY, factor);
        
        // Scale dimensions
        shape.width *= factor;
        shape.height *= factor;
        
        return shape;
    }

    // === ADDITIONAL DRAW OPERATIONS ===
    drawArc(ctx, shape, zoom) {
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.radius, shape.startAngle, shape.endAngle);
        ctx.stroke();
    }

    drawEllipse(ctx, shape, zoom) {
        ctx.save();
        ctx.translate(shape.cx, shape.cy);
        if (shape.rotation) {
            ctx.rotate(shape.rotation * Math.PI / 180);
        }
        ctx.scale(shape.rx, shape.ry);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, 2 * Math.PI);
        ctx.restore();
        ctx.stroke();
    }

    drawPoint(ctx, shape, zoom) {
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, 2 / zoom, 0, 2 * Math.PI);
        ctx.fill();
    }

    drawText(ctx, shape, zoom) {
        ctx.save();
        // FIXED: text as geometric shape
        const worldSize = shape.size || 12; // World units
        ctx.font = `${worldSize}px Arial`; // Use world size directly
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        
        // Apply text-specific transformation
        const textRotation = shape.rotation || 0;
        ctx.translate(shape.x, shape.y);
        ctx.rotate(textRotation);
        ctx.scale(1, -1); // Flip Y-axis for text
        
        // Draw text at origin since we've translated
        ctx.fillText(shape.content || '', 0, 0);
        ctx.restore();
    }

    drawPolyline(ctx, shape, zoom) {
        if (!shape.points || shape.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
    }

    drawSpline(ctx, shape, zoom) {
        if (!shape.points || shape.points.length < 2) return;
        // Use smooth spline rendering if available
        if (typeof drawSmoothSpline === 'function') {
            drawSmoothSpline(ctx, shape.points);
        } else {
            // Fallback to polyline
            this.drawPolyline(ctx, shape, zoom);
        }
    }

    drawHatch(ctx, shape, zoom) {
        if (!shape.points || shape.points.length < 2) return;
        ctx.lineWidth = 0.5 / zoom;
        for (let i = 0; i < shape.points.length; i += 2) {
            if (i + 1 < shape.points.length) {
                ctx.beginPath();
                ctx.moveTo(shape.points[i].x, shape.points[i].y);
                ctx.lineTo(shape.points[i + 1].x, shape.points[i + 1].y);
                ctx.stroke();
            }
        }
    }

    drawRectangle(ctx, shape, zoom) {
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, shape.width, shape.height);
        ctx.stroke();
    }

    // === MIRROR OPERATIONS ===
    mirrorPoint(shape, x1, y1, x2, y2) {
        // Calculate mirror line parameters
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return shape;
        
        const nx = -dy / length; // Normal vector
        const ny = dx / length;
        
        // Vector from line start to point
        const px = shape.x - x1;
        const py = shape.y - y1;
        
        // Project onto normal and reflect
        const dot = px * nx + py * ny;
        shape.x = shape.x - 2 * dot * nx;
        shape.y = shape.y - 2 * dot * ny;
        
        return shape;
    }

    mirrorLine(shape, x1, y1, x2, y2) {
        // Create temporary point objects for mirroring
        const p1 = { x: shape.x1, y: shape.y1 };
        const p2 = { x: shape.x2, y: shape.y2 };
        
        this.mirrorPoint(p1, x1, y1, x2, y2);
        this.mirrorPoint(p2, x1, y1, x2, y2);
        
        shape.x1 = p1.x; shape.y1 = p1.y;
        shape.x2 = p2.x; shape.y2 = p2.y;
        
        return shape;
    }

    mirrorCircle(shape, x1, y1, x2, y2) {
        // Mirror center point
        const center = { x: shape.cx, y: shape.cy };
        this.mirrorPoint(center, x1, y1, x2, y2);
        shape.cx = center.x;
        shape.cy = center.y;
        
        return shape;
    }

    mirrorArc(shape, x1, y1, x2, y2) {
        // Mirror center like circle
        this.mirrorCircle(shape, x1, y1, x2, y2);
        
        // Mirror angles
        const temp = shape.startAngle;
        shape.startAngle = -shape.endAngle;
        shape.endAngle = -temp;
        
        return shape;
    }

    mirrorEllipse(shape, x1, y1, x2, y2) {
        // Mirror center like circle
        this.mirrorCircle(shape, x1, y1, x2, y2);
        
        // Mirror rotation angle
        shape.rotation = -(shape.rotation || 0);
        
        return shape;
    }

    mirrorText(shape, x1, y1, x2, y2) {
        // Mirror position like point
        return this.mirrorPoint(shape, x1, y1, x2, y2);
    }

    mirrorPolyline(shape, x1, y1, x2, y2) {
        if (shape.points) {
            shape.points.forEach(point => {
                this.mirrorPoint(point, x1, y1, x2, y2);
            });
        }
        
        return shape;
    }

    // Aliases for same mirroring logic
    mirrorPolygon(shape, x1, y1, x2, y2) {
        return this.mirrorPolyline(shape, x1, y1, x2, y2);
    }

    mirrorSpline(shape, x1, y1, x2, y2) {
        return this.mirrorPolyline(shape, x1, y1, x2, y2);
    }

    mirrorHatch(shape, x1, y1, x2, y2) {
        return this.mirrorPolyline(shape, x1, y1, x2, y2);
    }

    mirrorRectangle(shape, x1, y1, x2, y2) {
        // Mirror corner point
        return this.mirrorPoint(shape, x1, y1, x2, y2);
    }

    // === ENHANCED RENDERING METHODS ===
    // Integration with new enhanced rendering core for consistency

    enhancedRenderLine(ctx, shape, zoom, isSelected = false) {
        if (typeof drawShape === 'function') {
            return drawShape(ctx, shape, zoom, isSelected);
        }
        return this.drawLine(ctx, shape, zoom, isSelected);
    }

    enhancedRenderCircle(ctx, shape, zoom, isSelected = false) {
        if (typeof drawShape === 'function') {
            return drawShape(ctx, shape, zoom, isSelected);
        }
        return this.drawCircle(ctx, shape, zoom, isSelected);
    }

    enhancedRenderArc(ctx, shape, zoom, isSelected = false) {
        if (typeof drawShape === 'function') {
            return drawShape(ctx, shape, zoom, isSelected);
        }
        return this.drawArc(ctx, shape, zoom, isSelected);
    }

    enhancedRenderEllipse(ctx, shape, zoom, isSelected = false) {
        if (typeof drawShape === 'function') {
            return drawShape(ctx, shape, zoom, isSelected);
        }
        return this.drawEllipse(ctx, shape, zoom, isSelected);
    }

    enhancedRenderPoint(ctx, shape, zoom, isSelected = false) {
        if (typeof drawShape === 'function') {
            return drawShape(ctx, shape, zoom, isSelected);
        }
        return this.drawPoint(ctx, shape, zoom, isSelected);
    }

    enhancedRenderText(ctx, shape, zoom, isSelected = false) {
        if (typeof drawShape === 'function') {
            return drawShape(ctx, shape, zoom, isSelected);
        }
        return this.drawText(ctx, shape, zoom, isSelected);
    }

    enhancedRenderPolyline(ctx, shape, zoom, isSelected = false) {
        if (typeof drawShape === 'function') {
            return drawShape(ctx, shape, zoom, isSelected);
        }
        return this.drawPolyline(ctx, shape, zoom, isSelected);
    }

    enhancedRenderSpline(ctx, shape, zoom, isSelected = false) {
        if (typeof drawShape === 'function') {
            return drawShape(ctx, shape, zoom, isSelected);
        }
        return this.drawSpline(ctx, shape, zoom, isSelected);
    }

    enhancedRenderHatch(ctx, shape, zoom, isSelected = false) {
        if (typeof drawShape === 'function') {
            return drawShape(ctx, shape, zoom, isSelected);
        }
        return this.drawHatch(ctx, shape, zoom, isSelected);
    }

    enhancedRenderRectangle(ctx, shape, zoom, isSelected = false) {
        if (typeof drawShape === 'function') {
            return drawShape(ctx, shape, zoom, isSelected);
        }
        return this.drawRectangle(ctx, shape, zoom, isSelected);
    }

    // Enhanced rendering dispatcher
    enhancedRender(shapeType, ctx, shape, zoom, isSelected = false) {
        const operation = this.operations[shapeType]?.enhancedRender;
        if (operation) {
            return operation(ctx, shape, zoom, isSelected);
        }
        
        // Fallback to regular drawing
        return this.execute('draw', shapeType, ctx, shape, zoom, isSelected);
    }
    
    // HOVER HIGHLIGHTING METHODS
    
    /**
     * Draw hover highlight for line
     */
    hoverLine(ctx, shape, zoom) {
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
        return true;
    }
    
    /**
     * Draw hover highlight for polyline
     */
    hoverPolyline(ctx, shape, zoom) {
        if (!shape.points || shape.points.length === 0) return false;
        
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
        return true;
    }
    
    /**
     * Draw hover highlight for spline
     */
    hoverSpline(ctx, shape, zoom) {
        if (!shape.points || shape.points.length === 0) return false;
        
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([]);
        
        // Use smooth spline drawing if available
        if (typeof drawSmoothSpline === 'function') {
            drawSmoothSpline(ctx, shape.points);
        } else {
            // Fallback to polyline-style drawing
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.stroke();
        }
        return true;
    }
}

// Create global instance for usage
window.shapeHandler = new ShapeHandler();

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShapeHandler;
}

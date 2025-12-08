// Track double click timing for middle mouse button
let lastMiddleClickTime = 0;

function _redraw() {
    // Update performance monitoring
    updatePerformanceStats();
    
    // Start frame diagnostics
    if (typeof window.renderDiagnostics !== 'undefined') {
        window.renderDiagnostics.startFrame();
    }
    
    // Update viewport cache for performance optimization
    updateViewportCache();
    
    // Use render stabilizer to fix issues at high zoom levels
    if (typeof window.renderStabilizer !== 'undefined') {
        // Check for extreme zoom values
        if (zoom > 1000 || zoom < 0.001) {
            if (typeof window.renderDiagnostics !== 'undefined') {
                window.renderDiagnostics.reportExtremeZoom(zoom);
            }
        }
        
        // Stabilized transformation and clearing
        window.renderStabilizer.setStableTransform(ctx, zoom, offsetX, offsetY);
        window.renderStabilizer.stableClearCanvas(ctx, zoom, offsetX, offsetY);
        
        // Update viewport bounds for culling
        window.renderStabilizer.updateViewportBounds(ctx, zoom, offsetX, offsetY);
    } else {
        // Fallback to standard rendering
        ctx.setTransform(zoom, 0, 0, -zoom, offsetX, canvas.height - offsetY);
        ctx.clearRect(-offsetX / zoom, -offsetY / zoom, canvas.width / zoom, canvas.height / zoom);
    }
    
    drawGrid();

    // Draw all shapes using enhanced rendering system with viewport culling
    let renderedCount = 0;
    let culledCount = 0;
    
    // Use viewport cache for performance optimization
    const shapesToRender = viewportCache.visibleShapes.size > 0 ? 
        Array.from(viewportCache.visibleShapes) : 
        Array.from(shapes.keys());
    
    for (const i of shapesToRender) {
        if (i >= shapes.length) continue; // Safety check
        const shape = shapes[i];
        
        // Hide original objects that are being moved during preview
        if (mode === 'move' && movePreviewActive && moveStep === 2 && moveObjectsToMove.has(i)) {
            // Skip drawing original objects during move preview to avoid visual confusion
            continue;
        }
        
        // Hide original objects that are being rotated during preview
        if (mode === 'rotate' && rotatePreviewActive && rotateStep === 2 && rotateObjectsToRotate.has(i)) {
            // Skip drawing original objects during rotate preview to avoid visual confusion
            continue;
        }
        
        // Viewport culling for improved performance - already handled by viewport cache
        // Additional check with render stabilizer if available
        if (typeof window.renderStabilizer !== 'undefined') {
            if (!window.renderStabilizer.isShapeVisible(shape)) {
                culledCount++;
                if (typeof window.renderDiagnostics !== 'undefined') {
                    window.renderDiagnostics.reportCulledObject();
                }
                continue; // Skip objects outside viewport
            }
        }
        
        renderedCount++;
        
        // Use enhanced shape rendering with proper coordinate transformation
        if (typeof drawShape === 'function') {
            // Enhanced rendering with coordinate transformation
            drawShape(ctx, shape, zoom, i);
        } else {
            // Fallback to standard rendering if enhanced system not available
            renderStandardShapes(ctx, shape, zoom, i);
        }
    }
    
    // Debug info for large drawings
    if (typeof console !== 'undefined' && shapes.length > 100 && renderedCount !== shapes.length) {
        console.log(`Rendered ${renderedCount} of ${shapes.length} shapes (culled: ${culledCount})`);
    }
    
    // Update rendering statistics for performance monitoring
    const totalCulled = shapes.length - shapesToRender.length + culledCount;
    if (shapes.length > 100 && totalCulled > 0) {
        console.log(`Viewport optimization: ${renderedCount} rendered, ${totalCulled} culled (${((totalCulled/shapes.length)*100).toFixed(1)}% performance gain)`);
    }
    
    // End frame diagnostics
    if (typeof window.renderDiagnostics !== 'undefined') {
        window.renderDiagnostics.endFrame();
        window.renderDiagnostics.reportRenderStats(renderedCount, totalCulled);
    }

    // Draw previews
    if (mode === 'line' && isDrawing && startX !== undefined && startY !== undefined && previewX !== undefined && previewY !== undefined) {
        // Line preview with solid line style (same as other objects)
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(previewX, previewY);
        ctx.stroke();
    } else if (mode === 'polyline' && polylinePoints.length > 0 && polylinePreviewActive) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.moveTo(polylinePoints[0].x, polylinePoints[0].y);
        for (let i = 1; i < polylinePoints.length; i++) {
            ctx.lineTo(polylinePoints[i].x, polylinePoints[i].y);
        }
        // Only draw preview line if we have valid preview coordinates
        if (previewX !== undefined && previewY !== undefined) {
            ctx.lineTo(previewX, previewY);
        }
        ctx.stroke();
    } else if (mode === 'circle' && isDrawing) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        const radius = Math.sqrt(Math.pow(previewX - startX, 2) + Math.pow(previewY - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
    } else if (mode === 'ellipse' && ellipsePreviewActive) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        drawEllipsePreview(ctx, previewX, previewY);
    } else if (mode === 'arc' && arcPoints.length > 0) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        
        if (arcDrawingStep === 1) {
            // Drawing line from start to current cursor position
            ctx.beginPath();
            ctx.moveTo(arcPoints[0].x, arcPoints[0].y);
            ctx.lineTo(previewX, previewY);
            ctx.stroke();
        } else if (arcDrawingStep === 2 && arcPoints.length === 2) {
            // Drawing preview arc with variable amplitude based on cursor distance
            const startPoint = arcPoints[0];
            const endPoint = arcPoints[1];
            
            // Calculate the chord (straight line distance between start and end)
            const chordLength = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
            
            // Calculate the distance from cursor to the chord line
            const A = endPoint.y - startPoint.y;
            const B = startPoint.x - endPoint.x;
            const C = endPoint.x * startPoint.y - startPoint.x * endPoint.y;
            const distanceToChord = Math.abs(A * previewX + B * previewY + C) / Math.sqrt(A * A + B * B);
            
            // Calculate the sagitta (height of the arc) based on cursor distance
            const sagitta = Math.max(distanceToChord, 1); // Minimum sagitta to avoid division by zero
            
            // Calculate radius from sagitta and chord length
            const radius = (sagitta * sagitta + (chordLength / 2) * (chordLength / 2)) / (2 * sagitta);
            
            // Calculate center point
            const midPointX = (startPoint.x + endPoint.x) / 2;
            const midPointY = (startPoint.y + endPoint.y) / 2;
            
            // Calculate perpendicular direction to the chord
            const chordDirX = endPoint.x - startPoint.x;
            const chordDirY = endPoint.y - startPoint.y;
            const perpDirX = -chordDirY / chordLength;
            const perpDirY = chordDirX / chordLength;
            
            // Determine which side of the chord the cursor is on
            const crossProduct = (previewX - startPoint.x) * (endPoint.y - startPoint.y) - (previewY - startPoint.y) * (endPoint.x - startPoint.x);
            const side = crossProduct > 0 ? 1 : -1;
            
            // Calculate center position
            const centerDistance = radius - sagitta;
            const centerX = midPointX + side * perpDirX * centerDistance;
            const centerY = midPointY + side * perpDirY * centerDistance;
            
            // Calculate angles
            const startAngle = Math.atan2(startPoint.y - centerY, startPoint.x - centerX);
            const endAngle = Math.atan2(endPoint.y - centerY, endPoint.x - centerX);
            
            // Determine sweep direction
            let drawStartAngle = startAngle;
            let drawEndAngle = endAngle;
            
            if (side > 0) {
                // Counter-clockwise
                if (drawEndAngle < drawStartAngle) {
                    drawEndAngle += 2 * Math.PI;
                }
            } else {
                // Clockwise - swap angles
                if (drawStartAngle < drawEndAngle) {
                    drawStartAngle += 2 * Math.PI;
                }
                [drawStartAngle, drawEndAngle] = [drawEndAngle, drawStartAngle];
            }
            
            // Draw the preview arc
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, drawStartAngle, drawEndAngle);
            ctx.stroke();
            
            // Draw the preview arc with thicker line
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2 / zoom;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, drawStartAngle, drawEndAngle);
            ctx.stroke();
            
            // Calculate and display arc angle in degrees
            let arcAngle = Math.abs(drawEndAngle - drawStartAngle);
            if (arcAngle > Math.PI) {
                arcAngle = 2 * Math.PI - arcAngle; // Show smaller angle
            }
            const degrees = (arcAngle * 180 / Math.PI).toFixed(0);
            
            // Display angle text near the arc (always horizontal)
            ctx.save(); // Save current transformation
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation to screen coordinates
            
            // Position text at the middle of the arc, but convert to screen coordinates
            const midAngle = (drawStartAngle + drawEndAngle) / 2;
            const textRadius = radius + 15 / zoom;
            const worldTextX = centerX + Math.cos(midAngle) * textRadius;
            const worldTextY = centerY + Math.sin(midAngle) * textRadius;
            
            // Convert world coordinates to screen coordinates
            const [screenTextX, screenTextY] = worldToScreen(worldTextX, worldTextY);
            
            ctx.fillStyle = '#0ff';
            ctx.font = '14px Arial'; // Fixed font size for readability
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.fillText(`${degrees}deg`, screenTextX, screenTextY);
            
            ctx.restore(); // Restore previous transformation
            
            // Draw start and end points
            ctx.fillStyle = '#ff0';  // Yellow for start/end points
            ctx.beginPath();
            ctx.arc(startPoint.x, startPoint.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(endPoint.x, endPoint.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
        }
    } else if (mode === 'rectangle' && isDrawing) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;

        // New numeric workflow preview when angle step active
    if (rectangleStep === 3) {
            const w = Math.max(0, rectangleWidth);
            const h = Math.max(0, rectangleHeight);
            const a = rectangleAngle; // radians
            const cx = rectangleStartX;
            const cy = rectangleStartY;

            // Define local rectangle points from first corner (pivot) at (0,0)
            const pts = [
                { x: 0, y: 0 },
                { x: w * rectangleWidthSign, y: 0 },
                { x: w * rectangleWidthSign, y: h * rectangleHeightSign },
                { x: 0, y: h * rectangleHeightSign },
                { x: 0, y: 0 }
            ];

            // Rotate and translate
            const cosA = Math.cos(a);
            const sinA = Math.sin(a);
            ctx.beginPath();
            for (let i = 0; i < pts.length; i++) {
                const px = pts[i].x * cosA - pts[i].y * sinA + cx;
                const py = pts[i].x * sinA + pts[i].y * cosA + cy;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        } else if (rectangleStep === 1) {
            // Legacy drag preview: first corner to cursor
            const minX = Math.min(rectangleStartX, previewX);
            const maxX = Math.max(rectangleStartX, previewX);
            const minY = Math.min(rectangleStartY, previewY);
            const maxY = Math.max(rectangleStartY, previewY);

            ctx.beginPath();
            ctx.rect(minX, minY, maxX - minX, maxY - minY);
            ctx.stroke();
        }
    } else if (mode === 'polygon' && polygonStep === 2 && previewX !== undefined && previewY !== undefined) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        
        // Show polygon preview with current radius and rotation
        const radius = Math.sqrt(Math.pow(previewX - polygonCenterX, 2) + Math.pow(previewY - polygonCenterY, 2));
        const mouseAngle = Math.atan2(previewY - polygonCenterY, previewX - polygonCenterX);
        drawPolygonPreview(ctx, polygonCenterX, polygonCenterY, radius, mouseAngle);
    } else if (mode === 'spline' && splinePoints.length > 0) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1 / zoom;
        
        // Create preview points including current mouse position
        const allPoints = [...splinePoints];
        if (splinePreviewActive) {
            allPoints.push({ x: previewX, y: previewY });
        }
        
        if (allPoints.length > 1) {
            // Draw smooth spline curve using bezier curves
            drawSmoothSpline(ctx, allPoints);
        } else if (allPoints.length === 1) {
            // Just draw a point for the first click
            ctx.beginPath();
            ctx.arc(allPoints[0].x, allPoints[0].y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
        }
    } else if (mode === 'hatch' && hatchPoints.length > 0) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 0.5 / zoom;
        for (let i = 0; i < hatchPoints.length; i += 2) {
            if (i+1 < hatchPoints.length) {
                ctx.beginPath();
                ctx.moveTo(hatchPoints[i].x, hatchPoints[i].y);
                ctx.lineTo(hatchPoints[i+1].x, hatchPoints[i+1].y);
                ctx.stroke();
            }
        }
    }

    // Draw move preview and selected objects visualization
    if (mode === 'move') {
        // Show selected objects for move with different highlighting (only during selection phase)
        if (moveObjectsToMove.size > 0 && moveStep < 2) {
            ctx.save();
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([3 / zoom, 3 / zoom]);
            ctx.globalAlpha = 0.8;
            
            for (const index of moveObjectsToMove) {
                if (index < shapes.length) {
                    const shape = shapes[index];
                    // Draw outline around selected objects
                    drawShapeOutline(ctx, shape);
                }
            }
            ctx.restore();
        }
        
        // Draw move preview during destination selection (floating objects)
        if (movePreviewActive && moveStep === 2 && previewX !== undefined && previewY !== undefined) {
            // Calculate displacement so that base point moves to cursor position
            const dx = previewX - moveBasePoint.x;
            const dy = previewY - moveBasePoint.y;
            
            ctx.save();
            
            // Draw preview of moved objects (floating effect)
            for (const index of moveObjectsToMove) {
                if (index < shapes.length) { // Safety check
                    const shape = shapes[index];
                    drawMovePreview(ctx, shape, dx, dy, zoom);
                }
            }
            
            // Draw displacement vector (only if mouse moved from base point)
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                ctx.setLineDash([2 / zoom, 2 / zoom]);
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 1 / zoom;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(moveBasePoint.x, moveBasePoint.y);
                ctx.lineTo(previewX, previewY);
                ctx.stroke();
            }
            
            // Draw cursor position marker (where base point will move to)
            ctx.setLineDash([]);
            ctx.fillStyle = '#ffff00';
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(previewX, previewY, 3 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw original base point marker (semi-transparent)
            ctx.fillStyle = '#ffff00';
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(moveBasePoint.x, moveBasePoint.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.restore();
        }
    }

    // Draw rotate preview and selected objects visualization
    if (mode === 'rotate') {
        // Show selected objects for rotate with different highlighting (only during selection phase)
        if (rotateObjectsToRotate.size > 0 && rotateStep < 2) {
            ctx.save();
            ctx.strokeStyle = '#ff8800'; // Orange for rotate selection
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([3 / zoom, 3 / zoom]);
            ctx.globalAlpha = 0.8;
            
            for (const index of rotateObjectsToRotate) {
                if (index < shapes.length) {
                    const shape = shapes[index];
                    // Draw outline around selected objects
                    drawShapeOutline(ctx, shape);
                }
            }
            ctx.restore();
        }
        
        // Draw rotate preview during angle selection (floating objects)
        if (rotatePreviewActive && rotateStep === 2 && previewX !== undefined && previewY !== undefined) {
            // Calculate rotation angle from center point to cursor position
            const dx = previewX - rotateBasePoint.x;
            const dy = previewY - rotateBasePoint.y;
            const currentAngle = Math.atan2(dy, dx);
            const rotationAngle = currentAngle - rotateStartAngle;
            
            ctx.save();
            
            // Draw preview of rotated objects (floating effect)
            for (const index of rotateObjectsToRotate) {
                if (index < shapes.length) { // Safety check
                    const shape = shapes[index];
                    drawRotatePreview(ctx, shape, rotateBasePoint.x, rotateBasePoint.y, rotationAngle, zoom);
                }
            }
            
            // Draw rotation indicator arc (only if mouse moved from center point)
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                const radius = Math.sqrt(dx * dx + dy * dy);
                ctx.setLineDash([2 / zoom, 2 / zoom]);
                ctx.strokeStyle = '#ff8800';
                ctx.lineWidth = 1 / zoom;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(rotateBasePoint.x, rotateBasePoint.y, radius * 0.3, rotateStartAngle, currentAngle);
                ctx.stroke();
                
                // Draw angle indicator line
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ff8800';
                ctx.lineWidth = 1 / zoom;
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.moveTo(rotateBasePoint.x, rotateBasePoint.y);
                ctx.lineTo(previewX, previewY);
                ctx.stroke();
            }
            
            // Draw cursor position marker (where rotation angle is measured to)
            ctx.setLineDash([]);
            ctx.fillStyle = '#ff8800';
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(previewX, previewY, 3 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw rotation center marker (highlighted)
            ctx.fillStyle = '#ff8800';
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(rotateBasePoint.x, rotateBasePoint.y, 4 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw center crosshair
            ctx.strokeStyle = '#ff8800';
            ctx.lineWidth = 1 / zoom;
            const crossSize = 6 / zoom;
            ctx.beginPath();
            ctx.moveTo(rotateBasePoint.x - crossSize, rotateBasePoint.y);
            ctx.lineTo(rotateBasePoint.x + crossSize, rotateBasePoint.y);
            ctx.moveTo(rotateBasePoint.x, rotateBasePoint.y - crossSize);
            ctx.lineTo(rotateBasePoint.x, rotateBasePoint.y + crossSize);
            ctx.stroke();
            
            ctx.restore();
        }
        
        // Draw scale preview during factor selection (scaling objects)
        if (scalePreviewActive && scaleStep === 2 && previewX !== undefined && previewY !== undefined) {
            // Calculate current scale factor from base point to cursor
            const dx = previewX - scaleBasePoint.x;
            const dy = previewY - scaleBasePoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const scaleFactor = Math.max(0.01, distance / 100);
            
            ctx.save();
            
            // Draw preview of scaled objects (floating effect)
            for (const index of scaleObjectsToScale) {
                if (index < shapes.length) { // Safety check
                    const shape = shapes[index];
                    drawScalePreview(ctx, shape, scaleBasePoint.x, scaleBasePoint.y, scaleFactor, zoom);
                }
            }
            
            ctx.restore();
        }
    }

    // Draw copy preview and selected objects visualization
    if (mode === 'copy') {
        // Show selected objects for copy with different highlighting (only during selection phase)
        if (copyObjectsToCopy.size > 0 && copyStep < 2) {
            ctx.save();
            ctx.strokeStyle = '#00ff00'; // Green for copy selection
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([3 / zoom, 3 / zoom]);
            ctx.globalAlpha = 0.8;
            
            for (const index of copyObjectsToCopy) {
                if (index < shapes.length) {
                    const shape = shapes[index];
                    // Draw outline around selected objects
                    drawShapeOutline(ctx, shape);
                }
            }
            ctx.restore();
        }
        
        // Draw copy preview during destination selection (floating objects)
        if (copyPreviewActive && copyStep === 2 && previewX !== undefined && previewY !== undefined) {
            // Calculate displacement so that base point moves to cursor position
            const dx = previewX - copyBasePoint.x;
            const dy = previewY - copyBasePoint.y;
            
            ctx.save();
            
            // Draw preview of copied objects (floating effect)
            for (const index of copyObjectsToCopy) {
                if (index < shapes.length) { // Safety check
                    const shape = shapes[index];
                    drawCopyPreview(ctx, shape, dx, dy, zoom);
                }
            }
            
            // Draw displacement vector (only if mouse moved from base point)
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                ctx.setLineDash([2 / zoom, 2 / zoom]);
                ctx.strokeStyle = '#00ff00'; // Green for copy
                ctx.lineWidth = 1 / zoom;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(copyBasePoint.x, copyBasePoint.y);
                ctx.lineTo(previewX, previewY);
                ctx.stroke();
            }
            
            // Draw cursor position marker (where base point will copy to)
            ctx.setLineDash([]);
            ctx.fillStyle = '#00ff00'; // Green for copy
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(previewX, previewY, 3 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw original base point marker (semi-transparent)
            ctx.fillStyle = '#00ff00'; // Green for copy
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(copyBasePoint.x, copyBasePoint.y, 2 / zoom, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.restore();
        }
        
        // Draw rotate preview during angle selection (rotating objects)
        if (rotatePreviewActive && rotateStep === 2 && previewX !== undefined && previewY !== undefined) {
            // Calculate current rotation angle from base point to cursor
            const dx = previewX - rotateBasePoint.x;
            const dy = previewY - rotateBasePoint.y;
            const currentAngle = Math.atan2(dy, dx);
            
            ctx.save();
            
            // Draw preview of rotated objects (floating effect)
            for (const index of rotateObjectsToRotate) {
                if (index < shapes.length) { // Safety check
                    const shape = shapes[index];
                    drawRotatePreview(ctx, shape, rotateBasePoint.x, rotateBasePoint.y, currentAngle, zoom);
                }
            }
            
            ctx.restore();
        }
    }

    if (snapMarker) {
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(snapMarker.x, snapMarker.y, 4 / zoom, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Area to PDF selection rectangle preview
    if (mode === 'area_to_pdf' && areaToPdfStep === 1 && areaToPdfStartX !== null && areaToPdfStartY !== null && previewX !== undefined && previewY !== undefined) {
        ctx.save();
        
        // Calculate rectangle bounds
        const minX = Math.min(areaToPdfStartX, previewX);
        const maxX = Math.max(areaToPdfStartX, previewX);
        const minY = Math.min(areaToPdfStartY, previewY);
        const maxY = Math.max(areaToPdfStartY, previewY);
        
        // Blinking green color with different intensities
        const baseColor = areaToPdfBlinkState ? '#00ff00' : '#00aa00'; // Bright green or darker green
        const fillAlpha = areaToPdfBlinkState ? 0.2 : 0.1; // More or less transparent
        
        // Draw main selection rectangle with blinking effect
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = areaToPdfBlinkState ? 3 / zoom : 2 / zoom; // Thicker when bright
        ctx.setLineDash([8 / zoom, 4 / zoom]); // Dashed line
        ctx.fillStyle = `rgba(0, 255, 0, ${fillAlpha})`; // Semi-transparent green fill with varying opacity
        
        ctx.beginPath();
        ctx.rect(minX, minY, maxX - minX, maxY - minY);
        ctx.fill(); // Fill first
        ctx.stroke(); // Then stroke
        
        // Draw outer border for better contrast (also blinking)
        ctx.strokeStyle = areaToPdfBlinkState ? '#004400' : '#002200';
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([4 / zoom, 2 / zoom]);
        ctx.stroke();
        
        // Draw corner markers with enhanced blinking visibility
        ctx.setLineDash([]); // Solid for markers
        const markerSize = areaToPdfBlinkState ? 8 / zoom : 6 / zoom; // Larger when bright
        const markerHalf = markerSize / 2;
        
        // Blinking green corner squares
        ctx.fillStyle = baseColor;
        ctx.fillRect(minX - markerHalf, minY - markerHalf, markerSize, markerSize);
        ctx.fillRect(maxX - markerHalf, minY - markerHalf, markerSize, markerSize);
        ctx.fillRect(minX - markerHalf, maxY - markerHalf, markerSize, markerSize);
        ctx.fillRect(maxX - markerHalf, maxY - markerHalf, markerSize, markerSize);
        
        // Black outline for corner markers
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(minX - markerHalf, minY - markerHalf, markerSize, markerSize);
        ctx.strokeRect(maxX - markerHalf, minY - markerHalf, markerSize, markerSize);
        ctx.strokeRect(minX - markerHalf, maxY - markerHalf, markerSize, markerSize);
        ctx.strokeRect(maxX - markerHalf, maxY - markerHalf, markerSize, markerSize);
        
        // Draw area dimensions text with blinking effect
        const width = (maxX - minX).toFixed(1);
        const height = (maxY - minY).toFixed(1);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // Save context and reset transformation for text
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to screen coordinates
        
        // Convert world coordinates to screen coordinates for text
        const [screenCenterX, screenCenterY] = worldToScreen(centerX, centerY);
        
        // Text with blinking brightness
        ctx.fillStyle = areaToPdfBlinkState ? '#ffffff' : '#cccccc';
        ctx.font = '14px Arial'; // Fixed screen font size
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Background for text (semi-transparent black with blinking alpha)
        const textBgAlpha = areaToPdfBlinkState ? 0.8 : 0.6;
        ctx.fillStyle = `rgba(0, 0, 0, ${textBgAlpha})`;
        ctx.fillRect(screenCenterX - 40, screenCenterY - 8, 80, 16);
        
        // PDF export text
        ctx.fillStyle = areaToPdfBlinkState ? '#00ff00' : '#00cc00';
        ctx.fillText(`📄 ${width} × ${height}`, screenCenterX, screenCenterY);
        
        ctx.restore(); // Restore world coordinates
        
        ctx.restore();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ============================================================================
// REDRAW WRAPPER - Optimized rendering with requestAnimationFrame
// ============================================================================

let pendingDraw = false;

function redraw() {
    if (!pendingDraw) {
        pendingDraw = true;
        requestAnimationFrame(() => {
            try {
                _redraw();
            } catch (error) {
                console.error('Error during redraw:', error);
                if (typeof window.renderDiagnostics !== 'undefined') {
                    window.renderDiagnostics.reportError('redraw_error', error);
                }
            } finally {
                pendingDraw = false;
            }
        });
    }
}

window.redraw = redraw;

// === Helper functions for drawing previews ===
function drawEllipsePreview(ctx, cursorX, cursorY) {
    if (ellipseDrawingStep === 1) {
        // Preview major radius from center to cursor (same style as circle)
        const majorRadius = Math.sqrt(Math.pow(cursorX - ellipseCenter.x, 2) + Math.pow(cursorY - ellipseCenter.y, 2));
        
        if (majorRadius > 0) {
            ctx.beginPath();
            ctx.arc(ellipseCenter.x, ellipseCenter.y, majorRadius, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        // Draw center point (simple dot like circle)
        ctx.beginPath();
        ctx.arc(ellipseCenter.x, ellipseCenter.y, 2 / zoom, 0, 2 * Math.PI);
        ctx.fill();
        
    } else if (ellipseDrawingStep === 2) {
        // Preview ellipse with major radius fixed and minor radius from cursor
        const minorRadius = Math.sqrt(Math.pow(cursorX - ellipseCenter.x, 2) + Math.pow(cursorY - ellipseCenter.y, 2));
        
        if (ellipseMajorRadius > 0 && minorRadius > 0) {
            // Use the same simple style as circle preview
            if (ctx.ellipse) {
                ctx.beginPath();
                ctx.ellipse(ellipseCenter.x, ellipseCenter.y, ellipseMajorRadius, minorRadius, 0, 0, 2 * Math.PI);
                ctx.stroke();
            } else {
                // Fallback for older browsers - but keep it simple
                ctx.save();
                ctx.translate(ellipseCenter.x, ellipseCenter.y);
                ctx.scale(ellipseMajorRadius, minorRadius);
                ctx.beginPath();
                ctx.arc(0, 0, 1, 0, 2 * Math.PI);
                ctx.restore();
                ctx.stroke();
            }
        }
        
        // Draw center point (simple dot like circle)
        ctx.beginPath();
        ctx.arc(ellipseCenter.x, ellipseCenter.y, 2 / zoom, 0, 2 * Math.PI);
        ctx.fill();
    }
}

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = 1.1;
    const [mx, my] = screenToWorld(e.offsetX, e.offsetY);
    zoom *= (e.deltaY < 0) ? factor : 1 / factor;
    zoom = Math.max(0.001, Math.min(1000, zoom));
    offsetX = e.offsetX - mx * zoom;
    offsetY = canvas.height - e.offsetY - my * zoom;
    
    redraw();
});



// Draw smooth spline curve using improved bezier curves
function drawSmoothSpline(ctx, points) {
    if (points.length < 2) return;
    
    ctx.beginPath();
    
    if (points.length === 2) {
        // Just draw a straight line for 2 points
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
    } else if (points.length === 3) {
        // For 3 points, use quadratic curve
        ctx.moveTo(points[0].x, points[0].y);
        ctx.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
    } else {
        // For 4+ points, use cubic bezier curves with smoothing
        ctx.moveTo(points[0].x, points[0].y);
        
        // Calculate control points for smooth curves
        const smoothing = 0.2; // Smoothing factor (0-1, lower = smoother)
        
        for (let i = 1; i < points.length - 1; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Calculate control points for smooth curve
            const cp1x = p1.x - smoothing * (p2.x - p0.x);
            const cp1y = p1.y - smoothing * (p2.y - p0.y);
            
            if (i === 1) {
                // First curve segment
                ctx.quadraticCurveTo(cp1x, cp1y, p1.x, p1.y);
            } else {
                // Calculate second control point from previous iteration
                const prevP = points[i - 2];
                const cp2x = p0.x + smoothing * (p1.x - prevP.x);
                const cp2y = p0.y + smoothing * (p1.y - prevP.y);
                
                ctx.bezierCurveTo(cp2x, cp2y, cp1x, cp1y, p1.x, p1.y);
            }
        }
        
        // Final segment to last point
        const lastIdx = points.length - 1;
        const secondLastIdx = lastIdx - 1;
        const thirdLastIdx = Math.max(0, lastIdx - 2);
        
        const p1 = points[secondLastIdx];
        const p2 = points[lastIdx];
        const p0 = points[thirdLastIdx];
        
        const cp2x = p1.x + smoothing * (p2.x - p0.x);
        const cp2y = p1.y + smoothing * (p2.y - p0.y);
        
        ctx.quadraticCurveTo(cp2x, cp2y, p2.x, p2.y);
    }
    
    ctx.stroke();
}

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // Middle mouse button
        e.preventDefault(); // Prevent browser default behavior
        
        // Only handle zoom to fit if we're not in an active drawing mode
        const activeDrawingModes = ['line', 'circle', 'arc', 'ellipse', 'polyline', 'polygon', 'spline', 'text'];
        const isActiveDrawing = activeDrawingModes.includes(mode) && (
            (mode === 'ellipse' && ellipseDrawingStep > 0) ||
            (mode === 'polyline' && polylinePoints.length > 0) ||
            (mode === 'polygon' && polygonPoints.length > 0) ||
            (mode === 'spline' && splinePoints.length > 0) ||
            (mode === 'arc' && arcDrawingStep > 0) ||
            (mode === 'circle' && circleDrawingStep > 0)
        );
        
        if (!isActiveDrawing) {
            const currentTime = Date.now();
            if (currentTime - lastMiddleClickTime < 400) { // Double click detected
                zoomToFit();
                redraw();
                addToHistory('Double-click zoom to fit executed');
                return; // Don't start panning after zoom to fit
            }
            lastMiddleClickTime = currentTime;
        }
        
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvas.style.cursor = 'grab';
        return;
    }

    // Blur command input when clicking on canvas for seamless workflow
    const commandInput = document.getElementById('commandInput');
    if (commandInput && document.activeElement === commandInput) {
        commandInput.blur();
    }

    // Prevent default to avoid conflicts with length input
    e.preventDefault();

    let [x, y] = screenToWorld(e.offsetX, e.offsetY);
    const osnap = findOsnap(x, y);
    if (osnap) [x, y] = [osnap.x, osnap.y];
    [x, y] = applySnap(x, y);

    // Use mode-specific handlers
    switch(mode) {
        case 'select':
            handleSelectMode(x, y, e);
            break;
        case 'move':
            handleMoveMode(x, y, e);
            break;
        case 'copy':
            handleCopyMode(x, y, e);
            break;
        case 'rotate':
            handleRotateMode(x, y, e);
            break;
        case 'scale':
            handleScaleMode(x, y, e);
            break;
        case 'area_to_pdf':
            handleAreaToPdfMode(x, y, e);
            break;
        case 'line':
            handleLineMode(x, y, e);
            break;
        case 'polyline':
            handlePolylineMode(x, y, e);
            break;
        case 'circle':
            handleCircleMode(x, y, e);
            break;
        case 'ellipse':
            handleEllipseMode(x, y, e);
            break;
        case 'arc':
            handleArcMode(x, y, e);
            break;
        case 'rectangle':
            handleRectangleMode(x, y, e);
            break;
        case 'polygon':
            if (polygonStep === 0) {
                // First click: set center and ask for number of sides
                polygonCenterX = x;
                polygonCenterY = y;
                polygonStep = 1;
                isDrawing = true;
                showLengthInput(e.offsetX, e.offsetY);
                updateLengthInputLabel('Number of sides:');
                updateHelpBar('Step 2/3: Enter number of sides (3-99) for polygon');
                addToHistory(`Polygon center set at (${x.toFixed(2)}, ${y.toFixed(2)}) - enter number of sides`);
            } else if (polygonStep === 2) {
                // Second click: set radius and rotation based on distance and angle from center
                const radius = Math.sqrt(Math.pow(x - polygonCenterX, 2) + Math.pow(y - polygonCenterY, 2));
                const angle = Math.atan2(y - polygonCenterY, x - polygonCenterX);
                polygonRadius = radius;
                polygonAngle = angle;
                createFinalPolygon();
                updateHelpBar('Polygon completed! Returning to selection mode...');
                setTimeout(() => {
                    updateHelpBar('Use drawing tools to create shapes');
                }, 2000);
                resetPolygonMode();
                redraw();
            }
            break;
        case 'spline':
            handleSplineMode(x, y, e);
            break;
        case 'hatch':
            handleHatchMode(x, y, e);
            break;
        case 'point':
            addShape(createShapeWithProperties({ type: 'point', x, y }));
            updateHelpBar('Point placed! Click to place another point or press Escape to finish');
            addToHistory(`Point created at (${x.toFixed(2)}, ${y.toFixed(2)})`);
            redraw();
            break;
        case 'text':
            // Create temporary text shape and open professional edit dialog
            const tempTextShape = {
                type: 'text',
                x: x,
                y: y,
                content: '',
                size: 12,
                height: 12,
                align: 'left',
                rotation: 0,
                color: currentColor,
                lineWeight: currentLineWeight,
                layer: currentLayer
            };
            textPosition = { x, y };
            // Store as pending text (will be added when dialog is confirmed)
            window.pendingTextShape = tempTextShape;
            startTextEditing(tempTextShape, -1); // -1 indicates new text
            break;
        case 'paste':
            if (typeof pasteShapes === 'function') {
                pasteShapes(x, y);
            }
            break;
        case 'rotate':
            handleRotateMode(x, y, e);
            break;
        // case 'scale': // ВИМКНЕНО
        //     handleScaleMode(x, y, e);
        //     break;
        case 'mirror':
            handleMirrorMode(x, y, e);
            break;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 1) { // Middle mouse button
        isPanning = false;
        canvas.style.cursor = 'crosshair';
        return;
    }

    if (mode === 'select' && isDrawing) {
        isDrawing = false;
        selectionWindow.style.display = 'none';

        let [x, y] = screenToWorld(e.offsetX, e.offsetY);
        const osnap = findOsnap(x, y);
        if (osnap) [x, y] = [osnap.x, osnap.y];
        [x, y] = applySnap(x, y);

        // Determine if this was a click or a drag
        const dragDistance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));

        if (dragDistance < 5 / zoom) {
            // Single click - select single object
            let found = false;
            for (let i = 0; i < shapes.length; i++) {
                const shape = shapes[i];
                if (isPointInShape(shape, x, y)) {
                    // Check if shape can be modified (layer not locked)
                    if (typeof canModifyShape === 'function' && !canModifyShape(shape)) {
                        addToHistory(`Cannot select object on locked layer: ${shape.layer || 'Default'}`);
                        found = true; // Still consider it found, but don't select
                        break;
                    }
                    
                    if (e.shiftKey && selectedShapes.has(i)) {
                        // If shift is held and object is already selected, deselect it
                        selectedShapes.delete(i);
                    } else {
                        selectedShapes.add(i);
                    }
                    found = true;
                    // Shape selected
                    break;
                }
            }
            if (!found) {
                // No shape found at cursor position
            }
            addToHistory(`Selected ${selectedShapes.size} objects`);
        } else {
            // Drag - window selection
            const isWindowSelection = e.offsetX > selectionWindowStartX;
            let selectedCount = 0;
            let lockedCount = 0;

            for (let i = 0; i < shapes.length; i++) {
                const shape = shapes[i];
                let shouldSelect = false;

                if (isWindowSelection) {
                    // Window selection - must be entirely within window
                    shouldSelect = isShapeInWindow(shape, startX, startY, x, y);
                } else {
                    // Crossing selection - intersects with window
                    shouldSelect = doesShapeIntersectWindow(shape, startX, startY, x, y);
                }

                if (shouldSelect) {
                    // Check if shape can be modified (layer not locked)
                    if (typeof canModifyShape === 'function' && !canModifyShape(shape)) {
                        lockedCount++;
                        continue; // Skip locked shapes
                    }
                    
                    if (e.shiftKey && selectedShapes.has(i)) {
                        selectedShapes.delete(i);
                    } else {
                        selectedShapes.add(i);
                        selectedCount++;
                    }
                }
            }
            
            let message = `${isWindowSelection ? 'Window' : 'Crossing'} selected ${selectedShapes.size} objects`;
            if (lockedCount > 0) {
                message += ` (${lockedCount} objects skipped - on locked layers)`;
            }
            addToHistory(message);
        }

        redraw();
        
        // Update properties panel if it's open
        const propertiesPanel = document.getElementById('propertiesPanel');
        if (propertiesPanel && propertiesPanel.style.display !== 'none') {
            updatePropertiesPanel();
        }
    }
});

let selectionWindowStartX = 0;
let selectionWindowStartY = 0;

canvas.addEventListener('mousemove', (e) => {
    // Store current mouse position
    currentMouseX = e.offsetX;
    currentMouseY = e.offsetY;
    if (isPanning) {
        offsetX += e.clientX - panStartX;
        offsetY -= e.clientY - panStartY;
        panStartX = e.clientX;
        panStartY = e.clientY;
        redraw();
        return;
    }

    let [x, y] = screenToWorld(e.offsetX, e.offsetY);
    const osnap = findOsnap(x, y);
    snapMarker = osnap;
    if (osnap) [x, y] = [osnap.x, osnap.y];
    [x, y] = applySnap(x, y);

    if (mode === 'select' && isDrawing) {
        // Update selection window
        const [sx, sy] = worldToScreen(startX, startY);
        const [ex, ey] = worldToScreen(x, y);

        selectionWindow.style.left = `${Math.min(sx, ex)}px`;
        selectionWindow.style.top = `${Math.min(sy, ey)}px`;
        selectionWindow.style.width = `${Math.abs(ex - sx)}px`;
        selectionWindow.style.height = `${Math.abs(ey - sy)}px`;

        // Set class based on selection type (window or crossing)
        const isWindowSelection = e.offsetX > selectionWindowStartX;
        if (isWindowSelection) {
            selectionWindow.className = 'selection-window window-selection';
        } else {
            selectionWindow.className = 'selection-window crossing-selection';
        }
    }
    else if ((mode === 'line' || mode === 'circle' || mode === 'ellipse' || mode === 'polygon') && isDrawing) {
        [x, y] = applyOrtho(x, y, startX, startY);
        [previewX, previewY] = [x, y];
        
        // Update length input position and direction for line, circle and ellipse modes
        if (mode === 'line') {
            updateLengthInputPosition(e.offsetX, e.offsetY);
            // Calculate normalized direction vector
            const dx = x - startX;
            const dy = y - startY;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
                lineDirection.x = dx / length;
                lineDirection.y = dy / length;
            }
        } else if (mode === 'circle') {
            updateLengthInputPosition(e.offsetX, e.offsetY);
            // For circle, we don't need direction, just radius (distance from center)
        } else if (mode === 'ellipse' && ellipsePreviewActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
            // For ellipse, distance from center determines current radius
        }
        
        redraw();
    }
    else if (mode === 'ellipse' && ellipsePreviewActive) {
        [previewX, previewY] = [x, y];
        
        // Update length input position if active
        if (isLengthInputActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
        }
        
        redraw();
    }
    else if (mode === 'rectangle' && isDrawing) {
        // During width/height steps, keep input near cursor
        if (isLengthInputActive && (rectangleStep === 1 || rectangleStep === 2 || rectangleStep === 3)) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
        }

        if (rectangleStep === 1) {
            // Legacy two-corner preview; also store preview point
            [x, y] = applyOrtho(x, y, rectangleStartX, rectangleStartY);
            [previewX, previewY] = [x, y];
        } else if (rectangleStep === 3) {
            // Angle preview by mouse; width/height already known
            const dx = x - rectangleStartX;
            const dy = y - rectangleStartY;
            let angle = Math.atan2(dy, dx);
            if (orthoMode) {
                const snap = 15 * Math.PI / 180;
                angle = Math.round(angle / snap) * snap;
            }
            rectangleAngle = angle;
            [previewX, previewY] = [x, y];
        } else {
            [previewX, previewY] = [x, y];
        }

        redraw();
    }
    else if (mode === 'arc' && arcPoints.length > 0) {
        [previewX, previewY] = [x, y];
        redraw();
    }
    else if (mode === 'polyline' && polylinePoints.length > 0) {
        const last = polylinePoints[polylinePoints.length - 1];
        [x, y] = applyOrtho(x, y, last.x, last.y);
        [previewX, previewY] = [x, y];
        
        // Always show preview when we have points
        polylinePreviewActive = true;
        
        // Update length input position if active
        if (isLengthInputActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
            
            // Calculate normalized direction vector for length input
            const dx = x - last.x;
            const dy = y - last.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
                polylineDirection.x = dx / length;
                polylineDirection.y = dy / length;
            }
        }
        
        redraw();
    }
    else if (mode === 'spline' && splinePoints.length > 0) {
        [previewX, previewY] = [x, y];
        
        // Always show preview when we have points
        splinePreviewActive = true;
        
        // Update length input position if active
        if (isLengthInputActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
            
            // Calculate normalized direction vector for length input
            const last = splinePoints[splinePoints.length - 1];
            const dx = x - last.x;
            const dy = y - last.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
                polylineDirection.x = dx / length; // Reuse polylineDirection for spline
                polylineDirection.y = dy / length;
            }
        }
        
        redraw();
    }
    else if (mode === 'polygon' && polygonStep === 2) {
        // Show polygon preview while dragging
        [previewX, previewY] = [x, y];
        
        // Update length input position if active
        if (isLengthInputActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
        }
        
        redraw();
    }
    else if (mode === 'move' && movePreviewActive && moveStep === 2) {
        // Update preview coordinates for move mode - this makes objects follow cursor
        [previewX, previewY] = [x, y];
        redraw();
    }
    else if (mode === 'copy' && copyPreviewActive && copyStep === 2) {
        // Update preview coordinates for copy mode - this makes objects follow cursor
        [previewX, previewY] = [x, y];
        redraw();
    }
    else if (mode === 'rotate' && rotatePreviewActive && rotateStep === 2) {
        // Update preview coordinates for rotate mode - this makes objects follow cursor
        [previewX, previewY] = [x, y];
        
        // Update angle input position if active
        if (isLengthInputActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
        }
        
        // Calculate and display current rotation angle
        const dx = x - rotateBasePoint.x;
        const dy = y - rotateBasePoint.y;
        const currentAngle = Math.atan2(dy, dx);
        const angleDegrees = (currentAngle * 180 / Math.PI).toFixed(1);
        updateHelpBar(`Step 3/3: Rotation angle: ${angleDegrees}° - Type angle + Enter or click to confirm`);
        
        redraw();
    }
    else if (mode === 'scale' && scalePreviewActive && scaleStep === 2) {
        // Update preview coordinates for scale mode - this makes objects follow cursor
        [previewX, previewY] = [x, y];
        
        // Update scale input position if active
        if (isLengthInputActive) {
            updateLengthInputPosition(e.offsetX, e.offsetY);
        }
        
        // Calculate and display current scale factor based on distance
        const dx = x - scaleBasePoint.x;
        const dy = y - scaleBasePoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scaleFactor = Math.max(0.01, distance / 100);
        updateHelpBar(`Step 3/3: Scale factor: ${scaleFactor.toFixed(2)} - Type factor + Enter or click to confirm`);
        
        redraw();
    }
    // else if (mode === 'scale' && scaleStep === 2) { // ВИМКНЕНО
    //     // Update scale factor preview
    //     const distance = Math.sqrt((x - scaleBasePoint.x) ** 2 + (y - scaleBasePoint.y) ** 2);
    //     const factor = distance / scaleStartDistance;
    //     updateHelpBar(`Scale factor: ${factor.toFixed(2)}`);
    //     redraw();
    // }
    else if (mode === 'area_to_pdf' && areaToPdfStep === 1) {
        // Update preview rectangle for area selection
        [previewX, previewY] = [x, y];
        redraw();
    }

    if (!isDrawing) redraw();

    // REMOVED: Hover highlighting disabled per user request
    // No more blue highlighting when hovering over objects

    if (cursorCoordsElement) {
        cursorCoordsElement.textContent = `X: ${x.toFixed(2)} Y: ${y.toFixed(2)}`;
    }
});

canvas.addEventListener('mouseleave', () => {
    if (cursorCoordsElement) {
        cursorCoordsElement.textContent = 'X: - Y: -';
    }
});

canvas.addEventListener('dblclick', (e) => {
    e.preventDefault();
    
    // Only handle double-click in select mode
    if (mode !== 'select') return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const [x, y] = screenToWorld(clientX, clientY);
    
    // Find text shape under cursor
    for (let i = shapes.length - 1; i >= 0; i--) {
        const shape = shapes[i];
        if (shape.type === 'text' && isPointInShape(shape, x, y)) {
            // Start editing this text shape
            startTextEditing(shape, i);
            return;
        }
    }
});

window.addEventListener('resize', () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    redraw();
});

function drawPolygonPreview(ctx, centerX, centerY, radius, rotationAngle) {
    // Calculate actual radius based on type
    let actualRadius = radius;
    if (polygonRadiusType === 'inscribed') {
        // For inscribed polygon, convert apothem to circumradius
        actualRadius = radius / Math.cos(Math.PI / polygonSides);
    }
    
    ctx.beginPath();
    for (let i = 0; i <= polygonSides; i++) {
        const angle = i * 2 * Math.PI / polygonSides - Math.PI/2 + rotationAngle;
        const x = centerX + actualRadius * Math.cos(angle);
        const y = centerY + actualRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}
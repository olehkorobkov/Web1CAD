let areaToPdfMode = false;
let areaToPdfStartX = null;
let areaToPdfStartY = null;
let areaToPdfEndX = null;
let areaToPdfEndY = null;
let areaToPdfBlinkState = true;
let areaToPdfBlinkTimer = null;
let areaToPdfStep = 0;

function handleAreaToPdfMode(x, y, e) {
    if (areaToPdfStep === 0) {
        areaToPdfStartX = x;
        areaToPdfStartY = y;
        areaToPdfStep = 1;
        isDrawing = true;
        startAreaToPdfBlinking();
        
        updateHelpBar('📄 Area to PDF: Select opposite corner to define export region');
        addToHistory(`PDF area selection: First corner at (${x.toFixed(2)}, ${y.toFixed(2)}) - select opposite corner`);
        redraw();
    } else if (areaToPdfStep === 1) {
        areaToPdfEndX = x;
        areaToPdfEndY = y;
        
        stopAreaToPdfBlinking();
        
        const minX = Math.min(areaToPdfStartX, areaToPdfEndX);
        const maxX = Math.max(areaToPdfStartX, areaToPdfEndX);
        const minY = Math.min(areaToPdfStartY, areaToPdfEndY);
        const maxY = Math.max(areaToPdfStartY, areaToPdfEndY);
        
        window.selectedAreaBounds = { minX, minY, maxX, maxY };
        showPdfExportDialog();
        
        areaToPdfMode = false;
        areaToPdfStep = 0;
        isDrawing = false;
        updateHelpBar('Area exported to PDF! Returning to selection mode...');
        setTimeout(() => {
            updateHelpBar('Use drawing tools to create shapes');
        }, 2000);
        redraw();
    }
}

function resetAreaToPdfMode() {
    areaToPdfMode = false;
    areaToPdfStartX = null;
    areaToPdfStartY = null;
    areaToPdfEndX = null;
    areaToPdfEndY = null;
    areaToPdfStep = 0;
    isDrawing = false;
    stopAreaToPdfBlinking();
    setMode('select');
}

function startAreaToPdfBlinking() {
    areaToPdfBlinkState = true;
    areaToPdfBlinkTimer = setInterval(() => {
        areaToPdfBlinkState = !areaToPdfBlinkState;
        redraw(); 
    }, 500); 
}

function stopAreaToPdfBlinking() {
    if (areaToPdfBlinkTimer) {
        clearInterval(areaToPdfBlinkTimer);
        areaToPdfBlinkTimer = null;
    }
    areaToPdfBlinkState = true; 
}

function exportAreaToPdf(minX, minY, maxX, maxY) {
    try {
        if (typeof window.jsPDF === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                performPdfExport(minX, minY, maxX, maxY);
            };
            script.onerror = () => {
                addToHistory('Failed to load PDF library. Please check internet connection.', 'error');
                alert('Failed to load PDF library. Please check your internet connection and try again.');
            };
            document.head.appendChild(script);
        } else {
            performPdfExport(minX, minY, maxX, maxY);
        }
    } catch (error) {
        addToHistory(`PDF export failed: ${error.message}`, 'error');
        alert('PDF export failed: ' + error.message);
    }
}

function performPdfExport(minX, minY, maxX, maxY) {
    try {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        const areaWidth = maxX - minX;
        const areaHeight = maxY - minY;
        
        const pdfWidth = 210; 
        const pdfHeight = 297; 
        const margin = 10; 
        const drawableWidth = pdfWidth - 2 * margin;
        const drawableHeight = pdfHeight - 2 * margin;
        
        const scaleX = drawableWidth / areaWidth;
        const scaleY = drawableHeight / areaHeight;
        const scale = Math.min(scaleX, scaleY);
        
        const canvasScale = 4; 
        tempCanvas.width = drawableWidth * canvasScale;
        tempCanvas.height = drawableHeight * canvasScale;
        
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        tempCtx.scale(canvasScale, canvasScale);
        tempCtx.scale(scale, -scale); 
        tempCtx.translate(-minX, -maxY); 
        
        tempCtx.lineWidth = 0.5 / scale; 
        tempCtx.lineCap = 'round';
        tempCtx.lineJoin = 'round';
        
        function renderShapeForPdf(ctx, shape, scale) {
            if (typeof drawShape === 'function') {
                ctx.save();
                
                const pdfZoom = 1; 
                
                drawShape(ctx, shape, pdfZoom, false); 
                
                ctx.restore();
            } else {
                renderBasicShapeForPdf(ctx, shape, scale);
            }
        }

        function renderBasicShapeForPdf(ctx, shape, scale) {
            ctx.save();
            
            ctx.strokeStyle = shape.color || '#000000';
            ctx.lineWidth = (shape.lineWeight || 1) / scale;
            
            if (shape.linetype && shape.linetype !== 'continuous') {
                const patterns = {
                    'dashed': [15/scale, 5/scale],
                    'dotted': [1/scale, 4/scale],
                    'dashdot': [15/scale, 4/scale, 1/scale, 4/scale],
                    'center': [25/scale, 5/scale, 5/scale, 5/scale]
                };
                ctx.setLineDash(patterns[shape.linetype] || []);
            }
            
            switch(shape.type) {
                case 'line':
                    ctx.beginPath();
                    ctx.moveTo(shape.x1, shape.y1);
                    ctx.lineTo(shape.x2, shape.y2);
                    ctx.stroke();
                    break;
                    
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(shape.cx, shape.cy, shape.radius, 0, 2 * Math.PI);
                    ctx.stroke();
                    break;
                    
                case 'polyline':
                    if (shape.points && shape.points.length > 1) {
                        ctx.beginPath();
                        ctx.moveTo(shape.points[0].x, shape.points[0].y);
                        for (let i = 1; i < shape.points.length; i++) {
                            ctx.lineTo(shape.points[i].x, shape.points[i].y);
                        }
                        ctx.stroke();
                    }
                    break;
                    
                case 'text':
                    if (shape.content) {
                        ctx.fillStyle = shape.color || '#000000';
                        // FIXED: Match canvas rendering - simple text without Y-flip
                        const worldSize = shape.size || 12; 
                        ctx.font = `${worldSize}px Arial`;
                        ctx.textBaseline = 'alphabetic';
                        ctx.fillText(shape.content, shape.x, shape.y);
                    }
                    break;
                    
            }
            
            ctx.restore();
        }

        shapes.forEach(shape => {
            const bounds = getShapeBounds(shape);
            if (bounds && shapesIntersect(bounds, { minX, maxX, minY, maxY })) {
                renderShapeForPdf(tempCtx, shape, scale);
            }
        });
        
        const { jsPDF } = window.jsPDF;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        pdf.setFontSize(12);
        pdf.text('Web1CAD - Area Export', margin, margin - 2);
        
        const imgData = tempCanvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, margin, drawableWidth, drawableHeight);
        
        pdf.setFontSize(8);
        const date = new Date().toLocaleString();
        pdf.text(`Exported: ${date}`, margin, pdfHeight - 5);
        pdf.text(`Area: (${minX.toFixed(2)}, ${minY.toFixed(2)}) to (${maxX.toFixed(2)}, ${maxY.toFixed(2)})`, margin, pdfHeight - 2);
        
        const filename = `web1cad_area_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
        pdf.save(filename);
        
        addToHistory(`Area exported to PDF: ${filename}`);
        
    } catch (error) {
        addToHistory(`PDF export failed: ${error.message}`, 'error');
        alert('PDF export failed: ' + error.message);
    }
}



function showPdfExportDialog() {
    const dialog = document.getElementById('pdfExportDialog');
    if (dialog) {
        dialog.style.display = 'flex';
        setTimeout(() => {
            updatePdfPreview();
        }, 50);
    }
}

function closePdfExportDialog() {
    const dialog = document.getElementById('pdfExportDialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
    window.selectedAreaBounds = null;
    setMode('select');
    redraw();
}

function updatePdfPreview() {
    const preview = document.getElementById('pdfPreviewPage');
    const canvas = document.getElementById('pdfPreviewCanvas');
    const orientation = document.querySelector('input[name="pdfOrientation"]:checked').value;
    const paperSize = document.getElementById('pdfPaperSize').value;
    const scaleMode = document.querySelector('input[name="pdfScale"]:checked').value;
    const customScale = parseFloat(document.getElementById('pdfScaleValue').value) || 1;
    
    const paperDimensions = getPaperDimensions(paperSize, orientation);
    
    const previewScale = 0.8; 
    if (orientation === 'landscape') {
        preview.style.width = '280px';
        preview.style.height = '200px';
        canvas.width = 280;
        canvas.height = 200;
    } else {
        preview.style.width = '200px';
        preview.style.height = '280px';
        canvas.width = 200;
        canvas.height = 280;
    }
    
    const customScaleDiv = document.getElementById('pdfCustomScale');
    if (customScaleDiv) {
        customScaleDiv.style.display = scaleMode === 'custom' ? 'flex' : 'none';
    }
    
    if (window.selectedAreaBounds && canvas) {
        drawPreviewContent(canvas, window.selectedAreaBounds, paperDimensions, scaleMode, customScale);
    }
    
    updateExportInfo();
}

function drawPreviewContent(canvas, bounds, paperDimensions, scaleMode, customScale) {
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    const margins = {
        top: parseFloat(document.getElementById('pdfMarginTop').value) || 10,
        bottom: parseFloat(document.getElementById('pdfMarginBottom').value) || 10,
        left: parseFloat(document.getElementById('pdfMarginLeft').value) || 10,
        right: parseFloat(document.getElementById('pdfMarginRight').value) || 10
    };
    
    const drawableWidth = paperDimensions.width - margins.left - margins.right;
    const drawableHeight = paperDimensions.height - margins.top - margins.bottom;
    
    if (document.getElementById('pdfShowBorder').checked) {
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4);
    }
    
    const areaWidth = bounds.maxX - bounds.minX;
    const areaHeight = bounds.maxY - bounds.minY;
    
    let scale;
    if (scaleMode === 'custom') {
        scale = customScale;
    } else {
        const scaleX = drawableWidth / areaWidth;
        const scaleY = drawableHeight / areaHeight;
        scale = Math.min(scaleX, scaleY);
    }
    
    const marginLeft = (margins.left / paperDimensions.width) * canvasWidth;
    const marginTop = (margins.top / paperDimensions.height) * canvasHeight;
    const contentWidth = (drawableWidth / paperDimensions.width) * canvasWidth;
    const contentHeight = (drawableHeight / paperDimensions.height) * canvasHeight;
    
    ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
    ctx.fillRect(marginLeft, marginTop, contentWidth, contentHeight);
    
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(marginLeft, marginTop, contentWidth, contentHeight);
    ctx.setLineDash([]);
    
    const scaledWidth = areaWidth * scale;
    const scaledHeight = areaHeight * scale;
    
    const contentX = marginLeft + (contentWidth - (scaledWidth / drawableWidth) * contentWidth) / 2;
    const contentY = marginTop + (contentHeight - (scaledHeight / drawableHeight) * contentHeight) / 2;
    const contentDrawWidth = (scaledWidth / drawableWidth) * contentWidth;
    const contentDrawHeight = (scaledHeight / drawableHeight) * contentHeight;
    
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fillRect(contentX, contentY, contentDrawWidth, contentDrawHeight);
    ctx.strokeStyle = '#00aa00';
    ctx.lineWidth = 2;
    ctx.strokeRect(contentX, contentY, contentDrawWidth, contentDrawHeight);
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, contentDrawWidth, contentDrawHeight);
    ctx.clip();
    
    ctx.translate(contentX, contentY);
    const drawScale = Math.min(contentDrawWidth / areaWidth, contentDrawHeight / areaHeight);
    ctx.scale(drawScale, -drawScale); 
    ctx.translate(-bounds.minX, -bounds.maxY); 
    
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1 / drawScale;
    
    shapes.forEach(shape => {
        const shapeBounds = getShapeBounds(shape);
        if (shapeBounds && shapesIntersect(shapeBounds, bounds)) {
            drawSimplifiedShape(ctx, shape);
        }
    });
    
    ctx.restore();
    
    const infoDiv = document.getElementById('pdfPreviewInfo');
    if (infoDiv) {
        const dimensions = document.getElementById('previewDimensions');
        const scaleInfo = document.getElementById('previewScale');
        
        if (dimensions) {
            dimensions.textContent = `${areaWidth.toFixed(1)} × ${areaHeight.toFixed(1)} units`;
        }
        if (scaleInfo) {
            scaleInfo.textContent = `Scale: ${scale.toFixed(3)}:1`;
        }
    }
}

function drawSimplifiedShape(ctx, shape) {
    if (typeof drawShape === 'function') {
        ctx.save();
        
        window.pdfPreviewMode = true;
        
        drawShape(ctx, shape, 1, false); 
        
        window.pdfPreviewMode = false;
        
        ctx.restore();
        return;
    }
    
    ctx.save();
    
    const shapeColor = shape.color || '#ffffff';
    const previewColor = convertWhiteToBlackForPreview(shapeColor);
    ctx.strokeStyle = previewColor;
    ctx.fillStyle = previewColor;
    
    ctx.beginPath();
    
    switch(shape.type) {
        case 'line':
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            break;
            
        case 'circle':
            ctx.arc(shape.cx, shape.cy, shape.radius, 0, 2 * Math.PI);
            break;
            
        case 'polyline':
            if (shape.points && shape.points.length > 1) {
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
            }
            break;
            
        case 'arc':
            ctx.arc(shape.cx, shape.cy, shape.radius, shape.startAngle, shape.endAngle);
            break;
            
        case 'text':
            if (shape.content) {
                // FIXED: Match canvas rendering - simple text without transformations
                const worldSize = shape.size || 12;  
                ctx.font = `${worldSize}px Arial`;
                ctx.textBaseline = 'alphabetic';
                ctx.fillStyle = previewColor; 
                ctx.fillText(shape.content, shape.x, shape.y);
                ctx.restore();
                return; 
            }
            break;
    }
    
    ctx.stroke();
    ctx.restore();
}

function updateExportInfo() {
    const bounds = window.selectedAreaBounds;
    const paperSize = document.getElementById('pdfPaperSize').value.toUpperCase();
    const orientation = document.querySelector('input[name="pdfOrientation"]:checked').value;
    const scaleMode = document.querySelector('input[name="pdfScale"]:checked').value;
    const quality = document.getElementById('pdfQuality').value;
    
    const areaInfo = document.getElementById('exportAreaInfo');
    if (areaInfo && bounds) {
        const width = (bounds.maxX - bounds.minX).toFixed(1);
        const height = (bounds.maxY - bounds.minY).toFixed(1);
        areaInfo.textContent = `${width} × ${height} units`;
    } else if (areaInfo) {
        areaInfo.textContent = 'Not selected';
    }
    
    const paperInfo = document.getElementById('exportPaperInfo');
    if (paperInfo) {
        paperInfo.textContent = `${paperSize} ${orientation.charAt(0).toUpperCase() + orientation.slice(1)}`;
    }
    
    const scaleInfo = document.getElementById('exportScaleInfo');
    if (scaleInfo) {
        if (scaleMode === 'custom') {
            const customScale = document.getElementById('pdfScaleValue').value;
            scaleInfo.textContent = `${customScale}:1`;
        } else {
            scaleInfo.textContent = 'Fit to page';
        }
    }
    
    const qualityInfo = document.getElementById('exportQualityInfo');
    if (qualityInfo) {
        const qualityNames = { '1': 'Draft', '2': 'Standard', '4': 'High', '6': 'Ultra' };
        qualityInfo.textContent = `${qualityNames[quality]} (${quality}x)`;
    }
}

function exportToPdfWithSettings() {
    if (!window.selectedAreaBounds) {
        alert('No area selected for export');
        return;
    }
    
    const bounds = window.selectedAreaBounds;
    const settings = getPdfExportSettings();
    
    try {
        if (typeof window.jsPDF === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                performAdvancedPdfExport(bounds, settings);
            };
            script.onerror = () => {
                addToHistory('Failed to load PDF library. Please check internet connection.', 'error');
                alert('Failed to load PDF library. Please check your internet connection and try again.');
            };
            document.head.appendChild(script);
        } else {
            performAdvancedPdfExport(bounds, settings);
        }
    } catch (error) {
        addToHistory(`PDF export failed: ${error.message}`, 'error');
        alert('PDF export failed: ' + error.message);
    }
}

function getPdfExportSettings() {
    return {
        paperSize: document.getElementById('pdfPaperSize').value,
        orientation: document.querySelector('input[name="pdfOrientation"]:checked').value,
        scaleMode: document.querySelector('input[name="pdfScale"]:checked').value,
        customScale: parseFloat(document.getElementById('pdfScaleValue').value) || 1,
        quality: parseInt(document.getElementById('pdfQuality').value) || 4,
        margins: {
            top: parseFloat(document.getElementById('pdfMarginTop').value) || 10,
            bottom: parseFloat(document.getElementById('pdfMarginBottom').value) || 10,
            left: parseFloat(document.getElementById('pdfMarginLeft').value) || 10,
            right: parseFloat(document.getElementById('pdfMarginRight').value) || 10
        },
        options: {
            showBorder: document.getElementById('pdfShowBorder').checked,
            showTitle: document.getElementById('pdfShowTitle').checked,
            showDate: document.getElementById('pdfShowDate').checked,
            showCoords: document.getElementById('pdfShowCoords').checked,
            showScale: document.getElementById('pdfShowScale').checked,
            scaleLineWeights: document.getElementById('pdfScaleLineWeights').checked
        }
    };
}

function getPaperDimensions(paperSize, orientation) {
    const dimensions = {
        a4: { width: 210, height: 297 },
        a3: { width: 297, height: 420 },
        a2: { width: 420, height: 594 },
        a1: { width: 594, height: 841 },
        a0: { width: 841, height: 1189 },
        letter: { width: 215.9, height: 279.4 },
        legal: { width: 215.9, height: 355.6 },
        tabloid: { width: 279.4, height: 431.8 }
    };
    
    const size = dimensions[paperSize] || dimensions.a4;
    
    if (orientation === 'landscape') {
        return { width: size.height, height: size.width };
    }
    return size;
}

function performAdvancedPdfExport(bounds, settings) {
    try {
        const { minX, minY, maxX, maxY } = bounds;
        
        const paper = getPaperDimensions(settings.paperSize, settings.orientation);
        const margins = settings.margins;
        
        const drawableWidth = paper.width - margins.left - margins.right;
        const drawableHeight = paper.height - margins.top - margins.bottom;
        
        const areaWidth = maxX - minX;
        const areaHeight = maxY - minY;
        
        let scale;
        if (settings.scaleMode === 'custom') {
            scale = settings.customScale;
        } else {
            const scaleX = drawableWidth / areaWidth;
            const scaleY = drawableHeight / areaHeight;
            scale = Math.min(scaleX, scaleY);
        }
        
        const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
        if (!jsPDF) {
            throw new Error('jsPDF library not loaded');
        }
        const pdf = new jsPDF(settings.orientation, 'mm', settings.paperSize);
        
        const offsetX = margins.left + (drawableWidth - areaWidth * scale) / 2;
        const offsetY = margins.top + (drawableHeight - areaHeight * scale) / 2;
        
        if (settings.options.showBorder) {
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.5);
            pdf.rect(margins.left, margins.top, drawableWidth, drawableHeight);
        }
        
        if (settings.options.showTitle) {
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text('Web1CAD - Vector Export', margins.left, margins.top - 2);
        }
        
        exportShapesToPdfVector(pdf, bounds, scale, offsetX, offsetY, settings);
        
        let footerY = paper.height - 5;
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        
        if (settings.options.showDate) {
            const date = new Date().toLocaleString();
            pdf.text(`Exported: ${date}`, margins.left, footerY);
            footerY -= 3;
        }
        
        if (settings.options.showCoords) {
            pdf.text(`Area: (${minX.toFixed(2)}, ${minY.toFixed(2)}) to (${maxX.toFixed(2)}, ${maxY.toFixed(2)})`, 
                     margins.left, footerY);
            footerY -= 3;
        }
        
        if (settings.options.showScale) {
            pdf.text(`Scale: ${scale.toFixed(3)}:1`, margins.left, footerY);
            footerY -= 3;
            
            if (settings.options.scaleLineWeights) {
                pdf.text(`Line weights: Scaled with drawing`, margins.left, footerY);
                footerY -= 3;
            } else {
                pdf.text(`Line weights: Original (unscaled)`, margins.left, footerY);
                footerY -= 3;
            }
        }
        
        const filename = `web1cad_vector_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
        pdf.save(filename);
        
        closePdfExportDialog();
        addToHistory(`✅ Vector PDF exported: ${filename} (${shapes.filter(s => {
            const bounds = getShapeBounds(s);
            return bounds && shapesIntersect(bounds, bounds);
        }).length} objects)`);
        updateHelpBar('Vector PDF exported successfully! True vector graphics preserved.');
        setTimeout(() => {
            updateHelpBar('Use drawing tools to create shapes');
        }, 3000);
        
    } catch (error) {
        addToHistory(`PDF export failed: ${error.message}`, 'error');
        alert('PDF export failed: ' + error.message);
    }
}

function exportShapesToPdfVector(pdf, bounds, scale, offsetX, offsetY, settings) {
    const { minX, minY, maxX, maxY } = bounds;
    
    const transformX = (x) => offsetX + (x - minX) * scale;
    const transformY = (y) => offsetY + (maxY - y) * scale;
    
    debugSystem.info('=== PDF Export Debug ===');
    debugSystem.info('Export area bounds:', bounds);
    debugSystem.info('Total shapes to check:', shapes.length);
    
    let exportedCount = 0;
    
    shapes.forEach((shape, index) => {
        const shapeBounds = getShapeBounds(shape);
        if (!shapeBounds) {
            debugSystem.debug(`Shape ${index} (${shape.type}): No bounds calculated`);
            return;
        }
        
        if (!shapesIntersect(shapeBounds, bounds)) {
            debugSystem.debug(`Shape ${index} (${shape.type}): No intersection with export area`);
            return;
        }
        
        const layer = getShapeLayer ? getShapeLayer(shape) : null;
        if (layer && !layer.visible) {
            debugSystem.debug(`Shape ${index} (${shape.type}): Layer not visible`);
            return; 
        }
        
        debugSystem.debug(`Shape ${index} (${shape.type}): EXPORTING - bounds:`, shapeBounds);
        exportedCount++;
        
        const shapeColor = resolveShapeColor(shape, layer);
        const lineWeight = resolveShapeLineWeight(shape, layer);
        
        setVectorPdfStyle(pdf, shapeColor, lineWeight, scale, settings);
        exportShapeToVector(pdf, shape, transformX, transformY, scale);
    });
    
    debugSystem.info(`PDF Export completed: ${exportedCount} shapes exported`);
    debugSystem.info('=== End PDF Export Debug ===');
}

function setVectorPdfStyle(pdf, color, lineWeight, scale, settings) {
    let r = 0, g = 0, b = 0;
    
    if (color) {
        const normalizedColor = color.toLowerCase();
        
        if (normalizedColor === '#ffffff' || normalizedColor === '#fff' || 
            normalizedColor === 'white' || normalizedColor === 'rgb(255,255,255)') {
            r = g = b = 0; 
        } else if (normalizedColor.startsWith('#')) {
            if (normalizedColor.length === 4) {
                r = parseInt(normalizedColor[1] + normalizedColor[1], 16);
                g = parseInt(normalizedColor[2] + normalizedColor[2], 16);
                b = parseInt(normalizedColor[3] + normalizedColor[3], 16);
            } else if (normalizedColor.length === 7) {
                r = parseInt(normalizedColor.substr(1, 2), 16);
                g = parseInt(normalizedColor.substr(3, 2), 16);
                b = parseInt(normalizedColor.substr(5, 2), 16);
            }
        }
    }
    
    pdf.setDrawColor(r, g, b);
    pdf.setFillColor(r, g, b);
    
    let weight = parseFloat(lineWeight) || 0.25;
    
    if (settings.options.scaleLineWeights) {
        weight = weight * scale;
        
        weight = Math.max(0.05, Math.min(weight, 2.0));
    } else {
        weight = Math.max(weight * 0.1, 0.1); 
    }
    
    pdf.setLineWidth(weight);
}

function exportShapeToVector(pdf, shape, transformX, transformY, scale) {
    if (!shape || !shape.type) {
        debugSystem.warn('Invalid shape encountered during PDF export:', shape);
        return;
    }
    
    switch(shape.type) {
        case 'line':
            if (shape.x1 !== undefined && shape.y1 !== undefined && 
                shape.x2 !== undefined && shape.y2 !== undefined) {
                pdf.line(
                    transformX(shape.x1), 
                    transformY(shape.y1),
                    transformX(shape.x2), 
                    transformY(shape.y2)
                );
            } else {
                debugSystem.warn('Line shape missing coordinates:', shape);
            }
            break;
            
        case 'circle':
            if (shape.cx !== undefined && shape.cy !== undefined && shape.radius > 0) {
                const radius = shape.radius * scale;
                pdf.circle(
                    transformX(shape.cx), 
                    transformY(shape.cy), 
                    radius
                );
            } else {
                debugSystem.warn('Circle shape missing center or radius:', shape);
            }
            break;
            
        case 'polyline':
            if (shape.points && shape.points.length > 1) {
                const validPoints = shape.points.filter(p => 
                    p && typeof p.x === 'number' && typeof p.y === 'number'
                );
                
                if (validPoints.length > 1) {
                    const points = validPoints.map(p => [
                        transformX(p.x), 
                        transformY(p.y)
                    ]);
                    
                    const lines = [];
                    for (let i = 1; i < points.length; i++) {
                        lines.push([
                            points[i][0] - points[i-1][0],
                            points[i][1] - points[i-1][1]
                        ]);
                    }
                    
                    pdf.lines(lines, points[0][0], points[0][1]);
                } else {
                    debugSystem.warn('Polyline has no valid points:', shape);
                }
            } else {
                debugSystem.warn('Polyline shape missing points:', shape);
            }
            break;
            
        case 'arc':
            if (shape.cx !== undefined && shape.cy !== undefined && 
                shape.radius > 0 && shape.startAngle !== undefined && 
                shape.endAngle !== undefined) {
                exportArcAsVectorLines(pdf, shape, transformX, transformY, scale);
            } else {
                debugSystem.warn('Arc shape missing required properties:', shape);
            }
            break;
            
        case 'ellipse':
            if (shape.cx !== undefined && shape.cy !== undefined && 
                shape.radiusX > 0 && shape.radiusY > 0) {
                pdf.ellipse(
                    transformX(shape.cx),
                    transformY(shape.cy),
                    shape.radiusX * scale,
                    shape.radiusY * scale
                );
            } else if (shape.cx !== undefined && shape.cy !== undefined && 
                       shape.rx > 0 && shape.ry > 0) {
                pdf.ellipse(
                    transformX(shape.cx),
                    transformY(shape.cy),
                    shape.rx * scale,
                    shape.ry * scale
                );
            } else {
                debugSystem.warn('Ellipse shape missing center or radii:', shape);
            }
            break;
            
        case 'rectangle':
            if (shape.x1 !== undefined && shape.y1 !== undefined && 
                shape.x2 !== undefined && shape.y2 !== undefined) {
                const x = transformX(Math.min(shape.x1, shape.x2));
                const y = transformY(Math.max(shape.y1, shape.y2));
                const width = Math.abs(shape.x2 - shape.x1) * scale;
                const height = Math.abs(shape.y2 - shape.y1) * scale;
                
                if (width > 0 && height > 0) {
                    pdf.rect(x, y, width, height);
                } else {
                    debugSystem.warn('Rectangle has zero width or height:', shape);
                }
            } else {
                debugSystem.warn('Rectangle shape missing coordinates:', shape);
            }
            break;
            
        case 'text':
            const textContent = shape.content || shape.text || '';
            if (textContent && shape.x !== undefined && shape.y !== undefined) {
                try {
                    // FIXED: Use world size directly to match canvas rendering
                    const textHeight = shape.height || shape.size || 12; // World units
                    // Convert: world units * scale = PDF mm, then mm to points (72 points/inch, 25.4mm/inch)
                    const fontSizeMM = textHeight * scale; // Size in mm
                    const fontSize = fontSizeMM * (72 / 25.4); // Convert mm to points for jsPDF
                    
                    const fontFamily = shape.font || 'Arial';
                    pdf.setFont(fontFamily);
                    pdf.setFontSize(Math.max(fontSize, 4)); 
                    
                    const options = {};
                    
                    // FIXED: Rotation is stored in radians, convert to degrees for jsPDF
                    // Canvas Y-axis is inverted relative to PDF, so negate rotation
                    const rotation = shape.rotation || 0;
                    if (rotation !== 0) {
                        const rotationDegrees = rotation * 180 / Math.PI;
                        options.angle = rotationDegrees; // PDF handles coordinate flip internally
                    }
                    
                    const align = shape.align || 'left';
                    switch (align.toLowerCase()) {
                        case 'center':
                        case 'middle':
                            options.align = 'center';
                            break;
                        case 'right':
                            options.align = 'right';
                            break;
                        case 'left':
                        default:
                            options.align = 'left';
                            break;
                    }
                    
                    const pdfX = transformX(shape.x);
                    const pdfY = transformY(shape.y);
                    
                    // CRITICAL FIX: Canvas baseline='alphabetic' with Y-down coordinate system
                    // PDF has Y-up system, transformY inverts Y: (maxY - y)
                    // To match canvas alphabetic baseline, use 'bottom' in PDF
                    options.baseline = 'bottom'; 
                    
                    pdf.text(
                        textContent,
                        pdfX,
                        pdfY,
                        options
                    );
                } catch (error) {
                    debugSystem.warn('Error rendering text shape:', error, shape);
                }
            } else {
                debugSystem.warn('Text shape missing content or coordinates:', shape);
            }
            break;
            
        case 'point':
            const pointSize = 0.5 * scale; 
            pdf.circle(
                transformX(shape.x),
                transformY(shape.y),
                Math.max(pointSize, 0.2)
            );
            break;
            
        case 'polygon':
            debugSystem.debug('Exporting polygon:', shape);
            if (shape.points && shape.points.length > 2) {
                const validPoints = shape.points.filter(p => 
                    p && typeof p.x === 'number' && typeof p.y === 'number'
                );
                
                debugSystem.debug('Polygon valid points:', validPoints.length, validPoints);
                
                if (validPoints.length > 2) {
                    const points = validPoints.map(p => [
                        transformX(p.x), 
                        transformY(p.y)
                    ]);
                    
                    debugSystem.debug('Transformed points for PDF:', points);
                    
                    const lines = [];
                    for (let i = 1; i < points.length; i++) {
                        lines.push([
                            points[i][0] - points[i-1][0],
                            points[i][1] - points[i-1][1]
                        ]);
                    }
                    lines.push([
                        points[0][0] - points[points.length-1][0],
                        points[0][1] - points[points.length-1][1]
                    ]);
                    
                    debugSystem.debug('PDF lines for polygon:', lines);
                    
                    try {
                        pdf.lines(lines, points[0][0], points[0][1]);
                        debugSystem.debug('✅ Polygon successfully exported to PDF');
                    } catch (error) {
                        debugSystem.error('❌ Error exporting polygon to PDF:', error);
                    }
                } else {
                    debugSystem.warn('Polygon has insufficient valid points for export:', shape);
                }
            } else {
                debugSystem.warn('Polygon shape missing valid points:', shape);
            }
            break;
            
        case 'hatch':
            if (shape.lines && shape.lines.length > 0) {
                shape.lines.forEach(line => {
                    if (line.x1 !== undefined && line.y1 !== undefined &&
                        line.x2 !== undefined && line.y2 !== undefined) {
                        pdf.line(
                            transformX(line.x1),
                            transformY(line.y1),
                            transformX(line.x2),
                            transformY(line.y2)
                        );
                    }
                });
            } else if (shape.points && shape.points.length > 1) {
                for (let i = 0; i < shape.points.length; i += 2) {
                    if (i + 1 < shape.points.length) {
                        pdf.line(
                            transformX(shape.points[i].x),
                            transformY(shape.points[i].y),
                            transformX(shape.points[i + 1].x),
                            transformY(shape.points[i + 1].y)
                        );
                    }
                }
            }
            break;
            
        case 'spline':
            if (shape.points && shape.points.length > 1) {
                exportSplineAsVectorLines(pdf, shape, transformX, transformY, scale);
            }
            break;
            
        default:
            const x = transformX(shape.x || shape.cx || 0);
            const y = transformY(shape.y || shape.cy || 0);
            pdf.circle(x, y, 0.5);
    }
}

function exportArcAsVectorLines(pdf, shape, transformX, transformY, scale) {
    if (!shape || shape.cx === undefined || shape.cy === undefined || 
        !shape.radius || shape.startAngle === undefined || shape.endAngle === undefined) {
        debugSystem.warn('Arc shape missing required properties for export:', shape);
        return;
    }
    
    const angleDiff = shape.endAngle - shape.startAngle;
    const steps = Math.max(8, Math.abs(angleDiff) * 10);
    const angleStep = angleDiff / steps;
    
    const points = [];
    for (let i = 0; i <= steps; i++) {
        const angle = shape.startAngle + i * angleStep;
        const x = shape.cx + shape.radius * Math.cos(angle);
        const y = shape.cy + shape.radius * Math.sin(angle);
        points.push([transformX(x), transformY(y)]);
    }
    
    for (let i = 1; i < points.length; i++) {
        pdf.line(points[i-1][0], points[i-1][1], points[i][0], points[i][1]);
    }
}

function exportSplineAsVectorLines(pdf, shape, transformX, transformY, scale) {
    if (!shape || !shape.points || shape.points.length < 2) {
        debugSystem.warn('Spline shape missing valid points for export:', shape);
        return;
    }
    
    const validPoints = shape.points.filter(p => 
        p && typeof p.x === 'number' && typeof p.y === 'number'
    );
    
    if (validPoints.length < 2) {
        debugSystem.warn('Spline has insufficient valid points for export:', shape);
        return;
    }
    
    const curvePoints = generateSplinePoints(validPoints, 20); 
    
    for (let i = 1; i < curvePoints.length; i++) {
        pdf.line(
            transformX(curvePoints[i-1].x), 
            transformY(curvePoints[i-1].y),
            transformX(curvePoints[i].x), 
            transformY(curvePoints[i].y)
        );
    }
}

function generateSplinePoints(controlPoints, segmentsPerSpan) {
    if (controlPoints.length < 2) return controlPoints;
    
    const result = [];
    for (let i = 0; i < controlPoints.length - 1; i++) {
        const p0 = controlPoints[i];
        const p1 = controlPoints[i + 1];
        
        for (let t = 0; t <= segmentsPerSpan; t++) {
            const ratio = t / segmentsPerSpan;
            result.push({
                x: p0.x + (p1.x - p0.x) * ratio,
                y: p0.y + (p1.y - p0.y) * ratio
            });
        }
    }
    return result;
}

function resolveShapeColor(shape, layer) {
    let color;
    if (shape.color && shape.color !== 'ByLayer' && shape.color !== 'byLayer') {
        color = shape.color;
    } else if (layer && layer.color) {
        color = layer.color;
    } else {
        color = currentColor && currentColor !== 'byLayer' ? currentColor : '#ffffff'; 
    }
    
    if (window.pdfPreviewMode && window.convertWhiteToBlackForPreview) {
        color = window.convertWhiteToBlackForPreview(color);
    }
    
    return color;
}

function resolveShapeLineWeight(shape, layer) {
    if (shape.lineWeight && shape.lineWeight !== 'ByLayer' && shape.lineWeight !== 'byLayer') {
        return shape.lineWeight;
    }
    if (layer && layer.lineWeight) {
        return layer.lineWeight;
    }
    return currentLineWeight || 0.25; 
}

function getShapeBounds(shape) {
    switch(shape.type) {
        case 'line':
            return {
                minX: Math.min(shape.x1, shape.x2),
                minY: Math.min(shape.y1, shape.y2),
                maxX: Math.max(shape.x1, shape.x2),
                maxY: Math.max(shape.y1, shape.y2)
            };
            
        case 'circle':
            return {
                minX: shape.cx - shape.radius,
                minY: shape.cy - shape.radius,
                maxX: shape.cx + shape.radius,
                maxY: shape.cy + shape.radius
            };
            
        case 'polyline':
            if (!shape.points || shape.points.length === 0) return null;
            let minX = shape.points[0].x, maxX = shape.points[0].x;
            let minY = shape.points[0].y, maxY = shape.points[0].y;
            
            shape.points.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            });
            
            return { minX, minY, maxX, maxY };
            
        case 'arc':
            return {
                minX: shape.cx - shape.radius,
                minY: shape.cy - shape.radius,
                maxX: shape.cx + shape.radius,
                maxY: shape.cy + shape.radius
            };
            
        case 'ellipse':
            return {
                minX: shape.cx - shape.radiusX,
                minY: shape.cy - shape.radiusY,
                maxX: shape.cx + shape.radiusX,
                maxY: shape.cy + shape.radiusY
            };
            
        case 'rectangle':
            return {
                minX: Math.min(shape.x1, shape.x2),
                minY: Math.min(shape.y1, shape.y2),
                maxX: Math.max(shape.x1, shape.x2),
                maxY: Math.max(shape.y1, shape.y2)
            };
            
        case 'text':
            const textContent = shape.content || shape.text || '';
            const textHeight = shape.height || shape.size || 12;
            const textFont = shape.font || 'Arial';
            
            let textWidth;
            if (textFont.toLowerCase().includes('courier') || textFont.toLowerCase().includes('mono')) {
                textWidth = textContent.length * textHeight * 0.6;
            } else {
                textWidth = textContent.length * textHeight * 0.5;
            }
            
            const rotation = (shape.rotation || 0) * Math.PI / 180;
            if (rotation !== 0) {
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                
                const corners = [
                    { x: 0, y: 0 },                    // Bottom-left
                    { x: textWidth, y: 0 },            // Bottom-right
                    { x: textWidth, y: textHeight },   // Top-right
                    { x: 0, y: textHeight }            // Top-left
                ];
                
                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;
                
                corners.forEach(corner => {
                    const rx = corner.x * cos - corner.y * sin + shape.x;
                    const ry = corner.x * sin + corner.y * cos + shape.y;
                    minX = Math.min(minX, rx);
                    maxX = Math.max(maxX, rx);
                    minY = Math.min(minY, ry);
                    maxY = Math.max(maxY, ry);
                });
                
                return { minX, minY, maxX, maxY };
            } else {
                return {
                    minX: shape.x,
                    minY: shape.y - textHeight,
                    maxX: shape.x + textWidth,
                    maxY: shape.y
                };
            }
            
        case 'spline':
            if (!shape.points || shape.points.length === 0) return null;
            return getShapeBounds({ type: 'polyline', points: shape.points });
            
        case 'point':
            const pointX = shape.x || 0;
            const pointY = shape.y || 0;
            const pointSize = 1; 
            return {
                minX: pointX - pointSize,
                minY: pointY - pointSize,
                maxX: pointX + pointSize,
                maxY: pointY + pointSize
            };
            
        case 'polygon':
            if (!shape.points || shape.points.length === 0) return null;
            return getShapeBounds({ type: 'polyline', points: shape.points });
            
        case 'hatch':
            if (shape.lines && shape.lines.length > 0) {
                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;
                
                shape.lines.forEach(line => {
                    if (line.x1 !== undefined && line.y1 !== undefined &&
                        line.x2 !== undefined && line.y2 !== undefined) {
                        minX = Math.min(minX, line.x1, line.x2);
                        maxX = Math.max(maxX, line.x1, line.x2);
                        minY = Math.min(minY, line.y1, line.y2);
                        maxY = Math.max(maxY, line.y1, line.y2);
                    }
                });
                
                if (minX !== Infinity) {
                    return { minX, minY, maxX, maxY };
                }
            } else if (shape.points && shape.points.length > 0) {
                return getShapeBounds({ type: 'polyline', points: shape.points });
            }
            return null;
            
        default:
            const x = shape.x || shape.cx || 0;
            const y = shape.y || shape.cy || 0;
            return { minX: x-1, minY: y-1, maxX: x+1, maxY: y+1 };
    }
}

function shapesIntersect(shapeBounds, areaBounds) {
    return !(shapeBounds.maxX < areaBounds.minX || 
             shapeBounds.minX > areaBounds.maxX ||
             shapeBounds.maxY < areaBounds.minY || 
             shapeBounds.minY > areaBounds.maxY);
}
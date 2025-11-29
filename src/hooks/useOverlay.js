import { useEffect } from 'react';
import { drawUnitLine, drawUnitGhost, drawTransformBox } from '../utils/canvasDraw'; 
import { getElementsBounds, getSnappedPoint } from '../utils/geometry';

export const useOverlay = ({
  overlayRef,
  containerRef,
  viewTransform,
  toWorld,
  mode,
  gridLevel,
  mousePos,
  brushSize, brushColor, brushOpacity, isEraser,
  isAdjustingBrush,
  zoomSelectionStart,
  selectionPath,
  activeSelectionBounds,
  dragStartPos,
  draggingItem,
  lineStartPoint,
  isShiftDown,
  unitTypes,
  activeUnitId,
  measurements,
  measurementsOpacity,
  isCreatingUnit,
  tempUnitStart,
  selectedElementIds, 
  drawingElements     
}) => {

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const halfWidth = width / 2;
    
    ctx.clearRect(0, 0, width, height);

    const drawInPane = (paneIndex, drawFn) => {
        ctx.save();
        const startX = paneIndex === 0 ? 0 : halfWidth;
        ctx.beginPath(); ctx.rect(startX, 0, halfWidth, height); ctx.clip();
        if (paneIndex === 0) {
            ctx.translate(-viewTransform.x * viewTransform.scale, -viewTransform.y * viewTransform.scale);
            ctx.scale(viewTransform.scale, viewTransform.scale);
        } else {
            ctx.translate(halfWidth, 0);
            ctx.scale(viewTransform.scale, viewTransform.scale);
            ctx.translate(-(halfWidth + viewTransform.x), -viewTransform.y);
        }
        drawFn();
        ctx.restore();
    };

    // 1. Brush Cursor
    if (isAdjustingBrush) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = isEraser ? '#ffffff' : brushColor;
        ctx.globalAlpha = brushOpacity;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.globalAlpha = 1.0;
        ctx.fillText(`Size: ${Math.round(brushSize)}`, mousePos.x + 20, mousePos.y);
        ctx.fillText(`Op: ${Math.round(brushOpacity*100)}%`, mousePos.x + 20, mousePos.y + 12);
        ctx.restore();
    }

    // 2. Grid
    if (gridLevel > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      let cols = 6; let rows = 4;
      if (gridLevel === 2) { cols = 12; rows = 8; }
      else if (gridLevel === 3) { cols = 24; rows = 16; }
      for (let i = 1; i < cols; i++) {
         ctx.beginPath(); ctx.moveTo(canvas.width * (i/cols), 0); ctx.lineTo(canvas.width * (i/cols), canvas.height); ctx.stroke();
      }
      for (let i = 1; i < rows; i++) {
        ctx.beginPath(); ctx.moveTo(0, canvas.height * (i/rows)); ctx.lineTo(canvas.width, canvas.height * (i/rows)); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke();
    }

    // 3. Zoom Selection
    if (mode === 'zoom' && zoomSelectionStart) {
        ctx.save();
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const w = mousePos.x - zoomSelectionStart.x;
        const h = mousePos.y - zoomSelectionStart.y;
        ctx.strokeRect(zoomSelectionStart.x, zoomSelectionStart.y, w, h);
        ctx.fillStyle = 'rgba(0, 255, 204, 0.1)';
        ctx.fillRect(zoomSelectionStart.x, zoomSelectionStart.y, w, h);
        ctx.restore();
    }

    // 4. Selection & Transform
    const renderSelectionOverlay = () => {
        // Active Drawing Path
        if (mode.startsWith('select') && selectionPath.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#ffffff'; 
            ctx.lineWidth = 2 / viewTransform.scale;
            ctx.setLineDash([]); 
            
            if (mode === 'select-box') {
                const start = selectionPath[0];
                const end = selectionPath[selectionPath.length - 1];
                const w = end.x - start.x;
                const h = end.y - start.y;
                ctx.strokeRect(start.x, start.y, w, h); 
                ctx.strokeStyle = '#000000';
                ctx.setLineDash([5 / viewTransform.scale, 5 / viewTransform.scale]); 
                ctx.strokeRect(start.x, start.y, w, h);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(start.x, start.y, w, h);
            } else {
                ctx.beginPath();
                ctx.moveTo(selectionPath[0].x, selectionPath[0].y);
                for(let i=1; i<selectionPath.length; i++) ctx.lineTo(selectionPath[i].x, selectionPath[i].y);
                ctx.stroke(); 
                ctx.strokeStyle = '#000000';
                ctx.setLineDash([5 / viewTransform.scale, 5 / viewTransform.scale]); 
                ctx.stroke();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fill();
            }
            ctx.restore();
        }

        // Final Selection & Gizmo
        if (selectedElementIds.size > 0) {
            // Draw Box if defined
            if (activeSelectionBounds && activeSelectionBounds.type === 'box') {
                drawTransformBox(ctx, activeSelectionBounds.path, viewTransform.scale);
            } 
            // Fallback for Lasso
            else {
                const selectedEls = drawingElements.filter(el => selectedElementIds.has(el.id));
                const bounds = getElementsBounds(selectedEls);
                if (bounds) drawTransformBox(ctx, bounds, viewTransform.scale);
            }
        }
    };
    drawInPane(0, renderSelectionOverlay);
    drawInPane(1, renderSelectionOverlay);

    // 5. Line Preview
    if (mode === 'line' && lineStartPoint) {
      const renderLinePreview = () => {
          let worldMouse = toWorld(mousePos.x, mousePos.y);
          if (isShiftDown) {
              worldMouse = getSnappedPoint(lineStartPoint, worldMouse);
          }
          ctx.beginPath();
          ctx.moveTo(lineStartPoint.x, lineStartPoint.y);
          ctx.lineTo(worldMouse.x, worldMouse.y);
          ctx.lineCap = 'round';
          ctx.lineWidth = brushSize;
          ctx.strokeStyle = brushColor;
          ctx.globalAlpha = brushOpacity * 0.6;
          if (isEraser) { ctx.strokeStyle = '#ffffff'; ctx.setLineDash([5 / viewTransform.scale, 5 / viewTransform.scale]); }
          ctx.stroke();
          ctx.setLineDash([]);
      };
      drawInPane(0, renderLinePreview);
      drawInPane(1, renderLinePreview);
    }

    // 6. Measurements
    const renderMeasurements = () => {
        if (mode === 'measure' && isCreatingUnit && tempUnitStart) {
            const activeUnit = unitTypes.find(u => u.id === activeUnitId);
            if (activeUnit) {
                const worldMouse = toWorld(mousePos.x, mousePos.y);
                drawUnitLine(ctx, tempUnitStart.x, tempUnitStart.y, worldMouse.x, worldMouse.y, activeUnit.color, 'Defining Unit...', true, '#ffff00', viewTransform.scale);
            }
        }
        unitTypes.forEach(type => {
            if (!type.visible || !type.base) return;
            ctx.save(); ctx.globalAlpha = type.opacity;
            drawUnitLine(ctx, type.base.x1, type.base.y1, type.base.x2, type.base.y2, type.color, null, false, '#ffff00', viewTransform.scale);
            ctx.restore();
        });
        measurements.forEach((m) => {
            const type = unitTypes.find(u => u.id === m.typeId);
            if (type && type.visible && type.base) {
                ctx.save(); ctx.globalAlpha = type.opacity * measurementsOpacity;
                drawUnitGhost(ctx, m.x, m.y, m, type.color, viewTransform.scale);
                ctx.restore();
            }
        });
        const activeUnit = unitTypes.find(u => u.id === activeUnitId);
        if (mode === 'measure' && activeUnit && activeUnit.base && !isCreatingUnit && activeUnit.visible) {
            const worldMouse = toWorld(mousePos.x, mousePos.y);
            const ghostSnap = {
                length: activeUnit.base.length,
                angle: activeUnit.activeAngle !== undefined ? activeUnit.activeAngle : activeUnit.base.angle
            };
            ctx.save(); ctx.globalAlpha = activeUnit.opacity * measurementsOpacity;
            drawUnitGhost(ctx, worldMouse.x, worldMouse.y, ghostSnap, activeUnit.color, viewTransform.scale);
            ctx.restore();
        }
    };
    drawInPane(0, renderMeasurements);
    drawInPane(1, renderMeasurements);

  }, [mode, gridLevel, mousePos, isCreatingUnit, tempUnitStart, unitTypes, measurements, activeUnitId, measurementsOpacity, lineStartPoint, brushColor, brushSize, brushOpacity, isEraser, viewTransform, isAdjustingBrush, isShiftDown, selectionPath, activeSelectionBounds, dragStartPos, draggingItem, selectedElementIds, drawingElements]);
};
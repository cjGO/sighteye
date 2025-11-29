import { useState, useRef } from 'react';
import { 
  getSnappedPoint, 
  getDistanceToLineSegment, 
  isPointInRect, 
  isPointInPolygon, 
  getElementsBounds,
  rotatePoint,
  scalePoint
} from '../utils/geometry';

export const useCanvasInput = ({
    mode, setMode,
    brushSize, brushColor, brushOpacity, isEraser,
    activeLayerId,
    drawingElements, setDrawingElements,
    measurements, setMeasurements,
    activeUnitId, unitTypes, setUnitTypes, addMeasurement,
    viewTransform, setViewTransform,
    containerRef,
    selectedElementIds, setSelectedElementIds,
    selectionPath, setSelectionPath,
    activeSelectionBounds, setActiveSelectionBounds,
    toWorld,
    isShiftDown,
    lineStartPoint, setLineStartPoint,
    dragStartPos, setDragStartPos,
    draggingItem, setDraggingItem,
    drawingSnapshotRef, measurementSnapshotRef,
    isAdjustingBrush, setIsAdjustingBrush, lastAdjustPos,
    setBrushOpacity, setBrushSize,
    currentPoints, setCurrentPoints,
    isCreatingUnit, setIsCreatingUnit,
    tempUnitStart, setTempUnitStart,
    setMousePos, mousePosRef,
    setZoomSelectionStart
}) => {

  const [transformHandle, setTransformHandle] = useState(null);
  const [selectionBounds, setSelectionBounds] = useState(null);
  const selectionBoundsSnapshotRef = useRef(null);

  // Helper to extract visual points for handle detection
  const getSelectionVisuals = () => {
      if (activeSelectionBounds && activeSelectionBounds.type === 'box') {
          // If we only have 2 points (un-rotated creation), convert to 4 for consistency
          if (activeSelectionBounds.path.length === 2) {
              const p1 = activeSelectionBounds.path[0];
              const p2 = activeSelectionBounds.path[1];
              return [{x:p1.x,y:p1.y}, {x:p2.x,y:p1.y}, {x:p2.x,y:p2.y}, {x:p1.x,y:p2.y}];
          }
          return activeSelectionBounds.path;
      }
      return null;
  };

  const findElementAt = (x, y) => {
    const activeElements = drawingElements.filter(el => el.layerId === activeLayerId);
    for (let i = activeElements.length - 1; i >= 0; i--) {
      const el = activeElements[i];
      const threshold = Math.max(10, el.size + 5); 
      if (el.type === 'stroke') {
        for (let j = 0; j < el.points.length - 1; j++) {
          const dist = getDistanceToLineSegment({x, y}, el.points[j], el.points[j+1]);
          if (dist < threshold) return { type: 'drawing', id: el.id };
        }
      } else if (el.type === 'line') {
        const dist = getDistanceToLineSegment({x, y}, el.start, el.end);
        if (dist < threshold) return { type: 'drawing', id: el.id };
      }
    }
    return null;
  };

  // --- Pointer Down ---
  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldPos = toWorld(x, y);

    if (e.buttons === 2 && (mode === 'draw' || isEraser)) {
        setIsAdjustingBrush(true);
        lastAdjustPos.current = { x, y };
        e.preventDefault(); 
        return;
    }

    // Transform Handles
    if (selectedElementIds.size > 0 && activeSelectionBounds) {
        const corners = getSelectionVisuals();
        
        if (corners && Array.isArray(corners)) {
            setSelectionBounds(corners); // Cache current state
            const handleSize = 10 / viewTransform.scale;
            
            // Rotate Handle (Top Mid projected)
            const topMidX = (corners[0].x + corners[1].x) / 2;
            const topMidY = (corners[0].y + corners[1].y) / 2;
            const dx = corners[1].x - corners[0].x;
            const dy = corners[1].y - corners[0].y;
            const angle = Math.atan2(dy, dx);
            const perpAngle = angle - Math.PI / 2;
            const stickLen = 20 / viewTransform.scale;
            const rotX = topMidX + Math.cos(perpAngle) * stickLen;
            const rotY = topMidY + Math.sin(perpAngle) * stickLen;

            if (Math.hypot(worldPos.x - rotX, worldPos.y - rotY) < handleSize) {
                setTransformHandle('rotate');
                setDragStartPos(worldPos);
                drawingSnapshotRef.current = JSON.parse(JSON.stringify(drawingElements));
                selectionBoundsSnapshotRef.current = JSON.parse(JSON.stringify(activeSelectionBounds));
                return;
            }

            const cornerMap = ['tl', 'tr', 'br', 'bl'];
            for(let i=0; i<4; i++) {
                if (Math.hypot(worldPos.x - corners[i].x, worldPos.y - corners[i].y) < handleSize) {
                    setTransformHandle(cornerMap[i]);
                    setDragStartPos(worldPos);
                    drawingSnapshotRef.current = JSON.parse(JSON.stringify(drawingElements));
                    selectionBoundsSnapshotRef.current = JSON.parse(JSON.stringify(activeSelectionBounds));
                    return;
                }
            }
        }
    }

    if (mode === 'zoom') { if (x < rect.width / 2) setZoomSelectionStart({ x, y }); }
    else if (mode === 'grab') { setDragStartPos({ x, y }); }
    
    // Select Tool Hit Testing
    else if (mode.startsWith('select')) {
        if (selectedElementIds.size > 0 && activeSelectionBounds) {
            let isInside = false;
            // Robust Hit Test for Polygon
            let poly = activeSelectionBounds.path;
            if (activeSelectionBounds.type === 'box' && poly.length === 2) {
                // Convert 2-point box to polygon for consistent hit test
                poly = [{x: poly[0].x, y: poly[0].y}, {x: poly[1].x, y: poly[0].y}, {x: poly[1].x, y: poly[1].y}, {x: poly[0].x, y: poly[1].y}];
            }
            isInside = isPointInPolygon(worldPos, poly);

            if (isInside) {
                setMode('move');
                setDraggingItem({ type: 'selection' });
                setDragStartPos({ x, y });
                drawingSnapshotRef.current = JSON.parse(JSON.stringify(drawingElements));
                selectionBoundsSnapshotRef.current = JSON.parse(JSON.stringify(activeSelectionBounds));
                return;
            }
        }
        // Start New Selection
        setActiveSelectionBounds(null);
        setSelectedElementIds(new Set());
        setSelectionPath([{ x: worldPos.x, y: worldPos.y }]);
    }
    
    else if (mode === 'draw') {
      const pressure = e.pointerType === 'pen' ? e.pressure : 1; 
      setCurrentPoints([{ x: worldPos.x, y: worldPos.y, pressure, pointerType: e.pointerType }]);
    } 
    else if (mode === 'line') { setLineStartPoint(lineStartPoint ? null : { x: worldPos.x, y: worldPos.y }); }
    else if (mode === 'move') {
        // Move Picking Logic
        if (selectedElementIds.size > 0) {
             setDraggingItem({ type: 'selection' });
             setDragStartPos({ x, y });
             drawingSnapshotRef.current = JSON.parse(JSON.stringify(drawingElements));
             selectionBoundsSnapshotRef.current = JSON.parse(JSON.stringify(activeSelectionBounds));
        } else {
             const hit = findElementAt(worldPos.x, worldPos.y);
             setDragStartPos({ x, y }); 
             if(hit) setDraggingItem(hit);
             else setDraggingItem({ type: 'layer_all' });
             drawingSnapshotRef.current = JSON.parse(JSON.stringify(drawingElements));
        }
    }
    else if (mode === 'measure') { /* ... measure logic ... */
      const activeUnit = unitTypes.find(u => u.id === activeUnitId);
      if (activeUnit && !activeUnit.base) {
        setIsCreatingUnit(true);
        setTempUnitStart({ x: worldPos.x, y: worldPos.y });
      } else if (activeUnit) {
        addMeasurement({ id: Date.now() + Math.random(), x: worldPos.x, y: worldPos.y, typeId: activeUnitId, angle: activeUnit.activeAngle || 0, length: activeUnit.base.length });
      }
    }
  };

  // --- Pointer Move ---
  const handlePointerMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
    mousePosRef.current = { x, y }; 
    const worldPos = toWorld(x, y);

    if (isAdjustingBrush && lastAdjustPos.current) {
        const dx = x - lastAdjustPos.current.x;
        const dy = y - lastAdjustPos.current.y;
        setBrushOpacity(prev => Math.min(1, Math.max(0.1, prev + dx * 0.005)));
        setBrushSize(prev => Math.min(50, Math.max(1, prev - dy * 0.2)));
        lastAdjustPos.current = { x, y };
        return; 
    }

    // --- TRANSFORM LOGIC ---
    if (transformHandle && dragStartPos) {
        const snapshot = drawingSnapshotRef.current;
        const selectionSnapshot = selectionBoundsSnapshotRef.current;
        
        let boundsPath = selectionSnapshot.path;
        // Normalize 2-point box to 4 corners
        if (selectionSnapshot.type === 'box' && boundsPath.length === 2) {
             boundsPath = [
                 {x: boundsPath[0].x, y: boundsPath[0].y},
                 {x: boundsPath[1].x, y: boundsPath[0].y},
                 {x: boundsPath[1].x, y: boundsPath[1].y},
                 {x: boundsPath[0].x, y: boundsPath[1].y}
             ];
        }

        // Center for rotation
        const cx = (boundsPath[0].x + boundsPath[2].x) / 2;
        const cy = (boundsPath[0].y + boundsPath[2].y) / 2;

        let transformedElements;
        let transformedSelectionPath;

        if (transformHandle === 'rotate') {
            const startAngle = Math.atan2(dragStartPos.y - cy, dragStartPos.x - cx);
            const currentAngle = Math.atan2(worldPos.y - cy, worldPos.x - cx);
            const angleDiff = currentAngle - startAngle;

            transformedElements = snapshot.map(el => {
                if (!selectedElementIds.has(el.id)) return el;
                if (el.type === 'stroke') return { ...el, points: el.points.map(p => rotatePoint(p, {x: cx, y: cy}, angleDiff)) };
                else if (el.type === 'line') return { ...el, start: rotatePoint(el.start, {x: cx, y: cy}, angleDiff), end: rotatePoint(el.end, {x: cx, y: cy}, angleDiff) };
                return el;
            });
            transformedSelectionPath = boundsPath.map(p => rotatePoint(p, {x: cx, y: cy}, angleDiff));

        } else {
            // SCALING
            const anchorMap = { 'tl': 2, 'tr': 3, 'br': 0, 'bl': 1 }; 
            const anchorIdx = anchorMap[transformHandle];
            const anchor = boundsPath[anchorIdx]; 
            
            // Uniform scaling based on distance ratio
            const startDist = Math.hypot(dragStartPos.x - anchor.x, dragStartPos.y - anchor.y);
            const currDist = Math.hypot(worldPos.x - anchor.x, worldPos.y - anchor.y);
            let scale = currDist / (startDist || 1);
            
            transformedElements = snapshot.map(el => {
                if (!selectedElementIds.has(el.id)) return el;
                if (el.type === 'stroke') return { ...el, points: el.points.map(p => scalePoint(p, anchor, scale, scale)) };
                else if (el.type === 'line') return { ...el, start: scalePoint(el.start, anchor, scale, scale), end: scalePoint(el.end, anchor, scale, scale) };
                return el;
            });
            transformedSelectionPath = boundsPath.map(p => scalePoint(p, anchor, scale, scale));
        }

        setDrawingElements(transformedElements);
        setActiveSelectionBounds({ ...activeSelectionBounds, path: transformedSelectionPath, type: 'box' });
        return;
    }

    if (mode === 'grab' && dragStartPos) {
        const dx = (x - dragStartPos.x) / viewTransform.scale;
        const dy = (y - dragStartPos.y) / viewTransform.scale;
        setViewTransform(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
        setDragStartPos({ x, y });
    }
    else if (mode.startsWith('select') && e.buttons === 1) {
        setSelectionPath(prev => [...prev, { x: worldPos.x, y: worldPos.y }]);
    }
    else if (mode === 'draw' && e.buttons === 1) {
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const newPoints = events.map(evt => {
         const rect = containerRef.current.getBoundingClientRect();
         const wp = toWorld(evt.clientX - rect.left, evt.clientY - rect.top);
         return { x: wp.x, y: wp.y, pressure: evt.pointerType === 'pen' ? evt.pressure : 1 };
      });
      setCurrentPoints(prev => [...prev, ...newPoints]);
      
      if (isEraser) {
          const hitThreshold = Math.max(10, brushSize);
          const measurementsToKeep = [];
          let changed = false;
          measurements.forEach(m => {
             const halfLen = m.length / 2;
             const sx = m.x - Math.cos(m.angle) * halfLen;
             const sy = m.y - Math.sin(m.angle) * halfLen;
             const ex = m.x + Math.cos(m.angle) * halfLen;
             const ey = m.y + Math.sin(m.angle) * halfLen;
             const dist = getDistanceToLineSegment(worldPos, {x: sx, y: sy}, {x: ex, y: ey});
             if (dist < hitThreshold) { changed = true; } else { measurementsToKeep.push(m); }
          });
          if (changed) setMeasurements(measurementsToKeep);
      }
    }
    else if (mode === 'move' && dragStartPos && draggingItem) {
      const dx = (x - dragStartPos.x) / viewTransform.scale;
      const dy = (y - dragStartPos.y) / viewTransform.scale;
      const snapshot = drawingSnapshotRef.current;
      
      if (draggingItem.type === 'selection') {
          // Move Elements
          const movedElements = snapshot.map(el => {
              if (selectedElementIds.has(el.id)) {
                  if (el.type === 'stroke') return { ...el, points: el.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) };
                  else if (el.type === 'line') return { ...el, start: { x: el.start.x + dx, y: el.start.y + dy }, end: { x: el.end.x + dx, y: el.end.y + dy } };
              }
              return el;
          });
          setDrawingElements(movedElements);

          // Move Selection Box (Consistent State)
          if (selectionBoundsSnapshotRef.current) {
              const snap = selectionBoundsSnapshotRef.current;
              let paths = snap.path;
              // Normalize box to 4 corners if needed
              if (snap.type === 'box' && paths.length === 2) {
                  paths = [{x: paths[0].x, y: paths[0].y}, {x: paths[1].x, y: paths[0].y}, {x: paths[1].x, y: paths[1].y}, {x: paths[0].x, y: paths[1].y}];
              }
              const newPath = paths.map(p => ({ x: p.x + dx, y: p.y + dy }));
              setActiveSelectionBounds({ ...activeSelectionBounds, type: 'box', path: newPath });
          }
      }
      else if (draggingItem.type === 'layer_all' || draggingItem.type === 'drawing') {
          const movedElements = snapshot.map(el => {
              const isTarget = draggingItem.type === 'drawing' ? el.id === draggingItem.id : (el.layerId === activeLayerId || (!el.layerId && activeLayerId === 'layer1'));
              if (!isTarget) return el;
              if (el.type === 'stroke') return { ...el, points: el.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) };
              else if (el.type === 'line') return { ...el, start: { x: el.start.x + dx, y: el.start.y + dy }, end: { x: el.end.x + dx, y: el.end.y + dy } };
              return el;
          });
          setDrawingElements(movedElements);
      }
      else if (draggingItem.type === 'measurement') {
          const movedMeasurements = measurementSnapshotRef.current.map(m => {
              if (m.id !== draggingItem.id) return m;
              return { ...m, x: m.x + dx, y: m.y + dy };
          });
          setMeasurements(movedMeasurements);
      }
    }
  };

  // --- Pointer Up ---
  const handlePointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    
    if (isAdjustingBrush) { setIsAdjustingBrush(false); return; }
    if (transformHandle) { setTransformHandle(null); setDragStartPos(null); return; }

    if (mode === 'zoom' && zoomSelectionStart) { setZoomSelectionStart(null); }
    else if (mode === 'grab') { setDragStartPos(null); }
    
    // --- SELECTION & SPLITTING LOGIC ---
    else if (mode.startsWith('select')) {
        const newDrawingElements = [];
        const newSelectionIds = new Set();
        
        // Define Hit Test Function
        let isInsideFn;
        let newBounds = null;

        if (mode === 'select-box' && selectionPath.length > 1) {
            const start = selectionPath[0];
            const end = selectionPath[selectionPath.length - 1];
            isInsideFn = (p) => isPointInRect(p, start, end);
            // Save as 4 corners for rotation later
            newBounds = { 
                type: 'box', 
                path: [{x: start.x, y: start.y}, {x: end.x, y: start.y}, {x: end.x, y: end.y}, {x: start.x, y: end.y}] 
            };
        } else if (selectionPath.length > 2) {
            isInsideFn = (p) => isPointInPolygon(p, selectionPath);
            newBounds = { type: 'lasso', path: [...selectionPath] };
        }

        if (isInsideFn) {
            drawingElements.forEach(el => {
                if (el.layerId !== activeLayerId && !(activeLayerId === 'layer1' && !el.layerId)) {
                    newDrawingElements.push(el);
                    return;
                }

                if (el.type === 'stroke' && el.points.length > 1) {
                    // --- SPLITTING ---
                    const segments = [];
                    let currentSegment = [];
                    let currentInside = isInsideFn(el.points[0]);
                    currentSegment.push(el.points[0]);

                    for(let i=1; i<el.points.length; i++) {
                        const p = el.points[i];
                        const isPInside = isInsideFn(p);
                        if (isPInside === currentInside) { currentSegment.push(p); } 
                        else {
                            currentSegment.push(p); // Duplicate connection point
                            segments.push({ points: currentSegment, inside: currentInside });
                            currentSegment = [p];
                            currentInside = isPInside;
                        }
                    }
                    segments.push({ points: currentSegment, inside: currentInside });

                    segments.forEach(seg => {
                        if (seg.points.length < 2) return;
                        const newEl = { ...el, id: Date.now() + Math.random(), points: seg.points };
                        newDrawingElements.push(newEl);
                        if (seg.inside) newSelectionIds.add(newEl.id);
                    });
                } 
                else if (el.type === 'line') {
                    // Convert line to points to allow splitting
                    const dist = Math.hypot(el.end.x - el.start.x, el.end.y - el.start.y);
                    const steps = Math.ceil(dist / 2);
                    const linePoints = [];
                    for(let i=0; i<=steps; i++) {
                        const t = steps===0?0:i/steps;
                        linePoints.push({ x: el.start.x + (el.end.x-el.start.x)*t, y: el.start.y + (el.end.y-el.start.y)*t, pressure:1 });
                    }
                    // Run same splitting loop
                    const segments = [];
                    let currentSegment = [];
                    let currentInside = isInsideFn(linePoints[0]);
                    currentSegment.push(linePoints[0]);
                    for(let i=1; i<linePoints.length; i++) {
                        const p = linePoints[i];
                        const isPInside = isInsideFn(p);
                        if (isPInside === currentInside) currentSegment.push(p);
                        else {
                            currentSegment.push(p);
                            segments.push({ points: currentSegment, inside: currentInside });
                            currentSegment = [p];
                            currentInside = isPInside;
                        }
                    }
                    segments.push({ points: currentSegment, inside: currentInside });
                    segments.forEach(seg => {
                        if (seg.points.length < 2) return;
                        const newEl = { ...el, id: Date.now() + Math.random(), type: 'stroke', points: seg.points };
                        newDrawingElements.push(newEl);
                        if (seg.inside) newSelectionIds.add(newEl.id);
                    });
                }
                else {
                    newDrawingElements.push(el);
                }
            });
            setDrawingElements(newDrawingElements);
            setSelectedElementIds(newSelectionIds);
            setActiveSelectionBounds(newSelectionIds.size > 0 ? newBounds : null);
        }
        setSelectionPath([]);
    }
    // -----------------------------------------------------------

    else if (mode === 'draw' && currentPoints.length > 0) {
      const newStroke = { id: Date.now(), type: 'stroke', layerId: activeLayerId, points: currentPoints, color: brushColor, size: brushSize, opacity: brushOpacity, isEraser: isEraser };
      setDrawingElements(prev => [...prev, newStroke]);
      setCurrentPoints([]);
    }
    else if (mode === 'line' && lineStartPoint) {
       const rect = containerRef.current.getBoundingClientRect();
       const worldPos = toWorld(e.clientX - rect.left, e.clientY - rect.top);
       let finalEnd = worldPos;
       if (isShiftDown) finalEnd = getSnappedPoint(lineStartPoint, finalEnd);
       const newLine = { id: Date.now(), type: 'line', layerId: activeLayerId, start: lineStartPoint, end: finalEnd, color: brushColor, size: brushSize, opacity: brushOpacity, isEraser: isEraser };
       setDrawingElements(prev => [...prev, newLine]);
       setLineStartPoint(null);
    }
    else if (mode === 'move') {
      setDragStartPos(null);
      setDraggingItem(null);
      drawingSnapshotRef.current = null;
      selectionBoundsSnapshotRef.current = null;
    }
else if (mode === 'measure' && isCreatingUnit) {
      // 1. Calculate where the mouse was released
      const rect = containerRef.current.getBoundingClientRect();
      const worldPos = toWorld(e.clientX - rect.left, e.clientY - rect.top);
      
      // 2. If we have a start point, save the base to the active unit
      if (tempUnitStart) {
          const dx = worldPos.x - tempUnitStart.x;
          const dy = worldPos.y - tempUnitStart.y;
          const length = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);

          // Only save if the length is significant (prevents accidental clicks)
          if (length > 0) {
              setUnitTypes(prev => prev.map(u => {
                  if (u.id === activeUnitId) {
                      return {
                          ...u,
                          base: {
                              x1: tempUnitStart.x,
                              y1: tempUnitStart.y,
                              x2: worldPos.x,
                              y2: worldPos.y,
                              length: length,
                              angle: angle
                          },
                          // Set the active angle to the drawn angle initially
                          activeAngle: angle 
                      };
                  }
                  return u;
              }));
          }
      }

      // 3. Reset flags
      setIsCreatingUnit(false);
      setTempUnitStart(null);
    }
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp, getSelectionVisuals };
};
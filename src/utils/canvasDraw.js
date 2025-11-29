// src/utils/canvasDraw.js

// --- Catmull-Rom Spline Helper ---
// Interpolates points to create a smooth curve passing through them
const getStrokePoints = (points) => {
  if (points.length < 3) return points;

  const newPoints = [];
  
  // Always include the first point
  newPoints.push(points[0]);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    // Dynamic resolution: roughly 1 interpolated point every 2 pixels
    const steps = Math.max(1, Math.ceil(dist / 2));

    for (let t = 1; t <= steps; t++) {
       const st = t / steps;
       const t2 = st * st;
       const t3 = st * t2;
       
       // Catmull-Rom calculation
       const x = 0.5 * (
         (2 * p1.x) +
         (-p0.x + p2.x) * st +
         (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
         (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
       );

       const y = 0.5 * (
         (2 * p1.y) +
         (-p0.y + p2.y) * st +
         (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
         (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
       );
       
       // Linear interpolation for pressure to keep line width smooth
       const pressure = p1.pressure + (p2.pressure - p1.pressure) * st;

       newPoints.push({ x, y, pressure });
    }
  }
  return newPoints;
};

export const drawVariableWidthPath = (ctx, points, baseSize, baseColor, opacity, isEraser, enablePressure) => {
  if (!points || points.length === 0) return;

  // 1. Generate Smooth Spline Points
  // Only smooth if we have enough points, otherwise render raw input
  const drawPoints = points.length > 2 ? getStrokePoints(points) : points;

  ctx.fillStyle = baseColor;
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';

  // Case: Single Point (Dot)
  if (drawPoints.length === 1) {
    const p = drawPoints[0];
    const pressure = enablePressure ? (p.pressure ?? 0.5) : 0.5;
    const r = (baseSize * Math.max(0.1, pressure)) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const leftPts = [];
  const rightPts = [];

  // 2. Calculate Ribbon Polygon (Variable Width)
  for (let i = 0; i < drawPoints.length; i++) {
    const curr = drawPoints[i];
    const pressure = enablePressure ? (curr.pressure ?? 0.5) : 1.0; 
    const r = (baseSize * Math.max(0.1, pressure)) / 2;

    let nx, ny;

    // Calculate Normal Vector for width expansion
    if (i === 0) {
      // Start: use forward tangent
      const next = drawPoints[i + 1];
      const dx = next.x - curr.x;
      const dy = next.y - curr.y;
      const len = Math.hypot(dx, dy) || 1;
      nx = -dy / len;
      ny = dx / len;
    } else if (i === drawPoints.length - 1) {
      // End: use backward tangent
      const prev = drawPoints[i - 1];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      nx = -dy / len;
      ny = dx / len;
    } else {
      // Middle: Average Tangent for smooth joins at sharp corners
      const prev = drawPoints[i - 1];
      const next = drawPoints[i + 1];
      
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const len1 = Math.hypot(dx1, dy1) || 1;
      
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.hypot(dx2, dy2) || 1;

      // Average direction
      const tx = (dx1/len1 + dx2/len2);
      const ty = (dy1/len1 + dy2/len2);
      const tLen = Math.hypot(tx, ty) || 1;
      
      // Normal is perpendicular to average tangent
      nx = -ty / tLen;
      ny = tx / tLen;
    }

    leftPts.push({ x: curr.x + nx * r, y: curr.y + ny * r });
    rightPts.push({ x: curr.x - nx * r, y: curr.y - ny * r });
  }

  // 3. Construct and Fill Path
  ctx.beginPath();
  
  // Left edge
  ctx.moveTo(leftPts[0].x, leftPts[0].y);
  for (let i = 1; i < leftPts.length; i++) {
    ctx.lineTo(leftPts[i].x, leftPts[i].y);
  }
  
  // End Cap (Round)
  const lastP = drawPoints[drawPoints.length - 1];
  const lastPressure = enablePressure ? (lastP.pressure ?? 0.5) : 1.0;
  const lastR = (baseSize * Math.max(0.1, lastPressure)) / 2;
  ctx.arc(lastP.x, lastP.y, lastR, 0, Math.PI * 2);

  // Right edge (reverse order)
  for (let i = rightPts.length - 1; i >= 0; i--) {
    ctx.lineTo(rightPts[i].x, rightPts[i].y);
  }
  
  // Start Cap (Round)
  const firstP = drawPoints[0];
  const firstPressure = enablePressure ? (firstP.pressure ?? 0.5) : 1.0;
  const firstR = (baseSize * Math.max(0.1, firstPressure)) / 2;
  ctx.arc(firstP.x, firstP.y, firstR, 0, Math.PI * 2);
  
  ctx.closePath();
  ctx.fill();
};

export const drawElement = (ctx, el) => {
  if (el.type === 'stroke') {
    drawVariableWidthPath(ctx, el.points, el.size, el.color, el.opacity, el.isEraser, true);
  } else if (el.type === 'line') {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = el.size;
    ctx.strokeStyle = el.color;
    ctx.globalAlpha = el.opacity;
    ctx.globalCompositeOperation = el.isEraser ? 'destination-out' : 'source-over';
    ctx.beginPath();
    ctx.moveTo(el.start.x, el.start.y);
    ctx.lineTo(el.end.x, el.end.y);
    ctx.stroke();
    ctx.restore();
  }
};

export const drawCap = (ctx, x, y, angle, color, scaleFactor = 1) => {
  const capSize = 5 / scaleFactor;
  const perpAngle = angle + Math.PI / 2;
  const dx = Math.cos(perpAngle) * capSize;
  const dy = Math.sin(perpAngle) * capSize;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 / scaleFactor;
  ctx.beginPath();
  ctx.moveTo(x - dx, y - dy);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.restore();
};

export const drawUnitLine = (ctx, startX, startY, endX, endY, color, label, isDashed, capsColor, scaleFactor = 1) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 / scaleFactor;
  if (isDashed) ctx.setLineDash([5 / scaleFactor, 5 / scaleFactor]);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  const angle = Math.atan2(endY - startY, endX - startX);
  const actualCapColor = capsColor || color;
  drawCap(ctx, startX, startY, angle, actualCapColor, scaleFactor);
  drawCap(ctx, endX, endY, angle, actualCapColor, scaleFactor);
  if (label) {
    ctx.fillStyle = color;
    const fontSize = 12 / scaleFactor;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillText(label, (startX + endX) / 2, (startY + endY) / 2 - (8/scaleFactor));
  }
  ctx.restore();
};

export const drawUnitGhost = (ctx, mx, my, unitSnap, color, scaleFactor = 1) => {
  const offsetX = (Math.cos(unitSnap.angle) * unitSnap.length) / 2;
  const offsetY = (Math.sin(unitSnap.angle) * unitSnap.length) / 2;
  drawUnitLine(ctx, mx - offsetX, my - offsetY, mx + offsetX, my + offsetY, color, null, false, null, scaleFactor);
};

export const drawTransformBox = (ctx, boundsOrCorners, scale) => {
  if (!boundsOrCorners) return;
  
  const handleSize = 8 / scale;
  const lineWidth = 1 / scale;

  ctx.save();
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);

  let corners = [];
  
  if (Array.isArray(boundsOrCorners)) {
      corners = boundsOrCorners; 
  } else {
      const { x, y, width, height } = boundsOrCorners;
      corners = [
          { x: x, y: y }, 
          { x: x + width, y: y }, 
          { x: x + width, y: y + height }, 
          { x: x, y: y + height } 
      ];
  }

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.stroke();

  const drawHandle = (p) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00aaff';
    ctx.fillRect(p.x - handleSize/2, p.y - handleSize/2, handleSize, handleSize);
    ctx.strokeRect(p.x - handleSize/2, p.y - handleSize/2, handleSize, handleSize);
  };
  corners.forEach(p => drawHandle(p));

  const topMidX = (corners[0].x + corners[1].x) / 2;
  const topMidY = (corners[0].y + corners[1].y) / 2;
  
  const dx = corners[1].x - corners[0].x;
  const dy = corners[1].y - corners[0].y;
  const angle = Math.atan2(dy, dx);
  const perpAngle = angle - Math.PI / 2; 
  
  const stickLen = 20 / scale;
  const handleX = topMidX + Math.cos(perpAngle) * stickLen;
  const handleY = topMidY + Math.sin(perpAngle) * stickLen;

  ctx.beginPath();
  ctx.moveTo(topMidX, topMidY);
  ctx.lineTo(handleX, handleY);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(handleX, handleY, handleSize / 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#00aaff';
  ctx.fill();

  ctx.restore();
};
// src/utils/canvasDraw.js

// ... [Keep drawVariableWidthPath, drawElement, drawCap, drawUnitLine, drawUnitGhost as they are] ...

export const drawVariableWidthPath = (ctx, points, baseSize, baseColor, opacity, isEraser, enablePressure) => {
  if (!points || points.length === 0) return;

  ctx.fillStyle = baseColor;
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';

  if (points.length === 1) {
    const p = points[0];
    const pressure = enablePressure ? (p.pressure !== undefined ? p.pressure : 0.5) : 1.0;
    const r = (baseSize * Math.max(0.1, pressure)) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const leftPts = [];
  const rightPts = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const pressure = enablePressure ? (curr.pressure !== undefined ? curr.pressure : 0.5) : 1.0;
    const r = (baseSize * Math.max(0.1, pressure)) / 2;

    let angle;
    if (i < points.length - 1) {
      const next = points[i + 1];
      angle = Math.atan2(next.y - curr.y, next.x - curr.x);
    } else {
      const prev = points[i - 1];
      angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    }

    const nx = Math.sin(angle);
    const ny = -Math.cos(angle);

    leftPts.push({ x: curr.x + nx * r, y: curr.y + ny * r });
    rightPts.push({ x: curr.x - nx * r, y: curr.y - ny * r });
  }

  ctx.beginPath();
  ctx.moveTo(leftPts[0].x, leftPts[0].y);
  for (let i = 1; i < leftPts.length; i++) {
    ctx.lineTo(leftPts[i].x, leftPts[i].y);
  }
  const lastP = points[points.length - 1];
  const lastR = (baseSize * Math.max(0.1, (enablePressure ? lastP.pressure : 1.0))) / 2;
  ctx.arc(lastP.x, lastP.y, lastR, 0, Math.PI * 2);
  for (let i = rightPts.length - 1; i >= 0; i--) {
    ctx.lineTo(rightPts[i].x, rightPts[i].y);
  }
  const firstP = points[0];
  const firstR = (baseSize * Math.max(0.1, (enablePressure ? firstP.pressure : 1.0))) / 2;
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

// --- UPDATED drawTransformBox ---
// Accepts either a bounds object {x,y,w,h} OR an array of 4 points [TL, TR, BR, BL]
export const drawTransformBox = (ctx, boundsOrCorners, scale) => {
  if (!boundsOrCorners) return;
  
  const handleSize = 8 / scale;
  const lineWidth = 1 / scale;

  ctx.save();
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);

  let corners = [];
  
  // 1. Normalize Input to 4 Corners
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

  // 2. Draw Box Path
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.stroke();

  // 3. Draw Corner Handles
  const drawHandle = (p) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00aaff';
    ctx.fillRect(p.x - handleSize/2, p.y - handleSize/2, handleSize, handleSize);
    ctx.strokeRect(p.x - handleSize/2, p.y - handleSize/2, handleSize, handleSize);
  };
  corners.forEach(p => drawHandle(p));

  // 4. Draw Rotate Handle (Projected from Top Edge)
  // Midpoint of Top Edge (corners[0] and corners[1])
  const topMidX = (corners[0].x + corners[1].x) / 2;
  const topMidY = (corners[0].y + corners[1].y) / 2;
  
  // Vector 0->1
  const dx = corners[1].x - corners[0].x;
  const dy = corners[1].y - corners[0].y;
  const angle = Math.atan2(dy, dx);
  const perpAngle = angle - Math.PI / 2; // 90 degrees up
  
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
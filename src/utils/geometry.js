// Calculates the world coordinates based on screen position and view transform
export const screenToWorld = (screenX, screenY, containerWidth, viewTransform) => {
  const halfWidth = containerWidth / 2;
  const isRightPane = screenX > halfWidth;
  const paneOriginX = isRightPane ? halfWidth : 0;
  const localX = screenX - paneOriginX;
  const localY = screenY;
  const worldX = (localX / viewTransform.scale) + viewTransform.x;
  const worldY = (localY / viewTransform.scale) + viewTransform.y;
  const finalX = isRightPane ? worldX + halfWidth : worldX;
  return { x: finalX, y: worldY };
};

export const getDistanceToLineSegment = (p, v, w) => {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
  return Math.sqrt((p.x - projection.x) ** 2 + (p.y - projection.y) ** 2);
};

export const isPointInRect = (point, rectStart, rectEnd) => {
  const minX = Math.min(rectStart.x, rectEnd.x);
  const maxX = Math.max(rectStart.x, rectEnd.x);
  const minY = Math.min(rectStart.y, rectEnd.y);
  const maxY = Math.max(rectStart.y, rectEnd.y);
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
};

export const isPointInPolygon = (point, vs) => {
  let x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i].x, yi = vs[i].y;
    let xj = vs[j].x, yj = vs[j].y;
    let intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

export const getSnappedPoint = (start, current) => {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const angle = Math.atan2(dy, dx);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  return {
    x: start.x + Math.cos(snappedAngle) * dist,
    y: start.y + Math.sin(snappedAngle) * dist
  };
};

// --- NEW FUNCTIONS FOR TRANSFORM ---

export const getElementsBounds = (elements) => {
  if (!elements || elements.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  elements.forEach(el => {
    if (el.type === 'stroke') {
      el.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    } else if (el.type === 'line') {
      [el.start, el.end].forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    }
  });

  if (minX === Infinity) return null;

  return {
    x: minX, y: minY,
    width: maxX - minX,
    height: maxY - minY,
    cx: minX + (maxX - minX) / 2,
    cy: minY + (maxY - minY) / 2
  };
};

export const rotatePoint = (point, center, angle) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    ...point, // Preserve pressure
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos)
  };
};

export const scalePoint = (point, origin, scaleX, scaleY) => {
  return {
    ...point, // Preserve pressure
    x: origin.x + (point.x - origin.x) * scaleX,
    y: origin.y + (point.y - origin.y) * scaleY
  };
};
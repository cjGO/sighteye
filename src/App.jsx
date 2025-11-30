import React, { useRef, useEffect, useCallback } from 'react';
import { Upload, ImagePlus, Eye, EyeOff, Moon, Layers, Plus, X, Sliders, Lightbulb, Trash2 } from 'lucide-react';

// --- Imports ---
import { COLORS } from './utils/constants';
import { screenToWorld } from './utils/geometry';
import { drawVariableWidthPath, drawElement, drawUnitLine, drawUnitGhost } from './utils/canvasDraw';

// --- Components ---
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { LayerPanel } from './components/LayerPanel';
import { ColorPalette } from './components/ColorPalette';

// --- Context & Hooks ---
import { PortraitProvider, usePortrait } from './context/PortraitContext';
import { useRecorder } from './hooks/useRecorder';
import { useCanvasInput } from './hooks/useCanvasInput';
import { useOverlay } from './hooks/useOverlay';

// ============================================================================
// INNER COMPONENT: Consumes Context + Manages Refs/Canvas
// ============================================================================
const PortraitContent = () => {
  // --- Refs ---
  const canvasRef = useRef(null);
  const tempCanvasRef = useRef(null);
  const staticCanvasRef = useRef(null); // NEW: Caches completed strokes
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);
  const brushColorInputRef = useRef(null);
  const bgColorInputRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const drawingSnapshotRef = useRef(null);
  const measurementSnapshotRef = useRef(null);
  const lastAdjustPos = useRef(null);
  const kTimerRef = useRef(null);

  // --- Consume Context ---
  const ctx = usePortrait();
  const {
    mode, setMode, switchMode,
    brushSize, brushColor, setBrushColor, brushOpacity, isEraser, setIsEraser, setBrushOpacity, setBrushSize,
    usePressure, setUsePressure,
    layers, activeLayerId, drawingElements, setDrawingElements,
    measurements, setMeasurements, addMeasurement, restoreHistory,
    selectedElementIds, setSelectedElementIds, selectionPath, setSelectionPath, activeSelectionBounds, setActiveSelectionBounds,
    dragStartPos, setDragStartPos, draggingItem, setDraggingItem,
    isAdjustingBrush, setIsAdjustingBrush,
    lineStartPoint, setLineStartPoint, isShiftDown, setIsShiftDown,
    viewTransform, setViewTransform, resetZoom,
    zoomSelectionStart, setZoomSelectionStart,
    gridLevel, setGridLevel,
    mousePos, setMousePos,
    currentPoints, setCurrentPoints,
    imageSrc1, setImageSrc1, opacity1, setOpacity1, grayscale1, setGrayscale1,
    imageSrc2, setImageSrc2, opacity2, setOpacity2, grayscale2, setGrayscale2,
    activeSidePanel, setActiveSidePanel, showRefControls,
    handleResetAll, clearActiveLayer,
    unitTypes, setUnitTypes, activeUnitId, setActiveUnitId,
    measurementsOpacity, setMeasurementsOpacity, isCreatingUnit, setIsCreatingUnit, tempUnitStart, setTempUnitStart,
    bgColor, setBgColor
  } = ctx;

  // --- Helper: World Coords ---
  const toWorld = (screenX, screenY) => {
    if (!containerRef.current) return { x: screenX, y: screenY };
    const { width } = containerRef.current.getBoundingClientRect();
    return screenToWorld(screenX, screenY, width, viewTransform);
  };

  const getImageStyle = (isRight) => {
    const baseStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', transformOrigin: '0 0' };
    const tx = -viewTransform.x * viewTransform.scale; // Fixed typo here
    const ty = -viewTransform.y * viewTransform.scale;
    const wStr = `${100 * viewTransform.scale}%`;
    return { ...baseStyle, width: wStr, height: wStr, top: `${ty}px`, left: `${tx}px`, maxWidth: 'none', maxHeight: 'none', objectFit: 'contain' };
  };

  // --- Canvas Input Hook ---
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasInput({
    ...ctx,
    containerRef,
    toWorld: (x, y) => toWorld(x, y),
    drawingSnapshotRef, measurementSnapshotRef, lastAdjustPos, mousePosRef
  });

  // --- Overlay Hook ---
  useOverlay({
    ...ctx,
    overlayRef, containerRef,
    toWorld: (x, y) => toWorld(x, y)
  });

  // --- Init Canvases ---
  useEffect(() => {
    if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement('canvas');
    if (!staticCanvasRef.current) staticCanvasRef.current = document.createElement('canvas');
  }, []);

  // --- 1. RENDER STATIC SCENE (Heavy Operation) ---
  // Only runs when drawing history, layers, or view transform changes.
  const renderStaticScene = useCallback(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const halfWidth = width / 2;

    if (tempCanvasRef.current) {
      if (tempCanvasRef.current.width !== width || tempCanvasRef.current.height !== height) {
        tempCanvasRef.current.width = width;
        tempCanvasRef.current.height = height;
      }
    }
    const tempCtx = tempCanvasRef.current ? tempCanvasRef.current.getContext('2d') : null;

    ctx.clearRect(0, 0, width, height);

    const renderPane = (isRight) => {
      const vx = viewTransform.x;
      const vy = viewTransform.y;
      const s = viewTransform.scale;

      let a = s, b = 0, c = 0, d = s;
      let e_x = isRight ? (halfWidth - s * (halfWidth + vx)) : (-vx * s);
      let f_y = -vy * s;

      ctx.save();
      ctx.beginPath();
      if (isRight) ctx.rect(halfWidth, 0, halfWidth, height);
      else ctx.rect(0, 0, halfWidth, height);
      ctx.clip();

      layers.forEach(layer => {
        if (!layer.visible) return;
        const layerElements = drawingElements.filter(el => el.layerId === layer.id || (!el.layerId && layer.id === 'layer1'));

        if (layerElements.length === 0) return;

        if (tempCtx) {
          tempCtx.setTransform(1, 0, 0, 1, 0, 0);
          tempCtx.clearRect(0, 0, width, height);
          tempCtx.setTransform(a, b, c, d, e_x, f_y);
          layerElements.forEach(el => drawElement(tempCtx, el));

          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(tempCanvasRef.current, 0, 0);
        }
      });
      ctx.restore();
    };

    renderPane(false);
    renderPane(true);
  }, [drawingElements, layers, viewTransform]);

  // --- 2. RENDER ACTIVE FRAME (Fast Operation) ---
  // Runs on every mouse move to draw the static image + the current brush stroke.
  const renderActiveFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const halfWidth = width / 2;

    ctx.clearRect(0, 0, width, height);

    // 1. Blit Static Scene
    if (staticCanvasRef.current) {
      ctx.drawImage(staticCanvasRef.current, 0, 0);
    }

    // 2. Draw Active Stroke
    if (currentPoints.length > 0) {
      const renderActiveStroke = (isRight) => {
        const vx = viewTransform.x;
        const vy = viewTransform.y;
        const s = viewTransform.scale;

        let a = s, b = 0, c = 0, d = s;
        let e_x = isRight ? (halfWidth - s * (halfWidth + vx)) : (-vx * s);
        let f_y = -vy * s;

        ctx.save();
        ctx.beginPath();
        if (isRight) ctx.rect(halfWidth, 0, halfWidth, height);
        else ctx.rect(0, 0, halfWidth, height);
        ctx.clip();

        ctx.setTransform(a, b, c, d, e_x, f_y);

        // Inherit opacity from active layer
        const layer = layers.find(l => l.id === activeLayerId);
        const opacity = layer ? layer.opacity : 1;
        ctx.globalAlpha = opacity;

        drawVariableWidthPath(ctx, currentPoints, brushSize, brushColor, brushOpacity, isEraser, usePressure);

        ctx.restore();
      };

      renderActiveStroke(false);
      renderActiveStroke(true);
    }
  };

  const { isPlaying, isRecording, recordingProgress, videoFormat, setVideoFormat, showVideoMenu, setShowVideoMenu, togglePlayback, handleExportVideo } = useRecorder();

  // Redraw helper for Recorder
  const fullRedraw = () => {
      renderStaticScene();
      renderActiveFrame();
  };

  // --- Handlers ---
  const handleTogglePlayback = () => togglePlayback(canvasRef, tempCanvasRef, drawingElements, layers, viewTransform, fullRedraw);
  const handleVideoExport = (duration) => handleExportVideo(duration, canvasRef, drawingElements, layers, viewTransform, bgColor, imageSrc2, opacity2, grayscale2);

  const handleSave = () => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const paneWidth = width / 2;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = paneWidth;
    exportCanvas.height = height;
    const expCtx = exportCanvas.getContext('2d');

    expCtx.fillStyle = bgColor;
    expCtx.fillRect(0, 0, paneWidth, height);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc2;
    img.onload = () => {
      expCtx.save();
      if (grayscale2) expCtx.filter = 'grayscale(100%)';
      expCtx.globalAlpha = opacity2;
      const scale = viewTransform.scale;
      const targetX = -viewTransform.x * scale;
      const targetY = -viewTransform.y * scale;
      const imgRatio = img.width / img.height;
      let drawW, drawH, offsetX, offsetY;
      const targetW = paneWidth * scale;
      const targetH = height * scale;
      if (imgRatio > paneWidth / height) { drawW = targetW; drawH = targetW / imgRatio; offsetX = targetX; offsetY = targetY + (targetH - drawH) / 2; }
      else { drawH = targetH; drawW = targetH * imgRatio; offsetY = targetY; offsetX = targetX + (targetW - drawW) / 2; }
      expCtx.drawImage(img, offsetX, offsetY, drawW, drawH);
      expCtx.restore();

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = paneWidth;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');

      expCtx.save();
      expCtx.beginPath(); expCtx.rect(0, 0, paneWidth, height); expCtx.clip();

      layers.forEach(layer => {
        if (!layer.visible) return;
        const layerEls = drawingElements.filter(el => el.layerId === layer.id || (!el.layerId && layer.id === 'layer1'));

        tempCtx.setTransform(1, 0, 0, 1, 0, 0);
        tempCtx.clearRect(0, 0, paneWidth, height);
        tempCtx.setTransform(scale, 0, 0, scale, targetX, targetY);

        layerEls.forEach(el => drawElement(tempCtx, el));

        expCtx.save();
        expCtx.globalAlpha = layer.opacity;
        expCtx.drawImage(tempCanvas, 0, 0);
        expCtx.restore();
      });

      expCtx.save();
      expCtx.scale(scale, scale);
      expCtx.translate(-(paneWidth + viewTransform.x), -viewTransform.y);

      unitTypes.forEach(type => {
        if (!type.visible || !type.base) return;
        expCtx.save(); expCtx.globalAlpha = type.opacity;
        drawUnitLine(expCtx, type.base.x1, type.base.y1, type.base.x2, type.base.y2, type.color, null, false, '#ffff00', 1);
        expCtx.restore();
      });
      measurements.forEach((m) => {
        const type = unitTypes.find(u => u.id === m.typeId);
        if (type && type.visible && type.base) {
          expCtx.save(); expCtx.globalAlpha = type.opacity * measurementsOpacity;
          drawUnitGhost(expCtx, m.x, m.y, m, type.color, 1);
          expCtx.restore();
        }
      });

      expCtx.restore();
      expCtx.restore();

      const link = document.createElement('a');
      link.download = 'portrait-study.png';
      link.href = exportCanvas.toDataURL();
      link.click();
    };
  };

  const handleImageUpload1 = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => setImageSrc1(ev.target.result); reader.readAsDataURL(file); } };
  const handleImageUpload2 = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => setImageSrc2(ev.target.result); reader.readAsDataURL(file); } };

  // --- Effects ---
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current && overlayRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = width; canvasRef.current.height = height;
        overlayRef.current.width = width; overlayRef.current.height = height;
        if (tempCanvasRef.current) { tempCanvasRef.current.width = width; tempCanvasRef.current.height = height; }
        if (staticCanvasRef.current) { staticCanvasRef.current.width = width; staticCanvasRef.current.height = height; }
        
        renderStaticScene(); // Redraw static on resize
        renderActiveFrame(); // Update view
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [renderStaticScene]);

  // Effect: Update Static Scene (Heavy) only when data/view changes
  useEffect(() => {
    if (isPlaying) return;
    renderStaticScene();
    renderActiveFrame();
  }, [drawingElements, viewTransform, layers, isPlaying, renderStaticScene]);

  // Effect: Update Active Frame (Fast) when drawing active stroke or changing brush
  useEffect(() => {
    if (isPlaying) return;
    renderActiveFrame();
  }, [currentPoints, brushSize, brushColor, brushOpacity, isEraser, usePressure, isPlaying, activeLayerId]);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            if (containerRef.current) {
              const { width } = containerRef.current.getBoundingClientRect();
              const isLeftPane = mousePosRef.current.x < width / 2;
              if (isLeftPane) setImageSrc1(event.target.result);
              else setImageSrc2(event.target.result);
            }
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setImageSrc1, setImageSrc2]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') { setIsShiftDown(true); return; }
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      if (key === 'b') { setMode('draw'); setIsEraser(false); setLineStartPoint(null); }
      else if (key === 'e') { setMode('draw'); setIsEraser(true); setLineStartPoint(null); }
      else if (key === 'd') { switchMode('grab'); }
      else if (key === 's') { switchMode(mode === 'select-box' ? 'select-lasso' : 'select-box'); }
      else if (key === 'm') {
        if (mode !== 'measure') { switchMode('measure'); }
        else { const idx = unitTypes.findIndex(u => u.id === activeUnitId); if (idx !== -1 && unitTypes.length > 1) setActiveUnitId(unitTypes[(idx + 1) % unitTypes.length].id); }
      }
      else if (key === 'f') { setOpacity2(prev => (prev > 0 ? 0 : 0.5)); }
      else if (key === 'g') { setGridLevel(prev => (prev + 1) % 4); }
      else if (key === 't') { restoreHistory(); }
      else if (key === 'k') {
        if (!e.repeat && !kTimerRef.current) {
          kTimerRef.current = setTimeout(() => {
            handleResetAll();
            kTimerRef.current = null;
          }, 2000);
        }
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') setIsShiftDown(false);
      if (e.key.toLowerCase() === 'k') {
        if (kTimerRef.current) {
          clearTimeout(kTimerRef.current);
          kTimerRef.current = null;
          clearActiveLayer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [drawingElements, mode, unitTypes, activeUnitId]);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans touch-none"
      onWheel={(e) => {
        if (mode === 'grab') {
          e.preventDefault();
          const rect = containerRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const { width } = rect;
          const halfWidth = width / 2;
          const isRightPane = x > halfWidth;
          const localX = isRightPane ? x - halfWidth : x;
          const localY = y;
          const worldX = (localX / viewTransform.scale) + viewTransform.x;
          const worldY = (localY / viewTransform.scale) + viewTransform.y;
          const zoomIntensity = 0.1;
          const direction = -Math.sign(e.deltaY);
          const newScale = Math.max(0.1, Math.min(10, viewTransform.scale + (direction * zoomIntensity * viewTransform.scale)));
          const newViewX = worldX - (localX / newScale);
          const newViewY = worldY - (localY / newScale);
          setViewTransform({ scale: newScale, x: newViewX, y: newViewY });
        } else if (mode === 'measure') {
          const activeUnit = unitTypes.find(u => u.id === activeUnitId);
          if (activeUnit && activeUnit.base && !isCreatingUnit) {
            const rotationStep = 0.05;
            const direction = Math.sign(e.deltaY);
            const currentAngle = activeUnit.activeAngle !== undefined ? activeUnit.activeAngle : activeUnit.base.angle;
            setUnitTypes(prev => prev.map(u => u.id === activeUnitId ? { ...u, activeAngle: currentAngle + (direction * rotationStep) } : u));
          }
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <TopBar showVideoMenu={showVideoMenu} setShowVideoMenu={setShowVideoMenu} isRecording={isRecording} recordingProgress={recordingProgress} videoFormat={videoFormat} setVideoFormat={setVideoFormat} togglePlayback={handleTogglePlayback} handleExportVideo={handleVideoExport} handleSave={handleSave} />
      <div className="flex-1 relative flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {showRefControls && (
            <div className="h-10 bg-slate-800 border-b border-slate-700 flex flex-shrink-0 z-30">
              <div className="w-1/2 flex items-center px-4 gap-4 border-r border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 uppercase hidden sm:inline">Ref 1</span>
                <button onClick={() => fileInputRef1.current.click()} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white flex items-center gap-1 transition"><Upload size={12} /> Change</button>
                <button onClick={() => setGrayscale1(!grayscale1)} className={`p-1.5 rounded transition ${grayscale1 ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-700'}`}><Moon size={14} /></button>
                <div className="flex items-center gap-2 flex-1 max-w-[150px]"><EyeOff size={14} className="text-slate-500" /><input type="range" min="0" max="1" step="0.05" value={opacity1} onChange={(e) => setOpacity1(parseFloat(e.target.value))} className="flex-1 h-1 accent-blue-500 bg-slate-600 rounded-lg appearance-none cursor-pointer" /><Eye size={14} className="text-slate-300" /></div>
              </div>
              <div className="w-1/2 flex items-center px-4 gap-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase hidden sm:inline">Ref 2</span>
                <button onClick={() => fileInputRef2.current.click()} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white flex items-center gap-1 transition"><Upload size={12} /> Change</button>
                <button onClick={() => setGrayscale2(!grayscale2)} className={`p-1.5 rounded transition ${grayscale2 ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-700'}`}><Moon size={10} /></button>
                <div className="flex items-center gap-2 flex-1 max-w-[150px]"><EyeOff size={14} className="text-slate-500" /><input type="range" min="0" max="1" step="0.05" value={opacity2} onChange={(e) => setOpacity2(parseFloat(e.target.value))} className="flex-1 h-1 accent-blue-500 bg-slate-600 rounded-lg appearance-none cursor-pointer" /><Eye size={14} className="text-slate-300" /></div>
              </div>
            </div>
          )}
          <input type="file" ref={fileInputRef1} onChange={handleImageUpload1} accept="image/*" className="hidden" />
          <input type="file" ref={fileInputRef2} onChange={handleImageUpload2} accept="image/*" className="hidden" />
          <input type="color" ref={brushColorInputRef} onChange={(e) => setBrushColor(e.target.value)} className="hidden" />
          <input type="color" ref={bgColorInputRef} onChange={(e) => setBgColor(e.target.value)} className="hidden" />

          <div className="flex-1 relative flex flex-row overflow-hidden select-none" ref={containerRef} style={{ backgroundColor: bgColor }}>
            <div className="w-1/2 h-full relative border-r border-slate-700/50 overflow-hidden">
              {imageSrc1 ? (<img src={imageSrc1} alt="Ref 1" style={{ ...getImageStyle(false), opacity: opacity1, filter: grayscale1 ? 'grayscale(100%)' : 'none' }} />) : (<div className="w-full h-full flex items-center justify-center text-slate-600 text-sm flex-col"><ImagePlus size={32} className="mb-2 opacity-50" /><span>No Image</span></div>)}
            </div>
            <div className="w-1/2 h-full relative overflow-hidden">
              {imageSrc2 ? (<img src={imageSrc2} alt="Ref 2" style={{ ...getImageStyle(true), opacity: opacity2, filter: grayscale2 ? 'grayscale(100%)' : 'none' }} />) : (<div className="w-full h-full flex items-center justify-center text-slate-600 text-sm flex-col"><ImagePlus size={32} className="mb-2 opacity-50" /><span>No Image</span></div>)}
            </div>
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full touch-none pointer-events-none" style={{ zIndex: 10 }} />
            <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full touch-none" style={{ zIndex: 20, cursor: mode === 'move' ? 'move' : mode === 'grab' ? (dragStartPos ? 'grabbing' : 'grab') : mode.startsWith('select') ? 'crosshair' : mode === 'zoom' ? 'zoom-in' : mode === 'draw' || mode === 'line' ? 'crosshair' : 'default' }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerOut={handlePointerUp} />

            {activeSidePanel === 'palette' && (<ColorPalette onPickCustomBrushColor={() => brushColorInputRef.current.click()} onPickCustomBgColor={() => bgColorInputRef.current.click()} />)}
            {activeSidePanel === 'layers' && (<LayerPanel />)}
            {activeSidePanel === 'measurements' && (
              <div className="absolute top-4 left-4 z-40 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg shadow-xl w-60 animate-in fade-in slide-in-from-left-4 max-h-[60vh] flex flex-col">
                <div className="border-b border-slate-700 p-2 bg-slate-800">
                  <div className="flex items-center justify-between mb-1"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Layers size={14} /> Measure Units</h3><div className="flex gap-1"><button onClick={() => setUnitTypes(prev => [...prev, { id: `u${Date.now()}`, name: `Unit ${prev.length + 1}`, color: COLORS[prev.length % COLORS.length], base: null, visible: true, activeAngle: 0, opacity: 1.0 }])} className="bg-blue-600 hover:bg-blue-500 text-white rounded p-1 transition" title="Add Unit"><Plus size={14} /></button><button onClick={() => setActiveSidePanel(null)}><X size={14} className="text-slate-500 hover:text-white mt-1" /></button></div></div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1"><Sliders size={10} /><input type="range" min="0.1" max="1" step="0.05" value={measurementsOpacity} onChange={(e) => setMeasurementsOpacity(parseFloat(e.target.value))} className="flex-1 h-1 accent-blue-500 bg-slate-600 rounded-lg appearance-none cursor-pointer" /></div>
                </div>
                <div className="flex flex-col gap-2 p-2 overflow-y-auto">
                  {unitTypes.map(unit => (
                    <div key={unit.id} onClick={() => { setMode('measure'); setActiveUnitId(unit.id); }} className={`group flex items-center gap-2 p-2 rounded border transition-all cursor-pointer ${activeUnitId === unit.id ? 'bg-slate-700 border-blue-500/50 shadow-md' : 'bg-slate-900/50 border-transparent hover:bg-slate-700/50'}`}>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: unit.color }} />
                      <div className="flex flex-col flex-1 min-w-0 gap-1">
                        <div className="flex justify-between items-center"><div className="text-xs font-medium text-slate-200 truncate">{unit.name}</div><div className="text-[10px] text-slate-500">{unit.base ? 'Ready' : 'Set Base'}</div></div>
                        <input type="range" min="0.1" max="1" step="0.05" value={unit.opacity} onChange={(e) => setUnitTypes(prev => prev.map(u => u.id === unit.id ? { ...u, opacity: parseFloat(e.target.value) } : u))} onClick={(e) => e.stopPropagation()} className="w-full h-1 accent-slate-400 bg-slate-600 rounded-lg appearance-none cursor-pointer hover:accent-white" />
                      </div>
                      <div className="flex items-center gap-1 self-start">
                        <button onClick={(e) => { e.stopPropagation(); setUnitTypes(prev => prev.map(u => u.id === unit.id ? { ...u, visible: !u.visible } : u)); }} className={`p-1 rounded hover:bg-slate-600 ${unit.visible ? 'text-slate-400' : 'text-slate-600'}`}>{unit.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                        {unitTypes.length > 1 && (<button onClick={(e) => { e.stopPropagation(); setUnitTypes(prev => prev.filter(u => u.id !== unit.id)); }} className="p-1 rounded hover:bg-red-900/50 text-slate-500 hover:text-red-400 transition"><Trash2 size={12} /></button>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Reference Studio Panel logic is inline in the showRefControls block above */}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ROOT COMPONENT: Wraps with Provider
// ============================================================================
export default function PortraitTrainer() {
  return (
    <PortraitProvider>
      <PortraitContent />
    </PortraitProvider>
  );
}
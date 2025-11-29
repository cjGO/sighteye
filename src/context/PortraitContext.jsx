import React, { createContext, useContext, useState, useRef } from 'react';
import { useLayers } from '../hooks/useLayers';
import { useHistory } from '../hooks/useHistory';
import { COLORS, DEMO_LESSON } from '../utils/constants';

const PortraitContext = createContext();

export const usePortrait = () => useContext(PortraitContext);

export const PortraitProvider = ({ children }) => {
  // --- 1. History & Data ---
  const { 
    drawingElements, setDrawingElements, 
    measurements, setMeasurements, 
    measurementHistory, setMeasurementHistory,
    restoreHistory, addMeasurement, clearAll 
  } = useHistory();

  // --- 2. Selection State ---
  const [selectedElementIds, setSelectedElementIds] = useState(new Set());
  const [selectionPath, setSelectionPath] = useState([]); 
  const [activeSelectionBounds, setActiveSelectionBounds] = useState(null); 

  // --- 3. Layers ---
  const {
    layers, setLayers,
    activeLayerId, setActiveLayerId,
    addNewLayer, deleteLayer, updateLayer
  } = useLayers(setDrawingElements, setSelectedElementIds, setActiveSelectionBounds);

  // --- 4. Tool State ---
  const [mode, setMode] = useState('measure'); 
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [isEraser, setIsEraser] = useState(false);
  const [usePressure, setUsePressure] = useState(true); 
  const [bgColor, setBgColor] = useState('#1a1a1a');

  // --- 5. Interaction State ---
  const [dragStartPos, setDragStartPos] = useState(null); 
  const [draggingItem, setDraggingItem] = useState(null);
  const [isAdjustingBrush, setIsAdjustingBrush] = useState(false);
  const [lineStartPoint, setLineStartPoint] = useState(null);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [viewTransform, setViewTransform] = useState({ scale: 1, x: 0, y: 0 }); 
  const [zoomSelectionStart, setZoomSelectionStart] = useState(null);
  const [gridLevel, setGridLevel] = useState(0);
  const [activeSidePanel, setActiveSidePanel] = useState('measurements'); 
  const [showRefControls, setShowRefControls] = useState(true); 
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentPoints, setCurrentPoints] = useState([]); 

  // --- 6. Reference Images ---
  const [imageSrc1, setImageSrc1] = useState(DEMO_LESSON.imageUrl);
  const [opacity1, setOpacity1] = useState(1);
  const [grayscale1, setGrayscale1] = useState(false);
  const [imageSrc2, setImageSrc2] = useState(DEMO_LESSON.imageUrl);
  const [opacity2, setOpacity2] = useState(1);
  const [grayscale2, setGrayscale2] = useState(false);

  // --- 7. Units ---
  const [unitTypes, setUnitTypes] = useState([
    { id: 'u1', name: 'Unit 1', color: COLORS[0], base: null, visible: true, activeAngle: 0, opacity: 1.0 }
  ]);
  const [activeUnitId, setActiveUnitId] = useState('u1');
  const [measurementsOpacity, setMeasurementsOpacity] = useState(1);
  const [isCreatingUnit, setIsCreatingUnit] = useState(false);
  const [tempUnitStart, setTempUnitStart] = useState(null);

  // --- Actions ---
  const resetZoom = () => setViewTransform({ scale: 1, x: 0, y: 0 });

  const handleResetAll = () => {
    setUnitTypes([{ id: 'u1', name: 'Unit 1', color: COLORS[0], base: null, visible: true, activeAngle: 0, opacity: 1.0 }]);
    setActiveUnitId('u1');
    clearAll();
    setLineStartPoint(null);
    setBgColor('#1a1a1a');
    setLayers([{ id: 'layer1', name: 'Layer 1', visible: true, opacity: 1.0 }]);
    setActiveLayerId('layer1');
    setSelectedElementIds(new Set());
    setActiveSelectionBounds(null);
    setViewTransform({ scale: 1, x: 0, y: 0 });
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setLineStartPoint(null);
    if (!newMode.startsWith('select')) setSelectionPath([]);
    if (newMode !== 'move' && !newMode.startsWith('select')) {
        setSelectedElementIds(new Set());
        setActiveSelectionBounds(null);
    }
    if (newMode === 'line') setIsEraser(false);
    if (newMode === 'draw' && mode !== 'draw') setIsEraser(false); 
  };

  const togglePanel = (panelName) => {
    setActiveSidePanel(current => current === panelName ? null : panelName);
  };

  // --- Export Value ---
  const value = {
    // Data & History
    drawingElements, setDrawingElements,
    measurements, setMeasurements,
    measurementHistory, setMeasurementHistory,
    restoreHistory, addMeasurement, clearAll,
    
    // Layers
    layers, setLayers, activeLayerId, setActiveLayerId,
    addNewLayer, deleteLayer, updateLayer,

    // Tools & Settings
    mode, setMode, switchMode,
    brushSize, setBrushSize,
    brushColor, setBrushColor,
    brushOpacity, setBrushOpacity,
    isEraser, setIsEraser,
    usePressure, setUsePressure,
    bgColor, setBgColor,

    // Selection & Drag
    selectedElementIds, setSelectedElementIds,
    selectionPath, setSelectionPath,
    activeSelectionBounds, setActiveSelectionBounds,
    dragStartPos, setDragStartPos,
    draggingItem, setDraggingItem,

    // Interaction / View
    isAdjustingBrush, setIsAdjustingBrush,
    lineStartPoint, setLineStartPoint,
    isShiftDown, setIsShiftDown,
    viewTransform, setViewTransform, resetZoom,
    zoomSelectionStart, setZoomSelectionStart,
    gridLevel, setGridLevel,
    mousePos, setMousePos,
    currentPoints, setCurrentPoints,

    // UI
    activeSidePanel, setActiveSidePanel, togglePanel,
    showRefControls, setShowRefControls,
    handleResetAll,

    // Refs Images
    imageSrc1, setImageSrc1, opacity1, setOpacity1, grayscale1, setGrayscale1,
    imageSrc2, setImageSrc2, opacity2, setOpacity2, grayscale2, setGrayscale2,

    // Units
    unitTypes, setUnitTypes,
    activeUnitId, setActiveUnitId,
    measurementsOpacity, setMeasurementsOpacity,
    isCreatingUnit, setIsCreatingUnit,
    tempUnitStart, setTempUnitStart
  };

  return (
    <PortraitContext.Provider value={value}>
      {children}
    </PortraitContext.Provider>
  );
};
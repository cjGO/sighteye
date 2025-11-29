import { useState } from 'react';

export const useLayers = (setDrawingElements, setSelectedElementIds, setActiveSelectionBounds) => {
  const [layers, setLayers] = useState([
    { id: 'layer1', name: 'Layer 1', visible: true, opacity: 1.0 }
  ]);
  const [activeLayerId, setActiveLayerId] = useState('layer1');

  const addNewLayer = () => {
    const newId = `layer${Date.now()}`;
    setLayers(prev => [...prev, { id: newId, name: `Layer ${prev.length + 1}`, visible: true, opacity: 1.0 }]);
    setActiveLayerId(newId);
  };

  const deleteLayer = (id) => {
    if (layers.length <= 1) return;
    
    // Clean up elements on this layer
    if (setDrawingElements) {
        setDrawingElements(prev => prev.filter(el => el.layerId !== id));
    }
    
    // Clean up selection if needed
    if (setSelectedElementIds) {
        setSelectedElementIds(prev => {
             const next = new Set(prev);
             return next; 
        });
        if (setActiveSelectionBounds) setActiveSelectionBounds(null);
    }
    
    setLayers(prev => {
        const newLayers = prev.filter(l => l.id !== id);
        if (activeLayerId === id) {
            setActiveLayerId(newLayers[newLayers.length - 1].id);
        }
        return newLayers;
    });
  };

  const updateLayer = (id, updates) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  return {
    layers,
    setLayers, // Exposed for reset
    activeLayerId,
    setActiveLayerId,
    addNewLayer,
    deleteLayer,
    updateLayer
  };
};
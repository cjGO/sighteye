import { useState } from 'react';

export const useHistory = () => {
  const [drawingElements, setDrawingElements] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [measurementHistory, setMeasurementHistory] = useState([]);

  const restoreHistory = () => {
    // Priority: Undo Drawing Elements first
    if (drawingElements.length > 0) {
      setDrawingElements(prev => prev.slice(0, -1));
      return;
    }
    // Then Undo Measurements
    if (measurementHistory.length > 0) {
      const lastId = measurementHistory[measurementHistory.length - 1];
      setMeasurementHistory(prev => prev.slice(0, -1));
      setMeasurements(prev => prev.filter(m => m.id !== lastId));
    }
  };

  const addMeasurement = (measurement) => {
      setMeasurementHistory(prev => [...prev, measurement.id]);
      setMeasurements(prev => [...prev, measurement]);
  };

  const clearAll = () => {
      setDrawingElements([]);
      setMeasurements([]);
      setMeasurementHistory([]);
  };

  return {
    drawingElements,
    setDrawingElements,
    measurements,
    setMeasurements,
    measurementHistory,
    restoreHistory,
    addMeasurement,
    clearAll
  };
};
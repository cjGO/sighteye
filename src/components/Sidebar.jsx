import React from 'react';
import { 
  Ruler, Layers, Pencil, Eraser, Minus, Move, 
  LassoSelect, BoxSelect, Hand, ZoomOut, Lightbulb, 
  Palette, Copy, Undo, Grid3X3, Trash2 
} from 'lucide-react';
import { usePortrait } from '../context/PortraitContext';

const SidebarButton = ({ active, onClick, icon, label, color = 'blue' }) => {
  let activeClass = 'bg-blue-600 text-white shadow-lg';
  let textClass = 'text-slate-400 hover:bg-slate-700 hover:text-white';
  if (color === 'purple') activeClass = 'bg-purple-600 text-white shadow-lg';
  if (color === 'emerald') activeClass = 'bg-emerald-600 text-white shadow-lg';
  if (color === 'red') {
      activeClass = 'bg-red-600 text-white shadow-lg';
      textClass = 'text-slate-400 hover:bg-red-900/50 hover:text-red-400';
  }
  return (
    <button onClick={onClick} className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 w-12 h-12 justify-center relative group ${active ? activeClass : textClass}`}>
      {icon}
      <span className="absolute left-14 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700 z-50 shadow-xl font-bold">{label}</span>
    </button>
  );
};

export const Sidebar = () => {
  const { 
    mode, switchMode, activeSidePanel, togglePanel, 
    isEraser, setIsEraser, selectedElementIds, viewTransform, 
    resetZoom, showRefControls, setShowRefControls, 
    restoreHistory, gridLevel, setGridLevel, handleResetAll 
  } = usePortrait();

  return (
    <div className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-2 z-50 overflow-y-auto overflow-x-hidden no-scrollbar">
      {/* Measure Group */}
      <div className="flex flex-col gap-2 w-full items-center pb-3 border-b border-slate-700">
          <SidebarButton active={mode === 'measure'} onClick={() => switchMode('measure')} icon={<Ruler size={22} />} label="Measure Tool" color="blue" />
          <SidebarButton active={activeSidePanel === 'measurements'} onClick={() => togglePanel('measurements')} icon={<Layers size={22} />} label="Measure Units" color="purple" />
      </div>
      {/* Draw Group */}
      <div className="flex flex-col gap-2 w-full items-center py-3 border-b border-slate-700">
          <SidebarButton active={mode === 'draw' && !isEraser} onClick={() => { switchMode('draw'); setIsEraser(false); }} icon={<Pencil size={22} />} label="Freehand" color="blue" />
          <SidebarButton active={mode === 'draw' && isEraser} onClick={() => { switchMode('draw'); setIsEraser(true); }} icon={<Eraser size={22} />} label="Eraser" color="blue" />
      </div>
      {/* Shapes / Move Group */}
      <div className="flex flex-col gap-2 w-full items-center py-3 border-b border-slate-700">
          <SidebarButton active={mode === 'line'} onClick={() => switchMode('line')} icon={<Minus size={22} />} label="Line Tool" color="blue" />
          <SidebarButton active={mode === 'move'} onClick={() => switchMode('move')} icon={<Move size={22} />} label={selectedElementIds.size > 0 ? "Move Selection" : "Move All"} color="blue" />
      </div>
      {/* Select / View Group */}
      <div className="flex flex-col gap-2 w-full items-center py-3 border-b border-slate-700">
          <SidebarButton active={mode.startsWith('select')} onClick={() => switchMode(mode === 'select-box' ? 'select-lasso' : 'select-box')} icon={mode === 'select-lasso' ? <LassoSelect size={22} /> : <BoxSelect size={22} />} label={mode === 'select-lasso' ? 'Lasso Select' : 'Box Select'} color="blue" />
          <SidebarButton active={mode === 'grab'} onClick={() => switchMode('grab')} icon={<Hand size={22} />} label="Grab / Pan" color="blue" />
          {viewTransform.scale > 1 && (
              <SidebarButton onClick={resetZoom} icon={<ZoomOut size={22} />} label="Reset Zoom" color="red" />
          )}
      </div>
      {/* Studio Panels Group */}
      <div className="flex flex-col gap-2 w-full items-center py-3 border-b border-slate-700">
          <SidebarButton active={showRefControls} onClick={() => setShowRefControls(!showRefControls)} icon={<Lightbulb size={22} />} label="Ref Controls" color="purple" />
          <SidebarButton active={activeSidePanel === 'palette'} onClick={() => togglePanel('palette')} icon={<Palette size={22} />} label="Color Studio" color="purple" />
          <SidebarButton active={activeSidePanel === 'layers'} onClick={() => togglePanel('layers')} icon={<Copy size={22} />} label="Layers" color="purple" />
      </div>
      {/* Footer / History Group */}
      <div className="mt-auto flex flex-col gap-2 w-full items-center pt-2">
          <SidebarButton onClick={restoreHistory} icon={<Undo size={20} />} label="Undo" color="slate" />
          <SidebarButton onClick={() => setGridLevel((prev) => (prev + 1) % 4)} icon={<Grid3X3 size={20} />} label={`Grid: ${gridLevel > 0 ? gridLevel : 'Off'}`} color={gridLevel > 0 ? 'emerald' : 'slate'} />
          <SidebarButton onClick={handleResetAll} icon={<Trash2 size={20} />} label="Clear Canvas" color="red" />
      </div>
    </div>
  );
};
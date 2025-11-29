import React from 'react';
import { Palette, X, Pipette } from 'lucide-react';
import { BRUSH_COLORS, BG_COLORS } from '../utils/constants';
import { usePortrait } from '../context/PortraitContext';

export const ColorPalette = ({ onPickCustomBrushColor, onPickCustomBgColor }) => {
  const { togglePanel, brushColor, setBrushColor, bgColor, setBgColor } = usePortrait();

  return (
    <div className="absolute top-4 left-4 z-40 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg shadow-xl w-60 animate-in fade-in slide-in-from-left-4 max-h-[60vh] flex flex-col">
        <div className="border-b border-slate-700 p-2 bg-slate-800 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Palette size={14}/> Color Studio</h3>
            <button onClick={() => togglePanel('palette')}><X size={14} className="text-slate-500 hover:text-white"/></button>
        </div>
        <div className="p-3 flex flex-col gap-4 overflow-y-auto">
            <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase flex justify-between"><span>Brush Color</span><span className="text-slate-400">{brushColor}</span></div>
                <div className="grid grid-cols-5 gap-2">
                    {BRUSH_COLORS.map(color => (
                        <button key={color} onClick={() => setBrushColor(color)} className={`w-8 h-8 rounded-full border border-slate-600 transition-transform hover:scale-110 ${brushColor === color ? 'ring-2 ring-white scale-110' : ''}`} style={{ backgroundColor: color }} />
                    ))}
                    <button onClick={onPickCustomBrushColor} className="w-8 h-8 rounded-full border border-slate-500 bg-slate-700 flex items-center justify-center hover:bg-slate-600 text-slate-300 hover:text-white transition-colors" title="Custom Color"><Pipette size={14} /></button>
                </div>
            </div>
            <div className="h-px bg-slate-700"></div>
            <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase flex justify-between"><span>Canvas Background</span><span className="text-slate-400">{bgColor}</span></div>
                <div className="grid grid-cols-5 gap-2">
                    {BG_COLORS.map(color => (
                        <button key={color} onClick={() => setBgColor(color)} className={`w-8 h-8 rounded border border-slate-600 transition-transform hover:scale-110 ${bgColor === color ? 'ring-2 ring-blue-500 scale-110' : ''}`} style={{ backgroundColor: color }} />
                    ))}
                    <button onClick={onPickCustomBgColor} className="w-8 h-8 rounded border border-slate-500 bg-slate-700 flex items-center justify-center hover:bg-slate-600 text-slate-300 hover:text-white transition-colors" title="Custom Background"><Pipette size={14} /></button>
                </div>
            </div>
        </div>
    </div>
  );
};
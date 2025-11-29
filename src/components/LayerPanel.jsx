import React from 'react';
import { Copy, Plus, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { usePortrait } from '../context/PortraitContext';

export const LayerPanel = () => {
  const { layers, activeLayerId, setActiveLayerId, addNewLayer, togglePanel, updateLayer, deleteLayer } = usePortrait();

  return (
    <div className="absolute top-4 left-4 z-40 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg shadow-xl w-60 animate-in fade-in slide-in-from-left-4 max-h-[60vh] flex flex-col">
        <div className="border-b border-slate-700 p-2 bg-slate-800">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Copy size={14}/> Layers</h3>
                <div className="flex gap-1">
                   <button onClick={addNewLayer} className="bg-blue-600 hover:bg-blue-500 text-white rounded p-1 transition" title="Add Layer"><Plus size={14}/></button>
                   <button onClick={() => togglePanel('layers')}><X size={14} className="text-slate-500 hover:text-white mt-1"/></button>
                </div>
            </div>
        </div>
        <div className="flex flex-col gap-1 p-2 overflow-y-auto">
            {[...layers].reverse().map(layer => (
                <div key={layer.id} onClick={() => setActiveLayerId(layer.id)} className={`group flex items-center gap-2 p-2 rounded border transition-all cursor-pointer ${activeLayerId === layer.id ? 'bg-slate-700 border-blue-500/50 shadow-md' : 'bg-slate-900/50 border-transparent hover:bg-slate-700/50'}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }} className={`p-1 rounded hover:bg-slate-600 ${layer.visible ? 'text-slate-300' : 'text-slate-600'}`}>{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                        <div className="flex flex-col">
                            <span className={`text-xs font-medium truncate ${activeLayerId === layer.id ? 'text-white' : 'text-slate-400'}`}>{layer.name}</span>
                            <input type="range" min="0" max="1" step="0.1" value={layer.opacity} onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })} onClick={(e) => e.stopPropagation()} className="w-20 h-1 accent-blue-500 bg-slate-600 rounded-lg appearance-none cursor-pointer hover:accent-white mt-1" />
                        </div>
                    </div>
                    {layers.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }} className="p-1 rounded hover:bg-red-900/50 text-slate-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                    )}
                </div>
            ))}
        </div>
    </div>
  );
};
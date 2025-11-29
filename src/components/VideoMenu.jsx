import React from 'react';
import { Play } from 'lucide-react';

export const VideoMenu = ({
  togglePlayback,
  setShowVideoMenu,
  videoFormat,
  setVideoFormat,
  handleExportVideo
}) => {
  return (
    <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2">
        <button onClick={() => { togglePlayback(); setShowVideoMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 font-bold border-b border-slate-700/50">
             <Play size={14} fill="currentColor"/> Replay Sketch
        </button>
        
        <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
             <span className="text-xs font-bold text-slate-500 uppercase">Format</span>
             <div className="flex gap-1 text-xs">
                 <button onClick={() => setVideoFormat('mp4')} className={`px-2 py-0.5 rounded ${videoFormat === 'mp4' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>MP4</button>
                 <button onClick={() => setVideoFormat('webm')} className={`px-2 py-0.5 rounded ${videoFormat === 'webm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>WebM</button>
             </div>
        </div>

        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase bg-slate-900/50 border-b border-slate-700">Export Video</div>
        <button onClick={() => handleExportVideo(30)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center justify-between">
            30 Seconds <span className="text-xs text-slate-500">~4x</span>
        </button>
        <button onClick={() => handleExportVideo(60)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center justify-between">
            60 Seconds <span className="text-xs text-slate-500">~2x</span>
        </button>
        <button onClick={() => handleExportVideo(120)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center justify-between">
            120 Seconds <span className="text-xs text-slate-500">~1x</span>
        </button>
    </div>
  );
};
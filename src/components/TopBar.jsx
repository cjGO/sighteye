import React from 'react';
import { PenTool, Video, Square, Download } from 'lucide-react';
import { VideoMenu } from './VideoMenu';
import { BRUSH_COLORS } from '../utils/constants';
import { usePortrait } from '../context/PortraitContext';

export const TopBar = ({
  showVideoMenu, setShowVideoMenu, isRecording, recordingProgress,
  videoFormat, setVideoFormat, togglePlayback, handleExportVideo, handleSave
}) => {
  const {
    mode, brushSize, setBrushSize, brushColor, setBrushColor,
    brushOpacity, setBrushOpacity, isEraser, usePressure, setUsePressure
  } = usePortrait();

  return (
    <div className="h-14 border-b border-slate-700 bg-slate-800 flex items-center px-4 z-50 shadow-lg flex-shrink-0 gap-4">
      {/* Logo */}
      <div className="flex items-center flex-shrink-0">
         <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text hidden md:block">PortraitTrainer</span>
         <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text md:hidden">PT</span>
      </div>

      {/* Brush Controls (Center) */}
      <div className="flex-1 flex items-center justify-center">
          {(mode === 'draw' || mode === 'line') && (
              <div className="flex items-center gap-4 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700/50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 group relative">
                      <div className="w-2 h-2 rounded-full bg-slate-400" style={{ transform: `scale(${Math.max(0.5, brushSize/8)})`}}></div>
                      <input type="range" min="1" max="50" step="1" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-20 h-1 accent-blue-500 bg-slate-600 rounded-lg appearance-none cursor-pointer" title={`Size: ${brushSize}px`} />
                  </div>
                  <div className="w-px h-4 bg-slate-700"></div>
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-slate-400" style={{ opacity: brushOpacity }}></div>
                      <input type="range" min="0.1" max="1" step="0.1" value={brushOpacity} onChange={(e) => setBrushOpacity(parseFloat(e.target.value))} className="w-20 h-1 accent-blue-500 bg-slate-600 rounded-lg appearance-none cursor-pointer" title={`Opacity: ${Math.round(brushOpacity*100)}%`} />
                  </div>
                  <div className="w-px h-4 bg-slate-700"></div>
                  <button onClick={() => setUsePressure(!usePressure)} className={`p-1 rounded ${usePressure ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Toggle Pressure Sensitivity (Pen)"><PenTool size={16} /></button>
                  {!isEraser && (
                      <>
                          <div className="w-px h-4 bg-slate-700"></div>
                          <div className="flex items-center gap-1">
                              {BRUSH_COLORS.map(color => (
                                  <button key={color} onClick={() => setBrushColor(color)} className={`w-5 h-5 rounded-full border border-slate-600 transition-transform hover:scale-110 ${brushColor === color ? 'ring-2 ring-white scale-110' : ''}`} style={{ backgroundColor: color }} />
                              ))}
                          </div>
                      </>
                  )}
              </div>
          )}
      </div>

      {/* Action Buttons (Right) */}
      <div className="flex items-center gap-4 flex-shrink-0">
         <div className="relative">
            <button onClick={() => setShowVideoMenu(!showVideoMenu)} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold transition-all text-sm ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
              {isRecording ? <Square size={16} fill="currentColor"/> : <Video size={16} />}
              <span className="hidden sm:inline">{isRecording ? `Rec ${recordingProgress}%` : 'Video'}</span>
            </button>
            {showVideoMenu && !isRecording && (
                <VideoMenu togglePlayback={togglePlayback} setShowVideoMenu={setShowVideoMenu} videoFormat={videoFormat} setVideoFormat={setVideoFormat} handleExportVideo={handleExportVideo} />
            )}
         </div>
        <button onClick={handleSave} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold transition-all text-sm bg-emerald-600 text-white hover:bg-emerald-500`}>
          <Download size={16} />
          <span className="hidden sm:inline">Save</span>
        </button>
      </div>
    </div>
  );
};
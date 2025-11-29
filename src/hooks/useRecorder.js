import { useState, useRef } from 'react';
import { drawVariableWidthPath, drawElement } from '../utils/canvasDraw';

export const useRecorder = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [videoFormat, setVideoFormat] = useState('mp4');
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const playbackRef = useRef(null);

  const togglePlayback = (canvasRef, tempCanvasRef, drawingElements, layers, viewTransform, redrawCanvas) => {
    setShowVideoMenu(false);
    
    // Stop Logic
    if (isPlaying || isRecording) {
        setIsPlaying(false);
        setIsRecording(false);
        setRecordingProgress(0);
        if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
        redrawCanvas(); 
        return;
    }

    if (drawingElements.length === 0) return;
    
    // Start Logic
    setIsPlaying(true);
    let elIndex = 0;
    let pointIndex = 0; 
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const halfWidth = width / 2;
    
    if (tempCanvasRef.current) {
        tempCanvasRef.current.width = width;
        tempCanvasRef.current.height = height;
    }
    const tempCtx = tempCanvasRef.current ? tempCanvasRef.current.getContext('2d') : null;
    const pointsPerFrame = 3; 

    const animate = () => {
        if (elIndex >= drawingElements.length) {
            setIsPlaying(false);
            redrawCanvas(); 
            return;
        }

        ctx.clearRect(0, 0, width, height);
        
        const drawScene = () => {
            layers.forEach(layer => {
                if (!layer.visible) return;
                if (tempCtx) tempCtx.clearRect(0, 0, width, height);

                // 1. Draw completed
                const layerCompletedEls = drawingElements.slice(0, elIndex).filter(el => el.layerId === layer.id || (!el.layerId && layer.id === 'layer1'));
                layerCompletedEls.forEach(el => { if (tempCtx) drawElement(tempCtx, el); });

                // 2. Draw animating
                const currEl = drawingElements[elIndex];
                if (currEl && (currEl.layerId === layer.id || (!currEl.layerId && layer.id === 'layer1'))) {
                    if (currEl.type === 'stroke') {
                        const visiblePoints = currEl.points.slice(0, pointIndex + 1);
                        if (visiblePoints.length > 0 && tempCtx) {
                            drawVariableWidthPath(tempCtx, visiblePoints, currEl.size, currEl.color, currEl.opacity, currEl.isEraser, true);
                        }
                    } else if (currEl.type === 'line' && tempCtx) {
                        const progress = pointIndex / 20;
                        const t = Math.min(1, progress);
                        const currentEnd = {
                            x: currEl.start.x + (currEl.end.x - currEl.start.x) * t,
                            y: currEl.start.y + (currEl.end.y - currEl.start.y) * t
                        };
                        tempCtx.save();
                        tempCtx.lineCap = 'round';
                        tempCtx.lineJoin = 'round';
                        tempCtx.lineWidth = currEl.size;
                        tempCtx.strokeStyle = currEl.color;
                        tempCtx.globalAlpha = currEl.opacity;
                        tempCtx.globalCompositeOperation = currEl.isEraser ? 'destination-out' : 'source-over';
                        tempCtx.beginPath();
                        tempCtx.moveTo(currEl.start.x, currEl.start.y);
                        tempCtx.lineTo(currentEnd.x, currentEnd.y);
                        tempCtx.stroke();
                        tempCtx.restore();
                    }
                }

                // Composite
                if (tempCtx) {
                    ctx.save();
                    ctx.globalAlpha = layer.opacity;
                    ctx.drawImage(tempCanvasRef.current, 0, 0);
                    ctx.restore();
                }
            });
        };

        // Draw Left Pane
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, halfWidth, height); ctx.clip(); 
        ctx.translate(-viewTransform.x * viewTransform.scale, -viewTransform.y * viewTransform.scale);
        ctx.scale(viewTransform.scale, viewTransform.scale);
        drawScene();
        ctx.restore();
        
        // Draw Right Pane
        ctx.save();
        ctx.beginPath(); ctx.rect(halfWidth, 0, halfWidth, height); ctx.clip(); 
        ctx.translate(halfWidth, 0);
        ctx.scale(viewTransform.scale, viewTransform.scale);
        ctx.translate(-(halfWidth + viewTransform.x), -viewTransform.y);
        drawScene();
        ctx.restore();

        // Advance
        const currEl = drawingElements[elIndex];
        if (currEl.type === 'stroke') {
            pointIndex += pointsPerFrame;
            if (pointIndex >= currEl.points.length) { elIndex++; pointIndex = 0; }
        } else {
            pointIndex += 1;
            if (pointIndex >= 20) { elIndex++; pointIndex = 0; }
        }
        
        playbackRef.current = requestAnimationFrame(animate);
    };
    playbackRef.current = requestAnimationFrame(animate);
  };

  const handleExportVideo = (duration, canvasRef, drawingElements, layers, viewTransform, bgColor, imageSrc2, opacity2, grayscale2) => {
    setShowVideoMenu(false);
    if (drawingElements.length === 0 || isRecording) return;

    setIsRecording(true);
    setRecordingProgress(0);

    let totalOps = 0;
    drawingElements.forEach(el => {
        if (el.type === 'stroke') totalOps += el.points.length;
        else totalOps += 20; 
    });

    const { height } = canvasRef.current;
    const paneWidth = canvasRef.current.width / 2; 
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = paneWidth;
    offscreenCanvas.height = height;
    const ctx = offscreenCanvas.getContext('2d');
    
    const tempC = document.createElement('canvas');
    tempC.width = canvasRef.current.width;
    tempC.height = height;
    const tempCtx = tempC.getContext('2d');

    const fps = 30; 
    const totalFrames = duration * fps;
    const opsPerFrame = Math.max(1, Math.ceil(totalOps / totalFrames));
    const pauseDuration = 5; 
    const pauseFrames = pauseDuration * fps;

    const mimeType = videoFormat === 'mp4' && MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    const stream = offscreenCanvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portrait-timelapse.${mimeType === 'video/mp4' ? 'mp4' : 'webm'}`;
        a.click();
        setIsRecording(false);
        setRecordingProgress(0);
    };

    recorder.start();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc2;

    const startRecordingLoop = () => {
        let elIndex = 0;
        let pointIndex = 0;
        let frameCount = 0;
        let currentPauseFrame = 0;
        
        const scale = viewTransform.scale;
        const targetW = paneWidth * scale;
        const targetH = height * scale;
        const imgRatio = img.width / img.height;
        let drawW, drawH, offsetX, offsetY;
        
        const targetX = -viewTransform.x * scale; 
        const targetY = -viewTransform.y * scale;
        const paneRatio = paneWidth / height;
        
        if (imgRatio > paneRatio) {
            drawW = targetW;
            drawH = targetW / imgRatio;
            offsetX = targetX;
            offsetY = targetY + (targetH - drawH) / 2;
        } else {
            drawH = targetH;
            drawW = targetH * imgRatio;
            offsetY = targetY;
            offsetX = targetX + (targetW - drawW) / 2;
        }

        const processFrame = () => {
            const isDrawingDone = elIndex >= drawingElements.length;
            
            if (isDrawingDone && currentPauseFrame >= pauseFrames) { 
                recorder.stop();
                return;
            }
            if (frameCount > totalFrames + pauseFrames + 60) {
                 recorder.stop();
                 return;
            }

            // Draw BG
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, paneWidth, height);
            
            // Draw Ref Image
            ctx.save();
            if (grayscale2) ctx.filter = 'grayscale(100%)';
            ctx.globalAlpha = opacity2;
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
            ctx.restore();

            // Draw Elements
            ctx.save();
            ctx.scale(scale, scale);
            ctx.translate(-(paneWidth + viewTransform.x), -viewTransform.y);
            
            layers.forEach(layer => {
                if (!layer.visible) return;
                tempCtx.clearRect(0, 0, tempC.width, tempC.height);
                
                // Completed
                const layerCompletedEls = drawingElements.slice(0, elIndex).filter(el => el.layerId === layer.id || (!el.layerId && layer.id === 'layer1'));
                layerCompletedEls.forEach(el => drawElement(tempCtx, el));
                
                // Current
                const currEl = drawingElements[elIndex];
                if (currEl && (currEl.layerId === layer.id || (!currEl.layerId && layer.id === 'layer1'))) {
                    if (currEl.type === 'stroke') {
                        const visiblePoints = currEl.points.slice(0, pointIndex + 1);
                        if (visiblePoints.length > 0) drawVariableWidthPath(tempCtx, visiblePoints, currEl.size, currEl.color, currEl.opacity, currEl.isEraser, true);
                    } else if (currEl.type === 'line') {
                        const progress = pointIndex / 20;
                        const t = Math.min(1, progress);
                        const currentEnd = { x: currEl.start.x + (currEl.end.x - currEl.start.x) * t, y: currEl.start.y + (currEl.end.y - currEl.start.y) * t };
                        tempCtx.save();
                        tempCtx.lineCap = 'round';
                        tempCtx.lineJoin = 'round';
                        tempCtx.lineWidth = currEl.size;
                        tempCtx.strokeStyle = currEl.color;
                        tempCtx.globalAlpha = currEl.opacity;
                        tempCtx.globalCompositeOperation = currEl.isEraser ? 'destination-out' : 'source-over';
                        tempCtx.beginPath();
                        tempCtx.moveTo(currEl.start.x, currEl.start.y);
                        tempCtx.lineTo(currentEnd.x, currentEnd.y);
                        tempCtx.stroke();
                        tempCtx.restore();
                    }
                }
                
                ctx.save();
                ctx.globalAlpha = layer.opacity;
                ctx.drawImage(tempC, 0, 0);
                ctx.restore();
            });

            ctx.restore();

            // Advance
            if (!isDrawingDone) {
                let opsRemaining = opsPerFrame;
                while (opsRemaining > 0 && elIndex < drawingElements.length) {
                    const el = drawingElements[elIndex];
                    if (el.type === 'stroke') {
                        const available = el.points.length - pointIndex;
                        if (available > opsRemaining) { pointIndex += opsRemaining; opsRemaining = 0; }
                        else { opsRemaining -= available; elIndex++; pointIndex = 0; }
                    } else {
                        const available = 20 - pointIndex;
                        if (available > opsRemaining) { pointIndex += opsRemaining; opsRemaining = 0; }
                        else { opsRemaining -= available; elIndex++; pointIndex = 0; }
                    }
                }
            } else {
                currentPauseFrame++;
            }

            frameCount++;
            // Calculate Progress
            let totalProcessed = 0;
            for(let i=0; i<elIndex; i++) {
                 if(drawingElements[i].type === 'stroke') totalProcessed += drawingElements[i].points.length;
                 else totalProcessed += 20;
            }
            totalProcessed += pointIndex;
            let percent = isDrawingDone ? 100 : Math.min(99, Math.round((totalProcessed / totalOps) * 100));
            setRecordingProgress(percent);
            
            setTimeout(processFrame, 1000/fps);
        };
        
        processFrame();
    };

    if (img.complete) { startRecordingLoop(); } 
    else { img.onload = startRecordingLoop; }
  };

  return {
    isPlaying,
    isRecording,
    recordingProgress,
    videoFormat,
    setVideoFormat,
    showVideoMenu,
    setShowVideoMenu,
    playbackRef,
    togglePlayback,
    handleExportVideo
  };
};
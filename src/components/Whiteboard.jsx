import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Eraser,
  Trash2,
  Download,
  RotateCcw,
  Sparkles,
  Palette,
  Maximize2,
} from 'lucide-react';

const COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Orange', value: '#FB923C' },
];

const STROKE_SIZES = [
  { label: 'Fine', value: 2 },
  { label: 'Normal', value: 4 },
  { label: 'Thick', value: 8 },
  { label: 'Marker', value: 16 },
];

export default function Whiteboard({ socket, squadId, userName = 'Student' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const [color, setColor] = useState('#FFFFFF');
  const [strokeSize, setStrokeSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const prevPosRef = useRef({ x: 0, y: 0 });

  // Draw a normalized segment onto the canvas context
  const drawSegment = useCallback((ctx, stroke, canvasWidth, canvasHeight) => {
    const fromX = stroke.prevX * canvasWidth;
    const fromY = stroke.prevY * canvasHeight;
    const toX = stroke.currX * canvasWidth;
    const toY = stroke.currY * canvasHeight;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.size;

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.restore();
  }, []);

  // Resize canvas to match container while preserving drawn content
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Save existing image before resizing
    const prevImage = canvas.toDataURL();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Restore previous content
    const img = new Image();
    img.src = prevImage;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Listen to remote socket whiteboard events
  useEffect(() => {
    if (!socket) return;

    const handleRemoteDraw = (stroke) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      drawSegment(ctx, stroke, rect.width, rect.height);
    };

    const handleRemoteInit = (strokes) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (Array.isArray(strokes)) {
        strokes.forEach((stroke) => {
          drawSegment(ctx, stroke, rect.width, rect.height);
        });
      }
    };

    const handleRemoteClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    };

    socket.on('whiteboard_draw', handleRemoteDraw);
    socket.on('whiteboard_init', handleRemoteInit);
    socket.on('whiteboard_clear', handleRemoteClear);

    return () => {
      socket.off('whiteboard_draw', handleRemoteDraw);
      socket.off('whiteboard_init', handleRemoteInit);
      socket.off('whiteboard_clear', handleRemoteClear);
    };
  }, [socket, drawSegment]);

  // Start drawing
  const startDrawing = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    prevPosRef.current = { x, y };
    setIsDrawing(true);
  };

  // Continue drawing
  const draw = (clientX, clientY) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const currX = (clientX - rect.left) / rect.width;
    const currY = (clientY - rect.top) / rect.height;

    const stroke = {
      prevX: prevPosRef.current.x,
      prevY: prevPosRef.current.y,
      currX,
      currY,
      color,
      size: strokeSize,
      isEraser: tool === 'eraser',
    };

    // Draw locally
    const ctx = canvas.getContext('2d');
    drawSegment(ctx, stroke, rect.width, rect.height);

    // Emit to other students
    socket?.emit('whiteboard_draw', { squadId, stroke });

    prevPosRef.current = { x: currX, y: currY };
  };

  // Stop drawing
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Mouse Handlers
  const handleMouseDown = (e) => startDrawing(e.clientX, e.clientY);
  const handleMouseMove = (e) => draw(e.clientX, e.clientY);
  const handleMouseUp = () => stopDrawing();
  const handleMouseLeave = () => stopDrawing();

  // Touch Handlers for tablets / mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startDrawing(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    draw(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    stopDrawing();
  };

  // Clear Canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    socket?.emit('whiteboard_clear', { squadId });
  };

  // Download Canvas as PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas with dark background for export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');

    // Fill dark background
    exportCtx.fillStyle = '#171717';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    // Draw user strokes
    exportCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `StudySquad_Whiteboard_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col h-[520px] rounded-2xl border border-white/10 bg-neutral-950/80 overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Whiteboard Toolbar */}
      <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Tool Selectors */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              tool === 'pen'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Pen / Brush"
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>

          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              tool === 'eraser'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser</span>
          </button>
        </div>

        {/* Color Palette (Active when using Pen) */}
        {tool === 'pen' && (
          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/10">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                  color === c.value
                    ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-neutral-900 scale-110'
                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                }`}
                title={c.name}
              />
            ))}
          </div>
        )}

        {/* Stroke Size Selector */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          {STROKE_SIZES.map((sz) => (
            <button
              key={sz.value}
              type="button"
              onClick={() => setStrokeSize(sz.value)}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                strokeSize === sz.value
                  ? 'bg-white/20 text-white font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {sz.label}
            </button>
          ))}
        </div>

        {/* Actions (Clear & Download) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            title="Clear Canvas for all squad members"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            title="Export drawing as image"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Canvas Drawing Area with Graph Dot Grid */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-[#121212] overflow-hidden cursor-crosshair touch-none select-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-0 w-full h-full block"
        />

        {/* Live Sync Banner Badge */}
        <div className="absolute bottom-3 left-3 pointer-events-none flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[11px] text-neutral-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span>Live Collaborative Board • Everyone in squad sees your strokes</span>
        </div>
      </div>
    </div>
  );
}

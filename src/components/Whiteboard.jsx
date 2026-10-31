import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Eraser,
  Trash2,
  Download,
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

export default function Whiteboard({ socket, squadId }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rectRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const strokesHistoryRef = useRef([]);
  const pendingOutStrokesRef = useRef([]);
  const flushRafRef = useRef(null);
  const isDrawingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const prevPosRef = useRef({ x: 0, y: 0 });

  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const [color, setColor] = useState('#FFFFFF');
  const [strokeSize, setStrokeSize] = useState(4);
  const [confirmClear, setConfirmClear] = useState(false);

  // Auto-reset 2-step clear confirmation after 3 seconds
  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  // Draw a normalized segment onto the canvas context
  const drawSegment = useCallback((ctx, stroke, canvasWidth, canvasHeight) => {
    if (!stroke || canvasWidth <= 0 || canvasHeight <= 0) return;
    const fromX = stroke.prevX * canvasWidth;
    const fromY = stroke.prevY * canvasHeight;
    const toX = stroke.currX * canvasWidth;
    const toY = stroke.currY * canvasHeight;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.size || 4;

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color || '#FFFFFF';
    }

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    // If single-tap dot (from === to), nudge slightly so round lineCap renders a crisp dot
    if (Math.abs(toX - fromX) < 0.01 && Math.abs(toY - fromY) < 0.01) {
      ctx.lineTo(fromX + 0.1, fromY + 0.1);
    } else {
      ctx.lineTo(toX, toY);
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  const redrawAllStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    rectRef.current = rect;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const list = strokesHistoryRef.current;
    for (let i = 0; i < list.length; i++) {
      drawSegment(ctx, list[i], rect.width, rect.height);
    }
  }, [drawSegment]);

  // Observe container visibility/size changes (especially when unhidden from display:none!)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    redrawAllStrokes();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        redrawAllStrokes();
      });
      ro.observe(container);
    }
    window.addEventListener('resize', redrawAllStrokes);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', redrawAllStrokes);
      if (flushRafRef.current) cancelAnimationFrame(flushRafRef.current);
    };
  }, [redrawAllStrokes]);

  // Batch outgoing strokes per animation frame to eliminate network/CPU lag
  const queueOutgoingStroke = useCallback(
    (stroke) => {
      pendingOutStrokesRef.current.push(stroke);
      if (flushRafRef.current) return;

      flushRafRef.current = requestAnimationFrame(() => {
        flushRafRef.current = null;
        const batch = pendingOutStrokesRef.current;
        pendingOutStrokesRef.current = [];
        if (!socket || batch.length === 0) return;
        if (batch.length === 1) {
          socket.emit('whiteboard_draw', { squadId, stroke: batch[0] });
        } else {
          socket.emit('whiteboard_draw', { squadId, strokes: batch });
        }
      });
    },
    [socket, squadId]
  );

  // Listen to remote socket whiteboard events & request initial board state on mount
  useEffect(() => {
    if (!socket || !squadId) return;

    strokesHistoryRef.current = [];

    const handleRemoteDraw = (payload) => {
      const incoming = Array.isArray(payload) ? payload : payload ? [payload] : [];
      if (incoming.length === 0) return;

      strokesHistoryRef.current.push(...incoming);
      if (strokesHistoryRef.current.length > 3000) {
        strokesHistoryRef.current = strokesHistoryRef.current.slice(-3000);
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = rectRef.current;
      if (width <= 0 || height <= 0) return;
      const ctx = canvas.getContext('2d');
      for (let i = 0; i < incoming.length; i++) {
        drawSegment(ctx, incoming[i], width, height);
      }
    };

    const handleRemoteInit = (strokes) => {
      strokesHistoryRef.current = Array.isArray(strokes) ? [...strokes] : [];
      redrawAllStrokes();
    };

    const handleRemoteClear = () => {
      strokesHistoryRef.current = [];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = rectRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width || canvas.width, height || canvas.height);
    };

    socket.on('whiteboard_draw', handleRemoteDraw);
    socket.on('whiteboard_init', handleRemoteInit);
    socket.on('whiteboard_clear', handleRemoteClear);

    // Fetch existing strokes even if Whiteboard tab was opened after join_room
    socket.emit('whiteboard_request_init', { squadId });

    return () => {
      socket.off('whiteboard_draw', handleRemoteDraw);
      socket.off('whiteboard_init', handleRemoteInit);
      socket.off('whiteboard_clear', handleRemoteClear);
    };
  }, [socket, squadId, drawSegment, redrawAllStrokes]);

  const emitLocalStroke = (stroke) => {
    strokesHistoryRef.current.push(stroke);
    if (strokesHistoryRef.current.length > 3000) {
      strokesHistoryRef.current = strokesHistoryRef.current.slice(-3000);
    }

    const canvas = canvasRef.current;
    const { width, height } = rectRef.current;
    if (canvas && width > 0 && height > 0) {
      const ctx = canvas.getContext('2d');
      drawSegment(ctx, stroke, width, height);
    }

    queueOutgoingStroke(stroke);
  };

  // Start drawing
  const startDrawing = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    rectRef.current = rect;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    prevPosRef.current = { x, y };
    hasMovedRef.current = false;
    isDrawingRef.current = true;
  };

  // Continue drawing
  const draw = (clientX, clientY) => {
    if (!isDrawingRef.current) return;
    const rect = rectRef.current;
    if (rect.width === 0 || rect.height === 0) return;

    const currX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const currY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    hasMovedRef.current = true;

    const stroke = {
      prevX: prevPosRef.current.x,
      prevY: prevPosRef.current.y,
      currX,
      currY,
      color,
      size: strokeSize,
      isEraser: tool === 'eraser',
    };

    emitLocalStroke(stroke);
    prevPosRef.current = { x: currX, y: currY };
  };

  // Stop drawing (render a crisp dot if user tapped without dragging)
  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    if (!hasMovedRef.current) {
      const { x, y } = prevPosRef.current;
      emitLocalStroke({
        prevX: x,
        prevY: y,
        currX: x,
        currY: y,
        color,
        size: strokeSize,
        isEraser: tool === 'eraser',
      });
    }
    isDrawingRef.current = false;
    hasMovedRef.current = false;
  };

  // Mouse Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    startDrawing(e.clientX, e.clientY);
  };
  const handleMouseMove = (e) => draw(e.clientX, e.clientY);
  const handleMouseUp = () => stopDrawing();
  const handleMouseLeave = () => stopDrawing();

  // Touch Handlers for tablets / mobile (ignore multi-touch pinch/zoom)
  const handleTouchStart = (e) => {
    if (e.touches.length > 1) {
      isDrawingRef.current = false;
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    startDrawing(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length > 1) {
      isDrawingRef.current = false;
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    draw(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    stopDrawing();
  };

  // 2-step Clear Canvas guard so nobody wipes squad diagrams accidentally
  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    strokesHistoryRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const { width, height } = rectRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width || canvas.width, height || canvas.height);
    }
    socket?.emit('whiteboard_clear', { squadId });
  };

  // Download Canvas as PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');

    exportCtx.fillStyle = '#171717';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
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
            className={`px-3 py-1.5 rounded-xl border transition-all font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              confirmClear
                ? 'bg-rose-500 text-white border-rose-400 shadow-md animate-pulse'
                : 'bg-white/5 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-300 border-white/10 hover:border-rose-500/30'
            }`}
            title="Clear Canvas for all squad members"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmClear ? 'Tap to Confirm Clear' : 'Clear'}</span>
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

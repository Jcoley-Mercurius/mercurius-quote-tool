"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export function SignaturePad({ onChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasStrokesRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Set up canvas resolution on mount and resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Preserve current drawing before resize
      const existing = canvas.toDataURL();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      // Restore existing drawing
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = existing;
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const getPoint = (
    canvas: HTMLCanvasElement,
    e: MouseEvent | globalThis.Touch
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e instanceof MouseEvent ? e.clientX : e.clientX) - rect.left,
      y: (e instanceof MouseEvent ? e.clientY : e.clientY) - rect.top,
    };
  };

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      isDrawingRef.current = true;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const point =
        "touches" in e
          ? getPoint(canvas, e.touches[0] as unknown as globalThis.Touch)
          : getPoint(canvas, e.nativeEvent);

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);

      e.preventDefault();
    },
    [disabled]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current || disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const point =
        "touches" in e
          ? getPoint(canvas, e.touches[0] as unknown as globalThis.Touch)
          : getPoint(canvas, e.nativeEvent);

      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e293b"; // slate-800
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      hasStrokesRef.current = true;
      e.preventDefault();
    },
    [disabled]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (hasStrokesRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        setIsEmpty(false);
        onChange(canvas.toDataURL("image/png"));
      }
    }
  }, [onChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokesRef.current = false;
    setIsEmpty(true);
    onChange(null);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div
        className={[
          "relative overflow-hidden rounded-xl border-2 bg-white transition-colors",
          disabled
            ? "border-slate-100 bg-slate-50"
            : isEmpty
            ? "border-slate-200 hover:border-emerald-300"
            : "border-emerald-400",
        ].join(" ")}
        style={{ height: 140 }}
      >
        {isEmpty && !disabled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-slate-300 select-none">
              Sign here with your mouse or finger
            </p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          style={{ touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={clear}
          disabled={isEmpty}
          className="text-xs font-medium text-slate-400 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear signature
        </button>
      )}
    </div>
  );
}

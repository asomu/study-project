"use client";

import { useEffect, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

type StudyCanvasProps = {
  storageKey: string;
  onChange: (dataUrl: string) => void;
};

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 360;

function paintCanvasBackground(context: CanvasRenderingContext2D) {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function StudyCanvas({ storageKey, onChange }: StudyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
    paintCanvasBackground(context);

    const saved = window.localStorage.getItem(storageKey);

    if (!saved) {
      onChange("");
      return;
    }

    const image = new Image();
    image.onload = () => {
      paintCanvasBackground(context);
      context.drawImage(image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      onChange(saved);
      setHasDrawing(true);
    };
    image.src = saved;
  }, [onChange, storageKey]);

  function readPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  function persistCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    window.localStorage.setItem(storageKey, dataUrl);
    onChange(dataUrl);
    setHasDrawing(true);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = readPoint(event);

    if (!canvas || !context || !point) {
      return;
    }

    drawingRef.current = true;
    lastPointRef.current = point;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = readPoint(event);

    if (!drawingRef.current || !context || !point) {
      return;
    }

    const lastPoint = lastPointRef.current ?? point;
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }

    drawingRef.current = false;
    lastPointRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    persistCanvas();
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    paintCanvasBackground(context);
    window.localStorage.removeItem(storageKey);
    onChange("");
    setHasDrawing(false);
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        className="h-[320px] w-full rounded-2xl border border-slate-300 bg-white shadow-inner"
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {hasDrawing ? "현재 풀이가 브라우저에 임시 저장되었습니다." : "Apple Pencil 또는 손가락으로 풀이를 남길 수 있습니다."}
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
        >
          캔버스 지우기
        </button>
      </div>
    </div>
  );
}

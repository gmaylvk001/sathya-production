"use client";

import { useCallback, useRef, useState } from "react";

const MIN_PCT = 1;
const HANDLES = ["nw", "ne", "sw", "se", "n", "s", "e", "w"];

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function normalizeRect(x1, y1, x2, y2) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);
  return {
    x: left,
    y: top,
    width: Math.max(MIN_PCT, right - left),
    height: Math.max(MIN_PCT, bottom - top),
  };
}

function fitInBounds(rect) {
  let { x, y, width, height } = rect;
  width = clamp(width, MIN_PCT, 100);
  height = clamp(height, MIN_PCT, 100);
  x = clamp(x, 0, 100 - width);
  y = clamp(y, 0, 100 - height);
  return { x, y, width, height };
}

/**
 * Interactive %-based hotspot editor over a banner image.
 * Supports draw, move, resize, and select.
 */
export default function HotspotEditor({
  imageSrc,
  hotspots = [],
  selectedId,
  onSelect,
  onChangeHotspot,
  onCreateHotspot,
  drawingEnabled = false,
}) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const [draft, setDraft] = useState(null);

  const clientToPct = useCallback((clientX, clientY) => {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
    };
  }, []);

  const startDraw = (e) => {
    if (!drawingEnabled || !imageSrc) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    const { x, y } = clientToPct(e.clientX, e.clientY);
    dragRef.current = { mode: "draw", startX: x, startY: y };
    setDraft({ x, y, width: MIN_PCT, height: MIN_PCT });
    onSelect?.(null);
  };

  const startMove = (e, hotspot) => {
    if (drawingEnabled) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(hotspot.id);
    const { x, y } = clientToPct(e.clientX, e.clientY);
    dragRef.current = {
      mode: "move",
      id: hotspot.id,
      offsetX: x - hotspot.x,
      offsetY: y - hotspot.y,
    };
  };

  const startResize = (e, hotspot, handle) => {
    if (drawingEnabled) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(hotspot.id);
    dragRef.current = {
      mode: "resize",
      id: hotspot.id,
      handle,
      origin: { ...hotspot },
    };
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = clientToPct(e.clientX, e.clientY);

    if (drag.mode === "draw") {
      setDraft(normalizeRect(drag.startX, drag.startY, x, y));
      return;
    }

    if (drag.mode === "move") {
      const hs = hotspots.find((h) => h.id === drag.id);
      if (!hs) return;
      onChangeHotspot?.(
        drag.id,
        fitInBounds({
          x: x - drag.offsetX,
          y: y - drag.offsetY,
          width: hs.width,
          height: hs.height,
        })
      );
      return;
    }

    if (drag.mode === "resize") {
      const o = drag.origin;
      let left = o.x;
      let top = o.y;
      let right = o.x + o.width;
      let bottom = o.y + o.height;
      const h = drag.handle;

      if (h.includes("w")) left = x;
      if (h.includes("e")) right = x;
      if (h.includes("n")) top = y;
      if (h.includes("s")) bottom = y;

      onChangeHotspot?.(
        drag.id,
        fitInBounds(normalizeRect(left, top, right, bottom))
      );
    }
  };

  const endDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "draw" && draft) {
      const rect = fitInBounds(draft);
      if (rect.width >= MIN_PCT && rect.height >= MIN_PCT) {
        onCreateHotspot?.(rect);
      }
      setDraft(null);
    }
    dragRef.current = null;
  };

  if (!imageSrc) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center text-sm text-gray-500">
        Upload a banner image to draw hotspots.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {drawingEnabled ? (
        <p className="text-xs text-[#ED1C24] font-medium">
          Draw mode ON — click and drag on the image to create a hotspot.
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          Click a hotspot to select. Drag to move. Use corner/edge handles to
          resize.
        </p>
      )}

      <div
        ref={wrapRef}
        className={`relative w-full select-none overflow-hidden rounded-lg border border-gray-300 bg-gray-100 ${
          drawingEnabled ? "cursor-crosshair" : "cursor-default"
        }`}
        onPointerDown={drawingEnabled ? startDraw : undefined}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Banner preview"
          className="block w-full h-auto pointer-events-none"
          draggable={false}
        />

        {hotspots.map((hs) => {
          const selected = hs.id === selectedId;
          return (
            <div
              key={hs.id}
              role="button"
              tabIndex={0}
              className={`absolute box-border ${
                selected
                  ? "border-2 border-[#ED1C24] bg-[#ED1C24]/25 z-20"
                  : hs.isActive === false
                    ? "border border-dashed border-gray-400 bg-gray-400/20 z-10"
                    : "border border-[#d72828] bg-[#d72828]/20 z-10"
              } ${drawingEnabled ? "pointer-events-none" : "cursor-move"}`}
              style={{
                left: `${hs.x}%`,
                top: `${hs.y}%`,
                width: `${hs.width}%`,
                height: `${hs.height}%`,
              }}
              onPointerDown={(e) => startMove(e, hs)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(hs.id);
              }}
            >
              <span className="absolute left-0 top-0 max-w-full truncate bg-[#ED1C24] px-1 text-[10px] leading-4 text-white">
                {hs.label || "Hotspot"}
              </span>

              {selected &&
                !drawingEnabled &&
                HANDLES.map((handle) => {
                  const pos = {
                    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
                    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
                    sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
                    se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
                    n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
                    s: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
                    e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
                    w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
                  }[handle];
                  return (
                    <span
                      key={handle}
                      className={`absolute h-2.5 w-2.5 rounded-sm bg-white border-2 border-[#ED1C24] z-30 ${pos}`}
                      onPointerDown={(e) => startResize(e, hs, handle)}
                    />
                  );
                })}
            </div>
          );
        })}

        {draft ? (
          <div
            className="absolute box-border border-2 border-dashed border-[#ED1C24] bg-[#ED1C24]/30 pointer-events-none z-30"
            style={{
              left: `${draft.x}%`,
              top: `${draft.y}%`,
              width: `${draft.width}%`,
              height: `${draft.height}%`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

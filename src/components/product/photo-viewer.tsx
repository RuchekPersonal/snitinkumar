"use client";

/* eslint-disable @next/next/no-img-element -- images are served pre-sized by /api/img */
import { useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";

const MAX_ZOOM = 4;
const TAP_ZOOM = 2.5;

/** Full-screen photo viewer: swipe between photos, pinch or double-tap to zoom, back button closes. */
export function PhotoViewer({
  ids,
  alt,
  start,
  onClose,
}: {
  ids: string[];
  alt: string;
  start: number;
  onClose: (index: number) => void;
}) {
  const [active, setActive] = useState(start);
  const track = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const activeRef = useRef(start);
  activeRef.current = active;

  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * el.clientWidth;
  }, [start]);

  useEffect(() => {
    // An extra history entry so the phone's back button/gesture closes the viewer instead of leaving the page.
    history.pushState({ photoViewer: true }, "");
    const onPop = () => onClose(activeRef.current);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") history.back();
      if (e.key === "ArrowRight") go(activeRef.current + 1);
      if (e.key === "ArrowLeft") go(activeRef.current - 1);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      root.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once per opening
  }, []);

  function go(i: number) {
    const el = track.current;
    if (!el || i < 0 || i >= ids.length) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} photos`}
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <span className="text-[14px] font-medium tabular-nums" aria-live="polite">
          {ids.length > 1 ? `${active + 1} / ${ids.length}` : ""}
        </span>
        <button
          ref={closeBtn}
          type="button"
          onClick={() => history.back()}
          aria-label="Close photos"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={track}
          className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== activeRef.current) setActive(i);
          }}
        >
          {ids.map((id, i) => (
            <ZoomSlide
              key={id}
              src={`/api/img/${id}/full.webp`}
              alt={i === 0 ? alt : `${alt} — photo ${i + 1}`}
              active={i === active}
              eager={Math.abs(i - start) <= 1}
            />
          ))}
        </div>
        {ids.length > 1 && (
          <>
            <Arrow dir="prev" disabled={active === 0} onClick={() => go(active - 1)} />
            <Arrow dir="next" disabled={active === ids.length - 1} onClick={() => go(active + 1)} />
          </>
        )}
      </div>

      {ids.length > 1 && (
        <div className="no-scrollbar flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {ids.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`w-12 shrink-0 overflow-hidden rounded border-2 ${
                i === active ? "border-white" : "border-transparent opacity-60"
              }`}
            >
              <img src={`/api/img/${id}/thumb.webp`} alt="" width={400} height={533} className="aspect-[3/4] w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

function Arrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-0 md:grid ${
        dir === "prev" ? "left-4" : "right-4"
      }`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

type View = { s: number; x: number; y: number };
const ONE: View = { s: 1, x: 0, y: 0 };

function ZoomSlide({ src, alt, active, eager }: { src: string; alt: string; active: boolean; eager: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [view, setView] = useState<View>(ONE);
  const [touching, setTouching] = useState(false);
  const gesture = useRef<{
    start: View;
    dist?: number;
    mid?: { x: number; y: number };
    pan?: { x: number; y: number };
  } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const moved = useRef(false);
  const lastTouch = useRef(0);

  // Leaving a photo resets its zoom.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) setView(ONE);
  }

  /** Keeps the zoomed photo covering the screen — no panning past its edges. */
  function clamp(v: View): View {
    const b = box.current?.getBoundingClientRect();
    const el = img.current;
    if (!b || !el) return v;
    const ratio = el.naturalWidth && el.naturalHeight ? el.naturalWidth / el.naturalHeight : 3 / 4;
    const w = Math.min(b.width, b.height * ratio);
    const h = w / ratio;
    const s = Math.min(MAX_ZOOM, Math.max(1, v.s));
    const mx = Math.max(0, (w * s - b.width) / 2);
    const my = Math.max(0, (h * s - b.height) / 2);
    return { s, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
  }

  /** Point relative to the slide's centre. */
  function local(x: number, y: number) {
    const b = box.current!.getBoundingClientRect();
    return { x: x - b.left - b.width / 2, y: y - b.top - b.height / 2 };
  }

  /** Zoom to scale s keeping point p (relative to centre) under the finger. */
  function zoomAt(from: View, s: number, p: { x: number; y: number }): View {
    const k = s / from.s;
    return { s, x: p.x - (p.x - from.x) * k, y: p.y - (p.y - from.y) * k };
  }

  function toggleZoom(clientX: number, clientY: number) {
    setView((v) => (v.s > 1 ? ONE : clamp(zoomAt(v, TAP_ZOOM, local(clientX, clientY)))));
  }

  function onTouchStart(e: TouchEvent) {
    setTouching(true);
    moved.current = false;
    const t = e.touches;
    if (t.length === 2) {
      const a = local(t[0].clientX, t[0].clientY);
      const b = local(t[1].clientX, t[1].clientY);
      gesture.current = { start: view, dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    } else if (t.length === 1 && view.s > 1) {
      gesture.current = { start: view, pan: { x: t[0].clientX, y: t[0].clientY } };
    } else {
      gesture.current = null;
    }
  }

  function onTouchMove(e: TouchEvent) {
    const g = gesture.current;
    if (!g) return;
    moved.current = true;
    const t = e.touches;
    if (g.dist && g.mid && t.length === 2) {
      const a = local(t[0].clientX, t[0].clientY);
      const b = local(t[1].clientX, t[1].clientY);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = Math.min(MAX_ZOOM, Math.max(1, (g.start.s * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist));
      const z = zoomAt(g.start, s, g.mid);
      setView(clamp({ s, x: z.x + mid.x - g.mid.x, y: z.y + mid.y - g.mid.y }));
    } else if (g.pan && t.length === 1) {
      setView(clamp({ ...g.start, x: g.start.x + t[0].clientX - g.pan.x, y: g.start.y + t[0].clientY - g.pan.y }));
    }
  }

  function onTouchEnd(e: TouchEvent) {
    if (e.touches.length > 0) {
      onTouchStart(e); // one finger lifted mid-pinch: carry on panning with the other
      return;
    }
    setTouching(false);
    gesture.current = null;
    lastTouch.current = Date.now();
    const t = e.changedTouches[0];
    if (moved.current || !t) return;
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && now - prev.t < 300 && Math.hypot(t.clientX - prev.x, t.clientY - prev.y) < 30) {
      lastTap.current = null;
      toggleZoom(t.clientX, t.clientY);
    } else {
      lastTap.current = { t: now, x: t.clientX, y: t.clientY };
    }
  }

  const zoomed = view.s > 1;
  return (
    <div
      ref={box}
      className="relative h-full w-full shrink-0 snap-center overflow-hidden"
      // At normal size the browser handles side swipes between photos; once zoomed we handle all panning.
      style={{ touchAction: zoomed ? "none" : "pan-x" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      // Mouse double-click on desktop; phones also fire dblclick after a double-tap, which is handled above.
      onDoubleClick={(e) => Date.now() - lastTouch.current > 800 && toggleZoom(e.clientX, e.clientY)}
    >
      <img
        ref={img}
        src={src}
        alt={alt}
        width={1200}
        height={1600}
        loading={eager ? "eager" : "lazy"}
        draggable={false}
        className={`h-full w-full object-contain select-none ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
          transition: touching ? "none" : "transform 200ms ease-out",
        }}
      />
    </div>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element -- images are served pre-sized by /api/img */
import { useRef, useState } from "react";
import { NewBadge } from "./rate";
import { PhotoViewer } from "./photo-viewer";

export function Gallery({ ids, alt, isNew }: { ids: string[]; alt: string; isNew: boolean }) {
  const [active, setActive] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);

  if (ids.length === 0) {
    return <div className="grid aspect-[3/4] place-items-center rounded-md bg-sand text-muted">Photo coming soon</div>;
  }

  const go = (i: number, behavior: ScrollBehavior = "smooth") => {
    setActive(i);
    const el = track.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior });
  };

  return (
    <div>
      <div className="relative">
        <div
          ref={track}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-md"
          onScroll={(e) => {
            const el = e.currentTarget;
            setActive(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {ids.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewing(i)}
              aria-label={`View photo ${i + 1} full screen`}
              className="w-full shrink-0 cursor-zoom-in snap-start"
            >
              <img
                src={`/api/img/${id}/full.webp`}
                srcSet={`/api/img/${id}/card.webp 800w, /api/img/${id}/full.webp 1200w`}
                sizes="(min-width: 1024px) 45vw, 100vw"
                alt={i === 0 ? alt : `${alt} — photo ${i + 1}`}
                width={1200}
                height={1600}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                className="aspect-[3/4] w-full bg-sand object-cover"
              />
            </button>
          ))}
        </div>
        {isNew && (
          <span className="absolute top-3 left-3">
            <NewBadge />
          </span>
        )}
        {ids.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden">
            {ids.map((id, i) => (
              <span key={id} className={`h-1.5 rounded-full ${i === active ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />
            ))}
          </div>
        )}
        <span className="pointer-events-none absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </span>
      </div>
      {viewing !== null && (
        <PhotoViewer
          ids={ids}
          alt={alt}
          start={viewing}
          onClose={(i) => {
            setViewing(null);
            go(i, "instant");
          }}
        />
      )}
      {ids.length > 1 && (
        <div className="mt-3 hidden gap-3 lg:flex">
          {ids.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`w-20 overflow-hidden rounded border-2 ${i === active ? "border-maroon" : "border-transparent"}`}
            >
              <img
                src={`/api/img/${id}/thumb.webp`}
                alt=""
                width={400}
                height={533}
                className="aspect-[3/4] w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element -- images are served pre-sized by /api/img */
import { useRef, useState } from "react";
import { NewBadge } from "./rate";

export function Gallery({ ids, alt, isNew }: { ids: string[]; alt: string; isNew: boolean }) {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  if (ids.length === 0) {
    return <div className="grid aspect-[3/4] place-items-center rounded-md bg-sand text-muted">Photo coming soon</div>;
  }

  const go = (i: number) => {
    setActive(i);
    track.current?.children[i]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
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
            <img
              key={id}
              src={`/api/img/${id}/full.webp`}
              srcSet={`/api/img/${id}/card.webp 800w, /api/img/${id}/full.webp 1200w`}
              sizes="(min-width: 1024px) 45vw, 100vw"
              alt={i === 0 ? alt : `${alt} — photo ${i + 1}`}
              width={1200}
              height={1600}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              className="aspect-[3/4] w-full shrink-0 snap-start bg-sand object-cover"
            />
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
      </div>
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

"use client";

/* eslint-disable @next/next/no-img-element -- slides are pre-sized by /api/site-img or static files */
import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon } from "@/components/icons";

export interface HeroSlide {
  src: string;
  srcSet?: string;
}

const INTERVAL_MS = 6000;

/**
 * Full-bleed photo panel that slides through the hero photos, with the hero copy (children)
 * fixed on top. Auto-advances unless hovered, focused, off-screen or the visitor prefers
 * reduced motion; swipe on phones, arrows and dots everywhere.
 */
export function HeroCarousel({ slides, children }: { slides: HeroSlide[]; children: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;
  const go = (n: number) => setIndex(((n % count) + count) % count);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collection"
      className="relative flex min-h-[545px] items-end overflow-hidden rounded-md bg-[#d7b898] lg:min-h-[565px] lg:items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div
        className="absolute inset-0 flex transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div
            key={s.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            className="h-full w-full shrink-0"
          >
            <img
              src={s.src}
              srcSet={s.srcSet}
              sizes="(min-width: 1280px) 1232px, 100vw"
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              className="h-full w-full object-cover object-[59%_center] lg:object-[center_43%]"
            />
          </div>
        ))}
      </div>

      {/* Keeps the copy readable over any photo: from the bottom on phones, from the left on desktop. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(40,25,25,.85),rgba(46,30,29,.4)_60%,rgba(46,30,29,.02))] lg:bg-[linear-gradient(90deg,rgba(37,24,22,.72)_0%,rgba(54,35,30,.55)_37%,rgba(59,37,29,.03)_72%)]" />

      <div className="relative w-full">{children}</div>

      {count > 1 && (
        <div className="absolute top-4 right-4 flex items-center gap-3 lg:top-auto lg:right-6 lg:bottom-6">
          <div className="flex gap-1.5" role="group" aria-label="Choose slide">
            {slides.map((s, i) => (
              <button
                key={s.src}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
          <div className="hidden gap-2 lg:flex">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/40 text-white backdrop-blur-sm hover:bg-white/15"
            >
              <ChevronRightIcon width={18} height={18} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/40 text-white backdrop-blur-sm hover:bg-white/15"
            >
              <ChevronRightIcon width={18} height={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

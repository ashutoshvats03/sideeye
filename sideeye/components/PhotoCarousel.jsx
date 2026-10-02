"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Home photo carousel.
 *
 * Swipe is native: the track is a horizontally scrollable box with CSS scroll-snap, so a
 * finger drag works on a 360px screen without any pointer/touch JS. JavaScript only drives
 * autoplay and the dot indicators, and it scrolls the SAME native track, so manual swiping
 * and autoplay can never disagree about which slide is showing.
 *
 * No-CLS contract: the track reserves its height with an explicit aspect box before the
 * images load, so slides arriving never shift the page.
 */

const AUTOPLAY_MS = 4500;

export default function PhotoCarousel({ slides = [] }) {
  const trackRef = useRef(null);
  const timerRef = useRef(null);
  const [index, setIndex] = useState(0);
  // Autoplay can be unwelcome: paused on hover, on keyboard focus, and whenever the OS
  // asks for reduced motion. Content stays fully reachable in every one of those states.
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const count = slides.length;

  // Honour the OS reduced-motion setting for autoplay only.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const goTo = useCallback(
    (next) => {
      const track = trackRef.current;
      if (!track || count === 0) return;
      const wrapped = ((next % count) + count) % count;
      const child = track.children[wrapped];
      if (!child) return;
      track.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
      setIndex(wrapped);
    },
    [count],
  );

  // Autoplay. Paused state and reduced motion both stop it; cleanup always clears.
  useEffect(() => {
    if (count <= 1 || paused || reducedMotion) return undefined;

    timerRef.current = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timerRef.current);
  }, [count, paused, reducedMotion, index]);

  // Keep the track aligned with the index autoplay advanced.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[index];
    if (child && Math.abs(track.scrollLeft - child.offsetLeft) > 2) {
      track.scrollTo({ left: child.offsetLeft, behavior: reducedMotion ? "auto" : "smooth" });
    }
  }, [index, reducedMotion]);

  // A manual swipe is authoritative: report whichever slide actually snapped into view.
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth || 1;
    const nearest = Math.round(track.scrollLeft / width);
    setIndex((current) => (nearest === current ? current : nearest));
  }, []);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="SideEye in the wild"
      className="px-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative">
        <ul
          ref={trackRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide, i) => (
            <li
              key={slide.href ?? i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              className="w-full shrink-0 snap-center"
            >
              <Link
                href={slide.href}
                className="block overflow-hidden rounded-3xl border border-border-brand focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface sm:aspect-[21/9]">
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    width={1200}
                    height={900}
                    preload={i === 0}
                    sizes="100vw"
                    className="h-full w-full object-cover"
                  />
                </div>
                {slide.caption ? (
                  <p className="bg-white px-4 py-3 text-center text-sm font-semibold text-neutral-700">
                    {slide.caption}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>

        {count > 1 ? (
          <>
            <CarouselArrow side="left" onClick={() => goTo(index - 1)} />
            <CarouselArrow side="right" onClick={() => goTo(index + 1)} />

            <div className="mt-4 flex justify-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={`dot-${slide.href ?? i}`}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className={`h-2.5 rounded-full transition-all focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    i === index ? "w-7 bg-brand" : "w-2.5 bg-neutral-300 hover:bg-neutral-400"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function CarouselArrow({ side, onClick }) {
  const isLeft = side === "left";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isLeft ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-lg ring-1 ring-neutral-200 transition hover:bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand sm:flex ${
        isLeft ? "left-3" : "right-3"
      }`}
    >
      <span aria-hidden="true" className="text-xl leading-none">
        {isLeft ? "‹" : "›"}
      </span>
    </button>
  );
}
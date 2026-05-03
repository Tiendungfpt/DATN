import { useEffect, useMemo, useRef, useState } from "react";
import "./ImageCarousel.css";

const FALLBACK =
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1600&q=80";

function resolveImg(src) {
  const raw = String(src || "").trim();
  if (!raw) return "";
  if (raw === "undefined" || raw === "null") return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return raw;
  return `/uploads/${raw}`;
}

export default function ImageCarousel({
  images,
  alt = "",
  autoPlay = false,
  autoOnHover = true,
  intervalMs = 900,
  showArrows = true,
  showDots = true,
  className = "",
}) {
  const list = useMemo(() => {
    const arr = Array.isArray(images) ? images : [];
    const merged = arr.map(resolveImg).filter(Boolean);
    const uniq = Array.from(new Set(merged));
    return uniq.length > 0 ? uniq : [FALLBACK];
  }, [images]);

  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const failedRef = useRef(new Set());
  const [forceFallback, setForceFallback] = useState(false);

  useEffect(() => {
    setIdx(0);
    failedRef.current = new Set();
    setForceFallback(false);
  }, [list.length]);

  const stop = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = () => {
    if (list.length <= 1) return;
    if (timerRef.current) return;
    timerRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % list.length);
    }, intervalMs);
  };

  useEffect(() => {
    if (!autoPlay) return undefined;
    start();
    return () => stop();
  }, [autoPlay, list.length, intervalMs]);

  useEffect(() => () => stop(), []);

  const next = () => setIdx((i) => (i + 1) % list.length);
  const prev = () => setIdx((i) => (i - 1 + list.length) % list.length);

  const onImgError = () => {
    // mark failed and skip; if all failed -> fallback
    failedRef.current.add(idx);
    if (failedRef.current.size >= list.length) {
      stop();
      setForceFallback(true);
      return;
    }
    // find next non-failed
    for (let step = 1; step <= list.length; step++) {
      const ni = (idx + step) % list.length;
      if (!failedRef.current.has(ni)) {
        setIdx(ni);
        return;
      }
    }
  };

  return (
    <div
      className={`hh-carousel ${className}`.trim()}
      onMouseEnter={() => {
        if (autoOnHover && !autoPlay) start();
        if (autoPlay) stop();
      }}
      onMouseLeave={() => {
        if (autoOnHover && !autoPlay) stop();
        if (autoPlay) start();
      }}
      aria-label="Image carousel"
    >
      <img
        className="hh-carousel-img"
        src={forceFallback ? FALLBACK : list[idx] || FALLBACK}
        alt={alt}
        loading="lazy"
        onError={(e) => {
          // avoid infinite loop when FALLBACK fails
          if (e.currentTarget.src === FALLBACK) return;
          onImgError();
        }}
      />

      {showArrows && list.length > 1 ? (
        <>
          <button type="button" className="hh-carousel-nav left" onClick={prev} aria-label="Ảnh trước">
            ‹
          </button>
          <button type="button" className="hh-carousel-nav right" onClick={next} aria-label="Ảnh sau">
            ›
          </button>
        </>
      ) : null}

      {showDots && list.length > 1 ? (
        <div className="hh-carousel-dots" aria-label="Ảnh">
          {list.slice(0, 6).map((_, i) => (
            <button
              type="button"
              key={i}
              className={`hh-carousel-dot${i === idx ? " is-active" : ""}`}
              onClick={() => setIdx(i)}
              aria-label={`Ảnh ${i + 1}`}
            />
          ))}
          {list.length > 6 ? <span className="hh-carousel-more">+{list.length - 6}</span> : null}
        </div>
      ) : null}
    </div>
  );
}


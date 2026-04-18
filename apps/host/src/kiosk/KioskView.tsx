import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WidgetFrame } from '../runtime';
import type { WidgetInfo } from '../admin/useWidgets';

const ROTATION_INTERVAL_SECONDS = 30;

function useEnabledWidgets() {
  return useQuery<WidgetInfo[]>({
    queryKey: ['widgets'],
    queryFn: async () => {
      const res = await fetch('/api/widgets');
      if (!res.ok) throw new Error('Failed to load widgets');
      const raw: any[] = await res.json();
      return raw.map(w => ({ ...w, currentValues: w.currentValues ?? {} }));
    },
    refetchInterval: 60_000,
  });
}

export function KioskView() {
  const { data: allWidgets } = useEnabledWidgets();
  const widgets = allWidgets?.filter(w => w.enabled) ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0–100

  // Navigate to a specific index and reset the rotation timer
  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + widgets.length) % widgets.length);
    setProgress(0);
  }, [widgets.length]);

  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % widgets.length);
    setProgress(0);
  }, [widgets.length]);

  // Rotation timer — reset whenever currentIndex changes (covers manual nav too)
  useEffect(() => {
    if (widgets.length <= 1) return;
    const intervalMs = ROTATION_INTERVAL_SECONDS * 1000;
    const step = 100 / (intervalMs / 100);
    let p = 0;

    const tick = setInterval(() => {
      p += step;
      if (p >= 100) {
        p = 0;
        setCurrentIndex(i => (i + 1) % widgets.length);
      }
      setProgress(p);
    }, 100);

    return () => clearInterval(tick);
  }, [widgets.length, currentIndex]);

  // Reset index if widgets list shrinks and current index is out of bounds
  useEffect(() => {
    if (widgets.length > 0 && currentIndex >= widgets.length) {
      setCurrentIndex(0);
    }
  }, [widgets.length, currentIndex]);

  // Keyboard: Escape → admin, arrow keys → manual nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { window.location.hash = '/admin'; return; }
      if (e.key === 'ArrowLeft')  { goPrev(); return; }
      if (e.key === 'ArrowRight') { goNext(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext]);

  if (widgets.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-2xl mb-4">No widgets enabled.</p>
          <a href="#/admin" className="text-blue-400 hover:underline text-lg">Open Admin Panel →</a>
        </div>
      </div>
    );
  }

  const current = widgets[currentIndex % widgets.length];
  const multiWidget = widgets.length > 1;

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden group">
      {/* Widget iframe — fills full screen */}
      <WidgetFrame
        key={current.id}
        widgetId={current.id}
        source={current.source}
        manifest={current}
        settings={current.currentValues as Record<string, string | number | boolean>}
      />

      {/* Left arrow — visible on hover, hidden when only one widget */}
      {multiWidget && (
        <button
          onClick={goPrev}
          aria-label="Previous widget"
          className="
            absolute left-0 top-0 bottom-0 w-16
            flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            bg-gradient-to-r from-black/40 to-transparent
            hover:from-black/60
            cursor-pointer
          "
        >
          <ChevronLeft className="w-10 h-10 text-white/70 drop-shadow-lg" />
        </button>
      )}

      {/* Right arrow — visible on hover, hidden when only one widget */}
      {multiWidget && (
        <button
          onClick={goNext}
          aria-label="Next widget"
          className="
            absolute right-0 top-0 bottom-0 w-16
            flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            bg-gradient-to-l from-black/40 to-transparent
            hover:from-black/60
            cursor-pointer
          "
        >
          <ChevronRight className="w-10 h-10 text-white/70 drop-shadow-lg" />
        </button>
      )}

      {/* Bottom controls: dot indicators + progress bar */}
      {multiWidget && (
        <div className="absolute bottom-0 left-0 right-0">
          {/* Dot indicators */}
          <div
            className="
              flex items-center justify-center gap-2 pb-2
              opacity-0 group-hover:opacity-100
              transition-opacity duration-200
            "
          >
            {widgets.map((w, i) => (
              <button
                key={w.id}
                onClick={() => goTo(i)}
                aria-label={`Go to ${w.name}`}
                className={`
                  rounded-full transition-all duration-200
                  ${i === currentIndex
                    ? 'w-3 h-3 bg-white'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'}
                `}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-0.5 bg-zinc-900">
            <div
              className="h-full bg-zinc-500 transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Invisible admin hotspot — top-right corner */}
      <a
        href="#/admin"
        className="absolute top-0 right-0 w-10 h-10 opacity-0"
        aria-label="Open admin panel"
      />
    </div>
  );
}

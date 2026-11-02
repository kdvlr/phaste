import React, { useState, useCallback, UIEvent } from 'react';

export const SCROLL_FADE_DISTANCE = 24;

export function useScrollFade(distance = SCROLL_FADE_DISTANCE) {
  const [progress, setProgress] = useState(0);

  const onScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      const top = event.currentTarget.scrollTop;
      setProgress(Math.min(1, Math.max(0, top) / distance));
    },
    [distance]
  );

  const reset = useCallback(() => setProgress(0), []);

  return { progress, onScroll, reset };
}

export interface ScrollFadeProps {
  progress: number;
  className?: string;
  surfaceClassName?: string;
}

/**
 * BoardUI ScrollFade
 * Provides a 24px progressive masked backdrop blur and gradient wash easing in over the first 24px scrolled.
 */
export const ScrollFade: React.FC<ScrollFadeProps> = ({
  progress,
  className = '',
  surfaceClassName = 'from-[#fbfbfa] dark:from-[#1b1614]',
}) => {
  if (progress <= 0) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-6 select-none transition-opacity duration-75 ${className}`}
      style={{ opacity: progress }}
    >
      <div className="absolute inset-0 backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="absolute inset-x-0 top-0 h-4 backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className={`absolute inset-0 bg-gradient-to-b to-transparent ${surfaceClassName}`} />
    </div>
  );
};

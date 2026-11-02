import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export type AgentThinkingVariant = 'wave' | 'spin' | 'stars';

export interface AgentThinkingProps {
  variant?: AgentThinkingVariant;
  label?: string;
  showTimer?: boolean;
  className?: string;
}

const DOTS_GRID = 3;
const DOTS_TRAIL = 0.35;
const DOTS_MIN_OPACITY = 0.15;
const DOTS_SEED = [0.55, 0.3, 0.15, 0.85, 0.55, 0.3, 1, 0.85, 0.55];

function dotScalar(variant: 'wave' | 'spin', col: number, row: number) {
  const m = DOTS_GRID - 1;
  if (variant === 'wave') {
    return ((col + row) / (2 * m)) * (DOTS_GRID / (DOTS_GRID + 1));
  }
  const center = m / 2;
  return (Math.atan2(row - center, col - center) / (2 * Math.PI) + 1) % 1;
}

function dotOpacities(variant: 'wave' | 'spin', phase: number) {
  return Array.from({ length: DOTS_GRID * DOTS_GRID }, (_, i) => {
    const s = dotScalar(variant, i % DOTS_GRID, Math.floor(i / DOTS_GRID));
    const behind = (phase - s + 1) % 1;
    const lit = Math.max(0, 1 - behind / DOTS_TRAIL) ** 1.5;
    return DOTS_MIN_OPACITY + (1 - DOTS_MIN_OPACITY) * lit;
  });
}

/**
 * BoardUI AgentThinking Component
 * Shimmering AI thinking indicator featuring dynamic dot-wave motion, live elapsed timer, and glowing label.
 */
export const AgentThinking: React.FC<AgentThinkingProps> = ({
  variant = 'wave',
  label = 'Analyzing with LiteLLM...',
  showTimer = true,
  className = '',
}) => {
  const [opacities, setOpacities] = useState<number[]>(DOTS_SEED);
  const [elapsed, setElapsed] = useState(0);

  // Animated wave / spin dots
  useEffect(() => {
    let phase = 0;
    const interval = window.setInterval(() => {
      phase = (phase + 1 / 8) % 1;
      setOpacities(dotOpacities(variant === 'stars' ? 'wave' : variant, phase));
    }, 90);
    return () => clearInterval(interval);
  }, [variant]);

  // Live timer counting elapsed seconds with 1 decimal place
  useEffect(() => {
    const start = Date.now();
    const interval = window.setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-[#8d6e63]/10 dark:bg-white/10 border border-[#8d6e63]/25 dark:border-white/15 text-xs text-[#6d4c41] dark:text-[#d7ccc8] backdrop-blur-xs shadow-xs animate-in fade-in duration-150 select-none ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* 3x3 Animated Matrix or Sparkles */}
      {variant === 'stars' ? (
        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
      ) : (
        <div
          className="grid grid-cols-3 gap-0.5 w-3.5 h-3.5 items-center justify-center shrink-0"
          aria-hidden="true"
        >
          {opacities.map((op, idx) => (
            <span
              key={idx}
              className="w-1 h-1 rounded-full bg-[#8d6e63] dark:bg-[#d7ccc8] transition-opacity duration-150"
              style={{ opacity: op }}
            />
          ))}
        </div>
      )}

      {/* Shimmering Label */}
      <span className="font-medium tracking-tight bg-gradient-to-r from-[#6d4c41] via-[#8d6e63] to-[#6d4c41] dark:from-[#d7ccc8] dark:via-white dark:to-[#d7ccc8] bg-clip-text text-transparent animate-pulse">
        {label}
      </span>

      {/* Live Timer Pill */}
      {showTimer && (
        <span className="font-mono text-[10px] text-[#a1887f] dark:text-[#a1887f] pl-0.5">
          {elapsed.toFixed(1)}s
        </span>
      )}
    </div>
  );
};

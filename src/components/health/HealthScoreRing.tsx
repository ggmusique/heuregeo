// src/components/health/HealthScoreRing.tsx
// Anneau SVG animé affichant le score global de santé
import React, { useEffect, useRef } from "react";
import { STATUS_TOKENS } from "../../theme/healthTheme";
import type { HealthScore } from "../../types/systemHealth";

const SIZE = 156;
const STROKE_WIDTH = 9;
const RADIUS = (SIZE - STROKE_WIDTH * 2) / 2; // 69
const CENTER = SIZE / 2; // 78
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 433.5

interface HealthScoreRingProps {
  score: HealthScore;
  loading?: boolean;
  /** Taille en pixels (écrase SIZE pour le rendu SVG) */
  size?: number;
}

export function HealthScoreRing({
  score,
  loading = false,
  size = SIZE,
}: HealthScoreRingProps) {
  const progressRef = useRef<SVGCircleElement>(null);
  const tokens = STATUS_TOKENS[score.status];

  // Animer la progression au montage et à chaque changement de valeur
  useEffect(() => {
    if (!progressRef.current || loading) return;
    const ratio = score.value / 100;
    const offset = CIRCUMFERENCE * (1 - ratio);
    progressRef.current.style.strokeDashoffset = String(offset);
  }, [score.value, loading]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg width={size} height={size} className="opacity-20">
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--color-ring-track)"
            strokeWidth={STROKE_WIDTH}
            className="animate-pulse"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score de santé : ${score.value}% — ${score.label}`}
    >
      {/* Ring SVG */}
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Piste de fond */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--color-ring-track)"
          strokeWidth={STROKE_WIDTH}
        />

        {/* Glow ring (légèrement plus épais, flou) */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={tokens.ringColor}
          strokeWidth={STROKE_WIDTH + 4}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - score.value / 100)}
          strokeLinecap="round"
          opacity="0.15"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
        />

        {/* Ring principal */}
        <circle
          ref={progressRef}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={tokens.ringColor}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE} // commence à 0%, animé par useEffect
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>

      {/* Contenu central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-4xl font-bold tabular-nums leading-none ${tokens.text}`}
          aria-hidden="true"
        >
          {score.value}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] mt-1 font-medium tracking-wide">
          sur 100
        </span>
      </div>
    </div>
  );
}

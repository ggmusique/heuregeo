// src/components/ui/Skeleton.tsx
// Composants skeleton tokenisés — utilisent .skeleton (styles.css) + CSS vars.
import React from "react";

interface SkeletonProps {
  className?: string;
  /** hauteur (défaut h-4) */
  h?: string;
  /** largeur (défaut w-full) */
  w?: string;
  /** border-radius (défaut rounded) */
  rounded?: string;
}

export function Skeleton({ className = "", h = "h-4", w = "w-full", rounded = "rounded" }: SkeletonProps) {
  return (
    <div
      className={"skeleton " + h + " " + w + " " + rounded + (className ? " " + className : "")}
      aria-hidden="true"
    />
  );
}

/** Bloc de plusieurs lignes skeleton */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={"space-y-2 " + className} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} w={i === lines - 1 ? "w-2/3" : "w-full"} />
      ))}
    </div>
  );
}

/** Carte skeleton (image + texte) */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-3 " +
        className
      }
      aria-hidden="true"
    >
      <Skeleton h="h-6" w="w-1/2" rounded="rounded-md" />
      <SkeletonText lines={2} />
    </div>
  );
}

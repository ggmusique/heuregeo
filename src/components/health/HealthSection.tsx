// src/components/health/HealthSection.tsx
// Section avec titre, description et contenu de la page Santé système
import React from "react";

interface HealthSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function HealthSection({
  title,
  description,
  children,
  action,
  className = "",
}: HealthSectionProps) {
  return (
    <section className={`space-y-3 ${className}`} aria-labelledby={`section-${title}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id={`section-${title}`}
            className="text-base font-semibold text-[var(--color-text)] tracking-tight"
          >
            {title}
          </h2>
          {description && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

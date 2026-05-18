// src/components/ui/PageHeader.tsx
// En-tête de page réutilisable — titre, subtitle, actions.
import React from "react";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon, actions, className = "" }: PageHeaderProps) {
  return (
    <div className={"flex items-start gap-3 " + className}>
      {icon && (
        <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center bg-[var(--color-accent-violet)]/15 text-[var(--color-accent-violet)] flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-black uppercase tracking-wider text-[var(--color-text)] leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}

// src/components/ui/Table.tsx
// Table générique tokenisée avec alternance de lignes et hover.
import React from "react";

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  emptyText?: string;
  className?: string;
}

const ALIGN_CLS = {
  left:   "text-left",
  center: "text-center",
  right:  "text-right",
} as const;

export function Table<T>({ columns, data, keyExtractor, emptyText = "Aucune donnée", className = "" }: TableProps<T>) {
  return (
    <div className={"w-full overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] " + className}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-table-header)] border-b border-[var(--color-border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={
                  "px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] " +
                  ALIGN_CLS[col.align ?? "left"] +
                  (col.className ? " " + col.className : "")
                }
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-[var(--color-text-dim)] text-xs"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={keyExtractor(row, i)}
                className={
                  "border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-table-row-hover)] " +
                  (i % 2 === 1 ? "bg-[var(--color-table-row-alt)]" : "")
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={
                      "px-4 py-2.5 text-[var(--color-text)] " +
                      ALIGN_CLS[col.align ?? "left"] +
                      (col.className ? " " + col.className : "")
                    }
                  >
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

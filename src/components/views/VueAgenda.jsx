import React, { lazy, Suspense } from "react";

const AgendaTab = lazy(() =>
  import("../../pages/AgendaTab").then((m) => ({ default: m.AgendaTab }))
);

export function VueAgenda({
  events,
  loading,
  currentYear,
  currentMonth,
  currentWeekStart,
  workedDays,
  onGoToPrev,
  onGoToNext,
  onGoToToday,
  onGoToPrevWeek,
  onGoToNextWeek,
  onOpenForDate,
  onEventEdit,
}) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-yellow-500 border-t-transparent" />
        </div>
      }
    >
      <AgendaTab
        events={events}
        loading={loading}
        currentYear={currentYear}
        currentMonth={currentMonth}
        currentWeekStart={currentWeekStart}
        workedDays={workedDays}
        onGoToPrev={onGoToPrev}
        onGoToNext={onGoToNext}
        onGoToToday={onGoToToday}
        onGoToPrevWeek={onGoToPrevWeek}
        onGoToNextWeek={onGoToNextWeek}
        onOpenForDate={onOpenForDate}
        onEventEdit={onEventEdit}
      />
    </Suspense>
  );
}

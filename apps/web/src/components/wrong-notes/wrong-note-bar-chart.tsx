import type { WrongNoteChartBar } from "@/modules/wrong-note/contracts";

type WrongNoteBarChartProps = {
  bars: WrongNoteChartBar[];
  maxValue: number;
  totalCount: number;
  loading?: boolean;
  emptyMessage?: string;
};

function formatValue(value: number) {
  return `${value}건`;
}

export function WrongNoteBarChart({
  bars,
  maxValue,
  totalCount,
  loading = false,
  emptyMessage = "해당 조건의 오답 데이터가 없습니다",
}: WrongNoteBarChartProps) {
  if (loading) {
    return (
      <div className="space-y-3" aria-live="polite">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`chart-skeleton-${index}`} className="space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (!bars.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  const safeMaxValue = Math.max(0, maxValue);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>총 {formatValue(totalCount)}</span>
        <span>막대 수 {bars.length}개</span>
      </div>

      <div className="space-y-3">
        {bars.map((bar) => {
          const widthPct = safeMaxValue > 0 ? (bar.value / safeMaxValue) * 100 : 0;

          return (
            <div key={bar.key} className="grid gap-2 md:grid-cols-[minmax(0,16rem)_1fr_auto] md:items-center">
              <p className="text-sm font-medium text-slate-700">{bar.label}</p>
              <div className="h-10 rounded-2xl bg-slate-100 px-2 py-2">
                <div
                  className="flex h-full items-center rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-3 text-xs font-semibold text-white transition-[width] duration-200"
                  style={{
                    width: `${widthPct}%`,
                    minWidth: bar.value > 0 ? "3rem" : "0px",
                    opacity: bar.value > 0 ? 1 : 0,
                  }}
                >
                  {bar.value > 0 ? formatValue(bar.value) : null}
                </div>
                {bar.value === 0 ? <div className="mt-[-1.75rem] pl-1 text-xs font-medium text-slate-500">0건</div> : null}
              </div>
              <p className="text-sm font-semibold text-slate-900">{formatValue(bar.value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function toWidth(pct: number) {
  const normalized = Math.min(100, Math.max(0, pct));
  return `${normalized}%`;
}

type ProgressComparisonProps = {
  recommendedPct: number;
  actualPct: number;
  coveredUnits: number;
  totalUnits: number;
};

export function ProgressComparison({ recommendedPct, actualPct, coveredUnits, totalUnits }: ProgressComparisonProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>권장 진도</span>
          <span>{recommendedPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{
              width: toWidth(recommendedPct),
            }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>실제 진도</span>
          <span>{actualPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-sky-600 transition-all"
            style={{
              width: toWidth(actualPct),
            }}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        진도 단원: {coveredUnits} / {totalUnits}
      </p>
    </div>
  );
}

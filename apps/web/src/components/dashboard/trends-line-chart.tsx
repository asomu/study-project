type TrendPoint = {
  weekStart: string;
  weekEnd: string;
  totalItems: number;
  correctItems: number;
  accuracyPct: number;
  masteryScorePct: number;
};

type TrendsLineChartProps = {
  points: TrendPoint[];
};

const chartWidth = 420;
const chartHeight = 180;
const padding = 24;

function yPosition(value: number) {
  const normalized = Math.min(100, Math.max(0, value));
  return chartHeight - padding - (normalized / 100) * (chartHeight - padding * 2);
}

function buildPolyline(points: TrendPoint[], valueSelector: (point: TrendPoint) => number) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const y = yPosition(valueSelector(points[0]));
    return `${padding},${y} ${chartWidth - padding},${y}`;
  }

  const step = (chartWidth - padding * 2) / (points.length - 1);

  return points
    .map((point, index) => {
      const x = padding + index * step;
      const y = yPosition(valueSelector(point));
      return `${x},${y}`;
    })
    .join(" ");
}

export function TrendsLineChart({ points }: TrendsLineChartProps) {
  if (!points.length) {
    return <p className="text-sm text-slate-600">추이 데이터가 없습니다.</p>;
  }

  const accuracyPolyline = buildPolyline(points, (point) => point.accuracyPct);
  const masteryPolyline = buildPolyline(points, (point) => point.masteryScorePct);

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-44 w-full rounded-lg border border-slate-200 bg-white">
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#cbd5e1" strokeWidth={1} />
        <line
          x1={padding}
          y1={chartHeight - padding}
          x2={chartWidth - padding}
          y2={chartHeight - padding}
          stroke="#cbd5e1"
          strokeWidth={1}
        />

        <polyline fill="none" stroke="#0284c7" strokeWidth={3} points={accuracyPolyline} />
        <polyline fill="none" stroke="#6366f1" strokeWidth={3} points={masteryPolyline} />
      </svg>

      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-600" />
          주간 정답률
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          주간 마스터리 점수
        </span>
      </div>

      <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        {points.map((point) => (
          <p key={`${point.weekStart}-${point.weekEnd}`}>
            {point.weekStart} ~ {point.weekEnd}: {point.accuracyPct.toFixed(1)}% / {point.masteryScorePct.toFixed(1)}%
          </p>
        ))}
      </div>
    </div>
  );
}

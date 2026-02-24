type CategoryDistribution = {
  key: string;
  labelKo: string;
  count: number;
  ratio: number;
};

type CategoryDistributionChartProps = {
  items: CategoryDistribution[];
};

function widthFromRatio(ratio: number) {
  return `${Math.min(100, Math.max(0, ratio))}%`;
}

export function CategoryDistributionChart({ items }: CategoryDistributionChartProps) {
  if (!items.length) {
    return <p className="text-sm text-slate-600">기간 내 카테고리 분포 데이터가 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key} className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{item.labelKo}</span>
            <span>
              {item.count}건 ({item.ratio.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: widthFromRatio(item.ratio) }} />
          </div>
        </div>
      ))}
    </div>
  );
}

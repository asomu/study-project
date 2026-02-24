type WeakUnit = {
  curriculumNodeId: string;
  unitName: string;
  attempts: number;
  accuracyPct: number;
  wrongCount: number;
};

type WeaknessTableProps = {
  weakUnits: WeakUnit[];
};

export function WeaknessTable({ weakUnits }: WeaknessTableProps) {
  if (!weakUnits.length) {
    return <p className="text-sm text-slate-600">집계 기준을 만족하는 약점 단원이 없습니다. (최소 시도 3회)</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-2 pr-3">단원</th>
            <th className="py-2 pr-3">시도수</th>
            <th className="py-2 pr-3">정답률</th>
            <th className="py-2">오답수</th>
          </tr>
        </thead>
        <tbody>
          {weakUnits.map((unit) => (
            <tr key={unit.curriculumNodeId} className="border-t border-slate-100 text-slate-700">
              <td className="py-2 pr-3">{unit.unitName}</td>
              <td className="py-2 pr-3">{unit.attempts}</td>
              <td className="py-2 pr-3">{unit.accuracyPct.toFixed(1)}%</td>
              <td className="py-2">{unit.wrongCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

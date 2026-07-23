import { Bike, Clock, Route as RouteIcon, TrendingUp } from 'lucide-react';
import type { RouteResult } from '../../types';
import { formatDistance, formatDuration } from '../../utils/format';

interface Props {
  route: RouteResult;
  onStart: () => void;
  onCancel: () => void;
}

const providerLabel: Record<RouteResult['provider'], string> = {
  brouter: '자전거 최적경로',
  osrm: '일반 경로',
  kakao: '카카오 경로',
};

/** 경로 탐색 결과 요약 카드 + "주행 시작" 버튼 */
export function RouteSummary({ route, onStart, onCancel }: Props) {
  const { summary } = route;

  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary">
            {providerLabel[route.provider]}
          </span>
        </div>
        <button onClick={onCancel} className="text-sm text-text-muted hover:text-text-secondary">
          닫기
        </button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat icon={<RouteIcon className="h-4 w-4" />} label="거리" value={formatDistance(summary.distance)} />
        <Stat icon={<Clock className="h-4 w-4" />} label="예상 시간" value={formatDuration(summary.duration)} />
        <Stat
          icon={<TrendingUp className="h-4 w-4" />}
          label="오르막"
          value={`${summary.elevationGain}m`}
        />
      </div>

      <button
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4
                   font-semibold text-white shadow-lg shadow-primary/30 transition-transform active:scale-[0.98]"
      >
        <Bike className="h-5 w-5" />
        주행 시작
      </button>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface/60 p-3 text-center">
      <div className="mb-1 flex items-center justify-center gap-1 text-text-muted">{icon}</div>
      <p className="text-lg font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bike, Calendar, Download, Gauge, Route as RouteIcon, Timer, Trash2 } from 'lucide-react';
import { deleteRide, getRides, toGPX, type RideRecord } from '../services/rideStorage';
import { formatDistance, formatDuration } from '../utils/format';

export function RideHistory() {
  const [rides, setRides] = useState<RideRecord[]>([]);

  useEffect(() => {
    setRides(getRides());
  }, []);

  // 누적 통계 계산
  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    let totalDistance = 0;
    let totalDuration = 0;
    let weekDistance = 0;
    let maxSpeed = 0;
    for (const r of rides) {
      totalDistance += r.distance;
      totalDuration += r.duration;
      if (r.maxSpeed > maxSpeed) maxSpeed = r.maxSpeed;
      if (new Date(r.startTime).getTime() >= weekAgo) weekDistance += r.distance;
    }
    return { count: rides.length, totalDistance, totalDuration, weekDistance, maxSpeed };
  }, [rides]);

  const handleExport = (ride: RideRecord) => {
    const blob = new Blob([toGPX(ride)], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `busan-ride-${ride.id}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    deleteRide(id);
    setRides(getRides());
  };

  return (
    <div className="min-h-full bg-background pb-10">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4 pt-safe">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5">
            <ArrowLeft className="h-5 w-5 text-text-primary" />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">주행 기록</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
        {/* 누적 통계 요약 */}
        {rides.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-text-secondary">누적 라이딩</span>
              <span className="text-sm font-semibold text-primary">{stats.count}회</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SummaryStat
                icon={<RouteIcon className="h-4 w-4" />}
                label="총 거리"
                value={formatDistance(stats.totalDistance)}
              />
              <SummaryStat
                icon={<Timer className="h-4 w-4" />}
                label="총 시간"
                value={formatDuration(stats.totalDuration)}
              />
              <SummaryStat
                icon={<Bike className="h-4 w-4" />}
                label="이번 주"
                value={formatDistance(stats.weekDistance)}
              />
              <SummaryStat
                icon={<Gauge className="h-4 w-4" />}
                label="최고 속도"
                value={`${stats.maxSpeed.toFixed(1)}km/h`}
              />
            </div>
          </div>
        )}

        {rides.length === 0 ? (
          <div className="py-24 text-center">
            <Bike className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <p className="text-text-secondary">아직 주행 기록이 없습니다.</p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-full bg-primary px-6 py-2 font-medium text-white"
            >
              첫 라이딩 시작하기
            </Link>
          </div>
        ) : (
          rides.map((ride) => (
            <div key={ride.id} className="glass rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Calendar className="h-4 w-4 text-text-muted" />
                  {new Date(ride.startTime).toLocaleString('ko-KR')}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExport(ride)}
                    className="rounded-full p-2 hover:bg-white/5"
                    title="GPX 내보내기"
                  >
                    <Download className="h-4 w-4 text-text-secondary" />
                  </button>
                  <button
                    onClick={() => handleDelete(ride.id)}
                    className="rounded-full p-2 hover:bg-white/5"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Metric label="거리" value={formatDistance(ride.distance)} />
                <Metric label="시간" value={formatDuration(ride.duration)} />
                <Metric label="평균 속도" value={`${ride.avgSpeed}km/h`} highlight />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs text-text-muted">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-primary' : 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-surface/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

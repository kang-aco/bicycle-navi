import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { KakaoMap } from '../Map/KakaoMap';
import { CurrentLocationMarker } from '../Map/CurrentLocationMarker';
import { RoutePolyline } from '../Map/RoutePolyline';
import { TurnIcon } from './turnIcon';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useWakeLock } from '../../hooks/useWakeLock';
import { voiceGuidance, guidanceForTurn } from '../../services/voiceGuidance';
import { searchBikeRoute } from '../../services/routeService';
import { saveRide } from '../../services/rideStorage';
import {
  cumulativeDistances,
  distanceMeters,
  nearestIndex,
} from '../../services/geo';
import { formatDistance, formatDuration } from '../../utils/format';
import { useNavigationStore } from '../../stores/navigationStore';
import type { TurnGuide } from '../../types';

interface Props {
  onExit: () => void;
}

const OFF_ROUTE_METERS = 40; // 이 이상 벗어나면 재탐색
const ARRIVE_METERS = 20; // 목적지 도착 판정 거리

export function NavigationScreen({ onExit }: Props) {
  const route = useNavigationStore((s) => s.route);
  const destination = useNavigationStore((s) => s.destination);
  const voiceEnabled = useNavigationStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useNavigationStore((s) => s.setVoiceEnabled);
  const setRoute = useNavigationStore((s) => s.setRoute);

  const { coords, speed, heading, accuracy, startTracking, stopTracking } = useGeolocation();
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  const [map, setMap] = useState<any>(null);
  const [remainingDistance, setRemainingDistance] = useState(route?.summary.distance ?? 0);
  const [remainingTime, setRemainingTime] = useState(route?.summary.duration ?? 0);
  const [nextGuide, setNextGuide] = useState<TurnGuide | null>(null);
  const [distanceToTurn, setDistanceToTurn] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [arrived, setArrived] = useState(false);

  // 재계산에 쓰는 값들은 ref로 보관 (매 렌더마다 다시 만들지 않도록)
  const cumRef = useRef<number[]>(route ? cumulativeDistances(route.path) : []);
  const trackRef = useRef<{ lat: number; lng: number; t: number }[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const maxSpeedRef = useRef(0);
  const lastRerouteRef = useRef(0);
  const rerouteBusyRef = useRef(false);

  // route가 바뀌면(재탐색 등) 누적거리 다시 계산
  useEffect(() => {
    if (route) cumRef.current = cumulativeDistances(route.path);
  }, [route]);

  // 시작: 위치추적 + 화면 꺼짐 방지 + 시작 안내
  useEffect(() => {
    startTracking();
    requestWakeLock();
    voiceGuidance.setEnabled(voiceEnabled);
    if (destination) {
      voiceGuidance.speak(`${destination.name}까지 안내를 시작합니다`, 'high');
    }
    return () => {
      stopTracking();
      releaseWakeLock();
      voiceGuidance.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    voiceGuidance.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  const handleArrive = useCallback(() => {
    if (arrived) return;
    setArrived(true);
    voiceGuidance.speak('목적지에 도착했습니다. 주행을 종료합니다.', 'high');

    // 주행 기록 저장
    const track = trackRef.current;
    if (track.length > 1 && route) {
      const durationSec = (Date.now() - startTimeRef.current) / 1000;
      let dist = 0;
      for (let i = 1; i < track.length; i++) dist += distanceMeters(track[i - 1], track[i]);
      const avg = durationSec > 0 ? (dist / durationSec) * 3.6 : 0;
      saveRide({
        id: `ride-${Date.now()}`,
        startTime: new Date(startTimeRef.current).toISOString(),
        endTime: new Date().toISOString(),
        distance: Math.round(dist),
        duration: Math.round(durationSec),
        avgSpeed: Number(avg.toFixed(1)),
        maxSpeed: Number(maxSpeedRef.current.toFixed(1)),
        elevationGain: route.summary.elevationGain,
        elevationLoss: route.summary.elevationLoss,
        track: track.map((p) => ({ lat: p.lat, lng: p.lng, t: p.t })),
      });
    }
    setTimeout(onExit, 1800);
  }, [arrived, onExit, route]);

  // 위치가 갱신될 때마다 네비게이션 로직 실행
  useEffect(() => {
    if (!coords || !route || arrived) return;
    const path = route.path;
    const cum = cumRef.current;

    // 지도를 현재 위치로 따라가게
    if (map && window.kakao) {
      map.setCenter(new window.kakao.maps.LatLng(coords.lat, coords.lng));
    }

    // 주행 기록 track에 현재 위치 추가
    trackRef.current.push({ lat: coords.lat, lng: coords.lng, t: Date.now() });

    // 속도 (m/s → km/h)
    const kmh = Math.max(0, (speed ?? 0) * 3.6);
    setSpeedKmh(kmh);
    if (kmh > maxSpeedRef.current) maxSpeedRef.current = kmh;

    // 경로상 가장 가까운 점
    const idx = nearestIndex(coords, path);
    const traveled = cum[idx] ?? 0;
    const total = cum[cum.length - 1] ?? route.summary.distance;
    const remain = Math.max(0, total - traveled);
    setRemainingDistance(remain);
    setRemainingTime((remain / route.summary.distance) * route.summary.duration || 0);

    // 목적지 도착 판정
    const toDest = distanceMeters(coords, path[path.length - 1]);
    if (toDest <= ARRIVE_METERS || remain <= ARRIVE_METERS) {
      handleArrive();
      return;
    }

    // 다음 회전 안내 찾기
    const upcoming = route.guides.find(
      (g) => g.type !== 'depart' && g.type !== 'arrive' && g.distanceFromStart > traveled + 5
    );
    if (upcoming) {
      const dToTurn = upcoming.distanceFromStart - traveled;
      setNextGuide(upcoming);
      setDistanceToTurn(dToTurn);
      const g = guidanceForTurn(upcoming.instruction, dToTurn);
      if (g) voiceGuidance.speak(g.text, g.priority);
    } else {
      setNextGuide(null);
    }

    // 경로 이탈 감지 → 재탐색
    const offRoute = distanceMeters(coords, path[idx]);
    if (
      offRoute > OFF_ROUTE_METERS &&
      destination &&
      !rerouteBusyRef.current &&
      Date.now() - lastRerouteRef.current > 8000
    ) {
      rerouteBusyRef.current = true;
      lastRerouteRef.current = Date.now();
      voiceGuidance.speak('경로를 벗어났습니다. 경로를 다시 탐색합니다.', 'high');
      searchBikeRoute(coords, destination)
        .then((newRoute) => setRoute(newRoute))
        .catch(() => {})
        .finally(() => {
          rerouteBusyRef.current = false;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  if (!route) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* 지도 (배경) */}
      <div className="absolute inset-0">
        <KakaoMap
          center={route.path[0]}
          level={4}
          onMapReady={setMap}
        />
        {map && <RoutePolyline map={map} path={route.path} fitBounds={false} />}
        {map && coords && (
          <CurrentLocationMarker map={map} position={coords} accuracy={accuracy ?? 0} heading={heading} />
        )}
      </div>

      {/* 상단: 다음 회전 안내 배너 */}
      <div className="relative z-10 p-3 pt-safe">
        <div className="glass flex items-center gap-4 rounded-3xl p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <TurnIcon type={nextGuide?.type ?? 'straight'} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-3xl font-bold text-text-primary">
              {nextGuide ? formatDistance(distanceToTurn) : formatDistance(remainingDistance)}
            </p>
            <p className="truncate text-text-secondary">
              {arrived
                ? '목적지 도착 🎉'
                : nextGuide
                  ? nextGuide.instruction
                  : '경로를 따라 직진하세요'}
            </p>
          </div>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-surface"
            aria-label="음성 켜기/끄기"
          >
            {voiceEnabled ? (
              <Volume2 className="h-5 w-5 text-primary" />
            ) : (
              <VolumeX className="h-5 w-5 text-text-muted" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1" />

      {/* 하단: 속도 + 남은 정보 + 종료 */}
      <div className="relative z-10 p-3 pb-safe">
        <div className="glass rounded-3xl p-5">
          <div className="mb-4 flex items-end justify-center gap-1">
            <span className="font-mono text-6xl font-bold text-primary">{Math.round(speedKmh)}</span>
            <span className="mb-2 text-text-secondary">km/h</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="mb-1 text-xs text-text-muted">남은 거리</p>
              <p className="text-xl font-semibold text-text-primary">
                {formatDistance(remainingDistance)}
              </p>
            </div>
            <div className="text-center">
              <p className="mb-1 text-xs text-text-muted">남은 시간</p>
              <p className="text-xl font-semibold text-text-primary">
                {formatDuration(remainingTime)}
              </p>
            </div>
          </div>

          <button
            onClick={onExit}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-danger/15 py-3.5
                       font-semibold text-danger transition-transform active:scale-[0.98]"
          >
            <X className="h-5 w-5" />
            주행 종료
          </button>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, LocateFixed, Menu, Navigation2 } from 'lucide-react';
import { KakaoMap } from '../components/Map/KakaoMap';
import { CurrentLocationMarker } from '../components/Map/CurrentLocationMarker';
import { RoutePolyline } from '../components/Map/RoutePolyline';
import { PlaceSearch } from '../components/Search/PlaceSearch';
import { RouteSummary } from '../components/Route/RouteSummary';
import { ElevationProfile } from '../components/Route/ElevationProfile';
import { POIMarkers } from '../components/POI/POIMarkers';
import { poiConfig } from '../components/POI/poiConfig';
import { HazardMarkers } from '../components/Hazard/HazardMarkers';
import { HazardReportButton } from '../components/Hazard/HazardReportButton';
import { NavigationScreen } from '../components/Navigation/NavigationScreen';
import { getCurrentPosition, useGeolocation } from '../hooks/useGeolocation';
import { searchBikeRoute } from '../services/routeService';
import { searchPOIByType } from '../services/kakaoPlaces';
import { fetchHazards } from '../services/hazardApi';
import { useNavigationStore, type NamedPoint } from '../stores/navigationStore';
import type { BikePOI, HazardReport, PlaceResult, POIType } from '../types';

const BUSAN_CENTER = { lat: 35.1796, lng: 129.0756 };

function placeToPoint(p: PlaceResult): NamedPoint {
  return { lat: Number(p.y), lng: Number(p.x), name: p.place_name };
}

export function Home() {
  const {
    origin,
    destination,
    route,
    phase,
    isLoadingRoute,
    routeError,
    setOrigin,
    setDestination,
    setRoute,
    setPhase,
    setLoadingRoute,
    setRouteError,
    reset,
  } = useNavigationStore();

  const [map, setMap] = useState<any>(null);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [activePOI, setActivePOI] = useState<Set<POIType>>(new Set());
  const [livePois, setLivePois] = useState<BikePOI[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);

  // 실시간 GPS 추적 (내 위치 점이 실제 이동을 따라 움직임)
  const { coords: liveCoords, startTracking } = useGeolocation();
  const centeredOnceRef = useRef(false);
  const autoOriginSetRef = useRef(false);

  useEffect(() => {
    startTracking();
  }, [startTracking]);

  // 실시간 위치 갱신 시: 내 위치 갱신 + 첫 위치는 지도 중심 이동 + 출발지 자동 지정
  useEffect(() => {
    if (!liveCoords) return;
    setMyPos(liveCoords);

    // 최초 1회만 지도를 내 위치로 이동 (이후엔 사용자가 지도를 자유롭게 움직일 수 있게)
    if (!centeredOnceRef.current && map && window.kakao) {
      map.setCenter(new window.kakao.maps.LatLng(liveCoords.lat, liveCoords.lng));
      map.setLevel(4);
      centeredOnceRef.current = true;
    }

    // 앱을 처음 열었을 때 출발지를 '현재 위치'로 자동 지정 (아직 아무것도 안 정했을 때만)
    if (!autoOriginSetRef.current && !origin && phase === 'idle') {
      setOrigin({ ...liveCoords, name: '현재 위치' });
      autoOriginSetRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCoords, map]);

  // 위험 신고 목록 불러오기 (R2 백엔드)
  const loadHazards = useCallback(() => {
    fetchHazards().then(setHazards).catch(() => {});
  }, []);
  useEffect(() => {
    loadHazards();
  }, [loadHazards]);

  // 켜진 POI 종류를 카카오 검색으로 지도 중심 주변에서 실시간 조회
  useEffect(() => {
    if (!map || !window.kakao || activePOI.size === 0) {
      setLivePois([]);
      return;
    }
    const c = map.getCenter();
    const center = { lat: c.getLat(), lng: c.getLng() };
    let cancelled = false;
    Promise.all([...activePOI].map((t) => searchPOIByType(t, center)))
      .then((lists) => {
        if (!cancelled) setLivePois(lists.flat());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activePOI, map]);

  // 출발지·도착지가 모두 정해지면 자동으로 경로 탐색
  useEffect(() => {
    if (origin && destination && phase !== 'navigating') {
      void runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination]);

  const runSearch = useCallback(async () => {
    if (!origin || !destination) return;
    setLoadingRoute(true);
    setRouteError(null);
    setPhase('routing');
    try {
      const r = await searchBikeRoute(origin, destination);
      setRoute(r);
      setPhase('preview');
    } catch (e) {
      setRouteError('경로를 찾지 못했습니다. 잠시 후 다시 시도해주세요.');
      setPhase('idle');
    } finally {
      setLoadingRoute(false);
    }
  }, [origin, destination, setLoadingRoute, setRouteError, setPhase, setRoute]);

  const useMyLocationAsOrigin = useCallback(async () => {
    // 이미 실시간 위치가 있으면 즉시 사용 (기다릴 필요 없음)
    if (liveCoords) {
      setOrigin({ ...liveCoords, name: '현재 위치' });
      if (map && window.kakao) map.setCenter(new window.kakao.maps.LatLng(liveCoords.lat, liveCoords.lng));
      return;
    }
    try {
      const pos = await getCurrentPosition();
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMyPos(c);
      setOrigin({ ...c, name: '현재 위치' });
    } catch {
      setRouteError('현재 위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
    }
  }, [liveCoords, map, setOrigin, setRouteError]);

  const recenter = useCallback(() => {
    if (myPos && map && window.kakao) {
      map.setCenter(new window.kakao.maps.LatLng(myPos.lat, myPos.lng));
      map.setLevel(4);
    }
  }, [map, myPos]);

  const togglePOI = (t: POIType) => {
    setActivePOI((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const showRoute = (phase === 'preview' || phase === 'routing') && route;
  const poiTypes = useMemo(() => Object.keys(poiConfig) as POIType[], []);

  // 네비게이션 화면 (전체 화면 오버레이)
  if (phase === 'navigating') {
    return <NavigationScreen onExit={() => reset()} />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 지도 */}
      <div className="absolute inset-0">
        <KakaoMap center={BUSAN_CENTER} level={6} onMapReady={setMap} />
        {map && myPos && <CurrentLocationMarker map={map} position={myPos} accuracy={0} />}
        {map && showRoute && route && <RoutePolyline map={map} path={route.path} />}
        {map && <POIMarkers map={map} pois={livePois} activeTypes={activePOI} />}
        {map && <HazardMarkers map={map} hazards={hazards} />}
      </div>

      {/* 위험 신고 버튼 (좌측 하단) */}
      <HazardReportButton myPos={myPos} onReported={loadHazards} />

      {/* 상단 검색 패널 */}
      <div className="absolute inset-x-0 top-0 z-20 p-3 pt-safe">
        <div className="mx-auto max-w-lg space-y-2">
          {/* 출발지 줄 (오른쪽 버튼으로 현재 위치를 실시간으로 잡음) */}
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              aria-label="메뉴"
            >
              <Menu className="h-5 w-5 text-text-primary" />
            </Link>
            <div className="flex-1">
              <PlaceSearch
                placeholder="출발지 (내 위치 자동)"
                value={origin?.name}
                bias={myPos ?? BUSAN_CENTER}
                onSelect={(p) => setOrigin(placeToPoint(p))}
              />
            </div>
            <button
              onClick={useMyLocationAsOrigin}
              className="glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              aria-label="현재 위치를 출발지로"
              title="현재 위치를 출발지로 잡기"
            >
              <LocateFixed
                className={`h-5 w-5 ${origin?.name === '현재 위치' ? 'text-primary' : 'text-secondary'}`}
              />
            </button>
          </div>
          {/* 도착지 줄 */}
          <div className="flex items-center gap-2">
            <span className="h-11 w-11 shrink-0" aria-hidden />
            <div className="flex-1">
              <PlaceSearch
                placeholder="도착지 검색"
                value={destination?.name}
                bias={myPos ?? BUSAN_CENTER}
                onSelect={(p) => setDestination(placeToPoint(p))}
              />
            </div>
            <span className="h-11 w-11 shrink-0" aria-hidden />
          </div>

          {routeError && (
            <div className="rounded-2xl bg-danger/15 px-4 py-2 text-sm text-danger">{routeError}</div>
          )}
        </div>
      </div>

      {/* POI 필터 칩 */}
      <div className="absolute inset-x-0 z-10 flex gap-2 overflow-x-auto px-3 pb-1"
           style={{ top: '148px' }}>
        {poiTypes.map((t) => {
          const cfg = poiConfig[t];
          const on = activePOI.has(t);
          return (
            <button
              key={t}
              onClick={() => togglePOI(t)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                on
                  ? 'border-transparent text-white'
                  : 'border-white/10 bg-surface/80 text-text-secondary backdrop-blur'
              }`}
              style={on ? { backgroundColor: cfg.color } : undefined}
            >
              {cfg.emoji} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* 현재위치 버튼 */}
      <button
        onClick={recenter}
        className="glass absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ bottom: showRoute ? '320px' : '110px' }}
        aria-label="현재 위치로"
      >
        <Crosshair className="h-5 w-5 text-primary" />
      </button>

      {/* 하단 바텀시트 */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pb-safe">
        <div className="mx-auto max-w-lg space-y-3">
          {isLoadingRoute && (
            <div className="glass flex items-center justify-center gap-3 rounded-3xl p-5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-text-secondary">자전거 경로를 찾는 중…</span>
            </div>
          )}

          {showRoute && route && !isLoadingRoute && (
            <>
              <ElevationProfile path={route.path} />
              <RouteSummary
                route={route}
                onStart={() => setPhase('navigating')}
                onCancel={() => reset()}
              />
            </>
          )}

          {phase === 'idle' && !isLoadingRoute && (
            <div className="glass flex items-center gap-3 rounded-3xl p-4">
              <Navigation2 className="h-5 w-5 text-primary" />
              <p className="text-sm text-text-secondary">
                출발지와 도착지를 입력하면 자전거 경로를 안내해 드립니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

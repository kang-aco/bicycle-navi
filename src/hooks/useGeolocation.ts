import { useCallback, useEffect, useRef, useState } from 'react';

export interface GeoState {
  /** 현재 위치 좌표 */
  coords: { lat: number; lng: number } | null;
  /** 위치 정확도 (미터). 값이 작을수록 정확 */
  accuracy: number | null;
  /** 이동 방향 (0~360도, 북쪽=0). 없으면 null */
  heading: number | null;
  /** 현재 속도 (m/s). 없으면 null */
  speed: number | null;
  /** 위치 추적 중인지 */
  isTracking: boolean;
  /** 오류 메시지 (있을 때만) */
  error: string | null;
}

/**
 * GPS 실시간 위치 추적 훅.
 * startTracking() 을 부르면 위치가 바뀔 때마다 자동으로 state가 갱신됩니다.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    coords: null,
    accuracy: null,
    heading: null,
    speed: null,
    isTracking: false,
    error: null,
  });

  // watchPosition 이 돌려주는 id를 기억해뒀다가 나중에 추적을 멈출 때 사용
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, error: '이 브라우저는 위치(GPS)를 지원하지 않습니다.' }));
      return;
    }

    setState((s) => ({ ...s, isTracking: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading, // 정지 시 null 일 수 있음
          speed: pos.coords.speed,
          isTracking: true,
          error: null,
        });
      },
      (err) => {
        const messages: Record<number, string> = {
          1: '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해주세요.',
          2: '위치를 확인할 수 없습니다. GPS 신호를 확인해주세요.',
          3: '위치 확인 시간이 초과되었습니다.',
        };
        setState((s) => ({ ...s, error: messages[err.code] || err.message, isTracking: false }));
      },
      {
        enableHighAccuracy: true, // 고정밀 모드 (배터리를 더 쓰지만 자전거엔 필수)
        maximumAge: 2000,
        timeout: 10000,
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((s) => ({ ...s, isTracking: false }));
  }, []);

  // 컴포넌트가 사라질 때 추적을 자동으로 정리
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { ...state, startTracking, stopTracking };
}

/** 현재 위치를 딱 한 번만 받아오는 헬퍼 (Promise 방식) */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    });
  });
}

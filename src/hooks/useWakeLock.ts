import { useCallback, useEffect, useRef } from 'react';

/**
 * 화면 꺼짐 방지 훅 (Wake Lock API).
 * 네비게이션 중 화면이 자동으로 꺼지지 않도록 합니다.
 * 일부 브라우저(특히 iOS 사파리)는 지원하지 않을 수 있어 조용히 무시합니다.
 */
export function useWakeLock() {
  const lockRef = useRef<any>(null);

  const request = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        lockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // 지원하지 않거나 실패해도 앱은 정상 동작해야 하므로 무시
    }
  }, []);

  const release = useCallback(() => {
    lockRef.current?.release?.();
    lockRef.current = null;
  }, []);

  // 탭이 다시 보이면 Wake Lock을 다시 요청 (브라우저가 자동 해제하기 때문)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && lockRef.current === null) {
        request();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [request]);

  return { request, release };
}

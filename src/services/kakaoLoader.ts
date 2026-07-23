// 카카오맵 SDK를 딱 한 번만 로드하는 유틸리티.
// 여러 컴포넌트에서 지도를 써도 스크립트는 한 번만 불러옵니다.

let loadPromise: Promise<void> | null = null;

/**
 * 카카오맵 SDK 로드가 끝나면 resolve 되는 Promise를 돌려줍니다.
 * 사용 예: await loadKakaoMap(); 이후에 kakao.maps.* 를 사용.
 */
export function loadKakaoMap(): Promise<void> {
  // 이미 로드했으면 그 Promise를 재사용
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // 이미 window.kakao.maps 가 있으면 바로 완료
    if (window.kakao && window.kakao.maps) {
      resolve();
      return;
    }

    const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
    if (!appKey) {
      reject(new Error('VITE_KAKAO_JAVASCRIPT_KEY 가 .env 에 없습니다.'));
      return;
    }

    const script = document.createElement('script');
    // libraries=services : 장소검색 기능 포함 / autoload=false : 수동 로드
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error('카카오맵 SDK 로드에 실패했습니다. 키/도메인 설정을 확인하세요.'));

    document.head.appendChild(script);
  });

  return loadPromise;
}

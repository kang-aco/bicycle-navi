/// <reference types="vite/client" />

// .env 파일에서 읽어오는 환경변수 타입 정의
// (VITE_ 로 시작하는 변수만 브라우저 코드에서 사용할 수 있습니다)
interface ImportMetaEnv {
  readonly VITE_KAKAO_JAVASCRIPT_KEY: string;
  readonly VITE_KAKAO_REST_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 카카오맵 SDK는 CDN 스크립트로 불러오므로,
// TypeScript에게 전역(global)에 'kakao' 라는 객체가 있다고 알려줍니다.
declare global {
  interface Window {
    kakao: any;
  }
  // eslint-disable-next-line no-var
  var kakao: any;
}

export {};

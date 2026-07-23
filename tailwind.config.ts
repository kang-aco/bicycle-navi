import type { Config } from 'tailwindcss';

// 🎨 디자인 시스템 "Midnight Ride"
// 부산 밤바다 분위기의 다크 모드 우선 팔레트
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19', // 딥 네이비 블랙 (기본 배경)
        surface: {
          DEFAULT: '#141B2D', // 차콜 (카드/패널)
          elevated: '#1E293B', // 슬레이트 (모달/떠오른 요소)
        },
        primary: {
          DEFAULT: '#FF6B35', // 부산 오렌지 (주요 액션/속도)
          soft: 'rgba(255,107,53,0.15)',
        },
        secondary: '#4ECDC4', // 바다 민트 (자전거도로/안전)
        accent: '#FF8E72', // 선셋 핑크 (강조)
        danger: '#EF4444', // 브레이크 레드 (경고)
        text: {
          primary: '#F1F5F9', // 오프 화이트
          secondary: '#94A3B8', // 슬레이트 400
          muted: '#64748B', // 슬레이트 500
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config;

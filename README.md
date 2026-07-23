# 🚴 BusanCycleNav — 부산 자전거 실시간 네비게이션

카카오맵 기반, 부산 특화 자전거 내비게이션 웹앱(PWA)입니다.
출발지·도착지를 검색하면 자전거 경로를 찾아 지도에 그려주고, 주행을 시작하면
**음성으로 좌회전/우회전을 안내**합니다. 데이터 저장은 Supabase 대신
**Cloudflare R2**(오브젝트 스토리지)를 사용합니다.

> 💡 **용어 설명**
> - **PWA(Progressive Web App)**: 웹사이트인데 휴대폰 홈 화면에 앱처럼 설치되고 오프라인도 일부 동작하는 웹앱.
> - **R2**: Cloudflare의 파일 저장 창고(아마존 S3 같은 것). 여기서는 JSON 파일 하나를 "간이 데이터베이스"로 씁니다.
> - **턴바턴(turn-by-turn)**: "200m 앞 우회전" 처럼 갈림길마다 방향을 알려주는 안내 방식.

---

## 1. 지금 바로 실행해 보기 (내 컴퓨터에서)

터미널(명령 프롬프트)을 열고 이 폴더에서 아래 명령을 순서대로 칩니다.

```bash
npm install       # 1) 필요한 부품(라이브러리) 설치 — 처음 한 번만
npm run dev       # 2) 개발 서버 실행
```

실행되면 터미널에 `http://localhost:5173` 같은 주소가 나옵니다.
그 주소를 브라우저에서 열면 앱이 뜹니다.

> ⚠️ **위치(GPS)와 마이크 권한**: 브라우저가 위치 권한을 물어보면 **허용**을 눌러주세요.
> 위치 기능은 `https` 또는 `localhost` 에서만 동작합니다.

---

## 2. 카카오맵 키 설정 (`.env` 파일)

지도가 안 보이면 대부분 키 문제입니다. 이 폴더의 **`.env`** 파일을 확인하세요.

```
VITE_KAKAO_JAVASCRIPT_KEY=여기에_JavaScript_키
VITE_KAKAO_REST_API_KEY=여기에_REST_키
```

- `VITE_` 접두사가 **반드시** 있어야 브라우저 코드에서 키를 읽을 수 있습니다.
- 카카오 개발자센터(developers.kakao.com) → 내 애플리케이션 → **플랫폼 → Web**
  에서 **사이트 도메인**에 아래 두 개를 등록해야 지도가 뜹니다.
  - `http://localhost:5173` (개발용)
  - 배포 후 실제 주소 (예: `https://busan-cyclenav.pages.dev`)

---

## 3. 폴더 구조 (어디에 무엇이 있는지)

```
bicycle-navi/
├── .env                     ← 카카오 키 (깃허브에 올리지 않음)
├── index.html               ← 앱의 시작 HTML
├── vite.config.ts           ← 빌드/PWA 설정
├── tailwind.config.ts       ← 디자인 색상표 "Midnight Ride"
├── wrangler.toml            ← Cloudflare Pages + R2 연결 설정
├── public/
│   ├── _redirects           ← 새로고침 시 주소 처리(SPA 라우팅)
│   └── icon-192.png / icon-512.png  ← 앱 아이콘
├── functions/api/
│   └── hazards.ts           ← 위험신고 API (R2에 읽고 쓰기) ★백엔드
└── src/
    ├── main.tsx / App.tsx   ← 앱 진입점 & 페이지 라우팅
    ├── pages/
    │   ├── Home.tsx         ← 메인 지도 화면 (핵심)
    │   ├── RideHistory.tsx  ← 주행 기록 목록
    │   └── Settings.tsx     ← 설정
    ├── components/
    │   ├── Map/             ← 카카오지도, 현재위치 마커, 경로선
    │   ├── Search/          ← 장소 검색창
    │   ├── Route/           ← 경로 요약카드, 고도 그래프
    │   ├── Navigation/      ← 실시간 네비게이션 화면
    │   └── POI/             ← 공기주입소·수리점 등 마커
    ├── hooks/               ← GPS 추적, 화면 꺼짐 방지 등 기능 조각
    ├── services/
    │   ├── kakaoLoader.ts   ← 카카오맵 SDK 불러오기
    │   ├── routeService.ts  ← 경로 탐색 (BRouter→OSRM→카카오)
    │   ├── voiceGuidance.ts ← 음성 안내 엔진
    │   ├── geo.ts           ← 거리·방위각 계산
    │   ├── rideStorage.ts   ← 주행 기록 저장(브라우저)
    │   └── hazardApi.ts     ← 위험신고 API 호출
    ├── stores/              ← 앱 전역 상태(zustand)
    ├── data/                ← 부산 자전거 POI 샘플 데이터
    └── types/               ← 공통 타입 정의
```

---

## 4. 자전거 경로는 어떻게 찾나요?

카카오의 **자전거 길찾기 REST API는 일반 키로는 승인이 나지 않습니다.**
그래서 이 앱은 아래 순서로 경로를 찾습니다 (`src/services/routeService.ts`):

1. **BRouter** — 자전거 전용 무료 라우팅 (키 불필요). 실제 자전거 도로를 우선.
2. **OSRM** — BRouter가 실패하면 공개 서버로 폴백.
3. **카카오 모빌리티** — REST 키가 승인된 경우에만 시도.
4. 모두 실패하면 직선 경로라도 표시.

턴바턴 안내(좌/우회전)는 서버마다 형식이 달라서, **경로 좌표의 방향 변화를 직접
계산**해서 만듭니다. 그래서 어떤 경로 엔진을 써도 음성 안내가 동작합니다.

---

## 5. Cloudflare Pages + R2 배포 (나중에 진행)

> 이 부분은 아코님이 "이제 배포하자"고 하실 때 함께 진행하면 됩니다. 요약만 적어둡니다.

### (1) 깃허브에 올리기
```bash
git init
git add .
git commit -m "첫 커밋: 부산 자전거 네비게이션"
git branch -M main
git remote add origin https://github.com/사용자명/busan-cyclenav.git
git push -u origin main
```

### (2) R2 버킷(데이터 창고) 만들기
Cloudflare 대시보드 → **R2** → 버킷 생성 → 이름 `busan-cyclenav-data`
(이름을 바꾸면 `wrangler.toml`의 `bucket_name`도 같이 바꿔주세요.)

### (3) Pages 프로젝트 연결
Cloudflare → **Workers & Pages** → **Pages** → 깃허브 저장소 연결
- 빌드 명령: `npm run build`
- 출력 폴더: `dist`
- **설정 → Functions → R2 바인딩**: 변수명 `DB` → 버킷 `busan-cyclenav-data`
- **설정 → 환경변수**: `VITE_KAKAO_JAVASCRIPT_KEY`, `VITE_KAKAO_REST_API_KEY` 등록

### (4) 자동 배포 — 두 가지 방법
**방법 A (권장, 가장 쉬움):** 위 (3)처럼 Cloudflare Pages에 깃허브 저장소를 연결하면,
`main`에 push할 때마다 Cloudflare가 **자동으로 빌드·배포**합니다. 별도 설정이 필요 없습니다.

**방법 B (GitHub Actions):** 원한다면 `docs/cloudflare-deploy.yml.example` 파일을
`.github/workflows/deploy.yml` 위치로 옮기고, 저장소 **Settings → Secrets**에 아래를 등록하세요.
(단, GitHub 토큰에 `workflow` 권한이 있어야 push됩니다.)
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- `VITE_KAKAO_JAVASCRIPT_KEY`, `VITE_KAKAO_REST_API_KEY`

---

## 6. 자주 겪는 문제

| 증상 | 원인/해결 |
|---|---|
| 지도가 회색/안 보임 | 카카오 개발자센터에 도메인(`localhost:5173`) 등록 확인 |
| "지도를 불러오지 못했습니다" | `.env`의 `VITE_KAKAO_JAVASCRIPT_KEY` 값 확인 |
| 내 위치가 안 나옴 | 브라우저 위치 권한 허용, `https`/`localhost`인지 확인 |
| 음성이 안 나옴 | 설정에서 음성 안내 ON, 기기 볼륨 확인 (일부 브라우저는 첫 터치 후 동작) |
| 경로가 이상함 | BRouter/OSRM 공개 서버 상태에 따라 폴백될 수 있음 |

---

## 7. 이번에 만든 범위 & 다음 단계

**이번 MVP (Phase 1~3)**
- ✅ 카카오 지도 + 실시간 GPS 위치
- ✅ 장소 검색(부산 우선) + 자전거 경로 탐색 + 고도 그래프
- ✅ 실시간 턴바턴 음성 네비게이션 + 경로이탈 재탐색
- ✅ 주행 기록 저장 + GPX 내보내기
- ✅ 부산 자전거 POI 표시, R2 백엔드(위험신고) 뼈대, PWA 설치

**다음 단계 후보 (Phase 4~5)**
- 위험신고 UI를 지도에 연결 (백엔드는 이미 준비됨)
- 부산시 공공데이터 POI 실데이터 연동
- 오프라인 지도 캐싱 고도화, 주행 통계 대시보드
```

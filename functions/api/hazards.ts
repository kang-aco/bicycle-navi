// Cloudflare Pages Function — 위험 신고 API
// 데이터베이스 대신 Cloudflare R2(오브젝트 스토리지)에 JSON 파일 하나를 두고
// 그 파일을 읽고/쓰는 방식으로 동작합니다. (가족 홈페이지와 동일한 R2-as-DB 패턴)
//
// 엔드포인트:
//   GET  /api/hazards        → 아직 만료되지 않은 위험 신고 목록
//   POST /api/hazards        → 새 위험 신고 등록 (24시간 후 자동 만료)
//
// R2 바인딩 이름: DB  (wrangler.toml 또는 Cloudflare 대시보드에서 연결)

interface Env {
  DB: R2Bucket;
}

const DB_KEY = 'hazards.json';

interface Hazard {
  id: string;
  lat: number;
  lng: number;
  type: string;
  description: string;
  reported_by: string;
  created_at: string;
  expires_at: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

async function readAll(env: Env): Promise<Hazard[]> {
  const obj = await env.DB.get(DB_KEY);
  if (!obj) return [];
  try {
    return JSON.parse(await obj.text()) as Hazard[];
  } catch {
    return [];
  }
}

async function writeAll(env: Env, list: Hazard[]): Promise<void> {
  await env.DB.put(DB_KEY, JSON.stringify(list), {
    httpMetadata: { contentType: 'application/json' },
  });
}

// 브라우저의 CORS 사전 요청(preflight) 처리
export const onRequestOptions: PagesFunction<Env> = async () => json({ ok: true });

// 위험 신고 목록 (만료된 것은 제외)
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const now = Date.now();
  const list = (await readAll(env)).filter((h) => new Date(h.expires_at).getTime() > now);
  return json(list);
};

// 새 위험 신고 등록
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Partial<Hazard>;
  try {
    body = await request.json();
  } catch {
    return json({ error: '잘못된 요청 형식입니다.' }, 400);
  }

  if (typeof body.lat !== 'number' || typeof body.lng !== 'number' || !body.type) {
    return json({ error: 'lat, lng, type 값이 필요합니다.' }, 400);
  }

  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24시간 후
  const hazard: Hazard = {
    id: `hz-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    lat: body.lat,
    lng: body.lng,
    type: String(body.type),
    description: String(body.description ?? ''),
    reported_by: String(body.reported_by ?? 'anonymous'),
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
  };

  // 만료된 신고는 정리하면서 새 신고 추가
  const list = (await readAll(env)).filter((h) => new Date(h.expires_at).getTime() > now.getTime());
  list.push(hazard);
  await writeAll(env, list);

  return json(hazard, 201);
};

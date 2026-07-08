import { createClient } from '@supabase/supabase-js';
import { getRolesByToken, hasRole } from './_roles.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const json = (obj) => new Response(JSON.stringify(obj), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

const BUCKET = 'article-images';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

// uuid 대용 (경로 추측 방지용 고유 파일명)
function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await req.json(); } catch (e) { return json({ status: 'error', detail: 'bad body' }); }

  // operator 인증 — 없으면 서명 URL 발급 거부 (아무나 업로드 구멍 차단)
  const roleInfo = await getRolesByToken(supabase, body.token);
  if (!roleInfo.ok) {
    return json({ status: 'error', detail: roleInfo.reason || 'auth failed' });
  }
  if (!hasRole(roleInfo.roles, 'operator')) {
    return json({ status: 'forbidden', detail: 'operator role required' });
  }

  // 파일 타입 검증 (서버측)
  const contentType = body.contentType || '';
  if (!ALLOWED_TYPES.includes(contentType)) {
    return json({ status: 'error', detail: '허용되지 않는 파일 형식입니다 (jpg/png/webp/gif만).' });
  }

  // uuid 파일명 생성 (원본명 안 씀 — 경로 추측·충돌 방지)
  const ext = EXT[contentType];
  const fileName = uid() + '.' + ext;
  const filePath = fileName; // 버킷 루트에 저장

  // 서명 업로드 URL 발급 (유효시간 짧게 — Supabase 기본 수 분)
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(filePath);

  if (error) {
    return json({ status: 'error', detail: '업로드 URL 발급 실패: ' + error.message });
  }

  // 최종 공개 URL (업로드 후 본문에 넣을 주소)
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return json({
    status: 'ok',
    signedUrl: data.signedUrl,   // 브라우저가 여기로 직접 업로드
    token: data.token,           // Supabase 업로드 토큰
    path: filePath,
    publicUrl: pub.publicUrl,    // 업로드 후 img src에 넣을 공개 URL
  });
};

import { createClient } from '@supabase/supabase-js';
import { verifyUnsubToken } from './_unsub.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

function json(body) {
  return new Response(JSON.stringify(body), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

export default async (req) => {
  // 진입 경로 두 갈래 (마틴 판결):
  //  · GET  = 메일 본문 링크 클릭 → 검증만. 확인 페이지가 확정 버튼을 보여주는 2단계
  //           (메일 스캐너 자동 클릭·오클릭으로 의도치 않은 수신거부 방지)
  //  · POST = 실제 처리. 두 출처가 있고 둘 다 즉시 처리한다.
  //     (a) 확인 페이지의 확정 버튼 → body(JSON)에 token
  //     (b) List-Unsubscribe One-Click(RFC 8058) → 메일 클라이언트가 헤더 URL로 POST.
  //         body는 'List-Unsubscribe=One-Click' 폼이고 토큰은 URL 쿼리에 있음.
  //         사용자가 메일 앱 UI에서 명시적으로 누른 행위이므로 확인 단계 없이 즉시 처리해야 한다
  //         (여기서 처리 안 하면 "거부했는데 계속 온다" → 스팸 신고. 헤더 목적과 반대 결과).
  let token;
  const url = new URL(req.url);
  if (req.method === 'GET') {
    token = url.searchParams.get('token');
  } else if (req.method === 'POST') {
    try {
      const body = await req.json();
      token = body && body.token;
    } catch (e) {
      token = null; // JSON이 아님(One-Click 폼 등) → 아래에서 쿼리로 폴백
    }
    if (!token) token = url.searchParams.get('token');
  } else {
    return json({ status: 'error', detail: 'method not allowed' });
  }

  // 토큰 검증 — 유효하면 email, 아니면 null (남의 주소 거부 차단의 핵심)
  const email = verifyUnsubToken(token);
  if (!email) {
    return json({ status: 'invalid' });
  }

  // GET = 검증만 (확인 페이지가 이메일 보여주고 버튼 누르면 POST로 실제 처리)
  if (req.method === 'GET') {
    return json({ status: 'valid', email });
  }

  // POST = 실제 처리. mail_opt_out = true (계정 삭제 아님 — 조용해지는 것)
  const { error } = await supabase
    .from('members')
    .update({ mail_opt_out: true })
    .eq('email', email);

  if (error) {
    return json({ status: 'error', detail: error.message });
  }

  return json({ status: 'ok', email });
};

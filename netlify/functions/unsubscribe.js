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
  // 토큰은 GET(링크 클릭)이나 POST 둘 다 받되, 실제 처리(쓰기)는 POST에서만.
  // GET은 확인 페이지가 "정말 거부하시겠습니까" 없이 바로 처리되는 걸 막기 위해 검증만.
  let token;
  if (req.method === 'GET') {
    const url = new URL(req.url);
    token = url.searchParams.get('token');
  } else if (req.method === 'POST') {
    try {
      const body = await req.json();
      token = body.token;
    } catch (e) {
      return json({ status: 'error', detail: 'bad body' });
    }
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

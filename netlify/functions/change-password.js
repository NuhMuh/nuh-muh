import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const json = (obj) => new Response(JSON.stringify(obj), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await req.json(); } catch (e) { return json({ status: 'error', detail: 'bad body' }); }

  const token = body.token;
  const currentPw = body.currentPassword;
  const newPw = body.newPassword;

  if (!token) return json({ status: 'error', detail: 'no token' });
  if (!currentPw || !newPw) return json({ status: 'error', detail: '현재/새 비밀번호를 모두 입력하세요.' });
  if (newPw.length < 8) return json({ status: 'error', detail: '새 비밀번호는 8자 이상이어야 합니다.' });
  if (newPw === currentPw) return json({ status: 'error', detail: '새 비밀번호가 현재와 같습니다.' });

  // 1) 토큰 → 사용자 확인
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData || !userData.user) {
    return json({ status: 'error', detail: 'invalid session' });
  }
  const email = userData.user.email;
  const userId = userData.user.id;

  // 2) 현재 비밀번호 재확인 — signInWithPassword로 검증 (세션 탈취 방어)
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: email,
    password: currentPw,
  });
  if (signErr) {
    return json({ status: 'error', detail: '현재 비밀번호가 일치하지 않습니다.' });
  }

  // 3) 새 비밀번호로 변경 (admin API)
  const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
    password: newPw,
  });
  if (updErr) {
    return json({ status: 'error', detail: '변경 실패: ' + updErr.message });
  }

  return json({ status: 'ok' });
};

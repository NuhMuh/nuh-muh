// 역할 확인 공용 로직 (마틴: 역할 축 — member_roles 다대다).
// 절차 축(members.status)과 섞지 않는다. 이건 keyholder 위에 얹히는 역할 전용.

/**
 * 토큰으로 인증된 사용자의 역할 배열을 반환.
 * @param supabase - secret 키로 만든 supabase 클라이언트
 * @param token - 브라우저가 보낸 access_token
 * @returns { ok, email, memberId, roles } — 실패 시 ok:false
 */
export async function getRolesByToken(supabase, token) {
  if (!token) return { ok: false, reason: 'no token', roles: [] };

  // 1) 토큰 → 사용자 (auth)
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData || !userData.user) {
    return { ok: false, reason: 'invalid session', roles: [] };
  }
  const email = userData.user.email;

  // 2) email → members.id
  const { data: member, error: mErr } = await supabase
    .from('members').select('id').eq('email', email).maybeSingle();
  if (mErr || !member) {
    return { ok: true, email, memberId: null, roles: [] }; // 인증은 됐으나 회원행/역할 없음
  }

  // 3) member_id → 역할들
  const { data: roleRows, error: rErr } = await supabase
    .from('member_roles').select('role').eq('member_id', member.id);
  if (rErr) {
    return { ok: false, reason: 'role query failed: ' + rErr.message, email, memberId: member.id, roles: [] };
  }

  const roles = (roleRows || []).map(r => r.role);
  return { ok: true, email, memberId: member.id, roles };
}

/** roles 배열에 특정 역할이 있는지 */
export function hasRole(roles, role) {
  return Array.isArray(roles) && roles.includes(role);
}

// 수신거부 토큰 — 이메일 기반 HMAC 서명. "본인만 자기 주소를 거부"할 수 있게.
// 토큰 = base64url(email) + '.' + base64url(HMAC_SHA256(email, secret))
// 만료 없음(오래된 메일의 링크도 유효해야 함). secret = 환경변수 UNSUB_SECRET.
import crypto from 'node:crypto';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

function secret() {
  const sec = process.env.UNSUB_SECRET;
  if (!sec) throw new Error('UNSUB_SECRET not set');
  return sec;
}

function sign(email) {
  return crypto.createHmac('sha256', secret()).update(email).digest();
}

// 토큰 생성 (subscribe.js 등 발송 측에서 사용)
export function makeUnsubToken(email) {
  const e = String(email).trim().toLowerCase();
  return b64url(e) + '.' + b64url(sign(e));
}

// 토큰 검증 → 유효하면 email 반환, 아니면 null (수신거부 처리 함수에서 사용)
export function verifyUnsubToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [ePart, sigPart] = token.split('.');
  let email;
  try {
    email = b64urlDecode(ePart);
  } catch (e) {
    return null;
  }
  const expected = b64url(sign(email));
  // 타이밍 공격 방지 상수시간 비교
  const a = Buffer.from(sigPart);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return email;
}

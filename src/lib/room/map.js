// 내 방 — 첫째 벽 오른쪽의 지도 (내 방 2차-② ⑦, 「내 방 설계」 §5-3)
//
// ★계산은 서버(room.js gatherMap)가 한다 — 한 달의 경계, 한국 날짜, 사분면, 갈래별 순번.
//   여기는 받은 점을 그리기만 한다. 값의 출처를 둘로 만들지 않는다.
// ★숫자를 띄우지 않는다. 붉은색을 쓰지 않는다. 빈 달은 아무것도 안 찍힌 좌표평면 그대로다.
// ★스크립트가 만드는 SVG라 CSS 변수가 속성에 안 먹는다 — 값을 CSS에서 읽어 속성에 박는다(§32).
// ★가로는 고정이고 세로만 늘어난다. 지도가 길어지면 벽이 받아준다(2차-①) — 그래서 벽 안(.inner)에 둔다.

const NS = 'http://www.w3.org/2000/svg';
const X_HALF = 32;        // 한 달은 길어야 31일 — x 칸은 고정(한 칸 여유: 31일째 점이 테두리에 걸리지 않게)
const Y_HALF_MIN = 20;    // y는 위아래 20칸에서 시작해 담기가 많으면 늘어난다(§5-3 "자연히 늘어난다")
const CELL = 10;          // 한 칸의 크기(viewBox 단위). 가로·세로 같은 크기라 세로가 늘면 지도가 길어진다

// 사분면의 갈래 이름 — 숫자가 아니라 이름이다. 모양은 운영자와 실물을 보며 다시 잡는다.
const LABELS = [
  { q: 1, t: '인물' }, { q: 2, t: '소설' }, { q: 3, t: '영상' }, { q: 4, t: '소식' },
];

function tok(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
  return e;
}

export function drawMap(box, map) {
  if (!box) return;
  const points = (map && map.points) || [];
  // 가장 큰 순번보다 한 칸 넉넉히 — 맨 끝 점이 테두리에 반쯤 잘리지 않게.
  const yHalf = Math.max(Y_HALF_MIN, ...points.map((p) => Math.abs(p.y) + 1));
  const W = X_HALF * 2 * CELL, H = yHalf * 2 * CELL, cx = W / 2, cy = H / 2;
  const ink = tok('--ink', '#1c2340');
  const soft = tok('--ink-soft', '#4a4f66');
  const faint = tok('--ink-faint', '#8a8d9c');
  const rule = tok('--rule', 'rgba(28,35,64,0.14)');
  const ruleStrong = tok('--rule-strong', 'rgba(28,35,64,0.28)');
  const thin = { 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' };

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '이 달의 지도' });
  // 테두리는 안쪽으로 한 칸 들인다 — 지도가 줄어 보이면 1픽셀 선이 가장자리에서 잘린다.
  svg.appendChild(el('rect', Object.assign({ x: 1.5, y: 1.5, width: W - 3, height: H - 3, fill: 'none', stroke: ruleStrong }, thin)));
  svg.appendChild(el('line', Object.assign({ x1: 0, y1: cy, x2: W, y2: cy, stroke: rule }, thin)));
  svg.appendChild(el('line', Object.assign({ x1: cx, y1: 0, x2: cx, y2: H, stroke: rule }, thin)));

  LABELS.forEach((l) => {
    const right = (l.q === 1 || l.q === 4), top = (l.q === 1 || l.q === 2);
    const t = el('text', {
      x: right ? W - 12 : 12, y: top ? 26 : H - 14, 'text-anchor': right ? 'end' : 'start',
      fill: faint, 'font-size': 16, 'font-family': "'Noto Serif KR', serif",
    });
    t.textContent = l.t;
    svg.appendChild(t);
  });

  // 선은 원점(달의 시작)에서 출발해 담은 순서대로 잇는다 — 갈래 사이의 순서가 선에 남는다(§5-3).
  if (points.length) {
    const xy = (p) => [cx + p.x * CELL, cy - p.y * CELL];
    const path = [[cx, cy]].concat(points.map(xy));
    svg.appendChild(el('polyline', {
      points: path.map((q) => q[0] + ',' + q[1]).join(' '), fill: 'none', stroke: soft,
      'stroke-width': 1.2, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke',
    }));
    svg.appendChild(el('circle', { cx: cx, cy: cy, r: 2.5, fill: soft }));
    points.forEach((p) => {
      const q = xy(p);
      svg.appendChild(el('circle', { cx: q[0], cy: q[1], r: 4, fill: ink }));
    });
  }

  box.innerHTML = '';
  box.appendChild(svg);
}

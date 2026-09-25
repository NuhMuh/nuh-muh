// 내 방 — 첫째 벽 오른쪽의 지도 (내 방 2차-② ⑦, 「내 방 설계」 §5-3)
//
// ★계산은 서버(room.js gatherMap)가 한다 — 한 달의 경계, 한국 날짜, 사분면, 갈래별 순번.
//   여기는 받은 점을 그리기만 한다. 값의 출처를 둘로 만들지 않는다.
// ★숫자를 띄우지 않는다. 붉은색을 쓰지 않는다. 빈 달은 아무것도 안 찍힌 좌표평면 그대로다.
// ★스크립트가 만드는 SVG라 CSS 변수가 속성에 안 먹는다 — 값을 CSS에서 읽어 속성에 박는다(§32).
// ★가로는 고정이고 세로만 늘어난다. 지도가 길어지면 벽이 받아준다(2차-①) — 그래서 벽 안(.inner)에 둔다.
//
// ★칸이 좁으면 지도를 세운다 [운영자 요청, 09-25]. 사분면 자리(인물 오른쪽 위·소설 왼쪽 위·
//   영상 왼쪽 아래·소식 오른쪽 아래, 운영자 확정 09-24)는 그대로 두고, 두 축이 맡는 것만 바꾼다 —
//   누운 지도는 가로가 날짜·세로가 순번, 선 지도는 가로가 순번·세로가 날짜.
//   통째로 돌리면 사분면이 옮겨 가 버린다.
// ★갈래 이름은 SVG 밖 글자로 둔다 [운영자 요청, 09-25] — 지도 테두리 바로 위·바로 아래.
//   SVG 안에 두면 지도가 작아질 때 글자도 같이 작아져 못 읽는다.

const NS = 'http://www.w3.org/2000/svg';
const X_HALF = 32;        // 한 달은 길어야 31일 — 날짜 칸은 고정(한 칸 여유: 31일째 점이 테두리에 걸리지 않게)
                          // 설계 표는 30이나 31일째를 담으려 32로 했다 [운영자 승인 09-25]
const Y_HALF_MIN = 20;    // 순번은 20칸에서 시작해 담기가 많으면 늘어난다(§5-3 "자연히 늘어난다")
const CELL = 10;          // 한 칸의 크기(viewBox 단위). 가로·세로 같은 크기

function tok(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
  return e;
}
function cap(cls, left, right) {
  const d = document.createElement('div');
  d.className = 'map-cap ' + cls;
  const a = document.createElement('span'); a.textContent = left;
  const b = document.createElement('span'); b.textContent = right;
  d.appendChild(a); d.appendChild(b);
  return d;
}
// 세울지 눕힐지 — 지도 칸의 폭으로 정한다. 기준 폭은 CSS(.map의 --map-tall-below)에 둔다.
function isTall(box) {
  const below = parseFloat(getComputedStyle(box).getPropertyValue('--map-tall-below')) || 0;
  return box.clientWidth > 0 && box.clientWidth < below;
}

function paintMap(box, map, tall) {
  const points = (map && map.points) || [];
  // 가장 큰 순번보다 한 칸 넉넉히 — 맨 끝 점이 테두리에 반쯤 잘리지 않게.
  const nHalf = Math.max(Y_HALF_MIN, ...points.map((p) => Math.abs(p.y) + 1));
  const W = (tall ? nHalf : X_HALF) * 2 * CELL;
  const H = (tall ? X_HALF : nHalf) * 2 * CELL;
  const cx = W / 2, cy = H / 2;
  const ink = tok('--ink', '#1c2340');
  const soft = tok('--ink-soft', '#4a4f66');
  const rule = tok('--rule', 'rgba(28,35,64,0.14)');
  const ruleStrong = tok('--rule-strong', 'rgba(28,35,64,0.28)');
  const thin = { 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' };

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '이 달의 지도' });
  // 테두리는 안쪽으로 한 칸 들인다 — 지도가 줄어 보이면 1픽셀 선이 가장자리에서 잘린다.
  svg.appendChild(el('rect', Object.assign({ x: 1.5, y: 1.5, width: W - 3, height: H - 3, fill: 'none', stroke: ruleStrong }, thin)));
  svg.appendChild(el('line', Object.assign({ x1: 0, y1: cy, x2: W, y2: cy, stroke: rule }, thin)));
  svg.appendChild(el('line', Object.assign({ x1: cx, y1: 0, x2: cx, y2: H, stroke: rule }, thin)));

  // 선은 원점(달의 시작)에서 출발해 담은 순서대로 잇는다 — 갈래 사이의 순서가 선에 남는다(§5-3).
  if (points.length) {
    // 서버의 점은 (날짜, 순번)에 사분면 부호가 붙은 것이다. 세운 지도에서는 크기만 맞바꾸고 부호는 그대로 둔다.
    const xy = tall
      ? (p) => [cx + Math.sign(p.x) * Math.abs(p.y) * CELL, cy - Math.sign(p.y) * Math.abs(p.x) * CELL]
      : (p) => [cx + p.x * CELL, cy - p.y * CELL];
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
  box.appendChild(cap('map-cap-top', '소설', '인물'));
  box.appendChild(svg);
  box.appendChild(cap('map-cap-bot', '영상', '소식'));
  // 세웠는지를 칸에 적어 둔다 — 거울이 이것을 보고 함께 선다(CSS).
  box.dataset.shape = tall ? 'tall' : 'wide';
}

export function drawMap(box, map) {
  if (!box) return;
  box.__nmMap = map;
  paintMap(box, map, isTall(box));
  // ★폭이 기준을 넘나들 때만 다시 그린다. 세우고 눕히는 것은 높이만 바꾸고 폭은 안 바꾸므로
  //   다시 그린 것이 또 다시 그리기를 부르지 않는다.
  if (!box.__nmRO && typeof ResizeObserver !== 'undefined') {
    box.__nmRO = new ResizeObserver(() => {
      const tall = isTall(box);
      if ((box.dataset.shape === 'tall') !== tall) paintMap(box, box.__nmMap, tall);
    });
    box.__nmRO.observe(box);
  }
}

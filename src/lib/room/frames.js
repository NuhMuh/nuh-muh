// 내 방 — 첫째 벽의 액자 셋과 엽서 창 (내 방 2차-② ⑥)
//
// ★방 화면(room/index.astro)에서 떼어 둔 까닭: 방 화면이 이미 700줄이 넘고, 액자는 모양을 두고
//   운영자와 여러 번 오갈 자리다. 여기만 고치면 굴리기·높이 코드를 건드리지 않는다.
// ★이 파일이 만드는 것은 전부 스크립트가 그리는 노드다 — 방 화면의 스코프 CSS가 안 닿으므로
//   방 화면 쪽 CSS는 :global()로 적는다(「스택과 기술 함정」 §23).
// ★서버와의 약속(room.js): 걸기 hang · 문장 바꾸기 reframe · 내리기 unhang · 본문 frame-source.
//   고른 문장이 진짜 그 글의 문장인지는 서버가 다시 본다 — 여기서 막는 것은 편의일 뿐이다.

// 화면에 뜨는 말 — 하오체 임시 문구다. 앨리에게 넘길 목록이 이것이다(발주 ⑨).
const T = {
  emptyFrame: '빈 액자 — 걸 것을 고르오',          // 눈에는 안 보이고 화면 읽기 도구만 읽는다
  hungFrame: (title) => title + ' — 걸린 액자',
  pickTitle: '무엇을 걸겠소',
  pickNone: '통째로 담은 글이 가방에 없소.',
  loading: '가방을 여는 중이오.',
  linesHint: '띄울 문장을 누르시오. 다시 누르면 빠지오. 안 고르면 제목이 뜨오.',
  linesCount: (n) => '고른 문장 ' + n + ' / 5',
  linesFull: '다섯까지만 고를 수 있소.',
  hang: '건다',
  save: '바꾼다',
  back: '물러난다',
  goArticle: '그 글로 간다',
  change: '액자를 바꾼다',
  changeArticle: '글을 바꾼다',
  changeLines: '문장을 바꾼다',
  takeDown: '내린다',
  takeDownAsk: '내리면 고른 문장은 사라지오. 담은 글은 가방에 그대로 있소.',
  failed: '무언가 어긋났소.',                       // 공통 오류 세트 — 미분류 실패
  lost: '거미가 길을 잃었군.',                      // 공통 오류 세트 — 연결 끊김
};

// ★한 장이 머무는 시간과 액자끼리 어긋나는 시간. 셋이 한꺼번에 바뀌면 벽이 깜빡이는 것처럼 보인다.
const STAY_MS = 5200;
const STAGGER_MS = 1700;

function h(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}
function btn(label, onClick, cls) {
  const b = h('button', cls || 'pc-btn', label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
function row(...kids) {
  const r = h('div', 'pc-row');
  kids.forEach((k) => r.appendChild(k));
  return r;
}
function dateOf(at) {
  const d = at ? new Date(at) : null;
  if (!d || isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
}

export function mountFrames(opts) {
  const box = opts.box, layer = opts.layer, callRoom = opts.callRoom, reload = opts.reload;
  if (!box || !layer) return { render() {} };

  let items = [];
  let timers = [];

  // ★자리 번호는 글자 칸이다 — 1로 걸어도 "1"로 돌아온다(09-25 실측). 글자로 맞춘다.
  const hungIn = (slot) => items.find((i) => i.kind === 'keep' && i.keep && i.face === 'front' && String(i.slot) === String(slot));
  // 액자에 걸 수 있는 것 — 가방 안의 통째 담기(문단 표시가 빈 것). 걸린 것은 가방에 없으므로 안 뜬다.
  const wholeInBag = () => items.filter((i) => i.kind === 'keep' && i.keep && i.face === 'bottom' && i.keep.anchor == null);

  function render(list) {
    items = list || [];
    timers.forEach((id) => { clearTimeout(id); clearInterval(id); });
    timers = [];
    box.innerHTML = '';
    for (let slot = 1; slot <= 3; slot++) {
      const it = hungIn(slot);
      const fr = h('button', 'fr ' + (it ? 'fr-full' : 'fr-empty'));
      fr.type = 'button';
      if (it) {
        fill(fr, it, slot);
        fr.addEventListener('click', () => openMenu(slot, it));
      } else {
        // 빈 액자는 비어 있는 틀일 뿐이다 — "없음"을 말로 적지 않는다.
        fr.setAttribute('aria-label', T.emptyFrame);
        fr.addEventListener('click', () => openPick(slot, null));
      }
      box.appendChild(fr);
    }
  }

  // 걸린 액자 — 고른 문장(없으면 제목)과 그 글의 이미지가 번갈아 저 혼자 바뀐다.
  // ★틀의 크기는 CSS가 고정한다. 안에서 무엇이 바뀌어도 틀은 그대로라 벽 높이가 출렁이지 않는다.
  function fill(fr, it, slot) {
    const lines = (it.payload && it.payload.lines && it.payload.lines.length) ? it.payload.lines : [it.keep.title || ''];
    const imgs = it.images || [];
    const seq = [];
    for (let i = 0; i < Math.max(lines.length, imgs.length); i++) {
      if (i < lines.length) seq.push({ text: lines[i] });
      if (i < imgs.length) seq.push({ img: imgs[i] });
    }
    fr.setAttribute('aria-label', T.hungFrame(it.keep.title || ''));
    const slides = seq.map((s, i) => {
      const d = h('div', 'fr-slide' + (i === 0 ? ' on' : ''));
      if (s.text != null) {
        d.appendChild(h('p', 'fr-text', s.text));
      } else {
        const im = h('img', 'fr-img');
        im.src = s.img.src;
        im.alt = s.img.alt || '';
        im.loading = 'lazy';
        d.appendChild(im);
      }
      fr.appendChild(d);
      return d;
    });
    if (slides.length < 2) return;
    let k = 0;
    const turn = () => {
      slides[k].classList.remove('on');
      k = (k + 1) % slides.length;
      slides[k].classList.add('on');
    };
    timers.push(setTimeout(() => { turn(); timers.push(setInterval(turn, STAY_MS)); }, STAY_MS + (slot - 1) * STAGGER_MS));
  }

  // ── 엽서 창 — 벽 위에 뜬다. 화면이 가방으로 내려가지 않는다(「내 방 설계」 §5-A). ──
  let closeNow = null;
  function openLayer(build) {
    if (closeNow) closeNow();
    layer.innerHTML = '';
    const card = h('div', 'pc');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    layer.appendChild(card);
    layer.hidden = false;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const onBack = (e) => { if (e.target === layer) close(); };
    function close() {
      layer.hidden = true;
      layer.innerHTML = '';
      document.removeEventListener('keydown', onKey);
      layer.removeEventListener('click', onBack);
      closeNow = null;
    }
    document.addEventListener('keydown', onKey);
    layer.addEventListener('click', onBack);
    closeNow = close;
    build(card, close);
  }

  async function act(req, warn, go) {
    go.disabled = true;
    let r = null;
    try { r = await callRoom(req); } catch (e) { r = null; }
    if (!r || r.status !== 'ok') {
      warn.textContent = r ? T.failed : T.lost;
      go.disabled = false;
      return false;
    }
    if (closeNow) closeNow();
    await reload();
    return true;
  }

  // 빈 액자를 눌렀을 때(또는 "글을 바꾼다") — 가방 안의 통째 담기만 뜬다.
  function openPick(slot, replacing) {
    openLayer((card, close) => {
      card.appendChild(h('h3', 'pc-title', T.pickTitle));
      const list = wholeInBag();
      if (!list.length) {
        card.appendChild(h('p', 'pc-note', T.pickNone));
      } else {
        const ul = h('ul', 'pc-list');
        list.forEach((it) => {
          const li = h('li');
          const b = btn(it.keep.title || '', () => openLines(slot, it, replacing, false), 'pc-pick');
          b.appendChild(h('span', 'pc-when', dateOf(it.keep.at)));
          li.appendChild(b);
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
      card.appendChild(row(btn(T.back, close)));
    });
  }

  // 글 하나를 골랐을 때(또는 "문장을 바꾼다") — 본문이 펼쳐지고 문장을 누른다.
  // ★손짓은 누르기다. 드래그는 글 페이지의 담기 손짓이라 헷갈리지 않게 갈랐다(발주 ⑥).
  // ★한 번 누르면 한 문장, 최대 다섯. 고른 순서가 아니라 글의 순서대로 건다.
  function openLines(slot, it, replacing, editing) {
    openLayer(async (card, close) => {
      card.appendChild(h('p', 'pc-note', T.loading));
      let src = null;
      try { src = await callRoom({ action: 'frame-source', item_id: it.id }); } catch (e) { src = null; }
      card.innerHTML = '';
      if (!src || src.status !== 'ok') {
        card.appendChild(h('p', 'pc-warn', src ? T.failed : T.lost));
        card.appendChild(row(btn(T.back, close)));
        return;
      }
      card.appendChild(h('h3', 'pc-title', src.title));
      card.appendChild(h('p', 'pc-note', T.linesHint));

      const chosen = new Set(editing ? (src.lines || []) : []);
      const spansOf = new Map();          // 같은 문장이 글에 두 번 나올 수 있다 — 함께 켜고 끈다
      const order = [];
      const count = h('p', 'pc-count', T.linesCount(chosen.size));
      const warn = h('p', 'pc-warn', '');
      const body = h('div', 'pc-body');

      const paint = (sen) => (spansOf.get(sen) || []).forEach((sp) => {
        sp.classList.toggle('on', chosen.has(sen));
        sp.setAttribute('aria-pressed', chosen.has(sen) ? 'true' : 'false');
      });
      const toggle = (sen) => {
        warn.textContent = '';
        if (chosen.has(sen)) chosen.delete(sen);
        else if (chosen.size >= 5) { warn.textContent = T.linesFull; return; }
        else chosen.add(sen);
        paint(sen);
        count.textContent = T.linesCount(chosen.size);
      };

      (src.blocks || []).forEach((ss) => {
        const para = h('p', 'pc-para');
        ss.forEach((sen) => {
          if (!order.includes(sen)) order.push(sen);
          const sp = h('span', 'pc-sen', sen);
          sp.tabIndex = 0;
          sp.setAttribute('role', 'button');
          sp.addEventListener('click', () => toggle(sen));
          sp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(sen); } });
          if (!spansOf.has(sen)) spansOf.set(sen, []);
          spansOf.get(sen).push(sp);
          para.appendChild(sp);
          para.appendChild(document.createTextNode(' '));
        });
        body.appendChild(para);
      });
      spansOf.forEach((_, sen) => paint(sen));

      // 본문 읽는 창은 넓게 — 긴 글이 좁은 기둥으로 흐르지 않게(메뉴 창 폭은 그대로).
      card.classList.add('pc-read');
      card.appendChild(body);
      // ★개수·알림·"건다"는 창 아래에 붙박이로 — 긴 글 끝까지 내려가야 걸 수 있던 것을 푼다.
      //   고르는 동안 몇 개 골랐는지도 늘 보인다. 붙는 것은 CSS(position: sticky)가 한다.
      const foot = h('div', 'pc-foot');
      foot.appendChild(count);
      foot.appendChild(warn);
      const go = btn(editing ? T.save : T.hang, () => {
        const lines = order.filter((s) => chosen.has(s));
        const req = editing
          ? { action: 'reframe', item_id: it.id, lines: lines }
          : { action: 'hang', item_id: it.id, slot: slot, lines: lines, replace_item_id: replacing ? replacing.id : undefined };
        act(req, warn, go);
      }, 'pc-btn pc-go');
      foot.appendChild(row(go, btn(T.back, close)));
      card.appendChild(foot);
    });
  }

  // 걸린 액자를 눌렀을 때 — 본인에게는 두 갈래: 그 글로 가거나, 액자를 바꾸거나(§5-2).
  function openMenu(slot, it) {
    openLayer((card, close) => {
      card.appendChild(h('h3', 'pc-title', it.keep.title || ''));
      const go = h('a', 'pc-btn pc-go', T.goArticle);
      go.href = '/' + it.keep.slug;
      card.appendChild(row(go, btn(T.change, () => openChange(slot, it)), btn(T.back, close)));
    });
  }

  function openChange(slot, it) {
    openLayer((card, close) => {
      card.appendChild(h('h3', 'pc-title', T.change));
      card.appendChild(row(
        btn(T.changeArticle, () => openPick(slot, it)),
        btn(T.changeLines, () => openLines(slot, it, null, true)),
        btn(T.takeDown, () => openDown(it)),
        btn(T.back, close),   // 첫 메뉴처럼 같은 줄에 — 창마다 자리가 다르지 않게
      ));
    });
  }

  // 내리기 — 가방으로 돌아가고 고른 문장은 사라진다. 되돌릴 수 없는 것이 하나 있으니 한 번 묻는다.
  function openDown(it) {
    openLayer((card, close) => {
      card.appendChild(h('p', 'pc-note', T.takeDownAsk));
      const warn = h('p', 'pc-warn', '');
      const go = btn(T.takeDown, () => act({ action: 'unhang', item_id: it.id }, warn, go), 'pc-btn pc-go');
      card.appendChild(warn);
      card.appendChild(row(go, btn(T.back, close)));
    });
  }

  return { render: render };
}

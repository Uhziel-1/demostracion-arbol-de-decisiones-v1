/* 02 · Medir la mezcla de un grupo: Gini y Entropía */
function initS2() {
  const ds = TENNIS;
  const st = { yes: 6, no: 4 };
  const MAX = 12;
  const jar = $('#s2-jar');
  const balls = { yes: [], no: [] };

  function syncBalls(animate = true) {
    ['yes', 'no'].forEach(k => {
      while (balls[k].length < st[k]) {
        const b = h('div', { class: 'ball ' + k });
        if (k === 'yes') jar.insertBefore(b, balls.no[0] || null);
        else jar.append(b);
        balls[k].push(b);
        if (animate) anime({ targets: b, scale: [0, 1], duration: 420, easing: 'easeOutBack' });
      }
      while (balls[k].length > st[k]) {
        const b = balls[k].pop();
        if (animate) anime({ targets: b, scale: 0, opacity: 0, duration: 240, easing: 'easeInQuad', complete: () => b.remove() });
        else b.remove();
      }
    });
  }

  // ---------- gráfico de curvas ----------
  const plot = $('#s2-plot');
  plot.setAttribute('viewBox', '0 0 440 270');
  const PX0 = 46, PX1 = 426, PY0 = 14, PY1 = 230;
  const px = p => PX0 + p * (PX1 - PX0), py = v => PY1 - v * (PY1 - PY0);
  svgEl('rect', { x: PX0, y: PY0, width: PX1 - PX0, height: PY1 - PY0, class: 'plot-bg' }, plot);
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    svgEl('line', { x1: PX0, x2: PX1, y1: py(v), y2: py(v), class: 'gridline' }, plot);
    svgText(plot, PX0 - 8, py(v) + 4, v, 'tick', { 'text-anchor': 'end' });
    svgText(plot, px(v), PY1 + 18, v, 'tick');
  });
  svgText(plot, (PX0 + PX1) / 2, PY1 + 36, 'Proporción de «Sí» en el grupo', 'axis-label');
  const curve = fn => Array.from({ length: 101 }, (_, i) => { const p = i / 100; return `${i ? 'L' : 'M'}${px(p)},${py(fn({ a: p, b: 1 - p }))}`; }).join(' ');
  const gPath = svgEl('path', { d: curve(ML.gini), class: 'curve gini' }, plot);
  const ePath = svgEl('path', { d: curve(ML.entropy), class: 'curve ent' }, plot);
  svgText(plot, px(0.5), py(1) - 4 + 18, 'Entropía', 'curve-label ent');
  svgText(plot, px(0.5), py(0.5) - 8, 'Gini', 'curve-label gini');
  const guide = svgEl('line', { class: 'guide', y1: PY0, y2: PY1 }, plot);
  const mG = svgEl('circle', { r: 6, class: 'marker gini' }, plot);
  const mE = svgEl('circle', { r: 6, class: 'marker ent' }, plot);
  [gPath, ePath].forEach((p, i) => anime({ targets: p, strokeDashoffset: [anime.setDashoffset, 0], duration: 1200, delay: i * 200, easing: 'easeInOutSine' }));

  const elG = $('#s2-gini'), elE = $('#s2-ent');
  let first = true;

  function update() {
    const n = st.yes + st.no;
    $('#s2-yes').textContent = st.yes;
    $('#s2-no').textContent = st.no;
    syncBalls(!first);
    if (!n) {
      elG.textContent = '—'; elE.textContent = '—'; elG._v = 0; elE._v = 0;
      $('#s2-f-gini').innerHTML = 'Grupo vacío.';
      $('#s2-f-ent').innerHTML = '';
      [mG, mE, guide].forEach(e => (e.style.opacity = 0));
      return;
    }
    const p = st.yes / n, q = st.no / n;
    const c = { a: st.yes, b: st.no };
    const g = ML.gini(c), e = ML.entropy(c);
    tweenText(elG, g, 3, first ? 0 : 450);
    tweenText(elE, e, 3, first ? 0 : 450);
    $('#s2-f-gini').innerHTML =
      `Gini = 1 − (${st.yes}/${n})² − (${st.no}/${n})² = 1 − ${(p * p).toFixed(3)} − ${(q * q).toFixed(3)} = <b>${g.toFixed(3)}</b>`;
    const term = (x, k) => (x === 0 ? `0` : `${x.toFixed(2)}·log₂(${x.toFixed(2)})`);
    $('#s2-f-ent').innerHTML = `Entropía = −[${term(p)} + ${term(q)}] = <b>${e.toFixed(3)}</b>`;
    [mG, mE, guide].forEach(el => (el.style.opacity = 1));
    const dur = first ? 0 : 500;
    anime({ targets: mG, cx: px(p), cy: py(g), duration: dur, easing: 'easeOutCubic' });
    anime({ targets: mE, cx: px(p), cy: py(e), duration: dur, easing: 'easeOutCubic' });
    anime({ targets: guide, x1: px(p), x2: px(p), duration: dur, easing: 'easeOutCubic' });
    const msg = g < 1e-12 ? 'Grupo puro: una sola clase. Impureza 0.' :
      Math.abs(p - 0.5) < 1e-9 ? 'Mitad y mitad: la mezcla máxima posible con dos clases.' :
      `Predomina «${p > 0.5 ? 'Sí' : 'No'}», pero el grupo aún está mezclado.`;
    $('#s2-msg').textContent = msg;
    first = false;
  }

  $$('#s2 [data-k]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.k, d = +b.dataset.d;
    st[k] = Math.max(0, Math.min(MAX, st[k] + d));
    update();
  }));
  $$('#s2 [data-p]').forEach(b => b.addEventListener('click', () => {
    const [y, n] = b.dataset.p.split(',').map(Number);
    st.yes = y; st.no = n;
    update();
  }));
  update();
}

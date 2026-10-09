/* 05 · Atributos numéricos: buscar el umbral */
function initS5() {
  const ds = SPAM, rows = ds.train, n = rows.length;
  const sc = Scatter.create($('#s5-plot'));
  const sideL = svgEl('rect', { class: 'side' }, sc.regions);
  const sideR = svgEl('rect', { class: 'side' }, sc.regions);
  Scatter.drawPoints(sc, rows, ds);
  const line = svgEl('line', { class: 'thr-line' }, sc.overlay);
  const res = ML.bestNumericSplit(rows, ds);
  const { X0, X1, Y0, Y1 } = Scatter;
  let f = 'Enlaces', idx = 0, busy = false;
  const swept = {};
  const slider = $('#s5-slider');

  // ---------- gráfico impureza vs umbral ----------
  const ch = $('#s5-chart');
  ch.setAttribute('viewBox', '0 0 484 214');
  const CX0 = 58, CX1 = 470, CY0 = 12, CY1 = 172;
  const cx = v => CX0 + ((v - Scatter.LO) / (Scatter.HI - Scatter.LO)) * (CX1 - CX0);
  const cy = v => CY1 - (v / 0.5) * (CY1 - CY0);
  svgEl('rect', { x: CX0, y: CY0, width: CX1 - CX0, height: CY1 - CY0, class: 'plot-bg' }, ch);
  [0, 0.25, 0.5].forEach(v => {
    svgEl('line', { x1: CX0, x2: CX1, y1: cy(v), y2: cy(v), class: 'gridline' }, ch);
    svgText(ch, CX0 - 8, cy(v) + 4, v, 'tick', { 'text-anchor': 'end' });
  });
  for (let v = 0; v <= 12; v += 2) svgText(ch, cx(v), CY1 + 16, v, 'tick');
  const xLab = svgText(ch, (CX0 + CX1) / 2, CY1 + 36, '', 'axis-label');
  svgText(ch, 0, 0, 'Gini ponderado', 'axis-label', { transform: `translate(14 ${(CY0 + CY1) / 2}) rotate(-90)` });
  const chLine = svgEl('path', { class: 'curve gini' }, ch);
  const chDots = svgEl('g', {}, ch);
  const chBest = svgEl('circle', { class: 'ch-best', r: 9 }, ch);
  const chMark = svgEl('circle', { class: 'ch-mark', r: 6 }, ch);

  const bestOf = feat => res.curves[feat].reduce((b, s, i, a) => (s.weighted < a[b].weighted - 1e-12 ? i : b), 0);

  function drawChart() {
    const c = res.curves[f];
    chLine.setAttribute('d', c.map((s, i) => `${i ? 'L' : 'M'}${cx(s.threshold)},${cy(s.weighted)}`).join(' '));
    anime({ targets: chLine, strokeDashoffset: [anime.setDashoffset, 0], duration: 700, easing: 'easeInOutSine' });
    chDots.innerHTML = '';
    c.forEach(s => svgEl('circle', { cx: cx(s.threshold), cy: cy(s.weighted), r: 2.6, class: 'ch-dot' }, chDots));
    xLab.textContent = `Umbral probado en «${f}»`;
    chBest.style.opacity = swept[f] ? 1 : 0;
    if (swept[f]) { const b = c[bestOf(f)]; chBest.setAttribute('cx', cx(b.threshold)); chBest.setAttribute('cy', cy(b.weighted)); }
  }

  function card(title, list, c) {
    const g = ML.gini(c), maj = ML.majority(c, ds);
    return `<div class="sc-head">${title}</div><div class="sc-n">${list.length} correos</div>
      <div>${countsHtml(c, ds)}</div><div class="mono small">Gini ${g.toFixed(3)} · mayoría <b style="color:${ds.colors[maj]}">${maj}</b></div>`;
  }

  function update() {
    const s = res.curves[f][idx], t = s.threshold;
    if (f === 'Enlaces') {
      const x = Scatter.sx(t);
      Object.entries({ x1: x, x2: x, y1: Y0, y2: Y1 }).forEach(([k, v]) => line.setAttribute(k, v));
      Object.entries({ x: X0, y: Y0, width: x - X0, height: Y1 - Y0 }).forEach(([k, v]) => sideL.setAttribute(k, v));
      Object.entries({ x, y: Y0, width: X1 - x, height: Y1 - Y0 }).forEach(([k, v]) => sideR.setAttribute(k, v));
    } else {
      const y = Scatter.sy(t);
      Object.entries({ x1: X0, x2: X1, y1: y, y2: y }).forEach(([k, v]) => line.setAttribute(k, v));
      Object.entries({ x: X0, y, width: X1 - X0, height: Y1 - y }).forEach(([k, v]) => sideL.setAttribute(k, v));
      Object.entries({ x: X0, y: Y0, width: X1 - X0, height: y - Y0 }).forEach(([k, v]) => sideR.setAttribute(k, v));
    }
    sideL.style.fill = tint(ds.colors[ML.majority(s.cl, ds)], 0.11);
    sideR.style.fill = tint(ds.colors[ML.majority(s.cr, ds)], 0.11);
    $('#s5-thr').textContent = `${f} ≤ ${fmtT(t)}`;
    $('#s5-left').innerHTML = card(`Rama ${f} ≤ ${fmtT(t)}`, s.left, s.cl);
    $('#s5-right').innerHTML = card(`Rama ${f} > ${fmtT(t)}`, s.right, s.cr);
    const gl = ML.gini(s.cl), gr = ML.gini(s.cr);
    $('#s5-formula').innerHTML =
      `Ponderado = ${s.left.length}/${n} × ${gl.toFixed(3)} + ${s.right.length}/${n} × ${gr.toFixed(3)} = <b>${s.weighted.toFixed(3)}</b><br>` +
      `Ganancia = ${res.parentImp.toFixed(3)} − ${s.weighted.toFixed(3)} = <b>${s.gain.toFixed(3)}</b>`;
    chMark.setAttribute('cx', cx(t));
    chMark.setAttribute('cy', cy(s.weighted));
  }

  function renderBest() {
    const box = $('#s5-best');
    const rowsHtml = ds.features.map(feat => {
      if (!swept[feat]) return `<div class="best-row"><span>${feat}</span><span class="muted">sin buscar</span></div>`;
      const b = res.curves[feat][bestOf(feat)];
      return `<div class="best-row"><span>${feat}</span><span class="mono">≤ ${fmtT(b.threshold)} → Gini ${b.weighted.toFixed(3)}</span></div>`;
    }).join('');
    let verdict = '<p class="small muted">Busque el mejor umbral en ambos atributos para compararlos.</p>';
    if (ds.features.every(x => swept[x])) {
      const b = res.best;
      verdict = `<p class="verdict">La primera pregunta del árbol será <b>«${b.feature} ≤ ${fmtT(b.threshold)}»</b>: el corte con menor impureza entre todos los atributos y todos los umbrales.</p>`;
    }
    box.innerHTML = `<div class="best-title">Resultado de la búsqueda</div>${rowsHtml}${verdict}`;
  }

  function setFeature(nf) {
    f = nf;
    $$('#s5-feat button').forEach(b => b.classList.toggle('on', b.dataset.f === f));
    const len = res.curves[f].length;
    slider.max = len - 1;
    idx = Math.floor(len / 3);
    slider.value = idx;
    drawChart();
    update();
    anime({ targets: line, opacity: [0, 1], duration: 400, easing: 'easeOutQuad' });
  }

  async function sweep() {
    if (busy) return;
    busy = true;
    $('#s5-sweep').disabled = true;
    const c = res.curves[f];
    let best = 0;
    chBest.style.opacity = 1;
    const mark = i => { chBest.setAttribute('cx', cx(c[i].threshold)); chBest.setAttribute('cy', cy(c[i].weighted)); };
    const o = { i: 0 };
    idx = 0; update(); mark(0);
    await anime({
      targets: o, i: c.length - 1, duration: c.length * 230, easing: 'linear',
      update: () => {
        const ii = Math.round(o.i);
        if (ii === idx) return;
        idx = ii; slider.value = idx; update();
        if (c[ii].weighted < c[best].weighted - 1e-12) { best = ii; mark(best); }
      },
    }).finished;
    await sleep(250);
    const o2 = { i: idx };
    await anime({ targets: o2, i: best, duration: 700, easing: 'easeInOutQuad', update: () => { idx = Math.round(o2.i); slider.value = idx; update(); } }).finished;
    swept[f] = true;
    anime({ targets: line, strokeWidth: [6, 2.5], duration: 600, easing: 'easeOutQuad' });
    renderBest();
    busy = false;
    $('#s5-sweep').disabled = false;
  }

  slider.addEventListener('input', () => { if (busy) return; idx = +slider.value; update(); });
  $$('#s5-feat button').forEach(b => b.addEventListener('click', () => !busy && setFeature(b.dataset.f)));
  $('#s5-sweep').addEventListener('click', sweep);
  setFeature('Enlaces');
  renderBest();
}

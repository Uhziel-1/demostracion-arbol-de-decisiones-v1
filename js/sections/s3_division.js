/* 03 · Elegir la mejor pregunta */
function initS3() {
  const ds = TENNIS, rows = ds.rows;
  let crit = 'gini', current = null, busy = false;
  const results = {};
  const T = 34, G = 6, TOP = 34;
  const stage = $('#s3-stage');
  const table = $('#s3-table');

  // ---------- tabla de datos ----------
  const cols = ['id', ...ds.features, ds.target];
  const names = ['Día', ...ds.features, ds.target];
  table.innerHTML =
    `<thead><tr>${names.map((n, i) => `<th data-col="${cols[i]}">${n}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(r => `<tr data-id="${r.id}">${cols.map(c =>
      c === ds.target
        ? `<td data-col="${c}"><span class="pill" style="background:${tint(ds.colors[r[c]], 0.14)};color:${ds.colors[r[c]]}">${r[c]}</span></td>`
        : `<td data-col="${c}">${c === 'id' ? 'D' + r.id : r[c]}</td>`).join('')}</tr>`).join('') + '</tbody>';
  const hlRow = (id, on) => table.querySelector(`tr[data-id="${id}"]`).classList.toggle('row-hl', on);
  const hlCol = f => $$('[data-col]', table).forEach(c => c.classList.toggle('col-hl', c.dataset.col === f));

  // ---------- escenario ----------
  const links = svgEl('svg', { class: 'stage-links' }, stage);
  const label = h('div', { class: 'stage-label' });
  stage.append(label);
  const ghosts = rows.map(r => { const g = h('div', { class: 'tok ghost' }, 'D' + r.id); stage.append(g); return g; });
  const toks = {};
  rows.forEach(r => {
    const t = h('div', { class: 'tok', style: `background:${ds.colors[r[ds.target]]}` }, 'D' + r.id);
    t.title = `Día ${r.id}: ${ds.features.map(f => r[f]).join(', ')} → ${r[ds.target]}`;
    t.addEventListener('mouseenter', () => hlRow(r.id, true));
    t.addEventListener('mouseleave', () => hlRow(r.id, false));
    stage.append(t);
    toks[r.id] = t;
  });
  let buckets = [], topBottom = 0;

  function topPositions() {
    const W = stage.clientWidth;
    const per = Math.max(1, Math.floor((W + G) / (T + G))), used = Math.min(per, rows.length);
    const x0 = (W - (used * (T + G) - G)) / 2;
    topBottom = TOP + Math.ceil(rows.length / per) * (T + G);
    return rows.map((r, i) => ({ left: x0 + (i % per) * (T + G), top: TOP + Math.floor(i / per) * (T + G) }));
  }

  function drawTop() {
    const pos = topPositions();
    ghosts.forEach((g, i) => { g.style.left = pos[i].left + 'px'; g.style.top = pos[i].top + 'px'; });
    const c = ML.counts(rows, ds);
    label.innerHTML = `<b>Grupo inicial</b> · ${rows.length} días · ${countsHtml(c, ds)} · ${ML.CRIT_NAME[crit]} <b class="mono">${ML.CRIT[crit](c).toFixed(3)}</b>`;
    return pos;
  }

  function placeTop(animate) {
    const pos = drawTop();
    rows.forEach((r, i) => {
      const t = toks[r.id];
      if (animate) anime({ targets: t, left: pos[i].left, top: pos[i].top, duration: 650, delay: i * 25, easing: 'easeInOutCubic' });
      else { t.style.left = pos[i].left + 'px'; t.style.top = pos[i].top + 'px'; }
    });
    stage.style.height = topBottom + 12 + 'px';
  }

  function split(f, animate = true) {
    current = f;
    const sp = ML.evalCategoricalSplit(rows, f, ds, crit);
    results[f] = sp;
    drawTop();
    const W = stage.clientWidth, k = sp.groups.length, gap = 16, bw = (W - (k - 1) * gap) / k;
    const y0 = topBottom + 56;
    const per = Math.max(1, Math.floor((bw - 20 + G) / (T + G)));
    const maxRows = Math.max(...sp.groups.map(g => Math.ceil(g.n / per)));
    const bh = 40 + maxRows * (T + G) + 44;
    stage.style.height = y0 + bh + 8 + 'px';
    buckets.forEach(b => b.remove());
    buckets = [];
    links.innerHTML = '';
    links.setAttribute('width', W);
    links.setAttribute('height', y0 + bh);
    sp.groups.forEach((g, gi) => {
      const left = gi * (bw + gap);
      const pure = g.impurity < 1e-12;
      const b = h('div', { class: 'bucket' + (pure ? ' pure' : ''), style: `left:${left}px;top:${y0}px;width:${bw}px;height:${bh}px` },
        h('div', { class: 'bucket-head' }, `${f} = ${g.value}`, h('span', { class: 'muted' }, ` · ${g.n} días`)),
        h('div', { class: 'bucket-foot', html: `${countsHtml(g.counts, ds)}<span class="sep">·</span>${ML.CRIT_NAME[crit]} <b class="mono">${g.impurity.toFixed(3)}</b>${pure ? ' <span class="tag">puro</span>' : ''}` }));
      stage.insertBefore(b, ghosts[0]);
      buckets.push(b);
      const cx = left + bw / 2;
      const ln = svgEl('path', { class: 'link', d: `M${W / 2},${topBottom + 2} C${W / 2},${y0 - 18} ${cx},${topBottom + 30} ${cx},${y0}` }, links);
      if (animate) {
        anime({ targets: ln, strokeDashoffset: [anime.setDashoffset, 0], duration: 500, delay: gi * 90, easing: 'easeInOutSine' });
        anime({ targets: b, opacity: [0, 1], translateY: [10, 0], duration: 420, delay: 120 + gi * 90, easing: 'easeOutQuad' });
      }
      g.rows.forEach((r, j) => {
        const L = left + 10 + (j % per) * (T + G), Tp = y0 + 38 + Math.floor(j / per) * (T + G);
        if (animate) anime({ targets: toks[r.id], left: L, top: Tp, duration: 750, delay: 300 + gi * 130 + j * 35, easing: 'easeInOutCubic' });
        else { toks[r.id].style.left = L + 'px'; toks[r.id].style.top = Tp + 'px'; }
      });
    });
    hlCol(f);
    $$('#s3-feats button').forEach(b => b.classList.toggle('on', b.dataset.f === f));
    renderCalc(sp);
    renderBars();
  }

  function renderCalc(sp) {
    const name = ML.CRIT_NAME[crit], n = rows.length;
    let html = `<div class="calc-row head"><span>Grupo inicial (${n} días)</span><span class="mono">${name} = ${sp.parentImp.toFixed(3)}</span></div>`;
    sp.groups.forEach(g => {
      html += `<div class="calc-row"><span>${sp.feature} = ${g.value}</span><span class="mono">${g.n}/${n} × ${g.impurity.toFixed(3)} = ${((g.n / n) * g.impurity).toFixed(3)}</span></div>`;
    });
    html += `<div class="calc-row sum"><span>Impureza ponderada (suma)</span><span class="mono">${sp.weighted.toFixed(3)}</span></div>`;
    html += `<div class="calc-row gain"><span>Ganancia = antes − después</span><span class="mono">${sp.parentImp.toFixed(3)} − ${sp.weighted.toFixed(3)} = <b>${sp.gain.toFixed(3)}</b></span></div>`;
    html += `<p class="small muted">Cada grupo pesa según la fracción de días que contiene (n<sub>grupo</sub>/n).</p>`;
    const calc = $('#s3-calc');
    calc.innerHTML = html;
    anime({ targets: calc.children, opacity: [0, 1], translateX: [-6, 0], delay: anime.stagger(80, { start: 500 }), duration: 320, easing: 'easeOutQuad' });
  }

  function renderBars() {
    const box = $('#s3-bars');
    box.innerHTML = '';
    const tested = ds.features.filter(f => results[f]);
    const all = tested.length === ds.features.length;
    const best = all ? tested.reduce((a, b) => (results[b].gain > results[a].gain ? b : a)) : null;
    const maxG = ML.CRIT[crit](ML.counts(rows, ds));
    ds.features.forEach(f => {
      const r = results[f];
      const fill = h('div', { class: 'bar-fill' });
      const row = h('div', { class: 'bar-row' + (f === best ? ' best' : '') + (f === current ? ' cur' : '') },
        h('span', { class: 'bar-name' }, f), h('div', { class: 'bar-track' }, fill),
        h('span', { class: 'bar-val mono' }, r ? r.gain.toFixed(3) : 'sin probar'));
      box.append(row);
      if (r) anime({ targets: fill, width: ['0%', (r.gain / maxG) * 100 + '%'], duration: 650, easing: 'easeOutCubic' });
    });
    $('#s3-verdict').innerHTML = best
      ? `Mayor ganancia: <b>${best}</b>. Es la pregunta que el algoritmo coloca en la raíz del árbol.`
      : `Falta probar ${ds.features.length - tested.length} de ${ds.features.length} atributos.`;
  }

  // ---------- controles ----------
  const feats = $('#s3-feats');
  ds.features.forEach(f => feats.append(h('button', { 'data-f': f, onclick: () => !busy && split(f) }, f)));
  $$('#s3-crit button').forEach(b => b.addEventListener('click', () => {
    crit = b.dataset.c;
    $$('#s3-crit button').forEach(x => x.classList.toggle('on', x === b));
    Object.keys(results).forEach(f => (results[f] = ML.evalCategoricalSplit(rows, f, ds, crit)));
    if (current) split(current, false); else { placeTop(false); renderBars(); }
  }));
  $('#s3-all').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    for (const f of ds.features) { split(f); await sleep(2100); }
    busy = false;
  });
  $('#s3-reset').addEventListener('click', () => {
    if (busy) return;
    current = null;
    buckets.forEach(b => b.remove()); buckets = [];
    links.innerHTML = '';
    hlCol(null);
    $$('#s3-feats button').forEach(b => b.classList.remove('on'));
    placeTop(true);
    $('#s3-calc').innerHTML = '<p class="muted">Seleccione un atributo para separar los 14 días.</p>';
    renderBars();
  });

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => (current ? split(current, false) : placeTop(false)), 150);
  });

  placeTop(false);
  renderBars();
}

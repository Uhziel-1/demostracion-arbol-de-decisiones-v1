/* 04 · Construir el árbol paso a paso */
function initS4() {
  const ds = TENNIS;
  const refSig = ML.signature(ML.buildCategorical(ds, 'gini'));
  let crit = 'gini', tree, order, idxOf, parentOf, byId, k, prev = new Map(), busy = false;
  const svg = $('#s4-tree'), info = $('#s4-info'), count = $('#s4-count');
  const container = $('#s4-tree-container');
  let zoomCtrl = null;

  function stateOf(n) {
    const i = idxOf.get(n.id);
    if (i <= k) return 'decided';
    const p = parentOf.get(n.id);
    if (!p) return 'pending';
    return idxOf.get(p.id) <= k ? 'pending' : 'hidden';
  }

  function draw() {
    const view = TreeView.render(svg, tree, ds, {
      state: stateOf,
      critName: ML.CRIT_NAME[crit],
      nodeW: 168,
      nodeH: 68,
      gapX: 28,
      gapY: 62
    });

    if (!zoomCtrl && container) {
      zoomCtrl = TreeView.enableZoomPan(container, svg, {
        onZoom: scale => {
          const zoomLabel = $('#s4-zoom-level');
          if (zoomLabel) zoomLabel.textContent = `${Math.round(scale * 100)}%`;
        }
      });
    }

    view.nodes.forEach((g, id) => {
      const st = stateOf(byId.get(id));
      const before = prev.get(id);
      if (!before) anime({ targets: g, opacity: [0, 1], duration: 450, delay: 250, easing: 'easeOutQuad' });
      else if (before !== st) anime({ targets: g, opacity: [0.25, 1], duration: 500, easing: 'easeOutQuad' });
    });
    view.edges.forEach((e, id) => {
      if (prev.has(id)) return;
      anime({ targets: e.path, strokeDashoffset: [anime.setDashoffset, 0], duration: 450, easing: 'easeInOutSine' });
      anime({ targets: e.label, opacity: [0, 1], duration: 300, delay: 300, easing: 'linear' });
    });
    if (k >= 0) view.nodes.get(order[k].id).classList.add('current');
    prev = new Map(order.filter(n => stateOf(n) !== 'hidden').map(n => [n.id, stateOf(n)]));
    count.textContent = `Paso ${Math.max(k + 1, 0)} de ${order.length}`;
    $('#s4-next').disabled = busy || k >= order.length - 1;
  }

  function intro() {
    info.innerHTML = `
      <div class="info-step">Inicio</div>
      <p class="info-msg">El árbol empieza con un único nodo que contiene los <b>${ds.rows.length}</b> días: ${countsHtml(ML.counts(ds.rows, ds), ds)}.</p>
      <p class="info-msg muted">En cada paso se decide un nodo: o se divide con el atributo de mayor ganancia, o se convierte en hoja.</p>`;
  }

  function explain(n) {
    const name = ML.CRIT_NAME[crit];
    const where = n.path.length ? n.path.map(p => `<span class="pathchip">${p}</span>`).join('') : '<span class="pathchip">Raíz: todos los datos</span>';
    let html = `<div class="info-step">Paso ${k + 1}</div><div class="info-where">${where}</div>
      <div class="info-line">${n.samples} días · ${countsHtml(n.counts, ds)} · ${name} <b class="mono">${n.impurity.toFixed(3)}</b></div>`;
    if (n.leaf) {
      const col = ds.colors[n.prediction];
      const pred = `<b style="color:${col}">${n.prediction}</b>`;
      html += `<p class="info-msg">${n.reason === 'pure'
        ? `Todos los días de este nodo tienen la misma clase. El nodo es <b>puro</b> y se convierte en hoja: predice ${pred}.`
        : n.reason === 'nofeatures'
          ? `No quedan atributos por usar. Se convierte en hoja con la clase mayoritaria: ${pred}.`
          : `Ningún atributo reduce la impureza. Se convierte en hoja con la clase mayoritaria: ${pred}.`}</p>`;
    } else {
      const cands = [...n.candidates].sort((a, b) => b.gain - a.gain);
      html += `<table class="cand"><thead><tr><th>Atributo</th><th>${name} ponderada</th><th>Ganancia</th></tr></thead><tbody>${cands.map(c => `
        <tr class="${c.feature === n.feature ? 'best' : ''}"><td>${c.feature}</td><td class="mono">${c.weighted.toFixed(3)}</td>
        <td><div class="minibar"><i style="width:${n.impurity ? (c.gain / n.impurity) * 100 : 0}%"></i></div><span class="mono">${c.gain.toFixed(3)}</span></td></tr>`).join('')}</tbody></table>
        <p class="info-msg">Se divide por <b>${n.feature}</b>. Se crean ${n.children.length} ramas (${n.children.map(c => c.label).join(', ')}); cada una continúa solo con sus días.</p>`;
    }
    if (k === order.length - 1) {
      const used = new Set(order.filter(x => !x.leaf).map(x => x.feature));
      const unused = ds.features.filter(f => !used.has(f));
      const same = ML.signature(tree) === refSig;
      html += `<p class="info-done">Árbol terminado: ${ML.leaves(tree).length} hojas, profundidad ${ML.maxDepth(tree)}.
        ${unused.length ? `Atributos nunca elegidos: <b>${unused.join(', ')}</b>.` : ''}
        ${same ? 'Es el mismo árbol utilizado en la sección 01.' : ''}</p>`;
    }
    info.innerHTML = html;
    anime({ targets: info.children, opacity: [0, 1], translateY: [6, 0], delay: anime.stagger(70), duration: 340, easing: 'easeOutQuad' });
  }

  function reset() {
    tree = ML.buildCategorical(ds, crit);
    order = ML.bfs(tree);
    idxOf = new Map(order.map((n, i) => [n.id, i]));
    byId = new Map(order.map(n => [n.id, n]));
    parentOf = ML.parents(tree);
    k = -1;
    prev = new Map();
    draw();
    intro();
  }

  function step() {
    if (k >= order.length - 1) return;
    k++;
    draw();
    explain(order[k]);
  }

  const btnZoomIn = $('#s4-zoom-in');
  const btnZoomOut = $('#s4-zoom-out');
  const btnZoomReset = $('#s4-zoom-reset');
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => zoomCtrl && zoomCtrl.zoomIn());
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => zoomCtrl && zoomCtrl.zoomOut());
  if (btnZoomReset) btnZoomReset.addEventListener('click', () => zoomCtrl && zoomCtrl.reset());

  $('#s4-next').addEventListener('click', () => !busy && step());
  $('#s4-all').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    if (k >= order.length - 1) reset();
    while (k < order.length - 1) { step(); await sleep(1100); }
    busy = false;
    draw();
  });
  $('#s4-reset').addEventListener('click', () => !busy && reset());
  $$('#s4-crit button').forEach(b => b.addEventListener('click', () => {
    if (busy) return;
    crit = b.dataset.c;
    $$('#s4-crit button').forEach(x => x.classList.toggle('on', x === b));
    reset();
  }));
  reset();
}

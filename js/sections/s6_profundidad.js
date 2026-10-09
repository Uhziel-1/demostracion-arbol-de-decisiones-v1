/* 06 · Profundidad y sobreajuste */
function initS6() {
  const ds = SPAM;
  const sc = Scatter.create($('#s6-plot'));
  Scatter.drawPoints(sc, ds.train, ds);
  const testPts = Scatter.drawPoints(sc, ds.test, ds, { test: true });
  testPts.forEach(p => (p.style.display = 'none'));

  const DMAX = 8, trees = {}, stats = [];
  for (let d = 1; d <= DMAX; d++) {
    const t = ML.buildNumeric(ds, ds.train, d);
    trees[d] = t;
    const allNodes = ML.bfs(t);
    stats.push({
      d,
      train: ML.accuracy(t, ds.train, ds),
      test: ML.accuracy(t, ds.test, ds),
      leaves: ML.leaves(t).length,
      totalNodes: allNodes.length,
      real: ML.maxDepth(t)
    });
  }
  const bestD = stats.reduce((a, b) => (b.test > a.test + 1e-12 ? b : a)).d;
  window.SPAM_BEST_DEPTH = bestD;

  // ---------- gráfico exactitud vs profundidad ----------
  const ch = $('#s6-chart');
  ch.setAttribute('viewBox', '0 0 484 230');
  const CX0 = 52, CX1 = 466, CY0 = 14, CY1 = 182, YLO = 0.5;
  const cx = d => CX0 + ((d - 1) / (DMAX - 1)) * (CX1 - CX0);
  const cy = v => CY1 - ((v - YLO) / (1 - YLO)) * (CY1 - CY0);
  svgEl('rect', { x: CX0 - 14, y: CY0, width: CX1 - CX0 + 28, height: CY1 - CY0, class: 'plot-bg' }, ch);
  const band = svgEl('rect', { class: 'band', y: CY0, height: CY1 - CY0, width: 36 }, ch);
  [0.5, 0.6, 0.7, 0.8, 0.9, 1].forEach(v => {
    svgEl('line', { x1: CX0 - 14, x2: CX1 + 14, y1: cy(v), y2: cy(v), class: 'gridline' }, ch);
    svgText(ch, CX0 - 20, cy(v) + 4, Math.round(v * 100) + '%', 'tick', { 'text-anchor': 'end' });
  });
  for (let d = 1; d <= DMAX; d++) svgText(ch, cx(d), CY1 + 16, d, 'tick');
  svgText(ch, (CX0 + CX1) / 2, CY1 + 38, 'Profundidad máxima', 'axis-label');
  [['train', 'acc-train'], ['test', 'acc-test']].forEach(([key, cls], i) => {
    const p = svgEl('path', { class: 'curve ' + cls, d: stats.map((s, j) => `${j ? 'L' : 'M'}${cx(s.d)},${cy(s[key])}`).join(' ') }, ch);
    anime({ targets: p, strokeDashoffset: [anime.setDashoffset, 0], duration: 1100, delay: i * 250, easing: 'easeInOutSine' });
    stats.forEach(s => svgEl('circle', { cx: cx(s.d), cy: cy(s[key]), r: 3.5, class: 'dot ' + cls }, ch));
  });

  const treeSvg = $('#s6-tree');
  const treeContainer = $('#s6-tree-container');
  let zoomCtrl = null;
  let lastDepth = 1;

  function show(d) {
    const t = trees[d], s = stats[d - 1];
    $('#s6-d').textContent = d;

    // Regiones (una por hoja)
    sc.regions.innerHTML = '';
    ML.leaves(t).forEach(lf => {
      const b = lf.bounds;
      const r = svgEl('rect', {
        x: Scatter.sx(b.Enlaces[0]), y: Scatter.sy(b.Exclamaciones[1]),
        width: Scatter.sx(b.Enlaces[1]) - Scatter.sx(b.Enlaces[0]),
        height: Scatter.sy(b.Exclamaciones[0]) - Scatter.sy(b.Exclamaciones[1]),
      }, sc.regions);
      r.style.fill = tint(ds.colors[lf.prediction], 0.17);
    });
    anime({ targets: [...sc.regions.children], opacity: [0, 1], duration: 400, delay: anime.stagger(14), easing: 'easeOutQuad' });

    // Líneas de corte (una por nodo interno)
    sc.lines.innerHTML = '';
    ML.bfs(t).filter(n => !n.leaf).forEach(n => {
      const b = n.bounds, v = n.threshold;
      const a = n.feature === 'Enlaces'
        ? { x1: Scatter.sx(v), x2: Scatter.sx(v), y1: Scatter.sy(b.Exclamaciones[0]), y2: Scatter.sy(b.Exclamaciones[1]) }
        : { x1: Scatter.sx(b.Enlaces[0]), x2: Scatter.sx(b.Enlaces[1]), y1: Scatter.sy(v), y2: Scatter.sy(v) };
      const ln = svgEl('line', { ...a, class: 'cut' + (n.depth === 0 ? ' root' : '') }, sc.lines);
      anime({ targets: ln, strokeDashoffset: [anime.setDashoffset, 0], duration: 400, delay: n.depth * 100, easing: 'easeInOutSine' });
    });

    // Render del árbol con ajuste compacto inteligente
    const isDeep = d >= 5;
    const view = TreeView.render(treeSvg, t, ds, {
      compact: isDeep || s.leaves > 5,
      nodeW: isDeep ? 136 : (s.leaves > 4 ? 150 : 180),
      nodeH: isDeep ? 48 : (s.leaves > 4 ? 54 : 68),
      gapX: isDeep ? 14 : 24,
      gapY: isDeep ? 44 : 60
    });

    // Inicializar o resetear Pan & Zoom
    if (!zoomCtrl) {
      zoomCtrl = TreeView.enableZoomPan(treeContainer, treeSvg, {
        onZoom: scale => {
          const zoomLabel = $('#s6-zoom-level');
          if (zoomLabel) zoomLabel.textContent = `${Math.round(scale * 100)}%`;
        }
      });
    }

    // Animar nodos nuevos cuando se incrementa la profundidad
    if (d > lastDepth) {
      const newNodes = ML.bfs(t).filter(n => n.depth === d || (n.depth === d - 1 && !n.leaf));
      const newElements = newNodes.map(n => view.nodes.get(n.id)).filter(Boolean);
      if (newElements.length) {
        anime({
          targets: newElements,
          scale: [0.65, 1],
          opacity: [0, 1],
          duration: 480,
          delay: anime.stagger(40),
          easing: 'easeOutBack'
        });
      }
    } else {
      anime({ targets: treeSvg, opacity: [0.35, 1], duration: 350, easing: 'easeOutQuad' });
    }
    lastDepth = d;

    // Métricas
    tweenText($('#s6-train'), s.train * 100, 1, 400, '%');
    tweenText($('#s6-test'), s.test * 100, 1, 400, '%');
    $('#s6-leaves').textContent = s.leaves;
    if ($('#s6-node-count')) $('#s6-node-count').textContent = s.totalNodes;
    anime({ targets: band, x: cx(d) - 18, duration: 380, easing: 'easeOutCubic' });

    let msg;
    if (d < bestD) {
      msg = `Profundidad ${d}: El modelo es demasiado simple (subajuste). Aún no aprende las fronteras reales entre Spam y Normal.`;
    } else if (d === bestD) {
      msg = `Profundidad ${d}: Punto óptimo de equilibrio (Trade-off sesgo/varianza). Alcanza la máxima exactitud en prueba (${pct(s.test)}).`;
    } else {
      msg = `Profundidad ${d}: ¡Sobreajuste evidente! La exactitud en entrenamiento llega a ${pct(s.train)}, pero en prueba cae a ${pct(s.test)}. Las nuevas ramas memorizan ruido y casos aislados sin generalizar.`;
    }
    if (s.real < d) {
      msg += ` (El crecimiento se detuvo en profundidad ${s.real} porque ninguna hoja adicional produjo ganancia).`;
    }
    $('#s6-msg').textContent = msg;
  }

  // Controles de zoom dedicados
  const btnZoomIn = $('#s6-zoom-in');
  const btnZoomOut = $('#s6-zoom-out');
  const btnZoomReset = $('#s6-zoom-reset');
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => zoomCtrl && zoomCtrl.zoomIn());
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => zoomCtrl && zoomCtrl.zoomOut());
  if (btnZoomReset) btnZoomReset.addEventListener('click', () => zoomCtrl && zoomCtrl.reset());

  const slider = $('#s6-depth');
  slider.addEventListener('input', () => show(+slider.value));
  $('#s6-test-toggle').addEventListener('change', e => {
    testPts.forEach(p => (p.style.display = e.target.checked ? '' : 'none'));
    if (e.target.checked) anime({ targets: testPts, r: [0, 5], duration: 400, delay: anime.stagger(12), easing: 'easeOutBack' });
  });

  show(1);
}

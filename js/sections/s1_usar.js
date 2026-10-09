/* 01 · Usar un árbol ya construido */
function initS1() {
  const ds = TENNIS;
  const tree = ML.buildCategorical(ds, 'gini');
  const form = $('#s1-form');
  const selects = {};
  const defaults = { Cielo: 'Soleado', Temperatura: 'Templado', Humedad: 'Alta', Viento: 'Fuerte' };
  ds.features.forEach(f => {
    const sel = h('select', {}, ds.domain[f].map(v => h('option', { value: v }, v)));
    sel.value = defaults[f];
    selects[f] = sel;
    form.append(h('label', { class: 'field' }, h('span', {}, f), sel));
  });

  const svg = $('#s1-tree');
  const container = $('#s1-tree-container');
  let view = TreeView.render(svg, tree, ds, {
    nodeW: 176,
    nodeH: 78,
    gapX: 30,
    gapY: 70
  });

  const zoomCtrl = TreeView.enableZoomPan(container, svg, {
    onZoom: scale => {
      const zoomLabel = $('#s1-zoom-level');
      if (zoomLabel) zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    }
  });

  const btnZoomIn = $('#s1-zoom-in');
  const btnZoomOut = $('#s1-zoom-out');
  const btnZoomReset = $('#s1-zoom-reset');
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => zoomCtrl.zoomIn());
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => zoomCtrl.zoomOut());
  if (btnZoomReset) btnZoomReset.addEventListener('click', () => zoomCtrl.reset());

  const trace = $('#s1-trace'), result = $('#s1-result');
  let busy = false;

  async function run() {
    if (busy) return;
    busy = true;
    $('#s1-run').disabled = true;
    const row = {};
    ds.features.forEach(f => (row[f] = selects[f].value));

    // Render manteniendo posición base
    view = TreeView.render(svg, tree, ds, {
      nodeW: 176,
      nodeH: 78,
      gapX: 30,
      gapY: 70
    });

    trace.innerHTML = '';
    result.innerHTML = '';
    const p = ML.path(tree, row);
    await TreeView.travel(view, p, {
      stepMs: 650,
      onNode: n => {
        if (n.leaf) return;
        const li = h('li', {}, h('span', { class: 'q' }, `¿${n.feature}?`), h('span', { class: 'a' }, row[n.feature]));
        trace.append(li);
        anime({ targets: li, opacity: [0, 1], translateX: [-8, 0], duration: 300, easing: 'easeOutQuad' });
      },
    });
    const leaf = p.at(-1);
    const col = ds.colors[leaf.prediction];
    const used = p.filter(n => !n.leaf).map(n => n.feature);
    const unused = ds.features.filter(f => !used.includes(f));
    result.innerHTML = `
      <div class="pred" style="border-color:${col}">
        <span>Predicción</span><b style="color:${col}">${leaf.prediction}</b>
      </div>
      <p class="small">La hoja se formó con <b>${leaf.samples}</b> días de entrenamiento: ${countsHtml(leaf.counts, ds)}.</p>
      ${unused.length ? `<p class="small muted">Atributos no consultados: <b>${unused.join(', ')}</b>. Este caso se resolvió sin ellos.</p>` : ''}`;
    anime({ targets: result.children, opacity: [0, 1], translateY: [8, 0], delay: anime.stagger(90), duration: 380, easing: 'easeOutQuad' });
    busy = false;
    $('#s1-run').disabled = false;
  }

  $('#s1-run').addEventListener('click', run);
  $('#s1-random').addEventListener('click', () => {
    ds.features.forEach(f => {
      const d = ds.domain[f];
      selects[f].value = d[Math.floor(Math.random() * d.length)];
      anime({
        targets: selects[f],
        backgroundColor: ['#1e3a5f', '#0f172a'],
        borderColor: ['#38bdf8', '#2b3952'],
        duration: 500,
        easing: 'easeOutQuad'
      });
    });
  });
}

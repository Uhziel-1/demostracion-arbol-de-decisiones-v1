/* 07 · Evaluación y Matriz de Confusión */
function initS7() {
  const ds = SPAM;
  const posClass = ds.positive; // 'Spam'
  const negClass = ds.classes.find(c => c !== posClass); // 'Normal'
  const testRows = ds.test;
  const nTotal = testRows.length;

  let currentDepth = window.SPAM_BEST_DEPTH || 3;
  let activeFilter = 'all'; // 'all', 'tp', 'fp', 'fn', 'tn'
  let isEvaluating = false;

  const sc = Scatter.create($('#s7-plot'));
  // En este scatter dibujamos las regiones de decisión del árbol seleccionado
  // y encima los puntos del conjunto de prueba.
  let pointsElements = [];

  function getModel(depth) {
    return ML.buildNumeric(ds, ds.train, depth);
  }

  function evaluateDataset(tree) {
    const results = testRows.map(r => {
      const pred = ML.predict(tree, r);
      let cat = '';
      if (r.Clase === posClass && pred === posClass) cat = 'tp';
      else if (r.Clase === negClass && pred === posClass) cat = 'fp';
      else if (r.Clase === posClass && pred === negClass) cat = 'fn';
      else if (r.Clase === negClass && pred === negClass) cat = 'tn';
      return { ...r, pred, cat, correct: pred === r.Clase };
    });

    const tp = results.filter(r => r.cat === 'tp').length;
    const fp = results.filter(r => r.cat === 'fp').length;
    const fn = results.filter(r => r.cat === 'fn').length;
    const tn = results.filter(r => r.cat === 'tn').length;

    const acc = (tp + tn) / nTotal;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const specificity = (tn + fp) > 0 ? tn / (tn + fp) : 0;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return { results, tp, fp, fn, tn, acc, precision, recall, specificity, f1 };
  }

  function renderDecisionRegions(tree) {
    sc.regions.innerHTML = '';
    ML.leaves(tree).forEach(lf => {
      const b = lf.bounds;
      const r = svgEl('rect', {
        x: Scatter.sx(b.Enlaces[0]),
        y: Scatter.sy(b.Exclamaciones[1]),
        width: Scatter.sx(b.Enlaces[1]) - Scatter.sx(b.Enlaces[0]),
        height: Scatter.sy(b.Exclamaciones[0]) - Scatter.sy(b.Exclamaciones[1]),
      }, sc.regions);
      r.style.fill = tint(ds.colors[lf.prediction], 0.16);
    });

    sc.lines.innerHTML = '';
    ML.bfs(tree).filter(n => !n.leaf).forEach(n => {
      const b = n.bounds, v = n.threshold;
      const a = n.feature === 'Enlaces'
        ? { x1: Scatter.sx(v), x2: Scatter.sx(v), y1: Scatter.sy(b.Exclamaciones[0]), y2: Scatter.sy(b.Exclamaciones[1]) }
        : { x1: Scatter.sx(b.Enlaces[0]), x2: Scatter.sx(b.Enlaces[1]), y1: Scatter.sy(v), y2: Scatter.sy(v) };
      svgEl('line', { ...a, class: 'cut' + (n.depth === 0 ? ' root' : '') }, sc.lines);
    });
  }

  function renderPoints(evalData) {
    sc.points.innerHTML = '';
    pointsElements = evalData.results.map(r => {
      const isFiltered = activeFilter === 'all' || r.cat === activeFilter;
      const c = svgEl('circle', {
        cx: Scatter.sx(r.Enlaces + r.jx),
        cy: Scatter.sy(r.Exclamaciones + r.jy),
        r: r.correct ? 5.5 : 7,
        class: `pt s7-pt ${r.cat} ${r.correct ? 'correct' : 'error'} ${isFiltered ? '' : 'dimmed'}`
      }, sc.points);

      c.style.fill = ds.colors[r.Clase];
      c.style.stroke = r.correct ? '#ffffff' : '#ffea00';
      c.style.strokeWidth = r.correct ? '1.5px' : '2.8px';

      const t = svgEl('title', {}, c);
      t.textContent = `Correo ${r.id}: ${r.Enlaces} enlaces, ${r.Exclamaciones} exclamaciones | Real: ${r.Clase} | Predicho: ${r.pred} (${r.cat.toUpperCase()})`;

      c.addEventListener('mouseenter', () => highlightItem(r.id, true));
      c.addEventListener('mouseleave', () => highlightItem(r.id, false));
      return { el: c, data: r };
    });
  }

  function highlightItem(id, on) {
    const row = $(`#s7-table tr[data-id="${id}"]`);
    if (row) {
      row.classList.toggle('row-hl', on);
      if (on) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function renderMatrix(evalData) {
    const { tp, fp, fn, tn } = evalData;

    $('#s7-tp').textContent = tp;
    $('#s7-fp').textContent = fp;
    $('#s7-fn').textContent = fn;
    $('#s7-tn').textContent = tn;

    // Actualizar sumas marginales
    $('#s7-sum-real-pos').textContent = tp + fn;
    $('#s7-sum-real-neg').textContent = fp + tn;
    $('#s7-sum-pred-pos').textContent = tp + fp;
    $('#s7-sum-pred-neg').textContent = fn + tn;
    $('#s7-sum-total').textContent = nTotal;

    // Clases activas según filtro
    $$('#s7-matrix .matrix-cell').forEach(c => {
      const type = c.dataset.cat;
      c.classList.toggle('active', activeFilter === type);
    });
  }

  function renderMetrics(evalData) {
    const { tp, fp, fn, tn, acc, precision, recall, specificity, f1 } = evalData;

    tweenText($('#s7-acc-val'), acc * 100, 1, 400, '%');
    tweenText($('#s7-prec-val'), precision * 100, 1, 400, '%');
    tweenText($('#s7-rec-val'), recall * 100, 1, 400, '%');
    tweenText($('#s7-f1-val'), f1, 3, 400);

    $('#s7-acc-calc').innerHTML = `<span class="mono">(${tp} + ${tn}) / ${nTotal} = <b>${acc.toFixed(3)}</b> (${pct(acc)})</span>`;
    $('#s7-prec-calc').innerHTML = `<span class="mono">${tp} / (${tp} + ${fp}) = <b>${precision.toFixed(3)}</b> (${pct(precision)})</span>`;
    $('#s7-rec-calc').innerHTML = `<span class="mono">${tp} / (${tp} + ${fn}) = <b>${recall.toFixed(3)}</b> (${pct(recall)})</span>`;
    $('#s7-f1-calc').innerHTML = `<span class="mono">2 &times; (${precision.toFixed(2)} &times; ${recall.toFixed(2)}) / (${precision.toFixed(2)} + ${recall.toFixed(2)}) = <b>${f1.toFixed(3)}</b></span>`;

    // Diagnóstico
    let diag = '';
    if (fp > 0 && fn > 0) {
      diag = `El modelo comete ambos tipos de error: clasificó erróneamente <b>${fp}</b> correos legítimos como Spam (Falsos Positivos) y dejó pasar <b>${fn}</b> correos Spam a la bandeja (Falsos Negativos).`;
    } else if (fp === 0 && fn > 0) {
      diag = `El modelo tiene <b>100% de precisión</b> (sin falsas alarmas), pero se le escapan <b>${fn}</b> correos no deseados (sensibilidad ${pct(recall)}).`;
    } else if (fn === 0 && fp > 0) {
      diag = `El modelo capturó todo el Spam (<b>100% de sensibilidad</b>), pero clasificó por error <b>${fp}</b> correos importantes como Spam.`;
    } else {
      diag = `Clasificación perfecta sobre este conjunto de prueba.`;
    }
    $('#s7-diagnostic').innerHTML = diag;
  }

  function renderTable(evalData) {
    const tbody = $('#s7-table tbody');
    const filtered = evalData.results.filter(r => activeFilter === 'all' || r.cat === activeFilter);

    tbody.innerHTML = filtered.map(r => {
      const catClass = r.correct ? 'badge-ok' : 'badge-err';
      const catLabel = r.cat.toUpperCase();
      const catTitle = {
        'TP': 'Verdadero Positivo (Spam acertado)',
        'TN': 'Verdadero Negativo (Normal acertado)',
        'FP': 'Falso Positivo (Normal clasificado como Spam)',
        'FN': 'Falso Negativo (Spam que no se detectó)'
      }[catLabel];

      return `<tr data-id="${r.id}" class="${r.correct ? '' : 'tr-error'}">
        <td><b>${r.id}</b></td>
        <td class="mono">${r.Enlaces}</td>
        <td class="mono">${r.Exclamaciones}</td>
        <td><span class="pill" style="background:${tint(ds.colors[r.Clase], 0.15)};color:${ds.colors[r.Clase]}">${r.Clase}</span></td>
        <td><span class="pill" style="background:${tint(ds.colors[r.pred], 0.15)};color:${ds.colors[r.pred]}">${r.pred}</span></td>
        <td><span class="status-badge ${catClass}" title="${catTitle}">${catLabel}</span></td>
      </tr>`;
    }).join('');

    $('#s7-filter-count').textContent = `Mostrando ${filtered.length} de ${nTotal} correos de prueba.`;
  }

  function refresh() {
    const tree = getModel(currentDepth);
    renderDecisionRegions(tree);
    const evalData = evaluateDataset(tree);
    renderPoints(evalData);
    renderMatrix(evalData);
    renderMetrics(evalData);
    renderTable(evalData);
  }

  // Filtrado por cuadrante al hacer clic en la matriz
  $$('#s7-matrix .matrix-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const cat = cell.dataset.cat;
      if (activeFilter === cat) {
        activeFilter = 'all';
      } else {
        activeFilter = cat;
      }
      refresh();
    });
  });

  $('#s7-btn-filter-all').addEventListener('click', () => {
    activeFilter = 'all';
    refresh();
  });

  const depthSlider = $('#s7-depth-select');
  depthSlider.addEventListener('input', () => {
    currentDepth = +depthSlider.value;
    $('#s7-current-depth').textContent = currentDepth;
    refresh();
  });

  // Animación: Clasificar en lote
  $('#s7-btn-animate').addEventListener('click', async () => {
    if (isEvaluating) return;
    isEvaluating = true;
    $('#s7-btn-animate').disabled = true;

    activeFilter = 'all';
    refresh();

    const tree = getModel(currentDepth);
    const evalData = evaluateDataset(tree);

    // Reiniciamos temporalmente visualizadores
    let curTP = 0, curFP = 0, curFN = 0, curTN = 0;
    $('#s7-tp').textContent = '0';
    $('#s7-fp').textContent = '0';
    $('#s7-fn').textContent = '0';
    $('#s7-tn').textContent = '0';

    for (let i = 0; i < evalData.results.length; i++) {
      const item = evalData.results[i];
      const ptObj = pointsElements[i];

      // Destacar punto
      anime({
        targets: ptObj.el,
        r: [12, item.correct ? 5.5 : 7],
        duration: 250,
        easing: 'easeOutBack'
      });

      if (item.cat === 'tp') curTP++;
      else if (item.cat === 'fp') curFP++;
      else if (item.cat === 'fn') curFN++;
      else if (item.cat === 'tn') curTN++;

      $('#s7-tp').textContent = curTP;
      $('#s7-fp').textContent = curFP;
      $('#s7-fn').textContent = curFN;
      $('#s7-tn').textContent = curTN;

      // Destacar celda momentáneamente
      const cell = $(`#s7-matrix .matrix-cell[data-cat="${item.cat}"]`);
      cell.classList.add('pulse');
      setTimeout(() => cell.classList.remove('pulse'), 200);

      await sleep(70);
    }

    renderMetrics(evalData);
    isEvaluating = false;
    $('#s7-btn-animate').disabled = false;
  });

  refresh();
}

/* ============================================================
   Dibujo de árboles en SVG + animación del recorrido (token)
   + Soporte interactivo de Pan & Zoom fluido
   ============================================================ */
const TreeView = (() => {
  function layout(root) {
    let slot = 0, maxDepth = 0;
    const pos = new Map();
    (function walk(n) {
      maxDepth = Math.max(maxDepth, n.depth);
      if (n.leaf || !n.children.length) { pos.set(n.id, { slot: slot++, depth: n.depth }); return; }
      n.children.forEach(c => walk(c.node));
      const xs = n.children.map(c => pos.get(c.node.id).slot);
      pos.set(n.id, { slot: (xs[0] + xs[xs.length - 1]) / 2, depth: n.depth });
    })(root);
    return { pos, slots: slot, maxDepth };
  }

  const question = n => (n.kind === 'num' ? `${n.feature} ≤ ${fmtT(n.threshold)}` : `¿${n.feature}?`);

  function drawNode(parent, n, st, p, ds, o) {
    const { W0, H0, compact, critName } = o;
    const g = svgEl('g', {
      class: `tnode ${st}${n.leaf && st === 'decided' ? ' leaf' : ''}`,
      transform: `translate(${p.x - W0 / 2},${p.y})`, 'data-id': n.id,
    }, parent);
    const box = svgEl('rect', { class: 'box', width: W0, height: H0, rx: compact ? 9 : 12 }, g);
    const cx = W0 / 2;
    const bh = compact ? 5 : 6;
    const bottomPad = compact ? 8 : 10;
    const by = H0 - bh - bottomPad;
    const y1 = compact ? 20 : 25;
    const y2 = compact ? 38 : 47;

    if (st === 'pending') {
      svgText(g, cx, y1, '?', 't1');
      svgText(g, cx, y2, `n=${n.samples}`, 't2');
    } else if (n.leaf) {
      const col = ds.colors[n.prediction];
      box.style.fill = tint(col, 0.16);
      box.style.stroke = col;
      box.style.strokeWidth = '2px';
      svgText(g, cx, y1, n.prediction, 't1').style.fill = col;
      let sub = `n=${n.samples} · ` + ds.classes.map(k => `${k} ${n.counts[k]}`).join(' · ');
      if (compact || sub.length > 24) sub = ds.classes.map(k => `${k}:${n.counts[k]}`).join(' ');
      svgText(g, cx, y2, sub, 't2');
    } else {
      svgText(g, cx, y1, question(n), 't1');
      svgText(g, cx, y2, compact ? `n=${n.samples}` : `n=${n.samples} · ${critName} ${n.impurity.toFixed(3)}`, 't2');
    }
    // barra de proporción de clases en el fondo del nodo con espacio limpio
    const bw = W0 - 24;
    let x = 12;
    svgEl('rect', { x: 12, y: by, width: bw, height: bh, fill: '#1e293b', rx: 2.5 }, g);
    ds.classes.forEach(k => {
      const w = n.samples ? (bw * n.counts[k]) / n.samples : 0;
      if (w > 0) svgEl('rect', { x, y: by, width: w, height: bh, fill: ds.colors[k] }, g);
      x += w;
    });
    return g;
  }

  /**
   * Dibuja el árbol completo. opts.state(n) -> 'decided' | 'pending' | 'hidden'
   */
  function render(svg, root, ds, opts = {}) {
    const compact = !!opts.compact;
    // Dimensiones amplias y holgadas para evitar cualquier colisión entre texto y barras
    const minH = compact ? 66 : 76;
    const W0 = opts.nodeW || (compact ? 152 : 184);
    const H0 = Math.max(opts.nodeH || (compact ? 66 : 78), minH);
    const gx = opts.gapX ?? (compact ? 22 : 32);
    const gy = opts.gapY ?? (compact ? 56 : 72);
    const state = opts.state || (() => 'decided');
    const critName = opts.critName || 'Gini';
    svg.innerHTML = '';
    svg.classList.toggle('compact', compact);
    const { pos, slots, maxDepth } = layout(root);
    const W = slots * W0 + (slots - 1) * gx, H = (maxDepth + 1) * H0 + maxDepth * gy, pad = 28;
    const baseVb = { x: -pad, y: -pad, w: W + 2 * pad, h: H + 2 * pad };
    svg._baseVb = baseVb;
    svg.setAttribute('viewBox', `${baseVb.x} ${baseVb.y} ${baseVb.w} ${baseVb.h}`);

    const P = id => { const p = pos.get(id); return { x: p.slot * (W0 + gx) + W0 / 2, y: p.depth * (H0 + gy) }; };
    const gE = svgEl('g', { class: 'edges' }, svg), gL = svgEl('g', { class: 'elabels' }, svg), gN = svgEl('g', { class: 'nodes' }, svg);
    const view = { svg, nodes: new Map(), edges: new Map(), centers: new Map(), tops: new Map(), bottoms: new Map(), token: null, baseVb };

    (function walk(n) {
      const st = state(n);
      if (st === 'hidden') return;
      const p = P(n.id);
      view.centers.set(n.id, { x: p.x, y: p.y + H0 / 2 });
      view.tops.set(n.id, { x: p.x, y: p.y });
      view.bottoms.set(n.id, { x: p.x, y: p.y + H0 });
      view.nodes.set(n.id, drawNode(gN, n, st, p, ds, { W0, H0, compact, critName }));
      if (st !== 'decided' || n.leaf) return;
      n.children.forEach(ch => {
        if (state(ch.node) === 'hidden') return;
        const c = P(ch.node.id), y1 = p.y + H0, y2 = c.y, ym = (y1 + y2) / 2;
        const path = svgEl('path', { class: 'edge', d: `M${p.x},${y1} C${p.x},${ym} ${c.x},${ym} ${c.x},${y2}` }, gE);
        const lab = svgEl('g', { class: 'elabel' }, gL);
        const lx = (p.x + c.x) / 2, tw = ch.label.length * (compact ? 6.5 : 7.2) + 16;
        svgEl('rect', { x: lx - tw / 2, y: ym - 11, width: tw, height: 22, rx: 11 }, lab);
        svgText(lab, lx, ym + 4.5, ch.label);
        view.edges.set(ch.node.id, { path, label: lab });
        walk(ch.node);
      });
    })(root);
    return view;
  }

  function clear(view) {
    view.nodes.forEach(g => g.classList.remove('active'));
    view.edges.forEach(e => { e.path.classList.remove('active'); e.label.classList.remove('active'); });
    if (view.token) view.token.remove();
    view.token = null;
  }

  /** Mueve un marcador desde la raíz hasta la hoja siguiendo las aristas. */
  async function travel(view, path, { stepMs = 600, onNode } = {}) {
    clear(view);
    const c0 = view.centers.get(path[0].id);
    const tok = svgEl('circle', { class: 'token', r: 0, cx: c0.x, cy: c0.y }, view.svg);
    view.token = tok;
    view.nodes.get(path[0].id).classList.add('active');
    onNode && onNode(path[0], 0);
    await anime({ targets: tok, r: [0, 10], duration: Math.max(150, stepMs * 0.4), easing: 'easeOutBack' }).finished;
    let cur = c0;
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1], n = path[i];
      const b = view.bottoms.get(prev.id), t = view.tops.get(n.id), c = view.centers.get(n.id), e = view.edges.get(n.id);
      await anime({ targets: tok, cx: [cur.x, b.x], cy: [cur.y, b.y], duration: stepMs * 0.3, easing: 'easeInQuad' }).finished;
      e.path.classList.add('active'); e.label.classList.add('active');
      const len = e.path.getTotalLength(), o = { t: 0 };
      await anime({
        targets: o, t: 1, duration: stepMs, easing: 'easeInOutSine',
        update: () => { const q = e.path.getPointAtLength(o.t * len); tok.setAttribute('cx', q.x); tok.setAttribute('cy', q.y); },
      }).finished;
      await anime({ targets: tok, cx: [t.x, c.x], cy: [t.y, c.y], duration: stepMs * 0.3, easing: 'easeOutQuad' }).finished;
      cur = c;
      view.nodes.get(n.id).classList.add('active');
      onNode && onNode(n, i);
    }
    await anime({ targets: tok, r: [{ value: 14 }, { value: 10 }], duration: 420, easing: 'easeInOutQuad' }).finished;
    return tok;
  }

  /** Controlador de Pan & Zoom sobre el SVG */
  function enableZoomPan(container, svg, opts = {}) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let currentScale = opts.initialScale || 1;
    let panX = 0, panY = 0;

    const getBase = () => svg._baseVb || { x: 0, y: 0, w: 900, h: 500 };

    function updateViewBox(smooth = false) {
      const base = getBase();
      const sw = base.w / currentScale;
      const sh = base.h / currentScale;
      const targetX = base.x + panX + (base.w - sw) / 2;
      const targetY = base.y + panY + (base.h - sh) / 2;

      if (smooth) {
        const curParts = (svg.getAttribute('viewBox') || '').split(' ').map(Number);
        if (curParts.length === 4) {
          const o = { x: curParts[0], y: curParts[1], w: curParts[2], h: curParts[3] };
          anime({
            targets: o,
            x: targetX, y: targetY, w: sw, h: sh,
            duration: 320,
            easing: 'easeOutCubic',
            update: () => svg.setAttribute('viewBox', `${o.x} ${o.y} ${o.w} ${o.h}`)
          });
          return;
        }
      }
      svg.setAttribute('viewBox', `${targetX} ${targetY} ${sw} ${sh}`);
    }

    function zoom(factor, smooth = true) {
      currentScale = Math.max(0.35, Math.min(3.8, currentScale * factor));
      updateViewBox(smooth);
      if (opts.onZoom) opts.onZoom(currentScale);
    }

    function reset(smooth = true) {
      currentScale = opts.initialScale || 1;
      panX = 0;
      panY = 0;
      updateViewBox(smooth);
      if (opts.onZoom) opts.onZoom(currentScale);
    }

    container.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;

      const base = getBase();
      const rect = container.getBoundingClientRect();
      const scaleX = (base.w / currentScale) / (rect.width || 800);
      const scaleY = (base.h / currentScale) / (rect.height || 500);

      panX -= dx * scaleX;
      panY -= dy * scaleY;
      updateViewBox(false);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = 'grab';
      }
    });

    container.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      zoom(factor, false);
    }, { passive: false });

    return {
      zoomIn: () => zoom(1.25),
      zoomOut: () => zoom(0.8),
      reset,
      setScale: s => { currentScale = s; updateViewBox(true); },
      centerOn: (x, y) => {
        const base = getBase();
        panX = x - (base.x + base.w / 2);
        panY = y - (base.y + base.h / 2);
        updateViewBox(true);
      }
    };
  }

  return { render, travel, clear, question, enableZoomPan };
})();

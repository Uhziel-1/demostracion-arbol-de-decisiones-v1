/* ============================================================
   Diagrama de dispersión (2 atributos numéricos)
   ============================================================ */
const Scatter = (() => {
  const X0 = 58, X1 = 470, Y0 = 14, Y1 = 426;
  const LO = -0.5, HI = 12.5;
  const sx = v => X0 + ((v - LO) / (HI - LO)) * (X1 - X0);
  const sy = v => Y1 - ((v - LO) / (HI - LO)) * (Y1 - Y0);

  function create(svg) {
    svg.setAttribute('viewBox', '0 0 484 476');
    svg.innerHTML = '';
    svgEl('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, class: 'plot-bg' }, svg);
    const regions = svgEl('g', {}, svg);
    const grid = svgEl('g', { class: 'grid' }, svg);
    for (let v = 0; v <= 12; v++) {
      svgEl('line', { x1: sx(v), x2: sx(v), y1: Y0, y2: Y1 }, grid);
      svgEl('line', { x1: X0, x2: X1, y1: sy(v), y2: sy(v) }, grid);
      if (v % 2 === 0) {
        svgText(svg, sx(v), Y1 + 18, v, 'tick');
        svgText(svg, X0 - 12, sy(v) + 4, v, 'tick', { 'text-anchor': 'end' });
      }
    }
    svgText(svg, (X0 + X1) / 2, Y1 + 42, 'Enlaces en el correo', 'axis-label');
    svgText(svg, 0, 0, 'Signos de exclamación', 'axis-label', { transform: `translate(16 ${(Y0 + Y1) / 2}) rotate(-90)` });
    const lines = svgEl('g', {}, svg);
    const points = svgEl('g', {}, svg);
    const overlay = svgEl('g', {}, svg);
    return { svg, regions, grid, lines, points, overlay };
  }

  function drawPoints(sc, rows, ds, { test = false } = {}) {
    return rows.map(r => {
      const c = svgEl('circle', {
        cx: sx(r.Enlaces + r.jx), cy: sy(r.Exclamaciones + r.jy), r: test ? 5 : 5.5,
        class: test ? 'pt test' : 'pt',
      }, sc.points);
      c.style.fill = test ? '#fff' : ds.colors[r.Clase];
      c.style.stroke = test ? ds.colors[r.Clase] : '#fff';
      const t = svgEl('title', {}, c);
      t.textContent = `${r.id}: ${r.Enlaces} enlaces, ${r.Exclamaciones} exclamaciones → ${r.Clase}`;
      return c;
    });
  }

  return { create, drawPoints, sx, sy, X0, X1, Y0, Y1, LO, HI };
})();

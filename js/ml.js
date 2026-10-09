/* ============================================================
   Algoritmos: impureza, mejor división, construcción del árbol
   (ID3/CART multirrama para categóricos, CART binario para numéricos)
   ============================================================ */
const ML = (() => {
  const counts = (rows, ds) => {
    const c = {};
    ds.classes.forEach(k => (c[k] = 0));
    rows.forEach(r => c[r[ds.target]]++);
    return c;
  };
  const total = c => Object.values(c).reduce((a, b) => a + b, 0);

  function gini(c) {
    const n = total(c);
    if (!n) return 0;
    return 1 - Object.values(c).reduce((s, x) => s + (x / n) ** 2, 0);
  }
  function entropy(c) {
    const n = total(c);
    if (!n) return 0;
    const v = -Object.values(c).reduce((s, x) => (x ? s + (x / n) * Math.log2(x / n) : s), 0);
    return Math.abs(v) < 1e-12 ? 0 : v;
  }
  const CRIT = { gini, entropy };
  const CRIT_NAME = { gini: 'Gini', entropy: 'Entropía' };
  const majority = (c, ds) => ds.classes.reduce((b, k) => (c[k] > c[b] ? k : b), ds.classes[0]);

  /* ---------- Categóricos ---------- */
  function evalCategoricalSplit(rows, f, ds, crit) {
    const parentImp = CRIT[crit](counts(rows, ds));
    const groups = ds.domain[f]
      .map(v => {
        const sub = rows.filter(r => r[f] === v);
        const c = counts(sub, ds);
        return { value: v, rows: sub, counts: c, n: sub.length, impurity: CRIT[crit](c) };
      })
      .filter(g => g.n > 0);
    const weighted = groups.reduce((s, g) => s + (g.n / rows.length) * g.impurity, 0);
    return { feature: f, groups, parentImp, weighted, gain: parentImp - weighted };
  }

  function buildCategorical(ds, crit = 'gini', rows = ds.rows) {
    let nextId = 0;
    function grow(rows, feats, depth, path) {
      const c = counts(rows, ds);
      const node = {
        id: nextId++, kind: 'cat', depth, path, rows, counts: c, samples: rows.length,
        impurity: CRIT[crit](c), prediction: majority(c, ds), children: [], leaf: false,
      };
      node.candidates = feats.map(f => evalCategoricalSplit(rows, f, ds, crit));
      if (node.impurity < 1e-12) return Object.assign(node, { leaf: true, reason: 'pure' });
      if (!feats.length) return Object.assign(node, { leaf: true, reason: 'nofeatures' });
      const best = node.candidates.reduce((a, b) => (b.gain > a.gain + 1e-12 ? b : a));
      if (best.gain <= 1e-12) return Object.assign(node, { leaf: true, reason: 'nogain' });
      node.feature = best.feature;
      node.best = best;
      node.children = best.groups.map(g => ({
        label: g.value,
        node: grow(g.rows, feats.filter(x => x !== best.feature), depth + 1, [...path, `${best.feature} = ${g.value}`]),
      }));
      return node;
    }
    return grow(rows, ds.features.slice(), 0, []);
  }

  /* ---------- Numéricos ---------- */
  function bestNumericSplit(rows, ds) {
    const n = rows.length;
    const parentImp = gini(counts(rows, ds));
    let best = null;
    const curves = {};
    ds.features.forEach(f => {
      const vals = [...new Set(rows.map(r => r[f]))].sort((a, b) => a - b);
      curves[f] = [];
      for (let i = 0; i < vals.length - 1; i++) {
        const t = (vals[i] + vals[i + 1]) / 2;
        const left = rows.filter(r => r[f] <= t), right = rows.filter(r => r[f] > t);
        const cl = counts(left, ds), cr = counts(right, ds);
        const weighted = (left.length / n) * gini(cl) + (right.length / n) * gini(cr);
        const s = { feature: f, threshold: t, left, right, cl, cr, weighted, gain: parentImp - weighted };
        curves[f].push(s);
        if (!best || weighted < best.weighted - 1e-12) best = s;
      }
    });
    return { best, curves, parentImp };
  }

  function buildNumeric(ds, rows, maxDepth) {
    let nextId = 0;
    const B0 = {};
    ds.features.forEach(f => (B0[f] = [ds.lo, ds.hi]));
    function grow(rows, depth, bounds, path) {
      const c = counts(rows, ds);
      const node = {
        id: nextId++, kind: 'num', depth, path, rows, counts: c, samples: rows.length,
        impurity: gini(c), prediction: majority(c, ds), bounds, children: [], leaf: false,
      };
      if (depth >= maxDepth || node.impurity < 1e-12 || rows.length < 2) return Object.assign(node, { leaf: true });
      const { best } = bestNumericSplit(rows, ds);
      if (!best || best.gain <= 1e-12) return Object.assign(node, { leaf: true });
      const f = best.feature, t = best.threshold;
      node.feature = f;
      node.threshold = t;
      const bl = {}, br = {};
      ds.features.forEach(k => { bl[k] = bounds[k].slice(); br[k] = bounds[k].slice(); });
      bl[f][1] = t; br[f][0] = t;
      node.children = [
        { label: '≤ ' + fmtT(t), node: grow(best.left, depth + 1, bl, [...path, `${f} ≤ ${fmtT(t)}`]) },
        { label: '> ' + fmtT(t), node: grow(best.right, depth + 1, br, [...path, `${f} > ${fmtT(t)}`]) },
      ];
      return node;
    }
    return grow(rows, 0, B0, []);
  }

  /* ---------- Uso del árbol ---------- */
  function path(root, row) {
    const p = [root];
    let n = root;
    while (!n.leaf) {
      const idx = n.kind === 'cat'
        ? n.children.findIndex(ch => ch.label === row[n.feature])
        : row[n.feature] <= n.threshold ? 0 : 1;
      if (idx < 0) break;
      n = n.children[idx].node;
      p.push(n);
    }
    return p;
  }
  const predict = (root, row) => path(root, row).at(-1).prediction;
  const accuracy = (root, rows, ds) => rows.filter(r => predict(root, r) === r[ds.target]).length / rows.length;

  function bfs(root) {
    const out = [], q = [root];
    while (q.length) { const n = q.shift(); out.push(n); n.children.forEach(c => q.push(c.node)); }
    return out;
  }
  const leaves = root => bfs(root).filter(n => n.leaf);
  const maxDepth = root => Math.max(...bfs(root).map(n => n.depth));
  function parents(root) {
    const m = new Map();
    bfs(root).forEach(n => n.children.forEach(c => m.set(c.node.id, n)));
    return m;
  }
  const signature = n => (n.leaf ? n.prediction : `${n.feature}(${n.children.map(c => c.label + ':' + signature(c.node)).join(',')})`);

  return {
    counts, gini, entropy, CRIT, CRIT_NAME, majority,
    evalCategoricalSplit, buildCategorical, bestNumericSplit, buildNumeric,
    path, predict, accuracy, bfs, leaves, maxDepth, parents, signature,
  };
})();

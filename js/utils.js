/* Utilidades compartidas */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  kids.flat(Infinity).forEach(c => {
    if (c == null) return;
    e.append(c.nodeType ? c : document.createTextNode(c));
  });
  return e;
}

function svgEl(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function svgText(parent, x, y, str, cls, extra = {}) {
  const t = svgEl('text', { x, y, class: cls || '', 'text-anchor': 'middle', ...extra }, parent);
  t.textContent = str;
  return t;
}

function tint(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtT = t => (Number.isInteger(t) ? String(t) : t.toFixed(1));
const pct = x => (x * 100).toFixed(1) + '%';

function tweenText(el, to, d = 3, dur = 450, suffix = '') {
  const o = { v: el._v ?? 0 };
  el._v = to;
  anime({ targets: o, v: to, duration: dur, easing: 'easeOutQuad', update: () => (el.textContent = o.v.toFixed(d) + suffix) });
}

function countsHtml(c, ds) {
  return ds.classes
    .map(k => `<span class="cdot" style="background:${ds.colors[k]}"></span>${k} <b class="mono">${c[k]}</b>`)
    .join('<span class="sep">·</span>');
}

/* ============================================================
   Datasets
   1) TENNIS: 14 días, atributos categóricos (clásico de Quinlan)
   2) SPAM:   100 correos, 2 atributos numéricos, generados con
              semilla fija (siempre los mismos datos)
   ============================================================ */

const TENNIS = {
  name: 'Partido al aire libre',
  features: ['Cielo', 'Temperatura', 'Humedad', 'Viento'],
  domain: {
    Cielo: ['Soleado', 'Nublado', 'Lluvioso'],
    Temperatura: ['Calor', 'Templado', 'Frío'],
    Humedad: ['Alta', 'Normal'],
    Viento: ['Débil', 'Fuerte'],
  },
  target: 'Jugar',
  classes: ['Sí', 'No'],
  colors: { 'Sí': '#2a9d8f', 'No': '#d1495b' },
  rows: [
    ['Soleado', 'Calor', 'Alta', 'Débil', 'No'],
    ['Soleado', 'Calor', 'Alta', 'Fuerte', 'No'],
    ['Nublado', 'Calor', 'Alta', 'Débil', 'Sí'],
    ['Lluvioso', 'Templado', 'Alta', 'Débil', 'Sí'],
    ['Lluvioso', 'Frío', 'Normal', 'Débil', 'Sí'],
    ['Lluvioso', 'Frío', 'Normal', 'Fuerte', 'No'],
    ['Nublado', 'Frío', 'Normal', 'Fuerte', 'Sí'],
    ['Soleado', 'Templado', 'Alta', 'Débil', 'No'],
    ['Soleado', 'Frío', 'Normal', 'Débil', 'Sí'],
    ['Lluvioso', 'Templado', 'Normal', 'Débil', 'Sí'],
    ['Soleado', 'Templado', 'Normal', 'Fuerte', 'Sí'],
    ['Nublado', 'Templado', 'Alta', 'Fuerte', 'Sí'],
    ['Nublado', 'Calor', 'Normal', 'Débil', 'Sí'],
    ['Lluvioso', 'Templado', 'Alta', 'Fuerte', 'No'],
  ].map((r, i) => ({ id: i + 1, Cielo: r[0], Temperatura: r[1], Humedad: r[2], Viento: r[3], Jugar: r[4] })),
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSpam(seed) {
  const rnd = mulberry32(seed);
  const make = (n, prefix) =>
    Array.from({ length: n }, (_, i) => {
      const Enlaces = Math.floor(rnd() * 13);
      const Exclamaciones = Math.floor(rnd() * 13);
      // regla oculta + ruido: los datos reales nunca son perfectos
      const score = 0.55 * Enlaces + 0.45 * Exclamaciones + (rnd() - 0.5) * 4;
      let Clase = score > 6 ? 'Spam' : 'Normal';
      if (rnd() < 0.06) Clase = Clase === 'Spam' ? 'Normal' : 'Spam';
      const jx = (rnd() - 0.5) * 0.4, jy = (rnd() - 0.5) * 0.4; // solo para dibujar
      return { id: prefix + (i + 1), Enlaces, Exclamaciones, Clase, jx, jy };
    });
  const train = make(70, 'E');
  const test = make(30, 'P');
  return {
    name: 'Correos electrónicos',
    features: ['Enlaces', 'Exclamaciones'],
    target: 'Clase',
    classes: ['Spam', 'Normal'],
    positive: 'Spam',
    colors: { Spam: '#d1495b', Normal: '#2e86ab' },
    train, test,
    lo: -0.5, hi: 12.5,
  };
}

const SPAM = makeSpam(20261020);

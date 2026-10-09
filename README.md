# Árboles de Decisión y Matriz de Confusión · Demostración Interactiva

Aplicación web interactiva desarrollada para la demostración práctica y rigurosa del funcionamiento interno de los **Árboles de Decisión (CART / ID3)** y su posterior evaluación estadística mediante la **Matriz de Confusión**, en el marco del curso de **Minería de Datos**.

Construida íntegramente con **HTML5, CSS3, JavaScript Vanilla** y animada con **Anime.js 3.2.2** (incluida localmente sin dependencias externas).

---

## Módulos de la Aplicación

1. **01 · Inferencia en Vivo:** Clasificación de un caso nuevo recorriendo el árbol desde la raíz hasta la hoja, mostrando la descartabilidad de atributos no informativos.
2. **02 · Medición de la Impureza (Gini y Entropía):** Interacción dinámica sobre muestras de clases para calcular en tiempo real el índice Gini ($1 - \sum p_i^2$) y la Entropía ($-\sum p_i \log_2 p_i$) con curvas teóricas continuas.
3. **03 · Búsqueda de la Mejor Pregunta:** Partición física de 14 registros de entrenamiento por cada atributo categórico, cálculo de impureza ponderada y ganancia de información.
4. **04 · Construcción Recursiva Paso a Paso:** Crecimiento iterativo del árbol con tabla comparativa de candidatos y explicación formal de los criterios de parada (pureza, agotamiento de variables o ganancia nula).
5. **05 · Atributos Continuos y Umbrales Óptimos:** Búsqueda y barrido exhaustivo en un plano 2D continuo para identificar el corte ortogonal que minimiza la impureza.
6. **06 · Profundidad y Sobreajuste (Overfitting):** Partición del espacio en regiones ortogonales y análisis de curvas de exactitud en entrenamiento vs. prueba (30 casos independientes). Incluye soporte de Pan & Zoom y animación progresiva de nuevas ramas.
7. **07 · Evaluación y Matriz de Confusión ($2 \times 2$):** Clasificación animada de los 30 correos de prueba, conteo de Verdaderos Positivos (VP), Falsos Positivos (FP), Falsos Negativos (FN), Verdaderos Negativos (VN), aislamiento de registros por cuadrante y cálculo de métricas derivadas (Exactitud, Precisión, Sensibilidad y F1-Score).

---

## Despliegue en GitHub Pages

Al tratarse de una aplicación estática pura sin backend ni pasos de compilación:

1. Crea un repositorio en tu cuenta de GitHub (ej. `arbol-decisiones-interactivo`).
2. Vincula el remoto local y haz push a la rama `main`:
   ```bash
   git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
   git push -u origin main
   ```
3. En GitHub, ve a **Settings** &rarr; **Pages**.
4. En **Build and deployment**, selecciona:
   * **Source:** `Deploy from a branch`
   * **Branch:** `main` / `/ (root)`
5. Haz clic en **Save**. En un par de minutos la demostración estará disponible públicamente en `https://TU-USUARIO.github.io/TU-REPOSITORIO/`.

---

## Ejecución Local

Solo requiere abrir `index.html` con doble clic en cualquier navegador web moderno (Edge, Chrome, Firefox, Safari). Funciona de forma totalmente autónoma y offline.

/* ============================================================
   Coordinador Principal de la Aplicación
   Inicializa cada módulo y gestiona la navegación interactiva.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Inicialización secuencial de las 7 secciones interactivas
  try {
    initS1();
    initS2();
    initS3();
    initS4();
    initS5();
    initS6();
    initS7();
  } catch (err) {
    console.error('Error durante la inicialización de módulos:', err);
  }

  // Navegación fluida y resaltado de la sección activa
  const navLinks = $$('.sidebar-nav a');
  const sections = $$('section.module-card');

  function updateActiveNav() {
    let current = '';
    const scrollPos = window.scrollY + 180;

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = sec.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  // Scroll suave al hacer clic en los enlaces de navegación
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.getAttribute('href').slice(1);
      const targetSec = document.getElementById(targetId);
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});

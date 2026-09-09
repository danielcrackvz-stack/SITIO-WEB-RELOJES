/* =========================================================
   main.js — Comportamiento general del sitio (solo estructura)
   Acá NO va lógica de Supabase, WhatsApp ni IA todavía.
   Eso lo iremos agregando en los próximos pasos.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  markActiveNavLink();
});

/**
 * Abre/cierra el menú de navegación en pantallas chicas.
 */
function initMobileMenu() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });
}

/**
 * Marca como "activo" el link del navbar que corresponde
 * a la página actual (según el nombre del archivo html).
 */
function markActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a');

  navLinks.forEach((link) => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });
}

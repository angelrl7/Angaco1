/**
 * ===================================================
 * GESTOR DE MODO OSCURO / CLARO
 * Archivo: theme.js
 * ===================================================
 */

(function () {
  const THEME_KEY = 'angaco_theme_preference';
  const html = document.documentElement;

  // Obtener tema inicial guardado o preferencia del sistema operativo
  function getInitialTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Aplicar el tema en el atributo data-theme y actualizar botón
  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon && label) {
      if (theme === 'dark') {
        icon.textContent = '☀️';
        label.textContent = 'Claro';
      } else {
        icon.textContent = '🌙';
        label.textContent = 'Oscuro';
      }
    }
  }

  // Ejecutar inmediatamente para evitar parpadeos blancos
  applyTheme(getInitialTheme());

  // Conectar evento al botón una vez cargado el DOM
  document.addEventListener('DOMContentLoaded', () => {
    // Re-sincronizar el estado del botón en el DOM
    applyTheme(html.getAttribute('data-theme') || getInitialTheme());

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      });
    }

    // Escuchar cambios de preferencia del sistema si el usuario no fijó una opción
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  });
})();

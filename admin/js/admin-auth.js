/* =========================================================
   admin-auth.js
   Login del panel + verificación de que la cuenta esté en la
   tabla "administradores". Se usa en admin/login.html y también
   como guardia al principio de cada página del panel.
   ========================================================= */

function mostrarErrorAdminAuth(mensaje) {
  const box = document.getElementById('auth-error');
  if (!box) return;
  box.textContent = mensaje;
  box.style.display = 'block';
}

/**
 * Comprueba si el usuario logueado (si hay alguno) está en la
 * tabla "administradores". Devuelve el objeto de sesión si es
 * admin, o null si no hay sesión o no tiene permiso.
 */
async function obtenerSesionAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabaseClient
    .from('administradores')
    .select('user_id, nombre')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error || !data) return null;

  return { ...session, adminNombre: data.nombre };
}

/**
 * Guardia para las páginas del panel (dashboard, stock, etc.):
 * si no hay sesión de administrador válida, redirige al login.
 * Llamar al principio de cada página protegida.
 */
async function protegerPaginaAdmin() {
  const sesion = await obtenerSesionAdmin();
  if (!sesion) {
    window.location.href = 'login.html';
    return null;
  }
  return sesion;
}

async function cerrarSesionAdmin() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

// -----------------------------------------------------------
// Formulario de login (solo existe en admin/login.html)
// -----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const box = document.getElementById('auth-error');
    box.style.display = 'none';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = form.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Verificando...';

    const { error: errorLogin } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (errorLogin) {
      mostrarErrorAdminAuth('Correo o contraseña incorrectos.');
      btn.disabled = false;
      btn.textContent = 'Ingresar al panel';
      return;
    }

    const sesionAdmin = await obtenerSesionAdmin();

    if (!sesionAdmin) {
      mostrarErrorAdminAuth('Esta cuenta no tiene acceso al panel de administración.');
      await supabaseClient.auth.signOut();
      btn.disabled = false;
      btn.textContent = 'Ingresar al panel';
      return;
    }

    window.location.href = 'dashboard.html';
  });
});
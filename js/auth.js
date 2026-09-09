/* =========================================================
   auth.js
   Login, registro y logout de CLIENTES del sitio público.
   Al registrarse, un trigger en Supabase crea automáticamente
   la fila correspondiente en la tabla "clientes" (visible desde
   el panel de administración).
   ========================================================= */

// -----------------------------------------------------------
// Traducción de errores comunes de Supabase al español
// -----------------------------------------------------------
function traducirErrorAuth(mensaje) {
  const mapa = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'User already registered': 'Ya existe una cuenta con ese correo.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Email not confirmed': 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.',
  };
  return mapa[mensaje] || mensaje;
}

function mostrarErrorAuth(mensaje) {
  const box = document.getElementById('auth-error');
  if (!box) return;
  box.textContent = traducirErrorAuth(mensaje);
  box.style.display = 'block';
}

function ocultarErrorAuth() {
  const box = document.getElementById('auth-error');
  if (!box) return;
  box.style.display = 'none';
}

// -----------------------------------------------------------
// LOGIN
// -----------------------------------------------------------
async function manejarLogin(evento) {
  evento.preventDefault();
  ocultarErrorAuth();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = evento.target.querySelector('button[type="submit"]');

  btn.disabled = true;
  btn.textContent = 'Ingresando...';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    mostrarErrorAuth(error.message);
    btn.disabled = false;
    btn.textContent = 'Ingresar';
    return;
  }

  window.location.href = 'index.html';
}

// -----------------------------------------------------------
// REGISTRO (dispara el trigger que crea la fila en "clientes")
// -----------------------------------------------------------
async function manejarRegistro(evento) {
  evento.preventDefault();
  ocultarErrorAuth();

  const nombre = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const telefono = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const btn = evento.target.querySelector('button[type="submit"]');

  btn.disabled = true;
  btn.textContent = 'Creando cuenta...';

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, telefono }, // el trigger de Supabase usa esto para armar el registro en "clientes"
    },
  });

  if (error) {
    mostrarErrorAuth(error.message);
    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
    return;
  }

  window.location.href = 'index.html';
}

// -----------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------
async function cerrarSesion() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// -----------------------------------------------------------
// ESTADO DEL NAVBAR (logueado / no logueado)
// -----------------------------------------------------------
async function renderizarAuthSlot() {
  const slot = document.getElementById('auth-slot');
  if (!slot) return;

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    const nombre = session.user.user_metadata?.nombre || session.user.email.split('@')[0];
    slot.innerHTML = `
      <div class="user-menu">
        <span class="user-name">Hola, ${nombre}</span>
        <button id="logout-btn" class="logout-link">Cerrar sesión</button>
      </div>
    `;
    document.getElementById('logout-btn').addEventListener('click', cerrarSesion);
  } else {
    slot.innerHTML = `<a href="login.html">Ingresar</a>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderizarAuthSlot();

  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', manejarLogin);

  const registerForm = document.getElementById('register-form');
  if (registerForm) registerForm.addEventListener('submit', manejarRegistro);
});

/* =========================================================
   dashboard.js
   Navegación entre secciones del panel + carga de datos
   (estadísticas, stock, ventas, compras, proveedores, clientes).
   ========================================================= */

let seccionActual = 'dashboard';

const TITULOS_SECCION = {
  dashboard: 'Dashboard',
  stock: 'Stock',
  ventas: 'Ventas',
  compras: 'Compras',
  proveedores: 'Proveedores',
  clientes: 'Clientes',
};

// -----------------------------------------------------------
// Navegación entre secciones
// -----------------------------------------------------------
function irASeccion(nombre) {
  document.querySelectorAll('.admin-nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.section === nombre);
  });
  document.querySelectorAll('.admin-section').forEach((sec) => {
    sec.classList.toggle('active', sec.dataset.section === nombre);
  });

  cerrarMenuMovil();

  document.getElementById('admin-titulo-seccion').textContent = TITULOS_SECCION[nombre] || '';
  seccionActual = nombre;

  const cargadores = {
    dashboard: cargarDashboard,
    stock: cargarStock,
    ventas: cargarVentas,
    compras: cargarCompras,
    proveedores: cargarProveedores,
    clientes: cargarClientes,
  };
  if (cargadores[nombre]) cargadores[nombre]();
}

function formatoFecha(fechaIso) {
  return new Date(fechaIso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// -----------------------------------------------------------
// DASHBOARD
// -----------------------------------------------------------
async function cargarDashboard() {
  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);

  const { data: ventasHoy } = await supabaseClient
    .from('ventas')
    .select('*')
    .gte('creado_en', hoyInicio.toISOString())
    .order('creado_en', { ascending: false });

  const totalHoy = (ventasHoy || []).reduce((acc, v) => acc + Number(v.total), 0);
  document.getElementById('stat-ventas-hoy').textContent = (ventasHoy || []).length;
  document.getElementById('stat-total-hoy').textContent = `Bs ${totalHoy.toFixed(2)}`;

  const { data: productos } = await supabaseClient.from('productos').select('*');
  const stockBajo = (productos || []).filter((p) => (p.stock_actual ?? 0) <= (p.stock_minimo ?? 3));
  document.getElementById('stat-stock-bajo').textContent = stockBajo.length;

  const { count: totalClientes } = await supabaseClient
    .from('clientes')
    .select('*', { count: 'exact', head: true });
  document.getElementById('stat-clientes').textContent = totalClientes ?? 0;

  const { data: ultimasVentas } = await supabaseClient
    .from('ventas')
    .select('*, productos(nombre)')
    .order('creado_en', { ascending: false })
    .limit(6);

  const cuerpo = document.getElementById('tabla-dashboard-ventas');
  if (!ultimasVentas || ultimasVentas.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="5" class="tabla-vacio">Todavía no hay ventas registradas.</td></tr>';
    return;
  }

  cuerpo.innerHTML = ultimasVentas.map((v) => `
    <tr>
      <td>${formatoFecha(v.creado_en)}</td>
      <td>${v.productos?.nombre || '—'}</td>
      <td>${v.cantidad}</td>
      <td>Bs ${Number(v.total).toFixed(2)}</td>
      <td>${v.cliente_nombre || '—'}</td>
    </tr>
  `).join('');
}

// -----------------------------------------------------------
// STOCK
// -----------------------------------------------------------
async function cargarStock() {
  const { data: productos } = await supabaseClient.from('productos').select('*').order('nombre');
  const cuerpo = document.getElementById('tabla-stock');

  if (!productos || productos.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="6" class="tabla-vacio">No hay relojes cargados.</td></tr>';
    return;
  }

  cuerpo.innerHTML = productos.map((p) => {
    const bajo = (p.stock_actual ?? 0) <= (p.stock_minimo ?? 3);
    return `
      <tr>
        <td>${p.nombre}</td>
        <td>${p.categoria}</td>
        <td>Bs ${p.precio}</td>
        <td>
          <div class="stock-stepper">
            <button type="button" onclick="ajustarStock('${p.id}', -1)">−</button>
            <span id="stock-valor-${p.id}" class="${bajo ? 'badge-stock-bajo' : ''}">${p.stock_actual ?? 0}</span>
            <button type="button" onclick="ajustarStock('${p.id}', 1)">+</button>
          </div>
        </td>
        <td>${p.stock_minimo ?? 3}</td>
        <td>
          <div class="fila-acciones">
            <button class="btn-editar" onclick="abrirModalEditarProducto('${p.id}')">Editar</button>
            <button class="btn-eliminar" onclick="eliminarProducto('${p.id}')">🗑 Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function ajustarStock(idProducto, delta) {
  const { data: producto } = await supabaseClient
    .from('productos')
    .select('stock_actual, stock_minimo')
    .eq('id', idProducto)
    .single();

  if (!producto) return;

  const nuevoValor = Math.max(0, (producto.stock_actual ?? 0) + delta);

  const { error } = await supabaseClient
    .from('productos')
    .update({ stock_actual: nuevoValor })
    .eq('id', idProducto);

  if (error) {
    alert('Error al actualizar el stock: ' + error.message);
    return;
  }

  const span = document.getElementById(`stock-valor-${idProducto}`);
  if (span) {
    span.textContent = nuevoValor;
    span.classList.toggle('badge-stock-bajo', nuevoValor <= (producto.stock_minimo ?? 3));
  }

  if (seccionActual === 'dashboard') cargarDashboard();
}

// -----------------------------------------------------------
// VENTAS
// -----------------------------------------------------------
async function cargarVentas() {
  const { data: ventas } = await supabaseClient
    .from('ventas')
    .select('*, productos(nombre)')
    .order('creado_en', { ascending: false });

  const cuerpo = document.getElementById('tabla-ventas');

  if (!ventas || ventas.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="8" class="tabla-vacio">Todavía no registraste ninguna venta.</td></tr>';
    return;
  }

  cuerpo.innerHTML = ventas.map((v) => `
    <tr>
      <td>${formatoFecha(v.creado_en)}</td>
      <td>${v.productos?.nombre || '—'}</td>
      <td>${v.cantidad}</td>
      <td>Bs ${Number(v.precio_unitario).toFixed(2)}</td>
      <td>Bs ${Number(v.total).toFixed(2)}</td>
      <td>${v.cliente_nombre || '—'}</td>
      <td>${v.metodo_pago}</td>
      <td>
        <div class="fila-acciones">
          <button class="btn-editar" onclick="abrirModalEditarVenta('${v.id}')">Editar</button>
          <button class="btn-eliminar" onclick="eliminarVenta('${v.id}')">🗑 Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// -----------------------------------------------------------
// COMPRAS
// -----------------------------------------------------------
async function cargarCompras() {
  const { data: compras } = await supabaseClient
    .from('compras')
    .select('*, productos(nombre), proveedores(nombre)')
    .order('fecha_compra', { ascending: false });

  const cuerpo = document.getElementById('tabla-compras');

  if (!compras || compras.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="7" class="tabla-vacio">Todavía no registraste ninguna compra.</td></tr>';
    return;
  }

  cuerpo.innerHTML = compras.map((c) => `
    <tr>
      <td>${formatoFecha(c.fecha_compra)}</td>
      <td>${c.proveedores?.nombre || '—'}</td>
      <td>${c.productos?.nombre || '—'}</td>
      <td>${c.cantidad}</td>
      <td>Bs ${Number(c.precio_unitario).toFixed(2)}</td>
      <td>${c.numero_factura || '—'}</td>
      <td>
        <div class="fila-acciones">
          <button class="btn-editar" onclick="abrirModalEditarCompra('${c.id}')">Editar</button>
          <button class="btn-eliminar" onclick="eliminarCompra('${c.id}')">🗑 Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// -----------------------------------------------------------
// PROVEEDORES
// -----------------------------------------------------------
async function cargarProveedores() {
  const { data: proveedores } = await supabaseClient
    .from('proveedores')
    .select('*')
    .order('nombre');

  const cuerpo = document.getElementById('tabla-proveedores');

  if (!proveedores || proveedores.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="6" class="tabla-vacio">Todavía no cargaste ningún proveedor.</td></tr>';
    return;
  }

  cuerpo.innerHTML = proveedores.map((p) => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.contacto || '—'}</td>
      <td>${p.telefono || '—'}</td>
      <td>${p.correo || '—'}</td>
      <td><span class="badge-estado ${p.estado}">${p.estado}</span></td>
      <td>
        <div class="fila-acciones">
          <button class="btn-editar" onclick="abrirModalEditarProveedor('${p.id}')">Editar</button>
          <button class="tabla-accion-btn" onclick="alternarEstadoProveedor('${p.id}', '${p.estado}')">
            ${p.estado === 'activo' ? 'Desactivar' : 'Activar'}
          </button>
          <button class="btn-eliminar" onclick="eliminarProveedor('${p.id}')">🗑 Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function alternarEstadoProveedor(id, estadoActual) {
  const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
  await supabaseClient.from('proveedores').update({ estado: nuevoEstado }).eq('id', id);
  cargarProveedores();
}

// -----------------------------------------------------------
// CLIENTES
// -----------------------------------------------------------
async function cargarClientes() {
  const { data: clientes } = await supabaseClient
    .from('clientes')
    .select('*')
    .order('creado_en', { ascending: false });

  const cuerpo = document.getElementById('tabla-clientes');

  if (!clientes || clientes.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="4" class="tabla-vacio">Todavía no hay clientes registrados en el sitio.</td></tr>';
    return;
  }

  cuerpo.innerHTML = clientes.map((c) => `
    <tr>
      <td>${c.nombre || '—'}</td>
      <td>${c.email || '—'}</td>
      <td>${c.telefono || '—'}</td>
      <td>${formatoFecha(c.creado_en)}</td>
    </tr>
  `).join('');
}

// -----------------------------------------------------------
// Menú lateral en celular (se abre con el botón hamburguesa)
// -----------------------------------------------------------
function abrirMenuMovil() {
  document.getElementById('admin-sidebar').classList.add('abierto');
  document.getElementById('admin-sidebar-overlay').classList.add('abierto');
}

function cerrarMenuMovil() {
  document.getElementById('admin-sidebar')?.classList.remove('abierto');
  document.getElementById('admin-sidebar-overlay')?.classList.remove('abierto');
}

// -----------------------------------------------------------
// Inicialización (protegida por login de admin)
// -----------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const sesion = await protegerPaginaAdmin();
  if (!sesion) return;

  document.getElementById('admin-nombre').textContent = `Hola, ${sesion.adminNombre || sesion.user.email}`;
  document.getElementById('btn-logout').addEventListener('click', cerrarSesionAdmin);

  document.getElementById('admin-menu-toggle')?.addEventListener('click', abrirMenuMovil);
  document.getElementById('admin-sidebar-overlay')?.addEventListener('click', cerrarMenuMovil);

  document.querySelectorAll('.admin-nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      irASeccion(link.dataset.section);
    });
  });

  cargarDashboard();
});
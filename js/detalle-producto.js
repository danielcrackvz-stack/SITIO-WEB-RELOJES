/* =========================================================
   detalle-producto.js
   Lee el ?id= de la URL, trae ese producto de Supabase,
   arma la página de detalle y muestra 3 relacionados
   de la misma categoría.
   ========================================================= */

function obtenerIdDeUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function mediaGrandeProducto(producto) {
  if (producto.modelo_3d_url) {
    return `
      <model-viewer
        src="${producto.modelo_3d_url}"
        alt="${producto.nombre}"
        auto-rotate
        camera-controls
        shadow-intensity="1"
        style="width:100%;height:100%;background:transparent;"
      ></model-viewer>
    `;
  }
  if (producto.imagen_url) {
    return `<img src="${producto.imagen_url}" alt="${producto.nombre}">`;
  }
  return iconoRelojSVG;
}

async function iniciarDetalleProducto() {
  const contenedor = document.getElementById('detalle-producto');
  if (!contenedor) return;

  const id = obtenerIdDeUrl();
  if (!id) {
    contenedor.innerHTML = '<p style="padding:60px 0;text-align:center;color:var(--text-muted)">No se especificó qué reloj mostrar.</p>';
    return;
  }

  const producto = await obtenerProductoPorId(id);

  if (!producto) {
    contenedor.innerHTML = '<p style="padding:60px 0;text-align:center;color:var(--text-muted)">No encontramos ese reloj. Puede que ya no esté disponible.</p>';
    return;
  }

  document.title = `Relojería CRONOS — ${producto.nombre}`;

  contenedor.innerHTML = `
    <div class="detalle-grid">
      <div>
        <div class="detalle-stage">${mediaGrandeProducto(producto)}</div>
        <p class="detalle-rotar-hint">${producto.modelo_3d_url ? '↻ Arrastrá para rotar en 3D' : '360° · Vista del producto'}</p>
      </div>
      <div class="detalle-info">
        <span class="eyebrow">${producto.categoria}</span>
        <h1>${producto.nombre}</h1>
        <p class="detalle-precio">Bs ${producto.precio}</p>
        <p class="detalle-descripcion">${producto.descripcion || ''}</p>
        <div class="detalle-acciones">
          <a class="btn-whatsapp" href="${generarLinkWhatsApp(producto)}" target="_blank" rel="noopener">
            ${iconoWhatsAppSVG}
            Comprar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  `;

  cargarRelacionados(producto);
}

async function cargarRelacionados(productoActual) {
  const contenedorRel = document.getElementById('relacionados-grid');
  if (!contenedorRel) return;

  const todos = await obtenerProductos(false);
  const relacionados = todos
    .filter((p) => p.id !== productoActual.id && p.categoria === productoActual.categoria)
    .slice(0, 3);

  const listaFinal = relacionados.length > 0
    ? relacionados
    : todos.filter((p) => p.id !== productoActual.id).slice(0, 3);

  contenedorRel.innerHTML = listaFinal.map(tarjetaProducto).join('');
}

document.addEventListener('DOMContentLoaded', iniciarDetalleProducto);

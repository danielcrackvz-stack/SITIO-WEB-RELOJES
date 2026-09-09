/* =========================================================
   productos.js
   Trae los productos desde Supabase y los pinta en pantalla.
   Se usa en index.html (destacados), catalogo.html (todos,
   con filtro por categoría) y producto.html (relacionados).
   ========================================================= */

const iconoRelojSVG = `
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="32" cy="32" r="20"/>
    <path d="M32 20v12l8 6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M26 6h12M26 58h12" stroke-linecap="round"/>
  </svg>
`;

const iconoWhatsAppSVG = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.2 0-.3 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.2.9 2.4 1 2.6.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.2-.2-.5-.3z"/>
    <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3C4 14.9 3.6 13.5 3.6 12c0-4.6 3.8-8.4 8.4-8.4s8.4 3.8 8.4 8.4-3.8 8.4-8.4 8.4z"/>
  </svg>
`;

/**
 * Genera el link de WhatsApp con el mensaje pre-armado para un producto.
 */
function generarLinkWhatsApp(producto) {
  const mensaje = `Hola! Quiero comprar el reloj *${producto.nombre}* (Bs ${producto.precio}). ¿Está disponible?`;
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Trae productos de Supabase.
 * @param {boolean} soloDestacados - si es true, trae solo los marcados como destacado
 */
async function obtenerProductos(soloDestacados = false) {
  let query = supabaseClient.from('productos').select('*').order('creado_en', { ascending: false });

  if (soloDestacados) {
    query = query.eq('destacado', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error trayendo productos:', error.message);
    return [];
  }

  return data;
}

/**
 * Trae un producto puntual por su id.
 */
async function obtenerProductoPorId(id) {
  const { data, error } = await supabaseClient.from('productos').select('*').eq('id', id).single();

  if (error) {
    console.error('Error trayendo el producto:', error.message);
    return null;
  }

  return data;
}

/**
 * Genera el HTML de una tarjeta de producto. El nombre, la imagen/3D
 * y el precio llevan a la página de detalle; el botón de WhatsApp
 * queda aparte (no se puede anidar un link dentro de otro).
 */
function tarjetaProducto(producto) {
  const media = producto.modelo_3d_url
    ? `<model-viewer
         src="${producto.modelo_3d_url}"
         alt="${producto.nombre}"
         auto-rotate
         camera-controls
         disable-zoom
         shadow-intensity="1"
         style="width:100%;height:100%;background:transparent;"
       ></model-viewer>`
    : (producto.imagen_url
      ? `<img src="${producto.imagen_url}" alt="${producto.nombre}">`
      : iconoRelojSVG);

  return `
    <div class="product-card">
      <div class="product-media">
        <span class="view-badge">${producto.modelo_3d_url ? '3D' : '360°'}</span>
        ${media}
      </div>
      <div class="product-info">
        <span class="product-category">${producto.categoria}</span>
        <h3>${producto.nombre}</h3>
        <p class="product-price">Bs ${producto.precio}</p>
        <div class="product-actions">
          <a class="btn-detalle" href="producto.html?id=${producto.id}">Ver detalle</a>
          <a class="btn-whatsapp" href="${generarLinkWhatsApp(producto)}" target="_blank" rel="noopener">
            ${iconoWhatsAppSVG}
            Comprar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Busca un contenedor con id="product-grid" en la página
 * y lo llena con los productos traídos de Supabase.
 * Guarda la lista completa en el contenedor para poder filtrarla
 * sin volver a pedirle los datos a Supabase.
 */
async function renderizarProductos(soloDestacados = false) {
  const contenedor = document.getElementById('product-grid');
  if (!contenedor) return;

  contenedor.innerHTML = '<p style="color:var(--text-muted)">Cargando productos...</p>';

  const productos = await obtenerProductos(soloDestacados);
  contenedor.dataset.productos = JSON.stringify(productos);

  pintarProductos(productos);
}

function pintarProductos(productos) {
  const contenedor = document.getElementById('product-grid');
  if (!contenedor) return;

  if (productos.length === 0) {
    contenedor.innerHTML = '<p style="color:var(--text-muted)">No hay relojes en esta categoría todavía.</p>';
    return;
  }

  contenedor.innerHTML = productos.map(tarjetaProducto).join('');
}

/**
 * Conecta los tabs de filtro (Todos / Hombre / Mujer / Unisex) para
 * que filtren la lista ya cargada, sin volver a pedirla a Supabase.
 */
function iniciarFiltrosCategoria() {
  const tabs = document.querySelectorAll('.filter-tab');
  const contenedor = document.getElementById('product-grid');
  if (!tabs.length || !contenedor) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const categoria = tab.dataset.categoria;
      const todos = JSON.parse(contenedor.dataset.productos || '[]');
      const filtrados = categoria === 'todos'
        ? todos
        : todos.filter((p) => p.categoria === categoria);

      pintarProductos(filtrados);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const contenedor = document.getElementById('product-grid');
  if (!contenedor) return;

  // En index.html mostramos solo destacados, en catalogo.html todos
  const soloDestacados = contenedor.dataset.destacados === 'true';
  renderizarProductos(soloDestacados).then(iniciarFiltrosCategoria);
});
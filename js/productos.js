// js/productos.js

// 1. Función global para que chat-ia.js y otros módulos obtengan los relojes
window.obtenerProductos = async function() {
  let client = null;
  if (typeof supabaseClient !== "undefined") client = supabaseClient;
  else if (window._supabase) client = window._supabase;
  else if (typeof supabase !== "undefined" && typeof supabase.from === "function") client = supabase;
  else if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    const create = window.supabase?.createClient || createClient;
    client = create(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }

  if (!client) {
    console.error("Cliente Supabase no disponible.");
    return [];
  }

  try {
    const { data, error } = await client.from("productos").select("*");
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error al obtener productos:", err);
    return [];
  }
};

// 2. Renderizado del DOM para index.html y catalogo.html
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const esInicio = grid.getAttribute("data-destacados") === "true";
  let todosLosProductos = await window.obtenerProductos();

  // Vista Hero Banner para el inicio (en Bolivianos)
  function renderDestacadosHero(lista) {
    const destacados = lista.slice(0, 3);

    if (destacados.length === 0) {
      grid.innerHTML = `<p style="text-align: center; color: #888; padding: 40px 0;">No hay piezas destacadas disponibles.</p>`;
      return;
    }

    grid.innerHTML = destacados.map(item => {
      const nombre = item.nombre || item.titulo || "Reloj Cronos";
      const precio = item.precio || 0;
      const categoria = item.categoria || item.genero || "Edición Exclusiva";
      const descripcion = item.descripcion || "Mecanismo de alta precisión, acabados pulidos y diseño contemporáneo.";
      const imagen = item.imagen_url || item.imagen || item.foto || item.url_imagen || "img/logo-cronos.png";

      return `
        <article class="product-hero-banner" style="background-image: url('${imagen}');">
          <div class="product-hero-overlay"></div>
          <div class="product-hero-inner">
            <span class="product-hero-category">${categoria.toUpperCase()}</span>
            <h3 class="product-hero-title">${nombre}</h3>
            <p class="product-hero-desc">${descripcion}</p>
            
            <div class="product-hero-cta">
              <div class="product-hero-price">
                <span class="price-currency">Bs</span>
                <span class="price-val">${Number(precio).toLocaleString("es-BO", { minimumFractionDigits: 2 })}</span>
              </div>
              <a href="producto.html?id=${item.id}" class="btn-hero-order">
                <span>Ver en 3D / 360°</span>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  // Vista cuadrícula para catálogo (en Bolivianos)
  function renderCatalogoGrid(lista) {
    if (!lista || lista.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px 0;">No se encontraron relojes en esta categoría.</p>`;
      return;
    }

    grid.innerHTML = lista.map(item => {
      const nombre = item.nombre || item.titulo || "Reloj Cronos";
      const precio = item.precio || 0;
      const categoria = item.categoria || item.genero || "Colección";
      const imagen = item.imagen_url || item.imagen || item.foto || item.url_imagen || "img/logo-cronos.png";

      return `
        <article class="product-card">
          <div class="card-badge">360° Disponible</div>
          <a href="producto.html?id=${item.id}" class="product-card-media">
            <img src="${imagen}" alt="${nombre}" loading="lazy" class="product-thumb-img" onerror="this.src='img/logo-cronos.png'" />
          </a>
          <div class="product-card-body">
            <span class="product-category">${categoria.toUpperCase()}</span>
            <h3 class="product-card-title"><a href="producto.html?id=${item.id}">${nombre}</a></h3>
            <div class="product-card-footer">
              <span class="product-price">Bs ${Number(precio).toLocaleString("es-BO", { minimumFractionDigits: 2 })}</span>
              <a href="producto.html?id=${item.id}" class="btn-ver-detalle">Ver Detalles</a>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  if (esInicio) {
    renderDestacadosHero(todosLosProductos);
  } else {
    renderCatalogoGrid(todosLosProductos);
  }

  // Filtros del catálogo
  const filterTabs = document.querySelectorAll(".filter-tab");
  if (filterTabs.length > 0) {
    filterTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        filterTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const cat = (tab.getAttribute("data-categoria") || "").toLowerCase().trim();
        if (cat === "todos" || !cat) renderCatalogoGrid(todosLosProductos);
        else {
          renderCatalogoGrid(todosLosProductos.filter(p => (p.categoria || p.genero || "").toLowerCase().includes(cat)));
        }
      });
    });
  }
});

// Función global de WhatsApp requerida por chat-ia.js
window.generarLinkWhatsApp = function(producto, mensajePersonalizado) {
  const telefono = window.WHATSAPP_PHONE || "59173158851";
  const nombre = producto?.nombre || producto?.titulo || "este reloj";
  const texto = mensajePersonalizado || `Hola Cronos, me interesa el reloj ${nombre} que me recomendó el Asesor IA.`;
  return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
};
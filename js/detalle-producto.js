// js/detalle-producto.js

document.addEventListener("DOMContentLoaded", async () => {
  const viewer = document.getElementById("reloj-viewer");
  const progressBar = document.getElementById("progress-bar");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  const btnRotateToggle = document.getElementById("btn-rotate-toggle");
  const btnFrontCam = document.getElementById("btn-front-cam");
  const btnSideCam = document.getElementById("btn-side-cam");

  const elNombre = document.getElementById("producto-nombre");
  const elPrecio = document.getElementById("producto-precio");
  const elDescripcion = document.getElementById("producto-descripcion");
  const elCategoria = document.getElementById("producto-categoria");
  const elMaterial = document.getElementById("producto-material");
  const elMovimiento = document.getElementById("producto-movimiento");
  const elResistencia = document.getElementById("producto-resistencia");
  const btnWhatsapp = document.getElementById("btn-whatsapp-comprar");

  const urlParams = new URLSearchParams(window.location.search);
  const productoId = urlParams.get("id");

  if (!productoId) {
    if (elNombre) elNombre.textContent = "Producto no seleccionado";
    return;
  }

  // Identificar cliente Supabase
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
    return;
  }

  try {
    const { data: producto, error } = await client
      .from("productos")
      .select("*")
      .eq("id", productoId)
      .single();

    if (error || !producto) {
      if (elNombre) elNombre.textContent = "Reloj no disponible";
      return;
    }

    const nombre = producto.nombre || producto.titulo || "Reloj Cronos";
    const precio = producto.precio || producto.costo || 0;
    const descripcion = producto.descripcion || producto.detalle || "Pieza de precisión artesanal.";
    const categoria = producto.categoria || producto.tipo || "ALTA RELOJERÍA";
    const imagen = producto.imagen_url || producto.imagen || producto.foto || producto.url_imagen || "";
    const modelo3D = producto.modelo_3d_url || producto.modelo_glb_url || producto.modelo_3d || producto.modelo_glb || producto.archivo_3d || "";

    if (elNombre) elNombre.textContent = nombre;
    if (elPrecio) elPrecio.textContent = Number(precio).toLocaleString("es-BO", { minimumFractionDigits: 2 });
    if (elDescripcion) elDescripcion.textContent = descripcion;
    if (elCategoria) elCategoria.textContent = categoria.toUpperCase();

    if (elMaterial) elMaterial.textContent = producto.material || "Acero Quirúrgico / Zafiro";
    if (elMovimiento) elMovimiento.textContent = producto.movimiento || "Automático Suizo";
    if (elResistencia) elResistencia.textContent = producto.resistencia || "100m (10 ATM)";

    if (btnWhatsapp) {
      const telefono = window.WHATSAPP_PHONE || "59173158851";
      const msg = encodeURIComponent(`Hola Cronos, estoy interesado en el reloj: ${nombre} (Bs{precio})`);
      btnWhatsapp.href = `https://wa.me/${telefono}?text=${msg}`;
    }

    // Configuración del modelo 3D automático
    if (imagen) viewer.setAttribute("poster", imagen);
    if (modelo3D) {
      progressBar.classList.remove("hide");
      viewer.setAttribute("src", modelo3D);
    }

  } catch (err) {
    console.error("Error al obtener producto:", err);
  }

  // Progreso de carga
  viewer.addEventListener("progress", (e) => {
    const pct = Math.round(e.detail.totalProgress * 100);
    progressFill.style.width = `${pct}%`;
    progressText.textContent = `Cargando 3D... ${pct}%`;
  });

  viewer.addEventListener("load", () => {
    progressBar.classList.add("hide");
    viewer.autoRotate = true;
  });

  // Controles de cámara
  btnRotateToggle.addEventListener("click", () => {
    viewer.autoRotate = !viewer.autoRotate;
    btnRotateToggle.classList.toggle("active", viewer.autoRotate);
  });

  btnFrontCam.addEventListener("click", () => {
    viewer.cameraOrbit = "0deg 75deg 105%";
    viewer.jumpCameraToGoal();
  });

  btnSideCam.addEventListener("click", () => {
    viewer.cameraOrbit = "90deg 80deg 105%";
    viewer.jumpCameraToGoal();
  });
});
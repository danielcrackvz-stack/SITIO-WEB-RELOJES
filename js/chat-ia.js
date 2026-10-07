/* =========================================================
   chat-ia.js
   1) Cuestionario guiado (CRONOAI) de 6 preguntas con botones
   2) Sistema de puntaje que arma un ranking de coincidencia
   3) Muestra los mejores relojes con botón de detalle y WhatsApp
   4) Después habilita el chat libre con Gemini (vía Edge Function),
      ya con el contexto de lo que el cliente respondió.
   ========================================================= */

// -----------------------------------------------------------
// Banco de preguntas
// -----------------------------------------------------------
const PREGUNTAS_CRONOAI = [
  {
    id: 'genero',
    texto: '¡Hola! 👋 Soy CRONOAI. Respondé estas 6 preguntas y te recomiendo el reloj ideal.\n\n1/6 ¿Para quién buscás el reloj?',
    opciones: [
      { label: 'Varón', valor: 'hombre' },
      { label: 'Mujer', valor: 'mujer' },
      { label: 'Unisex', valor: 'unisex' },
    ],
  },
  {
    id: 'estilo',
    texto: '2/6 ¿Qué estilo de reloj buscás?',
    opciones: [
      { label: 'De vestir', valor: 'De vestir' },
      { label: 'Deportivo', valor: 'Deportivo' },
      { label: 'Clásico', valor: 'Clásico' },
      { label: 'Elegante', valor: 'Elegante' },
    ],
  },
  {
    id: 'tipoCorrea',
    texto: '3/6 ¿Qué tipo de correa preferís?',
    opciones: [
      { label: 'Metal', valor: 'Metal' },
      { label: 'Cuero', valor: 'Cuero' },
    ],
  },
  {
    id: 'colorCorrea',
    texto: '4/6 ¿Qué color de correa preferís?',
    opcionesPorCorrea: {
      Metal: [
        { label: 'Dorado', valor: 'Dorado' },
        { label: 'Plateado', valor: 'Plateado' },
        { label: 'Negro', valor: 'Negro' },
      ],
      Cuero: [
        { label: 'Marrón', valor: 'Marrón' },
        { label: 'Negro', valor: 'Negro' },
        { label: 'Azul', valor: 'Azul' },
      ],
    },
  },
  {
    id: 'esfera',
    texto: '5/6 ¿Qué diseño de esfera preferís?',
    opciones: [
      { label: 'Cronógrafo', valor: 'Cronógrafo' },
      { label: 'Con números', valor: 'Con números' },
      { label: 'Con detalles decorativos', valor: 'Con detalles' },
    ],
  },
  {
    id: 'presupuesto',
    texto: '6/6 ¿Cuál es tu presupuesto aproximado?',
    opciones: [
      { label: 'Bs. 100 - 300', valor: [100, 300] },
      { label: 'Bs. 301 - 600', valor: [301, 600] },
      { label: 'Bs. 601 - 900', valor: [601, 900] },
      { label: 'Más de Bs. 900', valor: [901, Infinity] },
      { label: 'Me es indiferente', valor: null },
    ],
  },
];

let indicePregunta = 0;
let respuestasUsuario = {};
let historialChat = [];
let promptSistema = '';

// Helper de seguridad para obtener el cliente de Supabase
function obtenerClienteSupabase() {
  if (typeof supabaseClient !== "undefined") return supabaseClient;
  if (window._supabase) return window._supabase;
  if (typeof supabase !== "undefined" && typeof supabase.functions !== "undefined") return supabase;
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    const create = window.supabase?.createClient || createClient;
    return create(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
  return null;
}

// -----------------------------------------------------------
// UI: pintar mensajes y opciones en pantalla
// -----------------------------------------------------------
function pintarMensaje(texto, esUsuario = false) {
  const contenedor = document.getElementById('chat-messages');
  const burbuja = document.createElement('div');
  burbuja.className = esUsuario ? 'msg msg-user' : 'msg msg-bot';
  burbuja.style.whiteSpace = 'pre-line';
  burbuja.textContent = texto;
  contenedor.appendChild(burbuja);
  contenedor.scrollTop = contenedor.scrollHeight;
  return burbuja;
}

function mostrarEscribiendo() {
  const burbuja = pintarMensaje('Escribiendo...', false);
  burbuja.classList.add('msg-typing');
  return burbuja;
}

function pintarOpciones(opciones, onElegir) {
  const contenedor = document.getElementById('chat-messages');
  const fila = document.createElement('div');
  fila.className = 'chat-options';

  opciones.forEach((opcion) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'chat-option-btn';
    boton.textContent = opcion.label;
    boton.addEventListener('click', () => {
      fila.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      fila.classList.add('chat-options-elegido');
      onElegir(opcion);
    });
    fila.appendChild(boton);
  });

  contenedor.appendChild(fila);
  contenedor.scrollTop = contenedor.scrollHeight;
}

// -----------------------------------------------------------
// Flujo del cuestionario
// -----------------------------------------------------------
function hacerPregunta(indice) {
  if (indice >= PREGUNTAS_CRONOAI.length) {
    mostrarResultados();
    return;
  }

  const pregunta = PREGUNTAS_CRONOAI[indice];
  pintarMensaje(pregunta.texto, false);

  const opciones = pregunta.opcionesPorCorrea
    ? pregunta.opcionesPorCorrea[respuestasUsuario.tipoCorrea]
    : pregunta.opciones;

  pintarOpciones(opciones, (opcionElegida) => {
    pintarMensaje(opcionElegida.label, true);
    respuestasUsuario[pregunta.id] = opcionElegida.valor;
    indicePregunta = indice + 1;
    setTimeout(() => hacerPregunta(indicePregunta), 350);
  });
}

// -----------------------------------------------------------
// Sistema de puntaje (100 pts en total)
// -----------------------------------------------------------
function calcularCoincidencia(producto, respuestas) {
  let puntos = 0;

  if (producto.categoria === 'unisex' || producto.categoria === respuestas.genero) puntos += 20;
  if (producto.estilo === respuestas.estilo) puntos += 20;
  if (producto.tipo_correa === respuestas.tipoCorrea) puntos += 20;
  if (producto.color_correa === respuestas.colorCorrea) puntos += 15;
  if (producto.diseno_esfera === respuestas.esfera) puntos += 15;

  const rango = respuestas.presupuesto;
  const dentroDeRango = !rango || (producto.precio >= rango[0] && producto.precio <= rango[1]);
  if (dentroDeRango) puntos += 10;

  return puntos;
}

async function mostrarResultados() {
  const indicador = mostrarEscribiendo();
  
  // Llamada segura a obtenerProductos
  let productos = [];
  if (typeof window.obtenerProductos === 'function') {
    productos = await window.obtenerProductos();
  } else {
    const client = obtenerClienteSupabase();
    if (client) {
      const { data } = await client.from('productos').select('*');
      productos = data || [];
    }
  }

  indicador.remove();

  const rango = respuestasUsuario.presupuesto;
  let candidatos = productos;
  let dentroDePresupuesto = true;

  if (rango) {
    const filtrados = productos.filter((p) => p.precio >= rango[0] && p.precio <= rango[1]);
    if (filtrados.length > 0) {
      candidatos = filtrados;
    } else {
      dentroDePresupuesto = false;
    }
  }

  const puntuados = candidatos
    .map((producto) => ({ producto, score: calcularCoincidencia(producto, respuestasUsuario) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!dentroDePresupuesto) {
    pintarMensaje('No tenemos relojes disponibles exactamente en ese rango, pero estas piezas se acercan bastante a lo que buscas:', false);
  } else {
    pintarMensaje('¡Listo! Estos son los relojes que mejor coinciden con tus preferencias:', false);
  }

  pintarResultados(puntuados);

  pintarMensaje('¿Tenés alguna otra duda o consulta sobre estas piezas? Podés seguir escribiéndome aquí abajo.', false);

  promptSistema = await construirPromptSistema(puntuados);
  habilitarChatLibre();
}

function pintarResultados(puntuados) {
  const contenedor = document.getElementById('chat-messages');
  const bloque = document.createElement('div');
  bloque.className = 'chat-resultados';

  bloque.innerHTML = puntuados.map(({ producto, score }) => {
    const glbUrl = producto.modelo_3d_url || producto.modelo_glb_url || producto.modelo_3d || producto.modelo_glb || producto.archivo_3d;
    const imgUrl = producto.imagen_url || producto.imagen || producto.foto || producto.url_imagen || "img/logo-cronos.png";
    const telefono = window.WHATSAPP_PHONE || "59170000000";
    const linkWhatsApp = window.generarLinkWhatsApp 
      ? window.generarLinkWhatsApp(producto) 
      : `https://wa.me/${telefono}?text=${encodeURIComponent(`Hola Cronos, me interesa el reloj ${producto.nombre} (Bs${producto.precio}) que me recomendó el Asesor IA.`)}`;

    return `
      <div class="chat-resultado-card">
        <div class="chat-resultado-media">
          ${glbUrl ? `
            <model-viewer
              src="${glbUrl}"
              poster="${imgUrl}"
              camera-controls
              auto-rotate
              disable-zoom
              interaction-prompt="none"
              style="width: 100%; height: 100%; background: transparent;"
              loading="lazy">
            </model-viewer>
          ` : `
            <img src="${imgUrl}" alt="${producto.nombre}" />
          `}
        </div>
        <div class="chat-resultado-info">
          <span class="chat-resultado-match">${score > 0 ? score + '% Coincidencia' : 'Recomendado'}</span>
          <h4>${producto.nombre}</h4>
          <div class="chat-resultado-precio">Bs ${Number(producto.precio || 0).toLocaleString("es-BO", { minimumFractionDigits: 2 })}</div>
          <div class="chat-resultado-acciones">
            <a href="producto.html?id=${producto.id}" class="btn-detalle" style="padding: 7px 12px; font-size: 12px; text-decoration: none; background: #111; color: #fff; border-radius: 4px; text-align: center; font-weight: 600;">Ver en 360°</a>
            <a href="${linkWhatsApp}" target="_blank" class="btn-whatsapp" style="padding: 7px 12px; font-size: 12px; text-decoration: none; background: #25D366; color: #fff; border-radius: 4px; text-align: center; font-weight: 600;">WhatsApp</a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  contenedor.appendChild(bloque);
  contenedor.scrollTop = contenedor.scrollHeight;
}

// -----------------------------------------------------------
// Chat libre con Gemini (después del cuestionario)
// -----------------------------------------------------------
async function construirPromptSistema(puntuados) {
  let productos = [];
  if (typeof window.obtenerProductos === 'function') {
    productos = await window.obtenerProductos();
  } else {
    const client = obtenerClienteSupabase();
    if (client) {
      const { data } = await client.from('productos').select('*');
      productos = data || [];
    }
  }

  const listaProductos = productos
    .map((p) => `- ${p.nombre} | ${p.categoria} | Bs ${p.precio} | ${p.estilo || ''} | correa ${p.tipo_correa || ''} ${p.color_correa || ''} | esfera ${p.diseno_esfera || ''}`)
    .join('\n');

  const resumenRecomendados = puntuados
    .map(({ producto, score }) => `- ${producto.nombre} (Bs ${producto.precio}, ${score}% de coincidencia)`)
    .join('\n');

  return `Sos el asesor virtual de Cronos, una relojería exclusiva en Bolivia que vende relojes y atiende por WhatsApp.

El cliente ya respondió un cuestionario de preferencias:
${JSON.stringify(respuestasUsuario)}

Y ya le mostraste estas recomendaciones:
${resumenRecomendados}

Este es el catálogo completo disponible:
${listaProductos}

Reglas importantes:
- Respondé en español con tono amable, elegante y profesional.
- Moneda: siempre en bolivianos (Bs).
- Respuestas cortas: máximo 3 o 4 oraciones.
- Solo recomendá productos existentes en el catálogo; nunca inventes modelos ni precios.
- Si piden algo distinto a lo recomendado, busca en la lista de arriba y sugiere piezas por su nombre exacto.
- Si consultan sobre compras o envíos, recuérdales que pueden coordinar directamente por WhatsApp.`;
}

async function preguntarAGemini(mensajeUsuario) {
  historialChat.push({ role: 'user', parts: [{ text: mensajeUsuario }] });

  const client = obtenerClienteSupabase();
  if (!client) {
    throw new Error('No se pudo establecer conexión con el servidor.');
  }

  const { data, error } = await client.functions.invoke('chat-ia', {
    body: { promptSistema, historial: historialChat },
  });

  if (error) {
    console.error('Error llamando a la función:', error);
    throw new Error('No se pudo contactar al asesor. Intenta de nuevo en un momento.');
  }

  const textoRespuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text
    || data?.respuesta
    || 'Disculpa, no pude procesar esa consulta. ¿Podrías reformularla?';

  historialChat.push({ role: 'model', parts: [{ text: textoRespuesta }] });
  return textoRespuesta;
}

async function enviarMensajeLibre(texto) {
  if (!texto.trim()) return;

  pintarMensaje(texto, true);
  const indicador = mostrarEscribiendo();

  const input = document.querySelector('.chat-input input');
  const boton = document.querySelector('.chat-send');
  input.value = '';
  input.disabled = true;
  boton.disabled = true;

  try {
    const respuesta = await preguntarAGemini(texto);
    indicador.remove();
    pintarMensaje(respuesta, false);
  } catch (error) {
    indicador.remove();
    pintarMensaje(error.message, false);
  } finally {
    input.disabled = false;
    boton.disabled = false;
    input.focus();
  }
}

function habilitarChatLibre() {
  const input = document.querySelector('.chat-input input');
  const boton = document.querySelector('.chat-send');
  input.disabled = false;
  boton.disabled = false;
  input.placeholder = 'Escribe tu consulta aquí...';
  input.focus();
}

// -----------------------------------------------------------
// Inicialización de la página del chat
// -----------------------------------------------------------
function iniciarChat() {
  const form = document.getElementById('chat-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    enviarMensajeLibre(input.value);
  });

  hacerPregunta(0);
}

document.addEventListener('DOMContentLoaded', iniciarChat);
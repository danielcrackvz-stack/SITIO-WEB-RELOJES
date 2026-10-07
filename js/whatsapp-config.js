// js/whatsapp-config.js

window.WHATSAPP_PHONE = "59173158851";

window.generarLinkWhatsApp = function(producto, mensajeCustom) {
  const telefono = window.WHATSAPP_PHONE || "59173158851";
  
  if (mensajeCustom) {
    return "https://wa.me/" + telefono + "?text=" + encodeURIComponent(mensajeCustom);
  }

  const nombre = (producto && (producto.nombre || producto.titulo)) ? (producto.nombre || producto.titulo) : "Reloj Cronos";
  const precio = (producto && producto.precio) ? Number(producto.precio).toFixed(2) : "0.00";

  const texto = "¡Hola Relojería Cronos! Estoy interesado en adquirir el siguiente modelo:\n\n" +
                "• Pieza: " + nombre + "\n" +
                "• Precio: Bs " + precio + "\n\n" +
                "¿Tienen disponibilidad para coordinar la entrega?";

  return "https://wa.me/" + telefono + "?text=" + encodeURIComponent(texto);
};
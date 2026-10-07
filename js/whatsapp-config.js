// js/whatsapp-config.js

// Configuración centralizada de WhatsApp para Relojería Cronos
// Reemplaza con tu número de WhatsApp real (código de país 591 + número)
window.WHATSAPP_PHONE = "59173158851";

// Generador global de enlaces para WhatsApp sin caracteres extraños
window.generarLinkWhatsApp = function(producto, mensajeCustom) {
  const telefono = window.WHATSAPP_PHONE || "59173158851";
  
  if (mensajeCustom) {
    return `https://wa.me/${telefono}?text=${encodeURIComponent(mensajeCustom)}`;
  }

  const nombre = producto?.nombre || producto?.titulo || "Reloj Cronos";
  const precio = producto?.precio ? Number(producto.precio).toLocaleString("es-BO", { minimumFractionDigits: 2 }) : null;

  let texto = `¡Hola Relojería Cronos! Estoy interesado en adquirir el siguiente modelo:\n\n`;
  texto += `• Pieza: ${nombre}\n`;
  if (precio) {
    texto += `• Precio: Bs. ${precio}\n`;
  }
  texto += `\n¿Tienen disponibilidad para coordinar la entrega?`;

  return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
};
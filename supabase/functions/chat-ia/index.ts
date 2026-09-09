// =========================================================
// supabase/functions/chat-ia/index.ts
// Edge Function: recibe el mensaje del cliente, llama a Gemini
// con la API key guardada como secreto (nunca viaja al navegador)
// y devuelve la respuesta.
// =========================================================

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODELO = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELO}:generateContent`;

// Encabezados CORS: necesarios para que tu sitio (el navegador)
// pueda llamar a esta función.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // El navegador manda una petición OPTIONS antes del POST real (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Diagnóstico: si la key no está configurada, avisar claro en vez de fallar oscuro
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY no está configurada como secreto.');
    return new Response(
      JSON.stringify({ error: 'Falta configurar GEMINI_API_KEY en los secretos de Supabase.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }

  try {
    const { promptSistema, historial } = await req.json();

    const respuestaGemini = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: promptSistema }] },
        contents: historial,
      }),
    });

    const data = await respuestaGemini.json();

    // Log de diagnóstico: si Gemini devuelve error, lo vemos en los Logs de Supabase
    if (!respuestaGemini.ok) {
      console.error('Gemini respondió con error:', respuestaGemini.status, JSON.stringify(data));
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: respuestaGemini.status,
    });
  } catch (error) {
    console.error('Error inesperado en la función:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
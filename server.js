<<<<<<< HEAD
// ==========================================
// 🤖 Webhook Dialogflow - Universidad del Quindío
// Con caché y logs detallados para Telegram
// ==========================================

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");

const app = express();
app.use(express.json());

// 🕒 Caché de 12 horas
const cache = new NodeCache({ stdTTL: 60 * 60 * 12 });

// =======================================================
// 🧠 FUNCIÓN: Obtener fechas académicas de Uniquindío
// =======================================================
async function obtenerFechasUniquindio() {
  const cacheKey = "fechas_uniquindio";
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log("📦 [CACHE] Datos obtenidos desde caché");
    return cached;
  }

  console.log("🌐 [WEB] Solicitando datos desde el portal Uniquindío...");
  try {
    const url =
      "https://www.uniquindio.edu.co/actividades-por-subcategoria/4/consulta/";
    const { data } = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(data);
    const actividades = [];

    $(".actividad").each((i, el) => {
      const titulo = $(el).find(".titulo").text().trim();
      const fecha = $(el).find(".fecha").text().trim();
      if (titulo && fecha) {
        actividades.push({ titulo, fecha });
      }
    });

    if (actividades.length === 0) {
      console.log("⚠️ [SCRAPER] No se encontraron actividades válidas");
      return "⚠️ No se encontraron fechas académicas en el sitio oficial.";
    }

    // Filtrar solo fechas del año actual
    const añoActual = new Date().getFullYear();
    const actividades2025 = actividades.filter(
      (a) => a.fecha.includes(añoActual) || a.titulo.includes(añoActual)
    );

    let respuesta = `📅 *Fechas Académicas ${añoActual} (Modalidad Presencial)*\n\n`;
    if (actividades2025.length === 0) {
      respuesta += "⚠️ No hay eventos registrados para este año.";
    } else {
      actividades2025.forEach((a) => {
        respuesta += `🟢 *${a.titulo}*\n  • ${a.fecha}\n`;
      });
    }

    // Guardar en caché
    cache.set(cacheKey, respuesta);
    console.log("✅ [SCRAPER] Fechas obtenidas correctamente.");
    return respuesta;
  } catch (error) {
    console.error("❌ [ERROR SCRAPER]:", error.message);
    const previo = cache.get(cacheKey);
    if (previo) {
      console.log("⚠️ [FALLBACK] Enviando datos previos desde caché");
      return (
        "⚠️ No se pudo actualizar la información, mostrando los últimos datos almacenados:\n\n" +
        previo
      );
    }
    return (
      "⚠️ Error al obtener las fechas académicas. Intenta nuevamente más tarde."
    );
  }
}

// =======================================================
// 🧩 ENDPOINT PRINCIPAL DEL WEBHOOK
// =======================================================
app.post("/webhook", async (req, res) => {
  const body = req.body;
  const intent = body.queryResult?.intent?.displayName || "Desconocido";
  const source = body.originalDetectIntentRequest?.source || "Desconocido";
  const userText = body.queryResult?.queryText || "No detectado";

  console.log("==============================================");
  console.log(`💬 [ENTRADA] Mensaje del usuario: "${userText}"`);
  console.log(`🧠 [INTENT DETECTADO]: ${intent}`);
  console.log(`📱 [ORIGEN]: ${source}`);
  console.log("==============================================");

  try {
    if (intent === "Fechas importantes") {
      console.log("🕓 [WEBHOOK] Procesando intent de fechas importantes...");

      const respuesta = await obtenerFechasUniquindio();

      console.log("🧾 [RESPUESTA GENERADA]:");
      console.log(respuesta.substring(0, 200) + "...");

      // Enviar respuesta limpia compatible con Telegram
      res.json({
        fulfillmentText: respuesta,
        fulfillmentMessages: [
          {
            text: {
              text: [respuesta],
            },
          },
        ],
      });
    } else {
      console.log("❌ [INTENT NO MANEJADO]");
      res.json({
        fulfillmentText: "No encontré información sobre esa intención.",
      });
    }
  } catch (err) {
    console.error("💥 [ERROR GENERAL EN WEBHOOK]:", err.message);
    res.json({
      fulfillmentText:
        "⚠️ Ocurrió un error interno en el servidor. Intenta nuevamente más tarde.",
    });
  }
});

// =======================================================
// 🔥 SERVIDOR ACTIVO
// =======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook activo y escuchando en puerto ${PORT}`);
});
=======
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PYTHON_API = process.env.PYTHON_API || "http://localhost:5000/fechas";

app.post("/webhook", async (req, res) => {
  const intent = req.body.queryResult?.intent?.displayName || "Desconocido";
  console.log(`🧠 Intent detectado: ${intent}`);

  try {
    if (intent === "Fechas importantes") {
      console.log("🌐 Solicitando datos al microservicio Python...");
      const { data } = await axios.get(PYTHON_API, { timeout: 20000 });

      console.log("✅ Respuesta obtenida del scraper");
      console.log(data.mensaje.substring(0, 200) + "...");

      res.json({
        fulfillmentText: data.mensaje,
        fulfillmentMessages: [{ text: { text: [data.mensaje] } }],
      });
    } else {
      res.json({ fulfillmentText: "No encontré información para esa intención." });
    }
  } catch (error) {
    console.error("❌ Error al comunicar con el scraper:", error.message);
    res.json({
      fulfillmentText:
        "⚠️ No se pudo obtener la información académica. Intenta más tarde.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webhook activo en puerto ${PORT}`));
>>>>>>> 762a4c8 (Proyecto chatbot Uniquindío Node + Python)

// ==========================================
// Webhook Dialogflow - Universidad del Quindío
// Con caché de resultados (12 horas)
// ==========================================

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");

const app = express();
app.use(express.json());

// 🕒 Caché con duración de 12 horas
const cache = new NodeCache({ stdTTL: 60 * 60 * 12 });

// 🔎 Función que obtiene las fechas desde la web
async function obtenerFechasUniquindio() {
  const cacheKey = "fechas_uniquindio";
  const cached = cache.get(cacheKey);

  // Si hay datos guardados, los devolvemos
  if (cached) {
    console.log("📦 Datos obtenidos desde caché");
    return cached;
  }

  console.log("🌐 Obteniendo datos desde la web...");
  try {
    const url = "https://www.uniquindio.edu.co/actividades-por-subcategoria/4/consulta/";
    const { data } = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(data);
    const actividades = [];

    // Extraer actividades
    $(".actividad").each((i, el) => {
      const titulo = $(el).find(".titulo").text().trim();
      const fecha = $(el).find(".fecha").text().trim();
      if (titulo && fecha) {
        actividades.push(`• ${titulo}: ${fecha}`);
      }
    });

    let respuesta;
    if (actividades.length === 0) {
      respuesta =
        "⚠️ No se encontraron fechas en el sitio de la Universidad del Quindío.";
    } else {
      respuesta = "📅 Fechas académicas actuales:\n" + actividades.join("\n");
      cache.set(cacheKey, respuesta); // Guardar en caché
    }

    return respuesta;
  } catch (error) {
    console.error("❌ Error al obtener fechas:", error.message);
    // Si hay datos cacheados previos, devolverlos
    const previo = cache.get(cacheKey);
    if (previo) {
      return (
        "⚠️ No se pudo actualizar, mostrando la información anterior:\n" + previo
      );
    }
    return "Lo siento, no pude acceder a las fechas académicas de la Universidad del Quindío.";
  }
}

// 🧩 Endpoint principal del webhook
app.post("/webhook", async (req, res) => {
  const intent = req.body?.queryResult?.intent?.displayName || "Desconocido";
  console.log("🧠 Intent recibido desde Dialogflow:", intent);

  try {
    // Detectar si el intent es el correcto (sin importar mayúsculas ni guiones)
    if (intent.toLowerCase().includes("fecha")) {
      const respuesta = await obtenerFechasUniquindio();
      console.log("✅ Enviando respuesta al intent:", respuesta);
      res.json({ fulfillmentText: respuesta });
    } else {
      console.log("❌ Intent no reconocido:", intent);
      res.json({
        fulfillmentText:
          "No encontré información sobre esa intención (intent no reconocido).",
      });
    }
  } catch (error) {
    console.error("🔥 Error en el webhook:", error);
    res.json({
      fulfillmentText: "Ocurrió un error interno en el servidor del webhook.",
    });
  }
});

// ✅ Endpoint GET simple (para probar en navegador)
app.get("/", (req, res) => {
  res.send("✅ Webhook del Chatbot Universidad del Quindío está activo.");
});

// 🔥 Puerto dinámico para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Webhook activo en puerto ${PORT}`)
);

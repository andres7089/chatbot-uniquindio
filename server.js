// ==========================================
// Webhook Dialogflow - Universidad del Quindío
// Limpio para Telegram / Dialogflow
// ==========================================

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");

const app = express();
app.use(express.json());

// 🕒 Caché de 12 horas
const cache = new NodeCache({ stdTTL: 60 * 60 * 12 });

// 🔍 Función: obtener las fechas académicas
async function obtenerFechasUniquindio() {
  const cacheKey = "fechas_uniquindio";
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    console.log("🌐 Obteniendo datos desde la web...");
    const url = "https://www.uniquindio.edu.co/actividades-por-subcategoria/4/consulta/";
    const { data } = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(data);

    const actividades = [];

    // Seleccionar las filas de actividades (basadas en tu imagen)
    $(".actividad, .col-md-12, .row").each((i, el) => {
      const titulo = $(el).find("p, strong, b").first().text().trim();
      const fecha = $(el)
        .find("span")
        .map((i, span) => $(span).text().trim())
        .get()
        .filter((t) => /\d{4}/.test(t)) // solo fechas con años
        .join(" | ");

      if (titulo && fecha) {
        actividades.push(`- ${titulo}: ${fecha}`);
      }
    });

    // Eliminar duplicados y texto basura
    const filtradas = actividades.filter(
      (linea) =>
        !/Tamaño de la letra|Campus Virtual|Buscar|Accesibilidad/i.test(linea)
    );

    let respuesta;
    if (filtradas.length === 0) {
      respuesta = "⚠️ No se encontraron fechas académicas en la página oficial.";
    } else {
      respuesta =
        "Fechas académicas actuales (Modalidad Presencial):\n\n" +
        filtradas.join("\n");
      cache.set(cacheKey, respuesta);
    }

    return respuesta;
  } catch (error) {
    console.error("❌ Error al obtener fechas:", error.message);
    const previo = cache.get(cacheKey);
    if (previo)
      return (
        "⚠️ No se pudo actualizar, mostrando la información anterior:\n\n" +
        previo
      );
    return "No pude acceder a las fechas académicas en este momento.";
  }
}

// 🎯 Webhook principal
app.post("/webhook", async (req, res) => {
  const intent = req.body?.queryResult?.intent?.displayName || "Desconocido";
  console.log("🧠 Intent recibido:", intent);

  if (intent.toLowerCase().includes("fecha")) {
    const respuesta = await obtenerFechasUniquindio();
    console.log("✅ Enviando respuesta limpia al intent");
    res.json({ fulfillmentText: respuesta });
  } else {
    res.json({
      fulfillmentText: "No encontré información para ese intento.",
    });
  }
});

// 🏠 Endpoint raíz
app.get("/", (req, res) =>
  res.send("Webhook activo - Universidad del Quindío (versión limpia)")
);

// 🔥 Puerto dinámico para Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));

// ==========================================
// Webhook Dialogflow - Universidad del Quindío
// Fechas Académicas filtradas (solo año actual)
// ==========================================

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");

const app = express();
app.use(express.json());

// 🕒 Cache de 12 horas
const cache = new NodeCache({ stdTTL: 60 * 60 * 12 });

// 🔍 Función para obtener fechas desde la web
async function obtenerFechasUniquindio() {
  const cacheKey = "fechas_uniquindio";
  const cached = cache.get(cacheKey);
  const anioActual = new Date().getFullYear();

  if (cached) {
    console.log("📦 Datos obtenidos desde caché");
    return cached;
  }

  console.log(`🌐 Obteniendo fechas académicas ${anioActual} desde la web...`);

  try {
    const url = "https://www.uniquindio.edu.co/actividades-por-subcategoria/4/consulta/";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    // Extraer texto visible y limpiar basura
    let textos = [];
    $("body *")
      .contents()
      .each(function () {
        if (this.type === "text") {
          const txt = $(this).text().trim();
          if (
            txt &&
            !/Tamaño|Accesibilidad|Campus Virtual|Buscar|Idioma|PQRSDF|Horario|Teléfono|Línea|Universidad del Quindío|Emisora|Carrera|atención/i.test(
              txt
            )
          ) {
            textos.push(txt);
          }
        }
      });

    // Procesar texto para obtener actividades y fechas
    const actividades = [];
    let i = 0;
    while (i < textos.length) {
      const linea = textos[i];

      if (!/\d/.test(linea) && linea.length > 5) {
        const titulo = linea;
        const fechas = [];
        i++;
        while (i < textos.length && /\d/.test(textos[i])) {
          fechas.push(textos[i]);
          i++;
        }
        if (fechas.length > 0) {
          actividades.push({ titulo, fechas });
        }
      } else {
        i++;
      }
    }

    // Agrupar por periodo
    const agrupadas = {};
    for (const act of actividades) {
      const { titulo, fechas } = act;
      for (let j = 0; j < fechas.length; j += 2) {
        const fechaTexto = fechas[j];
        const periodo = fechas[j + 1] || "N/A";
        if (!agrupadas[periodo]) agrupadas[periodo] = [];
        agrupadas[periodo].push({ titulo, fecha: fechaTexto });
      }
    }

    // Filtrar solo por año actual
    const filtradas = Object.entries(agrupadas).filter(
      ([periodo, acts]) =>
        periodo.includes(anioActual.toString()) ||
        acts.some((a) => a.fecha.includes(anioActual.toString()))
    );

    if (filtradas.length === 0) {
      return `⚠️ No se encontraron fechas académicas para el año ${anioActual}.`;
    }

    // Construir respuesta
    let respuesta = `📅 *Fechas Académicas ${anioActual} (Modalidad Presencial)*\n\n`;
    for (const [periodo, acts] of filtradas) {
      respuesta += `📘 *Periodo ${periodo}*\n`;
      for (const a of acts) {
        respuesta += `🟢 *${a.titulo}*\n  • ${a.fecha}\n`;
      }
      respuesta += "\n";
    }

    cache.set(cacheKey, respuesta);
    console.log("✅ Fechas obtenidas correctamente.");
    return respuesta.trim();
  } catch (err) {
    console.error("❌ Error al obtener fechas:", err.message);
    return "⚠️ No se pudieron obtener las fechas académicas actualmente.";
  }
}

// 🎯 Webhook principal
app.post("/webhook", async (req, res) => {
  const intent = req.body.queryResult?.intent?.displayName;
  console.log("🧠 Intent recibido:", intent);

  if (intent === "Fechas importantes") {
    const respuesta = await obtenerFechasUniquindio();
    console.log("✅ Enviando respuesta limpia al intent.");
    res.json({ fulfillmentText: respuesta });
  } else {
    res.json({ fulfillmentText: "No encontré información sobre esa intención." });
  }
});

// 🔥 Puerto dinámico (Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Webhook activo en puerto ${PORT}`));

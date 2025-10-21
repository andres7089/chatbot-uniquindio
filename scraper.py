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

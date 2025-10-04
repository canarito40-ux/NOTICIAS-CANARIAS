// api/generate.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: "Falta el tema de la noticia." });
  }

  try {
    const apiKey = process.env.API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: `Escribe una noticia deportiva sobre "${topic}"` }] }],
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar la noticia.";

    res.status(200).json({ news: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al generar la noticia." });
  }
}

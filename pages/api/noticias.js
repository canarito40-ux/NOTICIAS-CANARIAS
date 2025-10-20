import Parser from "rss-parser";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // 1. Feeds RSS reales de Canarias y deportes
    const feeds = [
      "https://www.canarias7.es/rss/",
      "https://eldia.es/rss",
      "https://e00-marca.uecdn.es/rss/portada.xml"
    ];

    const parser = new Parser();
    let allNews = [];

    // 2. Leer los feeds y recoger noticias
    for (const feedUrl of feeds) {
      const feed = await parser.parseURL(feedUrl);
      const items = feed.items.slice(0, 3); // Solo las 3 más recientes
      allNews.push(...items);
    }

    // 3. Reescribir con Gemini
    const rewrittenNews = await Promise.all(
      allNews.map(async (item) => {
        const prompt = `
        Reescribe la siguiente noticia de forma profesional y natural, sin inventar datos nuevos.
        Título: ${item.title}
        Contenido: ${item.contentSnippet || item.content}
        Devuélvela en formato Markdown.
        `;

        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
            process.env.GEMINI_API_KEY,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        const data = await response.json();
        const texto =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "No se pudo reescribir esta noticia.";

        return {
          titulo_original: item.title,
          link: item.link,
          noticia_reescrita: texto,
        };
      })
    );

    res.status(200).json(rewrittenNews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al procesar las noticias" });
  }
}


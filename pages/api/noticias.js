import Parser from "rss-parser";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // 1️⃣ Verificamos si la API KEY existe
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY no está definida en Vercel");
    }

    const feeds = [
      "https://www.canarias7.es/rss/",
      "https://eldia.es/rss",
      "https://e00-marca.uecdn.es/rss/portada.xml"
    ];

    const parser = new Parser();
    let allNews = [];

    for (const feedUrl of feeds) {
      try {
        const feed = await parser.parseURL(feedUrl);
        const items = feed.items.slice(0, 3);
        allNews.push(...items);
      } catch (rssError) {
        console.error(`Error leyendo RSS: ${feedUrl}`, rssError);
      }
    }

    // 2️⃣ Mensaje claro si no hay noticias
    if (allNews.length === 0) {
      throw new Error("No se obtuvieron noticias desde los RSS");
    }

    const rewrittenNews = await Promise.all(
      allNews.map(async (item) => {
        try {
          const prompt = `
          Reescribe la siguiente noticia de forma profesional y natural, sin inventar datos nuevos:
          Título: ${item.title}
          Descripción: ${item.contentSnippet || item.content}
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

          if (data.error) {
            throw new Error("Error desde Gemini: " + data.error.message);
          }

          const texto =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Error generando noticia";

          return {
            original: item.title,
            link: item.link,
            rewritten: texto,
          };
        } catch (rewriteError) {
          return {
            original: item.title,
            link: item.link,
            rewritten: "⚠️ Error al reescribir noticia: " + rewriteError.message,
          };
        }
      })
    );

    res.status(200).json(rewrittenNews);

  } catch (error) {
    console.error("🔥 ERROR GENERAL:", error);
    res.status(500).json({ error: "Error al generar noticias: " + error.message });
  }
}


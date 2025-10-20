import Parser from "rss-parser";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const feeds = [
      "https://www.canarias7.es/rss/",
      "https://eldia.es/rss",
      "https://e00-marca.uecdn.es/rss/portada.xml"
    ];

    const parser = new Parser();
    let allNews = [];

    for (const feedUrl of feeds) {
      const feed = await parser.parseURL(feedUrl);
      const items = feed.items.slice(0, 3);
      allNews.push(...items);
    }

    const rewrittenNews = await Promise.all(
      allNews.map(async (item) => {
        const prompt = `
        Reescribe esta noticia de forma clara y profesional, sin inventar datos:
        Título: ${item.title}
        Descripción: ${item.contentSnippet || item.content}
        `;

        try {
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
        } catch (err) {
          return {
            titulo_original: item.title,
            link: item.link,
            noticia_reescrita: "Error al contactar con Gemini.",
          };
        }
      })
    );

    res.status(200).json(rewrittenNews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al procesar las noticias" });
  }
}


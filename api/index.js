import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

console.log("🚀 Universal TMDB Proxy started");

// Универсальный прокси для ВСЕХ TMDB эндпоинтов
app.get("/*", async (req, res) => {
  try {
    // Получаем путь из URL (убираем начальный / если есть)
    const tmdbPath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
    
    // Собираем query-параметры
    const queryParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'ru-RU', // default language
      ...req.query
    }).toString();
    
    // Формируем полный URL для TMDB API
    const tmdbUrl = `${TMDB_BASE_URL}/${tmdbPath}?${queryParams}`;
    
    console.log(`📡 Proxying: ${tmdbPath}`);
    console.log(`🔗 Full URL: ${tmdbUrl.replace(TMDB_API_KEY, '***')}`);
    
    // Делаем запрос к TMDB API
    const response = await fetch(tmdbUrl, {
      headers: { 
        Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ TMDB API error ${response.status}:`, errorText);
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Возвращаем ответ от TMDB
    res.json(data);
    
  } catch (error) {
    console.error("💥 Proxy error:", error.message);
    res.status(500).json({ 
      error: "Proxy error",
      message: error.message,
      path: req.path
    });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Universal TMDB Proxy",
    status: "online",
    usage: "Use any TMDB endpoint, e.g.:",
    examples: [
      "/movie/popular",
      "/search/multi?query=avatar",
      "/discover/movie?with_genres=28",
      "/trending/all/week",
      "/tv/1399", // Game of Thrones details
      "/movie/155?append_to_response=credits,videos"
    ],
    note: "All requests are proxied to https://api.themoviedb.org/3/",
    timestamp: new Date().toISOString()
  });
});

// Экспортируем для Vercel
export default app;
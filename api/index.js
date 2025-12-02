import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

// Vercel автоматически устанавливает NODE_ENV='production'
// и предоставляет переменные через process.env

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;

// Проверяем переменные (для отладки в логах Vercel)
console.log("=== VERCEL DEPLOYMENT ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("TMDB_API_KEY exists:", !!TMDB_API_KEY);
console.log("TMDB_BEARER_TOKEN exists:", !!TMDB_BEARER_TOKEN);
console.log("========================");

// Добавляем health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "TMDB Proxy API",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      popular: "/movies/popular",
      search: "/movies/search?query=avatar"
    }
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    tmdb_api_key: TMDB_API_KEY ? "configured" : "missing",
    tmdb_bearer_token: TMDB_BEARER_TOKEN ? "configured" : "missing"
  });
});

// Ваши существующие эндпоинты (оставляем без изменений)
app.get("/movies/popular", async (req, res) => {
  try {
    if (!TMDB_API_KEY || !TMDB_BEARER_TOKEN) {
      return res.status(500).json({ 
        error: "API credentials not configured",
        details: "Check Vercel environment variables"
      });
    }
    
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`,
      {
        headers: { Authorization: `Bearer ${TMDB_BEARER_TOKEN}` },
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching popular movies:", error);
    res.status(500).json({ 
      error: "Failed to fetch TMDB data",
      message: error.message 
    });
  }
});

app.get("/movies/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    if (!TMDB_API_KEY || !TMDB_BEARER_TOKEN) {
      return res.status(500).json({ 
        error: "API credentials not configured"
      });
    }
    
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${TMDB_BEARER_TOKEN}` },
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error searching movies:", error);
    res.status(500).json({ 
      error: "Failed to search TMDB",
      message: error.message 
    });
  }
});

// Экспортируем app для Vercel
export default app;
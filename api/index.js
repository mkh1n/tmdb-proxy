import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

// Загружаем переменные из .env.local ТОЛЬКО в разработке
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: ".env.local" });
}

const app = express();
app.use(cors());

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;

// Определяем порт (Vercel использует process.env.PORT)
const PORT = process.env.PORT || 3000;

// Отладочная информация
console.log("NODE_ENV:", process.env.NODE_ENV || 'development');
console.log("PORT:", PORT);
console.log("TMDB_API_KEY exists:", !!TMDB_API_KEY);
console.log("TMDB_BEARER_TOKEN exists:", !!TMDB_BEARER_TOKEN);

// Тестовые эндпоинты
app.get("/", (req, res) => {
  res.json({ 
    message: "TMDB Proxy API is running",
    env: process.env.NODE_ENV || 'development',
    apiKeyExists: !!TMDB_API_KEY,
    timestamp: new Date().toISOString()
  });
});

app.get("/test", (req, res) => {
  res.json({ 
    status: "ok",
    variables: {
      TMDB_API_KEY: TMDB_API_KEY ? "***" + TMDB_API_KEY.slice(-4) : "not set",
      TMDB_BEARER_TOKEN: TMDB_BEARER_TOKEN ? "***" + TMDB_BEARER_TOKEN.slice(-4) : "not set"
    }
  });
});

// Ваши существующие эндпоинты
app.get("/movies/popular", async (req, res) => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`,
      {
        headers: { Authorization: `Bearer ${TMDB_BEARER_TOKEN}` },
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch TMDB data" });
  }
});

app.get("/movies/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
        query
      )}`,
      {
        headers: { Authorization: `Bearer ${TMDB_BEARER_TOKEN}` },
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to search TMDB" });
  }
});

// ВАЖНО: Добавляем запуск сервера только при локальном запуске
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Test endpoints:`);
    console.log(`  http://localhost:${PORT}/`);
    console.log(`  http://localhost:${PORT}/test`);
    console.log(`  http://localhost:${PORT}/movies/popular`);
  });
}

// Экспортируем app для Vercel
export default app;
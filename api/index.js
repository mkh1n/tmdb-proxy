import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

console.log("🚀 Universal TMDB Proxy started");

// УНИВЕРСАЛЬНЫЙ ПРОКСИ ДЛЯ ВСЕХ ЗАПРОСОВ
app.all("/*", async (req, res) => {
  try {
    // Получаем путь (убираем начальный слэш если есть)
    let tmdbPath = req.path;
    if (tmdbPath.startsWith('/')) {
      tmdbPath = tmdbPath.slice(1);
    }
    
    // Сохраняем оригинальные query параметры
    const originalQuery = new URLSearchParams(req.query);
    
    // Создаем новый URLSearchParams с добавленным API ключом
    const queryParams = new URLSearchParams();
    
    // Добавляем API ключ (обязательно)
    queryParams.append('api_key', TMDB_API_KEY);
    
    // Копируем все оригинальные параметры
    for (const [key, value] of originalQuery.entries()) {
      queryParams.append(key, value);
    }
    
    // Если не указан язык, добавляем русский по умолчанию
    if (!queryParams.has('language')) {
      queryParams.append('language', 'ru-RU');
    }
    
    // Формируем полный URL
    const tmdbUrl = `${TMDB_BASE_URL}/${tmdbPath}?${queryParams.toString()}`;
    
    console.log(`📡 Proxying: ${req.method} ${req.path}`);
    console.log(`🔗 To TMDB: ${tmdbUrl.replace(TMDB_API_KEY, '***')}`);
    
    // Делаем запрос к TMDB API
    const response = await fetch(tmdbUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${TMDB_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Передаем тело запроса если есть (для POST/PUT)
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined
    });
    
    // Получаем статус и данные
    const status = response.status;
    const data = await response.json().catch(() => ({}));
    
    console.log(`✅ Response: ${status}`);
    
    // Возвращаем ответ от TMDB
    res.status(status).json(data);
    
  } catch (error) {
    console.error("💥 Proxy error:", error.message);
    res.status(500).json({
      error: "Proxy error",
      message: error.message,
      path: req.path
    });
  }
});

// Корневой эндпоинт для проверки
app.get("/", (req, res) => {
  res.json({
    service: "Universal TMDB Proxy",
    status: "online",
    usage: "Use any TMDB API endpoint",
    examples: [
      "/movie/popular",
      "/movie/550",
      "/search/multi?query=avatar",
      "/discover/movie?with_genres=28&sort_by=popularity.desc",
      "/trending/all/week",
      "/tv/1399",
      "/person/500"
    ],
    note: "All endpoints are proxied to https://api.themoviedb.org/3/",
    documentation: "https://developer.themoviedb.org/reference/intro/getting-started",
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    api_key_configured: !!TMDB_API_KEY,
    bearer_token_configured: !!TMDB_BEARER_TOKEN
  });
});

// Экспортируем для Vercel
export default app;
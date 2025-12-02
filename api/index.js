import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

console.log("🚀 Universal TMDB Proxy started");

// КОРНЕВОЙ ПУТЬ - документация прокси
app.get("/", (req, res) => {
  res.json({
    service: "Universal TMDB Proxy",
    status: "online",
    description: "Proxy server for The Movie Database (TMDB) API",
    usage: "Use any TMDB API endpoint after the domain",
    examples: [
      `${req.protocol}://${req.get('host')}/movie/popular`,
      `${req.protocol}://${req.get('host')}/movie/550`,
      `${req.protocol}://${req.get('host')}/search/multi?query=avatar`,
      `${req.protocol}://${req.get('host')}/trending/all/week`,
      `${req.protocol}://${req.get('host')}/tv/1399`,
      `${req.protocol}://${req.get('host')}/person/500`
    ],
    note: "All requests are proxied to https://api.themoviedb.org/3/",
    documentation: "https://developer.themoviedb.org/reference/intro/getting-started",
    github: "https://github.com/your-repo/tmdb-proxy",
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    environment: process.env.NODE_ENV || "development",
    api_key_configured: !!TMDB_API_KEY,
    bearer_token_configured: !!TMDB_BEARER_TOKEN,
    proxy_url: TMDB_BASE_URL
  });
});

// УНИВЕРСАЛЬНЫЙ ПРОКСИ ДЛЯ ВСЕХ TMDB ЗАПРОСОВ
app.all("/*", async (req, res) => {
  try {
    // Получаем путь из URL
    const path = req.path;
    
    // Если путь корневой или /api/, уже обработано выше
    if (path === "/" || path === "/api" || path === "/health") {
      return next(); // Пропускаем дальше
    }
    
    // Убираем начальный слэш для TMDB API
    let tmdbPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Создаем query параметры
    const queryParams = new URLSearchParams();
    
    // Добавляем API ключ
    queryParams.append('api_key', TMDB_API_KEY);
    
    // Добавляем все query параметры из запроса
    Object.keys(req.query).forEach(key => {
      const value = req.query[key];
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v));
      } else {
        queryParams.append(key, value);
      }
    });
    
    // Добавляем язык по умолчанию если не указан
    if (!queryParams.has('language')) {
      queryParams.append('language', 'ru-RU');
    }
    
    // Формируем URL для TMDB API
    const tmdbUrl = `${TMDB_BASE_URL}/${tmdbPath}?${queryParams.toString()}`;
    
    console.log(`📡 Proxying: ${req.method} ${path} → ${tmdbUrl.replace(TMDB_API_KEY, '***')}`);
    
    // Опции для fetch
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${TMDB_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    // Добавляем тело запроса для POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    // Делаем запрос к TMDB API
    const response = await fetch(tmdbUrl, fetchOptions);
    
    // Получаем данные
    const data = await response.json().catch(() => ({
      error: "Failed to parse JSON response",
      status: response.status
    }));
    
    console.log(`✅ Response status: ${response.status}`);
    
    // Возвращаем ответ с тем же статусом
    res.status(response.status).json(data);
    
  } catch (error) {
    console.error("💥 Proxy error:", error.message);
    res.status(500).json({
      error: "Proxy error",
      message: error.message,
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }
});

// Обработка 404 для неподдерживаемых маршрутов
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`,
    available_routes: {
      root: "GET /",
      health: "GET /health",
      proxy: "ANY /* (proxies to TMDB API)"
    }
  });
});

// Экспортируем для Vercel
export default app;
import fetch from 'node-fetch';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const TMDB_BASE = 'https://api.themoviedb.org/3';

export default async function handler(req, res) {
  // Убираем /api из пути если есть
  let path = req.url;
  if (path.startsWith('/api/')) {
    path = path.slice(5);
  }
  if (path.startsWith('/')) {
    path = path.slice(1);
  }
  
  // Если корневой путь
  if (path === '' || path === '/') {
    return res.json({
      service: 'TMDB Proxy',
      status: 'online',
      usage: 'Use /movie/popular, /search/multi?query=... etc.',
      example: `${req.headers.host}/movie/popular`
    });
  }
  
  try {
    // Собираем параметры
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = new URLSearchParams(url.search);
    
    // Добавляем API ключ
    params.set('api_key', TMDB_API_KEY);
    
    // Если нет language, добавляем ru-RU
    if (!params.has('language')) {
      params.set('language', 'ru-RU');
    }
    
    // Строим TMDB URL
    const tmdbUrl = `${TMDB_BASE}/${path}?${params.toString()}`;
    
    console.log('Fetching from TMDB:', tmdbUrl.replace(TMDB_API_KEY, '***'));
    
    // Делаем запрос
    const response = await fetch(tmdbUrl, {
      headers: {
        'Authorization': `Bearer ${TMDB_BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message,
      path: req.url
    });
  }
}
// app/api/movies/route.ts
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim();
  const page = parseInt(searchParams.get("page") || "1", 10);

  const includeMovies = searchParams.get("movies") !== "false";
  const includeTV = searchParams.get("tv") !== "false";
  const includePeople = searchParams.get("people") === "true";

  // const proxyBase = "https://proxy-tmdb-weld.vercel.app/api";
    const proxyBase = "https://tmdb-proxy-n05lw41zc-mkh1ns-projects.vercel.app";

  try {
    let data: any;
    let totalToFetch = 10; // Сколько запрашиваем у TMDB

    if (!query) {
      // Без поискового запроса
      const url = `${proxyBase}/movie/popular?page=${page}&language=ru-RU`;
      const res = await fetch(url, { 
          headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TMDB_BEARER_TOKEN}`
    },
    next: { revalidate: 3600 } });
      if (!res.ok) throw new Error("Failed to fetch popular movies");
      data = await res.json();

      // Добавляем media_type
      data.results = (data.results || []).map((m: any) => ({
        ...m,
        media_type: "movie",
      }));
    } else {
      // С поисковым запросом
      const url = `${proxyBase}/search?query=${encodeURIComponent(
        query
      )}&page=${page}&include_adult=false&language=ru-RU`;
      const res = await fetch(url, { next: { revalidate: 1800 } });
      if (!res.ok) throw new Error("Search failed");
      data = await res.json();
    }

    // const url = `${proxyBase}/genre/tv/list&language=ru-RU`;
    // const res = await fetch(url, { next: { revalidate: 3600 } });
    // if (!res.ok) throw new Error("Failed to fetch popular movies");
    // let ddata = await res.json();
    // console.log(ddata);

    let results = data.results || [];

    // Применяем фильтры
    results = results.filter((item: any) => {
      const mediaType = item.media_type;

      if (includePeople && mediaType === "person") {
        return true;
      }

      if (mediaType === "movie") {
        return includeMovies;
      }
      if (mediaType === "tv") {
        return includeTV;
      }

      return false;
    });

    // ОСНОВНОЕ ИСПРАВЛЕНИЕ: НЕ МЕНЯЕМ total_pages от TMDB
    // Фильтруем только результаты, но сохраняем метаданные от API
    return Response.json({
      page: data.page || page,
      results,
      total_results: data.total_results || 0, // Оставляем как есть от TMDB
      total_pages: Math.min(data.total_pages || 1, 500), // Оставляем как есть
      filtered_count: results.length, // Добавляем поле с фактическим количеством
    });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      {
        page,
        results: [],
        total_results: 0,
        total_pages: 0,
      },
      { status: 500 }
    );
  }
}

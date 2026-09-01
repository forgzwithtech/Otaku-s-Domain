// client/src/services/mangaDexEngine.ts

export interface MangaDexChapter {
  id: string;
  chapterNumber: string;
  title: string;
  pages: number;
}

export interface ExternalMangaSource {
  name: string;
  badge: string;
  url: string;
}

const BASE_URL = import.meta.env.PROD 
  ? "/mangadex-proxy" 
  : "https://api.mangadex.org";

const chapterCache = new Map<string, { data: { chapters: MangaDexChapter[]; mangaDexId: string | null; isReadable: boolean }; exp: number }>();
const pagesCache = new Map<string, string[]>();

export async function getMangaDexData(
  title: string,
  romajiTitle?: string
): Promise<{ chapters: MangaDexChapter[]; mangaDexId: string | null; isReadable?: boolean }> {
  const cacheKey = `${title}_${romajiTitle || ''}`;
  const hit = chapterCache.get(cacheKey);
  if (hit && hit.exp > Date.now()) {
    return hit.data;
  }

  const cleanTitle = (t: string) =>
    t.replace(/[:\-–—!]/g, " ").replace(/\b(Season \d+|Part \d+|Cour \d+|TV|Manga)\b/gi, "").trim();

  const queries = Array.from(new Set([romajiTitle, title, cleanTitle(romajiTitle || ""), cleanTitle(title || "")].filter(Boolean))) as string[];

  // Parallel search resolution
  const searchPromises = queries.map(async (q) => {
    try {
      const res = await fetch(`${BASE_URL}/manga?title=${encodeURIComponent(q)}&limit=1&order[relevance]=desc`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data?.[0]?.id || null;
    } catch {
      return null;
    }
  });

  const resolvedIds = await Promise.all(searchPromises);
  const mangaId = resolvedIds.find((id) => id !== null) || null;

  if (!mangaId) {
    const empty = { chapters: [], mangaDexId: null, isReadable: false };
    chapterCache.set(cacheKey, { data: empty, exp: Date.now() + 300000 });
    return empty;
  }

  try {
    const feedRes = await fetch(`${BASE_URL}/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=500`);
    if (!feedRes.ok) return { chapters: [], mangaDexId: mangaId, isReadable: false };

    const feedData = await feedRes.json();
    if (!feedData.data || feedData.data.length === 0) {
      return { chapters: [], mangaDexId: mangaId, isReadable: false };
    }

    const map = new Map<string, MangaDexChapter>();
    feedData.data.forEach((c: any) => {
      if (c.attributes.externalUrl && (!c.attributes.pages || c.attributes.pages === 0)) return;

      const chNum = c.attributes.chapter || "1";
      if (!map.has(chNum)) {
        map.set(chNum, {
          id: c.id,
          chapterNumber: chNum,
          title: c.attributes.title ? `Ch. ${chNum} — ${c.attributes.title}` : `Chapter ${chNum}`,
          pages: c.attributes.pages || 0
        });
      }
    });

    const sorted = Array.from(map.values()).sort(
      (a, b) => parseFloat(a.chapterNumber || "0") - parseFloat(b.chapterNumber || "0")
    );

    const result = { chapters: sorted, mangaDexId: mangaId, isReadable: sorted.length > 0 };
    chapterCache.set(cacheKey, { data: result, exp: Date.now() + 600000 });
    return result;
  } catch (err) {
    console.error("MangaDex feed query failed:", err);
    return { chapters: [], mangaDexId: mangaId, isReadable: false };
  }
}

// 2. Fetch Pages for a Chapter + Instant Preloader
export async function getMangaDexPages(chapterId: string): Promise<string[]> {
  if (pagesCache.has(chapterId)) {
    return pagesCache.get(chapterId)!;
  }

  try {
    const res = await fetch(`${BASE_URL}/at-home/server/${chapterId}`);
    if (!res.ok) return [];
    const data = await res.json();
    const baseUrl = data.baseUrl;
    const hash = data.chapter.hash;
    const files = data.chapter.data || data.chapter.dataSaver || [];

    const pageUrls = files.map((file: string) => `${baseUrl}/data/${hash}/${file}`);
    pagesCache.set(chapterId, pageUrls);

    // Background preload the first 4 pages immediately
    pageUrls.slice(0, 4).forEach((url: string) => {
      const img = new Image();
      img.src = url;
    });

    return pageUrls;
  } catch (err) {
    console.error("Failed to load MangaDex pages:", err);
    return [];
  }
}

export function preloadNextPages(pages: string[], currentIndex: number) {
  const nextSlice = pages.slice(currentIndex + 1, currentIndex + 4);
  nextSlice.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}

export function getExternalMangaLinks(title: string): ExternalMangaSource[] {
  const query = encodeURIComponent(title.trim());
  return [
    { name: "MANGA Plus by SHUEISHA", badge: "OFFICIAL SIMULPUB", url: `https://mangaplus.shueisha.co.jp/search_result?keyword=${query}` },
    { name: "VIZ Media / Shonen Jump", badge: "OFFICIAL VAULT", url: `https://www.viz.com/search?search=${query}` },
    { name: "BookWalker", badge: "DIGITAL RELEASE", url: `https://global.bookwalker.jp/search/?word=${query}` }
  ];
}
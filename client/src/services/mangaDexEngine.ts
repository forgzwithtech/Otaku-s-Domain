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

export interface InVaultMangaItem {
  id: string;
  title: string;
  format: string;
  type: string;
  status: string;
  image: string;
  genres: string[];
  score: number | null;
  isMangaDexDirect: boolean;
}

// Routes through Vercel rewrite proxy in production to bypass MangaDex CORS/Cloudflare blocks
const BASE_URL = import.meta.env.PROD 
  ? "/mangadex-proxy" 
  : "https://api.mangadex.org";

const COVER_BASE = "https://uploads.mangadex.org/covers";

// 1. Fetch Real Chapters from MangaDex
export async function getMangaDexData(
  title: string,
  romajiTitle?: string
): Promise<{ chapters: MangaDexChapter[]; mangaDexId: string | null; isReadable?: boolean }> {
  const cleanTitle = (t: string) =>
    t.replace(/[:\-–—!]/g, " ").replace(/\b(Season \d+|Part \d+|Cour \d+|TV|Manga)\b/gi, "").trim();

  const queries = [romajiTitle, title, cleanTitle(romajiTitle || ""), cleanTitle(title || "")].filter(Boolean) as string[];

  let mangaId: string | null = null;

  for (const q of queries) {
    try {
      const searchRes = await fetch(`${BASE_URL}/manga?title=${encodeURIComponent(q)}&limit=1&order[relevance]=desc`);
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      if (searchData.data?.[0]?.id) {
        mangaId = searchData.data[0].id;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!mangaId) return { chapters: [], mangaDexId: null, isReadable: false };

  try {
    const feedRes = await fetch(`${BASE_URL}/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=500`);
    if (!feedRes.ok) return { chapters: [], mangaDexId: mangaId, isReadable: false };

    const feedData = await feedRes.json();

    if (!feedData.data || feedData.data.length === 0) {
      return { chapters: [], mangaDexId: mangaId, isReadable: false };
    }

    const map = new Map<string, MangaDexChapter>();
    feedData.data.forEach((c: any) => {
      // Discard external-only publisher links that have no readable pages on MangaDex
      if (c.attributes.externalUrl && (!c.attributes.pages || c.attributes.pages === 0)) {
        return;
      }

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

    return { chapters: sorted, mangaDexId: mangaId, isReadable: sorted.length > 0 };
  } catch (err) {
    console.error("MangaDex feed query failed:", err);
    return { chapters: [], mangaDexId: mangaId, isReadable: false };
  }
}

// 2. Fetch Pages for a Chapter
export async function getMangaDexPages(chapterId: string): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/at-home/server/${chapterId}`);
    if (!res.ok) return [];
    const data = await res.json();
    const baseUrl = data.baseUrl;
    const hash = data.chapter.hash;
    const files = data.chapter.data || data.chapter.dataSaver || [];

    return files.map((file: string) => `${baseUrl}/data/${hash}/${file}`);
  } catch (err) {
    console.error("Failed to load MangaDex pages:", err);
    return [];
  }
}

// 3. Fallback Official Links Generator
export function getExternalMangaLinks(title: string): ExternalMangaSource[] {
  const query = encodeURIComponent(title.trim());
  return [
    {
      name: "MANGA Plus by SHUEISHA",
      badge: "OFFICIAL SIMULPUB",
      url: `https://mangaplus.shueisha.co.jp/search_result?keyword=${query}`
    },
    {
      name: "VIZ Media / Shonen Jump",
      badge: "OFFICIAL VAULT",
      url: `https://www.viz.com/search?search=${query}`
    },
    {
      name: "BookWalker",
      badge: "DIGITAL RELEASE",
      url: `https://global.bookwalker.jp/search/?word=${query}`
    }
  ];
}

// 4. Dedicated Catalog Browse Feed (Returns only Manga guaranteed to have English scanlations)
export async function fetchMangaDexBrowseList(
  page: number = 1,
  limit: number = 24,
  search?: string
): Promise<{ items: InVaultMangaItem[]; hasNextPage: boolean }> {
  const offset = (page - 1) * limit;
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    "includes[]": "cover_art",
    "contentRating[]": "safe",
    "availableTranslatedLanguage[]": "en",
    "order[followedCount]": "desc",
  });

  if (search && search.trim()) {
    params.set("title", search.trim());
  }

  try {
    const res = await fetch(`${BASE_URL}/manga?${params.toString()}`);
    if (!res.ok) return { items: [], hasNextPage: false };
    const data = await res.json();

    if (!data.data) return { items: [], hasNextPage: false };

    const items: InVaultMangaItem[] = data.data.map((m: any) => {
      const titleObj = m.attributes.title || {};
      const title =
        titleObj.en ||
        titleObj["ja-ro"] ||
        Object.values(titleObj)[0] ||
        "Untitled Manga";

      const coverRel = m.relationships.find((r: any) => r.type === "cover_art");
      const fileName = coverRel?.attributes?.fileName;
      const coverUrl = fileName
        ? `${COVER_BASE}/${m.id}/${fileName}.512.jpg`
        : "https://via.placeholder.com/600x900/111/fff?text=NO+COVER";

      const genres = (m.attributes.tags || [])
        .map((t: any) => t.attributes?.name?.en)
        .filter(Boolean)
        .slice(0, 2);

      return {
        id: m.id,
        title,
        format: "MANGA",
        type: "MANGA // IN-VAULT",
        status: m.attributes.status?.toUpperCase() || "RELEASING",
        image: coverUrl,
        genres: genres.length > 0 ? genres : ["Manga"],
        score: null,
        isMangaDexDirect: true,
      };
    });

    const total = data.total || 0;
    return {
      items,
      hasNextPage: offset + limit < total,
    };
  } catch (err) {
    console.error("MangaDex browse failed:", err);
    return { items: [], hasNextPage: false };
  }
}

// 5. Check if a specific title has readable chapters in the vault
export async function checkMangaReadableInVault(title: string, romajiTitle?: string): Promise<boolean> {
  const result = await getMangaDexData(title, romajiTitle);
  return Boolean(result.isReadable);
}
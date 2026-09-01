// client/src/services/anilist.ts

export interface VaultMedia {
  id: number;
  title: string;
  type: string;
  format: string;
  status: string;
  image: string;
  bannerImage: string | null;
  genres: string[];
  description: string;
  score: number | null;
  isAdult: boolean;
}

export interface CharacterNode {
  id: number;
  name: string;
  nativeName: string | null;
  image: string;
  role: string;
  description: string;
  gender: string | null;
  age: string | null;
  voiceActor?: {
    name: string;
    image: string;
    language: string;
  };
}

export interface DetailedMedia {
  id: number;
  title: string;
  romajiTitle: string;
  nativeTitle: string;
  type: "ANIME" | "MANGA";
  format: string;
  status: string;
  episodes: number | null;
  chapters: number | null;
  duration: number | null;
  seasonYear: number | null;
  image: string;
  bannerImage: string | null;
  genres: string[];
  description: string;
  score: number | null;
  trailerUrl: string | null;
  studios: string[];
  characters: CharacterNode[];
  relations: {
    id: number;
    title: string;
    type: string;
    format: string;
    image: string;
    relationType: string;
  }[];
}

interface AniListResponse {
  pageInfo: {
    total: number;
    currentPage: number;
    lastPage: number;
    hasNextPage: boolean;
  };
  media: VaultMedia[];
}

const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL = 10 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data as T;
  }
  return null;
}

function setCached(key: string, data: any) {
  cache.set(key, { timestamp: Date.now(), data });
}

const VAULT_MEDIA_QUERY = `
query GetVaultMedia($page: Int, $perPage: Int, $type: MediaType, $search: String, $sort: [MediaSort], $isAdult: Boolean) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
    }
    media(type: $type, search: $search, sort: $sort, isAdult: $isAdult) {
      id
      title {
        english
        romaji
      }
      format
      status
      coverImage {
        large
      }
      bannerImage
      genres
      description(asHtml: false)
      averageScore
      isAdult
    }
  }
}
`;

// Queries both primary Media data and fetches multiple character pages to exceed the 25 sub-query cap
const MEDIA_DETAILS_QUERY = `
query GetMediaDetails($id: Int) {
  Media(id: $id) {
    id
    title {
      english
      romaji
      native
    }
    type
    format
    status
    episodes
    chapters
    duration
    seasonYear
    coverImage {
      extraLarge
      large
    }
    bannerImage
    genres
    description(asHtml: false)
    averageScore
    trailer {
      id
      site
    }
    studios(isMain: true) {
      nodes {
        name
      }
    }
    charPage1: characters(sort: [ROLE, FAVOURITES_DESC], page: 1, perPage: 25) {
      pageInfo {
        hasNextPage
      }
      edges {
        role
        node {
          id
          name { full native }
          image { large }
          description(asHtml: false)
          gender
          age
        }
        voiceActors(language: JAPANESE) {
          name { full }
          image { large }
          languageV2
        }
      }
    }
    charPage2: characters(sort: [ROLE, FAVOURITES_DESC], page: 2, perPage: 25) {
      edges {
        role
        node {
          id
          name { full native }
          image { large }
          description(asHtml: false)
          gender
          age
        }
        voiceActors(language: JAPANESE) {
          name { full }
          image { large }
          languageV2
        }
      }
    }
    charPage3: characters(sort: [ROLE, FAVOURITES_DESC], page: 3, perPage: 25) {
      edges {
        role
        node {
          id
          name { full native }
          image { large }
          description(asHtml: false)
          gender
          age
        }
        voiceActors(language: JAPANESE) {
          name { full }
          image { large }
          languageV2
        }
      }
    }
    charPage4: characters(sort: [ROLE, FAVOURITES_DESC], page: 4, perPage: 25) {
      edges {
        role
        node {
          id
          name { full native }
          image { large }
          description(asHtml: false)
          gender
          age
        }
        voiceActors(language: JAPANESE) {
          name { full }
          image { large }
          languageV2
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          title {
            english
            romaji
          }
          type
          format
          coverImage {
            large
          }
        }
      }
    }
  }
}
`;

export async function fetchVaultMedia(options: {
  page?: number;
  perPage?: number;
  type?: "ANIME" | "MANGA";
  search?: string;
  isAdult?: boolean;
  sort?: string[];
}): Promise<AniListResponse> {
  const {
    page = 1,
    perPage = 24,
    type = "ANIME",
    search,
    isAdult = false,
    sort = ["POPULARITY_DESC"]
  } = options;

  const cacheKey = `vault_media_${type}_${page}_${perPage}_${search || ''}_${(sort || []).join('_')}`;
  const cached = getCached<AniListResponse>(cacheKey);
  if (cached) return cached;

  const variables: Record<string, any> = {
    page,
    perPage,
    type,
    isAdult,
    sort: search ? ["SEARCH_MATCH"] : sort
  };

  if (search && search.trim().length > 0) {
    variables.search = search.trim();
  }

  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ query: VAULT_MEDIA_QUERY, variables })
  });

  const json = await response.json();
  if (!json.data?.Page) {
    throw new Error("Failed to fetch data from AniList");
  }

  const rawMedia = json.data.Page.media || [];
  const media: VaultMedia[] = rawMedia.map((item: any) => ({
    id: item.id,
    title: item.title.english || item.title.romaji || "Untitled Document",
    type: item.format ? `${item.format} // ${item.status || "UNKNOWN"}` : "VAULT ARCHIVE",
    format: item.format || "N/A",
    status: item.status === "RELEASING" ? "HOT" : "CATALOG",
    image: item.coverImage?.large || item.coverImage?.extraLarge || "https://via.placeholder.com/600x900/111/fff?text=NO+IMAGE",
    bannerImage: item.bannerImage,
    genres: item.genres || [],
    description: item.description?.replace(/<[^>]*>?/gm, '') || "Classified database entry.",
    score: item.averageScore,
    isAdult: item.isAdult || false
  }));

  const result = { pageInfo: json.data.Page.pageInfo, media };
  setCached(cacheKey, result);
  return result;
}

export async function fetchMediaDetails(id: number): Promise<DetailedMedia> {
  const cacheKey = `media_detail_${id}`;
  const cached = getCached<DetailedMedia>(cacheKey);
  if (cached) return cached;

  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      query: MEDIA_DETAILS_QUERY,
      variables: { id }
    })
  });

  const json = await response.json();
  const item = json.data?.Media;
  if (!item) throw new Error("Media detail not found");

  // Combine multi-page character sets (up to 100 characters)
  const allCharEdges = [
    ...(item.charPage1?.edges || []),
    ...(item.charPage2?.edges || []),
    ...(item.charPage3?.edges || []),
    ...(item.charPage4?.edges || [])
  ];

  // De-duplicate by character node ID
  const seenCharIds = new Set<number>();
  const characterList: CharacterNode[] = [];

  for (const edge of allCharEdges) {
    if (!edge?.node?.id || seenCharIds.has(edge.node.id)) continue;
    seenCharIds.add(edge.node.id);
    characterList.push({
      id: edge.node.id,
      name: edge.node.name?.full || "Operative",
      nativeName: edge.node.name?.native || null,
      image: edge.node.image?.large || "https://via.placeholder.com/150",
      role: edge.role || "Supporting",
      description: edge.node.description?.replace(/<[^>]*>?/gm, '') || "No classified biography on file for this operative.",
      gender: edge.node.gender || null,
      age: edge.node.age || null,
      voiceActor: edge.voiceActors?.[0] ? {
        name: edge.voiceActors[0].name?.full || "",
        image: edge.voiceActors[0].image?.large || "",
        language: edge.voiceActors[0].languageV2 || "Japanese"
      } : undefined
    });
  }

  const result: DetailedMedia = {
    id: item.id,
    title: item.title.english || item.title.romaji,
    romajiTitle: item.title.romaji,
    nativeTitle: item.title.native,
    type: item.type,
    format: item.format || "N/A",
    status: item.status,
    episodes: item.episodes,
    chapters: item.chapters,
    duration: item.duration,
    seasonYear: item.seasonYear,
    image: item.coverImage?.extraLarge || item.coverImage?.large,
    bannerImage: item.bannerImage,
    genres: item.genres || [],
    description: item.description?.replace(/<[^>]*>?/gm, '') || "Classified vault archive entry.",
    score: item.averageScore,
    trailerUrl: item.trailer?.site === "youtube" ? `https://www.youtube.com/watch?v=${item.trailer.id}` : null,
    studios: item.studios?.nodes?.map((s: any) => s.name) || [],
    characters: characterList,
    relations: item.relations?.edges?.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title.english || edge.node.title.romaji,
      type: edge.node.type,
      format: edge.node.format,
      image: edge.node.coverImage?.large,
      relationType: edge.relationType
    })) || []
  };

  setCached(cacheKey, result);
  return result;
}
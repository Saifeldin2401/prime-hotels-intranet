import { createClient } from "npm:@supabase/supabase-js@2";
import { parseString } from "npm:xml2js";
import {
  getServiceRoleToken,
  isAuthorizedServiceRoleRequest,
} from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required Supabase environment variables");
}

const RSS_FEEDS = [
  // Working Feed
  {
    url: "https://www.hoteliermiddleeast.com/feed",
    source: "Hotelier Middle East",
    lang: "en",
  },

  // Blocked / Not Working (Commented out for now)
  // { url: 'https://www.arabnews.com/cat/1/rss.xml', source: 'Arab News', lang: 'en' },
  // { url: 'https://www.zawya.com/rss/default.aspx', source: 'Zawya', lang: 'en' }
];

const KEYWORDS = [
  "Saudi",
  "KSA",
  "Riyadh",
  "Jeddah",
  "NEOM",
  "Red Sea",
  "Hospitality",
  "Hotel",
  "Tourism",
  "Travel",
  "Vision 2030",
];

// Promisify xml2js
const parseXml = (xml: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    parseString(xml, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

Deno.serve(async (req) => {
  let totalNewArticles = 0;

  try {
    // Require service role key for scheduled/internal calls
    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleJwt = getServiceRoleToken(authHeader);
    if (
      !isAuthorizedServiceRoleRequest(authHeader, SUPABASE_SERVICE_ROLE_KEY)
    ) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      SUPABASE_URL,
      serviceRoleJwt ?? SUPABASE_SERVICE_ROLE_KEY,
    );

    for (const feed of RSS_FEEDS) {
      console.log(`Fetching ${feed.source}...`);
      try {
        const response = await fetch(feed.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          },
        });

        if (!response.ok) {
          console.error(`Failed ${feed.source}: ${response.status}`);
          continue;
        }

        const text = await response.text();
        if (!text || text.trim().length === 0) continue;

        let result;
        try {
          result = await parseXml(text);
        } catch (parseError) {
          console.error(`Parse Error ${feed.source}:`, parseError);
          continue;
        }

        const items = result?.rss?.channel?.[0]?.item || [];

        for (const item of items) {
          const title = item.title?.[0];
          const link = item.link?.[0];
          const pubDate = item.pubDate?.[0];
          const guid = item.guid?.[0]?._ || item.guid?.[0] || link;

          let description = "";
          if (item.description && item.description[0]) {
            description =
              item.description[0].replace(/<[^>]*>/g, "").substring(0, 300) +
              "...";
          }

          // 1. Keyword Filtering
          const contentToScan = `${title} ${description}`;
          const hasKeyword = KEYWORDS.some((keyword) =>
            contentToScan.toLowerCase().includes(keyword.toLowerCase()),
          );

          if (!hasKeyword) {
            continue;
          }

          // 2. Dedup Check
          const { data: existing } = await supabase
            .from("hospitality_news")
            .select("id")
            .eq("guid", guid)
            .maybeSingle();

          if (existing) {
            continue;
          }

          // 3. Insert
          const article = {
            guid,
            original_title: title,
            title_en: feed.lang === "en" ? title : null,
            title_ar: feed.lang === "ar" ? title : null,
            summary_en: feed.lang === "en" ? description : null,
            summary_ar: feed.lang === "ar" ? description : null,
            source: feed.source,
            source_url: link,
            original_language: feed.lang,
            published_at: pubDate
              ? new Date(pubDate).toISOString()
              : new Date().toISOString(),
            category: "General",
            tags: ["Hospitality"],
          };

          const { error } = await supabase
            .from("hospitality_news")
            .insert(article);
          if (error) {
            console.error("Insert error:", error);
          } else {
            totalNewArticles++;
            console.log(`Inserted: ${title}`);
          }
        }
      } catch (fetchError) {
        console.error(`Error processing ${feed.source}:`, fetchError);
      }
    }

    return new Response(
      JSON.stringify({ message: "Success", new_articles: totalNewArticles }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("Global error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

// Vercel Serverless Function — Notion DB 프록시
// -----------------------------------------------------
// 환경변수 (Vercel Project Settings → Environment Variables):
//   NOTION_TOKEN  — 필수, Notion Integration의 secret 토큰
// -----------------------------------------------------
// 본 파일은 notion-dashboard-deployer 플러그인의 vercel-proxy-gen 스킬이
// 생성했습니다. DATABASE_ID 및 속성 매핑이 배포 대상에 맞춰 치환되어 있습니다.
// -----------------------------------------------------

const DATABASE_ID = "{{DATABASE_ID}}";
const NOTION_API_VERSION = "2022-06-28";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: "NOTION_TOKEN not configured",
      hint: "Vercel 대시보드 → 프로젝트 설정 → Environment Variables에 NOTION_TOKEN을 추가한 뒤 재배포하세요."
    });
  }

  try {
    const pages = [];
    let nextCursor = undefined;

    do {
      const body = { page_size: 100 };
      if (nextCursor) body.start_cursor = nextCursor;

      const response = await fetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Notion-Version": NOTION_API_VERSION
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          error: "Notion API error",
          status: response.status,
          detail: errText,
          hint: "Integration이 해당 DB에 연결되어 있는지 확인하세요. Notion 페이지 우측 상단 ··· → Connections → Integration 추가."
        });
      }

      const data = await response.json();
      for (const page of data.results) {
        pages.push(simplifyPage(page));
      }
      nextCursor = data.has_more ? data.next_cursor : null;
    } while (nextCursor);

    res.setHeader("Cache-Control", "s-maxage={{CACHE_SECONDS}}, stale-while-revalidate={{SWR_SECONDS}}");
    return res.status(200).json({
      pages,
      count: pages.length,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      hint: "Notion API 호출에 실패했습니다. 토큰·DB ID를 확인하세요."
    });
  }
}

// 속성 매핑 함수 — vercel-proxy-gen이 property_mapping에 따라 재생성합니다.
function simplifyPage(page) {
  const p = page.properties || {};
  return {
    id: (page.id || "").replace(/-/g, ""),
    {{SIMPLIFY_BODY}}
    lastEdited: page.last_edited_time || null,
    url: page.url || null
  };
}

// ==== Notion 속성 타입별 추출 유틸 ====
function getTitle(prop) {
  if (!prop || !Array.isArray(prop.title)) return "";
  return prop.title.map(t => t.plain_text || "").join("");
}

function getText(prop) {
  if (!prop || !Array.isArray(prop.rich_text)) return "";
  return prop.rich_text.map(t => t.plain_text || "").join("");
}

function getSelect(prop) {
  if (!prop || !prop.select) return "";
  return prop.select.name || "";
}

function getMultiSelect(prop) {
  if (!prop || !Array.isArray(prop.multi_select)) return [];
  return prop.multi_select.map(s => s.name || "").filter(Boolean);
}

function getNumber(prop) {
  if (!prop) return null;
  return (prop.number === null || prop.number === undefined) ? null : prop.number;
}

function getDate(prop) {
  if (!prop || !prop.date) return null;
  return prop.date.start || null;
}

function getUrl(prop) {
  if (!prop) return "";
  return prop.url || "";
}

function getCheckbox(prop) {
  if (!prop) return false;
  return !!prop.checkbox;
}

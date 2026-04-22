---
name: vercel-proxy-gen
description: Notion API를 프록시하는 Vercel Serverless 함수(api/notion.js)와 배포 설정 파일(vercel.json, package.json, .gitignore, README.md)을 생성한다. "Vercel 프록시 만들어줘", "api 엔드포인트 생성해줘", "서버리스 함수 써줘", "Notion API 서버 설정해줘" 같은 요청에서 트리거된다.
---

# vercel-proxy-gen — Vercel Serverless 프록시 생성

## 역할

브라우저에서 Notion API를 직접 호출하면 NOTION_TOKEN이 노출되므로, Vercel Edge에서 프록시하는 서버리스 함수를 만든다. 프로젝트 폴더에 다음 파일들을 생성한다:

```
<project>/
├── api/notion.js        ← 서버리스 함수 (프록시)
├── vercel.json          ← 캐시 헤더 설정
├── package.json         ← Node 버전, ESM 모듈
├── .gitignore           ← .env, .vercel, node_modules 제외
└── README.md            ← 배포 가이드
```

## 입력

- `project_path` (필수) — 파일을 쓸 디렉토리 (artifact-dashboard가 생성한 폴더와 동일)
- `database_id` (필수)
- `property_mapping` (선택) — 응답에 노출할 속성 매핑. 없으면 원본 속성명 그대로 반환
- `cache_seconds` (선택) — Vercel Edge 캐시 초. 기본 30
- `stale_while_revalidate` (선택) — 기본 300

## 동작

### 1. 템플릿 로드

`/sessions/eager-adoring-dijkstra/mnt/.remote-plugins/plugin_018pLNd4CGF8vEEmyztWR7fi/skills/vercel-proxy-gen/templates/` 아래의 각 템플릿 파일을 읽는다.

### 2. 변수 치환

| 파일 | 치환 변수 |
|---|---|
| `api-notion.js` | `{{DATABASE_ID}}`, `{{PROPERTY_MAPPING_JS}}`, `{{CACHE_SECONDS}}`, `{{SWR_SECONDS}}` |
| `vercel.json` | `{{CACHE_SECONDS}}`, `{{SWR_SECONDS}}` |
| `package.json` | `{{PROJECT_NAME}}`, `{{PROJECT_DESCRIPTION}}` |
| `README.md` | `{{PROJECT_NAME}}`, `{{DATABASE_ID}}`, `{{DATABASE_URL}}` |

### 3. property_mapping 처리

사용자가 `property_mapping`을 제공하지 않으면 스키마의 모든 속성을 투명 통과시킨다 (Notion 원본 이름 유지).

제공한 경우, `simplifyPage()` 함수 내에서 매핑에 따라 JSON 키를 재명명:

```js
// property_mapping 예시
{
  "프로젝트명": "title",
  "팀": "team",
  "진척도": "progress",
  "현재 진행사항": "currentProgress"
}
```

→ 생성되는 `simplifyPage()`:

```js
function simplifyPage(page) {
  const p = page.properties || {};
  return {
    id: (page.id || "").replace(/-/g, ""),
    title: getTitle(p["프로젝트명"]),
    team: getSelect(p["팀"]),
    progress: getNumber(p["진척도"]),
    currentProgress: getText(p["현재 진행사항"]),
    lastEdited: page.last_edited_time || null,
    url: page.url || null
  };
}
```

### 4. 파일 저장

`project_path`에 5개 파일을 저장한다. 기존 파일이 있으면 덮어쓰기 전에 사용자에게 확인.

### 5. 후처리

- 원본 문서를 `<project_path>/docs/`에 복사 (Q7 결정에 따름)
- .gitignore가 `.env`, `.vercel`, `node_modules`를 반드시 포함하는지 재검사

## 출력

```json
{
  "project_path": "...",
  "files_created": [
    "api/notion.js",
    "vercel.json",
    "package.json",
    ".gitignore",
    "README.md"
  ],
  "env_vars_required": ["NOTION_TOKEN"]
}
```

## 의존성

- `fs`·`path` 수준의 파일 시스템 쓰기만 수행. MCP 불필요.
- 템플릿 파일은 플러그인 자체에 포함되어 `/sessions/eager-adoring-dijkstra/mnt/.remote-plugins/plugin_018pLNd4CGF8vEEmyztWR7fi` 기준 경로로 접근.

## 엣지 케이스

- **`project_path`에 기존 파일 존재** — 사용자에게 overwrite 확인
- **`database_id`에 하이픈 포함/미포함 혼재** — 하이픈 제거 후 표준화 (`d28e53bbe9b4463792811a8099f51668` 형태)
- **`property_mapping` 키가 실제 스키마에 없음** — 경고 출력, 해당 키는 응답에서 제외

## 다음 단계

반환된 `project_path`와 파일 목록은 `static-deploy`에 전달되어 GitHub·Vercel 배포에 사용된다.

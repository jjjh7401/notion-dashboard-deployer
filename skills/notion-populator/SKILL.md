---
name: notion-populator
description: 추출된 스키마와 레코드 배열로 Notion DB를 새로 생성하거나 기존 DB에 upsert한다. "이 데이터로 Notion DB 만들어줘", "Notion에 레코드 추가해줘", "기존 DB에 새 항목 넣어줘" 같은 요청에서 트리거된다. Notion Integration이 없으면 생성 가이드를 먼저 출력한다.
---

# notion-populator — Notion DB 생성·적재

## 역할

`document-parser`가 추출한 스키마/레코드를 Notion DB에 반영한다. 두 가지 모드:

- **create** — 새 DB를 상위 페이지 아래에 생성 + 초기 레코드 일괄 삽입
- **upsert** — 기존 DB의 스키마를 맞추고 중복은 스킵 또는 갱신

## 입력

- `parsed_output` (필수) — document-parser 출력
- `target` (필수)
  - `mode`: `"create"` 또는 `"upsert"`
  - `parent_page_id` (create): 상위 페이지 ID. 없으면 사용자에게 물어본다
  - `database_id` (upsert): 기존 DB ID
- `dedupe_key` (선택) — 중복 판단 기준 속성명 (기본: title 속성)

## 사전 확인: Notion Integration & NOTION_TOKEN

호출 시 다음을 순서대로 확인:

1. 세션 내 NOTION_TOKEN이 있는가? 없으면 사용자에게 요청.
2. 토큰이 유효한가? `notion-fetch`로 임의 페이지를 조회해 검증.
3. Integration이 대상 페이지/DB에 연결되어 있는가? 401이면 다음 가이드를 출력:

```
Integration이 아직 이 페이지에 연결되지 않았습니다.

1. Notion에서 상위 페이지 열기
2. 우측 상단 ··· → Connections
3. "Connect to" → [당신의 Integration 이름] 선택
4. 팝업의 Confirm 누르면 하위 페이지까지 권한 상속

완료했으면 "계속"이라고 답해주세요.
```

NOTION_TOKEN이 없는 경우 `https://www.notion.so/my-integrations`에서 Internal Integration을 만들라고 안내하고, 받은 secret을 복사해 오도록 요청. Secret은 세션 메모리에만 보관하며 파일로 쓰지 않는다.

## create 모드 동작

1. `notion-create-database` 호출
   - `parent`: 사용자가 제공한 상위 페이지
   - `title`: 스키마의 `entity` 이름 (예: "미니프로젝트")
   - `properties`: `fields[]`를 Notion property 형식으로 변환

2. 속성 타입 매핑 규칙

| parser `notion_type` | Notion property type | 비고 |
|---|---|---|
| title | title | 첫 번째 필드에 1개 필수 |
| rich_text | rich_text | |
| number | number (format: percent / number) | percent일 때 `number.format = "percent"` |
| select | select (options[]) | options는 parser가 감지한 고유값 |
| multi_select | multi_select (options[]) | |
| date | date | |
| url | url | |
| email | email | |
| phone_number | phone_number | |
| checkbox | checkbox | |
| people | people | (DB 구성원만 가능) |

3. `notion-create-pages`로 레코드 일괄 생성 (배치 크기 10~20, rate limit 고려)

4. 생성 완료 후 DB URL 반환 + 사용자에게 확인

## upsert 모드 동작

1. `notion-fetch`로 기존 DB 스키마 조회
2. parser 스키마와 비교
   - 누락된 속성이 있으면 `notion-update-data-source`로 추가할지 사용자에게 확인
   - 타입 충돌 (기존 text인데 parser는 number) → 사용자가 선택
3. `dedupe_key`(기본 title)로 기존 레코드 조회
4. 새 레코드만 `notion-create-pages`로 추가
5. 겹치는 레코드는 기본 스킵. 사용자가 "갱신"을 원하면 `notion-update-page`로 덮어쓰기
6. 결과 리포트: `{created: N, updated: M, skipped: K}`

## 출력

```json
{
  "database_id": "d28e53bb...",
  "database_url": "https://www.notion.so/lighting/...",
  "created_count": 52,
  "updated_count": 0,
  "skipped_count": 0,
  "integration_configured": true,
  "schema_applied": { "fields": [...] }
}
```

## 에러 처리

- **rate limit 초과** — exponential backoff (1s, 2s, 4s), 최대 5회. 재시도 실패 시 나머지 레코드 목록을 사용자에게 제공해 수동 재시도 안내
- **속성 옵션 초과** (select 100개+) — 상위 50개 + "기타"로 축약 제안
- **title 필드 누락** — parser 출력 중 적절한 필드를 title로 지정할지 AskUserQuestion
- **Integration 미연결** — 가이드 출력 후 사용자 "계속" 대기

## 보안 주의

- NOTION_TOKEN은 세션 메모리에만. 로그·파일·커밋 금지.
- 사용자 혼란 방지를 위해 토큰 앞 6자리 뒤 전체를 마스킹한 형태로만 표시 (`secret_ABCDEF...****`)
- DB 생성 후 URL을 사용자에게 보여주되 NOTION_TOKEN은 절대 함께 출력하지 않는다

## 다음 단계

create 모드 완료 후 `database_id`·`schema`를 다음 체인 스킬(`artifact-dashboard`)에 넘긴다.

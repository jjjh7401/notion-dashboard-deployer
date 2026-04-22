---
name: artifact-dashboard
description: Cowork create_artifact를 활용해 Notion DB 스키마 기반 HTML 대시보드를 만들고 자연어 피드백으로 수정한다. "대시보드 UI 만들어줘", "차트 하나 추가해줘", "KPI 카드 색깔 바꿔줘", "스코어보드 넣어줘", "대시보드 다크 테마로" 같은 시각화 편집 요청에서 트리거된다.
---

# artifact-dashboard — Cowork 아티팩트 기반 프론트엔드 스튜디오

## 역할

Notion DB 스키마를 받아 Chart.js 기반의 인터랙티브 HTML 대시보드를 Cowork 아티팩트로 생성한다. 사용자가 사이드바 미리보기에서 "이 부분 크게", "그래프 추가"처럼 자연어로 요청하면 `update_artifact`로 반복 수정한다. 최종 확정된 HTML을 배포용 프로젝트 폴더에 저장해 다음 체인(`vercel-proxy-gen → static-deploy`)으로 넘긴다.

## 입력

- `database_id` (필수)
- `schema` (필수) — Notion 속성 이름·타입 (notion-populator 출력)
- `dashboard_config` (선택)
  - `title` — 페이지 H1
  - `theme` — `"dark"` / `"light"` / `"blue"` / `"green"` / `"orange"` 중 택
  - `refresh_interval` — 분 단위: 1, 5(기본), 15, 60
  - `kpis` — 없으면 자동 선택
  - `charts` — 없으면 자동 선택
  - `scoreboards` — 그룹별 스코어보드. 없으면 자동 선택
  - `sections` — 표시 순서 `["header", "kpi", "charts", "scoreboards", "cards"]`

## 시각화 자동 추천 규칙

스키마에서 필드 타입을 분석해 아래 기준으로 자동 추천한다. 사용자가 `dashboard_config`로 덮어쓸 수 있다.

| 소스 | 생성되는 시각화 |
|---|---|
| 레코드 수 | KPI 카드 — "총 N건" |
| `number (percent)` 필드 | KPI 카드 — 평균 % |
| `number` 필드 | KPI 카드 — 합계 or 평균 |
| `select` 필드 | Doughnut 차트 — 옵션별 개수 |
| 2개 이상 `select` 조합 | 교차 스코어보드 (행×열) |
| `date` 필드 | Line 차트 — 월별 분포 |
| `multi_select` 필드 | Horizontal bar 차트 — 태그 빈도 |
| `rich_text` (긴 텍스트) | 카드 본문 |

## 구현 단계

### 1. 템플릿 로드

`/sessions/eager-adoring-dijkstra/mnt/.remote-plugins/plugin_018pLNd4CGF8vEEmyztWR7fi/skills/artifact-dashboard/templates/dashboard.html`에서 기본 HTML 구조를 로드한다. 이 파일은 `{{...}}` 플레이스홀더를 포함한다.

### 2. 변수 치환

| 변수 | 값 |
|---|---|
| `{{title}}` | dashboard_config.title |
| `{{theme_css}}` | 테마별 CSS (references/themes.md 참조) |
| `{{refresh_interval_ms}}` | refresh_interval * 60 * 1000 |
| `{{kpi_cards}}` | 자동/수동 추천 결과 HTML |
| `{{charts}}` | Chart.js 초기화 스크립트 |
| `{{scoreboards}}` | 스코어보드 HTML 블록 |
| `{{notion_db_url}}` | DB URL 링크 |

### 3. Cowork 아티팩트 생성

`create_artifact` 호출:
- `type`: `text/html`
- `title`: dashboard_config.title
- `content`: 치환된 HTML

아티팩트가 Cowork 사이드바에 즉시 렌더링되며, 브라우저에서 `/api/notion` fetch를 시도한다. 아직 배포 전이므로 로컬에서는 모의 데이터로 미리보기하거나 사용자에게 "배포 후 실제 데이터가 채워집니다" 안내.

**권장 미리보기 방식**: `schema + records` 샘플 10건을 HTML 내부에 `window.__MOCK__ = [...]`로 임베드해, 로컬에서도 실제에 가까운 미리보기 가능. 배포 시에는 해당 블록 제거.

### 4. 자연어 수정 루프

사용자가 "~~하게 바꿔줘"라고 요청할 때마다:

1. 요청 해석
   - "차트 추가" → 새 Chart.js 블록 삽입
   - "색 바꿔줘" → 테마 CSS 교체
   - "KPI 카드 더 크게" → grid-template-columns 조정
   - "팀별 스코어보드 빼줘" → 해당 블록 삭제
2. `update_artifact`로 새 HTML 반영
3. 변경 요약을 사용자에게 한 줄로 보고

### 5. 확정 단계

사용자가 "좋아 이대로 배포해줘"라고 하면:

1. 모의 데이터 블록 제거
2. 배포용 HTML을 `<workspace>/<project-name>/index.html`로 저장
3. `dashboard_config` 최종본을 반환 (config.json에 저장용)

## 출력

```json
{
  "artifact_id": "artifact_xxx",
  "html_path": ".../index.html",
  "final_config": {
    "title": "...",
    "theme": "dark",
    "refresh_interval": 5,
    "kpis": [...],
    "charts": [...],
    "scoreboards": [...]
  }
}
```

## 참조 파일

- `templates/dashboard.html` — HTML 뼈대 (변수 포함)
- `references/themes.md` — 테마별 CSS 팔레트 (dark / light / blue / green / orange)
- `references/chart-recipes.md` — Chart.js 설정 예시 (doughnut / bar / line / scoreboard)

## 엣지 케이스

- **스키마 필드 수 > 20** — 필수 표시 필드를 사용자가 선택하도록 AskUserQuestion
- **레코드 1개뿐** — 카드 대신 단일 페이지 뷰로 전환
- **빈 DB** — "데이터가 없습니다" 플레이스홀더 렌더
- **아티팩트 크기 제한** — HTML이 아주 커질 경우 CSS/JS를 별도 파일로 분리하는 옵션 제공

## 다음 단계

반환된 `html_path`와 `final_config`는 `vercel-proxy-gen`에 전달되어 API 프록시·배포 설정을 생성하는 기반이 된다.

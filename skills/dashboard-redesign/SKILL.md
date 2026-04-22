---
name: dashboard-redesign
description: 데이터(Notion DB)는 그대로 두고 대시보드의 시각화 UI만 재설계해 재배포한다. "차트 하나 더 추가해줘", "색 바꿔줘", "레이아웃 변경해줘", "테마를 라이트로", "KPI 카드 키워줘", "/dashboard-redesign" 같은 UI 수정 요청에서 트리거된다.
---

# dashboard-redesign — UI 재디자인 오케스트레이터

## 역할

배포된 대시보드의 **HTML(프론트엔드)만** 재작성해 재배포한다. Notion DB와 api/notion.js는 건드리지 않는다. `artifact-dashboard → static-deploy(redeploy_only=true)` 두 스킬만 체이닝한다.

## 언제 이 스킬을 사용하는가

- 이미 배포된 프로젝트가 존재 (`config.json` 있음)
- 사용자가 "차트 추가", "색 바꿔줘", "레이아웃 변경" 같은 **시각화 편집**만 요청
- 데이터 변경이 필요하면 `notion-ingest` 또는 Notion UI에서 직접 수정

## 실행 절차

### 1. 프로젝트 복원

`<workspace>/<project-name>/config.json` 을 로드해 다음을 복원:
- `database_id`, `schema`
- 현재의 `dashboard_config`
- `artifact_id` (이전 Cowork 아티팩트)
- `repo_url`, `deploy_url`

프로젝트가 여러 개면 사용자에게 어떤 것을 수정할지 AskUserQuestion으로 선택받음.

### 2. artifact-dashboard 호출 (수정 모드)

기존 `artifact_id`가 여전히 유효한지 확인. 유효하면 `update_artifact` 반복 사용, 아니면 새로 `create_artifact`.

사용자 요청을 해석해 변경 사항을 적용:

| 사용자 표현 | 수행 작업 |
|---|---|
| "차트 추가" | 새 Chart 블록을 dashboard_config.charts에 추가 |
| "색 바꿔줘 / 테마 변경" | theme 값 교체 → CSS 변수 재주입 |
| "KPI 카드 더 크게" | grid-template-columns 조정 |
| "~~ 섹션 빼줘" | sections에서 제거 |
| "모바일 레이아웃 개선" | 반응형 쿼리 추가 |
| "폰트 바꿔줘" | @font-face 또는 CSS 변경 |

각 변경 후 Cowork 사이드바에서 즉시 미리보기 → 사용자가 확인.

### 3. 확정

사용자가 "이대로 배포해줘"라고 하면 HTML을 `<project_path>/index.html`에 덮어쓰기.

### 4. static-deploy 호출 (redeploy_only=true)

이미 있는 GitHub 레포·Vercel 프로젝트에 index.html만 교체 업로드. Vercel이 1–2분 내 자동 재배포.

### 5. config.json 업데이트

`dashboard_config`와 `last_deployed`를 최신으로 갱신.

### 6. 결과 리포트

- 변경 요약 (예: "Doughnut 차트 1개 추가, 테마 dark → light")
- 배포 URL
- Cowork 아티팩트 ID

## 출력

```json
{
  "changes_applied": ["added chart: team distribution", "theme: dark→light"],
  "deploy_url": "...",
  "artifact_id": "...",
  "redeployed_at": "..."
}
```

## 엣지 케이스

- **config.json 없음** — `dashboard-init`로 먼저 세팅하도록 안내
- **아티팩트가 삭제됨** — 새로 생성
- **변경 요청이 데이터 변경이면** (예: "프로젝트 추가해줘") — `notion-ingest` 또는 Notion UI 사용을 안내
- **사용자 요청이 여러 개 동시** — 한 번에 모두 적용한 뒤 일괄 미리보기

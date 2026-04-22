---
name: dashboard-init
description: 사용자가 업로드한 문서(MD/PDF/DOCX)로 Notion DB를 새로 구축하고 Cowork 아티팩트로 대시보드를 만든 뒤 Vercel에 배포하는 전체 흐름을 오케스트레이트한다. "문서로 대시보드 만들어줘", "기획서 올렸어 대시보드로 만들어줘", "Notion + 웹 대시보드 처음부터 세팅해줘", "/dashboard-init" 같은 첫 구축 요청에서 트리거된다.
---

# dashboard-init — 첫 구축 오케스트레이터

문서 업로드부터 팀 공유 URL 생성까지 전체 파이프라인을 한 번에 수행하는 진입 스킬. 각 단계는 `document-parser → notion-populator → artifact-dashboard → vercel-proxy-gen → static-deploy → permission-guide` 순으로 체이닝된다.

## 언제 이 스킬을 사용하는가

- 사용자가 문서를 업로드하며 "대시보드 만들어줘", "배포해줘" 같은 요청을 한 경우
- 처음부터 Notion DB와 웹 대시보드를 세트로 구축해야 하는 경우
- 기존 프로젝트가 없고(= `config.json`이 없음) 빈 상태에서 시작하는 경우

이미 구축된 프로젝트가 있다면 `notion-ingest`(데이터 추가), `dashboard-redesign`(UI 수정), `static-deploy`(재배포)로 라우팅한다.

## 실행 절차

### 1. 초기 인터뷰 (AskUserQuestion)

Cowork의 `AskUserQuestion`으로 다음을 동시 수집한다:

- **대시보드 제목** — 예: "2026 프로젝트 대시보드"
- **프로젝트(폴더) 이름** — GitHub 레포명으로도 쓰임. 소문자-하이픈 (kebab-case) 권장
- **자동 갱신 주기** — 1분 / 5분 (기본) / 15분 / 60분
- **테마** — 다크 / 라이트 / 색상 팔레트(파랑/초록/주황)
- **Notion 워크스페이스 위치** — 새 DB를 만들 상위 페이지 URL 또는 "없음(사용자가 선택)"
- **NOTION_TOKEN 준비 상태** — "있음 / 아직 없음(생성 가이드 필요)"

사용자 업로드 파일은 `/sessions/eager-adoring-dijkstra/mnt/uploads` 기준으로 자동 감지한다. 업로드된 파일이 없으면 업로드를 먼저 요청.

### 2. document-parser 호출

업로드된 모든 파일을 `document-parser` 스킬에 전달. 결과로 받은 `inferred_schema`와 `records`를 사용자에게 카드 형태로 미리보기.

- 레코드 수, 필드 이름·타입을 표로 표시
- 사용자가 **"맞음 / 수정 필요 / 취소"** 선택

### 3. notion-populator 호출

`mode = "create"` 로 호출해 새 Notion DB를 만든다. 대상 부모 페이지가 없으면 사용자에게 Notion UI에서 상위 페이지를 만들고 URL을 달라고 요청.

- Integration 없음 → `https://www.notion.so/my-integrations` 생성 가이드 출력
- NOTION_TOKEN을 사용자에게 받아 **세션 메모리에만 보관** (파일로 저장 금지)
- 생성된 DB URL을 사용자에게 확인

### 4. artifact-dashboard 호출

방금 생성된 DB의 schema와 사용자 선택(`theme`, `refresh_interval`)을 넘긴다. `Cowork create_artifact` 호출 결과를 사이드바에서 사용자가 즉시 확인한다.

- "이 부분 색을 바꿔줘" / "차트 하나 더" 같은 자연어 요청이 오면 `update_artifact`로 반복 수정
- 사용자가 "좋아, 이대로 배포" 하면 HTML을 로컬 프로젝트 폴더(`<workspace>/<project-name>/index.html`)로 저장

### 5. vercel-proxy-gen 호출

`api/notion.js`, `vercel.json`, `package.json`, `.gitignore`, `README.md`를 동일한 프로젝트 폴더에 생성한다. 원본 문서는 `docs/` 폴더에 복사.

### 6. static-deploy 호출

- GitHub 레포 생성 (Private 기본) → 파일 업로드 → 커밋
- Vercel Import → **환경변수 NOTION_TOKEN 등록** → Deploy
- 배포 URL과 GitHub URL을 사용자에게 반환

### 7. permission-guide 호출 (선택)

배포 직후 "팀원들에게 어떤 권한을 줘야 하는지"를 안내. 사용자가 원하면 랜딩 페이지에 권한 표 자동 삽입.

### 8. config.json 저장

다음 번에 `dashboard-redesign`·`notion-ingest`가 프로젝트 맥락을 복원할 수 있도록 프로젝트 루트에 `config.json`을 기록:

```json
{
  "version": "1.0",
  "plugin": "notion-dashboard-deployer",
  "project_name": "...",
  "database_id": "...",
  "database_url": "...",
  "schema": { ... },
  "dashboard_config": { ... },
  "source_documents": [...],
  "repo_url": "...",
  "deploy_url": "...",
  "last_deployed": "..."
}
```

### 9. 결과 카드 출력

사용자에게 다음을 한 번에 전달:

- **배포 URL** (팀 공유용)
- **Notion DB URL** (PO 편집용)
- **GitHub 레포 URL**
- **Cowork 아티팩트 ID** (재편집용)
- 다음 단계 안내: "새 문서 추가 → `/notion-ingest`, UI 수정 → `/dashboard-redesign`"

## 에러 처리 규칙

- 중간 단계 실패 시 **이미 생성된 리소스를 보존**한다. 예: Notion DB는 만들어졌는데 Vercel 배포가 실패하면, DB는 그대로 두고 배포만 다시 안내.
- NOTION_TOKEN은 **메모리에만** 존재. `config.json`이나 GitHub 레포에 절대 포함하지 않는다.
- 사용자가 중간에 취소하면 생성된 Notion DB를 어떻게 할지 물어본다 (보존 / 수동 삭제 안내).

## 보안 주의사항

- NOTION_TOKEN은 Vercel 환경변수로만 저장. `.env` 파일을 레포에 커밋하지 않도록 `.gitignore` 확인.
- 업로드 문서에 민감 정보가 있을 수 있으므로 **GitHub Private 레포**가 기본. 사용자가 Public으로 원하면 명시적 확인.
- 배포된 웹 대시보드는 Notion API 응답을 노출하므로, 민감한 속성(예: 내부 연락처)은 Notion DB 수준에서 제외하도록 권장.

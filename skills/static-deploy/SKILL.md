---
name: static-deploy
description: 생성된 HTML + api/notion.js를 GitHub에 업로드하고 Vercel에 배포하며 NOTION_TOKEN 환경변수를 등록한다. "GitHub에 올려 Vercel 배포해줘", "배포 실행해줘", "NOTION_TOKEN 등록하고 배포", "/dashboard-deploy" 같은 배포 요청에서 트리거된다.
---

# static-deploy — GitHub + Vercel 배포

## 역할

`artifact-dashboard`와 `vercel-proxy-gen`이 만든 프로젝트 폴더 전체를 GitHub Private 레포에 업로드하고 Vercel에 Import해 배포한다. NOTION_TOKEN 환경변수 등록까지 자동화한다.

## 입력

- `project_path` (필수)
- `repo_name` (필수) — kebab-case 권장
- `vercel_project_name` (선택) — 기본은 repo_name
- `notion_token` (secret, 필수) — 세션 메모리에서 읽음. 파일에 저장하지 않음
- `redeploy_only` (선택) — `true`면 기존 레포에 HTML만 교체해 재배포
- `visibility` (선택) — `"private"` (기본) / `"public"`

## 의존성

- **Claude in Chrome MCP** (필수) — GitHub·Vercel 웹 UI 자동화
- **Notion MCP** (선택) — 배포 후 Integration ↔ DB 연결 검증
- **Vercel MCP** (선택) — 있으면 Chrome MCP 일부 대체

## 초기 배포 절차 (`redeploy_only=false`)

### 1. GitHub 접근 준비

Chrome MCP `tabs_context_mcp`로 탭 확보 후 `github.com/new` 이동. 사용자가 로그인 안 돼 있으면 로그인 안내.

### 2. 레포 생성

- Repository name: `repo_name`
- Visibility: Private (기본) / Public (사용자 확정 시)
- Initialize with README: **체크 해제** (이미 생성된 README.md가 있음)
- Create repository

### 3. 파일 업로드

생성된 레포의 `upload/main` 페이지로 이동. Chrome MCP `file_upload`로 샌드박스 경로 접근 시도 → **"Not allowed" 오류가 거의 항상 발생**하므로 **사용자 드래그 드롭 폴백**을 기본 경로로 안내:

```
GitHub 업로드 페이지를 띄웠어요.
로컬 <project_path>의 모든 파일을 "Drag files here..." 박스에
드래그 드롭해주세요.

파일 목록:
- index.html
- api/notion.js
- vercel.json
- package.json
- .gitignore
- README.md
- docs/... (원본 문서)

드롭이 완료되면 "업로드 완료"라고 답해주세요.
```

업로드 감지 후 커밋 메시지 입력 → Commit changes 버튼 클릭.

### 4. Vercel 접근

`vercel.com/new` 이동. 로그인 확인. 사용자가 로그인 안 돼 있으면 GitHub 계정 연동 안내.

### 5. Vercel Import

- GitHub 레포 목록에서 방금 만든 레포 Import
- Framework Preset: Other (정적 + api/)
- Environment Variables 섹션에서:
  - Name: `NOTION_TOKEN`
  - Value: 사용자가 제공한 토큰 입력
  - Environment: Production + Preview + Development
- Deploy 클릭

### 6. 배포 확인

- 1–2분 기다린 뒤 배포 URL 확인
- `<vercel-url>/api/notion`에 GET 요청 → 정상 응답 확인
- 실패 시 Notion Integration이 DB에 연결됐는지 가이드

### 7. Integration ↔ DB 연결 검증 (Notion MCP 있으면)

`notion-fetch`로 DATABASE_ID 조회 → 권한 없으면 사용자에게 Integration 연결 재안내.

## 재배포 절차 (`redeploy_only=true`)

`dashboard-redesign` 이후 HTML만 교체할 때 사용.

1. `github.com/<user>/<repo>/upload/main` 이동
2. 사용자에게 수정된 `index.html`만 드래그 드롭 요청 (같은 파일명으로 덮어쓰기)
3. 커밋 → Vercel 자동 재배포 1–2분 대기
4. 배포 URL 방문해 변경 확인

## 출력

```json
{
  "github_url": "https://github.com/<user>/<repo>",
  "deploy_url": "https://<project>.vercel.app",
  "env_configured": true,
  "notion_integration_connected": true,
  "deployed_at": "2026-04-22T..."
}
```

## 엣지 케이스 (실제 학습된 교훈)

| 이슈 | 대응 |
|---|---|
| `file_upload` API가 샌드박스 경로에 접근 불가 | 사용자 드래그 드롭 안내로 우회 (항상) |
| 중복 레포 이름 | 이름 변경 또는 기존 레포 사용 질문 |
| Vercel 로그인 세션 만료 | 로그인 안내 후 다시 시도 |
| Two workspaces 혼동 | URL과 워크스페이스명을 함께 표시해 확인 |
| CodeMirror 에디터 차단(Ctrl+H 등) | 웹 에디터 대신 파일 업로드 폴백 |
| 동일 파일 업로드 시 "no changes" | 실제 변경 파일인지 로컬에서 hash 확인 후 재시도 |

## 보안

- `notion_token`은 로그나 결과 JSON에 **절대 포함하지 않음**. 앞 6자리 + `****` 로 마스킹
- 커밋 메시지, README에 토큰이나 이메일 노출 금지
- 기본은 **GitHub Private**. Public 전환은 사용자의 명시적 확인 필요
- `.env` 파일은 커밋하지 않도록 `.gitignore` 사전 검증

## 다음 단계

배포 성공 후 `permission-guide` 호출을 제안해 팀원 권한 설정 단계를 안내.

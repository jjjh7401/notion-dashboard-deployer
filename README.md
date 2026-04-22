# 노션 대시보드 배포기 (notion-dashboard-deployer)

업로드한 기획 문서(MD·PDF·DOCX)로 **Notion DB를 자동 구축**하고, **Cowork 아티팩트로 만든 HTML 대시보드**를 **Vercel Serverless (Notion API 프록시) + GitHub** 정적 호스팅으로 배포해 팀원 누구나 URL로 실시간 조회할 수 있게 합니다.

## 해결하는 문제

- 기획서는 PDF·Word로 오가지만 통합 뷰가 없음 → 자동 Notion DB + 웹 대시보드
- Notion DB를 0부터 수동 입력 → 문서에서 자동 추출·적재
- Cowork 대시보드를 팀에 공유 못 함 → GitHub + Vercel 공개 URL
- 프론트엔드를 코드로 직접 고쳐야 함 → Cowork 아티팩트에서 자연어로 편집

## 구조 한눈에

```
[문서 업로드] ──파싱──▶ [Notion DB] ◀──편집── [PO(Notion UI)]
                           │
                           │ Notion API (NOTION_TOKEN)
                           ▼
               [Vercel Serverless /api/notion]
                           │
                           ▼
               [Cowork 아티팩트 → 배포된 index.html]
                           │
                           ▼
                    [팀원 브라우저]
```

## 사용 방법

### 처음 만들 때
```
"문서 몇 개 올렸어 — 이걸로 프로젝트 대시보드 만들어줘"
```
`dashboard-init` 스킬이 트리거되어 문서 파싱 → Notion DB 생성 → 대시보드 아티팩트 제작 → Vercel 배포까지 한 번에 수행합니다.

### 새 문서로 DB 보강
```
"새 기획서 PDF 추가했어 — Notion에 넣어줘"
```
`notion-ingest` 스킬이 기존 DB 스키마 기준으로 신규 레코드만 upsert합니다. 대시보드는 자동 반영.

### UI만 재디자인
```
"대시보드에 차트 하나 더 추가해줘"
```
`dashboard-redesign` 스킬이 Cowork 아티팩트에서 HTML을 자연어 기반으로 수정 → Vercel 재배포.

### 배포만 다시
```
"다시 배포해줘"
```
`static-deploy` 스킬 직접 호출.

### 권한 가이드만
```
"팀원 권한 어떻게 설정해야 해?"
```
`permission-guide` 스킬이 역할별 권한 표 + Notion UI 조작 단계를 출력.

## 포함된 스킬

### Core (6개)
- **document-parser** — MD/PDF/DOCX → 구조화된 레코드 추출
- **notion-populator** — Notion DB 생성 또는 기존 DB에 upsert
- **artifact-dashboard** — Cowork create_artifact로 대시보드 HTML 제작·편집
- **vercel-proxy-gen** — api/notion.js + vercel.json + package.json 생성
- **static-deploy** — GitHub + Vercel 배포, NOTION_TOKEN 등록까지
- **permission-guide** — 역할별 Notion 권한 안내

### Orchestrator (3개)
- **dashboard-init** — 문서 업로드 → 배포까지 전체 흐름
- **dashboard-redesign** — 데이터 유지 + UI 재디자인 + 재배포
- **notion-ingest** — 새 문서로 기존 Notion DB 증분 적재

## 요구사항

### 연결되어 있어야 하는 Cowork 도구
- **Notion MCP** (필수) — DB 생성·조회·수정
- **Claude in Chrome** (필수) — GitHub·Vercel UI 자동화
- **Vercel MCP** (선택) — Chrome MCP 보완용

### 외부 계정
- **Notion** 계정 및 Integration (NOTION_TOKEN 발급용)
- **GitHub** 계정 (레포 생성)
- **Vercel** 계정 (배포)

### 내장 스킬 의존
- `pdf` — PDF 파싱용
- `docx` — Word 파싱용

## 확정된 설계 결정

| 항목 | 선택 |
|---|---|
| 문서 포맷 | MD/PDF/DOCX 동등 지원 |
| Notion DB | 새로 생성 또는 기존 선택 |
| UI 커스터마이징 | 자동 추천 + 자연어 수정 |
| NOTION_TOKEN | 사용자 직접 복붙 |
| 배포 플랫폼 | Vercel 전용 |
| 자동 갱신 주기 | 사용자 설정 (1/5/15/60분) |
| 원본 문서 | GitHub 레포 `docs/` 폴더 보관 |
| 테마 | 다크/라이트 + 3 색상 팔레트 |
| 보안 | GitHub Private + Vercel 공개 URL |
| 배포 범위 | 영상제작부문 사내 마켓플레이스 |

## 버전

- **0.1.0** (2026-04-22) — 초기 빌드

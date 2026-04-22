# {{PROJECT_NAME}} — 대시보드 (Notion + Vercel)

Notion DB의 내용을 실시간 조회해서 팀원 누구나 URL로 접근할 수 있는 웹 대시보드입니다. **notion-dashboard-deployer** 플러그인이 생성했습니다.

## 📂 구성

```
{{PROJECT_NAME}}/
├── index.html          대시보드 프론트엔드 (Cowork 아티팩트 출력물)
├── api/
│   └── notion.js       Notion API 프록시 (Vercel Serverless)
├── docs/               원본 기획 문서 (MD/PDF/DOCX)
├── package.json
├── vercel.json
├── .gitignore
└── README.md           (이 파일)
```

## 🔐 배포 후 필수 설정

### Vercel 환경변수
- **NOTION_TOKEN** — Notion Integration의 secret 토큰

Vercel Dashboard → 프로젝트 → Settings → Environment Variables 에서 등록 후 **재배포** 필수.

### Notion Integration 연결
1. [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)에서 Internal Integration 생성 (없으면)
2. 대상 DB 페이지 → 우측 상단 `···` → Connections → Integration 추가
3. "Add to ..." 확인 팝업에서 Confirm

## 🔄 데이터 갱신 흐름

```
PO가 Notion UI에서 편집
    ↓
Vercel /api/notion (NOTION_TOKEN) 이 실시간 조회
    ↓
대시보드가 {{REFRESH_MIN}}분마다 자동 새로고침
```

## 🛠 업데이트

- **데이터만 변경**: Notion에서 편집 — 대시보드에 자동 반영 (최대 {{REFRESH_MIN}}분)
- **UI 수정**: 플러그인 `/dashboard-redesign` 실행
- **새 문서로 DB 보강**: 플러그인 `/notion-ingest` 실행

## 🔗 링크

- **Notion DB**: [{{DATABASE_URL}}]({{DATABASE_URL}})
- **대시보드**: 배포 URL은 Vercel Dashboard에서 확인

---
name: notion-ingest
description: 새 문서(MD/PDF/DOCX)를 기존 Notion DB에 증분 적재한다. 기존 스키마 유지하며 중복 레코드는 스킵 또는 갱신. "새 기획서 추가해줘", "이 PDF 내용을 DB에 넣어줘", "Notion에 레코드 추가해줘", "/notion-ingest" 같은 문서 추가 요청에서 트리거된다.
---

# notion-ingest — 기존 DB에 문서 추가

## 역할

이미 배포된 프로젝트의 Notion DB에 **새 문서 내용만 증분 추가**한다. 대시보드 재배포는 불필요 (Notion 데이터 변경은 `/api/notion`이 실시간 반영).

## 언제 이 스킬을 사용하는가

- 프로젝트가 이미 존재 (`config.json` 있음)
- 새 문서(MD/PDF/DOCX)를 업로드해 DB에 추가하려는 경우
- 전체 재구축이 아니라 **증분 업데이트**

## 실행 절차

### 1. 프로젝트 복원

`<workspace>/<project-name>/config.json` 로드:
- `database_id`, `schema`
- 기존 `source_documents[]` 해시 (중복 감지용)

### 2. 파일 확인

업로드된 새 파일을 감지. 이미 처리한 파일(hash 일치)이면 사용자에게 재처리 여부 확인.

### 3. document-parser 호출

기존 `schema`를 `schema_template`으로 넘겨 **동일한 속성 구조로 파싱**한다. 신규 속성이 감지되면 사용자에게 추가 여부 확인:

```
새 문서에서 이런 속성이 추가로 발견됐어요:
- 예산 (number)
- 담당부서 (select)

이것들을 Notion DB 스키마에 추가할까요?
[추가] [이번만 무시] [취소]
```

### 4. notion-populator 호출 (upsert 모드)

- `mode: "upsert"`
- `database_id`: 기존 DB
- `dedupe_key`: 기본 title (사용자가 다른 키 지정 가능)

중복 판단:
- title이 정확히 일치 → 스킵 또는 갱신 (사용자 선택)
- title이 유사 (fuzzy match > 0.85) → 사용자에게 확인 요청
- 완전 신규 → 추가

### 5. config.json 업데이트

- `source_documents[]`에 새 파일 메타데이터 append
- `last_ingested` 타임스탬프 갱신

### 6. 결과 리포트

```
✅ Notion DB에 증분 적재 완료

처리 결과:
- 신규 레코드: 5건
- 갱신된 레코드: 2건
- 중복 스킵: 3건

대시보드는 자동 반영됩니다 (최대 5분 내).
→ 즉시 확인하려면 배포 URL에서 새로고침 버튼 클릭.
```

## 출력

```json
{
  "database_id": "...",
  "processed_files": [...],
  "created_count": 5,
  "updated_count": 2,
  "skipped_count": 3,
  "schema_changes": []
}
```

## 엣지 케이스

- **config.json 없음** — `dashboard-init`로 먼저 세팅
- **스키마 충돌** (기존은 text, 새 문서는 number) — 사용자에게 선택 요청
- **매우 많은 신규 레코드 (100+)** — 배치로 나누어 진행 + 프로그레스 보고
- **Notion rate limit** — notion-populator에서 자동 backoff

## docs/ 폴더 동기화 (선택)

사용자가 원하면 새 문서도 GitHub 레포의 `docs/` 폴더에 업로드:

1. 새 문서를 `<project_path>/docs/`에 복사
2. `static-deploy` (redeploy_only=true) 호출해 docs만 커밋 (HTML은 그대로)

기본은 **동기화하지 않음** (Notion DB만 업데이트). 사용자 명시 요청 시만 수행.

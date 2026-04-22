---
name: document-parser
description: Markdown, PDF, Word(DOCX) 파일에서 프로젝트 리스트·주제 카드 같은 반복 패턴을 찾아내 Notion DB에 들어갈 구조화된 레코드와 스키마로 변환한다. "이 PDF에서 프로젝트 리스트 뽑아줘", "문서 분석해서 DB용 데이터로 만들어줘", "Word 문서 파싱해줘", "기획서에서 항목만 추출해줘" 같은 요청에서 트리거된다.
---

# document-parser — 문서에서 구조화된 레코드 추출

## 역할

업로드된 문서(MD·PDF·DOCX)에서 반복 패턴(프로젝트, 항목, 레코드)을 감지하고 Notion DB 스키마와 레코드 배열로 변환한다. `dashboard-init` 또는 `notion-ingest` 오케스트레이터가 체인의 첫 단계로 호출하며, 단독 호출도 가능하다.

## 입력

- `files` (필수) — 파일 경로 또는 reference 배열. `/sessions/eager-adoring-dijkstra/mnt/uploads` 아래에 있는 경우가 일반적
- `hint` (선택) — "프로젝트 현황", "예산 리스트" 같은 힌트
- `schema_template` (선택) — 기존 Notion DB 스키마. `notion-ingest` 흐름에서 제공됨

## 파일 타입별 파싱 전략

### MD (Markdown)
- 네이티브 파싱. `##` 헤딩을 레코드 구분자 후보로, 헤딩 아래 bullet list를 속성으로 해석
- 테이블(`| ... |`)이 있으면 열 이름을 속성명으로, 각 행을 레코드로 변환
- 체크박스(`- [x]`)는 boolean 속성 후보

### PDF
- `pdf` 내장 스킬 호출하여 텍스트와 테이블 추출
- 페이지별 텍스트를 합쳐 의미 단위(프로젝트/섹션)로 분리
- 스캔 이미지 PDF는 OCR이 필요하다고 안내 후 실패 처리

### DOCX
- `docx` 내장 스킬 호출하여 스타일·표·리스트 추출
- Heading 1/2를 레코드 분리 기준으로, Heading 3 이하는 속성 키로 해석
- 표 자동 매핑

## 스키마 추론 규칙

파싱된 원시 텍스트에서 다음 순서로 속성을 추론한다:

1. **title 후보** — 각 레코드 첫 라인 또는 H1/H2 헤딩
2. **select 후보** — 값 종류가 10개 미만이고 고정 옵션처럼 보이는 속성 ("팀", "상태", "유형" 등)
3. **multi_select 후보** — 쉼표·슬래시로 구분된 태그성 값
4. **number 후보** — "%", "원", 숫자만 있는 값
5. **date 후보** — YYYY-MM-DD, YYYY.MM.DD, "6월 초" 같은 패턴
6. **rich_text (기본)** — 위에 해당하지 않는 서술형 텍스트
7. **url 후보** — http/https로 시작하는 문자열

속성 이름은 **한국어 원문 유지**. 영문 키로 변환하지 않는다 (Notion이 한국어 속성명 지원).

## 출력 형식

```json
{
  "source_files": [
    {"name": "영상아트팀.pdf", "type": "pdf", "pages": 12, "hash": "sha256:..."},
    {"name": "영상제작1팀.pdf", "type": "pdf", "pages": 10, "hash": "sha256:..."}
  ],
  "inferred_schema": {
    "entity": "미니프로젝트",
    "fields": [
      {"name": "프로젝트명", "notion_type": "title"},
      {"name": "팀", "notion_type": "select", "options": ["영상아트팀", "영상제작1팀"]},
      {"name": "유닛", "notion_type": "select", "options": [...]},
      {"name": "진척도", "notion_type": "number", "format": "percent"},
      {"name": "현재 진행사항", "notion_type": "rich_text"},
      {"name": "킥오프일", "notion_type": "date"},
      {"name": "태그", "notion_type": "multi_select", "options": [...]}
    ]
  },
  "records": [
    {
      "프로젝트명": "생성형 AI 조명 연출",
      "팀": "영상제작1팀",
      "유닛": "조명",
      "진척도": 0.3,
      "현재 진행사항": "파일럿 테스트 중",
      "킥오프일": "2026-03-15",
      "태그": ["AI", "조명"]
    },
    ...
  ]
}
```

## 사용자 검증 루프

추출 결과를 다음과 같이 요약해 사용자에게 보여주고 확인을 받는다:

```
문서 N개에서 M건의 레코드를 찾았습니다.

추론된 속성:
• 프로젝트명 (title)
• 팀 (select: 영상아트팀, 영상제작1팀)
• ...

샘플 레코드 (상위 3건):
1. 생성형 AI 조명 연출 | 영상제작1팀 | 진척도 30% | 킥오프 3/15
2. ...

[확인] [속성 추가/제거] [레코드 수정] [취소]
```

사용자가 "수정 필요"를 선택하면 `AskUserQuestion`으로 어떤 부분인지 확인해 재파싱한다.

## 엣지 케이스

- **스캔 PDF (텍스트 레이어 없음)** — OCR 필요 안내 후 실패 반환. 본 플러그인 범위 밖
- **표가 없는 서술형 PDF** — 헤딩 단위로 레코드화, 본문을 `rich_text` 속성으로 저장
- **문서 간 스키마 불일치** — 합집합으로 처리하되 결측 필드는 null. 사용자에게 경고
- **동일 파일 재업로드** — hash 비교로 감지, 재처리 여부 확인
- **매우 큰 PDF (>50MB)** — 분할 처리 또는 사용자에게 경고

## 호출 방식

단독:
> "이 PDF에서 프로젝트 리스트 뽑아줘"

체이닝 (dashboard-init 내부):
> document-parser → notion-populator → artifact-dashboard → ...

## 저장 위치

파싱 결과는 다음 스킬로 전달만 하고 파일로 저장하지 않는다. `config.json`에는 `source_documents[]`에 원본 파일 메타데이터만 기록.

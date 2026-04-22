---
name: permission-guide
description: 역할별(PO, 일반 팀원, 관리자) Notion 권한 체계를 설계하고 Notion UI에서 권한을 설정하는 단계별 가이드를 출력한다. "팀원 권한 어떻게 설정해?", "PO 편집 권한 주는 방법", "권한 가이드", "/dashboard-permissions" 같은 권한 관련 요청에서 트리거된다.
---

# permission-guide — Notion 역할별 권한 안내

## 역할

대시보드가 배포된 후, 팀원들이 올바른 권한으로 Notion DB와 랜딩 페이지에 접근할 수 있도록 **역할별 권한 매트릭스와 UI 조작 단계**를 안내한다. 권한 변경 자체는 **플러그인이 직접 수행하지 않는다** (보안 정책). 사용자(관리자)가 직접 수행하도록 단계별 지침만 제공.

## 입력

- `landing_page_id` (선택) — 랜딩 페이지 ID. 제공 시 해당 페이지에 권한 표 블록 자동 삽입 옵션 제공
- `database_id` (필수)
- `roles` (선택) — 기본 `["PO", "일반 팀원", "관리자"]`

## 기본 권한 매트릭스

| 대상 | 랜딩 페이지 | 미니프로젝트 DB | 웹 대시보드 |
|---|---|---|---|
| **PO** | Can view | **Can edit** (속성 수정 + 본문 편집 + 파일 업로드) | 조회 |
| **일반 팀원** | Can view | Can view | 조회 |
| **관리자** | Full access | Full access | 배포 관리 |

## 핵심 설정 원리

Notion의 권한은 상위 페이지에서 하위로 **자동 상속**된다. 랜딩 페이지를 Can view로 제한하면 하위 DB도 기본적으로 Can view가 된다. **DB만 Can edit으로 승격하려면 상속을 끊어야 함**.

## 출력 가이드 (사용자에게 전달할 Markdown)

```markdown
## 🔐 팀원 권한 설정 가이드

### ① 랜딩 페이지 → 모두 "Can view"

1. Notion에서 [랜딩 페이지] 열기
2. 우측 상단 **Share** 클릭
3. 워크스페이스 전체 또는 대상 그룹 추가 → 권한 **"Can view"** 선택
4. 이미 공유된 멤버가 있으면 각자의 드롭다운을 "Can view"로 변경
5. Confirm

> ⚠ 이 권한은 하위 DB에도 자동 상속됩니다. 다음 단계에서 DB만 예외 처리합니다.

### ② 미니프로젝트 DB → PO만 "Can edit"

1. DB 페이지 열기
2. 우측 상단 **Share** 클릭
3. 상단에 `"Inherited from [랜딩 페이지]"` 상속 표시가 보임
   → **"Remove inheritance"** 또는 `···` → **"Sharing settings"** → 상속 해제
4. 상속이 풀린 후:
   - **PO 그룹**(또는 PO 개인) 추가 → **"Can edit"**
     - Full access 말고 Can edit 권장 (권한 변경은 불가, 편집만 가능)
   - 일반 팀원은 **"Can view"** 유지
5. Confirm

### ③ 검증

- PO 계정으로 DB 접속 → 속성 수정 가능한지 확인
- 일반 팀원 계정 또는 시크릿 창 → 읽기만 가능한지 확인
- 웹 대시보드 URL 접속 → Notion 로그인 없이도 조회되는지 확인
  (Integration이 DB에 연결돼 있으면 로그인 불필요)

### 💡 팁

- **PO가 여러 명**이면 Notion Settings → People → **Groups** 에서 "PO" 그룹을 만들고 그룹 단위 권한 부여 권장. 나중에 멤버 추가·삭제가 쉬워짐
- **파일 업로드**는 Can edit 권한이면 자동으로 가능
- **민감 정보**가 DB에 있으면 GitHub 레포는 Private 유지 + 웹 대시보드도 Password Protection(Vercel Pro) 고려
```

## 랜딩 페이지에 권한 표 자동 삽입 (선택)

사용자가 원하면 Notion MCP `notion-update-page` (command: `update_content`)로 랜딩 페이지 하단에 위 매트릭스 표를 삽입한다.

```markdown
## 🌐 팀 공유 대시보드
- **URL**: <배포 URL>
- **Notion DB**: <DB URL>

### 역할별 권한
<table header-row="true">
  <tr><td>대상</td><td>랜딩</td><td>DB</td><td>웹 대시보드</td></tr>
  <tr><td>PO</td><td>Can view</td><td><strong>Can edit</strong></td><td>조회</td></tr>
  ...
</table>
```

## 제약사항

- **Notion 권한 API 한계**: 플러그인이 직접 권한 변경을 수행하려고 하면 안 된다. 가이드 출력만 허용.
- 권한 변경 후 DB에 Integration이 연결되어 있는지 재확인이 필요할 수 있음 → static-deploy나 notion-populator로 검증.

## 출력 예시

```json
{
  "permission_matrix": {...},
  "markdown_guide": "...",
  "landing_page_updated": false
}
```

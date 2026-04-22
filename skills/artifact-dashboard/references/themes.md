# 대시보드 테마 팔레트

`artifact-dashboard`의 `{{theme_css}}` 변수에 주입할 CSS 변수 세트. 사용자가 선택한 테마에 따라 해당 블록을 HTML의 `<style>` 영역에 넣는다.

## dark (기본)

```css
:root {
  --bg: #0d1117;
  --card: #161b22;
  --border: #30363d;
  --fg: #e6edf3;
  --muted: #8b949e;
  --accent: #58a6ff;
  --tag-bg: #1f2937;
  --tag-fg: #9ca3af;
  --chart-1: #58a6ff;
  --chart-2: #3fb950;
  --chart-3: #d29922;
  --chart-4: #f85149;
  --chart-5: #a371f7;
}
```

## light

```css
:root {
  --bg: #ffffff;
  --card: #f6f8fa;
  --border: #d0d7de;
  --fg: #1f2328;
  --muted: #656d76;
  --accent: #0969da;
  --tag-bg: #eaeef2;
  --tag-fg: #57606a;
  --chart-1: #0969da;
  --chart-2: #1a7f37;
  --chart-3: #9a6700;
  --chart-4: #cf222e;
  --chart-5: #8250df;
}
```

## blue (다크 + 블루 팔레트)

```css
:root {
  --bg: #0b1929;
  --card: #112338;
  --border: #1e3a5f;
  --fg: #e6f1ff;
  --muted: #8bb4e0;
  --accent: #4fc3f7;
  --tag-bg: #1e3a5f;
  --tag-fg: #8bb4e0;
  --chart-1: #4fc3f7;
  --chart-2: #29b6f6;
  --chart-3: #81d4fa;
  --chart-4: #0288d1;
  --chart-5: #01579b;
}
```

## green (다크 + 그린 팔레트)

```css
:root {
  --bg: #0d1f0d;
  --card: #14281b;
  --border: #2d4a36;
  --fg: #e8f5e9;
  --muted: #9ccc9c;
  --accent: #66bb6a;
  --tag-bg: #2d4a36;
  --tag-fg: #9ccc9c;
  --chart-1: #66bb6a;
  --chart-2: #43a047;
  --chart-3: #a5d6a7;
  --chart-4: #2e7d32;
  --chart-5: #1b5e20;
}
```

## orange (다크 + 오렌지 팔레트)

```css
:root {
  --bg: #1a0f08;
  --card: #2b1b0f;
  --border: #4a2f1a;
  --fg: #fef3e2;
  --muted: #e0b388;
  --accent: #ff9800;
  --tag-bg: #4a2f1a;
  --tag-fg: #e0b388;
  --chart-1: #ff9800;
  --chart-2: #fb8c00;
  --chart-3: #ffb74d;
  --chart-4: #e65100;
  --chart-5: #bf360c;
}
```

## 사용자 커스텀

사용자가 "색을 ~~로 바꿔줘" 요청 시, 해당 색상값을 HEX로 변환해 `--accent`와 `--chart-1`부터 갱신하고 나머지는 보색/명도 변형으로 채운다.

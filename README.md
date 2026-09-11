# 승제경애 가족 나들이 앱

```powershell
node server.js
```

Open `http://localhost:4173`. On every page load (and again every 15 minutes while left open), the app uses the current Korea-time weekend dates to run live web searches for Ilsan/Paju. It displays up to 12 results per recommendation group. If the public search is unavailable or cannot return enough regional results, it safely falls back to clearly marked **Demo Mode** cards. The weekend is calculated every request.

## Live data adapter

Set `LIVE_DATA_URL` (and optionally `LIVE_DATA_TOKEN`) before starting the server. Its server-side endpoint receives the exact weekend and the fixed Ilsan/Paju region, and returns source-verified normalized records. The UI will only display live records that contain an official URL and verification timestamp; missing operational details are rendered as `정보 확인 필요`.

This keeps search credentials and scraping logic off the phone/browser while allowing an official-site collector to replace the demo data without changing the UI.

## 가족에게 링크로 공유하기 (Render)

이 앱은 서버가 필요하므로 Netlify의 단순 정적 업로드보다 Render Web Service가 알맞습니다. GitHub에 이 폴더를 올린 뒤 Render에서 **New → Blueprint**를 선택하고 해당 저장소를 고르면 `render.yaml` 설정이 자동으로 적용됩니다. 배포가 끝나면 생성되는 `https://...onrender.com` 주소를 가족 메신저에 보내면 됩니다.

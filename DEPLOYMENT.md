# 部署指南

## � 將專案推送到 GitHub

### 1. 初始化 Git Repository
```bash
# 在專案根目錄執行
cd c:\Users\ryanshen\Desktop\genre-analyzer
git init
```

### 2. 創建 .gitignore 檔案
確保不會推送敏感資料和不必要的檔案：
```bash
# 創建 .gitignore 檔案
echo ".env
__pycache__/
*.pyc
*.pyo
.venv/
node_modules/
spotify-demo/dist/
spotify-demo/node_modules/
.vscode/
*.log" > .gitignore
```

### 3. 在 GitHub 上創建 Repository
1. 登入 [GitHub](https://github.com)
2. 點擊右上角的 "+" → "New repository"
3. 輸入 Repository 名稱，例如：`spotify-music-analyzer`
4. 設為 Public 或 Private（建議 Public）
5. **不要**勾選 "Add a README file"、"Add .gitignore"、"Choose a license"
6. 點擊 "Create repository"

### 4. 連接本地資料夾到 GitHub
```bash
# 添加所有檔案
git add .

# 提交初始版本
git commit -m "Initial commit: Spotify Music Analyzer with production-ready UI"

# 添加遠端 repository（替換成你的 GitHub 用戶名和 repo 名）
git remote add origin https://github.com/你的用戶名/spotify-music-analyzer.git

# 推送到 GitHub
git push -u origin main
```

### 5. 驗證推送成功
1. 回到 GitHub repository 頁面
2. 刷新頁面，應該能看到所有檔案
3. 確認 `.env` 檔案**沒有**被推送上去

---

## �🚀 部署到 Railway（推薦）

### 1. 準備工作
1. 將代碼推送到 GitHub repository
2. 註冊 [Railway](https://railway.app/) 帳號
3. 在 Spotify Developer Dashboard 準備好你的 Client ID 和 Secret

### 2. 建置前端
```bash
cd spotify-demo
npm install
npm run build
```

### 3. 複製前端檔案到後端
```bash
# 將 dist 資料夾複製到根目錄的 static 資料夾
cp -r spotify-demo/dist/* static/
```

### 4. 部署到 Railway
1. 在 Railway 建立新專案
2. 連接你的 GitHub repository
3. 設定環境變數：
   - `SPOTIFY_CLIENT_ID`: 你的 Spotify Client ID
   - `SPOTIFY_CLIENT_SECRET`: 你的 Spotify Client Secret  
   - `REDIRECT_URI`: `https://你的域名.railway.app/callback`

### 5. 更新 Spotify App 設定
在 Spotify Developer Dashboard 中：
1. 編輯你的 App
2. 在 Redirect URIs 中添加：`https://你的域名.railway.app/callback`

---

## 🛠 其他部署選項

### Render
1. 建立新的 Web Service
2. 連接 GitHub repository
3. 設定相同的環境變數
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Heroku
1. 安裝 Heroku CLI
2. 建立新 app: `heroku create your-app-name`
3. 設定環境變數: `heroku config:set SPOTIFY_CLIENT_ID=xxx`
4. 部署: `git push heroku main`

---

## ⚠️ 重要注意事項

1. **環境變數**: 絕對不要把 `.env` 檔案推送到 GitHub
2. **REDIRECT_URI**: 必須與 Spotify App 設定完全一致
3. **CORS**: 部署後可能需要調整 CORS 設定
4. **建置**: 確保前端已正確建置並複製到 static 資料夾

---

## 📁 部署前的檔案結構
```
genre-analyzer/
├── main.py                 # 後端 API
├── requirements.txt        # Python 依賴
├── Procfile               # 部署設定
├── runtime.txt            # Python 版本
├── static/                # 前端建置檔案
│   ├── index.html
│   ├── assets/
│   └── ...
└── spotify-demo/          # 原始前端代碼
    ├── src/
    ├── package.json
    └── ...
```

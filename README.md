# 🎵 Spotify 音樂品味分析器

> **一個現代化的 Spotify 音樂分析應用，讓你深度了解自己的音樂品味**

![Spotify Music Analyzer](https://img.shields.io/badge/Spotify-1DB954?style=for-the-badge&logo=spotify&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

## ✨ 功能特色

- � **現代化設計** - 採用玻璃擬態設計風格，漸層背景與流暢動畫
- 📊 **視覺化分析** - 互動式圓餅圖展示音樂類型分布
- 🎤 **熱門藝人追蹤** - 顯示你最愛的音樂創作者及其音樂風格
- 🎧 **熱門歌曲排行** - 展示你最常播放的音樂作品
- ⏰ **多時間範圍** - 支援最近 4 週、6 個月或所有時間的數據
- 📱 **響應式設計** - 完美支援桌面端、平板和手機
- 🔒 **隱私安全** - 僅讀取數據，不修改你的播放列表
- 🆓 **完全免費** - 支援 Spotify 免費和付費帳戶

## 🎯 產品亮點

### 🎨 設計語言
- **玻璃擬態美學** - 透明度與模糊效果營造現代感
- **動態漸層背景** - 紫藍色系漸層營造沉浸體驗  
- **精緻圖標系統** - 統一的 SVG 圖標與視覺語言
- **流暢微動效** - 懸停效果與載入動畫提升互動體驗

### 📈 數據洞察
- **智能分類** - 自動將細分音樂類型歸類到主要類別
- **趨勢分析** - 追蹤你的音樂品味變化
- **個性化報告** - 基於你的聽歌習慣生成專屬分析

## 🏗️ 技術架構

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React 前端     │◄──►│   FastAPI 後端    │◄──►│  Spotify API    │
│                 │    │                  │    │                 │
│ • Vite 建構工具  │    │ • Python 3.11+   │    │ • OAuth 2.0     │
│ • TailwindCSS   │    │ • 異步處理       │    │ • Web API       │
│ • Chart.js      │    │ • CORS 支援      │    │ • 即時數據      │
│ • 響應式設計     │    │ • Session 管理    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 前端技術棧
- **React 18** - 現代化 UI 庫，支援 Hooks 與函數組件
- **Vite** - 極速開發建構工具，支援 HMR 熱更新
- **Tailwind CSS** - 實用優先的 CSS 框架，快速樣式開發
- **Chart.js** - 高性能圖表庫，支援互動式數據視覺化
- **React Chart.js 2** - Chart.js 的 React 包裝器

### 後端技術棧
- **FastAPI** - 高性能 Python Web 框架，自動生成 API 文檔
- **Uvicorn** - ASGI 服務器，支援異步請求處理
- **HTTPX** - 現代化 HTTP 客戶端，支援異步請求
- **Python Dotenv** - 環境變數管理工具

### 架構特點
- **前後端分離** - 獨立部署，便於擴展與維護
- **異步處理** - 高效處理 Spotify API 請求
- **會話管理** - 安全的用戶認證與狀態管理
- **跨域支援** - 完整的 CORS 配置
- **響應式設計** - 適配各種設備尺寸

## 安裝與設定

### 1. Spotify 應用設定

1. 前往 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. 建立新的應用程式
3. 在應用設定中加入 Redirect URI: `http://localhost:8000/callback`
4. 記下 Client ID 和 Client Secret

### 2. 環境設定

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 檔案，填入你的 Spotify 憑證
# SPOTIFY_CLIENT_ID=你的_client_id
# SPOTIFY_CLIENT_SECRET=你的_client_secret
```

### 3. 後端設定與啟動

```bash
# 安裝 Python 依賴
pip install -r requirements.txt

# 啟動後端服務器 (FastAPI)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 前端設定與啟動

```bash
# 進入前端資料夾
cd spotify-demo

# 安裝 Node.js 依賴
npm install

# 啟動前端開發服務器 (Vite)
npm run dev
```

**🚨 Windows PowerShell 用戶注意**：如果遇到 `npm.ps1 cannot be loaded` 錯誤，請執行以下任一解決方案：

**方案 1 (推薦)**: 使用 Command Prompt (cmd) 而不是 PowerShell
```cmd
# 開啟 Command Prompt，然後執行：
cd spotify-demo
npm install
npm run dev
```

**方案 2**: 暫時允許 PowerShell 執行腳本
```powershell
# 在 PowerShell 中以管理員權限執行：
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# 然後再執行 npm 命令
```

**方案 3**: 使用 npx 代替
```powershell
# 在 PowerShell 中執行：
cd spotify-demo
npx npm install
npx npm run dev
```

## 使用方法

1. 確保後端服務器運行在 `http://localhost:8000`
2. 確保前端服務器運行在 `http://localhost:5173`
3. 在瀏覽器中打開 `http://localhost:5173`
4. 點擊 "Connect with Spotify" 進行授權
5. 授權完成後即可開始分析你的音樂品味！

## 主要 API 端點

- `GET /login` - Spotify 登入
- `GET /callback` - OAuth 回調
- `GET /api/status` - 檢查登入狀態
- `GET /api/analysis` - 音樂類型分析
- `GET /api/top-tracks` - 熱門歌曲
- `GET /api/top-artists` - 熱門藝人
- `GET /logout` - 登出

## 專案結構

```
genre-analyzer/
├── main.py                 # FastAPI 後端主程式
├── requirements.txt        # Python 依賴
├── .env.example           # 環境變數範本
├── README.md              # 說明文件
├── static/                # 靜態檔案 (如果有)
└── spotify-demo/          # React 前端專案
    ├── src/
    │   ├── App.jsx        # 主要 React 組件
    │   ├── main.jsx       # React 入口點
    │   └── ...
    ├── package.json       # Node.js 依賴
    └── vite.config.js     # Vite 配置
```

## 注意事項

- 需要有 Spotify 帳戶並且有收藏一些音樂才能看到分析結果
- 第一次使用需要進行 Spotify 授權
- 免費 Spotify 帳戶也可以使用
- 資料分析是基於你 Spotify 帳戶的收藏音樂和播放歷史

## 故障排除

如果遇到問題：

1. 確認 `.env` 文件中的 Spotify 憑證正確
2. 確認兩個服務器都在正確的端口運行
3. 檢查瀏覽器的網路請求是否有錯誤
4. 確認 Spotify 應用的 Redirect URI 設定正確

### 常見問題

**Q: 點擊 "Connect with Spotify" 後頁面沒有更新登入狀態**
**A**: 這個問題已修復！新版本使用以下方案解決跨域 cookie 問題：
1. OAuth 成功後，session ID 通過 URL 參數傳遞到前端
2. 前端將 session ID 存儲在 localStorage 中
3. 後續 API 調用通過 HTTP header (`X-Session-ID`) 發送 session
4. 如果問題仍然存在，請：
   - 重啟兩個服務器
   - 清除瀏覽器的所有數據（F12 → Application → Storage → Clear storage）
   - 檢查成功登入後 URL 是否包含 `?login=success&session=xxx` 參數

**Q: 瀏覽器控制台顯示 401 Unauthorized 錯誤**
```
INFO: 127.0.0.1:xxxxx - "GET /api/analysis HTTP/1.1" 401 Unauthorized
```
**A**: 這是正常的，表示前端在檢查登入狀態時發現用戶尚未登入。新版本已改用 `/api/status` 端點進行狀態檢查，減少不必要的錯誤日誌。

**Q: OAuth 登入時出現 "state mismatch" 錯誤**
```
{"detail":"state mismatch"}
```
**A**: 這個問題已修復。新版本改用後端內存存儲 OAuth state 而不是依賴 cookies，避免跨域問題。如果還是遇到問題，請：
1. 重啟後端服務器
2. 確認兩個服務器的端口正確
3. 清除瀏覽器的 cookies 和緩存

**Q: Windows PowerShell 無法執行 npm 命令**
```
npm: File C:\Program Files\nodejs\npm.ps1 cannot be loaded. The file is not digitally signed.
```
**A**: 這是 PowerShell 執行政策問題，請參考上面的 Windows PowerShell 用戶注意事項，建議使用 Command Prompt (cmd) 來執行 npm 命令。

**Q: 前端無法連接到後端 API**
**A**: 確認：
- 後端服務器正在 `http://localhost:8000` 運行
- 前端服務器正在 `http://localhost:5173` 運行  
- 檢查瀏覽器開發者工具的 Network 標籤是否有錯誤

**Q: Spotify 登入後沒有資料**
**A**: 確認你的 Spotify 帳戶有：
- 收藏一些音樂到「我的音樂」
- 有播放歷史記錄
- 帳戶地區支援 Spotify Web API

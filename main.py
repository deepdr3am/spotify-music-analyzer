# main.py
import os
import time
import uuid
from typing import Dict, List
from urllib.parse import urlencode

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi import Query
import httpx

load_dotenv()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:8000/callback")
SCOPE = "user-library-read user-top-read"

if not (SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET):
    raise RuntimeError("請在 .env 裡設定 SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET")

app = FastAPI()

# 動態 CORS 設定 - 支援開發和生產環境
ALLOWED_ORIGINS = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

# 如果是生產環境，添加部署域名
PRODUCTION_URL = os.getenv("PRODUCTION_URL")
if PRODUCTION_URL:
    ALLOWED_ORIGINS.append(PRODUCTION_URL)

# 添加 CORS 支援
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
# 為了讓 Vite 建置的 assets 能正確被訪問，額外掛載 assets 資料夾
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

# 簡單的記憶體 session：session_id -> {access_token, expires_at, refresh_token}
SESSIONS: Dict[str, Dict] = {}

# 存儲 OAuth state 的臨時字典
OAUTH_STATES: Dict[str, float] = {}  # state -> timestamp

def get_session_id(request: Request) -> str:
    """統一獲取 session ID 的輔助函數，支持 cookie 和 header"""
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = request.headers.get("X-Session-ID")
    return session_id

# 更詳細的 genre -> major bucket 映射
GENRE_BUCKET_MAP = {
    # Pop 相關
    "pop": "Pop",
    "k-pop": "Pop", 
    "j-pop": "Pop",
    "synthpop": "Pop",
    "indie pop": "Pop",
    "dance pop": "Pop",
    "electropop": "Pop",
    "bedroom pop": "Pop",
    "art pop": "Pop",
    "power pop": "Pop",
    
    # Rock 相關
    "rock": "Rock",
    "indie rock": "Rock", 
    "alternative rock": "Rock",
    "punk rock": "Rock",
    "hard rock": "Rock",
    "soft rock": "Rock",
    "classic rock": "Rock",
    "progressive rock": "Rock",
    "psychedelic rock": "Rock",
    "garage rock": "Rock",
    "folk rock": "Rock",
    "punk": "Rock",
    "metal": "Metal",
    "heavy metal": "Metal",
    "death metal": "Metal",
    "black metal": "Metal",
    
    # Electronic 相關
    "electronic": "Electronic",
    "house": "Electronic",
    "techno": "Electronic",
    "trance": "Electronic",
    "drum and bass": "Electronic",
    "dnb": "Electronic",
    "dubstep": "Electronic",
    "edm": "Electronic",
    "ambient": "Electronic",
    "downtempo": "Electronic",
    "chillwave": "Electronic",
    "synthwave": "Electronic",
    "vaporwave": "Electronic",
    "future bass": "Electronic",
    "trap": "Hip-Hop",  # Trap 更偏向 Hip-Hop
    
    # Hip-Hop 相關  
    "hip hop": "Hip-Hop",
    "hip-hop": "Hip-Hop",
    "rap": "Hip-Hop",
    "gangsta rap": "Hip-Hop",
    "conscious hip hop": "Hip-Hop",
    "old school hip hop": "Hip-Hop",
    
    # R&B 相關
    "r&b": "R&B",
    "rhythm and blues": "R&B",
    "neo soul": "R&B",
    "contemporary r&b": "R&B",
    "alternative r&b": "R&B",
    "soul": "R&B",
    
    # Jazz 相關
    "jazz": "Jazz",
    "smooth jazz": "Jazz",
    "jazz fusion": "Jazz",
    "bebop": "Jazz",
    "swing": "Jazz",
    
    # Folk / Indie 相關
    "folk": "Folk",
    "indie": "Indie",
    "indie folk": "Folk", 
    "americana": "Folk",
    "singer-songwriter": "Folk",
    "acoustic": "Folk",
    
    # 其他類型
    "country": "Country",
    "blues": "Blues",
    "reggae": "Reggae",
    "classical": "Classical",
    "lo-fi": "Lo-Fi",
    "lofi": "Lo-Fi",
    "chill": "Chill",
    "alternative": "Alternative",
    "latin": "Latin",
    "world": "World Music",
    "funk": "Funk",
    "disco": "Disco",
}

def map_genre_to_bucket(genre: str) -> str:
    """將音樂類型映射到主要分類，使用更智能的匹配邏輯"""
    if not genre:
        return "Unknown"
    
    genre_lower = genre.lower().strip()
    
    # 1. 精確匹配
    if genre_lower in GENRE_BUCKET_MAP:
        return GENRE_BUCKET_MAP[genre_lower]
    
    # 2. 子字符串匹配（按優先級排序）
    # 先匹配更具體的類型，再匹配通用的
    priority_keywords = [
        # 具體的電子音樂類型
        ("house", "Electronic"), ("techno", "Electronic"), ("trance", "Electronic"),
        ("dubstep", "Electronic"), ("drum and bass", "Electronic"), ("dnb", "Electronic"),
        
        # 具體的搖滾類型
        ("indie rock", "Rock"), ("alternative rock", "Rock"), ("punk rock", "Rock"),
        ("hard rock", "Rock"), ("metal", "Metal"),
        
        # 具體的流行音樂
        ("k-pop", "Pop"), ("j-pop", "Pop"), ("dance pop", "Pop"), ("indie pop", "Pop"),
        
        # Hip-Hop 相關
        ("hip hop", "Hip-Hop"), ("hip-hop", "Hip-Hop"), ("rap", "Hip-Hop"),
        
        # R&B 相關  
        ("r&b", "R&B"), ("soul", "R&B"), ("neo soul", "R&B"),
        
        # 其他具體類型
        ("indie folk", "Folk"), ("folk rock", "Rock"), ("jazz fusion", "Jazz"),
        ("smooth jazz", "Jazz"), ("country rock", "Country"), ("blues rock", "Blues"),
        
        # 通用匹配（放在最後）
        ("electronic", "Electronic"), ("pop", "Pop"), ("rock", "Rock"), 
        ("indie", "Indie"), ("folk", "Folk"), ("jazz", "Jazz"), 
        ("blues", "Blues"), ("country", "Country"), ("classical", "Classical"),
        ("latin", "Latin"), ("reggae", "Reggae"), ("alternative", "Alternative"),
        ("chill", "Chill"), ("lo-fi", "Lo-Fi"), ("lofi", "Lo-Fi"),
        ("ambient", "Electronic"), ("funk", "Funk"), ("disco", "Disco"),
    ]
    
    # 按優先級匹配
    for keyword, bucket in priority_keywords:
        if keyword in genre_lower:
            return bucket
    
    # 3. 如果都沒匹配到，返回原始類型（首字母大寫）
    # 避免全部歸類為 "Other"
    return genre.title() if len(genre) <= 15 else "Other"

@app.get("/", response_class=HTMLResponse)
async def index():
    path = "static/index.html"
    if os.path.exists(path):
        return FileResponse(path)
    else:
        return HTMLResponse("<h1>index.html not found</h1>", status_code=404)

@app.get("/login")
async def login(response: Response):
    state = str(uuid.uuid4())
    
    # 將 state 存儲在後端內存中，而不是依賴 cookie
    OAUTH_STATES[state] = time.time()
    
    # 清理過期的 states (超過10分鐘)
    current_time = time.time()
    expired_states = [s for s, t in OAUTH_STATES.items() if current_time - t > 600]
    for s in expired_states:
        del OAUTH_STATES[s]
    
    params = {
        "response_type": "code",
        "client_id": SPOTIFY_CLIENT_ID,
        "scope": SCOPE,
        "redirect_uri": REDIRECT_URI,
        "state": state,
        "show_dialog": "false",
    }
    auth_url = "https://accounts.spotify.com/authorize?" + urlencode(params)
    print(f"DEBUG - Setting state in memory: {state}")
    return RedirectResponse(auth_url)

@app.get("/callback")
async def callback(request: Request, code: str = None, state: str = None, error: str = None):
    # handle errors
    if error:
        return HTMLResponse(f"<h3>Spotify 登入錯誤: {error}</h3>")
    
    # 檢查 state 是否存在於後端存儲中
    print(f"DEBUG - Received state: {state}")
    print(f"DEBUG - Stored states: {list(OAUTH_STATES.keys())}")
    
    if state not in OAUTH_STATES:
        raise HTTPException(status_code=400, detail="invalid or expired state")
    
    # 驗證 state 沒有過期 (10分鐘)
    if time.time() - OAUTH_STATES[state] > 600:
        del OAUTH_STATES[state]
        raise HTTPException(status_code=400, detail="state expired")
    
    # 使用後刪除 state
    del OAUTH_STATES[state]
    
    # 交換 token
    token_url = "https://accounts.spotify.com/api/token"
    data = {"grant_type": "authorization_code", "code": code, "redirect_uri": REDIRECT_URI}
    auth = httpx.BasicAuth(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(token_url, data=data, auth=auth)
    if r.status_code != 200:
        raise HTTPException(status_code=400, detail="token exchange failed")
    token_json = r.json()
    access_token = token_json["access_token"]
    refresh_token = token_json.get("refresh_token")
    expires_in = token_json.get("expires_in", 3600)
    expires_at = time.time() + expires_in

    # 建立 session
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": expires_at,
    }

    # 動態判斷前端 URL - 根據環境決定重新導向位置
    frontend_url = os.getenv("FRONTEND_URL")
    if not frontend_url:
        # 如果沒有設定 FRONTEND_URL，根據 REDIRECT_URI 推斷
        if "railway.app" in REDIRECT_URI or "herokuapp.com" in REDIRECT_URI:
            # 生產環境：從 REDIRECT_URI 提取域名
            frontend_url = REDIRECT_URI.replace("/callback", "")
        else:
            # 本地開發環境
            frontend_url = "http://localhost:5173"
    
    # 重定向到前端地址，並將 session_id 作為 URL 參數傳遞
    response = RedirectResponse(url=f"{frontend_url}?login=success&session={session_id}")
    # 同時也嘗試設置 cookie（雖然可能不會跨域傳遞）
    response.set_cookie(
        "session_id", 
        session_id, 
        httponly=False,
        secure="https" in frontend_url,  # HTTPS 環境下啟用 secure
        samesite="lax"
    )
    print(f"DEBUG - Frontend URL: {frontend_url}")
    print(f"DEBUG - Setting session cookie: {session_id}")
    print(f"DEBUG - Redirecting with session in URL")
    return response

async def refresh_token_if_needed(session: Dict):
    if time.time() > session["expires_at"] - 60:  # expire soon
        token_url = "https://accounts.spotify.com/api/token"
        data = {"grant_type": "refresh_token", "refresh_token": session["refresh_token"]}
        auth = httpx.BasicAuth(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(token_url, data=data, auth=auth)
        if r.status_code == 200:
            j = r.json()
            session["access_token"] = j["access_token"]
            session["expires_at"] = time.time() + j.get("expires_in", 3600)

async def fetch_user_saved_tracks(access_token: str) -> List[Dict]:
    # fetch all saved tracks (limit 50 per request)
    url = "https://api.spotify.com/v1/me/tracks"
    headers = {"Authorization": f"Bearer {access_token}"}
    tracks = []
    params = {"limit": 50, "offset": 0}
    async with httpx.AsyncClient(timeout=20.0) as client:
        while True:
            r = await client.get(url, headers=headers, params=params)
            if r.status_code == 401:
                raise HTTPException(status_code=401, detail="access token invalid/expired")
            j = r.json()
            items = j.get("items", [])
            if not items:
                break
            tracks.extend(items)
            if j.get("next") is None:
                break
            params["offset"] += params["limit"]
    return tracks

async def fetch_artists_genres(access_token: str, artist_ids: List[str]) -> Dict[str, List[str]]:
    # batch fetch artists (50 at a time)
    headers = {"Authorization": f"Bearer {access_token}"}
    base = "https://api.spotify.com/v1/artists"
    out = {}
    async with httpx.AsyncClient(timeout=20.0) as client:
        for i in range(0, len(artist_ids), 50):
            batch = artist_ids[i:i+50]
            params = {"ids": ",".join(batch)}
            r = await client.get(base, headers=headers, params=params)
            if r.status_code != 200:
                raise HTTPException(status_code=400, detail="artist fetch failed")
            j = r.json()
            for artist in j.get("artists", []):
                out[artist["id"]] = artist.get("genres", [])
    return out

@app.get("/api/analysis")
async def analysis(request: Request):
    session_id = get_session_id(request)
    if not session_id or session_id not in SESSIONS:
        return JSONResponse({"error": "not_logged_in"}, status_code=401)
    session = SESSIONS[session_id]
    await refresh_token_if_needed(session)
    access_token = session["access_token"]

    tracks = await fetch_user_saved_tracks(access_token)
    if not tracks:
        return {"total_tracks": 0, "buckets": {}, "top_genres": []}

    # collect artist ids from saved tracks
    artist_ids = []
    for item in tracks:
        track = item.get("track") or {}
        artists = track.get("artists", [])
        for a in artists:
            artist_ids.append(a["id"])
    # dedupe
    artist_ids = list(dict.fromkeys(artist_ids))

    artist_genres = await fetch_artists_genres(access_token, artist_ids)

    # count genre occurences (per artist)
    genre_counts: Dict[str, int] = {}
    for aid, genres in artist_genres.items():
        if not genres:
            genre_counts.setdefault("unknown", 0)
            genre_counts["unknown"] += 1
        for g in genres:
            genre_counts[g] = genre_counts.get(g, 0) + 1

    # 統計每個藝術家的類型（避免重複計算）
    artist_bucket_counts: Dict[str, int] = {}
    processed_artists = set()  # 避免同一個藝術家被重複計算
    
    for aid, genres in artist_genres.items():
        if aid in processed_artists:
            continue
        processed_artists.add(aid)
        
        if not genres:
            artist_bucket_counts["Unknown"] = artist_bucket_counts.get("Unknown", 0) + 1
        else:
            # 對於每個藝術家，選擇最主要的類型（通常是第一個）
            primary_genre = genres[0] if genres else "unknown"
            bucket = map_genre_to_bucket(primary_genre)
            artist_bucket_counts[bucket] = artist_bucket_counts.get(bucket, 0) + 1

    # 合併相似的分類並限制數量
    final_buckets = {}
    min_count_threshold = max(1, len(processed_artists) * 0.02)  # 至少佔 2%
    
    for bucket, count in artist_bucket_counts.items():
        if count >= min_count_threshold:
            final_buckets[bucket] = count
        else:
            # 將小分類合併到 "Other"
            final_buckets["Other"] = final_buckets.get("Other", 0) + count
    
    # 如果分類太多（超過10個），合併最小的幾個
    if len(final_buckets) > 10:
        sorted_buckets = sorted(final_buckets.items(), key=lambda x: x[1], reverse=True)
        main_buckets = dict(sorted_buckets[:9])  # 保留前9個
        other_count = sum(count for _, count in sorted_buckets[9:])  # 其餘合併
        if other_count > 0:
            main_buckets["Other"] = other_count
        final_buckets = main_buckets

    # top N genres
    top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:20]

    return {
        "total_tracks": len(tracks),
        "buckets": final_buckets,
        "top_genres": top_genres
    }

@app.get("/api/status")
async def login_status(request: Request):
    """檢查用戶登入狀態的輕量級端點"""
    session_id = get_session_id(request)
    
    print(f"DEBUG - Status check - Session ID: {session_id}")
    print(f"DEBUG - Status check - All cookies: {dict(request.cookies)}")
    print(f"DEBUG - Status check - Session header: {request.headers.get('X-Session-ID')}")
    print(f"DEBUG - Status check - Active sessions: {list(SESSIONS.keys())}")
    
    if not session_id or session_id not in SESSIONS:
        return JSONResponse({"logged_in": False}, status_code=200)
    
    session = SESSIONS[session_id]
    # 檢查 token 是否還有效
    if time.time() > session["expires_at"]:
        # Token 已過期，嘗試刷新
        try:
            await refresh_token_if_needed(session)
            return JSONResponse({"logged_in": True}, status_code=200)
        except:
            # 刷新失敗，清除無效 session
            del SESSIONS[session_id]
            return JSONResponse({"logged_in": False}, status_code=200)
    
    return JSONResponse({"logged_in": True}, status_code=200)

@app.get("/logout")
async def logout(response: Response):
    response = RedirectResponse("/")
    response.delete_cookie("session_id")
    return response

@app.get("/api/top-tracks")
async def top_tracks(request: Request, time_range: str = Query("medium_term", regex="^(short_term|medium_term|long_term)$")):
    session_id = get_session_id(request)
    if not session_id or session_id not in SESSIONS:
        return JSONResponse({"error": "not_logged_in"}, status_code=401)
    session = SESSIONS[session_id]
    await refresh_token_if_needed(session)
    access_token = session["access_token"]

    url = "https://api.spotify.com/v1/me/top/tracks"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"time_range": time_range, "limit": 20}

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(url, headers=headers, params=params)
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail="failed to fetch top tracks")

    data = r.json()
    # 回傳詳細資料，包含播放時長等資訊
    results = []
    for item in data.get("items", []):
        results.append({
            "name": item["name"],
            "artists": [{"name": a["name"]} for a in item["artists"]],
            "album": {
                "name": item["album"]["name"],
                "images": item["album"].get("images", [])  # ✅ Include album images!
            },
            "popularity": item.get("popularity"),  # 流行度 (0-100)
            "duration_ms": item.get("duration_ms"),  # ✅ 歌曲時長（毫秒）
            "explicit": item.get("explicit", False),  # 是否為限制級內容
            "id": item["id"],
            "external_urls": item.get("external_urls", {}),
            "preview_url": item.get("preview_url"),  # ✅ 30秒預覽URL（如果可用）
        })
    return {"time_range": time_range, "top_tracks": results}

@app.get("/api/top-artists")
async def top_artists(request: Request, time_range: str = Query("medium_term", regex="^(short_term|medium_term|long_term)$")):
    session_id = get_session_id(request)
    if not session_id or session_id not in SESSIONS:
        return JSONResponse({"error": "not_logged_in"}, status_code=401)
    session = SESSIONS[session_id]
    await refresh_token_if_needed(session)
    access_token = session["access_token"]

    url = "https://api.spotify.com/v1/me/top/artists"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"time_range": time_range, "limit": 20}

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(url, headers=headers, params=params)
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail="failed to fetch top artists")

    data = r.json()
    # 回傳詳細資料，包含更多藝人資訊
    results = []
    for item in data.get("items", []):
        results.append({
            "name": item["name"],
            "genres": item.get("genres", []),
            "popularity": item.get("popularity"),  # 流行度 (0-100)
            "id": item["id"],
            "external_urls": item.get("external_urls", {}),
            "images": item.get("images", []),  # ✅ Include artist images!
            "followers": item.get("followers", {}),  # ✅ Include follower count!
            # 注意：Spotify API 不提供藝人的總播放時長資料
            # 這個資料只有 Spotify 內部才有
        })
    return {"time_range": time_range, "top_artists": results}
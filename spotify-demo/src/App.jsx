import { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [genreData, setGenreData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [topTracks, setTopTracks] = useState(null);
  const [topArtists, setTopArtists] = useState(null);
  const [timeRange, setTimeRange] = useState("medium_term");
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const chartRef = useRef(null);

  function getSessionHeaders() {
    const sessionId = localStorage.getItem("session_id");
    const headers = { "Content-Type": "application/json" };
    if (sessionId) {
      headers["X-Session-ID"] = sessionId;
    }
    return headers;
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loginStatus = urlParams.get("login");
    const sessionId = urlParams.get("session");

    if (loginStatus === "success" && sessionId) {
      localStorage.setItem("session_id", sessionId);
      window.history.replaceState({}, document.title, window.location.pathname);
      setLoggedIn(true);
      setIsInitializing(false);
    } else {
      checkLoginStatus();
    }
  }, []);

  // 監聽時間範圍變化，自動重新載入資料
  useEffect(() => {
    // 如果已登入且已有資料，當時間範圍改變時自動重新載入
    if (loggedIn && (analysisData || topTracks || topArtists) && !loading) {
      loadAllAnalysisData();
    }
  }, [timeRange]);

  async function checkLoginStatus() {
    try {
      const sessionId = localStorage.getItem("session_id");
      const headers = {};
      if (sessionId) {
        headers["X-Session-ID"] = sessionId;
      }

      const response = await fetch("/api/status", {
        credentials: "include",
        headers: headers,
      });

      if (response.ok) {
        const data = await response.json();
        setLoggedIn(data.logged_in);
        if (data.logged_in && data.user) {
          setUserProfile(data.user);
        }
      } else {
        setLoggedIn(false);
        localStorage.removeItem("session_id");
      }
    } catch (err) {
      setLoggedIn(false);
      localStorage.removeItem("session_id");
    } finally {
      setIsInitializing(false);
    }
  }

  async function onConnect() {
    setLoading(true);
    setError(null);
    window.location.href = "/login";
  }

  // 一鍵載入所有分析資料
  async function loadAllAnalysisData() {
    setLoading(true);
    setError(null);
    
    try {
      // 並行載入所有資料以提升效能
      const [analysisResponse, tracksResponse, artistsResponse] = await Promise.all([
        fetch("/api/analysis", {
          credentials: "include",
          headers: getSessionHeaders(),
        }),
        fetch(`/api/top-tracks?time_range=${timeRange}`, {
          credentials: "include",
          headers: getSessionHeaders(),
        }),
        fetch(`/api/top-artists?time_range=${timeRange}`, {
          credentials: "include",
          headers: getSessionHeaders(),
        })
      ]);

      // 檢查所有回應是否成功
      if (!analysisResponse.ok) {
        throw new Error("Failed to fetch analysis data");
      }
      if (!tracksResponse.ok) {
        throw new Error("Failed to fetch top tracks");
      }
      if (!artistsResponse.ok) {
        throw new Error("Failed to fetch top artists");
      }

      // 處理分析資料
      const analysisData = await analysisResponse.json();
      const tracksData = await tracksResponse.json();
      const artistsData = await artistsResponse.json();

      // 設定分析資料
      setAnalysisData(analysisData);
      setTopTracks(tracksData.top_tracks);
      setTopArtists(artistsData.top_artists);

      // 處理圓餅圖資料
      const buckets = analysisData.buckets || {};
      const labels = Object.keys(buckets);
      const values = Object.values(buckets);

      const colors = [
        "#1DB954", // Spotify Green - Pop
        "#FF6B6B", // Coral Red - Rock  
        "#4ECDC4", // Turquoise - Electronic
        "#45B7D1", // Sky Blue - Hip-Hop
        "#FFE66D", // Warm Yellow - R&B
        "#FF9F43", // Orange - Jazz
        "#A8E6CF", // Mint Green - Folk
        "#FFB3BA", // Light Pink - Country
        "#BFBFFF", // Lavender - Blues
        "#C7CEEA", // Periwinkle - Classical
        "#F8B500", // Golden Yellow - Latin
        "#FF8A80", // Light Coral - Indie
        "#81C784", // Light Green - Alternative
        "#64B5F6", // Light Blue - Reggae
        "#F06292", // Pink - Soul
      ];

      setGenreData({
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 0,
            hoverBorderWidth: 4,
            hoverBorderColor: "#FFFFFF",
            cutout: "65%",
            spacing: 2,
            borderRadius: 8,
            hoverOffset: 8,
          },
        ],
      });

    } catch (err) {
      setError(err.message);
      // 清空資料以防止顯示舊資料
      setAnalysisData(null);
      setGenreData(null);
      setTopTracks(null);
      setTopArtists(null);
    } finally {
      setLoading(false);
    }
  }

  // 格式化播放時長
  function formatDuration(ms) {
    if (!ms) return "--:--";
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  }

  // 處理播放預覽
  function handlePlayPreview(previewUrl, trackName) {
    if (!previewUrl) {
      alert(`很抱歉，"${trackName}" 沒有可用的預覽片段`);
      return;
    }
    
    // 創建新的音頻元素並播放
    const audio = new Audio(previewUrl);
    audio.play().catch(err => {
      console.error('播放失敗:', err);
      alert('播放失敗，請稍後再試');
    });
    
    // 30秒後自動停止
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 30000);
  }

  async function logout() {
    try {
      await fetch("/logout", { credentials: "include" });
      localStorage.removeItem("session_id");
      setLoggedIn(false);
      setGenreData(null);
      setAnalysisData(null);
      setTopTracks(null);
      setTopArtists(null);
      setUserProfile(null);
      setError(null);
    } catch (err) {
      localStorage.removeItem("session_id");
      setLoggedIn(false);
    }
  }

  // Loading skeleton component
  const SkeletonCard = ({ className = "" }) => (
    <div className={`bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl animate-pulse ${className}`}>
      <div className="h-6 bg-gray-700 rounded-lg mb-4 w-3/4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-700 rounded w-4/6"></div>
      </div>
    </div>
  );

  // Error boundary component  
  const ErrorCard = ({ message, onRetry }) => (
    <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-sm p-6 rounded-2xl shadow-xl">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm">⚠</span>
        </div>
        <h3 className="text-lg font-semibold text-red-400">發生錯誤</h3>
      </div>
      <p className="text-gray-300 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
        >
          重新嘗試
        </button>
      )}
    </div>
  );

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">正在初始化應用程式...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-gray-100 relative overflow-hidden">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl text-center max-w-sm mx-4">
            <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-white mb-2">正在分析中...</h3>
            <p className="text-gray-300 text-sm">
              正在載入音樂類型、熱門歌曲和藝人數據
            </p>
            <div className="mt-4 flex justify-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🎵</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Spotify 音樂分析器
            </h1>
          </div>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            深入了解你的音樂品味，發現隱藏的聆聽模式，探索個人音樂宇宙
          </p>
        </div>
      </header>

      {/* Global Error Display */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 mb-6 relative z-10">
          <ErrorCard message={error} onRetry={() => setError(null)} />
        </div>
      )}

      {!loggedIn ? (
        <div className="max-w-lg mx-auto px-4 relative z-10">
          <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl hover:shadow-green-500/10 transition-all duration-500">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl mx-auto mb-6">
                <span className="text-3xl">🎧</span>
              </div>
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                連接你的 Spotify
              </h2>
              <p className="text-gray-400 leading-relaxed">
                安全登入後開始分析你的音樂品味
                <br />
                <span className="text-sm opacity-75">我們不會存儲你的登入資訊</span>
              </p>
            </div>
            
            <button
              onClick={onConnect}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  連接中...
                </>
              ) : (
                <>
                  <span className="text-xl">�</span>
                  連接 Spotify 帳號
                </>
              )}
            </button>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                點擊連接即表示您同意我們的 
                <span className="text-green-400 hover:text-green-300 cursor-pointer">服務條款</span> 和 
                <span className="text-green-400 hover:text-green-300 cursor-pointer">隱私政策</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          {/* User Profile Section */}
          {userProfile && (
            <div className="mb-8">
              <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl shadow-xl">
                <div className="flex items-center gap-4">
                  {userProfile.images?.[0] && (
                    <img
                      src={userProfile.images[0].url}
                      alt={userProfile.display_name}
                      className="w-16 h-16 rounded-full border-2 border-green-400"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      歡迎回來, {userProfile.display_name || "音樂愛好者"}! 👋
                    </h2>
                    <p className="text-gray-400">
                      {userProfile.followers?.total?.toLocaleString() || 0} 個粉絲 • {userProfile.country || "Unknown"} 
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Control Panel */}
          <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-4 md:p-6 rounded-3xl shadow-xl mb-8">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 md:gap-4">
              {/* 一鍵分析按鈕 */}
              <button
                onClick={loadAllAnalysisData}
                disabled={loading}
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 md:px-8 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">分析中...</span>
                    <span className="sm:hidden">分析中</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">🎯</span>
                    <span className="hidden sm:inline">開始完整分析</span>
                    <span className="sm:hidden">開始分析</span>
                  </>
                )}
              </button>
              
              {/* 時間範圍選擇器 */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-gray-400 font-medium text-sm md:text-base hidden md:inline">時間範圍:</span>
                <span className="text-gray-400 font-medium text-sm md:inline">範圍:</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  disabled={loading}
                  className="bg-gray-700/50 backdrop-blur-sm border border-gray-600 text-white px-3 md:px-4 py-2 md:py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm md:text-base flex-1 disabled:opacity-50"
                >
                  <option value="short_term">最近 4 週</option>
                  <option value="medium_term">最近 6 個月</option>
                  <option value="long_term">所有時間</option>
                </select>
                {(analysisData || topTracks || topArtists) && (
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full hidden sm:inline">
                    {loading ? "更新中..." : "已載入"}
                  </span>
                )}
              </div>
              
              {/* 登出按鈕 */}
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 md:px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-2"
              >
                <span className="text-lg">🚪</span>
                <span className="hidden sm:inline">登出</span>
              </button>
            </div>
            
            {/* 提示文字 */}
            {!analysisData && !topTracks && !topArtists && !loading && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">💡</span>
                  </div>
                  <h4 className="text-blue-300 font-semibold">一鍵完整分析</h4>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  點擊「開始完整分析」按鈕，系統會自動載入：
                  <br />• 🎨 音樂類型分布圓餅圖
                  <br />• 🎵 你的熱門歌曲排行（含時長）
                  <br />• 🎤 你的熱門藝人排行（含粉絲數）
                  <br /><span className="text-blue-300">調整時間範圍會自動更新所有內容</span>
                </p>
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Genre Analysis Card */}
            {loading && !genreData ? (
              <SkeletonCard className="lg:col-span-2" />
            ) : genreData && analysisData ? (
              <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-6 md:p-8 rounded-3xl shadow-2xl hover:shadow-green-500/10 transition-all duration-500">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-8 md:w-10 h-8 md:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                    <span className="text-base md:text-lg">🎨</span>
                  </div>
                  <h3 className="text-lg md:text-2xl font-bold text-white">音樂類型分布</h3>
                  <div className="ml-auto text-xs md:text-sm text-gray-400 bg-gray-700/50 px-2 md:px-3 py-1 rounded-full">
                    共 {Object.values(analysisData.buckets || {}).reduce((a, b) => a + b, 0)} 位藝人
                  </div>
                </div>
                
                <div className="relative flex flex-col lg:flex-row items-center gap-6">
                  {/* 圓餅圖容器 */}
                  <div className="flex-1 relative w-full lg:w-auto" style={{ minHeight: '300px' }}>
                    <Doughnut 
                      ref={chartRef}
                      data={genreData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false  // 隱藏默認圖例，使用自定義圖例
                          },
                          tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            titleColor: '#F9FAFB',
                            titleFont: { family: 'Inter, sans-serif', weight: '600' },
                            bodyColor: '#E5E7EB',
                            bodyFont: { family: 'Inter, sans-serif' },
                            borderColor: '#1DB954',
                            borderWidth: 2,
                            cornerRadius: 12,
                            padding: 12,
                            callbacks: {
                              label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} 位藝人 (${percentage}%)`;
                              }
                            }
                          }
                        },
                        layout: {
                          padding: {
                            top: 20,
                            bottom: 20,
                            left: 20,
                            right: 20
                          }
                        },
                        animation: {
                          animateRotate: true,
                          animateScale: true,
                          duration: 1500,
                          easing: 'easeOutQuart'
                        }
                      }} 
                      height={300}
                    />
                    
                    {/* 中心標籤 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-white">
                          {Object.keys(analysisData.buckets || {}).length}
                        </div>
                        <div className="text-sm md:text-base text-gray-400">音樂類型</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 自定義圖例 */}
                  <div className="flex-shrink-0 w-full lg:w-64">
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                      {genreData.labels.map((label, index) => {
                        const total = genreData.datasets[0].data.reduce((a, b) => a + b, 0);
                        const value = genreData.datasets[0].data[index];
                        const percentage = ((value / total) * 100).toFixed(1);
                        return (
                          <div key={label} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/30 transition-colors">
                            <div 
                              className="w-4 h-4 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: genreData.datasets[0].backgroundColor[index] }}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate">{label}</div>
                              <div className="text-xs text-gray-400">{value} 位 • {percentage}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Top Tracks Card */}
            {loading && !topTracks ? (
              <SkeletonCard />
            ) : topTracks ? (
              <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-6 md:p-8 rounded-3xl shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-8 md:w-10 h-8 md:h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-base md:text-lg">🎵</span>
                  </div>
                  <h3 className="text-lg md:text-2xl font-bold text-white">熱門歌曲</h3>
                  <span className="ml-auto text-xs md:text-sm text-gray-400 bg-gray-700/50 px-2 md:px-3 py-1 rounded-full">
                    {timeRange === 'short_term' ? '4週' : timeRange === 'medium_term' ? '6個月' : '全部'}
                  </span>
                </div>
                
                <div className="space-y-3 md:space-y-4 max-h-80 md:max-h-96 overflow-y-auto custom-scrollbar">
                  {topTracks.map((track, index) => (
                    <div key={track.id} className="group flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-2xl hover:bg-gray-700/30 transition-all duration-300">
                      <div className="flex-shrink-0 relative">
                        <span className="absolute -top-1 md:-top-2 -left-1 md:-left-2 w-5 md:w-6 h-5 md:h-6 bg-gradient-to-br from-purple-400 to-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <img
                          src={track.album?.images?.[0]?.url || '/placeholder-album.svg'}
                          alt={track.name}
                          className="w-10 md:w-12 h-10 md:h-12 rounded-xl shadow-lg group-hover:shadow-purple-500/20 transition-shadow duration-300"
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = '/placeholder-album.svg';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm md:text-base truncate group-hover:text-purple-300 transition-colors">
                          {track.name}
                          {track.explicit && <span className="ml-1 text-xs bg-gray-600 text-gray-300 px-1 rounded">E</span>}
                        </p>
                        <p className="text-gray-400 text-xs md:text-sm truncate">
                          {track.artists?.map((artist) => artist.name || artist).join(", ")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatDuration(track.duration_ms)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {track.preview_url ? (
                          <button 
                            onClick={() => handlePlayPreview(track.preview_url, track.name)}
                            className="w-6 md:w-8 h-6 md:h-8 bg-purple-500 hover:bg-purple-600 text-white rounded-full flex items-center justify-center transition-colors"
                            title="播放 30 秒預覽"
                          >
                            <span className="text-xs">▶</span>
                          </button>
                        ) : (
                          <div className="w-6 md:w-8 h-6 md:h-8 bg-gray-600 text-gray-400 rounded-full flex items-center justify-center" title="無預覽">
                            <span className="text-xs">⚠</span>
                          </div>
                        )}
                        {track.external_urls?.spotify && (
                          <a 
                            href={track.external_urls.spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-6 md:w-8 h-6 md:h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                            title="在 Spotify 中開啟"
                          >
                            <span className="text-xs font-bold">S</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Top Artists Card */}
            {loading && !topArtists ? (
              <SkeletonCard className="lg:col-span-2" />
            ) : topArtists ? (
              <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 p-6 md:p-8 rounded-3xl shadow-2xl hover:shadow-pink-500/10 transition-all duration-500">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-8 md:w-10 h-8 md:h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center">
                    <span className="text-base md:text-lg">🎤</span>
                  </div>
                  <h3 className="text-lg md:text-2xl font-bold text-white">熱門藝人</h3>
                  <span className="ml-auto text-xs md:text-sm text-gray-400 bg-gray-700/50 px-2 md:px-3 py-1 rounded-full">
                    {timeRange === 'short_term' ? '4週' : timeRange === 'medium_term' ? '6個月' : '全部'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                  {topArtists.map((artist, index) => (
                    <div key={artist.id} className="group relative bg-gray-700/30 hover:bg-gray-700/50 p-3 md:p-4 rounded-2xl transition-all duration-300 hover:scale-105">
                      <div className="absolute -top-1 md:-top-2 -left-1 md:-left-2 w-6 md:w-8 h-6 md:h-8 bg-gradient-to-br from-pink-400 to-pink-600 text-white text-xs md:text-sm font-bold rounded-full flex items-center justify-center shadow-lg">
                        {index + 1}
                      </div>
                      
                      <div className="flex flex-col items-center text-center">
                        <div className="relative mb-2 md:mb-4">
                          <img
                            src={artist.images?.[0]?.url || '/placeholder-artist.svg'}
                            alt={artist.name}
                            className="w-16 md:w-20 h-16 md:h-20 rounded-full shadow-xl group-hover:shadow-pink-500/30 transition-shadow duration-300"
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = '/placeholder-artist.svg';
                            }}
                          />
                          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        
                        <h4 className="text-white font-bold text-sm md:text-lg mb-1 group-hover:text-pink-300 transition-colors line-clamp-2">
                          {artist.name}
                        </h4>
                        <div className="space-y-1 mb-2">
                          <p className="text-gray-400 text-xs md:text-sm">
                            {artist.followers?.total?.toLocaleString() || 0} 粉絲
                          </p>
                        </div>
                        
                        {artist.genres && artist.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center mb-2">
                            {artist.genres.slice(0, 2).map((genre, genreIndex) => (
                              <span key={genreIndex} className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full">
                                {genre.length > 8 ? `${genre.slice(0, 8)}...` : genre}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 藝人操作按鈕 */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          {artist.external_urls?.spotify && (
                            <a 
                              href={artist.external_urls.spotify}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded-full transition-colors"
                            >
                              <span className="font-bold">S</span>
                              <span>查看</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
              <span>Powered by</span>
              <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <span className="font-semibold">Spotify Web API</span>
            </div>
            <p className="text-gray-500 text-xs mt-2">
              © 2024 音樂分析器 • 僅用於個人音樂品味分析
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

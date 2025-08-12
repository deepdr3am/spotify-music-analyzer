import { useState, useEffect } from "react"
import { Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js"

ChartJS.register(ArcElement, Tooltip, Legend)

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [genreData, setGenreData] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)
  const [topTracks, setTopTracks] = useState(null)
  const [topArtists, setTopArtists] = useState(null)
  const [timeRange, setTimeRange] = useState("medium_term")
  const [error, setError] = useState(null)

  // 獲取 session headers 的輔助函數
  function getSessionHeaders() {
    const sessionId = localStorage.getItem('session_id')
    const headers = { 'Content-Type': 'application/json' }
    if (sessionId) {
      headers['X-Session-ID'] = sessionId
    }
    return headers
  }

  // 檢查登入狀態
  useEffect(() => {
    // 檢查是否從成功的 OAuth 回調返回，並且有 session 參數
    const urlParams = new URLSearchParams(window.location.search)
    const loginStatus = urlParams.get('login')
    const sessionId = urlParams.get('session')
    
    if (loginStatus === 'success' && sessionId) {
      console.log('Detected successful OAuth callback with session:', sessionId)
      // 將 session ID 存儲到 localStorage
      localStorage.setItem('session_id', sessionId)
      // 清除 URL 參數
      window.history.replaceState({}, document.title, window.location.pathname)
      // 設置登入狀態
      setLoggedIn(true)
    } else {
      // 正常的登入狀態檢查
      checkLoginStatus()
    }
  }, [])

  async function checkLoginStatus() {
    try {
      console.log('Checking login status...')
      
      // 嘗試從 localStorage 獲取 session_id
      const sessionId = localStorage.getItem('session_id')
      console.log('Session ID from localStorage:', sessionId)
      
      const headers = {}
      if (sessionId) {
        headers['X-Session-ID'] = sessionId
      }
      
      const response = await fetch('/api/status', { 
        credentials: 'include',
        headers: headers
      })
      console.log('Status response:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Status data:', data)
        setLoggedIn(data.logged_in)
      } else {
        console.log('Status check failed')
        setLoggedIn(false)
        // 如果檢查失敗，清除 localStorage
        localStorage.removeItem('session_id')
      }
    } catch (err) {
      console.error('Failed to check login status:', err)
      setLoggedIn(false)
      localStorage.removeItem('session_id')
    }
  }

  async function onConnect() {
    setLoading(true)
    setError(null)
    window.location.href = "/login"
  }

  async function loadAnalysisData() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analysis', { 
        credentials: 'include',
        headers: getSessionHeaders()
      })
      if (!response.ok) {
        throw new Error('Failed to fetch analysis data')
      }
      
      const data = await response.json()
      setAnalysisData(data)

      // 轉換為圖表格式
      const buckets = data.buckets || {}
      const labels = Object.keys(buckets)
      const values = Object.values(buckets)
      
      const colors = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
        "#f97316", "#06b6d4", "#84cc16", "#ec4899", "#6366f1"
      ]

      setGenreData({
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: "#1f2937"
        }],
      })
    } catch (err) {
      setError(err.message)
      console.error('Error loading analysis:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadTopTracks() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/top-tracks?time_range=${timeRange}`, { 
        credentials: 'include',
        headers: getSessionHeaders()
      })
      if (!response.ok) {
        throw new Error('Failed to fetch top tracks')
      }
      
      const data = await response.json()
      setTopTracks(data.top_tracks)
    } catch (err) {
      setError(err.message)
      console.error('Error loading top tracks:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadTopArtists() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/top-artists?time_range=${timeRange}`, { 
        credentials: 'include',
        headers: getSessionHeaders()
      })
      if (!response.ok) {
        throw new Error('Failed to fetch top artists')
      }
      
      const data = await response.json()
      setTopArtists(data.top_artists)
    } catch (err) {
      setError(err.message)
      console.error('Error loading top artists:', err)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      await fetch('/logout', { credentials: 'include' })
      // 清除 localStorage 中的 session
      localStorage.removeItem('session_id')
      setLoggedIn(false)
      setGenreData(null)
      setAnalysisData(null)
      setTopTracks(null)
      setTopArtists(null)
      setError(null)
    } catch (err) {
      console.error('Logout error:', err)
      // 即使請求失敗，也要清除本地狀態
      localStorage.removeItem('session_id')
      setLoggedIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Spotify
              </span>
              {" "}
              <span className="text-white">音樂品味分析</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              深度分析你的音樂品味，發現你的聽歌模式，探索音樂世界的無限可能
            </p>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="bg-red-500/20 border border-red-500/30 text-red-100 p-4 rounded-xl backdrop-blur-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">錯誤：</span> {error}
            </div>
          </div>
        </div>
      )}

      {!loggedIn ? (
        /* Login Section */
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 shadow-2xl border border-white/20">
              <div className="mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.297.539-1.02.718-1.559.42z"/>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">開始你的音樂探索之旅</h2>
                <p className="text-blue-100 text-lg mb-8">
                  連接你的 Spotify 帳戶，讓我們分析你獨特的音樂品味
                </p>
              </div>
              
              <div className="space-y-6">
                <button
                  onClick={onConnect}
                  disabled={loading}
                  className="group relative w-full max-w-sm mx-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      連接中...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.297.539-1.02.718-1.559.42z"/>
                      </svg>
                      🎧 連接 Spotify 帳戶
                    </>
                  )}
                </button>
                
                <div className="text-sm text-blue-200 max-w-md mx-auto">
                  <p>✓ 100% 安全連接</p>
                  <p>✓ 支援免費與付費帳戶</p>
                  <p>✓ 我們不會修改你的播放列表</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Main Dashboard */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {/* Control Panel */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 shadow-xl border border-white/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={loadAnalysisData}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {loading ? "分析中..." : "📊 分析收藏音樂"}
                </button>

                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-white/10 border border-white/20 text-white px-4 py-3 rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="short_term" className="text-gray-800">最近 4 週</option>
                  <option value="medium_term" className="text-gray-800">最近 6 個月</option>
                  <option value="long_term" className="text-gray-800">所有時間</option>
                </select>

                <button
                  onClick={loadTopTracks}
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                  🎵 熱門歌曲
                </button>

                <button
                  onClick={loadTopArtists}
                  disabled={loading}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  🎤 熱門藝人
                </button>
              </div>

              <button
                onClick={logout}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                登出
              </button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* Genre Analysis Chart */}
            {genreData && (
              <div className="xl:col-span-2">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 h-full">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">音樂類型分析</h2>
                      <p className="text-blue-200">你的音樂品味分布</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col lg:flex-row items-center">
                    <div className="w-full max-w-sm mx-auto lg:mx-0">
                      <Doughnut 
                        data={genreData} 
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                color: '#e5e7eb',
                                font: {
                                  size: 12
                                },
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: 'circle'
                              }
                            },
                            tooltip: {
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              titleColor: '#ffffff',
                              bodyColor: '#ffffff',
                              borderColor: '#ffffff',
                              borderWidth: 1,
                              cornerRadius: 8
                            }
                          }
                        }}
                      />
                    </div>
                    
                    {analysisData && (
                      <div className="mt-6 lg:mt-0 lg:ml-8 flex-1">
                        <div className="bg-white/5 rounded-xl p-4">
                          <h3 className="text-lg font-semibold text-white mb-3">分析統計</h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-blue-200">總歌曲數</span>
                              <span className="text-white font-bold text-xl">{analysisData.total_tracks}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-blue-200">音樂類型數</span>
                              <span className="text-white font-bold text-xl">{Object.keys(analysisData.buckets || {}).length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-blue-200">最愛類型</span>
                              <span className="text-green-400 font-bold">{Object.entries(analysisData.buckets || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Genre Analysis */}
            {analysisData && (
              <div className="lg:col-span-1">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 h-full">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2m-6 0h6m0 0v2a1 1 0 011 1v1a1 1 0 01-1 1H7a1 1 0 01-1-1V7a1 1 0 011-1V4z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">熱門音樂類型</h2>
                      <p className="text-blue-200">你最常聽的音樂風格</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {analysisData.top_genres.slice(0, 10).map(([genre, count], index) => (
                      <div key={genre} className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-white capitalize">{genre}</p>
                              <p className="text-sm text-blue-200">{count} 次出現</p>
                            </div>
                          </div>
                          <div className="w-12 h-2 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                              style={{ width: `${(count / Math.max(...analysisData.top_genres.map(([,c]) => c))) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

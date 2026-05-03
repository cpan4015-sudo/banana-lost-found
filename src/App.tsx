import { useState } from 'react'
import LostFoundCardPage from './LostFoundCardPage'
import PosterPage from './PosterPage'

export default function App() {
  const [page, setPage] = useState<'card' | 'poster'>('poster')

  return (
    <div>
      {/* 顶部导航 */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍌</span>
              <span className="font-bold text-lg text-gray-800">香蕉攀岩</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage('poster')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  page === 'poster'
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🎨 海报生成
              </button>
              <button
                onClick={() => setPage('card')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  page === 'card'
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🖼️ 单张卡片
              </button>
            </div>
          </div>
        </div>
      </nav>

      {page === 'poster' ? <PosterPage /> : <LostFoundCardPage />}
    </div>
  )
}

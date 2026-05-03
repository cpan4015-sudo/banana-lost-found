import { useState, useRef, useCallback, useEffect } from 'react'

interface Item {
  id: string
  name: string
  category: 'clothing' | 'equipment'
  originalImage: string // 原始图 base64
  cutoutImage: string   // 抠图 base64
  status: 'pending' | 'segmenting' | 'done' | 'error'
  error?: string
}

const classifyItem = (name: string): 'clothing' | 'equipment' => {
  const clothing = ['外套', '衬衫', '裤子', '牛仔裤', '连衣裙', '裙子', '鞋子', '运动鞋', '靴子', '帽子', '围巾', '手套', '袜子', '领带', '皮带', '手表', '背包', '手提包', '行李箱', '衣服', '衣', '裤', '袜', '帽', '鞋', '衬', '衫', '裙', '裤', '袄', '装', '套头', '卫衣', '帽衫']
  const eq = ['水壶', '杯子', '书', '笔记本', '电脑', '手机', '相机', '钱包', '钥匙', '头盔', '球', '球拍', '自行车', '滑板', '毛巾', '雨伞', '包', '袋', '充电宝', '耳机', '水杯', '眼镜', '墨镜', '手表']
  if (clothing.some(c => name.includes(c))) return 'clothing'
  if (eq.some(e => name.includes(e))) return 'equipment'
  return 'equipment'
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

const formatDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`

// ========== 海报画布渲染 ==========
async function renderPoster(items: Item[], canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const W = 1200
  const headerH = 200
  const footerH = 120
  const titleH = 70
  const itemW = 260
  const itemH = 210
  const gapX = 20
  const gapY = 20
  const cols = 4
  const startX = (W - cols * itemW - (cols - 1) * gapX) / 2

  const clothing = items.filter(i => i.category === 'clothing' && i.status === 'done')
  const equipment = items.filter(i => i.category === 'equipment' && i.status === 'done')
  const clothingRows = Math.ceil(clothing.length / cols) || 0
  const equipRows = Math.ceil(equipment.length / cols) || 0
  const bodyH = (clothingRows > 0 ? clothingRows * (itemH + gapY) + titleH : 0)
    + (equipRows > 0 ? equipRows * (itemH + gapY) + titleH : 0) + 80
  const H = headerH + bodyH + footerH

  canvas.width = W
  canvas.height = H

  // 背景
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#fff8f0')
  bg.addColorStop(1, '#fff0f8')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Header
  const headerGrad = ctx.createLinearGradient(0, 0, W, 0)
  headerGrad.addColorStop(0, '#ff6b35')
  headerGrad.addColorStop(1, '#ff8c42')
  ctx.fillStyle = headerGrad
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, headerH - 30)
  ctx.quadraticCurveTo(W * 0.7, headerH + 10, W * 0.5, headerH)
  ctx.quadraticCurveTo(W * 0.3, headerH - 10, 0, headerH)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath()
  ctx.arc(W - 80, 60, 120, 0, Math.PI * 2)
  ctx.fill()

  const today = new Date()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 48px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('🍌 香蕉攀岩 · 失物招领', 40, 80)
  ctx.font = '22px "Microsoft YaHei", sans-serif'
  ctx.fillText('如有遗失，请联系前台领取', 40, 120)
  ctx.textAlign = 'right'
  ctx.font = 'bold 42px Arial'
  ctx.fillText(`${today.getMonth() + 1}月${today.getDate()}日`, W - 40, 80)
  ctx.font = '16px Arial'
  ctx.fillText(`${today.getFullYear()}年`, W - 40, 110)
  ctx.textAlign = 'left'

  // 绘制物品
  let curY = headerH + 40

  if (clothing.length > 0) {
    ctx.fillStyle = '#ff6b35'
    ctx.font = 'bold 30px "Microsoft YaHei", sans-serif'
    ctx.fillText('👕 服饰类', 40, curY + 30)
    ctx.font = '18px "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#999'
    ctx.fillText(`共${clothing.length}件`, 240, curY + 30)
    ctx.fillStyle = '#333'
    curY += titleH

    for (let i = 0; i < clothing.length; i++) {
      const col = i % cols, row = Math.floor(i / cols)
      const x = startX + col * (itemW + gapX), y = curY + row * (itemH + gapY)
      drawItemCard(ctx, clothing[i], x, y, itemW, itemH)
    }
    curY += clothingRows * (itemH + gapY) + 50
  }

  if (equipment.length > 0) {
    ctx.fillStyle = '#ff6b35'
    ctx.font = 'bold 30px "Microsoft YaHei", sans-serif'
    ctx.fillText('🧗 装备类', 40, curY + 30)
    ctx.font = '18px "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#999'
    ctx.fillText(`共${equipment.length}件`, 240, curY + 30)
    ctx.fillStyle = '#333'
    curY += titleH

    for (let i = 0; i < equipment.length; i++) {
      const col = i % cols, row = Math.floor(i / cols)
      const x = startX + col * (itemW + gapX), y = curY + row * (itemH + gapY)
      drawItemCard(ctx, equipment[i], x, y, itemW, itemH)
    }
    curY += equipRows * (itemH + gapY) + 50
  }

  // Footer
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, H - footerH, W, footerH)
  ctx.fillStyle = '#ffffff'
  ctx.font = '18px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('📍 全国26家门店  |  🌐 bananaclimbing.com  |  📞 联系前台', W / 2, H - footerH + 45)
  ctx.font = '14px "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#aaa'
  ctx.fillText('Touch & Fun · 让攀岩触手可及', W / 2, H - footerH + 75)
  ctx.textAlign = 'left'
}

function drawItemCard(ctx: CanvasRenderingContext2D, item: Item, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(255,107,53,0.15)'
  ctx.shadowBlur = 15
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 14)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 14)
  ctx.stroke()

  if (item.cutoutImage) {
    loadImage(item.cutoutImage).then(img => {
      const scale = Math.min((w - 40) / img.width, (h - 60) / img.height)
      const iw = img.width * scale, ih = img.height * scale
      ctx.drawImage(img, x + (w - iw) / 2, y + 15, iw, ih)
    }).catch(() => {})
  }

  ctx.fillStyle = '#333'
  ctx.font = 'bold 16px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(item.name, x + w / 2, y + h - 15)
  ctx.textAlign = 'left'
}

// ========== 组件 ==========
export default function PosterPage() {
  const [items, setItems] = useState<Item[]>([])
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [msg, setMsg] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 抠图（云端API）
  const segmentImage = async (id: string, base64Image: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'segmenting' as const } : i))
    try {
      const res = await fetch('/api/segment', {
        method: 'POST',
        body: (() => {
          const fd = new FormData()
          // 把 base64 转回 File
          const byteString = atob(base64Image.split(',')[1])
          const mimeType = base64Image.match(/data:([^;]+)/)?.[1] || 'image/png'
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
          const blob = new Blob([ab], { type: mimeType })
          fd.append('image', blob, 'image.png')
          return fd
        })(),
      })
      const data = await res.json()
      if (data.success && data.image) {
        setItems(prev => prev.map(i =>
          i.id === id
            ? { ...i, cutoutImage: `data:image/png;base64,${data.image}`, status: 'done' as const }
            : i
        ))
      } else {
        throw new Error(data.error || '抠图失败')
      }
    } catch (err: any) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'error', error: err.message } : i))
    }
  }

  // 上传图片
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        const id = `item-${Date.now()}-${Math.random()}`
        // 用识别API猜测物品名
        let guessedName = '待识别物品'
        try {
          const fd = new FormData()
          const blob = await (await fetch(dataUrl)).blob()
          fd.append('image', blob, file.name)
          const r = await fetch('/api/recognize', { method: 'POST', body: fd })
          const d = await r.json()
          if (d.success && d.items?.length > 0) {
            guessedName = d.items[0].name
          }
        } catch (_) {}

        const newItem: Item = {
          id, name: guessedName, category: classifyItem(guessedName),
          originalImage: dataUrl, cutoutImage: '', status: 'pending',
        }
        setItems(prev => [...prev, newItem])
        // 自动抠图
        await segmentImage(id, dataUrl)
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))

  // 生成海报
  const handleGenerate = async () => {
    if (!canvasRef.current) return
    const done = items.filter(i => i.status === 'done')
    if (done.length === 0) { setMsg('⚠️ 请先至少添加一张图片并完成抠图'); return }
    setIsGenerating(true)
    setMsg('🎨 正在生成海报...')
    try {
      await renderPoster(items, canvasRef.current)
      const url = canvasRef.current.toDataURL('image/png', 1.0)
      setPosterUrl(url)
      setMsg(`✅ 海报生成完成！共 ${done.length} 件物品`)
    } catch (err: any) {
      setMsg('❌ 生成失败: ' + err.message)
    }
    setIsGenerating(false)
  }

  const handleDownload = () => {
    if (!posterUrl) return
    const a = document.createElement('a')
    a.download = `香蕉攀岩失物招领_${formatDate(new Date())}.png`
    a.href = posterUrl
    a.click()
  }

  const handleCopyText = () => {
    const done = items.filter(i => i.status === 'done')
    const clothing = done.filter(i => i.category === 'clothing')
    const equipment = done.filter(i => i.category === 'equipment')
    let text = `🍌 香蕉攀岩失物招领 ${formatDate(new Date())}\n\n`
    if (clothing.length > 0) text += `👕 服饰类：${clothing.map(i => i.name).join('、')}\n`
    if (equipment.length > 0) text += `🧗 装备类：${equipment.map(i => i.name).join('、')}\n`
    text += '\n如有遗失，请联系前台领取！'
    navigator.clipboard.writeText(text).then(() => setMsg('📋 已复制文案到剪贴板'))
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* 隐藏的画布 */}
      <canvas ref={canvasRef} className="hidden" />

      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">🍌 失物招领 · 精美海报生成</h1>
        <p className="text-gray-600">上传失物照片 → 🤖 AI云端抠图 → 一键生成可分享海报</p>
      </header>

      {/* 上传区 */}
      <div className="max-w-5xl mx-auto">
        <div
          className="border-3 border-dashed border-yellow-400 rounded-2xl p-10 text-center cursor-pointer hover:bg-yellow-50 transition-colors mb-6 bg-white"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-6xl mb-4">📷</div>
          <p className="text-lg text-gray-700 font-medium mb-2">点击或拖拽上传失物照片（可多张）</p>
          <p className="text-sm text-gray-500">支持 JPG、PNG，单张不超过10MB</p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} className="hidden" />
        </div>

        {/* 状态提示 */}
        {msg && (
          <div className={`mb-4 p-4 rounded-xl text-center font-medium ${msg.includes('✅') || msg.includes('已复制') ? 'bg-green-50 text-green-700' : msg.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            {msg}
          </div>
        )}

        {/* 物品列表 */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📦 已上传 {items.filter(i => i.status === 'done').length}/{items.length} 件（自动抠图中...）
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map(item => (
                <div key={item.id} className="relative bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                    {item.status === 'segmenting' ? (
                      <span className="text-3xl animate-pulse">⏳</span>
                    ) : item.status === 'error' ? (
                      <span className="text-center text-red-400 text-xs px-2">❌ {item.error}</span>
                    ) : item.cutoutImage ? (
                      <img src={item.cutoutImage} alt={item.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <img src={item.originalImage} alt={item.name} className="max-w-full max-h-full object-contain opacity-60" />
                    )}
                  </div>

                  {/* 名称编辑 */}
                  <input
                    value={item.name}
                    onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))}
                    className="w-full text-xs text-center border border-gray-300 rounded px-1 py-1 mb-2"
                    placeholder="物品名称"
                  />

                  {/* 分类 */}
                  <div className="flex gap-1 mb-2">
                    {(['equipment', 'clothing'] as const).map(cat => (
                      <button key={cat}
                        onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, category: cat } : i))}
                        className={`flex-1 text-xs py-1 rounded ${item.category === cat ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                      >
                        {cat === 'equipment' ? '🧗' : '👕'}
                      </button>
                    ))}
                  </div>

                  {/* 状态指示 */}
                  <div className="text-center">
                    {item.status === 'pending' && <span className="text-xs text-gray-400">等待中</span>}
                    {item.status === 'segmenting' && <span className="text-xs text-blue-500 animate-pulse">抠图中...</span>}
                    {item.status === 'done' && <span className="text-xs text-green-600">✅ 完成</span>}
                    {item.status === 'error' && (
                      <button onClick={() => segmentImage(item.id, item.originalImage)}
                        className="text-xs text-red-500 underline">重试</button>
                    )}
                  </div>

                  {/* 删除 */}
                  <button onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-400 text-white rounded-full text-xs hover:bg-red-500">×</button>
                </div>
              ))}
            </div>

            {/* 生成按钮 */}
            <div className="flex gap-4 mt-6">
              <button onClick={handleGenerate} disabled={isGenerating}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${isGenerating ? 'bg-gray-300 text-gray-500' : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-xl'}`}>
                {isGenerating ? '⏳ 生成中...' : '🎨 生成精美海报'}
              </button>
              {posterUrl && (
                <>
                  <button onClick={handleDownload}
                    className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl">
                    📥 下载海报
                  </button>
                  <button onClick={handleCopyText}
                    className="px-8 py-4 rounded-xl font-bold text-lg bg-gray-700 text-white hover:bg-gray-800">
                    📋 复制文案
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 海报预览 */}
        {posterUrl && (
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-4">👀 海报预览</h2>
            <img src={posterUrl} alt="海报预览" className="max-w-full mx-auto rounded-xl shadow-lg" style={{ maxHeight: '600px' }} />
          </div>
        )}
      </div>
    </div>
  )
}

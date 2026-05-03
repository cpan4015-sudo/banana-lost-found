import { useState, useRef, useCallback, useEffect } from 'react'
import html2canvas from 'html2canvas'

const BananaLogo = () => (
  <svg viewBox="0 0 120 40" className="w-full h-full">
    <text x="5" y="30" fontFamily="Arial Black" fontSize="24" fontWeight="900" fill="#FFD700" stroke="#333" strokeWidth="1">
      香蕉攀岩
    </text>
  </svg>
)

const classifyItem = (name: string): 'clothing' | 'equipment' => {
  const clothing = ['jacket', 'shirt', 'coat', 'sweater', 'hoodie', 'dress', 'pants', 'jeans', 'skirt', 'shoe', 'sneaker', 'boot', 'hat', 'cap', 'bag', 'backpack', 'purse', 'handbag', 'watch', 'glasses', 'sunglasses', 'scarf', 'glove', 'socks', 'tie', 'uniform', 'vest', 'jersey', 'top', 'bottom', 'footwear', 'clothing']
  const eq = ['phone', 'laptop', 'computer', 'camera', 'bicycle', 'bike', 'skateboard', 'surfboard', 'ski', 'snowboard', 'ball', 'racket', 'bat', 'glove', 'helmet', 'rope', 'harness', 'chalk', 'bag', 'towel', 'bottle', 'cup', 'keys', 'wallet', 'electronics', 'instrument', 'sports', 'equipment', 'toy', 'game']
  const n = name.toLowerCase()
  if (clothing.some(c => n.includes(c))) return 'clothing'
  if (eq.some(e => n.includes(e))) return 'equipment'
  return 'equipment'
}

const formatDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`

export default function LostFoundCardPage() {
  const [image, setImage] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string>('')
  const [itemType, setItemType] = useState<'clothing' | 'equipment'>('equipment')
  const [itemName, setItemName] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [recognizingText, setRecognizingText] = useState('')
  const [modelReady, setModelReady] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modelRef = useRef<any>(null)
  const tfRef = useRef<any>(null)

  useEffect(() => {
    const loadModel = async () => {
      try {
        setRecognizingText('正在加载AI模型...')
        const tf = await import('@tensorflow/tfjs')
        const mobilenet = await import('@tensorflow-models/mobilenet')
        tfRef.current = tf
        modelRef.current = await mobilenet.load({ version: 2, alpha: 0.5 })
        setModelReady(true)
        setRecognizingText('AI模型已就绪')
      } catch (e) {
        setRecognizingText('AI模型加载失败，请手动输入')
      }
    }
    loadModel()
  }, [])

  const recognizeImage = async (img: HTMLImageElement) => {
    if (!modelRef.current || !tfRef.current) return null
    try {
      const predictions = await modelRef.current.classify(img, 5)
      if (predictions && predictions.length > 0) {
        const top = predictions[0]
        const name = (top.className as string).split(',')[0].trim()
        const confidence = Math.round(top.probability * 100)
        return { name, confidence }
      }
    } catch (e) {
      console.error('识别失败:', e)
    }
    return null
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string
        setImage(dataUrl)
        setImageName(file.name.replace(/\.[^/.]+$/, ''))

        if (modelRef.current) {
          setIsRecognizing(true)
          setRecognizingText('🤖 AI正在识别中...')
          const img = new Image()
          img.onload = async () => {
            const result = await recognizeImage(img)
            if (result) {
              setItemName(result.name)
              setItemType(classifyItem(result.name))
              setRecognizingText(`✅ 识别结果: ${result.name} (${result.confidence}%)`)
            } else {
              setRecognizingText('⚠️ 未识别到物品，请手动选择')
            }
            setIsRecognizing(false)
          }
          img.src = dataUrl
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        setImage(dataUrl)
        setImageName(file.name.replace(/\.[^/.]+$/, ''))
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleDownload = async () => {
    if (!previewRef.current) return
    setIsGenerating(true)
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `失物招领_${itemType === 'clothing' ? '服饰' : '装备'}_${formatDate(new Date())}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      alert('生成图片失败，请重试')
    }
    setIsGenerating(false)
  }

  const handleReset = () => {
    setImage(null)
    setImageName('')
    setItemName('')
    setRecognizingText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-orange-50 to-yellow-50">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">🍌 香蕉攀岩 · 失物招领</h1>
        <p className="text-gray-600">上传图片 → 🤖 AI自动识别 → 一键下载精美卡片</p>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">⚙️ 图片设置</h2>

          {!image ? (
            <div
              className="border-3 border-dashed border-yellow-400 rounded-xl p-12 text-center cursor-pointer hover:bg-yellow-50 transition-colors mb-6"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-6xl mb-4">📷</div>
              <p className="text-lg text-gray-700 font-medium mb-2">点击或拖拽上传图片</p>
              <p className="text-sm text-gray-500">支持 JPG、PNG 格式</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">📎 {imageName}</span>
                <button onClick={handleReset} className="text-sm text-red-500 hover:text-red-700">重新上传</button>
              </div>
            </div>
          )}

          {isRecognizing && (
            <div className="mb-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-blue-600 animate-pulse">{recognizingText}</p>
            </div>
          )}

          {image && !isRecognizing && recognizingText && (
            <div className="mb-4 p-4 bg-green-50 rounded-xl">
              <p className="text-green-600">{recognizingText}</p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">物品类型</label>
            <div className="grid grid-cols-2 gap-4">
              {['equipment', 'clothing'].map((type) => (
                <button
                  key={type}
                  onClick={() => setItemType(type as any)}
                  className={`py-4 px-6 rounded-xl font-medium transition-all ${
                    itemType === type
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type === 'equipment' ? '🧗 装备类' : '👕 服饰类'}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">物品名称</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="例如：黑色外套、蓝色背包"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none"
            />
          </div>

          <button
            onClick={handleDownload}
            disabled={!image || isGenerating}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              image && !isGenerating
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isGenerating ? '⏳ 生成中...' : '📥 下载失物招领卡片'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">👁️ 预览卡片</h2>
          <div className="bg-gray-100 rounded-xl p-4 min-h-[400px] flex items-center justify-center">
            {image ? (
              <div ref={previewRef} className="relative bg-white rounded-lg overflow-hidden shadow-lg max-w-full">
                <img src={image} alt="预览" className="max-w-full max-h-[350px] object-contain" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-black/70 via-black/60 to-black/70 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="w-24"><BananaLogo /></div>
                    <div className="text-center flex-1">
                      <div className="text-lg font-bold">失物招领 · {itemType === 'clothing' ? '服饰类' : '装备类'}</div>
                      {itemName && <div className="text-sm opacity-90">物品：{itemName}</div>}
                      <div className="text-sm opacity-90">如有遗失，请联系前台</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatDate(new Date())}</div>
                      <div className="text-xs opacity-80">{new Date().getFullYear()}年</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-8xl mb-4 opacity-30">🖼️</div>
                <p>上传图片后预览效果</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center mt-12 text-gray-500 text-sm">
        <p>🍌 香蕉攀岩 · 让每一次攀登都充满乐趣</p>
      </footer>
    </div>
  )
}

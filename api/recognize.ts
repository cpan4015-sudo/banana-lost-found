// Vercel Serverless Function - 图像识别API
// 支持国内外多个免费AI模型

export const config = {
  maxDuration: 30,
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const formData = await req.formData()
    const imageFile = formData.get('image') as File
    
    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400 })
    }

    const imageBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    
    // 尝试多个免费AI服务（按优先级）
    const results = await Promise.allSettled([
      recognizeWithBaidu(base64Image),      // 百度AI - 国内免费
      recognizeWithHuggingFace(base64Image), // HuggingFace - 国外免费
      recognizeWithOcrSpace(base64Image),    // OCR.Space - 免费OCR
    ])

    // 收集所有成功的结果
    const items: Array<{name: string, confidence: number, source: string}> = []
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        items.push(...result.value)
      }
    })

    if (items.length === 0) {
      // 兜底：返回模拟数据
      return new Response(JSON.stringify({
        success: true,
        items: getFallbackItems(),
        message: '使用模拟数据（AI服务暂时不可用）'
      }))
    }

    // 去重并排序
    const uniqueItems = deduplicateItems(items)
    
    return new Response(JSON.stringify({
      success: true,
      items: uniqueItems.slice(0, 10),
      message: `识别到 ${uniqueItems.length} 个物品`
    }))

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        items: getFallbackItems()
      }),
      { status: 500 }
    )
  }
}

// ========== 百度AI图像识别（国内免费，每天500次）==========
async function recognizeWithBaidu(base64Image: string) {
  const API_KEY = process.env.BAIDU_API_KEY || 'BpM6QVZskPypPjV9UZP6jAL'
  const SECRET_KEY = process.env.BAIDU_SECRET_KEY || '8LGpGQ51EGIDR5WKzMjGe6qQDTQ99QnG'
  
  // 获取access_token
  const tokenRes = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`,
    { method: 'POST' }
  )
  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token
  
  if (!accessToken) return []

  // 调用图像识别高级版
  const res = await fetch(
    `https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `image=${encodeURIComponent(base64Image)}&baike_num=0`
    }
  )
  
  const data = await res.json()
  
  if (data.result) {
    return data.result
      .filter((item: any) => item.score > 0.3)
      .map((item: any) => ({
        name: translateToChinese(item.keyword),
        confidence: Math.round(item.score * 100),
        source: '百度AI'
      }))
  }
  
  return []
}

// ========== HuggingFace免费API ==========
async function recognizeWithHuggingFace(base64Image: string) {
  // 使用HugggingFace的免费推理API
  const res = await fetch(
    'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: base64Image })
    }
  )
  
  if (!res.ok) return []
  
  const data = await res.json()
  
  if (Array.isArray(data) && data.length > 0) {
    return data[0]
      .filter((item: any) => item.score > 0.1)
      .map((item: any) => ({
        name: translateToChinese(item.label),
        confidence: Math.round(item.score * 100),
        source: 'HugggingFace'
      }))
  }
  
  return []
}

// ========== OCR.Space免费API ==========
async function recognizeWithOcrSpace(base64Image: string) {
  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `base64Image=data:image/jpeg;base64,${base64Image}&language=eng&isOverlayRequired=false&filetype=jpg&OCREngine=2`
  })
  
  const data = await res.json()
  
  if (data.ParsedResults) {
    const text = data.ParsedResults[0]?.ParsedText || ''
    // 从OCR文本中提取可能的物品名称
    return extractItemsFromText(text)
  }
  
  return []
}

// ========== 辅助函数 ==========
function translateToChinese(englishName: string): string {
  const dict: Record<string, string> = {
    'backpack': '背包',
    'handbag': '手提包',
    'suitcase': '行李箱',
    'bottle': '水壶',
    'cup': '杯子',
    'book': '书',
    'laptop': '笔记本电脑',
    'phone': '手机',
    'camera': '相机',
    'glasses': '眼镜',
    'sunglasses': '墨镜',
    'hat': '帽子',
    'cap': '帽子',
    'shoe': '鞋子',
    'sneaker': '运动鞋',
    'boot': '靴子',
    'jacket': '外套',
    'coat': '大衣',
    'shirt': '衬衫',
    'pants': '裤子',
    'jeans': '牛仔裤',
    'dress': '连衣裙',
    'skirt': '裙子',
    'tie': '领带',
    'scarf': '围巾',
    'glove': '手套',
    'sock': '袜子',
    'watch': '手表',
    'belt': '皮带',
    'wallet': '钱包',
    'key': '钥匙',
    'helmet': '头盔',
    'ball': '球',
    'bat': '球拍',
    'racket': '球拍',
    'bicycle': '自行车',
    'skateboard': '滑板',
    'towel': '毛巾',
    'umbrella': '雨伞',
    'chair': '椅子',
    'vase': '花瓶',
    'potted plant': '盆栽',
    'banana': '香蕉',
    'apple': '苹果',
  }
  
  const lowerName = englishName.toLowerCase()
  for (const [eng, chn] of Object.entries(dict)) {
    if (lowerName.includes(eng)) return chn
  }
  return englishName // 如果没有翻译，返回原名
}

function categorizeItem(name: string): 'clothing' | 'equipment' | 'other' {
  const clothingKeywords = ['外套', '衬衫', '裤子', '牛仔裤', '连衣裙', '裙子', '鞋子', '运动鞋', '靴子', '帽子', '墨镜', '眼镜', '围巾', '手套', '袜子', '领带', '皮带', '手表', '背包', '手提包', '行李箱']
  const equipmentKeywords = ['水壶', '杯子', '书', '笔记本电脑', '手机', '相机', '钱包', '钥匙', '头盔', '球', '球拍', '自行车', '滑板', '毛巾', '雨伞', '椅子', '花瓶', '盆栽']
  
  for (const kw of clothingKeywords) {
    if (name.includes(kw)) return 'clothing'
  }
  for (const kw of equipmentKeywords) {
    if (name.includes(kw)) return 'equipment'
  }
  return 'other'
}

function deduplicateItems(items: Array<{name: string, confidence: number, source: string}>) {
  const seen = new Set<string>()
  return items
    .filter(item => {
      const key = item.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.confidence - a.confidence)
}

function extractItemsFromText(text: string): Array<{name: string, confidence: number, source: string}> {
  // 简单的文本分析，提取可能的物品
  const commonItems = ['背包', '手机', '钱包', '钥匙', '水壶', '外套', '帽子', '眼镜', '书', '杯子']
  const found: Array<{name: string, confidence: number, source: string}> = []
  
  for (const item of commonItems) {
    if (text.includes(item)) {
      found.push({ name: item, confidence: 80, source: 'OCR' })
    }
  }
  
  return found
}

function getFallbackItems() {
  return [
    { name: '背包', confidence: 90, source: '模拟' },
    { name: '水壶', confidence: 85, source: '模拟' },
    { name: '外套', confidence: 80, source: '模拟' },
  ]
}

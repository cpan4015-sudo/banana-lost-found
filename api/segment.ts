// 云端抠图API - 腾讯云图像分割
// 上传图片 → 腾讯云分割 → 返回透明背景PNG
// 依赖：tencentcloud-sdk-nodejs（已在package.json中）

export const config = {
  maxDuration: 30,
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '仅支持 POST 请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const formData = await req.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return new Response(JSON.stringify({ error: '请上传图片' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: '图片不能超过10MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const imageBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    // 调用腾讯云图像分割
    const result = await callTencentSegmentation(base64Image)

    return new Response(JSON.stringify({
      success: true,
      image: result, // base64 PNG（透明背景）
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('分割失败:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message || '分割失败，请重试'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// ========== 腾讯云图像分割 ==========
async function callTencentSegmentation(base64Image: string) {
  // 动态导入 SDK（避免 serverless bundle 过大）
  const tencentcloud = await import('tencentcloud-sdk-nodejs')

  const PartsegClient = tencentcloud.partseg.v20210329.Client
  const models = tencentcloud.partseg.v20210329.Models

  const SECRET_ID = process.env.TENCENT_SECRET_ID
  const SECRET_KEY = process.env.TENCENT_SECRET_KEY
  const REGION = process.env.TENCENT_REGION || 'ap-guangzhou'

  if (!SECRET_ID || !SECRET_KEY) {
    throw new Error('未配置腾讯云密钥，请在 Vercel 环境变量中设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY')
  }

  // 创建客户端
  const client = new PartsegClient({
    credential: {
      secretId: SECRET_ID,
      secretKey: SECRET_KEY,
    },
    region: REGION,
    profile: {
      signMethod: 'HmacSHA256',
      endpoint: 'partseg.tencentcloudapi.com',
    },
  })

  // 调用通用分割（SegmentFlex）- 适合任意物体
  const req = new models.SegmentFlexRequest()
  req.ImageBase64 = base64Image

  const res = await client.SegmentFlex(req)
  console.log('分割成功，图片长度:', res.ResultImage?.length)

  if (!res.ResultImage) {
    throw new Error('分割结果为空')
  }

  return res.ResultImage
}

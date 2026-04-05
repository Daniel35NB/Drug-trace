/**
 * 淘宝 API 请求封装
 * 包含签名生成、重试机制、错误处理
 */

import Config from '@/config.js'
import { MD5 } from './crypto.js'
import logger from './logger.js'

/**
 * 生成淘宝 API 签名
 * @param {object} params - 请求参数
 * @param {string} appSecret - 应用密钥
 * @returns {string} 签名 (大写)
 */
export function generateSign(params, appSecret) {
  // 1. 过滤空值并排序
  const filteredKeys = Object.keys(params)
    .filter(key => {
      const value = params[key]
      return value !== '' && value !== null && value !== undefined
    })
    .sort()
  
  // 2. 拼接参数字符串
  const signStr = filteredKeys
    .map(key => `${key}${params[key]}`)
    .join('')
  
  // 3. 拼接密钥并 MD5
  const finalStr = appSecret + signStr + appSecret
  const sign = MD5(finalStr).toUpperCase()
  
  logger.debug('签名生成', {
    original: signStr,
    withSecret: '***',
    sign: sign
  })
  
  return sign
}

/**
 * 构建请求参数
 */
function buildRequestParams(method, businessParams) {
  const timestamp = new Date().getTime()
  
  const baseParams = {
    method: method,
    app_key: Config.appKey,
    timestamp: timestamp,
    format: 'json',
    v: '2.0',
    sign_method: 'md5',
    ...businessParams
  }
  
  // 生成签名
  baseParams.sign = generateSign(baseParams, Config.appSecret)
  
  return baseParams
}

/**
 * 发起 API 请求 (带重试机制)
 * @param {string} method - API 方法
 * @param {object} businessParams - 业务参数
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<object>} 响应数据
 */
export async function requestWithRetry(method, businessParams, maxRetries = 3) {
  let lastError = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 构建参数
      const params = buildRequestParams(method, businessParams)
      
      // 记录请求日志
      logger.apiRequest({
        method: 'POST',
        url: Config.apiUrl,
        data: { ...params, sign: '***' } // 隐藏真实签名
      })
      
      // 构建 URL 编码数据
      const formData = new URLSearchParams()
      for (const key in params) {
        if (params.hasOwnProperty(key)) {
          formData.append(key, params[key])
        }
      }
      
      const startTime = Date.now()
      
      // 发起请求
      const [error, response] = await uni.request({
        url: Config.apiUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: formData.toString(),
        timeout: 15000
      })
      
      const duration = Date.now() - startTime
      
      if (error) {
        throw new Error(`网络请求失败：${error.errMsg}`)
      }
      
      // 解析响应
      const responseData = response.data
      
      // 记录响应日志
      logger.apiResponse(responseData, duration)
      
      // 检查 API 错误
      if (responseData.error_response) {
        const apiError = new Error(responseData.error_response.msg || 'API 调用失败')
        apiError.code = responseData.error_response.code
        throw apiError
      }
      
      // 返回成功数据
      return responseData[Object.keys(responseData)[0]] || responseData
      
    } catch (err) {
      lastError = err
      
      logger.error(`请求失败 (第${attempt + 1}次)`, {
        method,
        error: err.message,
        attempt: attempt + 1,
        maxRetries
      })
      
      // 如果不是最后一次，等待后重试
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // 指数退避：1s, 2s, 4s
        logger.warn(`${delay / 1000}s 后重试...`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  // 所有重试都失败
  logger.error('所有重试均失败', {
    method,
    finalError: lastError?.message
  })
  
  throw lastError || new Error('未知错误')
}

/**
 * 上传药品追溯码
 * @param {string} code - 20 位追溯码
 * @param {string} saleTime - 销售时间
 * @returns {Promise<object>} 响应数据
 */
export async function uploadDrugCode(code, saleTime = null) {
  // 配置校验
  if (!Config.appKey || !Config.appSecret || Config.appSecret === 'YOUR_APP_SECRET_HERE') {
    const error = new Error('系统配置缺失：请检查 config.js 文件是否正确配置')
    logger.error(error.message)
    throw error
  }
  
  const now = saleTime || new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  const billCode = `FY${Date.now()}${Math.floor(Math.random() * 1000)}`
  
  const businessParams = {
    ref_ent_id: Config.refEntId,
    bill_code: billCode,
    drug_codes: code,
    sale_time: now,
    ent_name: '丰源堂药店'
  }
  
  logger.info('准备上传追溯码', {
    code: code.substring(0, 6) + '****',
    billCode,
    saleTime: now
  })
  
  return await requestWithRetry(
    Config.method,
    businessParams,
    3 // 最大重试 3 次
  )
}

export default {
  generateSign,
  requestWithRetry,
  uploadDrugCode
}

/**
 * 结构化日志系统
 * 支持多级别日志、持久化存储、导出功能
 */

import { addLog, getLogs, clearLogs } from './storage.js'

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
}

/**
 * 添加日志
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {object} data - 附加数据
 */
function log(level, message, data = null) {
  const logEntry = {
    level,
    message,
    data: data ? JSON.stringify(data) : null,
    timestamp: Date.now()
  }
  
  // 持久化存储
  addLog(logEntry)
  
  // 控制台输出 (调试模式)
  if (process.env.NODE_ENV === 'development' || true) {
    const prefix = `[${level.toUpperCase()}]`
    const timeStr = new Date(logEntry.timestamp).toLocaleTimeString()
    
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(`${prefix} ${timeStr} - ${message}`, data || '')
        break
      case LOG_LEVELS.WARN:
        console.warn(`${prefix} ${timeStr} - ${message}`, data || '')
        break
      default:
        console.log(`${prefix} ${timeStr} - ${message}`, data || '')
    }
  }
}

export const logger = {
  /**
   * 调试日志
   */
  debug(message, data) {
    log(LOG_LEVELS.DEBUG, message, data)
  },
  
  /**
   * 信息日志
   */
  info(message, data) {
    log(LOG_LEVELS.INFO, message, data)
  },
  
  /**
   * 警告日志
   */
  warn(message, data) {
    log(LOG_LEVELS.WARN, message, data)
  },
  
  /**
   * 错误日志
   */
  error(message, data) {
    log(LOG_LEVELS.ERROR, message, data)
  },
  
  /**
   * API 请求日志
   */
  apiRequest(params) {
    this.info('API 请求', {
      type: 'request',
      method: params.method,
      url: params.url,
      params: params.data
    })
  },
  
  /**
   * API 响应日志
   */
  apiResponse(response, duration) {
    this.info('API 响应', {
      type: 'response',
      duration: `${duration}ms`,
      success: !response.error_response,
      data: response
    })
  },
  
  /**
   * API 错误日志
   */
  apiError(error, params) {
    this.error('API 错误', {
      type: 'error',
      message: error.message,
      stack: error.stack,
      params: params
    })
  },
  
  /**
   * 扫码日志
   */
  scan(code, status, extra) {
    this.info('扫码记录', {
      type: 'scan',
      code: code.substring(0, 6) + '****',
      status,
      ...extra
    })
  },
  
  /**
   * 获取所有日志
   */
  getLogs(limit = 50) {
    return getLogs(limit)
  },
  
  /**
   * 清空日志
   */
  clear() {
    return clearLogs()
  },
  
  /**
   * 导出日志为文本
   */
  exportLogs() {
    const logs = getLogs(100)
    const text = logs.map(log => {
      const timeStr = new Date(log.timestamp).toLocaleString()
      const dataStr = log.data ? ` | ${log.data}` : ''
      return `[${timeStr}] [${log.level.toUpperCase()}] ${log.message}${dataStr}`
    }).join('\n')
    
    return text
  }
}

export default logger

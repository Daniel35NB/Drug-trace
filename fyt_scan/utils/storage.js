/**
 * 本地存储封装工具
 * 提供数据持久化、容量管理等功能
 */

const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'fyt_offline_queue',
  SUCCESS_RECORDS: 'fyt_success_records',
  LOGS: 'fyt_logs',
  STATS: 'fyt_stats',
  SCAN_HISTORY: 'fyt_scan_history'
}

const MAX_QUEUE_SIZE = 1000
const MAX_LOGS = 50
const MAX_HISTORY = 30

/**
 * 安全获取存储数据
 */
function getStorage(key, defaultValue = []) {
  try {
    const data = uni.getStorageSync(key)
    return data ? JSON.parse(data) : defaultValue
  } catch (e) {
    console.error(`读取存储失败 [${key}]:`, e)
    return defaultValue
  }
}

/**
 * 安全设置存储数据
 */
function setStorage(key, value) {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.error(`写入存储失败 [${key}]:`, e)
    // 存储失败时尝试清理旧数据
    if (key === STORAGE_KEYS.OFFLINE_QUEUE) {
      clearOldRecords(key, 100) // 只保留最近 100 条
    }
    return false
  }
}

// ==================== 离线队列管理 ====================

export function addToOfflineQueue(item) {
  let queue = getStorage(STORAGE_KEYS.OFFLINE_QUEUE, [])
  
  // 去重：如果已存在相同追溯码且状态为 pending，则跳过
  if (queue.some(q => q.code === item.code && q.status === 'pending')) {
    return false
  }
  
  queue.unshift({ 
    ...item, 
    timestamp: Date.now(), 
    status: 'pending',
    retryCount: 0
  })
  
  // 限制大小
  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(0, MAX_QUEUE_SIZE)
  }
  
  return setStorage(STORAGE_KEYS.OFFLINE_QUEUE, queue)
}

export function getOfflineQueue() {
  return getStorage(STORAGE_KEYS.OFFLINE_QUEUE, [])
}

export function updateOfflineQueueItem(code, updates) {
  let queue = getOfflineQueue()
  const index = queue.findIndex(item => item.code === code)
  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates }
    return setStorage(STORAGE_KEYS.OFFLINE_QUEUE, queue)
  }
  return false
}

export function removeOfflineQueueItem(code) {
  let queue = getOfflineQueue()
  queue = queue.filter(item => item.code !== code)
  return setStorage(STORAGE_KEYS.OFFLINE_QUEUE, queue)
}

export function clearOfflineQueue() {
  return setStorage(STORAGE_KEYS.OFFLINE_QUEUE, [])
}

// ==================== 成功记录管理 ====================

export function addSuccessRecord(record) {
  let records = getStorage(STORAGE_KEYS.SUCCESS_RECORDS, [])
  records.unshift({
    ...record,
    timestamp: Date.now(),
    status: 'success'
  })
  // 限制大小
  if (records.length > MAX_HISTORY) {
    records = records.slice(0, MAX_HISTORY)
  }
  return setStorage(STORAGE_KEYS.SUCCESS_RECORDS, records)
}

export function getSuccessRecords(limit = 30) {
  const records = getStorage(STORAGE_KEYS.SUCCESS_RECORDS, [])
  return records.slice(0, limit)
}

export function clearSuccessRecords() {
  return setStorage(STORAGE_KEYS.SUCCESS_RECORDS, [])
}

// ==================== 日志管理 ====================

export function addLog(log) {
  let logs = getStorage(STORAGE_KEYS.LOGS, [])
  logs.unshift({
    ...log,
    timestamp: Date.now()
  })
  // 限制大小
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(0, MAX_LOGS)
  }
  return setStorage(STORAGE_KEYS.LOGS, logs)
}

export function getLogs(limit = 50) {
  const logs = getStorage(STORAGE_KEYS.LOGS, [])
  return logs.slice(0, limit)
}

export function clearLogs() {
  return setStorage(STORAGE_KEYS.LOGS, [])
}

// ==================== 统计数据管理 ====================

export function getStats() {
  const defaultStats = {
    todayCount: 0,
    totalCount: 0,
    failCount: 0,
    lastResetDate: new Date().toDateString()
  }
  
  let stats = getStorage(STORAGE_KEYS.STATS, defaultStats)
  
  // 检查是否需要重置今日计数
  const today = new Date().toDateString()
  if (stats.lastResetDate !== today) {
    stats.todayCount = 0
    stats.lastResetDate = today
    setStorage(STORAGE_KEYS.STATS, stats)
  }
  
  return stats
}

export function updateStats(updates) {
  const stats = getStats()
  const newStats = { ...stats, ...updates }
  return setStorage(STORAGE_KEYS.STATS, newStats)
}

// ==================== 工具函数 ====================

/**
 * 清理旧记录，保留最近的 count 条
 */
function clearOldRecords(key, count) {
  const data = getStorage(key, [])
  if (data.length > count) {
    setStorage(key, data.slice(0, count))
  }
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  
  return date.toLocaleString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

/**
 * 脱敏显示追溯码 (前 6 后 6)
 */
export function maskCode(code) {
  if (!code || code.length <= 12) return code
  return `${code.substring(0, 6)}****${code.substring(code.length - 6)}`
}

export { STORAGE_KEYS }

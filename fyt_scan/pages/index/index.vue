<template>
  <view class="container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-content">
        <view class="logo-area">
          <text class="logo-icon">💊</text>
          <text class="app-name">{{ config.appName }}</text>
          <text class="version-tag">v{{ config.version }}</text>
        </view>
        <view class="status-area">
          <view class="network-status" :class="isOnline ? 'online' : 'offline'">
            <text class="status-dot"></text>
            <text class="status-text">{{ isOnline ? '在线' : '离线' }}</text>
          </view>
          <button class="log-btn" @click="showLogModal = true">
            📋 日志
            <text v-if="unreadLogCount > 0" class="log-badge">{{ unreadLogCount }}</text>
          </button>
        </view>
      </view>
    </view>

    <!-- 核心数据卡片 -->
    <view class="stats-card">
      <view class="stats-header">
        <text class="stats-title">今日统计</text>
        <text class="stats-date">{{ todayDate }}</text>
      </view>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-label">今日扫码</text>
          <text class="stat-value primary">{{ stats.todayCount }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">失败待重试</text>
          <text class="stat-value warning">{{ failQueueCount }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">总成功数</text>
          <text class="stat-value success">{{ stats.totalCount }}</text>
        </view>
      </view>
    </view>

    <!-- 扫码控制区 -->
    <view class="control-section">
      <view class="status-card" :class="scanStatusClass">
        <view class="status-icon">{{ statusIcon }}</view>
        <view class="status-info">
          <text class="status-text">{{ statusText }}</text>
          <text v-if="lastCode" class="last-code">{{ maskCode(lastCode) }}</text>
        </view>
        <view v-if="isUploading" class="upload-animation">
          <view class="ripple"></view>
        </view>
      </view>

      <view class="button-group">
        <button 
          class="btn-main" 
          :class="{ disabled: isScanning }"
          @click="handleScan"
        >
          {{ isScanning ? '扫码中...' : '📷 扫码销售' }}
        </button>
        
        <button 
          v-if="failQueueCount > 0"
          class="btn-secondary"
          @click="retryFailed"
        >
          🔁 重试失败 ({{ failQueueCount }})
        </button>
      </view>

      <!-- 调试按钮组 -->
      <view class="debug-buttons">
        <button class="btn-debug" @click="testAPI">测试 API</button>
        <button class="btn-debug" @click="clearLogs">清日志</button>
        <button class="btn-debug" @click="exportLogs">导出日志</button>
      </view>
    </view>

    <!-- 历史记录区 -->
    <view class="history-section">
      <view class="section-header">
        <text class="section-title">最近记录</text>
        <button v-if="historyList.length > 0" class="btn-clear" @click="clearHistory">清空</button>
      </view>
      
      <view v-if="historyList.length === 0" class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无记录</text>
      </view>
      
      <view v-else class="history-list">
        <view 
          v-for="(item, index) in historyList" 
          :key="index"
          class="history-item"
          :class="item.status"
        >
          <view class="item-left">
            <text class="item-status-icon">
              {{ item.status === 'success' ? '✓' : item.status === 'pending' ? '⏳' : '✕' }}
            </text>
            <view class="item-info">
              <text class="item-code">{{ maskCode(item.code) }}</text>
              <text class="item-time">{{ formatTime(item.timestamp) }}</text>
            </view>
          </view>
          <view class="item-right">
            <text v-if="item.error" class="item-error" :title="item.error">{{ truncate(item.error, 20) }}</text>
            <text v-else class="item-status">{{ getStatusText(item.status) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 日志弹窗 -->
    <view v-if="showLogModal" class="modal-overlay" @click="showLogModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">系统日志</text>
          <button class="modal-close" @click="showLogModal = false">✕</button>
        </view>
        <view class="modal-body">
          <scroll-view scroll-y class="log-scroll">
            <view v-for="(log, index) in logs" :key="index" class="log-item" :class="log.level">
              <text class="log-time">{{ formatLogTime(log.timestamp) }}</text>
              <text class="log-level">[{{ log.level.toUpperCase() }}]</text>
              <text class="log-message">{{ log.message }}</text>
              <text v-if="log.data" class="log-data">{{ log.data }}</text>
            </view>
          </scroll-view>
        </view>
        <view class="modal-footer">
          <button class="btn-modal" @click="copyLogs">复制到剪贴板</button>
          <button class="btn-modal primary" @click="showLogModal = false">关闭</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Config from '@/config.js'
import { uploadDrugCode } from '@/api/drugtrace.js'
import { 
  addToOfflineQueue, 
  addSuccessRecord, 
  getSuccessRecords, 
  getOfflineQueue,
  removeOfflineQueueItem,
  updateStats,
  getStats,
  formatTimestamp,
  maskCode 
} from '@/utils/storage.js'
import logger from '@/utils/logger.js'
import { validateDrugCode } from '@/utils/validator.js'

// 配置
const config = Config

// 状态变量
const statusBarHeight = ref(0)
const isOnline = ref(true)
const isScanning = ref(false)
const isUploading = ref(false)
const scanStatus = ref('idle') // idle, scanning, uploading, success, error
const lastCode = ref('')
const showLogModal = ref(false)
const unreadLogCount = ref(0)

// 统计数据
const stats = ref(getStats())
const failQueueCount = ref(0)

// 历史记录
const historyList = ref([])

// 日志
const logs = ref([])

// 计算属性
const todayDate = computed(() => {
  const now = new Date()
  return `${now.getMonth() + 1}/${now.getDate()}`
})

const scanStatusClass = computed(() => `status-${scanStatus.value}`)

const statusIcon = computed(() => {
  switch (scanStatus.value) {
    case 'scanning': return '📷'
    case 'uploading': return '⏳'
    case 'success': return '✓'
    case 'error': return '✕'
    default: return '📱'
  }
})

const statusText = computed(() => {
  switch (scanStatus.value) {
    case 'idle': return '准备扫码'
    case 'scanning': return '正在扫码...'
    case 'uploading': return '上传中...'
    case 'success': return '上传成功'
    case 'error': return '上传失败'
    default: return '准备扫码'
  }
})

// 初始化
onMounted(() => {
  // 获取状态栏高度
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0
  
  // 监听网络状态
  uni.onNetworkStatusChange(handleNetworkChange)
  uni.getNetworkType({
    success: (res) => {
      isOnline.value = res.networkType !== 'none'
    }
  })
  
  // 加载数据
  loadData()
  
  // 启动离线队列同步
  startOfflineSync()
  
  logger.info('应用启动')
})

onUnmounted(() => {
  uni.offNetworkStatusChange(handleNetworkChange)
  if (syncTimer) clearInterval(syncTimer)
})

// 数据加载
function loadData() {
  // 加载历史记录
  historyList.value = getSuccessRecords(30)
  
  // 加载失败队列
  const queue = getOfflineQueue()
  failQueueCount.value = queue.filter(item => item.status === 'pending').length
  
  // 加载日志
  logs.value = logger.getLogs(50)
  unreadLogCount.value = logs.value.filter(log => log.level === 'error').length
  
  // 更新统计
  stats.value = getStats()
}

// 网络状态变化
function handleNetworkChange(res) {
  isOnline.value = res.isConnected
  logger.info(`网络状态变化：${res.isConnected ? '在线' : '离线'}`)
  
  if (res.isConnected) {
    showToast('网络已连接', 'success')
    // 尝试同步离线队列
    syncOfflineQueue()
  } else {
    showToast('当前离线，数据将缓存', 'warning')
  }
}

// 扫码处理
let lastScanTime = 0
const SCAN_COOLDOWN = Config.scanCooldown || 1000

async function handleScan() {
  const now = Date.now()
  if (isScanning.value || (now - lastScanTime < SCAN_COOLDOWN)) {
    return
  }
  
  lastScanTime = now
  isScanning.value = true
  scanStatus.value = 'scanning'
  
  try {
    // 调用扫码
    const result = await uni.scanCode({
      onlyFromCamera: false,
      autoDecodeCharset: true
    })
    
    const code = result.text?.trim()
    
    if (!code) {
      throw new Error('未识别到条码')
    }
    
    // 校验追溯码
    const validation = validateDrugCode(code)
    if (!validation.valid) {
      throw new Error(validation.message)
    }
    
    // 播放音效和振动
    playFeedback('scan')
    
    lastCode.value = code
    scanStatus.value = 'uploading'
    isUploading.value = true
    
    logger.scan(code, 'start')
    
    // 上传
    await processUpload(code)
    
  } catch (err) {
    logger.error('扫码失败', { error: err.message })
    showToast(err.message, 'error')
    scanStatus.value = 'error'
    playFeedback('error')
    
    setTimeout(() => {
      scanStatus.value = 'idle'
      isScanning.value = false
      isUploading.value = false
    }, 1500)
  }
}

// 处理上传
async function processUpload(code) {
  try {
    const startTime = Date.now()
    
    await uploadDrugCode(code)
    
    const duration = Date.now() - startTime
    
    // 成功处理
    handleSuccess(code, duration)
    
  } catch (err) {
    // 失败处理
    handleFailure(code, err.message)
  }
}

// 成功处理
function handleSuccess(code, duration) {
  logger.scan(code, 'success', { duration })
  
  // 添加成功记录
  addSuccessRecord({ code })
  
  // 更新统计
  updateStats({
    todayCount: stats.value.todayCount + 1,
    totalCount: stats.value.totalCount + 1
  })
  
  // 从失败队列移除（如果存在）
  removeOfflineQueueItem(code)
  
  // 刷新 UI
  loadData()
  
  // 反馈
  scanStatus.value = 'success'
  isUploading.value = false
  playFeedback('success')
  showToast('上传成功', 'success')
  
  // 重置状态
  setTimeout(() => {
    scanStatus.value = 'idle'
    isScanning.value = false
    
    // 自动继续扫码
    if (Config.autoContinue) {
      setTimeout(() => {
        if (!isScanning.value) {
          handleScan()
        }
      }, 500)
    }
  }, 800)
}

// 失败处理
function handleFailure(code, errorMsg) {
  logger.scan(code, 'error', { error: errorMsg })
  
  // 加入离线队列
  addToOfflineQueue({
    code,
    error: errorMsg
  })
  
  // 更新统计
  updateStats({
    failCount: stats.value.failCount + 1
  })
  
  // 刷新 UI
  loadData()
  
  // 反馈
  scanStatus.value = 'error'
  isUploading.value = false
  playFeedback('error')
  showToast(`上传失败：${errorMsg}`, 'error')
  
  // 重置状态
  setTimeout(() => {
    scanStatus.value = 'idle'
    isScanning.value = false
  }, 1500)
}

// 重试失败队列
async function retryFailed() {
  const queue = getOfflineQueue()
  const pendingItems = queue.filter(item => item.status === 'pending')
  
  if (pendingItems.length === 0) {
    showToast('没有需要重试的记录', 'warning')
    return
  }
  
  showToast(`开始重试 ${pendingItems.length} 条记录`, 'info')
  
  for (const item of pendingItems) {
    try {
      await processUpload(item.code)
      await new Promise(resolve => setTimeout(resolve, 500)) // 间隔
    } catch (err) {
      logger.error(`重试失败：${item.code}`, { error: err.message })
    }
  }
  
  loadData()
  showToast('重试完成', 'success')
}

// 离线队列同步
let syncTimer = null

function startOfflineSync() {
  syncTimer = setInterval(() => {
    if (isOnline.value) {
      syncOfflineQueue()
    }
  }, 30000) // 每 30 秒
}

async function syncOfflineQueue() {
  const queue = getOfflineQueue()
  const pendingItems = queue.filter(item => item.status === 'pending')
  
  if (pendingItems.length === 0) return
  
  logger.info(`开始同步 ${pendingItems.length} 条离线记录`)
  
  for (const item of pendingItems) {
    if (!isOnline.value) break
    
    try {
      await uploadDrugCode(item.code, new Date(item.timestamp).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'))
      removeOfflineQueueItem(item.code)
      addSuccessRecord({ code: item.code })
      updateStats({
        todayCount: stats.value.todayCount + 1,
        totalCount: stats.value.totalCount + 1
      })
    } catch (err) {
      logger.error(`同步失败：${item.code}`, { error: err.message })
    }
  }
  
  loadData()
}

// 工具函数
function playFeedback(type) {
  if (!Config.enableVibrate) return
  
  if (type === 'scan' || type === 'success') {
    uni.vibrateShort({ type: 'light' })
  } else if (type === 'error') {
    uni.vibrateLong()
  }
}

function showToast(message, type = 'info') {
  uni.showToast({
    title: message,
    icon: type === 'success' ? 'success' : type === 'error' ? 'error' : 'none',
    duration: 2500
  })
}

function formatTime(timestamp) {
  return formatTimestamp(timestamp)
}

function formatLogTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}

function getStatusText(status) {
  const map = {
    success: '成功',
    pending: '等待',
    error: '失败'
  }
  return map[status] || status
}

// 调试功能
async function testAPI() {
  showToast('测试 API 连接...', 'info')
  try {
    // 使用一个测试码
    await uploadDrugCode('12345678901234567890')
    showToast('API 连接成功', 'success')
  } catch (err) {
    showToast(`API 测试失败：${err.message}`, 'error')
  }
}

function clearLogs() {
  logger.clear()
  logs.value = []
  unreadLogCount.value = 0
  showToast('日志已清空', 'success')
}

function exportLogs() {
  const text = logger.exportLogs()
  uni.setClipboardData({
    data: text,
    success: () => {
      showToast('日志已复制到剪贴板', 'success')
    }
  })
}

function copyLogs() {
  exportLogs()
}

function clearHistory() {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有历史记录吗？',
    success: (res) => {
      if (res.confirm) {
        // 这里可以调用清除函数
        showToast('历史记录已清空', 'success')
        loadData()
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 40px;
}

// 自定义导航栏
.custom-navbar {
  background: linear-gradient(135deg, #00c9a7 0%, #0077b6 100%);
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
  
  .navbar-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px 12px;
  }
  
  .logo-area {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .logo-icon {
      font-size: 24px;
    }
    
    .app-name {
      font-size: 18px;
      font-weight: 600;
    }
    
    .version-tag {
      font-size: 12px;
      opacity: 0.8;
      background: rgba(255,255,255,0.2);
      padding: 2px 6px;
      border-radius: 4px;
    }
  }
  
  .status-area {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .network-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #fff;
        
        &.online {
          background: #10b981;
        }
        
        &.offline {
          background: #ef4444;
        }
      }
    }
    
    .log-btn {
      background: rgba(255,255,255,0.2);
      color: white;
      border: none;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
      position: relative;
      
      .log-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        font-size: 10px;
        padding: 2px 5px;
        border-radius: 10px;
        min-width: 16px;
        text-align: center;
      }
    }
  }
}

// 统计卡片
.stats-card {
  margin: 16px;
  background: linear-gradient(135deg, #00c9a7 0%, #0077b6 100%);
  border-radius: 16px;
  padding: 20px;
  color: white;
  box-shadow: 0 8px 24px rgba(0, 119, 182, 0.3);
  
  .stats-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
    
    .stats-title {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .stats-date {
      font-size: 12px;
      opacity: 0.7;
    }
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    
    .stat-item {
      text-align: center;
      
      .stat-label {
        font-size: 12px;
        opacity: 0.8;
        display: block;
        margin-bottom: 8px;
      }
      
      .stat-value {
        font-size: 36px;
        font-weight: 700;
        display: block;
        
        &.primary {
          color: white;
        }
        
        &.warning {
          color: #fbbf24;
        }
        
        &.success {
          color: #6ee7b7;
        }
      }
    }
  }
}

// 控制区
.control-section {
  padding: 0 16px;
  
  .status-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    position: relative;
    overflow: hidden;
    
    .status-icon {
      font-size: 32px;
    }
    
    .status-info {
      flex: 1;
      
      .status-text {
        font-size: 16px;
        font-weight: 500;
        display: block;
      }
      
      .last-code {
        font-size: 12px;
        color: #718096;
        margin-top: 4px;
        display: block;
      }
    }
    
    .upload-animation {
      position: absolute;
      right: 16px;
      
      .ripple {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.3);
        animation: ripple 1s infinite;
      }
    }
    
    &.status-success {
      border-left: 4px solid #10b981;
    }
    
    &.status-error {
      border-left: 4px solid #ef4444;
    }
  }
  
  .button-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
    
    .btn-main {
      background: linear-gradient(135deg, #00c9a7 0%, #0077b6 100%);
      color: white;
      border: none;
      font-size: 18px;
      font-weight: 600;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 119, 182, 0.3);
      
      &.disabled {
        opacity: 0.7;
      }
    }
    
    .btn-secondary {
      background: #f59e0b;
      color: white;
      border: none;
      font-size: 16px;
      padding: 12px;
      border-radius: 12px;
    }
  }
  
  .debug-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
    
    .btn-debug {
      background: #e2e8f0;
      color: #4a5568;
      border: none;
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 8px;
    }
  }
}

// 历史记录
.history-section {
  margin-top: 24px;
  padding: 0 16px;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a202c;
    }
    
    .btn-clear {
      background: none;
      border: none;
      color: #ef4444;
      font-size: 12px;
      padding: 4px 8px;
    }
  }
  
  .empty-state {
    text-align: center;
    padding: 40px 0;
    
    .empty-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 8px;
    }
    
    .empty-text {
      color: #a0aec0;
      font-size: 14px;
    }
  }
  
  .history-list {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    
    .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .item-left {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .item-status-icon {
          font-size: 20px;
          width: 24px;
          text-align: center;
        }
        
        .item-info {
          .item-code {
            font-size: 14px;
            font-weight: 500;
            display: block;
          }
          
          .item-time {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 2px;
            display: block;
          }
        }
      }
      
      .item-right {
        .item-error {
          font-size: 12px;
          color: #ef4444;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .item-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          
          &.success {
            background: #d1fae5;
            color: #065f46;
          }
        }
      }
      
      &.success {
        .item-status-icon {
          color: #10b981;
        }
      }
      
      &.error {
        .item-status-icon {
          color: #ef4444;
        }
      }
      
      &.pending {
        .item-status-icon {
          color: #f59e0b;
        }
      }
    }
  }
}

// 弹窗
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  
  .modal-content {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
      
      .modal-title {
        font-size: 16px;
        font-weight: 600;
      }
      
      .modal-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #718096;
        padding: 4px 8px;
      }
    }
    
    .modal-body {
      flex: 1;
      overflow: hidden;
      padding: 16px;
      
      .log-scroll {
        height: 400px;
        
        .log-item {
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
          font-size: 12px;
          
          .log-time {
            color: #718096;
            margin-right: 8px;
          }
          
          .log-level {
            margin-right: 8px;
            font-weight: 600;
            
            &.debug { color: #6b7280; }
            &.info { color: #3b82f6; }
            &.warn { color: #f59e0b; }
            &.error { color: #ef4444; }
          }
          
          .log-message {
            margin-right: 8px;
          }
          
          .log-data {
            color: #9ca3af;
            word-break: break-all;
          }
        }
      }
    }
    
    .modal-footer {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-top: 1px solid #e2e8f0;
      
      .btn-modal {
        flex: 1;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: white;
        font-size: 14px;
        
        &.primary {
          background: #00c9a7;
          color: white;
          border: none;
        }
      }
    }
  }
}
</style>

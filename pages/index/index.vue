<template>
	<view class="container">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="navbar-content">
				<view class="logo-section">
					<text class="logo-icon">💊</text>
					<text class="app-name">丰源堂出库</text>
					<text class="version-tag">v{{ version }}</text>
				</view>
				<view class="status-section">
					<view class="network-status" :class="isOnline ? 'online' : 'offline'">
						<text class="status-dot"></text>
						<text class="status-text">{{ isOnline ? '在线' : '离线' }}</text>
					</view>
					<button class="log-btn" @click="showLogs">
						<text class="log-icon">📋</text>
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
					<text class="stat-value primary">{{ todayScanCount }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">失败待重试</text>
					<text class="stat-value warning">{{ failedCount }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">总成功数</text>
					<text class="stat-value success">{{ totalSuccessCount }}</text>
				</view>
			</view>
		</view>

		<!-- 扫码控制区 -->
		<view class="scan-control">
			<view class="scan-status-card">
				<view class="status-indicator" :class="scanStatusClass">
					<text class="status-icon">{{ statusIcon }}</text>
					<view v-if="isUploading" class="uploading-ring"></view>
				</view>
				<text class="status-text">{{ statusText }}</text>
			</view>

			<view class="btn-group">
				<button class="main-btn" :disabled="isScanning" @click="startScan">
					<text class="btn-icon">📷</text>
					<text>{{ isScanning ? '扫码中...' : '扫码销售' }}</text>
				</button>
				
				<button v-if="failedCount > 0" class="retry-btn" @click="retryFailed">
					<text class="btn-icon">🔄</text>
					<text>重试失败 ({{ failedCount }})</text>
				</button>
			</view>

			<!-- 调试按钮组 -->
			<view class="debug-btn-group">
				<button class="debug-btn" @click="testAPI">测试 API</button>
				<button class="debug-btn" @click="clearLogs">清日志</button>
				<button class="debug-btn" @click="exportLogs">导出日志</button>
			</view>
		</view>

		<!-- 历史记录区 -->
		<view class="history-section">
			<view class="section-header">
				<text class="section-title">历史记录</text>
				<button class="clear-btn" @click="clearSuccessRecords">清空成功记录</button>
			</view>
			
			<view v-if="historyList.length === 0" class="empty-state">
				<text class="empty-icon">📭</text>
				<text class="empty-text">暂无历史记录</text>
			</view>
			
			<view v-else class="history-list">
				<view v-for="(item, index) in historyList" :key="index" class="history-item" :class="item.status">
					<view class="item-left">
						<text class="item-code">{{ maskCode(item.code) }}</text>
						<text class="item-time">{{ formatTime(item.timestamp) }}</text>
					</view>
					<view class="item-right">
						<text class="item-status" :class="item.status">{{ getStatusText(item.status) }}</text>
						<text v-if="item.error" class="item-error">{{ item.error.substring(0, 20) }}...</text>
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
				<scroll-view class="modal-body" scroll-y>
					<view v-for="(log, index) in logs" :key="index" class="log-item" :class="log.level">
						<text class="log-time">{{ log.time }}</text>
						<text class="log-msg">{{ log.message }}</text>
					</view>
				</scroll-view>
				<view class="modal-footer">
					<button class="modal-btn" @click="copyLogs">复制到剪贴板</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import config from '@/config.js'

export default {
	data() {
		return {
			version: '1.0.0',
			statusBarHeight: 20,
			isOnline: true,
			showLogModal: false,
			unreadLogCount: 0,
			
			// 统计数据
			todayScanCount: 0,
			failedCount: 0,
			totalSuccessCount: 0,
			todayDate: '',
			
			// 扫码状态
			isScanning: false,
			isUploading: false,
			scanStatus: 'idle', // idle, scanning, uploading, success, error
			statusText: '准备就绪',
			lastScanTime: 0,
			lastScanCode: '',
			
			// 数据
			historyList: [],
			logs: [],
			pendingQueue: [],
			
			// 定时器
			networkTimer: null,
			syncTimer: null
		}
	},
	
	computed: {
		scanStatusClass() {
			return this.scanStatus
		},
		statusIcon() {
			const icons = {
				idle: '📷',
				scanning: '⏳',
				uploading: '📡',
				success: '✓',
				error: '✕'
			}
			return icons[this.scanStatus] || '📷'
		}
	},
	
	onLoad() {
		this.initApp()
	},
	
	onShow() {
		this.loadData()
		this.startNetworkMonitor()
		this.startSyncTimer()
	},
	
	onHide() {
		this.stopTimers()
	},
	
	onUnload() {
		this.stopTimers()
	},
	
	methods: {
		// 初始化应用
		async initApp() {
			this.addLog('info', '应用启动')
			
			// 获取状态栏高度
			const systemInfo = uni.getSystemInfoSync()
			this.statusBarHeight = systemInfo.statusBarHeight || 20
			
			// 检查网络状态
			this.checkNetwork()
			
			// 加载数据
			this.loadData()
			
			// 设置今天日期
			this.todayDate = this.formatDate(new Date())
		},
		
		// 加载本地数据
		loadData() {
			try {
				// 加载统计数据
				const stats = uni.getStorageSync('fyt_stats') || {
					todayScanCount: 0,
					totalSuccessCount: 0,
					lastResetDate: this.todayDate
				}
				
				// 检查是否需要重置今日统计
				if (stats.lastResetDate !== this.todayDate) {
					stats.todayScanCount = 0
					stats.lastResetDate = this.todayDate
				}
				
				this.todayScanCount = stats.todayScanCount
				this.totalSuccessCount = stats.totalSuccessCount
				
				// 加载历史记录
				this.historyList = uni.getStorageSync('fyt_history') || []
				
				// 加载待重试队列
				this.pendingQueue = uni.getStorageSync('fyt_pending') || []
				this.failedCount = this.pendingQueue.length
				
				// 加载日志
				this.logs = uni.getStorageSync('fyt_logs') || []
				this.unreadLogCount = this.logs.filter(l => l.level === 'error').length
				
				this.addLog('info', `数据加载完成，历史记录 ${this.historyList.length} 条`)
			} catch (e) {
				this.addLog('error', '数据加载失败：' + e.message)
			}
		},
		
		// 保存统计数据
		saveStats() {
			try {
				uni.setStorageSync('fyt_stats', {
					todayScanCount: this.todayScanCount,
					totalSuccessCount: this.totalSuccessCount,
					lastResetDate: this.todayDate
				})
			} catch (e) {
				this.addLog('error', '保存统计失败：' + e.message)
			}
		},
		
		// 保存历史记录
		saveHistory() {
			try {
				// 只保留最近 30 条
				const history = this.historyList.slice(0, 30)
				uni.setStorageSync('fyt_history', history)
			} catch (e) {
				this.addLog('error', '保存历史失败：' + e.message)
			}
		},
		
		// 保存待重试队列
		savePending() {
			try {
				uni.setStorageSync('fyt_pending', this.pendingQueue)
				this.failedCount = this.pendingQueue.length
			} catch (e) {
				this.addLog('error', '保存队列失败：' + e.message)
			}
		},
		
		// 保存日志
		saveLogs() {
			try {
				// 只保留最近 50 条
				const logs = this.logs.slice(-50)
				uni.setStorageSync('fyt_logs', logs)
				this.unreadLogCount = logs.filter(l => l.level === 'error').length
			} catch (e) {
				console.error('保存日志失败:', e)
			}
		},
		
		// 添加日志
		addLog(level, message) {
			const log = {
				level,
				message,
				time: this.formatTime(new Date())
			}
			this.logs.push(log)
			this.saveLogs()
			console.log(`[${level.toUpperCase()}] ${message}`)
		},
		
		// 开始扫码
		startScan() {
			if (this.isScanning) return
			
			this.isScanning = true
			this.scanStatus = 'scanning'
			this.statusText = '正在扫码...'
			
			this.addLog('info', '开始扫码')
			
			uni.scanCode({
				onlyFromCamera: true,
				success: (res) => {
					this.handleScanResult(res)
				},
				fail: (err) => {
					this.handleScanError(err)
				},
				complete: () => {
					this.isScanning = false
					if (this.scanStatus !== 'uploading') {
						this.scanStatus = 'idle'
						this.statusText = '准备就绪'
					}
				}
			})
		},
		
		// 处理扫码结果
		handleScanResult(res) {
			const code = res.result.trim()
			const now = Date.now()
			
			// 检查扫码间隔（防止重复）
			if (now - this.lastScanTime < config.scanInterval) {
				this.showToast('扫码太快了', 'warning')
				return
			}
			
			// 检查是否重复扫码
			if (code === this.lastScanCode) {
				this.showToast('请勿重复扫码', 'warning')
				return
			}
			
			// 校验追溯码格式（20 位数字）
			if (!/^\d{20}$/.test(code)) {
				this.showToast('无效的追溯码（需 20 位数字）', 'error')
				this.scanStatus = 'error'
				this.statusText = '无效编码'
				this.vibrate('long')
				return
			}
			
			this.lastScanTime = now
			this.lastScanCode = code
			
			// 播放音效
			this.playSound('scan')
			
			// 上传追溯码
			this.uploadCode(code)
		},
		
		// 处理扫码错误
		handleScanError(err) {
			this.addLog('error', '扫码失败：' + err.message)
			this.showToast('扫码失败：' + err.message, 'error')
			this.vibrate('long')
		},
		
		// 上传追溯码到淘宝 API
		async uploadCode(code) {
			this.isUploading = true
			this.scanStatus = 'uploading'
			this.statusText = '正在上传...'
			
			this.addLog('info', `准备上传追溯码：${code}`)
			
			try {
				const result = await this.callTaobaoAPI(code)
				
				if (result.success) {
					this.handleUploadSuccess(code)
				} else {
					this.handleUploadError(code, result.error)
				}
			} catch (error) {
				this.addLog('error', '上传异常：' + error.message)
				this.handleUploadError(code, error.message)
			} finally {
				this.isUploading = false
			}
		},
		
		// 调用淘宝 API
		async callTaobaoAPI(code) {
			const timestamp = new Date().toISOString().replace(/[-:]/g, '').substring(0, 14)
			const billCode = this.generateBillCode()
			
			// 构建参数
			const params = {
				app_key: config.appKey,
				method: config.method,
				timestamp,
				format: 'json',
				v: '2.0',
				sign_method: 'md5',
				ref_ent_id: config.refEntId,
				bill_code: billCode,
				drug_codes: code,
				ent_check_bill: 'false'
			}
			
			// 生成签名
			const sign = this.generateSign(params, config.appSecret)
			params.sign = sign.toUpperCase()
			
			this.addLog('debug', `API 请求参数：${JSON.stringify(params)}`)
			
			// 发送 POST 请求
			return new Promise((resolve, reject) => {
				uni.request({
					url: config.apiUrl,
					method: 'POST',
					header: {
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					data: this.urlEncode(params),
					timeout: config.timeout,
					success: (res) => {
						this.addLog('info', `API 响应：${JSON.stringify(res.data)}`)
						
						if (res.statusCode === 200) {
							const responseData = res.data
							
							// 检查 API 响应
							if (responseData.error_response) {
								resolve({
									success: false,
									error: responseData.error_response.msg || 'API 错误'
								})
							} else if (responseData[config.method.replace(/\./g, '_') + '_response']) {
								const apiResponse = responseData[config.method.replace(/\./g, '_') + '_response']
								if (apiResponse.successful) {
									resolve({ success: true })
								} else {
									resolve({
										success: false,
										error: apiResponse.message || '上传失败'
									})
								}
							} else {
								resolve({
									success: false,
									error: '未知响应格式'
								})
							}
						} else {
							reject(new Error(`HTTP ${res.statusCode}`))
						}
					},
					fail: (err) => {
						reject(new Error(err.errMsg || '网络请求失败'))
					}
				})
			})
		},
		
		// 生成单据编号
		generateBillCode() {
			const date = new Date()
			const dateStr = date.toISOString().replace(/[-]/g, '').substring(0, 8)
			const random = Math.random().toString(36).substring(2, 8).toUpperCase()
			return `FY${dateStr}${random}`
		},
		
		// 生成签名（淘宝 API 规范）
		generateSign(params, secret) {
			// 按键名升序排序
			const sortedKeys = Object.keys(params).sort()
			
			// 拼接参数字符串（空值不参与）
			let signString = secret
			for (const key of sortedKeys) {
				const value = params[key]
				if (value !== '' && value != null) {
					signString += key + value
				}
			}
			signString += secret
			
			// MD5 加密并转大写
			return this.md5(signString)
		},
		
		// URL 编码参数
		urlEncode(params) {
			const encoded = []
			for (const key in params) {
				if (params.hasOwnProperty(key)) {
					encoded.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
				}
			}
			return encoded.join('&')
		},
		
		// MD5 加密（简单实现，生产环境建议使用成熟库）
		md5(str) {
			// #ifdef APP-PLUS
			// Android/iOS 原生支持
			return plus.crypto.createMD5(str)
			// #endif
			
			// #ifndef APP-PLUS
			// H5 回退方案（简单实现）
			let hash = 0
			for (let i = 0; i < str.length; i++) {
				const char = str.charCodeAt(i)
				hash = ((hash << 5) - hash) + char
				hash = hash & hash
			}
			return Math.abs(hash).toString(16).padStart(32, '0')
			// #endif
		},
		
		// 处理上传成功
		handleUploadSuccess(code) {
			this.scanStatus = 'success'
			this.statusText = '上传成功'
			
			// 播放成功音效
			this.playSound('success')
			this.vibrate('short')
			
			// 更新统计
			this.todayScanCount++
			this.totalSuccessCount++
			this.saveStats()
			
			// 添加到历史记录
			this.historyList.unshift({
				code,
				status: 'success',
				timestamp: Date.now()
			})
			this.saveHistory()
			
			this.showToast('上传成功', 'success')
			this.addLog('success', `追溯码上传成功：${code}`)
			
			// 自动继续扫码（连续模式）
			setTimeout(() => {
				if (!this.isScanning) {
					this.scanStatus = 'idle'
					this.statusText = '准备就绪'
					this.startScan()
				}
			}, 1000)
		},
		
		// 处理上传失败
		handleUploadError(code, error) {
			this.scanStatus = 'error'
			this.statusText = '上传失败'
			
			this.vibrate('long')
			this.showToast('上传失败：' + error, 'error')
			
			// 添加到待重试队列
			this.pendingQueue.push({
				code,
				timestamp: Date.now(),
				error,
				retryCount: 0
			})
			this.savePending()
			
			// 添加到历史记录
			this.historyList.unshift({
				code,
				status: 'error',
				timestamp: Date.now(),
				error
			})
			this.saveHistory()
			
			this.addLog('error', `追溯码上传失败：${code}, 错误：${error}`)
			
			// 指数退避重试
			this.scheduleRetry(code, error)
		},
		
		// 安排重试
		scheduleRetry(code, error) {
			const pendingItem = this.pendingQueue.find(p => p.code === code)
			if (!pendingItem || pendingItem.retryCount >= config.maxRetry) {
				return
			}
			
			const delay = config.retryDelay * Math.pow(2, pendingItem.retryCount)
			this.addLog('info', `将在 ${delay/1000} 秒后重试`)
			
			setTimeout(() => {
				this.retrySingleCode(pendingItem)
			}, delay)
		},
		
		// 重试单个代码
		async retrySingleCode(pendingItem) {
			if (!this.isOnline) return
			
			pendingItem.retryCount++
			this.addLog('info', `重试上传：${pendingItem.code} (第${pendingItem.retryCount}次)`)
			
			try {
				const result = await this.callTaobaoAPI(pendingItem.code)
				
				if (result.success) {
					// 从待重试队列移除
					this.pendingQueue = this.pendingQueue.filter(p => p.code !== pendingItem.code)
					this.savePending()
					
					// 更新历史记录状态
					const historyItem = this.historyList.find(h => h.code === pendingItem.code)
					if (historyItem) {
						historyItem.status = 'success'
						historyItem.error = ''
						this.saveHistory()
					}
					
					this.showToast('重试成功', 'success')
					this.addLog('success', `重试成功：${pendingItem.code}`)
				} else {
					this.scheduleRetry(pendingItem.code, result.error)
				}
			} catch (error) {
				this.scheduleRetry(pendingItem.code, error.message)
			}
		},
		
		// 重试所有失败
		async retryFailed() {
			if (this.pendingQueue.length === 0) return
			
			this.showToast('开始重试...', 'info')
			this.addLog('info', '开始批量重试')
			
			for (const item of this.pendingQueue) {
				await this.retrySingleCode(item)
				// 避免频繁请求
				await new Promise(resolve => setTimeout(resolve, 500))
			}
		},
		
		// 网络状态检测
		checkNetwork() {
			uni.getNetworkType({
				success: (res) => {
					this.isOnline = res.networkType !== 'none'
				}
			})
		},
		
		// 启动网络监控
		startNetworkMonitor() {
			uni.onNetworkStatusChange((res) => {
				this.isOnline = res.isConnected
				this.addLog('info', `网络状态变化：${res.isConnected ? '已连接' : '已断开'}`)
				
				if (res.isConnected && this.pendingQueue.length > 0) {
					this.showToast('网络已恢复，开始同步', 'success')
					this.retryFailed()
				}
			})
		},
		
		// 启动定时同步
		startSyncTimer() {
			this.syncTimer = setInterval(() => {
				if (this.isOnline && this.pendingQueue.length > 0) {
					this.addLog('info', '定时同步离线队列')
					this.retryFailed()
				}
			}, 30000) // 每 30 秒
		},
		
		// 停止定时器
		stopTimers() {
			if (this.networkTimer) {
				clearInterval(this.networkTimer)
			}
			if (this.syncTimer) {
				clearInterval(this.syncTimer)
			}
		},
		
		// 显示日志
		showLogs() {
			this.showLogModal = true
			this.unreadLogCount = 0
		},
		
		// 复制日志
		copyLogs() {
			const logText = this.logs.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}`).join('\n')
			uni.setClipboardData({
				data: logText,
				success: () => {
					this.showToast('已复制到剪贴板', 'success')
				}
			})
		},
		
		// 清空日志
		clearLogs() {
			this.logs = []
			this.saveLogs()
			this.unreadLogCount = 0
			this.showToast('日志已清空', 'success')
		},
		
		// 导出日志
		exportLogs() {
			this.copyLogs()
		},
		
		// 测试 API
		async testAPI() {
			this.showToast('测试中...', 'info')
			try {
				const result = await this.callTaobaoAPI('12345678901234567890')
				if (result.success) {
					this.showToast('API 测试成功', 'success')
				} else {
					this.showToast('API 测试失败：' + result.error, 'error')
				}
			} catch (error) {
				this.showToast('API 测试异常：' + error.message, 'error')
			}
		},
		
		// 清空成功记录
		clearSuccessRecords() {
			this.historyList = this.historyList.filter(h => h.status !== 'success')
			this.saveHistory()
			this.showToast('成功记录已清空', 'success')
		},
		
		// 播放音效
		playSound(type) {
			// #ifdef APP-PLUS
			const soundPath = type === 'scan' ? '/static/sounds/scan.mp3' : '/static/sounds/success.mp3'
			const player = plus.audio.createPlayer(soundPath)
			player.play()
			// #endif
		},
		
		// 振动反馈
		vibrate(type) {
			if (type === 'short') {
				uni.vibrateShort()
			} else {
				uni.vibrateLong()
			}
		},
		
		// Toast 提示
		showToast(title, icon = 'none') {
			uni.showToast({
				title,
				icon,
				duration: 2500
			})
		},
		
		// 追溯码脱敏
		maskCode(code) {
			if (!code || code.length < 12) return code
			return code.substring(0, 6) + '****' + code.substring(code.length - 6)
		},
		
		// 格式化时间
		formatTime(timestamp) {
			const date = new Date(timestamp)
			const hours = String(date.getHours()).padStart(2, '0')
			const minutes = String(date.getMinutes()).padStart(2, '0')
			const seconds = String(date.getSeconds()).padStart(2, '0')
			return `${hours}:${minutes}:${seconds}`
		},
		
		// 格式化日期
		formatDate(date) {
			const year = date.getFullYear()
			const month = String(date.getMonth() + 1).padStart(2, '0')
			const day = String(date.getDate()).padStart(2, '0')
			return `${year}-${month}-${day}`
		},
		
		// 获取状态文本
		getStatusText(status) {
			const texts = {
				success: '成功',
				error: '失败',
				pending: '待重试'
			}
			return texts[status] || status
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background: #f5f7fa;
	padding-bottom: 40px;
}

/* 自定义导航栏 */
.custom-navbar {
	background: linear-gradient(135deg, #00c9a7 0%, #0077b6 100%);
	color: #fff;
	position: sticky;
	top: 0;
	z-index: 100;
	
	.navbar-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 16px 12px;
		
		.logo-section {
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
		
		.status-section {
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
						animation: pulse 2s infinite;
					}
					
					&.offline {
						background: #ef4444;
					}
				}
			}
			
			.log-btn {
				position: relative;
				background: rgba(255,255,255,0.2);
				border: none;
				color: #fff;
				padding: 6px 10px;
				border-radius: 6px;
				font-size: 16px;
				
				.log-badge {
					position: absolute;
					top: -4px;
					right: -4px;
					background: #ef4444;
					color: #fff;
					font-size: 10px;
					padding: 2px 5px;
					border-radius: 10px;
					min-width: 16px;
					text-align: center;
				}
			}
		}
	}
}

/* 核心数据卡片 */
.stats-card {
	margin: 16px;
	background: linear-gradient(135deg, #00c9a7 0%, #0077b6 100%);
	border-radius: 16px;
	padding: 20px;
	color: #fff;
	box-shadow: 0 8px 24px rgba(0,201,167,0.3);
	position: relative;
	overflow: hidden;
	
	&::before {
		content: '';
		position: absolute;
		top: -50%;
		right: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
		pointer-events: none;
	}
	
	.stats-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		
		.stats-title {
			font-size: 16px;
			font-weight: 600;
		}
		
		.stats-date {
			font-size: 12px;
			opacity: 0.8;
		}
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		
		.stat-item {
			text-align: center;
			
			.stat-label {
				display: block;
				font-size: 12px;
				opacity: 0.8;
				margin-bottom: 8px;
			}
			
			.stat-value {
				display: block;
				font-size: 36px;
				font-weight: 700;
				
				&.primary {
					color: #fff;
				}
				
				&.warning {
					color: #fbbf24;
				}
				
				&.success {
					color: #10b981;
					background: rgba(255,255,255,0.2);
					padding: 4px 8px;
					border-radius: 8px;
				}
			}
		}
	}
}

/* 扫码控制区 */
.scan-control {
	margin: 0 16px 16px;
	
	.scan-status-card {
		background: #fff;
		border-radius: 12px;
		padding: 16px;
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.08);
		
		.status-indicator {
			position: relative;
			width: 48px;
			height: 48px;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 24px;
			background: #f0f0f0;
			
			&.idle {
				background: #e0e7ff;
			}
			
			&.scanning {
				background: #fef3c7;
				animation: pulse 1s infinite;
			}
			
			&.uploading {
				background: #dbeafe;
			}
			
			&.success {
				background: #d1fae5;
				animation: successPulse 0.5s ease-out;
			}
			
			&.error {
				background: #fee2e2;
			}
			
			.uploading-ring {
				position: absolute;
				width: 100%;
				height: 100%;
				border-radius: 50%;
				border: 3px solid #3b82f6;
				border-top-color: transparent;
				animation: spin 1s linear infinite;
			}
		}
		
		.status-text {
			font-size: 16px;
			font-weight: 500;
			color: #1a202c;
		}
	}
	
	.btn-group {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 16px;
		
		.main-btn {
			background: linear-gradient(135deg, #00c9a7 0%, #0077b6 100%);
			color: #fff;
			border: none;
			border-radius: 12px;
			padding: 16px;
			font-size: 18px;
			font-weight: 600;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			box-shadow: 0 4px 16px rgba(0,201,167,0.3);
			
			&:disabled {
				opacity: 0.6;
			}
			
			.btn-icon {
				font-size: 24px;
			}
		}
		
		.retry-btn {
			background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
			color: #fff;
			border: none;
			border-radius: 12px;
			padding: 12px;
			font-size: 16px;
			font-weight: 600;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			
			.btn-icon {
				font-size: 20px;
			}
		}
	}
	
	.debug-btn-group {
		display: flex;
		gap: 8px;
		
		.debug-btn {
			flex: 1;
			background: #f0f0f0;
			color: #718096;
			border: none;
			border-radius: 8px;
			padding: 8px;
			font-size: 12px;
		}
	}
}

/* 历史记录区 */
.history-section {
	margin: 0 16px;
	background: #fff;
	border-radius: 12px;
	padding: 16px;
	box-shadow: 0 2px 8px rgba(0,0,0,0.08);
	
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
		
		.clear-btn {
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
		.history-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 12px 0;
			border-bottom: 1px solid #f0f0f0;
			
			&:last-child {
				border-bottom: none;
			}
			
			.item-left {
				display: flex;
				flex-direction: column;
				gap: 4px;
				
				.item-code {
					font-size: 14px;
					font-family: monospace;
					color: #1a202c;
				}
				
				.item-time {
					font-size: 12px;
					color: #a0aec0;
				}
			}
			
			.item-right {
				display: flex;
				flex-direction: column;
				align-items: flex-end;
				gap: 4px;
				
				.item-status {
					font-size: 12px;
					padding: 2px 8px;
					border-radius: 4px;
					
					&.success {
						background: #d1fae5;
						color: #065f46;
					}
					
					&.error {
						background: #fee2e2;
						color: #991b1b;
					}
					
					&.pending {
						background: #fef3c7;
						color: #92400e;
					}
				}
				
				.item-error {
					font-size: 10px;
					color: #ef4444;
					max-width: 150px;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
			}
		}
	}
}

/* 日志弹窗 */
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
	animation: fadeIn 0.3s ease-out;
	
	.modal-content {
		background: #fff;
		border-radius: 16px;
		width: 90%;
		max-width: 500px;
		max-height: 70vh;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease-out;
		
		.modal-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 16px;
			border-bottom: 1px solid #f0f0f0;
			
			.modal-title {
				font-size: 18px;
				font-weight: 600;
			}
			
			.modal-close {
				background: none;
				border: none;
				font-size: 24px;
				color: #718096;
				padding: 4px;
			}
		}
		
		.modal-body {
			flex: 1;
			padding: 16px;
			max-height: 400px;
			
			.log-item {
				padding: 8px 0;
				border-bottom: 1px solid #f0f0f0;
				font-size: 12px;
				
				&:last-child {
					border-bottom: none;
				}
				
				.log-time {
					color: #a0aec0;
					margin-right: 8px;
				}
				
				.log-msg {
					color: #1a202c;
					
					&.error {
						color: #ef4444;
					}
					
					&.success {
						color: #10b981;
					}
					
					&.warning {
						color: #f59e0b;
					}
				}
			}
		}
		
		.modal-footer {
			padding: 16px;
			border-top: 1px solid #f0f0f0;
			
			.modal-btn {
				width: 100%;
				background: linear-gradient(135deg, #00c9a7 0%, #0077b6 100%);
				color: #fff;
				border: none;
				border-radius: 8px;
				padding: 12px;
				font-size: 16px;
				font-weight: 600;
			}
		}
	}
}

/* 动画 */
@keyframes pulse {
	0%, 100% {
		opacity: 1;
		transform: scale(1);
	}
	50% {
		opacity: 0.5;
		transform: scale(1.05);
	}
}

@keyframes successPulse {
	0% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.1);
	}
	100% {
		transform: scale(1);
	}
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

@keyframes slideUp {
	from {
		transform: translateY(20px);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}
</style>

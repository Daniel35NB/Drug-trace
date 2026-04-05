<script>
export default {
	onLaunch: function() {
		console.log('App Launch')
	},
	onShow: function() {
		console.log('App Show')
	},
	onHide: function() {
		console.log('App Hide')
	}
}
</script>

<style lang="scss">
/*每个页面公共 css */
page {
	background-color: #f5f7fa;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 全局样式变量 */
:root {
	--primary-gradient: linear-gradient(135deg, #00c9a7 0%, #0077b6 100%);
	--success-color: #10b981;
	--error-color: #ef4444;
	--warning-color: #f59e0b;
	--bg-color: #f5f7fa;
	--card-bg: #ffffff;
	--text-primary: #1a202c;
	--text-secondary: #718096;
	--text-hint: #a0aec0;
	--radius-sm: 8px;
	--radius-md: 12px;
	--radius-lg: 16px;
	--radius-xl: 20px;
	--shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
	--shadow-md: 0 4px 16px rgba(0,0,0,0.1);
	--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
}
</style>

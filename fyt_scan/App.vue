<script>
export default {
  onLaunch: function() {
    console.log('App Launch - 丰源堂药品追溯扫码系统')
    
    // 检查网络状态
    uni.onNetworkStatusChange((res) => {
      console.log('网络状态变化:', res.isConnected)
      uni.$emit('networkChange', res)
    })
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
  font-size: 14px;
  line-height: 1.5;
  color: #1a202c;
}

view, text {
  box-sizing: border-box;
}

button {
  &:after {
    border: none;
  }
}
</style>

App({
  onLaunch() {
    // 检查设备性能
    const systemInfo = wx.getSystemInfoSync();
    if (systemInfo.platform === 'devtools') {
      console.log('Running in devtools');
    } else {
      // 检查设备性能，如果性能太低，可以降低特效
      const performance = wx.getPerformance();
      const memory = performance.memory;
      if (memory && memory.jsHeapSizeLimit < 100 * 1024 * 1024) {
        // 内存较小的设备，降低粒子数量
        console.log('Low memory device detected');
      }
    }
  }
}); 
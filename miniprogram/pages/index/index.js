const app = getApp();

// 导入核心类
import FireworkSystem from '../../services/FireworkSystem';
import SceneManager from '../../services/SceneManager';
import AudioManager from '../../services/AudioManager';

Page({
  data: {
    isPanelVisible: false,
    isPaused: false,
    currentScene: 'night',
    isSnowing: false,
    cameraFollowing: true,
    customText: '',
    fuseHeight: 100,  // 引线高度，初始为100%
    isFuseBurning: false,  // 引线是否正在燃烧
    isMuted: false,
    isVolumeVisible: false,
    volumeValue: 80
  },

  // 系统实例
  fireworkSystem: null,
  sceneManager: null,
  audioManager: null,

  onLoad() {
    // 初始化系统
    this.initSystems();
    // 设置触摸事件
    this.initTouchEvents();
  },

  async onReady() {
    try {
      // 获取画布上下文
      const query = wx.createSelectorQuery();
      const canvas = await new Promise((resolve) => {
        query.select('#fireworkCanvas')
          .node()
          .exec((res) => {
            resolve(res[0].node);
          });
      });
      
      // 初始化渲染系统
      this.fireworkSystem.initRenderer(canvas);
      // 初始化场景管理器的 canvas 并等待场景加载
      await this.sceneManager.initCanvas(canvas);
      // 设置场景管理器
      this.fireworkSystem.setSceneManager(this.sceneManager);
      // 开始渲染循环
      this.startRenderLoop();
    } catch (error) {
      console.error('Failed to initialize:', error);
      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      });
    }
  },

  // 初始化核心系统
  initSystems() {
    this.fireworkSystem = new FireworkSystem();
    this.sceneManager = new SceneManager();
    this.audioManager = new AudioManager();
    
    // 设置音效管理器
    this.fireworkSystem.setAudioManager(this.audioManager);
  },

  // 初始化触摸事件
  initTouchEvents() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.panelWidth = 300; // 面板宽度的一半
  },

  // 添加触摸事件处理
  onTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  onTouchMove(e) {
    const deltaX = e.touches[0].clientX - this.touchStartX;
    const deltaY = e.touches[0].clientY - this.touchStartY;

    // 如果横向滑动距离大于纵向，且幅度足够大
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      // 从右向左滑动，打开面板
      if (deltaX < 0 && !this.data.isPanelVisible) {
        this.setData({ isPanelVisible: true });
      }
      // 从左向右滑动，关闭面板
      else if (deltaX > 0 && this.data.isPanelVisible) {
        this.setData({ isPanelVisible: false });
      }
    }
  },

  // 开始渲染循环
  startRenderLoop() {
    const loop = () => {
      try {
        if (!this.data.isPaused) {
          // 更新场景
          this.sceneManager.update(1/60);
          // 更新烟花系统
          this.fireworkSystem.update();
          // 渲染
          this.fireworkSystem.render();
        }
      } catch (error) {
        console.error('Render loop error:', error);
        // 停止渲染循环
        this.data.isPaused = true;
        wx.showToast({
          title: '渲染错误',
          icon: 'none'
        });
      }
      this.animationFrame = setTimeout(loop, 1000 / 60);
    };
    loop();
  },

  // 点击引线
  onTapFuse() {
    if (this.data.isFuseBurning || this.data.isPaused) return;

    this.setData({
      isFuseBurning: true
    });

    // 播放燃烧音效
    this.audioManager.playFuseSound();

    // 开始引线动画
    this.startFuseAnimation();
  },

  // 引线动画
  startFuseAnimation() {
    const duration = 4000;
    const interval = 50;
    const steps = duration / interval;
    const heightStep = 100 / steps;
    let currentStep = 0;

    // 预先计算发射位置
    const launchX = this.fireworkSystem.canvas.width * (0.3 + Math.random() * 0.4);
    const launchY = this.fireworkSystem.canvas.height;

    this.fuseTimer = setInterval(() => {
      currentStep++;
      const newHeight = 100 - (currentStep * heightStep);

      this.setData({
        fuseHeight: Math.max(0, newHeight)
      });

      if (currentStep >= steps) {
        // 动画结束
        clearInterval(this.fuseTimer);
        this.audioManager.stopFuseSound();
        this.setData({
          isFuseBurning: false,
          fuseHeight: 100
        });

        // 发射烟花
        if (this.data.customText) {
          // 发射文字烟花
          this.fireworkSystem.launchTextFirework(this.data.customText, {
            x: launchX,
            y: launchY
          });
        } else {
          // 发射普通烟花
          this.fireworkSystem.launchFirework({
            x: launchX,
            color: this.getRandomColor()
          });
        }
      }
    }, interval);
  },

  // 添加随机颜色生成方法
  getRandomColor() {
    const hue = Math.random() * 360;
    const rgb = this.fireworkSystem.hslToRgb(hue / 360, 0.8, 0.5);
    return [...rgb, 1];
  },

  // 切换设置面板
  togglePanel() {
    this.setData({
      isPanelVisible: !this.data.isPanelVisible
    });
  },

  // 切换暂停状态
  togglePause() {
    const newState = !this.data.isPaused;
    console.log(`[Debug UI] Toggling pause state to: ${newState}`);
    console.log(`[Debug UI] Using image: ${newState ? './images/ui/play.png' : './images/ui/pause.png'}`);
    this.setData({
      isPaused: newState
    });
  },

  // 切换场景
  changeScene(e) {
    const scene = e.currentTarget.dataset.scene;
    this.sceneManager.switchScene(scene);
    this.setData({
      currentScene: scene
    });
  },

  // 切换下雪效果
  toggleSnow() {
    this.setData({
      isSnowing: !this.data.isSnowing
    });
    this.sceneManager.toggleSnow(this.data.isSnowing);
  },

  // 切换相机跟随
  toggleCameraFollow() {
    this.setData({
      cameraFollowing: !this.data.cameraFollowing
    });
    this.fireworkSystem.setCameraFollowing(this.data.cameraFollowing);
  },

  // 设置自定义文字
  setCustomText(e) {
    this.setData({
      customText: e.detail.value
    });
  },

  // 切换静音
  toggleMute() {
    const newState = !this.data.isMuted;
    console.log(`[Debug UI] Toggling mute state to: ${newState}`);
    console.log(`[Debug UI] Using image: ${newState ? './images/ui/mute.png' : './images/ui/volume.png'}`);
    this.setData({
      isMuted: newState
    });
  },

  // 音量变化
  onVolumeChange(e) {
    const volume = e.detail.value;
    this.setData({
      volumeValue: volume,
      isMuted: volume === 0
    });
    
    this.audioManager.setAllVolume(volume / 100);
  },

  onUnload() {
    if (this.fuseTimer) {
      clearInterval(this.fuseTimer);
    }
    if (this.animationFrame) {
      clearTimeout(this.animationFrame);
    }
    this.audioManager.dispose();
    this.fireworkSystem.dispose();
  },

  onImageError(e) {
    const imageName = e.currentTarget.dataset.image;
    console.error(`[Debug UI] Image load error for ${imageName}:`, e.detail);
  }
});

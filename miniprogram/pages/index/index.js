const app = getApp();

// 导入核心类
import FireworkSystem from '../../services/FireworkSystem';
import AudioManager from '../../services/AudioManager';
import SceneManager from '../../services/SceneManager';

Page({
  data: {
    isPanelVisible: false,
    isPaused: false,
    currentScene: 'night',
    currentSceneImage: './images/scenes/night.png',  // 添加当前场景图片路径
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
  audioManager: null,
  sceneManager: null,

  onLoad() {
    // 初始化系统
    this.initSystems();
    // 设置触摸事件
    this.initTouchEvents();
    
    console.log('[Init Debug] Adding event listeners');
    // 监听所有tap事件用于调试
    this.tapDebugListener = (e) => {
      console.log('[Tap Debug] Tap event captured:', {
        target: e.target,
        currentTarget: e.currentTarget,
        dataset: e.target.dataset,
        timeStamp: e.timeStamp
      });
    };
    
    wx.createSelectorQuery()
      .select('.control-button.settings')
      .node(res => {
        console.log('[Init Debug] Settings button found:', res);
      })
      .exec();
  },

  async onReady() {
    try {
      console.log('[Init Debug] Page onReady started');
      // 获取canvas
      const query = wx.createSelectorQuery();
      const [effectCanvas, snowCanvas] = await Promise.all([
        new Promise((resolve) => {
          query.select('#fireworkCanvas')
            .node()
            .exec((res) => {
              resolve(res[0].node);
            });
        }),
        new Promise((resolve) => {
          query.select('#snowCanvas')  // 添加雪花效果的canvas
            .node()
            .exec((res) => {
              resolve(res[0].node);
            });
        })
      ]);
      
      // 初始化系统
      this.initSystems();
      
      // 初始化烟花系统
      await this.fireworkSystem.initRenderer(effectCanvas);
      
      // 初始化场景管理器
      await this.sceneManager.initCanvas(snowCanvas);
      
      console.log('[Init Debug] Canvas initialization completed');
      
      // 开始渲染循环
      this.startRenderLoop();
    } catch (error) {
      console.error('[Init Debug] Initialization failed:', error);
      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      });
    }
  },

  // 初始化核心系统
  initSystems() {
    console.log('[Init Debug] Starting systems initialization');
    this.fireworkSystem = new FireworkSystem();
    this.audioManager = new AudioManager();
    this.sceneManager = new SceneManager();
    
    // 设置音效管理器
    this.fireworkSystem.setAudioManager(this.audioManager);
    console.log('[Init Debug] Core systems initialized');
  },

  // 初始化触摸事件
  initTouchEvents() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.panelWidth = 300;
  },

  // 添加触摸事件处理
  onTouchStart(e) {
    // 仅记录触摸位置，暂时不做任何处理
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  onTouchMove(e) {
    // 暂时移除所有处理逻辑
  },

  // 开始渲染循环
  startRenderLoop() {
    const loop = () => {
      try {
        if (!this.data.isPaused) {
          const currentTime = Date.now();
          const deltaTime = (currentTime - this.lastFrameTime) / 1000;
          this.lastFrameTime = currentTime;

          // 更新场景（包括雪花效果）
          if (this.sceneManager) {
            this.sceneManager.update(deltaTime);
          }

          // 更新烟花系统
          this.fireworkSystem.update();
          this.fireworkSystem.render();
        }
      } catch (error) {
        console.error('[Render Debug] Render loop error:', error);
      }
      this.animationFrame = setTimeout(loop, 1000 / 60);
    };
    
    this.lastFrameTime = Date.now();
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

        // 修改这里：使用 handleFuseBurnout 来发射烟花
        this.fireworkSystem.handleFuseBurnout(launchX, launchY);
        
        // 播放发射音效
        this.audioManager.playLaunchSound();
        // 播放呼啸音效
        this.audioManager.playWhistleSound();
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
  togglePanel(e) {
    console.log('[Panel Debug] togglePanel triggered:', {
      event: e,
      currentState: this.data.isPanelVisible,
      eventType: e ? e.type : 'none',
      target: e ? e.target : 'none',
      dataset: e && e.target ? e.target.dataset : 'none'
    });

    // 简化条件判断
    if (e && e.target && e.target.dataset && e.target.dataset.role === 'settings') {
      console.log('[Panel Debug] Settings button clicked, toggling panel');
      this.setData({
        isPanelVisible: !this.data.isPanelVisible
      });
    } else {
      console.log('[Panel Debug] Panel toggle conditions not met');
    }
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
    const sceneImages = {
      night: './images/scenes/night.png',
      grassland: './images/scenes/grassland.png',
      sea: './images/scenes/sea.png',
      city: './images/scenes/city.png',
      village: './images/scenes/village.png'
    };

    this.setData({
      currentScene: scene,
      currentSceneImage: sceneImages[scene]
    });
  },

  // 切换下雪效果
  toggleSnow() {
    const newState = !this.data.isSnowing;
    console.log('[UI Debug] Toggling snow effect:', {
      oldState: this.data.isSnowing,
      newState: newState
    });
    
    this.setData({
      isSnowing: newState
    });

    if (this.sceneManager) {
      console.log('[UI Debug] Calling SceneManager.toggleSnow');
      this.sceneManager.toggleSnow(newState);
    } else {
      console.error('[UI Debug] SceneManager not initialized when toggling snow');
    }
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
    this.setData({
      isMuted: newState,
      volumeValue: newState ? 0 : 80  // 直接在静音切换时设置音量
    });
    
    // 更新音频管理器的音量
    this.audioManager.setAllVolume(newState ? 0 : 0.8);
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
  },

  // 添加点击事件处理（如果有的话）
  onTap(e) {
    console.log('[Tap Debug] onTap triggered:', {
      x: e.detail.x,
      y: e.detail.y,
      target: e.target,
      currentTarget: e.currentTarget,
      timeStamp: e.timeStamp,
      isPanelVisible: this.data.isPanelVisible
    });
  }
});

export default class SceneManager {
  constructor() {
    this.currentScene = 'night';
    this.scenes = new Map();
    this.isSnowing = false;
    this.snowParticles = [];
    this.canvas = null;
    this.fadeAlpha = 1;
    this.isFading = false;
    
    // 使用相对于页面的路径格式
    this.sceneImages = {
      night: './images/scenes/night.png',
      grassland: './images/scenes/grassland.png',
      sea: './images/scenes/sea.png',
      city: './images/scenes/city.png',
      village: './images/scenes/village.png',
      fallback: './images/scenes/fallback.png'
    };
  }

  // 修改初始化方法
  async initCanvas(canvas) {
    this.canvas = canvas;
    // 在canvas初始化后再加载场景
    await this.loadScenes();
  }

  // 修改场景加载方法
  async loadScenes() {
    if (!this.canvas) {
      console.error('Canvas not initialized');
      return;
    }

    // 预加载所有场景背景
    const scenes = ['night', 'grassland', 'sea', 'city', 'village'];
    let loadedAny = false;

    for (const scene of scenes) {
      try {
        const image = await this.loadImage(scene);
        this.scenes.set(scene, image);
        loadedAny = true;
      } catch (error) {
        console.error(`Failed to load scene: ${scene}`, error);
        try {
          const fallbackImage = await this.loadImage('fallback');
          this.scenes.set(scene, fallbackImage);
          loadedAny = true;
        } catch (fallbackError) {
          console.error('Failed to load fallback image:', fallbackError);
        }
      }
    }

    // 如果所有场景都加载失败，创建一个纯色背景
    if (!loadedAny) {
      console.warn('All scenes failed to load, using solid color background');
      const ctx = this.canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // 修改图片加载方法
  loadImage(sceneName) {
    return new Promise((resolve, reject) => {
      const imagePath = this.sceneImages[sceneName];
      console.log(`[Debug] Loading image for scene: ${sceneName}`);
      console.log(`[Debug] Image path: ${imagePath}`);

      if (!imagePath) {
        console.error(`[Debug] Invalid scene name: ${sceneName}`);
        reject(new Error(`Invalid scene name: ${sceneName}`));
        return;
      }

      const image = this.canvas.createImage();
      
      // 使用完整的小程序文件系统路径
      wx.getImageInfo({
        src: imagePath,
        success: (res) => {
          console.log(`[Debug] getImageInfo success:`, res);
          // 直接使用本地文件系统路径
          const fsPath = wx.env.USER_DATA_PATH + '/' + sceneName + '.png';
          // 将图片保存到本地文件系统
          wx.getFileSystemManager().writeFile({
            filePath: fsPath,
            data: wx.getFileSystemManager().readFileSync(res.path),
            encoding: 'binary',
            success: () => {
              image.src = fsPath;
              image.onload = () => {
                console.log(`[Debug] Image loaded successfully for scene: ${sceneName}`);
                resolve(image);
              };
              image.onerror = (e) => {
                console.error(`[Debug] Image load error for scene: ${sceneName}:`, e);
                reject(new Error(`Failed to load image: ${sceneName}`));
              };
            },
            fail: (err) => {
              console.error(`[Debug] Failed to write image to file system:`, err);
              reject(new Error(`Failed to write image: ${sceneName}`));
            }
          });
        },
        fail: (err) => {
          console.error(`[Debug] getImageInfo fail for scene ${sceneName}:`, err);
          console.error(`[Debug] Error message:`, err.errMsg);
          reject(new Error(`Failed to get image info: ${sceneName}`));
        }
      });
    });
  }

  // 切换场景
  async switchScene(sceneName) {
    if (!this.scenes.has(sceneName) || this.isFading) {
      return;
    }

    this.isFading = true;
    // 淡出动画
    for (let i = 0; i < 10; i++) {
      this.fadeAlpha = 1 - (i / 10);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.currentScene = sceneName;

    // 淡入动画
    for (let i = 0; i < 10; i++) {
      this.fadeAlpha = i / 10;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    this.isFading = false;
  }

  // 渲染场景
  render(ctx) {
    // 绘制背景
    const background = this.scenes.get(this.currentScene);
    if (background) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.drawImage(
        background,
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height
      );
      ctx.globalAlpha = 1;
    }

    // 如果开启下雪效果，渲染雪花
    if (this.isSnowing) {
      this.renderSnow(ctx);
    }
  }

  // 更新场景
  update(deltaTime) {
    if (this.isSnowing) {
      this.updateSnow(deltaTime);
    }
  }

  // 切换下雪效果
  toggleSnow(enabled) {
    this.isSnowing = enabled;
    if (enabled && this.snowParticles.length === 0) {
      this.initSnow();
    }
  }

  // 初始化雪花
  initSnow() {
    const numSnowflakes = 100;
    const canvasWidth = wx.getSystemInfoSync().windowWidth;
    const canvasHeight = wx.getSystemInfoSync().windowHeight;

    for (let i = 0; i < numSnowflakes; i++) {
      this.snowParticles.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        radius: Math.random() * 3 + 1,
        speed: Math.random() * 2 + 1,
        wind: Math.random() * 0.5 - 0.25
      });
    }
  }

  // 更新雪花
  updateSnow(deltaTime) {
    const canvasWidth = wx.getSystemInfoSync().windowWidth;
    const canvasHeight = wx.getSystemInfoSync().windowHeight;

    this.snowParticles.forEach(snow => {
      snow.y += snow.speed * deltaTime;
      snow.x += snow.wind * deltaTime;

      // 循环雪花
      if (snow.y > canvasHeight) {
        snow.y = -5;
        snow.x = Math.random() * canvasWidth;
      }
      if (snow.x > canvasWidth) {
        snow.x = 0;
      } else if (snow.x < 0) {
        snow.x = canvasWidth;
      }

      // 更新风力
      snow.wind += (Math.random() - 0.5) * 0.1;
      snow.wind = Math.max(-1, Math.min(1, snow.wind));
    });
  }

  // 渲染雪花
  renderSnow(ctx) {
    ctx.save();
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    this.snowParticles.forEach(snow => {
      ctx.beginPath();
      ctx.arc(snow.x, snow.y, snow.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
  }
} 
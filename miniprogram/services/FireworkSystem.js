import { Vector3 } from '../utils/math';
import Particle from './Particle';
import { ObjectPool } from '../utils/ObjectPool';
import { ExplosionTrail } from './ExplosionTrail';

// 添加样式配置
const FIREWORK_STYLES = {
  BASIC: 'basic',
  DUAL_COLOR: 'dual_color'
};

export default class FireworkSystem {
  constructor() {
    try {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.rockets = [];
    this.particlePool = new ObjectPool(Particle, 1000);
      this.trailPool = [];
      
    this.camera = {
      position: new Vector3(0, 0, 100),
      target: new Vector3(0, 0, 0)
    };
      
    this.cameraFollowing = true;
    this.audioManager = null;
    this.dpr = 1;
    this.fpsHistory = [];
    this.lastFrameTime = Date.now();
    this.performanceMode = 'high';
    this.debugMode = true;
    this.displayWidth = 0;
    this.displayHeight = 0;
    
      // 初始化状态标志
      this.isInitialized = false;
      
    const app = getApp();
    app.fireworkSystem = this;
    
    // 添加样式配置
    this.fireworkStyles = {
      [FIREWORK_STYLES.BASIC]: {
        trails: 38,
        spread: 0.65,
        baseSpeed: 140
      },
      [FIREWORK_STYLES.DUAL_COLOR]: {
        inner: {
          trails: 32,
          spread: 0.5,
          baseSpeed: 120,
          color: [255, 255, 255] // 内层白色
        },
        outer: {
          trails: 48,
          spread: 0.8,
          baseSpeed: 160,
          color: [255, 0, 0] // 外层红色
        }
      }
    };
    } catch (error) {
      console.error('[FireworkSystem] Initialization error:', error);
      throw error;
    }
  }

  // 修改初始化渲染器方法
  async initRenderer(canvas) {
    try {
    if (!canvas) {
        throw new Error('Canvas is undefined');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    if (!this.ctx) {
        throw new Error('Failed to get canvas context');
    }

    const info = wx.getSystemInfoSync();
    this.dpr = info.pixelRatio;
    this.displayWidth = info.windowWidth;
    this.displayHeight = info.windowHeight;
    
    canvas.width = this.displayWidth * this.dpr;
    canvas.height = this.displayHeight * this.dpr;
      this.ctx.scale(this.dpr, this.dpr);
      
      // 标记初始化完成
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      console.error('[FireworkSystem] Renderer initialization failed:', error);
      return false;
    }
  }

  // 发射烟花
  launchFirework(options = {}) {

    // 使用与测试粒子相同的创建方式
    const rocket = new Particle(options.x, options.y, true);
    rocket.color = [2, 2, 2, 2];
    
    // 使用与测试粒子相同的速度和加速度
    rocket.velocity = new Vector3(
      Math.random() * 2 - 1,  // 小范围随机水平速度
      -25,                    // 固定向上速度
      0
    );
    
    rocket.acceleration = new Vector3(0, 1.5, 0); // 重力加速度
    
    
    // 存入rockets数组
    this.rockets.push(rocket);
    
    // 添加可视化标记
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(options.x, options.y, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // 播放音效
    if (this.audioManager) {
      this.audioManager.playLaunchSound();
      setTimeout(() => {
        this.audioManager.playWhistleSound();
      }, 200);
    }
  }

  // 修改爆炸效果创建方法
  createExplosionParticles(position, color) {
    // 随机选择样式
    const style = Math.random() < 0.5 ? FIREWORK_STYLES.BASIC : FIREWORK_STYLES.DUAL_COLOR;
    
    if (style === FIREWORK_STYLES.BASIC) {
      // 原有的基础样式逻辑
      this.createBasicExplosion(position, color);
    } else {
      // 新增的双色样式逻辑
      this.createDualColorExplosion(position);
    }
    
    // 添加白色火花效果
    const sparkCount = 60; // 火花数量
    const sparkSpread = 30; // 火花扩散范围
    const sparkBaseSpeed = 80; // 火花基础速度
    
    for (let i = 0; i < sparkCount; i++) {
      // 随机角度
      const angle = Math.random() * Math.PI * 2;
      // 随机速度
      const speed = sparkBaseSpeed * (0.5 + Math.random() * 0.5);
      
      // 计算速度向量
      const velocity = new Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0
      );
      
      // 添加一些随机初始位置偏移
      const offset = new Vector3(
        (Math.random() - 0.5) * sparkSpread,
        (Math.random() - 0.5) * sparkSpread,
        0
      );
      
      // 创建火花轨迹
      const spark = new ExplosionTrail({
        position: position.clone().add(offset),
        velocity: velocity,
        baseHue: 0, // 使用白色
        layer: 0,
        hslToRgb: this.hslToRgb.bind(this),
        isSpark: true // 标记为火花粒子
      });
      
      this.particles.push(spark);
    }
  }

  // 添加基础爆炸效果方法
  createBasicExplosion(position, color) {
    // 移动原有的基础爆炸效果逻辑到这里
    const trails = 38;
    const baseHue = Math.random() * 360;
    const spread = 0.65;
    
    for (let layer = 0; layer < 3; layer++) {
      const layerSpread = spread * (layer * 0.15 + 1);
      const layerCount = Math.floor(trails * (1 - layer * 0.15));
      const layerDelay = layer * 18;
      
      setTimeout(() => {
        const baseSpeed = 140 + (2 - layer) * 20;
        
        for (let i = 0; i < layerCount; i++) {
          const segmentAngle = (Math.PI * 2) / layerCount;
          const angle = i * segmentAngle;
          const angleOffset = (Math.random() - 0.5) * segmentAngle * 0.3;
          const finalAngle = angle + angleOffset;
          
          // 计算速度向量
          const speedVariation = 0.9 + Math.random() * 0.15;
          const speed = baseSpeed * speedVariation * layerSpread;
          const velocity = new Vector3(
            Math.cos(finalAngle) * speed,
            Math.sin(finalAngle) * speed,
            0
          );
          
          // 创建轨迹
          const trail = new ExplosionTrail({
            position: position.clone(),
            velocity: velocity,
            baseHue,
            layer,
            hslToRgb: this.hslToRgb.bind(this)
          });
          
          this.particles.push(trail);
        }
      }, layerDelay);
    }
  }

  // 修改双色爆炸效果方法
  createDualColorExplosion(position) {
    const styleConfig = this.fireworkStyles[FIREWORK_STYLES.DUAL_COLOR];
    
    // 创建内层（白色）
    const innerConfig = {
      ...styleConfig.inner,
      isInner: true,
      maxParticles: 4,
      decay: 0.03,
      color: styleConfig.inner.color // 确保颜色正确传递
    };
    
    // 创建外层（红色）
    const outerConfig = {
      ...styleConfig.outer,
      isInner: false,
      maxParticles: 5,
      decay: 0.025,
      color: styleConfig.outer.color // 确保颜色正确传递
    };
    
    this.createColorLayer(position, innerConfig);
    this.createColorLayer(position, outerConfig);
  }

  // 创建单个颜色层
  createColorLayer(position, config) {
    const { trails, spread, baseSpeed, color, isInner, maxParticles, decay } = config;
    
    // 添加颜色配置检查
    if (!color || !Array.isArray(color) || color.length !== 3) {
      console.error('[ColorLayer] Invalid color configuration:', color);
      return;
    }
    
    
    for (let i = 0; i < trails; i++) {
      const segmentAngle = (Math.PI * 2) / trails;
      const angle = i * segmentAngle;
      const angleOffset = (Math.random() - 0.5) * segmentAngle * 0.3;
      const finalAngle = angle + angleOffset;
      
      // 计算速度向量
      const speedVariation = 0.9 + Math.random() * 0.15;
      const speed = baseSpeed * speedVariation * spread;
      const velocity = new Vector3(
        Math.cos(finalAngle) * speed,
        Math.sin(finalAngle) * speed,
        0
      );
      
      // 创建轨迹时确保颜色正确传递
      const trail = new ExplosionTrail({
        position: position.clone(),
        velocity: velocity,
        isInner: isInner,
        layer: isInner ? 0 : 1,
        color: [...color], // 确保传递颜色数组的副本
        maxParticles: maxParticles,
        decay: decay,
        hslToRgb: this.hslToRgb.bind(this)
      });
      
      this.particles.push(trail);
    }
  }

  // 创建爆炸中心闪光
  createExplosionFlash(position) {
    const flash = this.particlePool.get();
    flash.init({
        position: position.clone(),
      velocity: new Vector3(0, 0, 0),
      color: [1, 1, 1, 1],
      size: 15,
      decay: 15.0,  // 显著提高衰减速度，让闪光更快消失
      isFlash: true
    });
    this.particles.push(flash);
  }

  // 创建爆炸轨迹
  createExplosionTrail(options) {
    const { position, angle, speed, baseHue, layer } = options;
    
    // 创建轨迹对象
    const trail = new ExplosionTrail({
      position,
        velocity: new Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0
        ),
      baseHue,
      layer
      });
    
    return trail;
  }

  // 添加 HSL 转 RGB 的辅助方法
  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [r, g, b];
  }

  // 更新粒子
  update() {
    const now = Date.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    // 更新火箭
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rocket = this.rockets[i];
      const status = rocket.update(dt);

      if (rocket.phase === 'explode' || !status) {
        if (rocket.phase === 'explode') {
          this.explode(rocket.position.x, rocket.position.y);
        }
        this.rockets.splice(i, 1);
      }
    }

    // 更新爆炸粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const status = particle.update(dt);
      if (!status) {
        this.particles.splice(i, 1);
      }
    }

    if (this.cameraFollowing) {
      this.updateCamera();
    }
  }

  // 更新相机
  updateCamera() {
    if (this.particles.length > 0) {
      const target = this.particles[0].position;
      this.camera.target.lerp(target, 0.1);
    }
  }

  // 渲染场景
  render() {
    if (!this.ctx || !this.canvas) return;

    // 清除画布
    this.ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);
    
    // 设置混合模式
    this.ctx.globalCompositeOperation = 'screen';

    // 渲染所有粒子
    [...this.rockets, ...this.particles].forEach(particle => {
      if (particle instanceof ExplosionTrail) {
        // 渲染爆炸轨迹
        particle.render(this.ctx);
      } else if (particle.isFlash) {
        // 渲染爆炸闪光
        this.renderExplosionFlash(particle);
      } else {
        // 渲染普通粒子
        this.renderParticle(particle);
      }
    });

    this.monitorPerformance();
  }

  renderExplosionFlash(particle) {
    const gradient = this.ctx.createRadialGradient(
      particle.position.x, particle.position.y, 0,
      particle.position.x, particle.position.y, particle.size * 3
    );
    
    gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.alpha})`);
    gradient.addColorStop(0.4, `rgba(255, 255, 255, ${particle.alpha * 0.3})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(particle.position.x, particle.position.y, particle.size * 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // 设置相机跟随
  setCameraFollowing(following) {
    this.cameraFollowing = following;
  }

  // 清理资源
  dispose() {
    this.particlePool.releaseAll();
    this.particles = [];
    this.trailPool = [];
    const app = getApp();
    app.fireworkSystem = null;
  }

  // 设置音效管理器
  setAudioManager(audioManager) {
    this.audioManager = audioManager;
  }

  // 添加文字烟花方法
  launchTextFirework(text, options = {}) {
    const characters = text.split('');
    const angleStep = (Math.PI * 2) / characters.length;
    const radius = 100; // 文字烟花的半径

    characters.forEach((char, index) => {
      const angle = angleStep * index;
      const x = options.x + Math.cos(angle) * radius;
      const y = options.y + Math.sin(angle) * radius;

      this.launchFirework({
        x: options.x,
        y: options.y,
        targetX: x,
        targetY: y,
        color: this.getRandomColor(),
        text: char
      });
    });
  }

  // 添加文字粒子创建方法
  createTextParticle(position, color, text) {
    const particle = this.particlePool.get();
    particle.init({
      position: position.clone(),
      velocity: new Vector3(0, -1, 0), // 缓慢上升
      color: color,
      size: 20,
      text: text,
      decay: 0.01 // 文字持续时间更长
    });
    this.particles.push(particle);
  }

  // 添加随机颜色生成方法
  getRandomColor() {
    const hue = Math.random() * 360;
    const rgb = this.hslToRgb(hue / 360, 0.8, 0.5);
    return [...rgb, 1];
  }

  // 添加性能监控方法
  monitorPerformance() {
    const now = Date.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    const fps = 1000 / frameTime;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    // 计算平均帧率
    const avgFps = this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length;

    // 根据性能自动调整
    if (avgFps < 30 && this.performanceMode !== 'low') {
      this.performanceMode = 'low';
      this.adjustPerformance();
    } else if (avgFps < 45 && this.performanceMode === 'high') {
      this.performanceMode = 'medium';
      this.adjustPerformance();
    }
  }

  // 添加性能调整方法
  adjustPerformance() {
    switch (this.performanceMode) {
      case 'low':
        this.particlePool = new ObjectPool(Particle, 500);
        break;
      case 'medium':
        this.particlePool = new ObjectPool(Particle, 750);
        break;
      case 'high':
        this.particlePool = new ObjectPool(Particle, 1000);
        break;
    }
  }

  // 添加错误恢复方法
  async recover() {
    try {
      // 清理所有资源
      this.dispose();
      
      // 重新初始化画布
      if (this.canvas) {
        await this.initRenderer(this.canvas);
      }
      
      // 重置状态
      this.particles = [];
      this.camera = {
        position: new Vector3(0, 0, 100),
        target: new Vector3(0, 0, 0)
      };
      
      return true;
    } catch (error) {
      console.error('Failed to recover:', error);
      return false;
    }
  }

  // handleFuseBurnout方法
  handleFuseBurnout(x, y) {
    // 设置安全边距
    const padding = 50;
    
    // 保持原始x坐标，只进行边界检查
    let startX = Math.min(Math.max(x, padding), this.displayWidth - padding);
    
    // 添加小范围随机偏移（±20像素）使发射位置更自然
    startX += (Math.random() - 0.5) * 40;
    
    // 确保偏移后仍在安全范围内
    startX = Math.min(Math.max(startX, padding), this.displayWidth - padding);
    
    const startY = this.displayHeight - padding;

    const rocket = new Particle(startX, startY, true);
    rocket.color = [0, 1, 0, 1];
    
    // 优化物理参数
    const time = 3.5 + Math.random(); // 3.5-4.5秒随机时间
    const gravity = 2.3 + Math.random() * 0.4; // 2.3-2.7的随机重力
    
    // 随机上升高度（屏幕高度的65%-85%）
    const heightPercent = 0.65 + Math.random() * 0.2;
    const riseDistance = this.displayHeight * heightPercent;
    
    // 计算初速度
    const v0 = (riseDistance + (0.5 * gravity * time * time)) / time;
    
    // 水平速度根据发射位置动态调整
    // 靠近边缘时增加向中心的偏移趋势
    const centerX = this.displayWidth / 2;
    const distanceFromCenter = (startX - centerX) / centerX; // -1到1之间
    const horizontalSpeed = (Math.random() - 0.5 - distanceFromCenter * 0.3) * 3;
    
    rocket.velocity = new Vector3(
      horizontalSpeed,
      -v0,  // 向上为负
      0
    );
    rocket.acceleration = new Vector3(0, gravity, 0);
    
    // 设置目标参数
    rocket.displayHeight = this.displayHeight;
    rocket.targetHeight = startY - riseDistance;
    rocket.startY = startY;
    
    this.rockets.push(rocket);
    
    if (this.audioManager) {
      try {
        this.audioManager.playLaunchSound()
          .catch(error => {
            console.warn('Failed to play launch sound:', error);
          });
      } catch (error) {
        console.warn('Audio playback error:', error);
      }
    }
  }

  // 修改爆炸方法，确保使用正确的坐标系统
  explode(x, y) {

    const particleCount = 80;
    const baseHue = Math.random() * 360;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      const hue = (baseHue + Math.random() * 30) % 360;
      
      // HSL转RGB
      const rgb = this.hslToRgb(hue / 360, 0.8, 0.5);
      
      const particle = new Particle(x, y, false);
      particle.velocity = new Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0
      );
      particle.color = [...rgb, 1];
      
      this.particles.push(particle);
    }
  }

  // 从对象池获取轨迹点
  getTrailPoint() {
    return this.trailPool.pop() || {
      x: 0,
      y: 0,
      alpha: 1,
      size: 1,
      timestamp: 0
    };
  }

  // 回收轨迹点到对象池
  recycleTrailPoint(point) {
    if (this.trailPool.length < 1000) {
      this.trailPool.push(point);
    }
  }

  // 性能监控和优化
  adjustTrailQuality() {
    const fps = this.getAverageFPS();
    if (fps < 30) {
      // 降低轨迹质量
      [...this.rockets, ...this.particles].forEach(p => {
        p.maxTrailLength = Math.max(5, p.maxTrailLength - 2);
        p.trailUpdateInterval = Math.min(32, p.trailUpdateInterval + 8);
      });
    }
  }

  // 在FireworkSystem类中添加renderParticle方法
  renderParticle(particle) {
    this.ctx.save();
    
    // 渲染拖尾
    if (particle.trail && particle.trail.length > 1) {
      const baseAlpha = particle.alpha * 0.6;
      
      particle.trail.forEach((point, i) => {
        const progress = i / particle.trail.length;
        const size = particle.size * (1 - progress * 0.5);
        const alpha = baseAlpha * (1 - progress);
        
        // 绘制主发光点
        this.ctx.beginPath();
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        this.ctx.arc(point.x, point.y, size * 0.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制外发光
        this.ctx.beginPath();
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
        this.ctx.arc(point.x, point.y, size * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }
    
    // 渲染粒子本体
    const [r, g, b] = particle.color || [1, 1, 1];
    
    // 绘制外发光
    const gradient = this.ctx.createRadialGradient(
      particle.position.x, particle.position.y, 0,
      particle.position.x, particle.position.y, particle.size * 2
    );
    
    gradient.addColorStop(0, `rgba(${r*255}, ${g*255}, ${b*255}, ${particle.alpha})`);
    gradient.addColorStop(0.4, `rgba(${r*255}, ${g*255}, ${b*255}, ${particle.alpha * 0.3})`);
    gradient.addColorStop(1, `rgba(${r*255}, ${g*255}, ${b*255}, 0)`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(
      particle.position.x,
      particle.position.y,
      particle.size * 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    
    // 绘制核心
    this.ctx.beginPath();
    this.ctx.fillStyle = `rgba(${r*255}, ${g*255}, ${b*255}, ${particle.alpha})`;
    this.ctx.arc(
      particle.position.x,
      particle.position.y,
      particle.size,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    
    this.ctx.restore();
  }
} 
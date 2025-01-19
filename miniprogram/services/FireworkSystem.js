import { Vector3 } from '../utils/math';
import Particle from './Particle';
import { ObjectPool } from '../utils/ObjectPool';

export default class FireworkSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.rockets = [];
    this.particlePool = new ObjectPool(Particle, 1000);
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
    
    // 修改全局引用方式
    const app = getApp();
    app.fireworkSystem = this;
  }

  // 修改初始化渲染器方法
  async initRenderer(canvas) {
    if (!canvas) {
      console.error('Canvas is undefined');
      return;
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    if (!this.ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    // 获取设备信息和DPR
    const info = wx.getSystemInfoSync();
    this.dpr = info.pixelRatio;
    
    // 保存实际显示尺寸（逻辑像素）
    this.displayWidth = info.windowWidth;
    this.displayHeight = info.windowHeight;
    
    // 设置画布的物理像素大小
    canvas.width = this.displayWidth * this.dpr;
    canvas.height = this.displayHeight * this.dpr;
    
    // 缩放上下文以匹配DPR
    this.ctx.scale(this.dpr, this.dpr);
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

  // 创建爆炸粒子
  createExplosionParticles(position, color, text) {
    // 如果是文字粒子，创建文字效果
    if (text) {
      this.createTextParticle(position, color, text);
      return;
    }

    // 播放爆炸音效
    if (this.audioManager) {
      this.audioManager.playExplodeSound();
      // 随机播放呼啸音效
      if (Math.random() < 0.3) {
        this.audioManager.playWhistleSound();
      }
    }

    const particleCount = 50 + Math.floor(Math.random() * 50);
    const baseHue = Math.random() * 360;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      const hue = (baseHue + Math.random() * 30) % 360;
      
      // HSL转RGB
      const rgb = this.hslToRgb(hue / 360, 0.8, 0.5);
      
      const particle = this.particlePool.get();
      particle.init({
        position: position.clone(),
        velocity: new Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0
        ),
        color: color || [...rgb, 1],
        size: 2 + Math.random() * 2,
        decay: 0.015 + Math.random() * 0.01
      });
      this.particles.push(particle);
    }
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
    if (!this.ctx || !this.canvas) {
      console.error('[Firework Error] Canvas context not initialized');
      return;
    }

    // 清除画布（使用逻辑像素尺寸）
    this.ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);
    
    // 设置合成模式
    this.ctx.globalCompositeOperation = 'lighter';

    // 渲染所有粒子
    [...this.rockets, ...this.particles].forEach(particle => {
      this.ctx.save();
      
      // 使用粒子的实际颜色
      const [r, g, b, a] = particle.color;
      this.ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${particle.alpha})`;
      
      // 画粒子主体
      this.ctx.beginPath();
      this.ctx.arc(
        particle.position.x,
        particle.position.y,
        particle.size,
        0,
        Math.PI * 2
      );
      
      // 添加发光效果
      this.ctx.shadowBlur = particle.size * 2;
      this.ctx.shadowColor = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${particle.alpha})`;
      
      this.ctx.fill();
      this.ctx.restore();
    });

    this.monitorPerformance();
  }

  // 设置相机跟随
  setCameraFollowing(following) {
    this.cameraFollowing = following;
  }

  // 清理资源
  dispose() {
    this.particlePool.releaseAll();
    this.particles = [];
    // 清理全局引用
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
    
    // 调试日志
    console.log('[Firework Debug] Launch position:', {
      canvasWidth: this.displayWidth,
      canvasHeight: this.displayHeight,
      originalX: x,
      startX,
      startY,
      randomOffset: startX - x
    });

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
} 
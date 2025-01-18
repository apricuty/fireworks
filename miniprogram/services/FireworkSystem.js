import { Vector3 } from '../utils/math';
import { Particle } from './Particle';
import { ObjectPool } from '../utils/ObjectPool';

export default class FireworkSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
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

    // 获取设备信息
    const info = wx.getSystemInfoSync();
    this.dpr = info.pixelRatio;
    
    // 保存实际显示尺寸
    this.displayWidth = info.windowWidth;
    this.displayHeight = info.windowHeight;
    
    // 设置画布的物理像素大小
    try {
      // 使用微信小程序的方式设置canvas尺寸
      const query = wx.createSelectorQuery();
      query.select('#fireworkCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res[0]) {
            const canvas = res[0].node;
            canvas.width = this.displayWidth * this.dpr;
            canvas.height = this.displayHeight * this.dpr;
            
            // 初始缩放以匹配DPR
            this.ctx.scale(this.dpr, this.dpr);
          }
        });
    } catch (error) {
      console.error('Failed to set canvas size:', error);
    }
  }

  // 发射烟花
  launchFirework(options = {}) {
    const firework = this.particlePool.get();
    const startX = options.x || this.displayWidth / 2;
    const startY = options.y || this.displayHeight;
    const targetX = options.targetX || startX;
    const targetY = options.targetY || startY - 300;
    
    // 计算发射速度
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const speed = 15 + Math.random() * 5;
    
    // 播放发射音效
    if (this.audioManager) {
      this.audioManager.playLaunchSound();
      setTimeout(() => {
        this.audioManager.playWhistleSound();
      }, 200);
    }

    firework.init({
      position: new Vector3(startX, startY, 0),
      velocity: new Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0
      ),
      color: options.color || [1, 1, 1, 1],
      size: options.size || 4,
      text: options.text || null
    });
    this.particles.push(firework);
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
    const dt = 1/60; // 假设60fps
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(dt);

      // 检查是否需要爆炸
      if (particle.phase === 'launch') {
        // 普通烟花到达最高点爆炸
        if (!particle.text && particle.velocity.y >= 0) {
          this.createExplosionParticles(particle.position, particle.color);
          this.particlePool.release(particle);
          this.particles.splice(i, 1);
          continue;
        }
        // 文字烟花到达目标位置爆炸
        else if (particle.text && particle.velocity.length() < 1) {
          this.createExplosionParticles(particle.position, particle.color, particle.text);
          this.particlePool.release(particle);
          this.particles.splice(i, 1);
          continue;
        }
      }

      if (particle.isDead()) {
        this.particlePool.release(particle);
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
      console.error('Canvas context not initialized');
      this.recover().then(success => {
        if (!success) {
          wx.showToast({
            title: '渲染错误',
            icon: 'none'
          });
        }
      });
      return;
    }

    // 只在有粒子时才进行渲染
    if (this.particles.length > 0) {
      // 保存当前上下文状态
      this.ctx.save();

      // 清除画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // 设置合成模式为叠加
      this.ctx.globalCompositeOperation = 'lighter';

      // 绘制粒子和文字
      this.particles.forEach(particle => {
        // 绘制拖尾
        if (particle.trail.length > 1) {
          this.ctx.beginPath();
          this.ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
          
          for (let i = 1; i < particle.trail.length; i++) {
            this.ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
          }
          
          this.ctx.strokeStyle = `rgba(${particle.color[0] * 255}, ${
            particle.color[1] * 255
          }, ${particle.color[2] * 255}, ${particle.color[3] * 0.5})`;
          this.ctx.lineWidth = particle.size * 0.5;
          this.ctx.stroke();
        }

        if (particle.text) {
          // 渲染文字
          this.ctx.font = `${particle.size}px Arial`;
          this.ctx.fillStyle = `rgba(${particle.color[0] * 255}, ${
            particle.color[1] * 255
          }, ${particle.color[2] * 255}, ${particle.color[3]})`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(particle.text, particle.position.x, particle.position.y);
        } else {
          // 渲染普通粒子
          this.ctx.beginPath();
          this.ctx.arc(
            particle.position.x,
            particle.position.y,
            particle.size,
            0,
            Math.PI * 2
          );
          this.ctx.fillStyle = `rgba(${particle.color[0] * 255}, ${
            particle.color[1] * 255
          }, ${particle.color[2] * 255}, ${particle.color[3]})`;
          this.ctx.fill();
        }
      });

      // 恢复上下文状态
      this.ctx.restore();
    }

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
} 
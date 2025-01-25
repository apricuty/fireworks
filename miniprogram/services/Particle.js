import { Vector3 } from '../utils/math';

export class Particle {
  constructor(x, y, isRocket = false) {
    // 位置属性
    this.position = new Vector3(x, y, 0);
    
    // 速度属性
    this.velocity = new Vector3(
      isRocket ? (Math.random() * 2 - 1) : (Math.random() * 8 - 4),
      isRocket ? -25 : (Math.random() * 8 - 4),
      0
    );
    
    // 重力加速度
    this.acceleration = new Vector3(0, isRocket ? 1.5 : 0.8, 0);
    
    // 粒子属性
    this.size = isRocket ? 3 : 1.5;
    this.alpha = 1;
    this.color = [1, 1, 1, 1];
    
    // 生命周期
    this.life = 1.0;
    this.decay = isRocket ? 0.0005 : 0.015;
    this.isRocket = isRocket;
    
    // 轨迹相关
    this.trail = [];
    this.maxTrailLength = isRocket ? 12 : 8;
    this.trailUpdateInterval = isRocket ? 16 : 24;
    this.lastTrailUpdate = 0;
    
    // 扰动参数
    this.turbulence = {
      x: 0,
      y: 0,
      strength: isRocket ? 0.2 : 0.1
    };
    
    // 重置其他必要的属性
    this.phase = 'launch';
    this.lastLogTime = Date.now();
    this.launchTime = Date.now();
    this.explodeTime = null;
    
    this.trail = [];
    this.maxTrailLength = isRocket ? 12 : 8;
    this.trailUpdateInterval = isRocket ? 16 : 24;
    this.lastTrailUpdate = 0;
    
    this.tailParticles = [];
    this.tailLength = 5;
    this.isFlash = false;
  }

  update(dt = 1/60) {
    try {
      // 保存旧位置用于调试
      const oldPosition = {
        x: this.position.x,
        y: this.position.y
      };

      // 计算新的速度和位置
      if (!this.isFlash) {  // 闪光不需要更新位置
        // 使用新向量进行计算
        const newVelocity = this.velocity.add(this.acceleration.multiply(dt));
        const newPosition = this.position.add(newVelocity.multiply(dt));
        
        // 更新状态
        this.velocity = newVelocity;
        this.position = newPosition;
      }

      // 火箭粒子的爆炸判定
      if (this.isRocket) {
        // 当火箭开始下落或达到目标高度时爆炸
        const heightReached = this.startY - this.position.y;
        const targetHeight = this.displayHeight * 0.6; // 设置目标高度为屏幕高度的60%

        if (this.velocity.y >= 0 || heightReached >= targetHeight) {
          // 获取FireworkSystem实例
          const app = getApp();
          const fireworkSystem = app.fireworkSystem;
          
          if (fireworkSystem) {
            // 调用新的爆炸效果
            fireworkSystem.createExplosionParticles(this.position.clone());
            // 播放爆炸音效
            if (fireworkSystem.audioManager) {
              fireworkSystem.audioManager.playExplodeSound();
            }
            return false; // 标记火箭消失
          }
        }
      }

      // 闪光效果的特殊处理
      if (this.isFlash) {
        // 直接衰减生命值，不受dt影响
        this.life = Math.max(0, this.life - this.decay);
        this.alpha = this.life;
        
        return this.life > 0;
      }

      // 以下是非闪光粒子的正常更新逻辑
      const speed = Math.sqrt(
        this.velocity.x * this.velocity.x + 
        this.velocity.y * this.velocity.y
      );
      
      // 只对非火箭粒子应用速度衰减
      if (!this.isRocket) {
        const speedDecay = Math.max(0.98, 1 - (speed * 0.001));
        this.velocity = new Vector3(
          this.velocity.x * speedDecay,
          this.velocity.y * speedDecay,
          0
        );
      }
      
      // 更新普通粒子的生命值
      this.life -= this.decay * dt;
      this.alpha = this.life;
      
      // 每500ms输出一次日志
      const now = Date.now();
      if (now - this.lastLogTime >= 500) {
        const currentHeight = this.startY - this.position.y;
        const heightPercent = (currentHeight / this.displayHeight) * 100;
        const timeSinceLaunch = (now - this.launchTime) / 1000;
        
        this.lastLogTime = now;
      }
      
      // 更新扰动（添加错误检查）
      if (this.turbulence) {
        this.turbulence.x += (Math.random() - 0.5) * this.turbulence.strength;
        this.turbulence.y += (Math.random() - 0.5) * this.turbulence.strength;
        this.turbulence.x *= 0.95;
        this.turbulence.y *= 0.95;
      }
      
      // 更新轨迹点（添加错误检查）
      if (this.trail && now - this.lastTrailUpdate >= this.trailUpdateInterval) {
        if (speed > 1) {
          this.trail.unshift({
            x: this.position.x + (this.turbulence ? this.turbulence.x : 0),
            y: this.position.y + (this.turbulence ? this.turbulence.y : 0),
            alpha: this.alpha,
            size: this.size
          });
          
          if (this.trail.length > this.maxTrailLength) {
            this.trail.length = this.maxTrailLength;
          }
        }
        
        this.lastTrailUpdate = now;
      }
      
      // 更新现有轨迹点
      if (this.trail) {
        for (let i = 0; i < this.trail.length; i++) {
          const point = this.trail[i];
          if (point) {
            point.alpha *= 0.92;
            point.size *= 0.98;
          }
        }
      }
      
      // 创建尾部粒子
      const tail = {
        x: this.position.x,
        y: this.position.y,
        alpha: this.alpha * 0.8,
        size: this.size * 0.9
      };
      
      this.tailParticles.unshift(tail);
      
      // 更新尾部粒子
      this.tailParticles.forEach((p, i) => {
        p.alpha *= 0.9;
      });
      
      // 移除消失的尾部粒子
      this.tailParticles = this.tailParticles.filter(p => p.alpha > 0.01);
      
      return !this.isDead();
    } catch (error) {
      console.error('[Particle] Update error:', error);
      return false;
    }
  }

  isDead() {
    return this.life <= 0;
  }

  reset() {
    this.position = new Vector3(0, 0, 0);
    this.velocity = new Vector3(0, 0, 0);
    this.life = 1.0;
    this.alpha = 1;
    this.phase = 'launch';
    this.trail = [];
    this.lastTrailUpdate = 0;
  }

  init(config) {
    if (config.position) this.position = config.position.clone();
    if (config.velocity) this.velocity = config.velocity.clone();
    if (config.color) this.color = config.color;
    if (config.size) this.size = config.size;
    if (config.decay) this.decay = config.decay;
    // 重要：设置 isFlash 标记
    this.isFlash = config.isFlash || false;
    
    this.life = 1.0;
    this.alpha = 1;
    this.phase = 'launch';
    this.trail = [];
    this.lastTrailUpdate = Date.now();
    
    return this;
  }
}

export default Particle; 
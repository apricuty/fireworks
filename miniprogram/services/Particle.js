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
    this.life = 1;
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
  }

  update(dt = 1/60) {
    try {
      // 保存旧位置用于调试
      const oldPosition = {
        x: this.position.x,
        y: this.position.y
      };

      // 计算新的速度
      const newVelocity = this.velocity.add(this.acceleration.multiply(dt));
      this.velocity = newVelocity;

      // 计算新的位置
      const newPosition = this.position.add(this.velocity.multiply(dt));
      this.position = newPosition;

      // 每500ms输出一次日志
      const now = Date.now();
      if (now - this.lastLogTime >= 500) {
        const currentHeight = this.startY - this.position.y;
        const heightPercent = (currentHeight / this.displayHeight) * 100;
        const timeSinceLaunch = (now - this.launchTime) / 1000;
        
        this.lastLogTime = now;
      }
      
      // 计算速度相关的衰减
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
      
      // 更新生命值
      this.life -= this.decay;
      
      // 更新透明度
      this.alpha = this.life;
      
      // 火箭粒子达到目标高度时爆炸
      if (this.isRocket) {
          const currentHeight = this.startY - this.position.y;
          const heightPercent = (currentHeight / this.displayHeight) * 100;
          
          // 检查是否达到目标高度或开始下落
          if (this.position.y <= this.targetHeight || this.velocity.y >= 0) {
              this.explodeTime = Date.now();
              const flightTime = (this.explodeTime - this.launchTime) / 1000;
              
              this.phase = 'explode';
              
              const app = getApp();
              if (app.fireworkSystem && app.fireworkSystem.audioManager) {
                  app.fireworkSystem.audioManager.playExplodeSound();
              }
          }
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
    this.life = 1.0;
    this.alpha = 1;
    this.phase = 'launch';
    this.trail = [];
    this.lastTrailUpdate = Date.now();
    return this;
  }
}

export default Particle; 
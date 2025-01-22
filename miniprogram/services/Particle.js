import { Vector3 } from '../utils/math';

export class Particle {
  constructor(x, y, isRocket = false) {
    // 位置属性
    this.position = new Vector3(x, y, 0);
    
    // 速度属性 - 恢复原来的速度值
    this.velocity = new Vector3(
      isRocket ? (Math.random() * 2 - 1) : (Math.random() * 8 - 4),
      isRocket ? -25 : (Math.random() * 8 - 4),  // 恢复为-25的初始速度
      0
    );
    
    // 重力加速度 - 恢复原来的加速度
    this.acceleration = new Vector3(0, isRocket ? 1.5 : 0.8, 0);  // 火箭重力恢复为1.5
    
    // 粒子属性
    this.size = isRocket ? 3 : 1.5;
    this.alpha = 1;
    this.color = [1, 1, 1, 1];
    
    // 生命周期
    this.life = 1;
    this.decay = isRocket ? 0.0005 : 0.015;
    this.isRocket = isRocket;
    
    // 阶段
    this.phase = 'launch';
    
    // 用于控制日志输出频率
    this.lastLogTime = 0;
    
    // 添加发射时间记录
    this.launchTime = Date.now();
    this.explodeTime = null;
    
    this.trail = [];
    this.maxTrailLength = isRocket ? 15 : 8;
    this.trailUpdateInterval = isRocket ? 16 : 24;
    this.lastTrailUpdate = 0;
    
    this.tailParticles = [];
    this.tailLength = 5;
  }

  update(dt = 1/60) {
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
    
    // 更新轨迹
    if (now - this.lastTrailUpdate >= this.trailUpdateInterval) {
      // 添加新的轨迹点
      this.trail.unshift({
        x: this.position.x,
        y: this.position.y,
        alpha: this.alpha,
        size: this.size,
        timestamp: now
      });
      
      // 限制轨迹长度
      while (this.trail.length > this.maxTrailLength) {
        this.trail.pop();
      }
      
      this.lastTrailUpdate = now;
    }
    
    // 更新现有轨迹点的透明度
    this.trail.forEach(point => {
      point.alpha *= 0.95;
    });
    
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
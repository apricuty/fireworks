import { Vector3 } from '../utils/math';

export class Particle {
  constructor(x, y, isRocket = false) {
    // 位置属性
    this.position = new Vector3(x, y, 0);
    
    // 速度属性 - 向上为负方向，增加初始速度
    this.velocity = new Vector3(
      isRocket ? (Math.random() * 2 - 1) : (Math.random() * 6 - 3), // 添加一点水平随机速度
      isRocket ? -25 : (Math.random() * 6 - 3), // 增加上升速度
      0
    );
    
    // 重力加速度 - 向下为正方向
    this.acceleration = new Vector3(0, 1.5, 0); // 增加重力效果
    
    // 粒子属性
    this.size = isRocket ? 5 : 2; // 增大火箭尺寸
    this.alpha = 1;
    this.color = [1, 1, 1, 1];
    
    // 生命周期 - 大幅延长火箭寿命
    this.life = 1;
    this.decay = isRocket ? 0.0005 : 0.02; // 显著减小火箭衰减速度
    this.isRocket = isRocket;
    
    // 阶段
    this.phase = 'launch';
    
    // 用于控制日志输出频率
    this.lastLogTime = 0;
    
    // 添加发射时间记录
    this.launchTime = Date.now();
    this.explodeTime = null;
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
    
    return !this.isDead();
  }

  isDead() {
    return this.life <= 0;
  }

  reset() {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.life = 1.0;
    this.alpha = 1;
    this.phase = 'launch';
  }

  init(config) {
    if (config.position) this.position = config.position.clone();
    if (config.velocity) this.velocity = config.velocity.clone();
    if (config.color) this.color = config.color;
    if (config.size) this.size = config.size;
    this.life = 1.0;
    this.alpha = 1;
    this.phase = 'launch';
    return this;
  }
}

export default Particle; 
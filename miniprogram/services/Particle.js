import { Vector3 } from '../utils/math';

export class Particle {
  constructor() {
    this.position = new Vector3();
    this.velocity = new Vector3();
    this.acceleration = new Vector3(0, -9.8, 0); // 重力加速度
    this.color = [1, 1, 1, 1];
    this.life = 1.0;
    this.decay = 0.02;
    this.size = 2.0;
    this.phase = 'launch'; // launch, explode, fade
    this.trail = []; // 添加拖尾数组
    this.maxTrailLength = 5; // 最大拖尾长度
    this.text = null;
  }

  init(config) {
    this.position = config.position.clone();
    this.velocity = config.velocity.clone();
    this.color = config.color || [1, 1, 1, 1];
    this.life = 1.0;
    this.phase = 'launch';
    this.size = config.size || 2.0;
    this.decay = config.decay || 0.02;
    this.text = config.text || null;
    return this;
  }

  update(dt) {
    // 更新拖尾
    this.trail.unshift(this.position.clone());
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }

    // 更新位置和速度
    this.velocity.add(this.acceleration.clone().multiply(dt));
    this.position.add(this.velocity.clone().multiply(dt));

    // 更新生命值
    this.life -= this.decay;

    // 阶段转换
    if (this.phase === 'launch') {
      // 如果是普通烟花，到达最高点爆炸
      if (!this.text && this.velocity.y >= 0) {
        this.explode();
      }
      // 如果是文字烟花，速度接近0时爆炸
      else if (this.text && this.velocity.length() < 1) {
        this.explode();
      }
    }

    return this;
  }

  explode() {
    this.phase = 'explode';
    // 创建爆炸粒子的逻辑在FireworkSystem中处理
  }

  isDead() {
    return this.life <= 0;
  }

  reset() {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.life = 1.0;
    this.phase = 'launch';
    this.text = null;
  }
} 
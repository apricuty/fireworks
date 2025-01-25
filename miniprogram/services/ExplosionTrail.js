import { Vector3 } from '../utils/math';

export class ExplosionTrail {
  constructor(options) {
    this.position = options.position;
    this.velocity = options.velocity;
    this.baseHue = options.baseHue;
    this.layer = options.layer;
    this.hslToRgb = options.hslToRgb;  // 接收颜色转换方法
    
    // 轨迹属性
    this.particles = [];
    this.maxParticles = 6; // 减少轨迹长度
    this.life = 1;
    this.decay = 0.025; // 加快生命值衰减 (原0.01)
    
    // 物理参数
    this.gravity = new Vector3(0, 98, 0); // 增加重力影响
    this.airResistance = 0.88; // 增加空气阻力 (原0.90)
    this.minSpeed = 55; // 提高最小速度阈值 (原45)
    
    // 渲染参数
    this.startWidth = 2; // 减小起始线宽
    this.endWidth = 0.3; // 减小结束线宽
    this.glowSize = 8; // 减小发光范围
    this.glowAlpha = 0.3; // 减小发光强度
    
    // 颜色渐变
    this.baseColor = this.generateColor();
    this.endColor = [1, 1, 1, 1];
    
    // 记录初始状态
    const speed = Math.sqrt(
      this.velocity.x * this.velocity.x + 
      this.velocity.y * this.velocity.y
    );
  }
  
  generateColor() {
    const hue = (this.baseHue + Math.random() * 30) % 360;
    return this.hslToRgb(hue / 360, 0.8, 0.5);  // 使用传入的转换方法
  }
  
  update(dt) {
    const oldPosition = {
      x: this.position.x,
      y: this.position.y
    };
    
    // 计算当前速度大小
    const currentSpeed = Math.sqrt(
      this.velocity.x * this.velocity.x + 
      this.velocity.y * this.velocity.y
    );
    
    // 应用空气阻力（速度越大，阻力越大）
    const airResistanceFactor = Math.pow(this.airResistance, currentSpeed / 500);
    this.velocity = this.velocity.multiply(airResistanceFactor);
    
    // 应用重力
    const gravityEffect = this.gravity.multiply(dt);
    this.velocity = this.velocity.add(gravityEffect);
    
    // 如果速度小于阈值，显著增加阻力
    if (currentSpeed < this.minSpeed) {
      this.velocity = this.velocity.multiply(0.95);
    }
    
    // 更新位置
    const velocityDt = this.velocity.multiply(dt);
    this.position = this.position.add(velocityDt);
    
    // 添加新的粒子
    this.particles.unshift({
      position: this.position.clone(),
      size: 1.5 * this.life,
      alpha: this.life,
      color: this.interpolateColor(this.baseColor, this.endColor, 1 - this.life)
    });
    
    if (this.particles.length > this.maxParticles) {
      this.particles.pop();
    }
    
    // 更新现有粒子
    this.particles.forEach((particle, i) => {
      particle.alpha *= 0.89; // 加快透明度衰减 (原0.92)
      particle.size *= 0.91; // 加快大小衰减 (原0.94)
    });
    
    // 更新生命值
    this.life -= this.decay;
    
    return this.life > 0;
  }
  
  render(ctx) {
    ctx.save();
    
    // 渲染光束效果
    this.particles.forEach((particle, i) => {
      const nextParticle = this.particles[i + 1];
      if (!nextParticle) return;
      
      const progress = i / this.particles.length;
      const color = particle.color;
      
      // 光束核心
      const coreWidth = this.startWidth * (1 - progress) + this.endWidth * progress;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${color[0]*255},${color[1]*255},${color[2]*255},${particle.alpha})`;
      ctx.lineWidth = coreWidth;
      ctx.lineCap = 'round';
      ctx.moveTo(particle.position.x, particle.position.y);
      ctx.lineTo(nextParticle.position.x, nextParticle.position.y);
      ctx.stroke();
      
      // 仅保留一层光晕，简化效果
      const glowWidth = coreWidth * 2;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${color[0]*255},${color[1]*255},${color[2]*255},${particle.alpha * 0.3})`;
      ctx.lineWidth = glowWidth;
      ctx.lineCap = 'round';
      ctx.moveTo(particle.position.x, particle.position.y);
      ctx.lineTo(nextParticle.position.x, nextParticle.position.y);
      ctx.stroke();
    });
    
    ctx.restore();
  }
  
  interpolateColor(color1, color2, factor) {
    return color1.map((c, i) => c + (color2[i] - c) * factor);
  }
} 
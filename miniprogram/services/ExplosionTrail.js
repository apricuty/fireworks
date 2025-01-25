export class ExplosionTrail {
  constructor(options) {
    this.position = options.position;
    this.velocity = options.velocity;
    this.baseHue = options.baseHue;
    this.layer = options.layer;
    this.hslToRgb = options.hslToRgb;  // 接收颜色转换方法
    
    // 轨迹属性
    this.particles = [];
    this.maxParticles = 10;  // 减少粒子数量以提高性能
    this.life = 1;
    this.decay = 0.012;  // 稍微降低衰减以保持更长的可见时间
    
    // 颜色渐变
    this.baseColor = this.generateColor();
    this.endColor = [1, 1, 1, 1];
    
    // 记录初始状态用于调试
    const speed = Math.sqrt(
      this.velocity.x * this.velocity.x + 
      this.velocity.y * this.velocity.y
    );
    
    console.log('[Trail Debug] New trail:', {
      layer: this.layer,
      speed: speed.toFixed(2),
      angle: (Math.atan2(this.velocity.y, this.velocity.x) * 180 / Math.PI).toFixed(2),
      position: {
        x: this.position.x.toFixed(2),
        y: this.position.y.toFixed(2)
      }
    });
  }
  
  generateColor() {
    const hue = (this.baseHue + Math.random() * 30) % 360;
    return this.hslToRgb(hue / 360, 0.8, 0.5);  // 使用传入的转换方法
  }
  
  update(dt) {
    // 更新位置
    this.position.add(this.velocity.multiply(dt));
    
    // 添加新的粒子
    this.particles.unshift({
      position: this.position.clone(),
      size: 2 * this.life,  // 减小粒子大小
      alpha: this.life,
      color: this.interpolateColor(this.baseColor, this.endColor, 1 - this.life)
    });
    
    // 限制粒子数量
    if (this.particles.length > this.maxParticles) {
      this.particles.pop();
    }
    
    // 更新现有粒子
    this.particles.forEach((particle, i) => {
      particle.alpha *= 0.88;  // 加快透明度衰减
      particle.size *= 0.92;   // 加快大小衰减
    });
    
    // 更新生命值
    this.life -= this.decay;
    this.velocity.multiply(0.98); // 减缓减速效果以保持扩散范围
    
    return this.life > 0;
  }
  
  render(ctx) {
    ctx.save();
    
    // 渲染轨迹粒子
    this.particles.forEach((particle, i) => {
      const progress = i / this.particles.length;
      
      // 创建径向渐变
      const gradient = ctx.createRadialGradient(
        particle.position.x, particle.position.y, 0,
        particle.position.x, particle.position.y, particle.size * 2
      );
      
      const color = particle.color;
      gradient.addColorStop(0, `rgba(${color[0]*255},${color[1]*255},${color[2]*255},${particle.alpha})`);
      gradient.addColorStop(1, `rgba(${color[0]*255},${color[1]*255},${color[2]*255},0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, particle.size * 2, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
  }
  
  interpolateColor(color1, color2, factor) {
    return color1.map((c, i) => c + (color2[i] - c) * factor);
  }
} 
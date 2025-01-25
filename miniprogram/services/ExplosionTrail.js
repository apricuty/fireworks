import { Vector3 } from '../utils/math';

export class ExplosionTrail {
  constructor(options) {
    this.position = options.position;
    this.velocity = options.velocity;
    this.baseHue = options.baseHue;
    this.layer = options.layer;
    this.hslToRgb = options.hslToRgb;  // 接收颜色转换方法
    
    // 基础属性初始化
    this.particles = [];
    this.life = 1;
    
    // 标记类型
    this.isSpark = options.isSpark || false;
    this.isInner = options.isInner;
    this.fixedColor = options.color;
    
    if (this.isSpark) {
      // 火花特有的参数
      this.maxParticles = 4;
      this.decay = 0.03;
      this.gravity = new Vector3(0, 120, 0);
      this.airResistance = 0.85;
      this.minSpeed = 30;
      
      // 火花渲染参数
      this.startWidth = 0.8;
      this.endWidth = 0.2;
      this.glowSize = 3;
      this.glowAlpha = 0.2;
      
      // 火花颜色
      this.baseColor = [1, 0.95, 0.8, 1];
      this.sparkGlow = true;
      
    } else {
      // 非火花粒子参数
      if (this.isInner) {
        this.maxParticles = options.maxParticles || 4;
        this.decay = options.decay || 0.03;
        this.startWidth = 2;
        this.endWidth = 0.3;
        this.glowSize = 8;
        this.glowAlpha = 0.4;
      } else {
        this.maxParticles = options.maxParticles || 5;
        this.decay = options.decay || 0.025;
        this.startWidth = 2.5;
        this.endWidth = 0.4;
        this.glowSize = 10;
        this.glowAlpha = 0.3;
      }
      
      // 生成颜色
      this.baseColor = this.generateColor();
      this.gravity = new Vector3(0, 98, 0);
      this.airResistance = 0.88;
      this.minSpeed = 55;
    }
  }
  
  generateColor() {
    if (this.isSpark) {
      // 火花颜色生成
      return [1, 0.95 + Math.random() * 0.05, 0.8 + Math.random() * 0.1, 1];
    }
    
    if (this.fixedColor) {
      // 固定颜色转换
      const color = [
        this.fixedColor[0] / 255,
        this.fixedColor[1] / 255,
        this.fixedColor[2] / 255,
        1
      ];
      return color;
    }
    
    // HSL颜色生成
    const hue = (this.baseHue + Math.random() * 30) % 360;
    const rgb = this.hslToRgb(hue / 360, 0.8, 0.5);
    return [...rgb, 1];
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
    const newParticle = {
      position: this.position.clone(),
      size: 1.5 * this.life,
      alpha: this.life,
      color: this.isSpark ? this.generateColor() : this.baseColor
    };
    
    this.particles.unshift(newParticle);
    
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
    
    this.particles.forEach((particle, i) => {
      const nextParticle = this.particles[i + 1];
      if (!nextParticle) return;
      
      const progress = i / this.particles.length;
      const color = particle.color;
      
      if (this.isSpark) {
        // 火花特有的渲染逻辑
        const width = this.startWidth * (1 - progress) + this.endWidth * progress;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${color[0]*255},${color[1]*255},${color[2]*255},${particle.alpha})`;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.moveTo(particle.position.x, particle.position.y);
        ctx.lineTo(nextParticle.position.x, nextParticle.position.y);
        ctx.stroke();
        
        // 火花的微弱光晕
        if (this.sparkGlow) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${color[0]*255},${color[1]*255},${color[2]*255},${particle.alpha * 0.3})`;
          ctx.lineWidth = width * 1.5;
          ctx.stroke();
        }
      } else {
        // 普通爆炸粒子的渲染逻辑
        const coreWidth = this.startWidth * (1 - progress) + this.endWidth * progress;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${color[0]*255},${color[1]*255},${color[2]*255},${particle.alpha})`;
        ctx.lineWidth = coreWidth;
        ctx.lineCap = 'round';
        ctx.moveTo(particle.position.x, particle.position.y);
        ctx.lineTo(nextParticle.position.x, nextParticle.position.y);
        ctx.stroke();
        
        // 光晕效果
        const glowWidth = this.isInner ? coreWidth * 2.5 : coreWidth * 2;
        const glowAlpha = this.isInner ? particle.alpha * 0.6 : particle.alpha * 0.3;
        
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${color[0]*255},${color[1]*255},${color[2]*255},${glowAlpha})`;
        ctx.lineWidth = glowWidth;
        ctx.lineCap = 'round';
        ctx.moveTo(particle.position.x, particle.position.y);
        ctx.lineTo(nextParticle.position.x, nextParticle.position.y);
        ctx.stroke();
      }
    });
    
    ctx.restore();
  }
  
  interpolateColor(color1, color2, factor) {
    return color1.map((c, i) => c + (color2[i] - c) * factor);
  }
} 
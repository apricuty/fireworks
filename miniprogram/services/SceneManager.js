export default class SceneManager {
  constructor() {
    this.isSnowing = false;
    this.snowParticles = [];
    this.canvas = null;
    this.ctx = null;
    this.needsRender = true;
    console.log('[Snow Debug] SceneManager constructed');
  }

  async initCanvas(canvas) {
    console.log('[Snow Debug] Initializing canvas:', canvas);
    if (!canvas) {
      console.error('[Snow Debug] Canvas is undefined');
      return;
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: true
    });
    
    if (!this.ctx) {
      console.error('[Snow Debug] Failed to get canvas context');
      return;
    }

    // 设置画布尺寸
    const info = wx.getSystemInfoSync();
    const dpr = info.pixelRatio;
    canvas.width = info.windowWidth * dpr;
    canvas.height = info.windowHeight * dpr;
    
    console.log('[Snow Debug] Canvas dimensions:', {
      width: canvas.width,
      height: canvas.height,
      dpr: dpr
    });
    
    this.ctx.scale(dpr, dpr);
  }

  toggleSnow(enabled) {
    console.log('[Snow Debug] Toggling snow effect:', {
      enabled: enabled,
      currentState: this.isSnowing,
      hasParticles: this.snowParticles.length > 0
    });

    this.isSnowing = enabled;
    
    if (enabled && this.snowParticles.length === 0) {
      this.initSnow();
    } else if (!enabled && this.ctx) {
      // 关闭效果时清除画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // 可选：清空粒子数组
      this.snowParticles = [];
    }
  }

  initSnow() {
    const numSnowflakes = 150;
    const canvasWidth = wx.getSystemInfoSync().windowWidth;
    const canvasHeight = wx.getSystemInfoSync().windowHeight;
    
    console.log('[Snow Debug] Initializing snow particles');

    this.snowParticles = [];
    for (let i = 0; i < numSnowflakes; i++) {
      const particle = {
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 1.5 + 0.5,
        wind: Math.random() * 0.3 - 0.15,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        opacity: Math.random() * 0.5 + 0.3,
        type: Math.floor(Math.random() * 3),
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02
      };
      this.snowParticles.push(particle);
    }
  }

  updateSnow(deltaTime) {
    if (!this.isSnowing || !this.snowParticles.length) return;

    const canvasWidth = wx.getSystemInfoSync().windowWidth;
    const canvasHeight = wx.getSystemInfoSync().windowHeight;

    this.snowParticles.forEach(snow => {
      snow.y += snow.speed * deltaTime * 60;
      
      snow.wobble += snow.wobbleSpeed;
      snow.x += Math.sin(snow.wobble) * 0.3 + snow.wind * deltaTime * 60;
      
      snow.rotation += snow.rotationSpeed * deltaTime * 60;

      if (snow.y > canvasHeight) {
        snow.y = -10;
        snow.x = Math.random() * canvasWidth;
        snow.opacity = Math.random() * 0.5 + 0.3;
      }
      if (snow.x > canvasWidth) {
        snow.x = 0;
      } else if (snow.x < 0) {
        snow.x = canvasWidth;
      }

      snow.wind += (Math.random() - 0.5) * 0.01;
      snow.wind = Math.max(-0.15, Math.min(0.15, snow.wind));
    });
  }

  drawSnowflake(ctx, x, y, size, rotation, type) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    switch(type) {
      case 0:
        this.drawSimpleSnowflake(ctx, size);
        break;
      case 1:
        this.drawBranchedSnowflake(ctx, size);
        break;
      case 2:
        this.drawStarSnowflake(ctx, size);
        break;
    }

    ctx.restore();
  }

  drawSimpleSnowflake(ctx, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  drawBranchedSnowflake(ctx, size) {
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const angle = (Math.PI * 2 / 6) * i;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
      
      const branchSize = size * 0.4;
      const branchAngle = Math.PI / 6;
      const midX = x * 0.5;
      const midY = y * 0.5;
      
      ctx.moveTo(midX, midY);
      ctx.lineTo(
        midX + Math.cos(angle + branchAngle) * branchSize,
        midY + Math.sin(angle + branchAngle) * branchSize
      );
      ctx.moveTo(midX, midY);
      ctx.lineTo(
        midX + Math.cos(angle - branchAngle) * branchSize,
        midY + Math.sin(angle - branchAngle) * branchSize
      );
      
      ctx.stroke();
    }
  }

  drawStarSnowflake(ctx, size) {
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      const radius = i % 2 === 0 ? size : size * 0.4;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  renderSnow() {
    if (!this.isSnowing || !this.snowParticles.length || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.snowParticles.forEach(snow => {
      this.ctx.save();
      this.ctx.shadowBlur = snow.size;
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fillStyle = `rgba(255, 255, 255, ${snow.opacity})`;
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${snow.opacity})`;
      this.ctx.lineWidth = snow.size * 0.1;
      
      this.drawSnowflake(
        this.ctx,
        snow.x,
        snow.y,
        snow.size,
        snow.rotation,
        snow.type
      );
      
      this.ctx.restore();
    });
  }

  update(deltaTime) {
    if (this.isSnowing) {
      this.updateSnow(deltaTime);
      this.renderSnow();
    }
  }

  dispose() {
    console.log('[Snow Debug] Disposing SceneManager');
    this.snowParticles = [];
    this.canvas = null;
    this.ctx = null;
  }
} 
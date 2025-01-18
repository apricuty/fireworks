export class ObjectPool {
  constructor(ClassType, initialSize = 1000) {
    this.ClassType = ClassType;
    this.activeObjects = new Set();
    this.pool = [];
    
    // 预创建对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(new ClassType());
    }
  }

  get() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = new this.ClassType();
    }
    this.activeObjects.add(obj);
    return obj;
  }

  release(obj) {
    if (this.activeObjects.has(obj)) {
      this.activeObjects.delete(obj);
      if (obj.reset) {
        obj.reset();
      }
      this.pool.push(obj);
    }
  }

  releaseAll() {
    this.activeObjects.forEach(obj => {
      if (obj.reset) {
        obj.reset();
      }
      this.pool.push(obj);
    });
    this.activeObjects.clear();
  }

  // 获取活跃对象数量
  getActiveCount() {
    return this.activeObjects.size;
  }

  // 获取池中可用对象数量
  getAvailableCount() {
    return this.pool.length;
  }

  // 扩展池大小
  expand(count) {
    for (let i = 0; i < count; i++) {
      this.pool.push(new this.ClassType());
    }
  }
} 
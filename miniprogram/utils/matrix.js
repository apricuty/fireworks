export class Matrix4 {
  constructor() {
    this.elements = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  // 设置为透视投影矩阵
  perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);

    this.elements[0] = f / aspect;
    this.elements[1] = 0;
    this.elements[2] = 0;
    this.elements[3] = 0;

    this.elements[4] = 0;
    this.elements[5] = f;
    this.elements[6] = 0;
    this.elements[7] = 0;

    this.elements[8] = 0;
    this.elements[9] = 0;
    this.elements[10] = (far + near) * nf;
    this.elements[11] = -1;

    this.elements[12] = 0;
    this.elements[13] = 0;
    this.elements[14] = 2 * far * near * nf;
    this.elements[15] = 0;

    return this;
  }

  // 设置为视图矩阵
  lookAt(eye, target, up) {
    const z = Vector3.normalize(Vector3.subtract(eye, target));
    const x = Vector3.normalize(Vector3.cross(up, z));
    const y = Vector3.cross(z, x);

    this.elements[0] = x.x;
    this.elements[1] = y.x;
    this.elements[2] = z.x;
    this.elements[3] = 0;

    this.elements[4] = x.y;
    this.elements[5] = y.y;
    this.elements[6] = z.y;
    this.elements[7] = 0;

    this.elements[8] = x.z;
    this.elements[9] = y.z;
    this.elements[10] = z.z;
    this.elements[11] = 0;

    this.elements[12] = -Vector3.dot(x, eye);
    this.elements[13] = -Vector3.dot(y, eye);
    this.elements[14] = -Vector3.dot(z, eye);
    this.elements[15] = 1;

    return this;
  }

  // 矩阵乘法
  multiply(b) {
    const a = this.elements;
    const out = new Float32Array(16);

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[i * 4 + k] * b[k * 4 + j];
        }
        out[i * 4 + j] = sum;
      }
    }

    this.elements = out;
    return this;
  }
} 
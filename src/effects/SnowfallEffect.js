import * as THREE from 'three';

export class SnowfallEffect {
  constructor(scene, camera, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.count = Math.max(20, Math.floor(options.count || 240));
    this.area = options.area || { width: 120, height: 64, depth: 120 };
    this.fallSpeed = options.fallSpeed || 3.8;
    this.wind = options.wind || 0.25;
    this.swayAmount = options.swayAmount || 0.35;
    this.swaySpeed = options.swaySpeed || 0.8;
    this.enabled = options.enabled !== false;
    this.onError = typeof options.onError === 'function' ? options.onError : null;
    this.elapsed = 0;
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count);
    this.phases = new Float32Array(this.count);

    for (let index = 0; index < this.count; index += 1) {
      this._resetFlake(index, Math.random() * this.area.height);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: options.flakeSize || 0.18,
      transparent: true,
      opacity: options.opacity || 0.72,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = 'Snowfall';
    this.points.frustumCulled = false;
    this.points.visible = this.enabled;
    this.scene.add(this.points);
  }

  update(deltaTime) {
    if (!this.enabled || !this.geometry?.attributes.position) {
      return;
    }
    const safeDelta = Math.max(0, deltaTime);
    this.elapsed += safeDelta;
    const width = this.area.width;
    const height = this.area.height;
    const depth = this.area.depth;
    const positions = this.geometry.attributes.position;
    for (let index = 0; index < this.count; index += 1) {
      this.velocities[index] = this.fallSpeed * (0.65 + (this.phases[index] % 0.35));
      let x = positions.getX(index) + this.wind * safeDelta + Math.sin(this.elapsed * this.swaySpeed + this.phases[index]) * this.swayAmount * safeDelta;
      let y = positions.getY(index) - this.velocities[index] * safeDelta;
      let z = positions.getZ(index) + Math.cos(this.elapsed * this.swaySpeed * 0.7 + this.phases[index]) * this.swayAmount * 0.35 * safeDelta;
      if (y < 0) {
        y = height;
        x = (Math.random() - 0.5) * width;
        z = (Math.random() - 0.5) * depth;
      }
      if (x > width * 0.5) {
        x = -width * 0.5;
      } else if (x < -width * 0.5) {
        x = width * 0.5;
      }
      if (z > depth * 0.5) {
        z = -depth * 0.5;
      } else if (z < -depth * 0.5) {
        z = depth * 0.5;
      }
      positions.setXYZ(index, x, y, z);
    }
    positions.needsUpdate = true;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.points) {
      this.points.visible = this.enabled;
    }
  }

  dispose() {
    if (this.points && this.points.parent) {
      this.points.parent.remove(this.points);
    }
    this.geometry?.dispose();
    this.material?.dispose();
    this.positions = null;
    this.velocities = null;
    this.phases = null;
  }

  _resetFlake(index, y = this.area.height) {
    const offset = index * 3;
    this.positions[offset] = (Math.random() - 0.5) * this.area.width;
    this.positions[offset + 1] = y;
    this.positions[offset + 2] = (Math.random() - 0.5) * this.area.depth;
    this.velocities[index] = this.fallSpeed * (0.65 + Math.random() * 0.35);
    this.phases[index] = Math.random() * Math.PI * 2;
  }

  reportError(error, context = {}) {
    if (this.onError) {
      try {
        this.onError(error, context);
      } catch {
        return;
      }
    }
  }
}

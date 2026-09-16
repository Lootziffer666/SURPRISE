import * as THREE from 'three';
import { easeInOutCubic } from './MathUtils.js';

export class Tween {
  constructor(target, property, from, to, duration, options = {}) {
    this.target = target;
    this.property = property;
    this.from = from;
    this.to = to;
    this.duration = Math.max(0.0001, duration);
    this.delay = Math.max(0, options.delay || 0);
    this.elapsed = 0;
    this.isDone = false;
    this.onUpdate = options.onUpdate || null;
    this.onComplete = options.onComplete || null;
    this.easing = options.easing || easeInOutCubic;
  }

  update(deltaTime) {
    if (this.isDone) {
      return true;
    }

    if (this.delay > 0) {
      this.delay -= deltaTime;
      return false;
    }

    this.elapsed += deltaTime;
    const rawT = Math.min(this.elapsed / this.duration, 1);
    const easedT = this.easing(rawT);

    if (this.from instanceof THREE.Vector3 || this.from instanceof THREE.Vector2) {
      this.target[this.property].copy(this.from).lerp(this.to, easedT);
    } else if (this.from instanceof THREE.Quaternion) {
      this.target[this.property].copy(this.from).slerp(this.to, easedT);
    } else {
      this.target[this.property] = this.from + (this.to - this.from) * easedT;
    }

    if (this.onUpdate) {
      this.onUpdate(easedT, this.target[this.property]);
    }

    if (rawT >= 1) {
      if (this.from instanceof THREE.Vector3 || this.from instanceof THREE.Vector2) {
        this.target[this.property].copy(this.to);
      } else if (this.from instanceof THREE.Quaternion) {
        this.target[this.property].copy(this.to);
      } else {
        this.target[this.property] = this.to;
      }
      this.isDone = true;
      if (this.onComplete) {
        this.onComplete();
      }
      return true;
    }

    return false;
  }

  cancel() {
    this.isDone = true;
  }
}

export class TweenManager {
  constructor() {
    this.tweens = [];
  }

  add(tween) {
    this.tweens.push(tween);
    return tween;
  }

  update(deltaTime) {
    for (let index = this.tweens.length - 1; index >= 0; index -= 1) {
      if (this.tweens[index].update(deltaTime)) {
        this.tweens.splice(index, 1);
      }
    }
  }

  clear() {
    this.tweens.length = 0;
  }
}

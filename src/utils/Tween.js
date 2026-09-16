import * as THREE from 'three';
import { easeInOutCubic } from './MathUtils.js';

export class Tween {
  constructor(target, property, from, to, duration, options = {}) {
    if (!target || typeof property !== 'string' || !(property in target)) {
      throw new TypeError('Tween requires a target property.');
    }
    this.target = target;
    this.property = property;
    this.from = from;
    this.to = to;
    this.duration = Number.isFinite(duration) ? Math.max(0.0001, duration) : 0.0001;
    this.delay = Number.isFinite(options.delay) ? Math.max(0, options.delay) : 0;
    this.elapsed = 0;
    this.isDone = false;
    this.onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : null;
    this.onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;
    this.easing = typeof options.easing === 'function' ? options.easing : easeInOutCubic;
  }

  update(deltaTime) {
    if (this.isDone) {
      return true;
    }

    if (this.delay > 0) {
      this.delay -= Math.max(0, deltaTime);
      return false;
    }

    this.elapsed += Math.max(0, deltaTime);
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
  constructor(options = {}) {
    this.tweens = [];
    this.onError = typeof options.onError === 'function' ? options.onError : null;
  }

  add(tween) {
    if (!tween || typeof tween.update !== 'function') {
      throw new TypeError('TweenManager can only add tween-like objects.');
    }
    this.tweens.push(tween);
    return tween;
  }

  update(deltaTime) {
    for (let index = this.tweens.length - 1; index >= 0; index -= 1) {
      try {
        if (this.tweens[index].update(deltaTime)) {
          this.tweens.splice(index, 1);
        }
      } catch (error) {
        this.tweens.splice(index, 1);
        this.reportError(error, { phase: 'tween-update' });
      }
    }
  }

  clear() {
    this.tweens.length = 0;
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

import * as THREE from 'three';

export class TriggerZone {
  constructor(position, halfExtents, options = {}) {
    this.position = position.clone();
    this.halfExtents = halfExtents.clone();
    this.box = new THREE.Box3();
    this.isActive = true;
    this.isPlayerInside = false;
    this.debugEnabled = Boolean(options.debug);
    this.debugColor = options.debugColor || 0xffcc44;
    this.onEnter = typeof options.onEnter === 'function' ? options.onEnter : null;
    this.onStay = typeof options.onStay === 'function' ? options.onStay : null;
    this.onExit = typeof options.onExit === 'function' ? options.onExit : null;
    this.onError = typeof options.onError === 'function' ? options.onError : null;
    this.debugHelper = null;
    this._size = new THREE.Vector3();
    this.updateBounds();
  }

  updateBounds() {
    this._size.copy(this.halfExtents).multiplyScalar(2);
    this.box.setFromCenterAndSize(this.position, this._size);
    if (this.debugHelper) {
      this.debugHelper.box.copy(this.box);
    }
  }

  setPosition(position) {
    this.position.copy(position);
    this.updateBounds();
  }

  setHalfExtents(halfExtents) {
    this.halfExtents.copy(halfExtents);
    this.updateBounds();
  }

  setActive(active) {
    this.isActive = Boolean(active);
    if (!this.isActive && this.isPlayerInside) {
      this.isPlayerInside = false;
      this._notify(this.onExit);
    }
  }

  containsPoint(point) {
    return this.isActive && this.box.containsPoint(point);
  }

  update(playerBox) {
    if (!this.isActive) {
      if (this.isPlayerInside) {
        this.isPlayerInside = false;
        this._notify(this.onExit);
      }
      return false;
    }

    const wasInside = this.isPlayerInside;
    const nowInside = playerBox.intersectsBox(this.box);
    this.isPlayerInside = nowInside;

    if (nowInside && !wasInside) {
      this._notify(this.onEnter);
    }
    if (nowInside) {
      this._notify(this.onStay);
    }
    if (!nowInside && wasInside) {
      this._notify(this.onExit);
    }

    return nowInside;
  }

  setDebug(scene, enabled = true) {
    this.debugEnabled = Boolean(enabled);
    if (enabled && !this.debugHelper) {
      this.debugHelper = new THREE.Box3Helper(this.box, this.debugColor);
      this.debugHelper.visible = true;
      scene.add(this.debugHelper);
    } else if (this.debugHelper) {
      this.debugHelper.visible = enabled;
    }
  }

  dispose(scene) {
    if (this.debugHelper && scene) {
      scene.remove(this.debugHelper);
    }
    this.debugHelper = null;
  }

  _notify(callback) {
    if (!callback) {
      return;
    }
    try {
      callback(this);
    } catch (error) {
      this._reportError(error, { phase: 'trigger-callback' });
    }
  }

  _reportError(error, context = {}) {
    if (this.onError) {
      try {
        this.onError(error, context);
      } catch {
        return;
      }
    }
  }
}

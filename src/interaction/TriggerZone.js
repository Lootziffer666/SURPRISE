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
    this.onEnter = options.onEnter || null;
    this.onStay = options.onStay || null;
    this.onExit = options.onExit || null;
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
      if (this.onExit) {
        this.onExit(this);
      }
    }
  }

  containsPoint(point) {
    return this.isActive && this.box.containsPoint(point);
  }

  update(playerBox) {
    if (!this.isActive) {
      if (this.isPlayerInside) {
        this.isPlayerInside = false;
        if (this.onExit) {
          this.onExit(this);
        }
      }
      return false;
    }

    const wasInside = this.isPlayerInside;
    const nowInside = playerBox.intersectsBox(this.box);
    this.isPlayerInside = nowInside;

    if (nowInside && !wasInside && this.onEnter) {
      this.onEnter(this);
    }
    if (nowInside && this.onStay) {
      this.onStay(this);
    }
    if (!nowInside && wasInside && this.onExit) {
      this.onExit(this);
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
}

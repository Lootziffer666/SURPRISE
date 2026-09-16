export class CampfireProcessor {
  constructor(zone, inventory, campfireMesh, options = {}) {
    this.zone = zone;
    this.inventory = inventory;
    this.campfireMesh = campfireMesh;
    this.processingDuration = options.processingDuration || 1.0;
    this.processingQueue = [];
    this.currentItem = null;
    this.processingTimer = 0;
    this.isProcessing = false;
    this.onProcessingStart = options.onProcessingStart || null;
    this.onProcessingComplete = options.onProcessingComplete || null;
    this._elapsed = 0;
  }

  update(deltaTime) {
    this._elapsed += deltaTime;
    this._animateFlame();

    if (this.isProcessing) {
      this.processingTimer += deltaTime;
      if (this.processingTimer >= this.processingDuration) {
        this._completeProcessing();
      }
      return;
    }

    if (this.zone.isPlayerInside && this.inventory.has('rawMeat') && this.processingQueue.length === 0) {
      this.processingQueue.push('rawMeat');
    }

    if (this.zone.isPlayerInside && this.processingQueue.length > 0) {
      this._startProcessing();
    }
  }

  _startProcessing() {
    const type = this.processingQueue.shift();
    const item = this.inventory.remove(type);
    if (!item) {
      this.currentItem = null;
      this.isProcessing = false;
      this.processingTimer = 0;
      return;
    }

    this.currentItem = item;
    this.isProcessing = true;
    this.processingTimer = 0;
    if (this.onProcessingStart) {
      this.onProcessingStart(item);
    }
  }

  _completeProcessing() {
    const completedItem = this.currentItem;
    this.currentItem = null;
    this.isProcessing = false;
    this.processingTimer = 0;
    this.inventory.add('cookedMeat');
    if (this.onProcessingComplete) {
      this.onProcessingComplete(completedItem);
    }
  }

  _animateFlame() {
    if (!this.campfireMesh || !this.campfireMesh.userData.flame) {
      return;
    }
    const flame = this.campfireMesh.userData.flame;
    const innerFlame = this.campfireMesh.userData.innerFlame;
    const pulse = Math.sin(this._elapsed * 9.5);
    const secondaryPulse = Math.cos(this._elapsed * 6.2);
    flame.scale.set(1 + secondaryPulse * 0.12, 1 + pulse * 0.22, 1 + secondaryPulse * 0.12);
    flame.rotation.y += 0.025;
    if (innerFlame) {
      innerFlame.scale.set(1 + pulse * 0.1, 1 + secondaryPulse * 0.18, 1 + pulse * 0.1);
      innerFlame.rotation.y -= 0.04;
    }
  }
}

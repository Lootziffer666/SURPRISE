import { GAME_CONFIG } from '../config/gameConfig.js';

export class CampfireProcessor {
  constructor(zone, inventory, campfireMesh, options = {}) {
    this.zone = zone;
    this.inventory = inventory;
    this.campfireMesh = campfireMesh;
    this.processingDuration = options.processingDuration ?? GAME_CONFIG.processingDuration;
    this.processingQueue = [];
    this.currentItem = null;
    this.processingTimer = 0;
    this.isProcessing = false;
    this.onProcessingStart = typeof options.onProcessingStart === 'function' ? options.onProcessingStart : null;
    this.onProcessingComplete = typeof options.onProcessingComplete === 'function' ? options.onProcessingComplete : null;
    this.onError = typeof options.onError === 'function' ? options.onError : null;
    this._elapsed = 0;
  }

  update(deltaTime) {
    const safeDelta = Math.max(0, deltaTime);
    this._elapsed += safeDelta;
    this._animateFlame();

    if (this.isProcessing) {
      this.processingTimer += safeDelta;
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
      try {
        this.onProcessingStart(item);
      } catch (error) {
        this.reportError(error, { phase: 'processing-start' });
      }
    }
  }

  _completeProcessing() {
    const completedItem = this.currentItem;
    this.currentItem = null;
    this.isProcessing = false;
    this.processingTimer = 0;
    if (!completedItem) {
      return;
    }
    this.inventory.add('cookedMeat');
    if (this.onProcessingComplete) {
      try {
        this.onProcessingComplete(completedItem);
      } catch (error) {
        this.reportError(error, { phase: 'processing-complete' });
      }
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

  dispose() {
    this.processingQueue.length = 0;
    this.currentItem = null;
    this.isProcessing = false;
    this.processingTimer = 0;
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

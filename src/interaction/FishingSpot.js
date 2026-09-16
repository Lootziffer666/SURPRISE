import * as THREE from 'three';
import { TriggerZone } from './TriggerZone.js';

export class FishingSpot {
  constructor(position, assetFactory, inventory, options = {}) {
    this.position = position.clone();
    this.assetFactory = assetFactory;
    this.inventory = inventory;
    this.fishingDuration = options.fishingDuration ?? 1.8;
    this.catchCooldown = options.catchCooldown ?? 1.2;
    this.catchChance = options.catchChance ?? 0.85;
    this.zone = new TriggerZone(this.position, options.halfExtents || new THREE.Vector3(2.8, 2.2, 2.8), {
      debug: Boolean(options.debug),
      debugColor: options.debugColor,
    });
    this.zone.setActive(false);
    this.mesh = this.assetFactory.createFishingSpot();
    this.mesh.position.copy(this.position);
    this.isFishing = false;
    this.fishingTimer = 0;
    this.cooldownTimer = 0;
    this.onFishingStart = typeof options.onFishingStart === 'function' ? options.onFishingStart : null;
    this.onCatch = typeof options.onCatch === 'function' ? options.onCatch : null;
    this.onMiss = typeof options.onMiss === 'function' ? options.onMiss : null;
    this.onError = typeof options.onError === 'function' ? options.onError : null;
  }

  update(deltaTime) {
    const safeDelta = Math.max(0, deltaTime);
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - safeDelta);
    }
    if (this.isFishing) {
      this.fishingTimer += safeDelta;
      if (this.fishingTimer >= this.fishingDuration) {
        this._completeFishing();
      }
      return;
    }
    if (!this.zone.isActive || !this.zone.isPlayerInside || this.cooldownTimer > 0) {
      return;
    }
    if (!this.inventory.has('wood')) {
      return;
    }
    const bait = this.inventory.remove('wood');
    if (!bait) {
      return;
    }
    this.isFishing = true;
    this.fishingTimer = 0;
    if (this.onFishingStart) {
      try {
        this.onFishingStart(bait);
      } catch (error) {
        this.reportError(error, { phase: 'fishing-start' });
      }
    }
  }

  _completeFishing() {
    this.isFishing = false;
    this.fishingTimer = 0;
    this.cooldownTimer = this.catchCooldown;
    const caught = Math.random() < this.catchChance;
    if (caught) {
      this.inventory.add('fish');
      if (this.onCatch) {
        try {
          this.onCatch();
        } catch (error) {
          this.reportError(error, { phase: 'fishing-catch' });
        }
      }
      return;
    }
    if (this.onMiss) {
      try {
        this.onMiss();
      } catch (error) {
        this.reportError(error, { phase: 'fishing-miss' });
      }
    }
  }

  setActive(active) {
    this.zone.setActive(active);
    if (!active) {
      this.isFishing = false;
      this.fishingTimer = 0;
    }
  }

  dispose() {
    this.zone.dispose();
    if (this.mesh?.parent) {
      this.mesh.parent.remove(this.mesh);
    }
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

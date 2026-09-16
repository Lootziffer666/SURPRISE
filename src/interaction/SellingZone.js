import * as THREE from 'three';
import { RESOURCE_PRICES, GAME_CONFIG } from '../config/gameConfig.js';
import { Tween } from '../utils/Tween.js';

export class SellingZone {
  constructor(zone, inventory, gameState, assetFactory, scene, tweenManager, getPlayerPosition, options = {}) {
    this.zone = zone;
    this.inventory = inventory;
    this.gameState = gameState;
    this.assetFactory = assetFactory;
    this.scene = scene;
    this.tweenManager = tweenManager;
    this.getPlayerPosition = getPlayerPosition;
    this.prices = options.prices ?? RESOURCE_PRICES;
    this.sellDelay = options.sellDelay ?? GAME_CONFIG.sellDelay;
    this.isSelling = false;
    this.sellTimer = 0;
    this.cashAnimations = [];
    this.onSale = typeof options.onSale === 'function' ? options.onSale : null;
    this.onError = typeof options.onError === 'function' ? options.onError : null;
    this._disposed = false;
  }

  update(deltaTime) {
    if (this._disposed) {
      return;
    }
    const safeDelta = Math.max(0, deltaTime);
    if (!this.zone.isPlayerInside) {
      this.isSelling = false;
      this.sellTimer = 0;
      return;
    }

    if (this.isSelling) {
      this.sellTimer += safeDelta;
      if (this.sellTimer >= this.sellDelay) {
        this.isSelling = false;
        this.sellTimer = 0;
      }
      return;
    }

    const items = this.inventory.getItems();
    let selectedItem = null;
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (this.prices[items[index].type]) {
        selectedItem = items[index];
        break;
      }
    }
    if (!selectedItem) {
      return;
    }

    this.inventory.remove(selectedItem.type);
    const price = this.prices[selectedItem.type];
    this.gameState.addCash(price);
    this._spawnCashAnimation(this.zone.position);
    this.isSelling = true;
    this.sellTimer = 0;
    this._notify(this.onSale, selectedItem, price, 'sale-callback');
  }

  _spawnCashAnimation(zonePosition) {
    if (this._disposed) {
      return;
    }
    const source = this.assetFactory.createCash();
    const cashMesh = source.clone();
    cashMesh.geometry = source.geometry.clone();
    cashMesh.material = source.material.clone();
    cashMesh.position.set(
      zonePosition.x + (Math.random() - 0.5) * 1.2,
      1.1,
      zonePosition.z + (Math.random() - 0.5) * 1.2,
    );
    cashMesh.castShadow = true;
    cashMesh.receiveShadow = true;
    this.scene.add(cashMesh);

    const playerPosition = this.getPlayerPosition();
    const targetPosition = new THREE.Vector3(playerPosition.x, playerPosition.y + 2.0, playerPosition.z);
    const tween = new Tween(
      cashMesh,
      'position',
      cashMesh.position.clone(),
      targetPosition,
      0.55,
      {
        easing: (t) => 1 - (1 - t) ** 3,
        onComplete: () => {
          if (this._disposed) {
            return;
          }
          this.scene.remove(cashMesh);
          cashMesh.geometry.dispose();
          cashMesh.material.dispose();
          const index = this.cashAnimations.indexOf(cashMesh);
          if (index >= 0) {
            this.cashAnimations.splice(index, 1);
          }
        },
      },
    );
    this.cashAnimations.push(cashMesh);
    this.tweenManager.add(tween);
  }

  getSellableTypes() {
    return Object.keys(this.prices);
  }

  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    for (const cashMesh of this.cashAnimations) {
      this.scene.remove(cashMesh);
      cashMesh.geometry.dispose();
      cashMesh.material.dispose();
    }
    this.cashAnimations.length = 0;
  }

  _notify(callback, item, price, phase) {
    if (!callback) {
      return;
    }
    try {
      callback(item, price);
    } catch (error) {
      this.reportError(error, { phase });
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

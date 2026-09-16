import * as THREE from 'three';
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
    this.prices = options.prices || {
      cookedMeat: 10,
      wood: 5,
    };
    this.sellDelay = options.sellDelay || 0.2;
    this.isSelling = false;
    this.sellTimer = 0;
    this.cashAnimations = [];
    this.onSale = options.onSale || null;
  }

  update(deltaTime) {
    if (!this.zone.isPlayerInside) {
      this.isSelling = false;
      this.sellTimer = 0;
      return;
    }

    if (this.isSelling) {
      this.sellTimer += deltaTime;
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

    if (this.onSale) {
      this.onSale(selectedItem, price);
    }
  }

  _spawnCashAnimation(zonePosition) {
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
    for (const cashMesh of this.cashAnimations) {
      this.scene.remove(cashMesh);
      cashMesh.geometry.dispose();
      cashMesh.material.dispose();
    }
    this.cashAnimations.length = 0;
  }
}

import * as THREE from 'three';

export class UIManager {
  constructor(gameState, camera) {
    this.gameState = gameState;
    this.camera = camera;
    this.cashElement = document.getElementById('cash-value');
    this.overlayContainer = document.getElementById('world-overlays') || document.body;
    this.overlays = [];
    this._projected = new THREE.Vector3();
    this._unsubscribeCash = this.gameState.subscribe('cashChanged', (cash) => this.setCash(cash));
    this.setCash(this.gameState.getCash());
  }

  setCash(cash) {
    if (this.cashElement) {
      this.cashElement.textContent = String(Math.max(0, Math.floor(cash)));
    }
  }

  createBuyZoneOverlay(worldPosition, cost) {
    const element = document.createElement('div');
    element.className = 'world-overlay';
    const title = document.createElement('span');
    title.className = 'world-overlay-title';
    title.textContent = 'Unlock';
    const price = document.createElement('span');
    price.className = 'world-overlay-price';
    price.textContent = `$${cost}`;
    element.append(title, price);
    this.overlayContainer.appendChild(element);

    const overlay = {
      element,
      worldPosition: worldPosition.clone(),
      active: true,
    };
    this.overlays.push(overlay);
    return overlay;
  }

  hideBuyZoneOverlay(overlay) {
    if (!overlay) {
      return;
    }
    overlay.active = false;
    overlay.element.hidden = true;
  }

  update() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (const overlay of this.overlays) {
      if (!overlay.active) {
        continue;
      }
      this._projected.copy(overlay.worldPosition).project(this.camera);
      const outsideViewport =
        this._projected.z > 1 ||
        this._projected.x < -1.05 ||
        this._projected.x > 1.05 ||
        this._projected.y < -1.05 ||
        this._projected.y > 1.05;
      if (outsideViewport) {
        overlay.element.hidden = true;
        continue;
      }

      overlay.element.hidden = false;
      const x = (this._projected.x + 1) * 0.5 * width;
      const y = (1 - this._projected.y) * 0.5 * height;
      overlay.element.style.left = `${x}px`;
      overlay.element.style.top = `${y}px`;
    }
  }

  dispose() {
    if (this._unsubscribeCash) {
      this._unsubscribeCash();
      this._unsubscribeCash = null;
    }
    for (const overlay of this.overlays) {
      overlay.element.remove();
    }
    this.overlays.length = 0;
  }
}

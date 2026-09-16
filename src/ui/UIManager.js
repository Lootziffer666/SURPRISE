import * as THREE from 'three';

export class UIManager {
  constructor(gameState, camera, options = {}) {
    this.gameState = gameState;
    this.camera = camera;
    this.onError = typeof options.onError === 'function' ? options.onError : null;
    this.cashElement = document.getElementById('cash-value');
    this.inventoryElement = document.getElementById('inventory-value');
    this.statusElement = document.getElementById('status-value');
    this.toastElement = document.getElementById('toast');
    this.errorElement = document.getElementById('fatal-error');
    this.errorMessage = document.getElementById('fatal-error-message');
    this.errorRetryButton = document.getElementById('fatal-error-retry');
    this.pauseButton = document.getElementById('pause-button');
    this.muteButton = document.getElementById('mute-button');
    this.snowButton = document.getElementById('snow-button');
    this.overlayContainer = document.getElementById('world-overlays') || document.body;
    this.overlays = [];
    this.controlHandlers = new Map();
    this._errorRetryHandler = null;
    this._projected = new THREE.Vector3();
    this._toastTimer = 0;
    this._unsubscribeCash = this.gameState.subscribe('cashChanged', (cash) => this.setCash(cash));
    this.setCash(this.gameState.getCash());
    this.showStatus('Collect resources, cook meat, and reach the market.', 'info');
    this._bindErrorRetry();
  }

  setCash(cash) {
    if (this.cashElement) {
      this.cashElement.textContent = String(Math.max(0, Math.floor(Number.isFinite(cash) ? cash : 0)));
    }
  }

  setInventory(items = []) {
    if (!this.inventoryElement) {
      return;
    }
    const counts = new Map();
    for (const item of items) {
      counts.set(item.type, (counts.get(item.type) || 0) + 1);
    }
    const labels = {
      wood: 'Wood',
      rawMeat: 'Raw meat',
      cookedMeat: 'Cooked meat',
      fish: 'Fish',
    };
    this.inventoryElement.replaceChildren();
    if (counts.size === 0) {
      const empty = document.createElement('span');
      empty.className = 'inventory-empty';
      empty.textContent = 'Empty';
      this.inventoryElement.append(empty);
      return;
    }
    for (const [type, count] of counts) {
      const entry = document.createElement('span');
      entry.className = 'inventory-item';
      const label = document.createElement('span');
      label.textContent = labels[type] || type;
      const amount = document.createElement('strong');
      amount.textContent = String(count);
      entry.append(label, amount);
      this.inventoryElement.append(entry);
    }
  }

  showStatus(message, tone = 'info') {
    if (!this.statusElement) {
      return;
    }
    this.statusElement.textContent = message;
    this.statusElement.dataset.tone = tone;
    this.statusElement.hidden = false;
  }

  clearStatus() {
    if (this.statusElement) {
      this.statusElement.hidden = true;
    }
  }

  showToast(message, tone = 'success') {
    if (!this.toastElement) {
      return;
    }
    window.clearTimeout(this._toastTimer);
    this.toastElement.textContent = message;
    this.toastElement.dataset.tone = tone;
    this.toastElement.hidden = false;
    this._toastTimer = window.setTimeout(() => {
      this.toastElement.hidden = true;
    }, 2600);
  }

  showError(error) {
    if (!this.errorElement) {
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (this.errorMessage) {
      this.errorMessage.textContent = message || 'The game stopped unexpectedly.';
    }
    this.errorElement.hidden = false;
  }

  hideError() {
    if (this.errorElement) {
      this.errorElement.hidden = true;
    }
  }

  setPaused(paused) {
    if (this.pauseButton) {
      this.pauseButton.textContent = paused ? 'Resume' : 'Pause';
      this.pauseButton.setAttribute('aria-pressed', String(Boolean(paused)));
    }
  }

  setMuted(muted) {
    if (this.muteButton) {
      this.muteButton.textContent = muted ? 'Unmute' : 'Mute';
      this.muteButton.setAttribute('aria-pressed', String(Boolean(muted)));
    }
  }

  setSnowEnabled(enabled) {
    if (this.snowButton) {
      this.snowButton.textContent = enabled ? 'Snow: on' : 'Snow: off';
      this.snowButton.setAttribute('aria-pressed', String(Boolean(enabled)));
    }
  }

  bindControls(handlers = {}) {
    this.unbindControls();
    const bindings = [
      ['pauseButton', this.pauseButton, handlers.onPause],
      ['muteButton', this.muteButton, handlers.onMute],
      ['snowButton', this.snowButton, handlers.onSnow],
    ];
    for (const [name, element, handler] of bindings) {
      if (element && typeof handler === 'function') {
        element.addEventListener('click', handler);
        this.controlHandlers.set(name, handler);
      }
    }
  }

  unbindControls() {
    const elements = [
      ['pauseButton', this.pauseButton],
      ['muteButton', this.muteButton],
      ['snowButton', this.snowButton],
    ];
    for (const [name, element] of elements) {
      const handler = this.controlHandlers.get(name);
      if (element && handler) {
        element.removeEventListener('click', handler);
      }
    }
    if (this.errorRetryButton && this._errorRetryHandler) {
      this.errorRetryButton.removeEventListener('click', this._errorRetryHandler);
    }
    this.controlHandlers.clear();
  }

  createBuyZoneOverlay(worldPosition, cost) {
    const element = document.createElement('div');
    element.className = 'world-overlay';
    const title = document.createElement('span');
    title.className = 'world-overlay-title';
    title.textContent = 'Unlock fishing area';
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
      if (!overlay.active || !overlay.element.isConnected) {
        continue;
      }
      this._projected.copy(overlay.worldPosition).project(this.camera);
      const outsideViewport =
        this._projected.z > 1 ||
        this._projected.x < -1.05 ||
        this._projected.x > 1.05 ||
        this._projected.y < -1.05 ||
        this._projected.y > 1.05;
      overlay.element.hidden = outsideViewport;
      if (outsideViewport) {
        continue;
      }
      const x = (this._projected.x + 1) * 0.5 * width;
      const y = (1 - this._projected.y) * 0.5 * height;
      overlay.element.style.left = `${x}px`;
      overlay.element.style.top = `${y}px`;
    }
  }

  dispose() {
    window.clearTimeout(this._toastTimer);
    this.unbindControls();
    if (this._unsubscribeCash) {
      this._unsubscribeCash();
      this._unsubscribeCash = null;
    }
    for (const overlay of this.overlays) {
      overlay.element.remove();
    }
    this.overlays.length = 0;
  }

  _bindErrorRetry() {
    if (!this.errorRetryButton) {
      return;
    }
    this._errorRetryHandler = () => window.location.reload();
    this.errorRetryButton.addEventListener('click', this._errorRetryHandler);
  }
}

import * as THREE from 'three';
import { SceneSetup } from './SceneSetup.js';
import { GameState } from './GameState.js';
import { AssetFactory } from '../entities/AssetFactory.js';
import { PlayerController } from '../controllers/PlayerController.js';
import { InventoryStack } from '../inventory/InventoryStack.js';
import { CampfireProcessor } from '../interaction/CampfireProcessor.js';
import { SellingZone } from '../interaction/SellingZone.js';
import { MapManager } from '../world/MapManager.js';
import { ResourceManager } from '../world/ResourceManager.js';
import { UIManager } from '../ui/UIManager.js';
import { TweenManager } from '../utils/Tween.js';
import { AudioManager } from '../audio/AudioManager.js';
import { SnowfallEffect } from '../effects/SnowfallEffect.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

export class GameManager {
  constructor(options = {}) {
    this.isRunning = false;
    this.isPaused = false;
    this._disposed = false;
    this._handlingError = false;
    this._animationFrameId = 0;
    this._userPaused = false;
    this.lastError = null;
    this.handleError = this.handleError.bind(this);

    try {
      this.sceneSetup = new SceneSetup({ onError: this.handleError });
      this.scene = this.sceneSetup.scene;
      this.renderer = this.sceneSetup.renderer;
      this.camera = this.sceneSetup.camera;

      this.gameState = new GameState(options.initialCash || 0, { onError: this.handleError });
      this.assetFactory = new AssetFactory();
      this.tweenManager = new TweenManager({ onError: this.handleError });
      this.player = this.assetFactory.createPlayer();
      this.player.position.set(0, 0, 0);
      this.scene.add(this.player);

      this.inventory = new InventoryStack(this.player, this.assetFactory, {
        onChange: (items) => this.uiManager?.setInventory(items),
        onError: this.handleError,
      });
      this.uiManager = new UIManager(this.gameState, this.camera, { onError: this.handleError });
      this.audioManager = new AudioManager({ onError: this.handleError });
      const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.snowfallEffect = new SnowfallEffect(this.scene, this.camera, {
        enabled: options.snow !== false && !reduceMotion,
        count: GAME_CONFIG.snowflakeCount,
        onError: this.handleError,
      });
      this.mapManager = new MapManager(this.scene, this.gameState, this.assetFactory, this.uiManager, {
        inventory: this.inventory,
        tweenManager: this.tweenManager,
        expansionCost: GAME_CONFIG.expansionCost,
        onError: this.handleError,
        onExpansionUnlocked: (expansion) => {
          this.resourceManager?.spawnExpansionResources();
          this.uiManager.showStatus('The fishing area is open. Follow the path east.', 'success');
          this.audioManager.playExpansion();
        },
      });

      this.playerController = new PlayerController(this.player, this.camera, this.mapManager);
      this.playerController.bindEvents(this.renderer.domElement);

      this.resourceManager = new ResourceManager(this.scene, this.assetFactory, this.inventory, this.mapManager, {
        onCollect: (type) => this.audioManager.playCollect(type),
      });
      this.resourceManager.spawnStartingResources();

      this.campfireProcessor = new CampfireProcessor(
        this.mapManager.campfireZone,
        this.inventory,
        this.mapManager.campfireMesh,
        {
          onError: this.handleError,
          onProcessingStart: () => this.uiManager.showStatus('Cooking raw meat...', 'info'),
          onProcessingComplete: () => {
            this.uiManager.showToast('Cooked meat ready.', 'success');
            this.audioManager.playTone({ frequency: 760, duration: 0.12, type: 'triangle', volume: 0.28 });
          },
        },
      );

      this.sellingZone = new SellingZone(
        this.mapManager.sellingZone,
        this.inventory,
        this.gameState,
        this.assetFactory,
        this.scene,
        this.tweenManager,
        () => this.player.position,
        {
          onError: this.handleError,
          onSale: (item, price) => {
            const labels = { cookedMeat: 'cooked meat', wood: 'wood', fish: 'fish' };
            this.uiManager.showToast(`Sold ${labels[item.type] || item.type} for $${price}.`, 'success');
            this.audioManager.playSale();
          },
        },
      );

      this.triggerZones = [
        this.mapManager.campfireZone,
        this.mapManager.sellingZone,
        this.mapManager.buyZone.trigger,
        this.mapManager.fishingSpot?.zone,
      ].filter(Boolean);
      this.playerBox = new THREE.Box3();
      this.clock = new THREE.Clock();
      this.fishingSpot = this.mapManager.fishingSpot;
      if (this.fishingSpot) {
        this.fishingSpot.onFishingStart = () => this.uiManager.showStatus('Fishing... stay near the dock.', 'info');
        this.fishingSpot.onCatch = () => {
          this.uiManager.showToast('You caught a fish.', 'success');
          this.audioManager.playFishing();
        };
        this.fishingSpot.onMiss = () => this.uiManager.showStatus('No bite yet. Try again.', 'info');
        this.fishingSpot.onError = this.handleError;
      }

      this.handleResize = this.handleResize.bind(this);
      this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.uiManager.bindControls({
        onPause: () => this.togglePause(),
        onMute: () => this.setMuted(this.audioManager.toggleMute()),
        onSnow: () => this.setSnowEnabled(!this.snowfallEffect.enabled),
      });
      this.uiManager.setInventory(this.inventory.getItems());
      this.uiManager.setMuted(this.audioManager.muted);
      this.uiManager.setSnowEnabled(this.snowfallEffect.enabled);
      this.isRunning = true;
      this.handleResize();
      this._animationFrameId = window.requestAnimationFrame(this.animate);
    } catch (error) {
      this.handleError(error, { phase: 'initialization' });
      this.dispose();
      throw error;
    }
  }

  animate() {
    if (!this.isRunning || this.isPaused || this._disposed) {
      return;
    }

    try {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      this.update(delta);
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      this.handleError(error, { phase: 'frame' });
      return;
    }

    if (this.isRunning && !this.isPaused && !this._disposed) {
      this._animationFrameId = window.requestAnimationFrame(this.animate);
    }
  }

  update(deltaTime) {
    this.playerController.update(deltaTime);
    this.playerBox.setFromObject(this.player);

    for (const zone of this.triggerZones) {
      zone.update(this.playerBox);
    }

    this.resourceManager.update(this.player.position);
    this.campfireProcessor.update(deltaTime);
    this.sellingZone.update(deltaTime);
    this.fishingSpot?.update(deltaTime);
    this.mapManager.update(deltaTime);
    this.snowfallEffect.update(deltaTime);
    this.tweenManager.update(deltaTime);
    this.sceneSetup.updateCamera(this.player.position, deltaTime);
    this.uiManager.update();
  }

  handleResize() {
    if (this._disposed || !this.sceneSetup) {
      return;
    }
    this.sceneSetup.resize(window.innerWidth, window.innerHeight);
    this.uiManager.update();
  }

  handleBeforeUnload() {
    this.dispose();
  }

  handleVisibilityChange() {
    if (this._disposed) {
      return;
    }
    if (document.hidden) {
      this.pause();
    } else if (!this._userPaused) {
      this.resume();
    }
  }

  togglePause() {
    this._userPaused = !this.isPaused;
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  pause() {
    if (!this.isRunning || this.isPaused || this._disposed) {
      return;
    }
    this.isPaused = true;
    this.uiManager.setPaused(true);
    window.cancelAnimationFrame(this._animationFrameId);
  }

  resume() {
    if (!this.isRunning || !this.isPaused || this._disposed) {
      return;
    }
    this.isPaused = false;
    this.uiManager.setPaused(false);
    this._animationFrameId = window.requestAnimationFrame(this.animate);
  }

  setMuted(muted) {
    this.uiManager.setMuted(Boolean(muted));
  }

  setSnowEnabled(enabled) {
    this.snowfallEffect?.setEnabled(Boolean(enabled));
    this.uiManager.setSnowEnabled(Boolean(enabled));
  }

  handleError(error, context = {}) {
    if (this._handlingError) {
      return;
    }
    this._handlingError = true;
    this.lastError = error instanceof Error ? error : new Error(String(error));
    this.isRunning = false;
    this.isPaused = false;
    this._userPaused = false;
    window.cancelAnimationFrame(this._animationFrameId);
    try {
      this.audioManager?.playError();
    } catch {
      this.lastError = error instanceof Error ? error : new Error(String(error));
    }
    try {
      this.uiManager?.showError(this.lastError);
    } catch {
      this.lastError = error instanceof Error ? error : new Error(String(error));
    }
    this._handlingError = false;
  }

  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this.isRunning = false;
    this.isPaused = false;
    this._userPaused = false;
    window.cancelAnimationFrame(this._animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    const disposers = [
      () => this.playerController?.dispose(),
      () => this.inventory?.dispose(),
      () => this.resourceManager?.dispose(),
      () => this.campfireProcessor?.dispose(),
      () => this.sellingZone?.dispose(),
      () => this.mapManager?.dispose(),
      () => this.snowfallEffect?.dispose(),
      () => this.audioManager?.dispose(),
      () => this.uiManager?.dispose(),
      () => this.tweenManager?.clear(),
      () => this.sceneSetup?.dispose(),
      () => this.assetFactory?.dispose(),
    ];
    for (const dispose of disposers) {
      try {
        dispose();
      } catch (error) {
        this.lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    if (this.triggerZones) {
      this.triggerZones.length = 0;
    }
    this._animationFrameId = 0;
  }
}

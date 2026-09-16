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

export class GameManager {
  constructor() {
    this.sceneSetup = new SceneSetup();
    this.scene = this.sceneSetup.scene;
    this.renderer = this.sceneSetup.renderer;
    this.camera = this.sceneSetup.camera;

    this.gameState = new GameState(0);
    this.assetFactory = new AssetFactory();
    this.tweenManager = new TweenManager();
    this.uiManager = new UIManager(this.gameState, this.camera);

    this.mapManager = new MapManager(this.scene, this.gameState, this.assetFactory, this.uiManager, {
      tweenManager: this.tweenManager,
      onExpansionUnlocked: () => {
        if (this.resourceManager) {
          this.resourceManager.spawnExpansionResources();
        }
      },
    });

    this.player = this.assetFactory.createPlayer();
    this.player.position.set(0, 0, 0);
    this.scene.add(this.player);

    this.inventory = new InventoryStack(this.player, this.assetFactory);
    this.playerController = new PlayerController(this.player, this.camera, this.mapManager);
    this.playerController.bindEvents(this.renderer.domElement);

    this.resourceManager = new ResourceManager(this.scene, this.assetFactory, this.inventory, this.mapManager);
    this.resourceManager.spawnStartingResources();

    this.campfireProcessor = new CampfireProcessor(
      this.mapManager.campfireZone,
      this.inventory,
      this.mapManager.campfireMesh,
    );

    this.sellingZone = new SellingZone(
      this.mapManager.sellingZone,
      this.inventory,
      this.gameState,
      this.assetFactory,
      this.scene,
      this.tweenManager,
      () => this.player.position,
    );

    this.triggerZones = [
      this.mapManager.campfireZone,
      this.mapManager.sellingZone,
      this.mapManager.buyZone.trigger,
    ];
    this.playerBox = new THREE.Box3();
    this.clock = new THREE.Clock();
    this.isRunning = true;
    this.animationFrameId = 0;

    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    this.handleResize();
    this.animationFrameId = window.requestAnimationFrame(this.animate);
  }

  animate() {
    if (!this.isRunning) {
      return;
    }

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = window.requestAnimationFrame(this.animate);
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
    this.mapManager.update(deltaTime);
    this.tweenManager.update(deltaTime);
    this.sceneSetup.updateCamera(this.player.position, deltaTime);
    this.uiManager.update();
  }

  handleResize() {
    this.sceneSetup.resize(window.innerWidth, window.innerHeight);
    this.uiManager.update();
  }

  handleBeforeUnload() {
    this.dispose();
  }

  dispose() {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    window.cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.playerController.dispose();
    this.inventory.dispose();
    this.resourceManager.dispose();
    this.mapManager.dispose();
    this.uiManager.dispose();
    this.sceneSetup.dispose();
  }
}

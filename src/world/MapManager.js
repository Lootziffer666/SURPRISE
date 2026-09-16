import * as THREE from 'three';
import { TriggerZone } from '../interaction/TriggerZone.js';
import { Tween } from '../utils/Tween.js';
import { easeInOutCubic, randomRange } from '../utils/MathUtils.js';

export class MapManager {
  constructor(scene, gameState, assetFactory, uiManager, options = {}) {
    this.scene = scene;
    this.gameState = gameState;
    this.assetFactory = assetFactory;
    this.uiManager = uiManager;
    this.tweenManager = options.tweenManager || null;
    this.onExpansionUnlocked = options.onExpansionUnlocked || null;
    this.expansionCost = options.expansionCost || 200;
    this.worldBounds = {
      minX: -35,
      maxX: 35,
      minZ: -35,
      maxZ: 35,
    };
    this.expansions = new Map();
    this.fenceGroups = {};
    this._localDisposables = [];
    this._decorations = [];
    this._disposed = false;

    this._createTerrain();
    this._createStartingDecorations();
    this._createFences();
    this._createCampfire();
    this._createSellingZone();
    this._createBuyZone();
    this._createExpansionArea();
  }

  _createTerrain() {
    const terrainGeometry = new THREE.PlaneGeometry(120, 120);
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8f3fb,
      roughness: 0.96,
      metalness: 0,
    });
    this.terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    this.terrain.name = 'SnowTerrain';
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);

    for (let index = 0; index < 18; index += 1) {
      const patch = new THREE.Mesh(
        new THREE.CircleGeometry(randomRange(1.2, 3.2), 12),
        new THREE.MeshStandardMaterial({
          color: index % 2 === 0 ? 0xdcecf8 : 0xf4fafd,
          roughness: 0.98,
        }),
      );
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(randomRange(-48, 48), 0.006, randomRange(-48, 48));
      patch.receiveShadow = true;
      this.scene.add(patch);
      this._localDisposables.push(patch);
    }
  }

  _createStartingDecorations() {
    for (let index = 0; index < 24; index += 1) {
      const tree = this.assetFactory.createTree();
      const x = randomRange(-32, 32);
      const z = randomRange(-32, 32);
      if (Math.hypot(x, z) < 5) {
        tree.position.set(x < 0 ? x - 6 : x + 6, 0, z);
      } else {
        tree.position.set(x, 0, z);
      }
      this.scene.add(tree);
      this._decorations.push(tree);
    }

    for (let index = 0; index < 4; index += 1) {
      const bear = this.assetFactory.createBear();
      bear.position.set(randomRange(-28, -12), 0, randomRange(-28, 28));
      this.scene.add(bear);
      this._decorations.push(bear);
    }
  }

  _createFences() {
    this.fenceGroups.north = this._createFenceLine(
      new THREE.Vector3(-35, 0, -35),
      new THREE.Vector3(35, 0, -35),
    );
    this.fenceGroups.south = this._createFenceLine(
      new THREE.Vector3(-35, 0, 35),
      new THREE.Vector3(35, 0, 35),
    );
    this.fenceGroups.west = this._createFenceLine(
      new THREE.Vector3(-35, 0, -35),
      new THREE.Vector3(-35, 0, 35),
    );
    this.fenceGroups.east = this._createFenceLine(
      new THREE.Vector3(35, 0, -35),
      new THREE.Vector3(35, 0, 35),
    );

    Object.values(this.fenceGroups).forEach((group) => this.scene.add(group));
  }

  _createFenceLine(start, end) {
    const group = new THREE.Group();
    group.name = 'FenceLine';
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const count = Math.max(2, Math.floor(length / 3) + 1);
    for (let index = 0; index < count; index += 1) {
      const post = this.assetFactory.createFencePost();
      const t = count === 1 ? 0 : index / (count - 1);
      post.position.copy(start).add(direction.clone().multiplyScalar(t));
      group.add(post);
    }
    return group;
  }

  _createCampfire() {
    const position = new THREE.Vector3(-10, 0, -10);
    this.campfireMesh = this.assetFactory.createCampfire();
    this.campfireMesh.position.copy(position);
    this.scene.add(this.campfireMesh);
    this.campfireZone = new TriggerZone(position, new THREE.Vector3(2.7, 2.1, 2.7));
  }

  _createSellingZone() {
    const position = new THREE.Vector3(10, 0, 12);
    this.sellingZone = new TriggerZone(position, new THREE.Vector3(4.2, 2.2, 4.2));

    const stall = this.assetFactory.createMarketStall();
    stall.position.set(position.x + 2.2, 0, position.z - 1.2);
    this.scene.add(stall);
    this._decorations.push(stall);

    for (let index = 0; index < 5; index += 1) {
      const bear = this.assetFactory.createBear();
      bear.position.set(position.x - 2.2 + randomRange(-1.2, 1.2), 0, position.z + randomRange(-2.2, 2.2));
      this.scene.add(bear);
      this._decorations.push(bear);
    }
  }

  _createBuyZone() {
    const position = new THREE.Vector3(31, 0, 0);
    this.buyZoneMarker = this.assetFactory.createBuyZoneMarker();
    this.buyZoneMarker.position.copy(position);
    this.scene.add(this.buyZoneMarker);
    this._decorations.push(this.buyZoneMarker);

    this.buyZoneTrigger = new TriggerZone(position, new THREE.Vector3(2.8, 2.2, 2.8));
    this.buyZoneTrigger.onEnter = () => this.tryPurchaseExpansion('fishingArea');
    this.buyZoneOverlay = this.uiManager.createBuyZoneOverlay(position, this.expansionCost);
    this.buyZone = {
      trigger: this.buyZoneTrigger,
      marker: this.buyZoneMarker,
      overlay: this.buyZoneOverlay,
      cost: this.expansionCost,
      unlocked: false,
    };
  }

  _createExpansionArea() {
    const contentGroup = new THREE.Group();
    contentGroup.name = 'FishingArea';
    contentGroup.visible = false;
    this.scene.add(contentGroup);

    const expansionTerrain = new THREE.Mesh(
      new THREE.PlaneGeometry(55, 80),
      new THREE.MeshStandardMaterial({
        color: 0xdcecf8,
        roughness: 0.96,
      }),
    );
    expansionTerrain.rotation.x = -Math.PI / 2;
    expansionTerrain.position.set(62.5, 0.012, 0);
    expansionTerrain.receiveShadow = true;
    contentGroup.add(expansionTerrain);
    this._localDisposables.push(expansionTerrain);

    const pond = this.assetFactory.createPond();
    pond.position.set(62.5, 0.035, 0);
    contentGroup.add(pond);

    for (let index = 0; index < 14; index += 1) {
      const tree = this.assetFactory.createTree();
      tree.position.set(randomRange(42, 84), 0, randomRange(-32, 32));
      contentGroup.add(tree);
    }

    for (let index = 0; index < 3; index += 1) {
      const bear = this.assetFactory.createBear();
      bear.position.set(randomRange(45, 80), 0, randomRange(-28, 28));
      contentGroup.add(bear);
    }

    const expansion = {
      id: 'fishingArea',
      cost: this.expansionCost,
      unlocked: false,
      fenceGroup: this.fenceGroups.east,
      zone: this.buyZoneTrigger,
      contentGroup,
      bounds: {
        minX: 35,
        maxX: 85,
        minZ: -35,
        maxZ: 35,
      },
    };
    this.expansions.set(expansion.id, expansion);
  }

  tryPurchaseExpansion(expansionId) {
    const expansion = this.expansions.get(expansionId);
    if (!expansion || expansion.unlocked) {
      return false;
    }
    if (!this.gameState.canAfford(expansion.cost) || !this.gameState.spendCash(expansion.cost)) {
      return false;
    }
    this.unlockExpansion(expansionId);
    return true;
  }

  unlockExpansion(expansionId) {
    const expansion = this.expansions.get(expansionId);
    if (!expansion || expansion.unlocked) {
      return false;
    }

    expansion.unlocked = true;
    expansion.contentGroup.visible = true;
    this.expandWorldBounds(expansion.bounds);
    expansion.zone.setActive(false);
    this.uiManager.hideBuyZoneOverlay(expansion.overlay);
    this._animateFenceOpening(expansion.fenceGroup);
    if (this.onExpansionUnlocked) {
      this.onExpansionUnlocked(expansion);
    }
    return true;
  }

  _animateFenceOpening(fenceGroup) {
    if (!fenceGroup || !this.tweenManager) {
      if (fenceGroup) {
        fenceGroup.visible = false;
      }
      return;
    }

    const posts = [];
    fenceGroup.traverse((object) => {
      if (object.userData.fencePost) {
        posts.push(object);
      }
    });

    posts.forEach((post, index) => {
      const startY = post.position.y;
      const tween = new Tween(
        post.position,
        'y',
        startY,
        -1.35,
        0.72,
        {
          delay: index * 0.055,
          easing: easeInOutCubic,
          onComplete: () => {
            post.visible = false;
            if (posts[index] === post && index === posts.length - 1) {
              fenceGroup.visible = false;
            }
          },
        },
      );
      this.tweenManager.add(tween);
    });
  }

  expandWorldBounds(bounds) {
    this.worldBounds.minX = Math.min(this.worldBounds.minX, bounds.minX);
    this.worldBounds.maxX = Math.max(this.worldBounds.maxX, bounds.maxX);
    this.worldBounds.minZ = Math.min(this.worldBounds.minZ, bounds.minZ);
    this.worldBounds.maxZ = Math.max(this.worldBounds.maxZ, bounds.maxZ);
  }

  clampToBounds(position) {
    position.x = Math.max(this.worldBounds.minX, Math.min(this.worldBounds.maxX, position.x));
    position.z = Math.max(this.worldBounds.minZ, Math.min(this.worldBounds.maxZ, position.z));
  }

  getExpansionSpawnPoints() {
    const expansion = this.expansions.get('fishingArea');
    if (!expansion || !expansion.unlocked) {
      return [];
    }
    const points = [];
    for (let index = 0; index < 12; index += 1) {
      points.push({
        x: randomRange(42, 82),
        z: randomRange(-30, 30),
        type: index % 3 === 0 ? 'rawMeat' : index % 3 === 1 ? 'wood' : 'cash',
      });
    }
    return points;
  }

  getExpansionContentGroup() {
    const expansion = this.expansions.get('fishingArea');
    return expansion ? expansion.contentGroup : null;
  }

  update(deltaTime) {
    if (this.campfireMesh && this.campfireMesh.userData.flame) {
      const flame = this.campfireMesh.userData.flame;
      const innerFlame = this.campfireMesh.userData.innerFlame;
      const pulse = Math.sin(performance.now() * 0.008);
      flame.scale.y = 1 + pulse * 0.18;
      flame.rotation.y += deltaTime * 1.8;
      if (innerFlame) {
        innerFlame.scale.y = 1 - pulse * 0.14;
        innerFlame.rotation.y -= deltaTime * 2.6;
      }
    }
  }

  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this.campfireZone.dispose(this.scene);
    this.sellingZone.dispose(this.scene);
    this.buyZoneTrigger.dispose(this.scene);
    this.scene.remove(this.terrain);
    this.scene.remove(this.campfireMesh);
    Object.values(this.fenceGroups).forEach((group) => this.scene.remove(group));
    this._decorations.forEach((object) => this.scene.remove(object));
    this._decorations.length = 0;
    this.expansions.forEach((expansion) => this.scene.remove(expansion.contentGroup));
    for (const object of this._localDisposables) {
      this.scene.remove(object);
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        object.material.dispose();
      }
    }
    this._localDisposables.length = 0;
    this.terrain.geometry.dispose();
    this.terrain.material.dispose();
  }
}

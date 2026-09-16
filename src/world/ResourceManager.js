import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig.js';

export class ResourceManager {
  constructor(scene, assetFactory, inventory, mapManager, options = {}) {
    this.scene = scene;
    this.assetFactory = assetFactory;
    this.inventory = inventory;
    this.mapManager = mapManager;
    this.collectionRadius = options.collectionRadius ?? GAME_CONFIG.collectionRadius;
    this.collectionRadiusSquared = this.collectionRadius ** 2;
    this.collectibles = [];
    this.onCollect = typeof options.onCollect === 'function' ? options.onCollect : null;
    this.onError = typeof options.onError === 'function' ? options.onError : null;
    this._disposed = false;
  }

  spawnStartingResources() {
    const types = ['wood', 'wood', 'wood', 'rawMeat', 'rawMeat', 'cash'];
    for (let index = 0; index < 36; index += 1) {
      const type = types[index % types.length];
      const x = (Math.random() - 0.5) * 58;
      const z = (Math.random() - 0.5) * 58;
      this.spawnResource(type, x, z, this.scene);
    }
  }

  spawnResource(type, x, z, parent = this.scene) {
    if (!parent) {
      return null;
    }
    const mesh = this.assetFactory.createResourceMesh(type);
    if (!mesh) {
      return null;
    }
    mesh.position.set(x, mesh.userData.resourceHeight / 2 || 0.1, z);
    mesh.userData.resourceType = type;
    mesh.userData.collected = false;
    mesh.userData.spawnParent = parent;
    parent.add(mesh);
    this.collectibles.push(mesh);
    return mesh;
  }

  update(playerPosition) {
    if (this._disposed) {
      return;
    }
    for (let index = this.collectibles.length - 1; index >= 0; index -= 1) {
      const resource = this.collectibles[index];
      if (!resource || resource.userData.collected) {
        continue;
      }
      const dx = resource.position.x - playerPosition.x;
      const dz = resource.position.z - playerPosition.z;
      if (dx * dx + dz * dz <= this.collectionRadiusSquared) {
        this.collectResource(resource);
      }
    }
  }

  collectResource(resource) {
    if (!resource || resource.userData.collected) {
      return false;
    }
    resource.userData.collected = true;
    const parent = resource.userData.spawnParent || resource.parent;
    if (parent) {
      parent.remove(resource);
    }
    const index = this.collectibles.indexOf(resource);
    if (index >= 0) {
      this.collectibles.splice(index, 1);
    }
    this.inventory.add(resource.userData.resourceType);
    if (this.onCollect) {
      try {
        this.onCollect(resource.userData.resourceType);
      } catch (error) {
        this.reportError(error, { phase: 'collect-callback' });
      }
    }
    return true;
  }

  spawnExpansionResources() {
    const points = this.mapManager.getExpansionSpawnPoints();
    const contentGroup = this.mapManager.getExpansionContentGroup();
    if (!contentGroup) {
      return;
    }
    points.forEach((point) => this.spawnResource(point.type, point.x, point.z, contentGroup));
  }

  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    for (const resource of this.collectibles) {
      const parent = resource.userData.spawnParent || resource.parent;
      if (parent) {
        parent.remove(resource);
      }
    }
    this.collectibles.length = 0;
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

import * as THREE from 'three';

export class InventoryStack {
  constructor(player, assetFactory, options = {}) {
    this.player = player;
    this.assetFactory = assetFactory;
    this.gap = options.gap || 0.075;
    this.items = [];
    this.currentStackHeight = 0;
    this.nextId = 1;
    this.group = new THREE.Group();
    this.group.name = 'InventoryStack';
    this._box = new THREE.Box3();

    this.mount = player.userData.inventoryMount;
    if (!this.mount) {
      this.mount = new THREE.Object3D();
      this.mount.name = 'InventoryMount';
      this.mount.position.set(0, 1.08, 0.42);
      player.add(this.mount);
      player.userData.inventoryMount = this.mount;
    }
    this.mount.add(this.group);
  }

  add(type) {
    const source = this.assetFactory.createResourceMesh(type);
    if (!source) {
      return null;
    }

    const mesh = source.clone();
    mesh.geometry = source.geometry.clone();
    mesh.material = source.material.clone();
    mesh.position.set(0, 0, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this._box.makeEmpty();
    this._box.setFromObject(mesh);
    const height = Math.max(0.01, this._box.max.y - this._box.min.y);
    const item = {
      id: `${type}-${this.nextId}`,
      type,
      mesh,
      height,
    };
    this.nextId += 1;
    this.items.push(item);
    this.group.add(mesh);
    this.reflow();
    return item;
  }

  remove(type) {
    let index = -1;
    for (let itemIndex = this.items.length - 1; itemIndex >= 0; itemIndex -= 1) {
      if (this.items[itemIndex].type === type) {
        index = itemIndex;
        break;
      }
    }
    if (index < 0) {
      return null;
    }
    const [item] = this.items.splice(index, 1);
    this.group.remove(item.mesh);
    this._disposeMesh(item.mesh);
    this.reflow();
    return item;
  }

  removeTop() {
    if (this.items.length === 0) {
      return null;
    }
    const item = this.items.pop();
    this.group.remove(item.mesh);
    this._disposeMesh(item.mesh);
    this.reflow();
    return item;
  }

  has(type) {
    return this.items.some((item) => item.type === type);
  }

  count(type) {
    let amount = 0;
    for (const item of this.items) {
      if (item.type === type) {
        amount += 1;
      }
    }
    return amount;
  }

  getItems() {
    return this.items.slice();
  }

  getTopItem() {
    if (this.items.length === 0) {
      return null;
    }
    return this.items[this.items.length - 1];
  }

  clear() {
    for (const item of this.items) {
      this.group.remove(item.mesh);
      this._disposeMesh(item.mesh);
    }
    this.items.length = 0;
    this.currentStackHeight = 0;
  }

  reflow() {
    let y = 0;
    for (const item of this.items) {
      item.mesh.position.y = y + item.height / 2;
      y += item.height + this.gap;
    }
    this.currentStackHeight = Math.max(0, y - this.gap);
  }

  _disposeMesh(mesh) {
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  dispose() {
    this.clear();
    this.mount.remove(this.group);
  }
}

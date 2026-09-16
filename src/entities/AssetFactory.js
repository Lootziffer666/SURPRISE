import * as THREE from 'three';
import { randomRange } from '../utils/MathUtils.js';

export class AssetFactory {
  constructor() {
    this.sharedGeometries = new Map();
    this.sharedMaterials = new Map();
    this._createSharedAssets();
  }

  _createSharedAssets() {
    this.sharedGeometries.set('playerBody', new THREE.CapsuleGeometry(0.34, 0.72, 8, 16));
    this.sharedGeometries.set('playerHead', new THREE.SphereGeometry(0.24, 14, 12));
    this.sharedGeometries.set('playerArm', new THREE.CylinderGeometry(0.065, 0.075, 0.48, 8));
    this.sharedGeometries.set('playerLeg', new THREE.CylinderGeometry(0.075, 0.085, 0.54, 8));
    this.sharedGeometries.set('backpack', new THREE.BoxGeometry(0.34, 0.46, 0.24));
    this.sharedGeometries.set('trunk', new THREE.CylinderGeometry(0.13, 0.19, 1.2, 7));
    this.sharedGeometries.set('treeCone', new THREE.ConeGeometry(0.82, 0.92, 8));
    this.sharedGeometries.set('snowCap', new THREE.ConeGeometry(0.24, 0.24, 8));
    this.sharedGeometries.set('bearBody', new THREE.BoxGeometry(1.0, 0.56, 1.58));
    this.sharedGeometries.set('bearHead', new THREE.SphereGeometry(0.32, 12, 10));
    this.sharedGeometries.set('bearLeg', new THREE.CylinderGeometry(0.11, 0.12, 0.44, 7));
    this.sharedGeometries.set('bearNose', new THREE.SphereGeometry(0.055, 7, 6));
    this.sharedGeometries.set('wood', new THREE.CylinderGeometry(0.085, 0.085, 0.56, 8));
    this.sharedGeometries.set('rawMeat', new THREE.BoxGeometry(0.36, 0.1, 0.24));
    this.sharedGeometries.set('cookedMeat', new THREE.BoxGeometry(0.34, 0.12, 0.22));
    this.sharedGeometries.set('cash', new THREE.BoxGeometry(0.28, 0.18, 0.2));
    this.sharedGeometries.set('fencePost', new THREE.CylinderGeometry(0.08, 0.1, 1.16, 7));
    this.sharedGeometries.set('log', new THREE.CylinderGeometry(0.08, 0.09, 0.68, 7));
    this.sharedGeometries.set('stone', new THREE.DodecahedronGeometry(0.12, 0));
    this.sharedGeometries.set('flameOuter', new THREE.ConeGeometry(0.34, 0.82, 8));
    this.sharedGeometries.set('flameInner', new THREE.ConeGeometry(0.18, 0.52, 8));
    this.sharedGeometries.set('pond', new THREE.CircleGeometry(7, 28));
    this.sharedGeometries.set('terrain', new THREE.PlaneGeometry(1, 1));
    this.sharedGeometries.set('markerPole', new THREE.CylinderGeometry(0.055, 0.055, 2.1, 7));
    this.sharedGeometries.set('markerSign', new THREE.BoxGeometry(1.05, 0.44, 0.06));
    this.sharedGeometries.set('stallPost', new THREE.CylinderGeometry(0.07, 0.08, 1.5, 7));
    this.sharedGeometries.set('stallCanopy', new THREE.ConeGeometry(1.05, 0.42, 6));
    this.sharedGeometries.set('stallCounter', new THREE.BoxGeometry(1.2, 0.32, 0.62));

    this.sharedMaterials.set('playerBody', new THREE.MeshStandardMaterial({ color: 0x2f74ff, roughness: 0.55, metalness: 0.02 }));
    this.sharedMaterials.set('playerSkin', new THREE.MeshStandardMaterial({ color: 0xffc59a, roughness: 0.72 }));
    this.sharedMaterials.set('backpack', new THREE.MeshStandardMaterial({ color: 0x173b8f, roughness: 0.68 }));
    this.sharedMaterials.set('trunk', new THREE.MeshStandardMaterial({ color: 0x704725, roughness: 0.9 }));
    this.sharedMaterials.set('treeGreen', new THREE.MeshStandardMaterial({ color: 0x2f7a3d, roughness: 0.82 }));
    this.sharedMaterials.set('treeGreenDark', new THREE.MeshStandardMaterial({ color: 0x245f32, roughness: 0.86 }));
    this.sharedMaterials.set('snow', new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 }));
    this.sharedMaterials.set('bearFur', new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.88 }));
    this.sharedMaterials.set('bearFurDark', new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.9 }));
    this.sharedMaterials.set('dark', new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.72 }));
    this.sharedMaterials.set('wood', new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.86 }));
    this.sharedMaterials.set('rawMeat', new THREE.MeshStandardMaterial({ color: 0xd64545, roughness: 0.62 }));
    this.sharedMaterials.set('cookedMeat', new THREE.MeshStandardMaterial({ color: 0x9a5425, roughness: 0.72 }));
    this.sharedMaterials.set('cash', new THREE.MeshStandardMaterial({ color: 0x37d66b, roughness: 0.48, emissive: 0x0d4d24, emissiveIntensity: 0.18 }));
    this.sharedMaterials.set('fence', new THREE.MeshStandardMaterial({ color: 0x9b6b3a, roughness: 0.9 }));
    this.sharedMaterials.set('stone', new THREE.MeshStandardMaterial({ color: 0x9aa6b1, roughness: 0.95 }));
    this.sharedMaterials.set('flameOuter', new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, opacity: 0.82 }));
    this.sharedMaterials.set('flameInner', new THREE.MeshBasicMaterial({ color: 0xffd15a, transparent: true, opacity: 0.95 }));
    this.sharedMaterials.set('pond', new THREE.MeshStandardMaterial({ color: 0x3e8bd4, roughness: 0.18, metalness: 0.18, transparent: true, opacity: 0.88 }));
    this.sharedMaterials.set('markerPole', new THREE.MeshStandardMaterial({ color: 0x7b8794, roughness: 0.62 }));
    this.sharedMaterials.set('markerSign', new THREE.MeshStandardMaterial({ color: 0xffd34e, roughness: 0.58, emissive: 0x6b4b00, emissiveIntensity: 0.2 }));
    this.sharedMaterials.set('stallPost', new THREE.MeshStandardMaterial({ color: 0x7b5632, roughness: 0.86 }));
    this.sharedMaterials.set('stallCanopy', new THREE.MeshStandardMaterial({ color: 0xe84f63, roughness: 0.68 }));
    this.sharedMaterials.set('stallCounter', new THREE.MeshStandardMaterial({ color: 0xb6814c, roughness: 0.82 }));
  }

  _geometry(name) {
    return this.sharedGeometries.get(name);
  }

  _material(name) {
    return this.sharedMaterials.get(name);
  }

  _mesh(geometryName, materialName) {
    const geometry = this._geometry(geometryName);
    const material = this._material(materialName);
    if (!geometry || !material) {
      throw new Error(`Missing asset: ${geometryName}, ${materialName}`);
    }
    return new THREE.Mesh(geometry, material);
  }

  createPlayer() {
    const player = new THREE.Group();
    player.name = 'Player';

    const body = new THREE.Mesh(this._geometry('playerBody'), this._material('playerBody'));
    body.position.y = 0.7;
    body.castShadow = true;
    body.receiveShadow = true;
    player.add(body);

    const head = new THREE.Mesh(this._geometry('playerHead'), this._material('playerSkin'));
    head.position.y = 1.38;
    head.castShadow = true;
    player.add(head);

    const backpack = new THREE.Mesh(this._geometry('backpack'), this._material('backpack'));
    backpack.position.set(0, 0.78, 0.42);
    backpack.castShadow = true;
    backpack.receiveShadow = true;
    player.add(backpack);

    const inventoryMount = new THREE.Object3D();
    inventoryMount.name = 'InventoryMount';
    inventoryMount.position.set(0, 1.08, 0.42);
    player.add(inventoryMount);
    player.userData.inventoryMount = inventoryMount;
    player.userData.backpack = backpack;

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(this._geometry('playerArm'), this._material('playerBody'));
      arm.position.set(side * 0.34, 0.9, -0.02);
      arm.rotation.z = side * 0.28;
      arm.castShadow = true;
      player.add(arm);
    }

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(this._geometry('playerLeg'), this._material('backpack'));
      leg.position.set(side * 0.17, 0.27, 0);
      leg.castShadow = true;
      player.add(leg);
    }

    return player;
  }

  createTree() {
    const tree = new THREE.Group();
    tree.name = 'Tree';

    const trunk = new THREE.Mesh(this._geometry('trunk'), this._material('trunk'));
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const coneCount = 3;
    for (let index = 0; index < coneCount; index += 1) {
      const cone = new THREE.Mesh(this._geometry('treeCone'), this._material(index % 2 === 0 ? 'treeGreen' : 'treeGreenDark'));
      const scale = 1 - index * 0.16;
      cone.scale.setScalar(scale);
      cone.position.y = 1.16 + index * 0.42;
      cone.castShadow = true;
      cone.receiveShadow = true;
      tree.add(cone);
    }

    const snowCap = new THREE.Mesh(this._geometry('snowCap'), this._material('snow'));
    snowCap.position.y = 2.14;
    snowCap.castShadow = true;
    tree.add(snowCap);

    const variation = randomRange(0.82, 1.22);
    tree.scale.set(variation, randomRange(0.9, 1.18), variation);
    tree.rotation.y = randomRange(0, Math.PI * 2);
    return tree;
  }

  createBear() {
    const bear = new THREE.Group();
    bear.name = 'Bear';

    const body = new THREE.Mesh(this._geometry('bearBody'), this._material('bearFur'));
    body.position.y = 0.55;
    body.castShadow = true;
    body.receiveShadow = true;
    bear.add(body);

    const head = new THREE.Mesh(this._geometry('bearHead'), this._material('bearFur'));
    head.position.set(0, 0.95, 0.72);
    head.castShadow = true;
    bear.add(head);

    const nose = new THREE.Mesh(this._geometry('bearNose'), this._material('dark'));
    nose.position.set(0, 0.98, 1.02);
    bear.add(nose);

    for (const side of [-1, 1]) {
      for (const depth of [-1, 1]) {
        const leg = new THREE.Mesh(this._geometry('bearLeg'), this._material('bearFurDark'));
        leg.position.set(side * 0.34, 0.22, depth * 0.48);
        leg.castShadow = true;
        bear.add(leg);
      }
    }

    bear.rotation.y = randomRange(0, Math.PI * 2);
    const scale = randomRange(0.82, 1.12);
    bear.scale.setScalar(scale);
    return bear;
  }

  createWood() {
    const mesh = new THREE.Mesh(this._geometry('wood'), this._material('wood'));
    mesh.rotation.z = Math.PI / 2;
    mesh.position.y = 0.12;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.resourceType = 'wood';
    mesh.userData.resourceHeight = 0.17;
    return mesh;
  }

  createRawMeat() {
    const mesh = new THREE.Mesh(this._geometry('rawMeat'), this._material('rawMeat'));
    mesh.position.y = 0.05;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.resourceType = 'rawMeat';
    mesh.userData.resourceHeight = 0.1;
    return mesh;
  }

  createCookedMeat() {
    const mesh = new THREE.Mesh(this._geometry('cookedMeat'), this._material('cookedMeat'));
    mesh.position.y = 0.06;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.resourceType = 'cookedMeat';
    mesh.userData.resourceHeight = 0.12;
    return mesh;
  }

  createCash() {
    const mesh = new THREE.Mesh(this._geometry('cash'), this._material('cash'));
    mesh.position.y = 0.09;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.resourceType = 'cash';
    mesh.userData.resourceHeight = 0.18;
    return mesh;
  }

  createFencePost() {
    const mesh = new THREE.Mesh(this._geometry('fencePost'), this._material('fence'));
    mesh.position.y = 0.58;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.fencePost = true;
    return mesh;
  }

  createCampfire() {
    const campfire = new THREE.Group();
    campfire.name = 'Campfire';

    for (let index = 0; index < 5; index += 1) {
      const log = new THREE.Mesh(this._geometry('log'), this._material('wood'));
      const angle = (index / 5) * Math.PI * 2;
      log.position.set(Math.cos(angle) * 0.24, 0.14, Math.sin(angle) * 0.24);
      log.rotation.set(Math.PI / 2, 0, angle);
      log.castShadow = true;
      log.receiveShadow = true;
      campfire.add(log);
    }

    for (let index = 0; index < 6; index += 1) {
      const stone = new THREE.Mesh(this._geometry('stone'), this._material('stone'));
      const angle = (index / 6) * Math.PI * 2 + 0.2;
      stone.position.set(Math.cos(angle) * 0.62, 0.08, Math.sin(angle) * 0.62);
      stone.rotation.set(randomRange(0, Math.PI), randomRange(0, Math.PI), randomRange(0, Math.PI));
      stone.castShadow = true;
      campfire.add(stone);
    }

    const flame = new THREE.Mesh(this._geometry('flameOuter'), this._material('flameOuter'));
    flame.position.y = 0.68;
    flame.castShadow = false;
    campfire.add(flame);

    const innerFlame = new THREE.Mesh(this._geometry('flameInner'), this._material('flameInner'));
    innerFlame.position.y = 0.58;
    innerFlame.castShadow = false;
    campfire.add(innerFlame);

    campfire.userData.flame = flame;
    campfire.userData.innerFlame = innerFlame;
    return campfire;
  }

  createPond() {
    const pond = new THREE.Mesh(this._geometry('pond'), this._material('pond'));
    pond.rotation.x = -Math.PI / 2;
    pond.receiveShadow = true;
    return pond;
  }

  createBuyZoneMarker() {
    const marker = new THREE.Group();
    marker.name = 'BuyZoneMarker';

    const pole = new THREE.Mesh(this._geometry('markerPole'), this._material('markerPole'));
    pole.position.y = 1.05;
    pole.castShadow = true;
    marker.add(pole);

    const sign = new THREE.Mesh(this._geometry('markerSign'), this._material('markerSign'));
    sign.position.y = 1.92;
    sign.castShadow = true;
    marker.add(sign);

    return marker;
  }

  createMarketStall() {
    const stall = new THREE.Group();
    stall.name = 'MarketStall';

    for (const side of [-1, 1]) {
      for (const depth of [-1, 1]) {
        const post = new THREE.Mesh(this._geometry('stallPost'), this._material('stallPost'));
        post.position.set(side * 0.58, 0.75, depth * 0.32);
        post.castShadow = true;
        post.receiveShadow = true;
        stall.add(post);
      }
    }

    const counter = new THREE.Mesh(this._geometry('stallCounter'), this._material('stallCounter'));
    counter.position.set(0, 0.16, 0);
    counter.castShadow = true;
    counter.receiveShadow = true;
    stall.add(counter);

    const canopy = new THREE.Mesh(this._geometry('stallCanopy'), this._material('stallCanopy'));
    canopy.position.set(0, 1.34, 0);
    canopy.rotation.y = Math.PI / 6;
    canopy.castShadow = true;
    stall.add(canopy);

    return stall;
  }

  createResourceMesh(type) {
    switch (type) {
      case 'wood':
        return this.createWood();
      case 'rawMeat':
        return this.createRawMeat();
      case 'cookedMeat':
        return this.createCookedMeat();
      case 'cash':
        return this.createCash();
      default:
        return null;
    }
  }

  dispose() {
    this.sharedGeometries.forEach((geometry) => geometry.dispose());
    this.sharedMaterials.forEach((material) => material.dispose());
    this.sharedGeometries.clear();
    this.sharedMaterials.clear();
  }
}

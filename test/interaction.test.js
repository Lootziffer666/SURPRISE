import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FishingSpot } from '../src/interaction/FishingSpot.js';

test('test_fishing_spot_consumes_bait_and_adds_fish', () => {
  const inventory = {
    wood: 2,
    fish: 0,
    has(type) {
      return this[type] > 0;
    },
    remove(type) {
      if (!this.has(type)) {
        return null;
      }
      this[type] -= 1;
      return { type };
    },
    add(type) {
      this[type] += 1;
      return { type };
    },
  };
  const assetFactory = {
    createFishingSpot() {
      const spot = new THREE.Group();
      spot.userData.bobber = new THREE.Mesh(new THREE.SphereGeometry(0.1));
      return spot;
    },
  };
  const fishingSpot = new FishingSpot(new THREE.Vector3(4, 0, 4), assetFactory, inventory, {
    fishingDuration: 1,
    catchChance: 1,
    catchCooldown: 0,
  });
  fishingSpot.setActive(true);
  fishingSpot.zone.isPlayerInside = true;

  fishingSpot.update(0.5);
  assert.equal(inventory.wood, 1);
  assert.equal(fishingSpot.isFishing, true);
  fishingSpot.update(0.5);
  assert.equal(inventory.wood, 1);
  assert.equal(inventory.fish, 1);
  assert.equal(fishingSpot.isFishing, false);

  fishingSpot.dispose();
});

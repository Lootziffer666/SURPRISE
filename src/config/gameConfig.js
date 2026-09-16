export const GAME_CONFIG = Object.freeze({
  playerSpeed: 6.2,
  rotationSpeed: 11,
  clickStopDistance: 0.28,
  collectionRadius: 1.45,
  expansionCost: 200,
  processingDuration: 1,
  sellDelay: 0.2,
  fishingDuration: 1.8,
  fishingCatchCooldown: 1.2,
  fishingCatchChance: 0.85,
  snowflakeCount: 240,
});

export const RESOURCE_PRICES = Object.freeze({
  cookedMeat: 10,
  wood: 5,
  fish: 8,
});

export const STARTING_RESOURCE_TYPES = Object.freeze([
  'wood',
  'wood',
  'wood',
  'rawMeat',
  'rawMeat',
  'cash',
]);

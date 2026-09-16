const labels = {
  en: {
    cash: 'Cash',
    inventory: 'Inventory',
    emptyInventory: 'Empty',
    pause: 'Pause',
    resume: 'Resume',
    mute: 'Mute',
    unmute: 'Unmute',
    snowOn: 'Snow: on',
    snowOff: 'Snow: off',
    moveHint: 'WASD / Arrows / Tap to move',
    initialStatus: 'Collect resources, cook meat, and reach the market.',
    cookingStatus: 'Cooking raw meat...',
    cookedReady: 'Cooked meat ready.',
    fishingStatus: 'Fishing... stay near the dock.',
    fishingCatch: 'You caught a fish.',
    fishingMiss: 'No bite yet. Try again.',
    fishingUnlocked: 'Fishing area unlocked. Spend wood at the dock to fish.',
    fishingOpen: 'The fishing area is open. Follow the path east.',
    insufficientFunds: (cost) => `You need $${cost} to unlock the fishing area.`,
    sold: (label, price) => `Sold ${label} for $${price}.`,
    gameInterrupted: 'Game interrupted',
    unexpectedError: 'The game stopped unexpectedly.',
  },
};

export function getLabel(key, locale = 'en', ...args) {
  const value = labels[locale]?.[key] ?? labels.en[key];
  if (typeof value === 'function') {
    return value(...args);
  }
  return value ?? key;
}

export class GameState {
  constructor(initialCash = 0) {
    this.cash = initialCash;
    this.subscribers = new Map();
  }

  getCash() {
    return this.cash;
  }

  addCash(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return this.cash;
    }
    this.cash += amount;
    this.emit('cashChanged', this.cash);
    return this.cash;
  }

  spendCash(amount) {
    if (!Number.isFinite(amount) || amount <= 0 || !this.canAfford(amount)) {
      return false;
    }
    this.cash -= amount;
    this.emit('cashChanged', this.cash);
    return true;
  }

  canAfford(amount) {
    return this.cash >= amount;
  }

  subscribe(eventName, callback) {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, new Set());
    }
    this.subscribers.get(eventName).add(callback);
    return () => this.unsubscribe(eventName, callback);
  }

  unsubscribe(eventName, callback) {
    const callbacks = this.subscribers.get(eventName);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(eventName, payload) {
    const callbacks = this.subscribers.get(eventName);
    if (!callbacks) {
      return;
    }
    callbacks.forEach((callback) => callback(payload));
  }
}

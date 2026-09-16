export class GameState {
  constructor(initialCash = 0, options = {}) {
    const initial = Number(initialCash);
    this.cash = Number.isFinite(initial) ? Math.max(0, initial) : 0;
    this.subscribers = new Map();
    this.onError = typeof options.onError === 'function' ? options.onError : null;
    this.lastError = null;
  }

  getCash() {
    return this.cash;
  }

  setCash(amount) {
    if (!Number.isFinite(amount) || amount < 0) {
      return this.cash;
    }
    this.cash = amount;
    this.emit('cashChanged', this.cash);
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
    return Number.isFinite(amount) && this.cash >= amount;
  }

  subscribe(eventName, callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }
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
    for (const callback of Array.from(callbacks)) {
      try {
        callback(payload);
      } catch (error) {
        this.reportError(error, { eventName, payload });
      }
    }
  }

  reportError(error, context = {}) {
    this.lastError = error instanceof Error ? error : new Error(String(error));
    if (!this.onError) {
      return;
    }
    try {
      this.onError(this.lastError, context);
    } catch {
      this.lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  serialize() {
    return {
      cash: this.cash,
    };
  }

  restore(snapshot = {}) {
    return this.setCash(snapshot.cash);
  }
}

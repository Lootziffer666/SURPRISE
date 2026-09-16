import { GameManager } from './core/GameManager.js';

const game = new GameManager();

window.addEventListener('beforeunload', () => {
  game.dispose();
});

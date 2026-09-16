import './styles/main.css';
import { GameManager } from './core/GameManager.js';

let game = null;

function showFatalError(error) {
  const overlay = document.getElementById('fatal-error');
  const message = document.getElementById('fatal-error-message');
  if (message) {
    message.textContent = error instanceof Error ? error.message : String(error);
  }
  if (overlay) {
    overlay.hidden = false;
  }
}

try {
  game = new GameManager();
  window.__snowResourceGame = game;
} catch (error) {
  showFatalError(error);
}

import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig.js';

export class PlayerController {
  constructor(player, camera, mapManager, options = {}) {
    this.player = player;
    this.camera = camera;
    this.mapManager = mapManager;
    this.speed = options.speed ?? GAME_CONFIG.playerSpeed;
    this.rotationSpeed = options.rotationSpeed ?? GAME_CONFIG.rotationSpeed;
    this.clickStopDistance = options.clickStopDistance ?? GAME_CONFIG.clickStopDistance;
    this.gamepadIndex = options.gamepadIndex ?? 0;
    this.keys = new Set();
    this.moveDirection = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.clickDestination = new THREE.Vector3();
    this.clickActive = false;
    this.isMoving = false;
    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._keyboardDirection = new THREE.Vector3();
    this._clickDirection = new THREE.Vector3();
    this._targetPosition = new THREE.Vector3();
    this._targetMatrix = new THREE.Matrix4();
    this._targetQuaternion = new THREE.Quaternion();
    this._bound = false;
    this._domElement = null;
  }

  bindEvents(domElement) {
    if (this._bound) {
      return;
    }
    this._bound = true;
    this._domElement = domElement;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onWindowBlur = this._onWindowBlur.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onWindowBlur);
    domElement.addEventListener('pointerdown', this._onPointerDown);
  }

  dispose() {
    if (!this._bound) {
      return;
    }
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onWindowBlur);
    this._domElement.removeEventListener('pointerdown', this._onPointerDown);
    this._bound = false;
    this.keys.clear();
  }

  _onKeyDown(event) {
    const key = String(event.key || '').toLowerCase();
    if (this._isMovementKey(key)) {
      event.preventDefault();
      this.keys.add(key);
    }
  }

  _onKeyUp(event) {
    const key = String(event.key || '').toLowerCase();
    if (this._isMovementKey(key)) {
      event.preventDefault();
      this.keys.delete(key);
    }
  }

  _onWindowBlur() {
    this.keys.clear();
  }

  _isMovementKey(key) {
    return key === 'w' || key === 'a' || key === 's' || key === 'd' || key.startsWith('arrow');
  }

  _onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    const rect = this._domElement.getBoundingClientRect();
    this.pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hitPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint)) {
      this.clickDestination.copy(hitPoint);
      this.clickDestination.y = 0;
      this.clickActive = true;
    }
  }

  readInput() {
    this._keyboardDirection.set(0, 0, 0);
    this._getCameraGroundVectors();

    if (this.keys.has('w') || this.keys.has('arrowup')) {
      this._keyboardDirection.add(this._forward);
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      this._keyboardDirection.sub(this._forward);
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      this._keyboardDirection.add(this._right);
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this._keyboardDirection.sub(this._right);
    }

    const gamepad = navigator.getGamepads?.()[this.gamepadIndex];
    if (gamepad) {
      const axisX = Math.abs(gamepad.axes[0] || 0) > 0.18 ? gamepad.axes[0] : 0;
      const axisY = Math.abs(gamepad.axes[1] || 0) > 0.18 ? gamepad.axes[1] : 0;
      if (axisX || axisY) {
        this._keyboardDirection.set(axisX, 0, axisY).normalize();
      }
    }

    if (this._keyboardDirection.lengthSq() > 0.0001) {
      this._keyboardDirection.normalize();
      this.clickActive = false;
      this.clickDestination.set(0, 0, 0);
      this.moveDirection.copy(this._keyboardDirection);
      return;
    }

    if (this.clickActive) {
      this._clickDirection.subVectors(this.clickDestination, this.player.position);
      this._clickDirection.y = 0;
      const distance = this._clickDirection.length();
      if (distance > this.clickStopDistance) {
        this._clickDirection.normalize();
        this.moveDirection.copy(this._clickDirection);
        return;
      }
      this.clickActive = false;
    }

    this.moveDirection.set(0, 0, 0);
  }

  _getCameraGroundVectors() {
    this.camera.getWorldDirection(this._forward);
    this._forward.y = 0;
    if (this._forward.lengthSq() < 0.0001) {
      this._forward.set(0, 0, -1);
    } else {
      this._forward.normalize();
    }

    this.camera.updateMatrixWorld();
    this._right.setFromMatrixColumn(this.camera.matrixWorld, 0);
    this._right.y = 0;
    if (this._right.lengthSq() < 0.0001) {
      this._forward.set(0, 0, 0);
    } else {
      this._right.crossVectors(this._forward, new THREE.Vector3(0, 1, 0)).normalize();
    }
  }

  update(deltaTime) {
    this.readInput();
    const safeDelta = Math.max(0, deltaTime);
    this.player.position.addScaledVector(this.moveDirection, this.speed * safeDelta);
    this.mapManager.clampToBounds(this.player.position);
    this.velocity.copy(this.moveDirection).multiplyScalar(this.speed);
    this.isMoving = this.moveDirection.lengthSq() > 0.0001;

    if (this.isMoving) {
      this._targetPosition.copy(this.player.position).add(this.moveDirection);
      this._targetMatrix.lookAt(this.player.position, this._targetPosition, new THREE.Vector3(0, 1, 0));
      this._targetQuaternion.setFromRotationMatrix(this._targetMatrix);
      const rotationAmount = 1 - Math.exp(-this.rotationSpeed * safeDelta);
      this.player.quaternion.slerp(this._targetQuaternion, rotationAmount);
    }
  }
}

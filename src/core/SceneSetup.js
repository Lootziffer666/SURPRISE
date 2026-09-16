import * as THREE from 'three';

export class SceneSetup {
  constructor(options = {}) {
    this.onError = typeof options.onError === 'function' ? options.onError : null;
    this._disposed = false;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', 'Snow Resource Run game scene');
    this.renderer.domElement.setAttribute('tabindex', '0');
    this._onContextLost = this._handleContextLost.bind(this);
    this.renderer.domElement.addEventListener('webglcontextlost', this._onContextLost);
    const root = document.getElementById('game-root') || document.body;
    root.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9cc8e8);
    this.scene.fog = new THREE.Fog(0x9cc8e8, 110, 240);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    this.camera.position.set(48, 68, 48);
    this.camera.lookAt(0, 0, 0);

    this.cameraOffset = new THREE.Vector3(42, 62, 42);
    this.cameraTarget = new THREE.Vector3().copy(this.camera.position);
    this.cameraLookTarget = new THREE.Vector3();
    this.cameraPositionSmoothing = 4.8;
    this.cameraLookSmoothing = 7.5;
    this.viewHeight = 64;

    this._createLights();
    this.resize(window.innerWidth, window.innerHeight);
  }

  _createLights() {
    const hemisphere = new THREE.HemisphereLight(0xcfeaff, 0x637483, 1.05);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xffffff, 2.15);
    sun.position.set(55, 90, 38);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 240;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = 0.025;
    this.scene.add(sun);
    this.sun = sun;

    const fill = new THREE.DirectionalLight(0xbcd9ff, 0.35);
    fill.position.set(-45, 55, -50);
    this.scene.add(fill);
  }

  updateCamera(targetPosition, deltaTime) {
    const safeDelta = Math.max(0, deltaTime);
    this.cameraTarget.copy(targetPosition).add(this.cameraOffset);
    const positionAmount = 1 - Math.exp(-this.cameraPositionSmoothing * safeDelta);
    const lookAmount = 1 - Math.exp(-this.cameraLookSmoothing * safeDelta);
    this.camera.position.lerp(this.cameraTarget, positionAmount);
    this.cameraLookTarget.lerp(targetPosition, lookAmount);
    this.camera.lookAt(this.cameraLookTarget);
  }

  resize(width, height) {
    const safeWidth = Math.max(1, Math.floor(Number.isFinite(width) ? width : window.innerWidth));
    const safeHeight = Math.max(1, Math.floor(Number.isFinite(height) ? height : window.innerHeight));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(safeWidth, safeHeight, false);

    const aspect = safeWidth / safeHeight;
    const viewWidth = this.viewHeight * aspect;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = this.viewHeight / 2;
    this.camera.bottom = -this.viewHeight / 2;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this.renderer.domElement.removeEventListener('webglcontextlost', this._onContextLost);
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }

  _handleContextLost(event) {
    event.preventDefault();
    const error = new Error('The WebGL rendering context was lost.');
    if (this.onError) {
      try {
        this.onError(error, { phase: 'webgl-context' });
      } catch {
        return;
      }
    }
  }
}

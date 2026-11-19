// three.js による 3D キューブ表示とアニメーション
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MOVE_DEFS, COLORS } from './cube-model.js';

const FACE_DIRS = [
  ['R', [1, 0, 0]], ['L', [-1, 0, 0]],
  ['U', [0, 1, 0]], ['D', [0, -1, 0]],
  ['F', [0, 0, 1]], ['B', [0, 0, -1]],
];

function roundedSquare(size, r) {
  const s = size / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-s + r, -s);
  sh.lineTo(s - r, -s);
  sh.quadraticCurveTo(s, -s, s, -s + r);
  sh.lineTo(s, s - r);
  sh.quadraticCurveTo(s, s, s - r, s);
  sh.lineTo(-s + r, s);
  sh.quadraticCurveTo(-s, s, -s, s - r);
  sh.lineTo(-s, -s + r);
  sh.quadraticCurveTo(-s, -s, -s + r, -s);
  return sh;
}

const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

export class Cube3D {
  constructor(container, { onMove } = {}) {
    this.container = container;
    this.onMove = onMove;
    this.queue = [];
    this.current = null;
    this.duration = 220;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(5.2, 4.4, 7.6);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 20;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(4, 9, 7);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(-6, -3, -5);
    this.scene.add(fill);

    this.bodyGeo = new THREE.BoxGeometry(0.97, 0.97, 0.97);
    this.bodyMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.7 });
    this.stickerGeo = new THREE.ShapeGeometry(roundedSquare(0.84, 0.13));
    this.stickerMats = {};
    for (const [face, color] of Object.entries(COLORS)) {
      this.stickerMats[face] = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    }

    this.cubies = [];
    this.build();

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop((t) => this.tick(t));
  }

  build() {
    const zAxis = new THREE.Vector3(0, 0, 1);
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubie = new THREE.Group();
          cubie.add(new THREE.Mesh(this.bodyGeo, this.bodyMat));
          for (const [face, n] of FACE_DIRS) {
            if (x * n[0] + y * n[1] + z * n[2] !== 1) continue;
            const sticker = new THREE.Mesh(this.stickerGeo, this.stickerMats[face]);
            const normal = new THREE.Vector3(...n);
            sticker.position.copy(normal).multiplyScalar(0.487);
            sticker.quaternion.setFromUnitVectors(zAxis, normal);
            cubie.add(sticker);
          }
          cubie.position.set(x, y, z);
          this.scene.add(cubie);
          this.cubies.push(cubie);
        }
      }
    }
  }

  reset() {
    this.queue = [];
    if (this.current) {
      this.scene.remove(this.current.pivot);
      this.current = null;
    }
    for (const c of this.cubies) c.removeFromParent();
    this.cubies = [];
    this.build();
  }

  setSpeed(ms) {
    this.duration = ms;
  }

  isBusy() {
    return !!this.current || this.queue.length > 0;
  }

  enqueue(moves, { instant = false } = {}) {
    if (instant) {
      this.flush();
      for (const mv of moves) {
        this.startMove(mv);
        this.finishMove();
      }
    } else {
      this.queue.push(...moves);
    }
  }

  // 実行中・待機中の回転をすべて即座に完了させる
  flush() {
    if (this.current) this.finishMove();
    while (this.queue.length) {
      this.startMove(this.queue.shift());
      this.finishMove();
    }
  }

  startMove(move) {
    const [axis, layers, dir] = MOVE_DEFS[move.name];
    const angle = dir * (move.turns === 2 ? Math.PI : (move.turns * Math.PI) / 2);
    const pivot = new THREE.Object3D();
    this.scene.add(pivot);
    const selected = this.cubies.filter((c) => layers.includes(Math.round(c.position[axis])));
    for (const c of selected) pivot.attach(c);
    this.current = {
      move, pivot, selected, axis, angle, start: null,
      duration: this.duration * (move.turns === 2 ? 1.5 : 1),
    };
  }

  finishMove() {
    const { pivot, selected, axis, angle, move } = this.current;
    pivot.rotation[axis] = angle;
    pivot.updateMatrixWorld(true);
    const m = new THREE.Matrix4();
    for (const c of selected) {
      this.scene.attach(c);
      c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
      m.makeRotationFromQuaternion(c.quaternion);
      for (let i = 0; i < 16; i++) m.elements[i] = Math.round(m.elements[i]);
      c.quaternion.setFromRotationMatrix(m);
    }
    this.scene.remove(pivot);
    this.current = null;
    this.onMove?.(move);
  }

  tick(t) {
    if (!this.current && this.queue.length) this.startMove(this.queue.shift());
    if (this.current) {
      const cur = this.current;
      if (cur.start === null) cur.start = t;
      const p = cur.duration <= 0 ? 1 : Math.min(1, (t - cur.start) / cur.duration);
      cur.pivot.rotation[cur.axis] = cur.angle * ease(p);
      if (p >= 1) this.finishMove();
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resetView() {
    this.camera.position.set(5.2, 4.4, 7.6);
    this.controls.target.set(0, 0, 0);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}

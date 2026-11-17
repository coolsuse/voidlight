// Keyboard and mouse state, in the canvas's logical 1280x720 coordinates.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.mouse = { x: 640, y: 360, down: false, rightDown: false };
    this.pressedMouse = false;
    this.pressedRight = false;

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) {
        this.keys.add(e.code);
        this.pressedKeys.add(e.code);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
      this.mouse.rightDown = false;
    });

    canvas.addEventListener('mousemove', (e) => this.updateMouse(e));
    canvas.addEventListener('mousedown', (e) => {
      this.updateMouse(e);
      if (e.button === 0) {
        this.mouse.down = true;
        this.pressedMouse = true;
      } else if (e.button === 2) {
        this.mouse.rightDown = true;
        this.pressedRight = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  updateMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 1280;
    this.mouse.y = ((e.clientY - rect.top) / rect.height) * 720;
  }

  down(code) {
    return this.keys.has(code);
  }

  // Edge-triggered: true once per physical press, then consumed.
  pressed(code) {
    if (this.pressedKeys.has(code)) {
      this.pressedKeys.delete(code);
      return true;
    }
    return false;
  }

  pressedClick() {
    if (this.pressedMouse) {
      this.pressedMouse = false;
      return true;
    }
    return false;
  }

  pressedRightClick() {
    if (this.pressedRight) {
      this.pressedRight = false;
      return true;
    }
    return false;
  }

  // Movement vector from WASD or arrow keys, normalized.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  // Call at the end of each frame so stale presses do not leak into the next one.
  endFrame() {
    this.pressedKeys.clear();
    this.pressedMouse = false;
    this.pressedRight = false;
  }
}

class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
    this.collected = 0;
    this.totalFluffs = 1;
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.jumpWasDown = false;
    this.facing = 1;
    this.finished = false;
    this.inputLocked = true;
    this.cameraY = 0;
  }

  preload() {
    // v7.1: new file name to prevent old cache/path issues.
    this.load.image('paintedFluisterveldenV71', 'assets/art/fluistervelden-painted-bg-v7-1.png?v=fluistervelden-v7-1-art-background-fix');
  }

  create() {
    const s = window.FTTM.GameSettings;
    this.screenW = this.scale.width;
    this.screenH = this.scale.height;
    this.isPortrait = this.screenH >= this.screenW;

    // Art-direction build: the painted image is the visual level.
    // Keep zoom lower than v7.0 so the full scene is readable on landscape.
    this.worldW = this.isPortrait ? 2300 : 2600;
    this.worldH = this.isPortrait ? 1500 : 1200;
    this.worldZoom = this.isPortrait ? 0.52 : 0.58;
    if (!this.isPortrait && this.screenH < 390) this.worldZoom = 0.54;

    this.visibleW = this.screenW / this.worldZoom;
    this.visibleH = this.screenH / this.worldZoom;

    this.physics.world.gravity.y = s.gravity || 1550;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setZoom(this.worldZoom);
    this.cameras.main.setBackgroundColor('#071632');

    if (window.FTTM.hideFinishPanel) window.FTTM.hideFinishPanel();
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(0, this.totalFluffs);

    // Fill the designed world with the painted plate. This avoids the black/blue only screen if the old asset was too small/zoomed.
    this.background = this.add.image(0, 0, 'paintedFluisterveldenV71')
      .setOrigin(0, 0)
      .setDisplaySize(this.worldW, this.worldH)
      .setDepth(-100);

    this.createInvisibleGameplay();
    this.createPlayer();
    this.createCollectibles();
    this.createDebugArtPath();

    this.physics.add.overlap(this.playerBody, this.fluff, this.collectMoonFluff, null, this);
    this.physics.add.overlap(this.playerBody, this.finishZone, this.tryFinish, null, this);

    this.updateCamera(true);
    this.startIntroSequence();
    this.scale.on('resize', () => { if (!this.finished) this.scene.restart(); });
  }

  createInvisibleGameplay() {
    // Finish zone at the far-right hill in the painting.
    this.finishZone = this.physics.add.staticImage(this.worldW - 260, this.terrainY(this.worldW - 260) - 90, null);
    this.finishZone.setDisplaySize(180, 220).setVisible(false).refreshBody();
  }

  createPlayer() {
    const startX = 920;
    const startY = this.terrainY(startX) - 54;

    this.playerBody = this.add.rectangle(startX, startY, 46, 96, 0xffffff, 0).setDepth(50);
    this.physics.add.existing(this.playerBody);
    this.playerBody.body.setSize(42, 88);
    this.playerBody.body.setCollideWorldBounds(true);
    this.playerBody.body.setMaxVelocity(420, 950);

    this.player = this.add.container(startX, startY).setDepth(55);
    this.shadow = this.add.ellipse(0, 55, 54, 13, 0x000000, 0.24);
    this.body = this.add.ellipse(0, 12, 50, 82, 0xff8fbd, 1);
    this.head = this.add.circle(0, -45, 34, 0xffe0b3, 1);
    this.eye = this.add.circle(14, -48, 4, 0x18213b, 1);
    this.hair = this.add.triangle(-26, -80, 0, 0, 62, 14, 14, 46, 0xffdc43, 1).setAngle(8);
    this.player.add([this.shadow, this.body, this.head, this.eye, this.hair]);

    this.isGrounded = true;
  }

  createCollectibles() {
    const x = 1695;
    const y = this.terrainY(x) - 295;
    this.fluff = this.physics.add.staticImage(x, y, null).setVisible(false);
    this.fluff.setDisplaySize(82, 82).refreshBody();

    this.fluffVisual = this.add.container(x, y).setDepth(70);
    this.fluffVisual.add(this.add.circle(0, 0, 30, 0xfff7b6, 0.24));
    this.fluffVisual.add(this.add.circle(0, 0, 13, 0xfff2a0, 0.98));
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 / 10) * i;
      this.fluffVisual.add(this.add.line(0, 0, 0, 0, Math.cos(a) * 30, Math.sin(a) * 30, 0xfff8d0, 0.9).setLineWidth(2));
    }
    this.tweens.add({ targets: this.fluffVisual, y: y - 16, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.fluffVisual, angle: 8, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  createDebugArtPath() {
    // Very subtle path dots are intentionally off by default. Keep this build focused on the artwork feel.
    this.setMessage('Art prototype v7.1: achtergrond + zoom gefixt.', 2200);
  }

  startIntroSequence() {
    this.inputLocked = true;
    this.time.delayedCall(250, () => this.setMessage('Amber hoort iets buiten.', 1700));
    this.time.delayedCall(1100, () => {
      this.inputLocked = false;
      this.setMessage('De Fluistervelden voelen anders vannacht.', 2300);
    });
  }

  // Invisible walkable path mapped to the painted background.
  // This is deliberately smooth so Amber feels grounded on the illustrated hill path.
  terrainY(x) {
    const pts = [
      [0, 835], [280, 810], [560, 780], [860, 760], [1080, 790],
      [1300, 875], [1510, 955], [1740, 965], [1950, 885],
      [2140, 760], [2350, 805], [2600, 745]
    ];
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      if (x >= x1 && x <= x2) {
        const t = (x - x1) / (x2 - x1);
        const smooth = t * t * (3 - 2 * t);
        return Phaser.Math.Linear(y1, y2, smooth);
      }
    }
    return pts[pts.length - 1][1];
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.033);
    const input = window.FTTM.InputState || {};
    if (!this.cursors) this.cursors = this.input.keyboard.createCursorKeys();
    const left = !this.inputLocked && (input.left || this.cursors.left.isDown);
    const right = !this.inputLocked && (input.right || this.cursors.right.isDown);
    const jumpDown = !this.inputLocked && (input.jump || this.cursors.up.isDown || this.cursors.space.isDown);

    const speed = window.FTTM.GameSettings.playerSpeed;
    const accel = window.FTTM.GameSettings.acceleration;
    const decel = window.FTTM.GameSettings.deceleration;

    if (left && !right) {
      this.playerBody.body.velocity.x = Phaser.Math.Clamp(this.playerBody.body.velocity.x - accel * dt, -speed, speed);
      this.facing = -1;
    } else if (right && !left) {
      this.playerBody.body.velocity.x = Phaser.Math.Clamp(this.playerBody.body.velocity.x + accel * dt, -speed, speed);
      this.facing = 1;
    } else {
      const vx = this.playerBody.body.velocity.x;
      const change = decel * dt;
      this.playerBody.body.velocity.x = Math.abs(vx) <= change ? 0 : vx - Math.sign(vx) * change;
    }

    if (jumpDown && !this.jumpWasDown && this.jumpCount < this.maxJumps) {
      this.playerBody.body.velocity.y = window.FTTM.GameSettings.jumpVelocity;
      this.jumpCount++;
      this.isGrounded = false;
    }
    if (!jumpDown && this.jumpWasDown && this.playerBody.body.velocity.y < window.FTTM.GameSettings.jumpCutVelocity) {
      this.playerBody.body.velocity.y = window.FTTM.GameSettings.jumpCutVelocity;
    }
    this.jumpWasDown = jumpDown;

    this.updateTerrainContact(dt);
    this.updatePlayerVisual(time);
    this.updateCamera(false);
  }

  updateTerrainContact(dt) {
    const x = this.playerBody.x;
    const targetGroundY = this.terrainY(x) - 54;
    const body = this.playerBody.body;

    if (this.playerBody.y >= targetGroundY && body.velocity.y >= 0) {
      // Strongly anchor to ground while walking; this prevents floating/bobbing from the invisible path.
      this.playerBody.y = Phaser.Math.Linear(this.playerBody.y, targetGroundY, 0.75);
      if (Math.abs(this.playerBody.y - targetGroundY) < 1.2) this.playerBody.y = targetGroundY;
      body.velocity.y = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
    } else {
      this.isGrounded = false;
    }
  }

  updatePlayerVisual(time) {
    this.player.x = this.playerBody.x;
    this.player.y = this.playerBody.y;
    this.player.scaleX = this.facing;
    this.shadow.scaleX = 1 / this.player.scaleX;
    this.eye.x = this.facing > 0 ? 14 : -14;
    this.hair.x = this.facing > 0 ? 0 : -4;
    this.hair.angle = this.facing > 0 ? 8 : -8;

    const moving = Math.abs(this.playerBody.body.velocity.x) > 25 && this.isGrounded;
    this.body.y = 12 + (moving ? Math.sin(time / 120) * 1.1 : Math.sin(time / 900) * 0.6);
    this.head.y = -45 + (moving ? Math.sin(time / 120) * 0.8 : Math.sin(time / 900) * 0.5);
  }

  updateCamera(initial) {
    const cam = this.cameras.main;
    const targetX = Phaser.Math.Clamp(this.playerBody.x - this.visibleW * 0.38, 0, Math.max(0, this.worldW - this.visibleW));
    // Higher framing than v7.0: more world/pond visible and less character zoom.
    const targetY = Phaser.Math.Clamp(this.playerBody.y - this.visibleH * 0.60, 0, Math.max(0, this.worldH - this.visibleH));
    if (initial) {
      cam.scrollX = targetX;
      cam.scrollY = targetY;
      this.cameraY = targetY;
      return;
    }
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetX, 0.07);
    this.cameraY = Phaser.Math.Linear(this.cameraY, targetY, 0.055);
    cam.scrollY = this.cameraY;
  }

  collectMoonFluff() {
    if (this.fluffCollected) return;
    this.fluffCollected = true;
    this.collected = 1;
    if (this.fluff) this.fluff.destroy();
    if (this.fluffVisual) this.fluffVisual.destroy();
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(1, this.totalFluffs);
    this.setMessage('Maanpluis gevonden.', 1700);
  }

  tryFinish() {
    if (this.finished) return;
    if (this.collected < this.totalFluffs) {
      this.setMessage('Vind eerst het maanpluis.', 1500);
      return;
    }
    this.finished = true;
    this.playerBody.body.setVelocity(0, 0);
    this.inputLocked = true;
    if (window.FTTM.showFinishPanel) window.FTTM.showFinishPanel();
  }

  setMessage(text, ms) {
    if (window.FTTM.showMessage) window.FTTM.showMessage(text, ms || 2200);
  }
}

window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;
window.LevelScene = LevelScene;

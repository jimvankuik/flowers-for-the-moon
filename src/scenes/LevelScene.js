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
    this.load.image('paintedFluisterveldenV7', './assets/art/fluistervelden-painted-bg-v7.png?v=fluistervelden-v7-art-direction');
  }

  create() {
    const s = window.FTTM.GameSettings;
    this.screenW = this.scale.width;
    this.screenH = this.scale.height;
    this.isPortrait = this.screenH >= this.screenW;

    // Art prototype: the world is a painted plate with invisible gameplay path on top.
    this.bgScale = this.isPortrait ? 1.35 : 2.0;
    this.bgW = 1792 * this.bgScale;
    this.bgH = 550 * this.bgScale;
    this.worldW = this.bgW;
    this.worldH = Math.max(1200, this.bgH + 120);

    this.worldZoom = this.isPortrait ? 0.58 : 0.78;
    if (!this.isPortrait && this.screenH < 390) this.worldZoom = 0.72;
    this.visibleW = this.screenW / this.worldZoom;
    this.visibleH = this.screenH / this.worldZoom;

    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setZoom(this.worldZoom);
    this.cameras.main.setBackgroundColor('#071632');

    if (window.FTTM.hideFinishPanel) window.FTTM.hideFinishPanel();
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(0, this.totalFluffs);

    this.add.image(0, 0, 'paintedFluisterveldenV7').setOrigin(0, 0).setScale(this.bgScale).setDepth(-50);

    this.createInvisibleGameplay();
    this.createPlayer();
    this.createCollectibles();
    this.createArtPrototypeHints();
    this.createAmbientSparkles();

    this.physics.add.overlap(this.playerBody, this.fluff, this.collectMoonFluff, null, this);
    this.physics.add.overlap(this.playerBody, this.finishZone, this.tryFinish, null, this);

    this.updateCamera(true);
    this.startIntroSequence();
    this.scale.on('resize', () => { if (!this.finished) this.scene.restart(); });
  }

  createInvisibleGameplay() {
    this.platforms = this.physics.add.staticGroup();

    // Invisible finish zone near the right hand hill. The art plate is the visual world.
    this.finishZone = this.physics.add.staticImage(this.worldW - 360, this.terrainY(this.worldW - 360) - 90, null);
    this.finishZone.setDisplaySize(160, 220).setVisible(false).refreshBody();
  }

  createPlayer() {
    const startX = 650;
    const startY = this.terrainY(startX) - 54;

    this.playerBody = this.add.rectangle(startX, startY, 46, 96, 0xffffff, 0).setDepth(50);
    this.physics.add.existing(this.playerBody);
    this.playerBody.body.setSize(42, 88);
    this.playerBody.body.setCollideWorldBounds(true);
    this.playerBody.body.setMaxVelocity(420, 950);

    this.player = this.add.container(startX, startY).setDepth(55);
    this.shadow = this.add.ellipse(0, 55, 54, 13, 0x000000, 0.22);
    this.body = this.add.ellipse(0, 12, 50, 82, 0xff8fbd, 1);
    this.head = this.add.circle(0, -45, 34, 0xffe0b3, 1);
    this.eye = this.add.circle(14, -48, 4, 0x18213b, 1);
    this.hair = this.add.triangle(-26, -80, 0, 0, 62, 14, 14, 46, 0xffdc43, 1).setAngle(8);
    this.player.add([this.shadow, this.body, this.head, this.eye, this.hair]);

    this.lastGroundY = startY;
    this.isGrounded = true;
  }

  createCollectibles() {
    const x = 2480;
    const y = this.terrainY(x) - 320;
    this.fluff = this.physics.add.staticImage(x, y, null).setVisible(false);
    this.fluff.setDisplaySize(80, 80).refreshBody();

    this.fluffVisual = this.add.container(x, y).setDepth(70);
    this.fluffVisual.add(this.add.circle(0, 0, 28, 0xfff7b6, 0.22));
    this.fluffVisual.add(this.add.circle(0, 0, 13, 0xfff2a0, 0.96));
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 / 10) * i;
      const line = this.add.line(0, 0, 0, 0, Math.cos(a) * 28, Math.sin(a) * 28, 0xfff8d0, 0.8).setLineWidth(2);
      this.fluffVisual.add(line);
    }
    this.tweens.add({ targets: this.fluffVisual, y: y - 18, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.fluffVisual, angle: 8, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  createArtPrototypeHints() {
    // Small invisible/visible debug-free signpost so the build clearly communicates its goal.
    this.setMessage('Art direction prototype: kijk naar gevoel en compositie.', 2600);
  }

  createAmbientSparkles() {
    this.sparkles = [];
    for (let i = 0; i < 32; i++) {
      const x = Phaser.Math.Between(260, this.worldW - 260);
      const y = Phaser.Math.Between(180, 850);
      const dot = this.add.circle(x, y, Phaser.Math.FloatBetween(1.4, 3.6), 0xffe6a3, Phaser.Math.FloatBetween(0.12, 0.34)).setDepth(20);
      this.sparkles.push(dot);
      this.tweens.add({ targets: dot, alpha: dot.alpha * 0.25, y: y - Phaser.Math.Between(12, 38), duration: Phaser.Math.Between(2000, 4200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  startIntroSequence() {
    this.inputLocked = true;
    this.time.delayedCall(250, () => this.setMessage('Amber hoort iets buiten.', 1800));
    this.time.delayedCall(1150, () => {
      this.inputLocked = false;
      this.setMessage('De Fluistervelden voelen anders vannacht.', 2600);
    });
  }

  // Smooth invisible terrain path mapped to the painted background.
  terrainY(x) {
    const pts = [
      [0, 770], [360, 765], [720, 790], [1050, 875], [1350, 965],
      [1650, 1010], [1980, 990], [2300, 835], [2600, 675],
      [2920, 720], [3260, 780], [3584, 755]
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
    const cursors = this.input.keyboard.createCursorKeys();
    const left = !this.inputLocked && (input.left || cursors.left.isDown);
    const right = !this.inputLocked && (input.right || cursors.right.isDown);
    const jumpDown = !this.inputLocked && (input.jump || cursors.up.isDown || cursors.space.isDown);

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

    this.updateTerrainContact();
    this.updatePlayerVisual(time);
    this.updateCamera(false);
  }

  updateTerrainContact() {
    const x = this.playerBody.x;
    const groundY = this.terrainY(x) - 54;
    const body = this.playerBody.body;

    if (this.playerBody.y >= groundY && body.velocity.y >= 0) {
      this.playerBody.y = groundY;
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
    this.body.y = 12 + (moving ? Math.sin(time / 95) * 2 : Math.sin(time / 900) * 1.0);
    this.head.y = -45 + (moving ? Math.sin(time / 95) * 1.5 : Math.sin(time / 900) * 0.8);
  }

  updateCamera(initial) {
    const cam = this.cameras.main;
    const targetX = Phaser.Math.Clamp(this.playerBody.x - this.visibleW * 0.34, 0, this.worldW - this.visibleW);
    const targetY = Phaser.Math.Clamp(this.playerBody.y - this.visibleH * 0.58, 0, this.worldH - this.visibleH);
    if (initial) {
      cam.scrollX = targetX;
      cam.scrollY = targetY;
      this.cameraY = targetY;
      return;
    }
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetX, 0.075);
    this.cameraY = Phaser.Math.Linear(this.cameraY, targetY, 0.045);
    cam.scrollY = this.cameraY;
  }

  collectMoonFluff() {
    if (this.fluffCollected) return;
    this.fluffCollected = true;
    this.collected = 1;
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(1, this.totalFluffs);
    this.fluff.disableBody(true, true);
    this.tweens.add({ targets: this.fluffVisual, scale: 1.8, alpha: 0, y: this.fluffVisual.y - 80, duration: 600, ease: 'Sine.easeOut', onComplete: () => this.fluffVisual.destroy() });
    this.setMessage('Je vond het eerste maanpluis.', 2200);
  }

  tryFinish() {
    if (this.finished) return;
    if (this.collected < this.totalFluffs) {
      this.setMessage('Vind eerst het maanpluis.', 1600);
      return;
    }
    this.finished = true;
    this.inputLocked = true;
    if (window.FTTM.showFinishPanel) window.FTTM.showFinishPanel();
  }

  setMessage(text, duration = 2200) {
    const el = document.getElementById('message-panel');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => el.classList.add('hidden'), duration);
  }
}

window.LevelScene = LevelScene;
window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;

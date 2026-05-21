class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
    this.collected = 0;
    this.totalFluffs = 3;
    this.currentSpeed = 0;
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.jumpWasDown = false;
    this.jumpLocked = false;
    this.wasGrounded = false;
    this.facing = 1;
    this.lastDoAt = 0;
    this.finished = false;
    this.activeCheckpoint = { x: 140, y: 0 };
  }

  create() {
    const s = window.FTTM.GameSettings;
    this.screenW = this.scale.width;
    this.screenH = this.scale.height;
    this.isPortrait = this.screenH >= this.screenW;
    this.worldZoom = this.isPortrait ? 0.58 : 0.50;
    if (this.screenH < 390 && !this.isPortrait) this.worldZoom = 0.48;
    this.visibleW = this.screenW / this.worldZoom;
    this.visibleH = this.screenH / this.worldZoom;

    // Landscape-first: ground sits high enough above mobile controls.
    this.groundY = this.isPortrait ? this.visibleH - 165 : this.visibleH - 150;
    this.worldBottom = this.visibleH + 260;

    this.physics.world.setBounds(0, 0, s.worldWidth, this.worldBottom);
    this.cameras.main.setBounds(0, 0, s.worldWidth, this.visibleH);
    this.cameras.main.setZoom(this.worldZoom);

    if (window.FTTM.hideFinishPanel) window.FTTM.hideFinishPanel();
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(0, this.totalFluffs);
    this.setMessage('The moon is waiting.', 2800);

    this.drawSky();
    this.createOrganicRoute();
    this.createAtmosphere();
    this.createStoryObjects();
    this.createPlayer();
    this.createMoonFluffs();
    this.createPlantCollectibles();
    this.createFinishArea();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.fluffs, this.collectMoonFluff, null, this);
    this.physics.add.overlap(this.player, this.plants, this.collectPlant, null, this);
    this.physics.add.overlap(this.player, this.checkpoints, this.touchCheckpoint, null, this);
    this.physics.add.overlap(this.player, this.finishZone, this.tryFinish, null, this);

    this.updateCamera(true);
    this.scale.on('resize', () => { if (!this.finished) this.scene.restart(); });
  }

  setMessage(text, duration = 2200) {
    const el = document.getElementById('message-panel');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => el.classList.add('hidden'), duration);
  }

  drawSky() {
    const s = window.FTTM.GameSettings;
    this.add.rectangle(s.worldWidth / 2, this.visibleH / 2, s.worldWidth, this.visibleH, 0x122a60).setScrollFactor(1);

    // Soft depth layers.
    this.add.rectangle(s.worldWidth / 2, this.groundY + 98, s.worldWidth, 210, 0x091637).setDepth(-3);
    for (let i = 0; i < 130; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, s.worldWidth),
        Phaser.Math.Between(22, Math.max(80, this.groundY - 90)),
        Phaser.Math.FloatBetween(0.8, 2.0),
        0xffffff,
        Phaser.Math.FloatBetween(0.18, 0.66)
      );
      star.setScrollFactor(0.25);
      this.tweens.add({ targets: star, alpha: star.alpha * 0.45, duration: Phaser.Math.Between(1200, 2600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    for (const c of [
      [580, 130, 240, 38], [1160, 190, 310, 46], [1880, 110, 260, 36], [2860, 170, 360, 50]
    ]) {
      this.add.ellipse(c[0], c[1], c[2], c[3], 0xffffff, 0.055).setScrollFactor(0.18);
      this.add.ellipse(c[0] + 70, c[1] + 16, c[2] * 0.68, c[3] * 0.75, 0xffffff, 0.04).setScrollFactor(0.18);
    }

    // Moon is visible early, but the big moon payoff is at the end.
    // Distant moon is placed near the actual end-route, not before it.
    // In earlier prototypes it sat around the old level end, which made the
    // camera appear to stop before the real moon moment on landscape.
    this.add.circle(4300, 135, 70, 0xfff4bd, 0.34).setScrollFactor(0.62).setDepth(-1);
    this.add.circle(4322, 116, 52, 0xfff8d6, 0.22).setScrollFactor(0.62).setDepth(-1);
  }

  createOrganicRoute() {
    this.platforms = this.physics.add.staticGroup();
    this.checkpoints = this.physics.add.staticGroup();
    const gy = this.groundY;

    // Clean rebuild: broad walking hills, not a chain of old floating test platforms.
    this.addGround(0, gy, 760, 'meadow');                 // opening field
    this.addGround(760, gy - 26, 700, 'gentle-hill');     // soft rise
    this.addGround(1460, gy - 58, 540, 'quiet');          // bench/apple area
    this.addGround(2000, gy - 42, 520, 'wind');           // wind clearing
    this.addGround(2520, gy - 20, 560, 'stones');         // two small jumps
    this.addGround(3080, gy - 56, 560, 'meadow');         // breathing space before final
    this.addGround(3640, gy - 78, 980, 'moon-hill');      // final hill and moon approach

    // Only two small, optional-feeling stepping stones to test light platforming.
    this.addSoftPlatform(2310, gy - 128, 170, 24, 0x80b96f);
    this.addSoftPlatform(2525, gy - 168, 190, 24, 0x80b96f);

    // Checkpoints just before each meaningful area.
    [[130, gy - 60], [1160, gy - 90], [2100, gy - 74], [3040, gy - 92], [3820, gy - 112]].forEach(p => {
      const z = this.add.zone(p[0], p[1], 120, 160);
      this.physics.add.existing(z, true);
      z.setData('spawnX', p[0]);
      z.setData('spawnY', p[1] - 34);
      this.checkpoints.add(z);
    });
  }

  addGround(x, y, w, type) {
    const h = 44;
    const collider = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
    this.physics.add.existing(collider, true);
    this.platforms.add(collider);

    // Organic landscape visuals: large overlapping ellipses, flowers on top.
    const baseColors = { meadow: 0x5d9a69, 'gentle-hill': 0x69a66f, quiet: 0x628f64, wind: 0x6aaa77, stones: 0x5f9668, 'moon-hill': 0x6ca76e };
    const color = baseColors[type] || 0x639a68;
    this.add.rectangle(x + w / 2, y + 30, w, 92, color, 1).setDepth(0);
    this.add.ellipse(x + w * 0.25, y + 50, w * 0.58, 150, 0x274f43, 0.35).setDepth(-1);
    this.add.ellipse(x + w * 0.75, y + 54, w * 0.52, 132, 0x1f463f, 0.30).setDepth(-1);
    this.add.rectangle(x + w / 2, y + 2, w, 9, 0xc7ef89, 0.95).setDepth(2);

    for (let i = 0; i < Math.floor(w / 42); i++) {
      const px = x + 18 + i * 42 + Phaser.Math.Between(-10, 10);
      const stemH = Phaser.Math.Between(18, 42);
      const c = Phaser.Display.Color.ValueToColor(Phaser.Math.RND.pick([0xffd4ec, 0xe7e3ff, 0xf4f7af, 0xc3dbff]));
      this.add.rectangle(px, y - stemH / 2, 3, stemH, 0x83c56b, 0.8).setDepth(4);
      this.add.circle(px, y - stemH, Phaser.Math.Between(3, 5), c.color, 0.9).setDepth(5);
    }
  }

  addSoftPlatform(x, y, w, h, color) {
    const visual = this.add.rectangle(x + w / 2, y + h / 2, w, h, color, 1).setDepth(3);
    visual.setStrokeStyle(4, 0xcaf28d, 0.9);
    this.add.ellipse(x + w / 2, y + h + 15, w * 0.92, 34, 0x244943, 0.24).setDepth(1);
    this.physics.add.existing(visual, true);
    this.platforms.add(visual);
  }

  createAtmosphere() {
    const s = window.FTTM.GameSettings;
    // Floating fluff and fireflies.
    for (let i = 0; i < 70; i++) {
      const p = this.add.circle(Phaser.Math.Between(0, s.worldWidth), Phaser.Math.Between(110, this.groundY - 20), Phaser.Math.FloatBetween(1.4, 3.2), 0xffffff, Phaser.Math.FloatBetween(0.18, 0.55)).setDepth(8);
      this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-28, 46), y: p.y + Phaser.Math.Between(-18, 18), duration: Phaser.Math.Between(2200, 5200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Friendly insects/animals as pure atmosphere.
    for (const b of [[410, -120], [980, -90], [1660, -118], [2140, -155], [2980, -110]]) {
      const butterfly = this.add.text(b[0], this.groundY + b[1], 'ʚɞ', { fontFamily: 'Arial', fontSize: '28px', color: '#ffd7ef' }).setOrigin(0.5).setDepth(12);
      this.tweens.add({ targets: butterfly, y: butterfly.y - 22, x: butterfly.x + 55, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.text(3380, this.groundY - 125, '🐇', { fontSize: '28px' }).setDepth(8).setAlpha(0.8);
  }

  createStoryObjects() {
    const gy = this.groundY;
    // Bench and apple tree fully above controls.
    this.drawBench(1570, gy - 58);
    this.drawAppleTree(1730, gy - 118);
    this.drawWindReeds(2050, gy - 50);
    this.drawWindReeds(2180, gy - 50);
    this.drawWindReeds(2260, gy - 50);

    // Gentle interaction zones.
    this.benchZone = this.add.zone(1570, gy - 88, 150, 110);
    this.physics.add.existing(this.benchZone, true);
    this.appleZone = this.add.zone(1730, gy - 92, 170, 150);
    this.physics.add.existing(this.appleZone, true);
  }

  drawBench(x, y) {
    this.add.rectangle(x, y, 96, 12, 0x8b5a3b).setDepth(10);
    this.add.rectangle(x, y - 22, 100, 10, 0x9a6542).setDepth(10);
    this.add.rectangle(x - 36, y + 26, 9, 52, 0x5a3a2a).setDepth(9);
    this.add.rectangle(x + 36, y + 26, 9, 52, 0x5a3a2a).setDepth(9);
  }

  drawAppleTree(x, y) {
    this.add.rectangle(x, y + 68, 26, 132, 0x7b5536).setDepth(7);
    this.add.circle(x - 34, y + 8, 58, 0x4f965c).setDepth(8);
    this.add.circle(x + 22, y - 10, 68, 0x5aa465).setDepth(8);
    this.add.circle(x + 58, y + 28, 48, 0x4f965c).setDepth(8);
    for (const a of [[x - 18, y - 8], [x + 28, y + 12], [x + 54, y + 42]]) {
      this.add.circle(a[0], a[1], 7, 0xff6b6b).setDepth(11);
    }
  }

  drawWindReeds(x, y) {
    for (let i = 0; i < 5; i++) {
      const reed = this.add.rectangle(x + i * 18, y - Phaser.Math.Between(8, 24), 4, Phaser.Math.Between(50, 78), 0xa4d579, 0.85).setDepth(6);
      reed.setOrigin(0.5, 1);
      this.tweens.add({ targets: reed, angle: Phaser.Math.Between(-7, 7), duration: Phaser.Math.Between(900, 1500), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  createPlayer() {
    this.player = this.add.container(145, this.groundY - 72).setDepth(30);
    this.activeCheckpoint = { x: 145, y: this.groundY - 72 };
    this.shadow = this.add.ellipse(0, 66, 52, 13, 0x000000, 0.20);
    this.leftFoot = this.add.ellipse(-11, 62, 15, 7, 0xf0a0c3);
    this.rightFoot = this.add.ellipse(11, 62, 15, 7, 0xf0a0c3);
    const hair = this.add.ellipse(-8, -18, 32, 48, 0xffdd54);
    const dress = this.add.ellipse(0, 28, 42, 76, 0xffb7d5);
    const head = this.add.circle(0, -20, 22, 0xffe0bd);
    const fringe = this.add.triangle(-5, -40, -22, 0, 16, 0, -3, 24, 0xffdd54);
    const eye = this.add.circle(8, -22, 2.5, 0x1d2148);
    this.player.add([this.shadow, this.leftFoot, this.rightFoot, hair, dress, head, fringe, eye]);
    this.physics.add.existing(this.player);
    this.player.body.setSize(34, 82);
    this.player.body.setOffset(-17, -42);
    this.player.body.setCollideWorldBounds(true);
  }

  createMoonFluffs() {
    this.fluffs = this.physics.add.staticGroup();
    const gy = this.groundY;
    const data = [
      [710, gy - 120],       // after opening field
      [2195, gy - 154],      // wind moment
      [3560, gy - 180]       // final fluff before the moon, not behind it
    ];
    data.forEach((p, idx) => {
      const f = this.add.container(p[0], p[1]).setDepth(20);
      const glow = this.add.circle(0, 0, 28, 0xfff6b9, 0.20);
      const core = this.add.circle(0, 0, 12, 0xfffbdb, 0.95);
      const txt = this.add.text(0, 1, '✦', { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
      f.add([glow, core, txt]);
      f.setData('collected', false);
      this.physics.add.existing(f, true);
      f.body.setSize(56, 56);
      f.body.setOffset(-28, -28);
      this.fluffs.add(f);
      this.tweens.add({ targets: f, y: p[1] - 14, duration: 1100 + idx * 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  createPlantCollectibles() {
    this.plants = this.physics.add.staticGroup();
    const gy = this.groundY;
    const data = [
      { name: 'Blauwe druifjes gevonden!', x: 1020, y: gy - 58, icon: '♧', color: '#9bb7ff' },
      { name: 'Blauwe regen gevonden!', x: 1880, y: gy - 90, icon: '❦', color: '#c7b4ff' }
    ];
    data.forEach(d => {
      const p = this.add.container(d.x, d.y).setDepth(18);
      p.add(this.add.text(0, 0, d.icon, { fontFamily: 'Arial', fontSize: '34px', color: d.color }).setOrigin(0.5));
      p.setData('plantName', d.name);
      p.setData('collected', false);
      this.physics.add.existing(p, true);
      p.body.setSize(64, 64);
      p.body.setOffset(-32, -32);
      this.plants.add(p);
    });
  }

  createFinishArea() {
    const gy = this.groundY;
    this.finishX = 4300;
    this.finishMarker = this.add.container(this.finishX, gy - 118).setDepth(16);
    const aura = this.add.circle(0, 0, 74, 0xfff2b8, 0.16);
    const moon = this.add.circle(0, 0, 42, 0xfff1bd, 0.72);
    const small = this.add.circle(18, -12, 25, 0xfff8d7, 0.28);
    const boy = this.add.text(0, 8, '♡', { fontFamily: 'Arial', fontSize: '42px', color: '#fff6da' }).setOrigin(0.5);
    this.finishMarker.add([aura, moon, small, boy]);
    this.tweens.add({ targets: this.finishMarker, y: gy - 130, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.finishZone = this.add.zone(this.finishX, gy - 80, 180, 180);
    this.physics.add.existing(this.finishZone, true);
  }

  collectMoonFluff(player, fluff) {
    if (!fluff || fluff.getData('collected')) return;
    fluff.setData('collected', true);
    if (fluff.body) fluff.body.enable = false;
    this.collected += 1;
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(this.collected, this.totalFluffs);
    this.tweens.add({ targets: fluff, y: fluff.y - 34, scale: 1.35, alpha: 0, duration: 320, ease: 'Sine.easeOut', onComplete: () => fluff.destroy() });
    if (this.collected === 1) this.setMessage('The wind carries it upward.', 2300);
    if (this.collected === 2) this.setMessage('A little closer.', 2100);
  }

  collectPlant(player, plant) {
    if (!plant || plant.getData('collected')) return;
    plant.setData('collected', true);
    if (plant.body) plant.body.enable = false;
    this.setMessage(plant.getData('plantName'), 2000);
    this.tweens.add({ targets: plant, y: plant.y - 20, alpha: 0, scale: 1.25, duration: 320, onComplete: () => plant.destroy() });
  }

  touchCheckpoint(player, zone) {
    if (!zone) return;
    this.activeCheckpoint = { x: zone.getData('spawnX'), y: zone.getData('spawnY') };
  }

  doInteraction() {
    const now = this.time.now;
    if (now - this.lastDoAt < 450) return;
    this.lastDoAt = now;
    const nearBench = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1570, this.groundY - 88) < 145;
    const nearApple = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1730, this.groundY - 92) < 165;

    if (nearBench) {
      this.setMessage('The wind sounds soft here.', 2400);
      this.tweens.add({ targets: this.player, scaleY: 0.88, duration: 140, yoyo: true, ease: 'Sine.easeInOut' });
      return;
    }
    if (nearApple) {
      this.setMessage('Amber eats a sweet apple.', 2100);
      const apple = this.add.circle(this.player.x + 18 * this.facing, this.player.y - 38, 7, 0xff6b6b).setDepth(40);
      this.tweens.add({ targets: apple, x: this.player.x + 5 * this.facing, y: this.player.y - 34, alpha: 0, duration: 420, onComplete: () => apple.destroy() });
      return;
    }

    // playful handstand anywhere else
    this.setMessage('Handstand!', 900);
    this.tweens.add({ targets: this.player, angle: 180, duration: 170, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => { this.player.angle = 0; } });
  }

  tryFinish() {
    if (this.finished) return;
    if (this.collected < this.totalFluffs) {
      this.setMessage('Find all 3 moon fluffs first.', 2000);
      return;
    }
    this.finished = true;
    this.player.body.setVelocity(0, 0);
    this.currentSpeed = 0;
    this.cameras.main.stopFollow();

    // v3.1 fix: the moon payoff must always be visible on mobile landscape.
    // The previous moon lived in world space near the far right, which could end up
    // outside the visible camera window. This payoff moon is placed directly inside
    // the current camera view, independent of the level-end position.
    this.showGuaranteedMoonPayoff();

    this.setMessage('A little closer to the moon.', 2800);
    this.time.delayedCall(900, () => {
      for (let i = 0; i < 22; i++) {
        const h = this.add.text(this.cameras.main.scrollX + this.visibleW * 0.76, this.visibleH * 0.30, '♡', { fontFamily: 'Arial', fontSize: Phaser.Math.Between(18, 34) + 'px', color: '#ffd4e5' }).setOrigin(0.5).setDepth(120);
        this.tweens.add({ targets: h, x: h.x + Phaser.Math.Between(-145, 145), y: h.y - Phaser.Math.Between(60, 190), alpha: 0, duration: Phaser.Math.Between(1100, 1900), delay: i * 55, onComplete: () => h.destroy() });
      }
      if (window.FTTM.showFinishPanel) window.FTTM.showFinishPanel();
    });
  }

  showGuaranteedMoonPayoff() {
    if (this.payoffMoon) this.payoffMoon.destroy();

    const viewX = this.cameras.main.scrollX;
    const moonX = viewX + this.visibleW * 0.80;
    const moonY = this.visibleH * 0.24;

    this.payoffMoon = this.add.container(moonX, moonY).setDepth(110);
    const glow1 = this.add.circle(0, 0, 126, 0xfff0b8, 0.08);
    const glow2 = this.add.circle(0, 0, 88, 0xfff0b8, 0.13);
    const moon = this.add.circle(0, 0, 58, 0xffedaf, 0.92);
    const cutout = this.add.circle(21, -14, 48, 0x122a60, 0.34);
    const sparkle1 = this.add.text(-88, -68, '✦', { fontFamily: 'Arial', fontSize: '26px', color: '#fff4c7' }).setOrigin(0.5).setAlpha(0.78);
    const sparkle2 = this.add.text(94, 56, '✦', { fontFamily: 'Arial', fontSize: '20px', color: '#fff4c7' }).setOrigin(0.5).setAlpha(0.64);
    this.payoffMoon.add([glow1, glow2, moon, cutout, sparkle1, sparkle2]);
    this.payoffMoon.setScale(0.15);
    this.payoffMoon.setAlpha(0);

    this.tweens.add({ targets: this.payoffMoon, scale: 1, alpha: 1, duration: 650, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.payoffMoon, y: moonY - 12, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  handleVariableJump(input, onGround) {
    const s = window.FTTM.GameSettings;
    const pressed = input.jump && !this.jumpWasDown;
    const released = !input.jump && this.jumpWasDown;
    if (onGround) this.jumpCount = 0;
    if (released) this.jumpLocked = false;
    if (pressed && !this.jumpLocked) {
      if (onGround) {
        this.player.body.setVelocityY(s.jumpVelocity);
        this.jumpCount = 1;
        this.jumpLocked = true;
        this.playJumpFeedback();
      } else if (this.jumpCount === 1) {
        this.player.body.setVelocityY(-540);
        this.jumpCount = 2;
        this.jumpLocked = true;
        this.createDoubleJumpBurst();
        this.playJumpFeedback();
      }
    }
    if (released && this.player.body.velocity.y < s.jumpCutVelocity) this.player.body.setVelocityY(s.jumpCutVelocity);
    this.jumpWasDown = input.jump;
  }

  playJumpFeedback() {
    this.tweens.add({ targets: this.player, scaleY: 1.04, duration: 85, yoyo: true, ease: 'Sine.easeOut' });
  }

  playLandingFeedback() {
    this.tweens.add({ targets: this.player, scaleY: 0.94, duration: 75, yoyo: true, ease: 'Sine.easeOut', onComplete: () => { this.player.scaleY = 1; this.player.scaleX = this.facing; } });
  }

  createDoubleJumpBurst() {
    const x = this.player.x, y = this.player.y + 38;
    for (let i = 0; i < 7; i++) {
      const p = this.add.circle(x, y, 3, 0xffffff, 0.78).setDepth(40);
      this.tweens.add({ targets: p, x: x + Phaser.Math.Between(-38, 38), y: y + Phaser.Math.Between(8, 42), alpha: 0, scale: 0.2, duration: 260, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
  }

  createBlowEffect() {
    const dir = this.facing;
    for (let i = 0; i < 11; i++) {
      const seed = this.add.circle(this.player.x + dir * 28, this.player.y - 22, 3, 0xffffff, 0.86).setDepth(42);
      this.tweens.add({ targets: seed, x: seed.x + dir * Phaser.Math.Between(60, 145), y: seed.y + Phaser.Math.Between(-54, 18), alpha: 0, scale: Phaser.Math.FloatBetween(0.6, 1.35), duration: Phaser.Math.Between(480, 760), delay: i * 18, ease: 'Sine.easeOut', onComplete: () => seed.destroy() });
    }
  }

  animatePlayer(delta, onGround) {
    const moving = Math.abs(this.currentSpeed) > 18 && onGround;
    if (moving) {
      this.walkTime = (this.walkTime || 0) + delta * 0.012;
      const step = Math.sin(this.walkTime);
      this.player.angle = Phaser.Math.Clamp(this.currentSpeed / 260, -1, 1) * 1.5;
      this.leftFoot.x = -11 + step * 4;
      this.rightFoot.x = 11 - step * 4;
      this.leftFoot.y = 62 - Math.max(0, step) * 4;
      this.rightFoot.y = 62 - Math.max(0, -step) * 4;
    } else {
      this.player.angle = Phaser.Math.Linear(this.player.angle, 0, 0.15);
      this.leftFoot.x = Phaser.Math.Linear(this.leftFoot.x, -11, 0.18);
      this.rightFoot.x = Phaser.Math.Linear(this.rightFoot.x, 11, 0.18);
      this.leftFoot.y = Phaser.Math.Linear(this.leftFoot.y, 62, 0.18);
      this.rightFoot.y = Phaser.Math.Linear(this.rightFoot.y, 62, 0.18);
    }
  }

  respawn() {
    const cp = this.activeCheckpoint || { x: 145, y: this.groundY - 72 };
    this.player.setPosition(cp.x, cp.y);
    this.player.body.setVelocity(0, 0);
    this.currentSpeed = 0;
    this.jumpCount = 0;
    this.setMessage('Try again softly.', 1000);
  }

  updateCamera(initial) {
    if (this.finished) return;
    const s = window.FTTM.GameSettings;
    const max = Math.max(0, s.worldWidth - this.visibleW);
    const speed = this.currentSpeed || 0;
    let anchor = this.isPortrait ? 0.30 : 0.26;
    if (speed > 35) anchor = this.isPortrait ? 0.20 : 0.22;
    if (speed < -35) anchor = this.isPortrait ? 0.50 : 0.45;

    // End-camera fix: near the moon approach, stop forcing Amber so far left.
    // This prevents the camera from feeling hard-locked before the end reveal.
    if (this.finishX && this.player.x > this.finishX - 620) {
      anchor = this.isPortrait ? 0.46 : 0.42;
    }

    let desired = this.player.x - this.visibleW * anchor;
    desired = Phaser.Math.Clamp(desired, 0, max);
    if (initial || this.cameraTargetX === undefined) {
      this.cameraTargetX = desired;
      this.cameras.main.scrollX = desired;
      this.cameras.main.scrollY = 0;
      return;
    }
    this.cameraTargetX = Phaser.Math.Linear(this.cameraTargetX, desired, 0.12);
    this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, this.cameraTargetX, 0.16);
    this.cameras.main.scrollY = 0;
  }

  update(time, delta) {
    if (this.finished) return;
    const input = window.FTTM.InputState || {};
    const s = window.FTTM.GameSettings;
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;

    let target = 0;
    if (input.left) target -= s.playerSpeed;
    if (input.right) target += s.playerSpeed;

    const rate = target === 0 ? s.deceleration : s.acceleration;
    const step = rate * (delta / 1000);
    if (this.currentSpeed < target) this.currentSpeed = Math.min(this.currentSpeed + step, target);
    if (this.currentSpeed > target) this.currentSpeed = Math.max(this.currentSpeed - step, target);
    this.player.body.setVelocityX(this.currentSpeed);

    if (Math.abs(this.currentSpeed) > 8) {
      this.facing = this.currentSpeed < 0 ? -1 : 1;
      this.player.scaleX = this.facing;
    }

    this.handleVariableJump(input, onGround);
    if (!this.wasGrounded && onGround) this.playLandingFeedback();
    this.wasGrounded = onGround;

    if (input.blow) {
      this.doInteraction();
      this.createBlowEffect();
    }

    if (this.player.y > this.groundY + 240) this.respawn();

    this.animatePlayer(delta, onGround);
    this.updateCamera(false);
  }
}

window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;
window.LevelScene = LevelScene;

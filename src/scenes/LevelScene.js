class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
    this.collected = 0;
    this.totalFluffs = 1;
    this.facing = 1;
    this.inputLocked = true;
    this.finished = false;
    this.jumpWasDown = false;
    this.onGround = false;
    this.vx = 0;
    this.vy = 0;
  }

  preload() {
    this.load.svg('v8-cottage', 'assets/v8/cottage.svg', { width: 420, height: 340 });
    this.load.svg('v8-tree', 'assets/v8/tree.svg', { width: 360, height: 430 });
    this.load.svg('v8-bench', 'assets/v8/bench.svg', { width: 220, height: 130 });
    this.load.svg('v8-lamp', 'assets/v8/lamp.svg', { width: 90, height: 210 });
    this.load.svg('v8-moonfluff', 'assets/v8/moonfluff.svg', { width: 160, height: 160 });
    this.load.svg('v8-blue-grapes', 'assets/v8/plant-blue-grapes.svg', { width: 130, height: 130 });
  }

  create() {
    const s = window.FTTM.GameSettings;
    this.screenW = this.scale.width;
    this.screenH = this.scale.height;
    this.isPortrait = this.screenH >= this.screenW;
    this.worldZoom = this.isPortrait ? 0.56 : (this.screenH < 390 ? 0.56 : 0.60);
    this.visibleW = this.screenW / this.worldZoom;
    this.visibleH = this.screenH / this.worldZoom;
    this.worldW = s.worldWidth || 3400;
    this.worldH = 1650;
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setZoom(this.worldZoom);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    if (window.FTTM.hideFinishPanel) window.FTTM.hideFinishPanel();
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(0, this.totalFluffs);

    this.makeTerrainPoints();
    this.drawSkyAndDepth();
    this.drawTerrainLayers();
    this.placeModularAssets();
    this.createPlayer();
    this.createCollectibles();
    this.createAmbientMotion();
    this.updateCamera(true);
    this.startIntro();

    this.scale.on('resize', () => { if (!this.finished) this.scene.restart(); });
  }

  makeTerrainPoints() {
    this.terrainPoints = [
      { x: 0, y: 805 },
      { x: 210, y: 790 },
      { x: 430, y: 760 },
      { x: 700, y: 780 },
      { x: 940, y: 830 },
      { x: 1120, y: 890 },
      { x: 1320, y: 925 },
      { x: 1540, y: 880 },
      { x: 1760, y: 805 },
      { x: 1990, y: 775 },
      { x: 2240, y: 805 },
      { x: 2480, y: 870 },
      { x: 2760, y: 830 },
      { x: 3100, y: 790 },
      { x: this.worldW, y: 790 }
    ];
  }

  smoothstep(t) { return t * t * (3 - 2 * t); }

  terrainY(x) {
    const pts = this.terrainPoints;
    if (x <= pts[0].x) return pts[0].y;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (x >= a.x && x <= b.x) {
        const t = this.smoothstep((x - a.x) / (b.x - a.x));
        return Phaser.Math.Linear(a.y, b.y, t);
      }
    }
    return pts[pts.length - 1].y;
  }

  terrainSlope(x) {
    return (this.terrainY(x + 8) - this.terrainY(x - 8)) / 16;
  }

  drawSkyAndDepth() {
    const bg = this.add.graphics().setDepth(-100);
    bg.fillGradientStyle(0x07152f, 0x0e2a5d, 0x153463, 0x071221, 1);
    bg.fillRect(0, 0, this.worldW, this.worldH);

    this.drawDistantHills(0, 980, 0x122a42, 0.44, 0.20, 600, -80);
    this.drawDistantHills(120, 930, 0x1d4561, 0.34, 0.30, 480, 20);
    this.drawDistantHills(220, 880, 0x2d5d66, 0.20, 0.42, 360, 70);

    for (let i = 0; i < 140; i++) {
      const star = this.add.circle(Phaser.Math.Between(0, this.worldW), Phaser.Math.Between(35, 680), Phaser.Math.FloatBetween(0.8, 2.2), 0xffffff, Phaser.Math.FloatBetween(0.16, 0.58)).setDepth(-84).setScrollFactor(0.35);
      this.tweens.add({ targets: star, alpha: star.alpha * 0.35, duration: Phaser.Math.Between(1400, 3300), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    for (const c of [[780,300,220,40],[1240,250,150,28],[2220,315,280,44],[2860,230,210,40]]) {
      this.add.ellipse(c[0], c[1], c[2], c[3], 0xffffff, 0.07).setDepth(-82).setScrollFactor(0.45);
    }

    const moon = this.add.container(3020, 280).setDepth(-78).setScrollFactor(0.62);
    moon.add(this.add.circle(0, 0, 128, 0xffefbc, 0.12));
    moon.add(this.add.circle(0, 0, 74, 0xffefbc, 0.92));
    moon.add(this.add.circle(25, -18, 56, 0x153463, 0.22));
  }

  drawDistantHills(offset, baseY, color, alpha, scroll, step, lift) {
    const g = this.add.graphics().setDepth(-90).setScrollFactor(scroll);
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(-200, this.worldH);
    g.lineTo(-200, baseY);
    for (let x = -200; x <= this.worldW + 400; x += step) {
      const y = baseY + Math.sin((x + offset) * 0.004) * 55 + Math.sin((x + offset) * 0.0017) * 85 + lift;
      g.lineTo(x, y);
    }
    g.lineTo(this.worldW + 500, this.worldH);
    g.closePath();
    g.fillPath();
  }

  drawTerrainLayers() {
    // under-hill shadow
    this.drawTerrainFill(42, 0x071b27, 0.30, 38, 30);
    this.drawTerrainFill(0, 0x336d43, 1.0, 0, 0);
    this.drawTerrainFill(-18, 0x7ecf74, 1.0, 0, -16, true);
    this.drawTerrainRim();
    this.drawPathRibbon();
    this.drawForegroundPlants();
  }

  drawTerrainFill(depth, color, alpha, yOffset, xOffset, thin = false) {
    const g = this.add.graphics().setDepth(depth);
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(-50, this.worldH + 80);
    g.lineTo(-50, this.terrainY(0) + yOffset);
    for (let x = 0; x <= this.worldW; x += 28) {
      g.lineTo(x + xOffset, this.terrainY(x) + yOffset);
    }
    if (thin) {
      for (let x = this.worldW; x >= 0; x -= 28) g.lineTo(x + xOffset, this.terrainY(x) + yOffset + 26);
      g.closePath();
    } else {
      g.lineTo(this.worldW + 80, this.worldH + 80);
      g.closePath();
    }
    g.fillPath();
  }

  drawTerrainRim() {
    const g = this.add.graphics().setDepth(4);
    g.lineStyle(9, 0xc5ef91, 0.9);
    g.beginPath();
    g.moveTo(0, this.terrainY(0) - 11);
    for (let x = 0; x <= this.worldW; x += 22) g.lineTo(x, this.terrainY(x) - 11);
    g.strokePath();
    g.lineStyle(3, 0xffffff, 0.12);
    g.beginPath();
    g.moveTo(0, this.terrainY(0) - 18);
    for (let x = 0; x <= this.worldW; x += 40) g.lineTo(x, this.terrainY(x) - 18);
    g.strokePath();
  }

  drawPathRibbon() {
    const path = this.add.graphics().setDepth(6);
    path.lineStyle(52, 0xd8c18b, 0.34);
    path.beginPath();
    path.moveTo(210, this.terrainY(210) - 18);
    for (let x = 210; x <= 2280; x += 28) path.lineTo(x, this.terrainY(x) - 18);
    path.strokePath();
    path.lineStyle(14, 0xf0d99f, 0.14);
    path.beginPath();
    path.moveTo(230, this.terrainY(230) - 38);
    for (let x = 230; x <= 2250; x += 44) path.lineTo(x, this.terrainY(x) - 38);
    path.strokePath();
  }

  drawForegroundPlants() {
    for (let x = 120; x < 2450; x += Phaser.Math.Between(55, 105)) {
      const y = this.terrainY(x) - Phaser.Math.Between(12, 26);
      const stem = this.add.line(x, y + 12, 0, 0, 0, -Phaser.Math.Between(28, 58), 0x99c783, Phaser.Math.FloatBetween(0.35, 0.7)).setDepth(32);
      const flower = this.add.circle(x, y - Phaser.Math.Between(14, 42), Phaser.Math.Between(5, 9), Phaser.Math.RND.pick([0xf2d2ea, 0xcce5ff, 0xffe39d, 0xffffff, 0xd7c2ff]), 0.85).setDepth(33);
      this.tweens.add({ targets: [stem, flower], x: x + Phaser.Math.Between(-3, 3), duration: Phaser.Math.Between(1800, 3200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  placeModularAssets() {
    // cottage is staged behind the path; Amber starts in front of it, not under it
    this.add.image(325, this.terrainY(320) - 8, 'v8-cottage').setOrigin(0.5, 1).setDepth(8).setScale(1.06);
    this.makeFence(640, 980, 7);
    this.makeLamp(950, this.terrainY(950), 0.72);

    // lake is a lower scenic layer, not the player surface
    const lake = this.add.graphics().setDepth(2);
    lake.fillStyle(0x6cc8c8, 0.62);
    lake.fillEllipse(1420, this.terrainY(1420) + 95, 630, 190);
    lake.fillStyle(0xbdeee5, 0.18);
    lake.fillEllipse(1500, this.terrainY(1420) + 70, 390, 50);
    for (let i = 0; i < 9; i++) {
      const reedX = 1220 + i * 32;
      this.add.line(reedX, this.terrainY(1420) + 55, 0, 0, 0, -Phaser.Math.Between(45, 95), 0x8fb96e, 0.6).setDepth(12);
    }
    const frog = this.add.container(1350, this.terrainY(1420) + 38).setDepth(18);
    frog.add(this.add.circle(0, 0, 24, 0x78b959, 0.98));
    frog.add(this.add.circle(-8, -14, 7, 0xffffff, 0.95));
    frog.add(this.add.circle(8, -14, 7, 0xffffff, 0.95));
    frog.add(this.add.circle(-8, -14, 3, 0x0b1524, 0.95));
    frog.add(this.add.circle(8, -14, 3, 0x0b1524, 0.95));
    this.tweens.add({ targets: frog, y: frog.y - 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.image(1780, this.terrainY(1780) + 2, 'v8-tree').setOrigin(0.5, 1).setDepth(10).setScale(1.12);
    this.add.image(2045, this.terrainY(2045) + 10, 'v8-bench').setOrigin(0.5, 1).setDepth(18).setScale(0.82);
    this.makeLamp(2170, this.terrainY(2170), 0.72);

    // hidden side pocket lower in foreground/valley
    const pocket = this.add.graphics().setDepth(13);
    pocket.fillStyle(0x214f31, 0.96);
    pocket.fillRoundedRect(2325, this.terrainY(2325) + 60, 420, 110, 50);
    for (let i = 0; i < 13; i++) this.add.circle(2340 + i * 31, this.terrainY(2325) + 53 + Phaser.Math.Between(-10, 10), Phaser.Math.Between(23, 37), 0x2e6f3f, 0.92).setDepth(21);
    this.add.image(2535, this.terrainY(2535) + 30, 'v8-blue-grapes').setOrigin(0.5, 1).setDepth(24).setScale(0.72);

    // foreground vignette plants for depth
    for (let i = 0; i < 7; i++) {
      this.add.ellipse(Phaser.Math.Between(0, this.worldW), Phaser.Math.Between(1120, 1320), Phaser.Math.Between(220, 410), Phaser.Math.Between(55, 110), 0x081a18, 0.18).setScrollFactor(1.08).setDepth(80);
    }
  }

  makeFence(startX, endX, count) {
    const g = this.add.graphics().setDepth(17);
    g.lineStyle(8, 0xd5b36e, 0.88);
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Linear(startX, endX, i / (count - 1));
      const y = this.terrainY(x) - 8;
      g.lineBetween(x, y, x, y + 95);
    }
    g.lineStyle(8, 0xd5b36e, 0.78);
    g.beginPath();
    g.moveTo(startX, this.terrainY(startX) + 25);
    for (let x = startX; x <= endX; x += 30) g.lineTo(x, this.terrainY(x) + 20);
    g.strokePath();
  }

  makeLamp(x, groundY, scale = 1) {
    const lamp = this.add.image(x, groundY + 5, 'v8-lamp').setOrigin(0.5, 1).setDepth(16).setScale(scale);
    const glow = this.add.circle(x, groundY - 145 * scale, 65 * scale, 0xffe59a, 0.13).setDepth(15);
    this.tweens.add({ targets: glow, alpha: 0.22, scale: 1.08, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return lamp;
  }

  createPlayer() {
    const startX = 610;
    const startY = this.terrainY(startX);
    this.player = this.add.container(startX, startY).setDepth(40);
    this.shadow = this.add.ellipse(0, -3, 58, 14, 0x061018, 0.24).setDepth(-1);
    const body = this.add.ellipse(0, -45, 44, 84, 0xf279ad, 1);
    const head = this.add.circle(0, -103, 34, 0xffdfaa, 1);
    const eye = this.add.circle(13, -108, 4, 0x0b1524, 1);
    const hair = this.add.triangle(-9, -139, -28, 0, 22, 16, -13, 46, 0xffd84d, 1);
    this.player.add([this.shadow, body, head, eye, hair]);
    this.playerBody = { body, head, eye, hair };
    this.playerGroundOffset = 0;
    this.activeCheckpoint = { x: startX, y: startY };
  }

  createCollectibles() {
    this.fluff = this.add.image(1810, this.terrainY(1780) - 330, 'v8-moonfluff').setDepth(46).setScale(0.48);
    this.tweens.add({ targets: this.fluff, y: this.fluff.y - 12, scale: 0.55, duration: 1450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.finishZone = new Phaser.Geom.Rectangle(2490, this.terrainY(2490) - 120, 260, 190);
  }

  createAmbientMotion() {
    for (let i = 0; i < 18; i++) {
      const p = this.add.circle(Phaser.Math.Between(100, this.worldW - 200), Phaser.Math.Between(360, 900), Phaser.Math.FloatBetween(2, 6), 0xffe89f, Phaser.Math.FloatBetween(0.08, 0.24)).setDepth(35);
      this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-40, 70), y: p.y - Phaser.Math.Between(20, 70), alpha: 0.03, duration: Phaser.Math.Between(3000, 6200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  startIntro() {
    this.showMessage('De Fluistervelden zijn wakker.', 2300);
    this.time.delayedCall(900, () => { this.inputLocked = false; });
  }

  showMessage(text, duration = 2200) {
    if (window.FTTM.showMessage) window.FTTM.showMessage(text, duration);
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.033);
    if (!this.player || this.finished) return;
    const input = window.FTTM.InputState || {};
    const s = window.FTTM.GameSettings;

    let dir = 0;
    if (!this.inputLocked) {
      if (input.left) dir -= 1;
      if (input.right) dir += 1;
    }

    const targetVx = dir * s.playerSpeed;
    const accel = Math.abs(targetVx) > Math.abs(this.vx) ? s.acceleration : s.deceleration;
    this.vx = Phaser.Math.Linear(this.vx, targetVx, Math.min(1, accel * dt / Math.max(1, Math.abs(targetVx - this.vx))));
    if (Math.abs(this.vx) < 4 && dir === 0) this.vx = 0;

    if (dir !== 0) {
      this.facing = dir;
      this.player.setScale(dir, 1);
      const walkBob = Math.sin(time * 0.018) * 2;
      this.playerBody.body.y = -45 + walkBob;
      this.playerBody.head.y = -103 + walkBob * 0.35;
    } else {
      this.playerBody.body.y = Phaser.Math.Linear(this.playerBody.body.y, -45, 0.12);
      this.playerBody.head.y = Phaser.Math.Linear(this.playerBody.head.y, -103, 0.12);
    }

    const jumpDown = !!input.jump && !this.inputLocked;
    if (jumpDown && !this.jumpWasDown && this.onGround) {
      this.vy = s.jumpVelocity;
      this.onGround = false;
    }
    if (!jumpDown && this.jumpWasDown && this.vy < s.jumpCutVelocity) this.vy = s.jumpCutVelocity;
    this.jumpWasDown = jumpDown;

    this.player.x = Phaser.Math.Clamp(this.player.x + this.vx * dt, 80, this.worldW - 80);
    const groundY = this.terrainY(this.player.x);
    if (this.onGround) {
      this.player.y = groundY;
      this.vy = 0;
    } else {
      this.vy += s.gravityY * dt;
      this.player.y += this.vy * dt;
      if (this.player.y >= groundY) {
        this.player.y = groundY;
        this.vy = 0;
        this.onGround = true;
      }
    }

    // gentle rotation to match slope, not enough to look unstable
    const slope = Phaser.Math.Clamp(this.terrainSlope(this.player.x), -0.34, 0.34);
    this.player.rotation = Phaser.Math.Linear(this.player.rotation, slope * 0.35, 0.09);

    this.checkCollection();
    this.updateCamera(false);
  }

  checkCollection() {
    if (this.fluff && Phaser.Math.Distance.Between(this.player.x, this.player.y - 70, this.fluff.x, this.fluff.y) < 74) {
      this.fluff.destroy();
      this.fluff = null;
      this.collected = 1;
      if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(1, this.totalFluffs);
      this.showMessage('Je vond het eerste maanpluis.', 1900);
    }
    if (!this.finished && this.collected >= 1 && Phaser.Geom.Rectangle.Contains(this.finishZone, this.player.x, this.player.y - 70)) {
      this.finished = true;
      this.vx = 0;
      this.inputLocked = true;
      if (window.FTTM.showFinishPanel) window.FTTM.showFinishPanel();
      this.showMessage('Een warm plekje in de Fluistervelden.', 2800);
    }
  }

  updateCamera(force = false) {
    const cam = this.cameras.main;
    const forward = this.facing >= 0 ? this.visibleW * 0.28 : this.visibleW * 0.18;
    let targetX = this.player.x - forward;
    let targetY = this.player.y - this.visibleH * 0.64;
    targetX = Phaser.Math.Clamp(targetX, 0, this.worldW - this.visibleW);
    targetY = Phaser.Math.Clamp(targetY, 80, this.worldH - this.visibleH);
    if (force) {
      cam.scrollX = targetX;
      cam.scrollY = targetY;
    } else {
      cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetX, 0.055);
      cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetY, 0.035);
    }
  }
}

window.LevelScene = LevelScene;
window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;

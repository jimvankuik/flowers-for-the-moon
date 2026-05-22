class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
    this.collected = 0;
    this.totalFluffs = 1;
    this.currentSpeed = 0;
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.jumpWasDown = false;
    this.jumpLocked = false;
    this.wasGrounded = false;
    this.facing = 1;
    this.lastDoAt = 0;
    this.finished = false;
    this.inputLocked = true;
    this.activeCheckpoint = { x: 230, y: 0 };
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

    // v5.0 Vertical World Foundation:
    // compact levels, but with larger vertical composition so Fluistervelden
    // feels bigger than it is. Camera is allowed to follow real height changes.
    this.groundY = this.isPortrait ? this.visibleH - 150 : this.visibleH - 134;
    this.worldBottom = this.visibleH + 1320;

    this.physics.world.setBounds(0, 0, s.worldWidth, this.worldBottom);
    this.cameras.main.setBounds(0, 0, s.worldWidth, this.worldBottom);
    this.cameras.main.setZoom(this.worldZoom);

    if (window.FTTM.hideFinishPanel) window.FTTM.hideFinishPanel();
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(0, this.totalFluffs);

    this.drawSky();
    this.createLandscapeFromScratch();
    this.createHomeAndGarden();
    this.createLakeScene();
    this.createParkScene();
    this.createSideArea();
    this.createMoonRevealArea();
    this.createAtmosphere();
    this.createPlayer();
    this.createCollectibles();
    this.createInteractionZones();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.fluffs, this.collectMoonFluff, null, this);
    this.physics.add.overlap(this.player, this.plants, this.collectPlant, null, this);
    this.physics.add.overlap(this.player, this.checkpoints, this.touchCheckpoint, null, this);
    this.physics.add.overlap(this.player, this.finishZone, this.tryFinish, null, this);
    this.physics.add.overlap(this.player, this.moonRevealZone, this.triggerMoonReveal, null, this);

    this.updateCamera(true);
    this.startIntroSequence();
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

  startIntroSequence() {
    this.setMessage('Amber hears a soft sound.', 2200);
    const sound = this.add.text(150, this.groundY - 260, '♪', { fontFamily: 'Arial', fontSize: '34px', color: '#fff7c8' }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: sound, x: sound.x + 110, y: sound.y - 42, alpha: 0, scale: 1.5, duration: 1500, ease: 'Sine.easeOut', onComplete: () => sound.destroy() });
    this.time.delayedCall(1350, () => {
      this.inputLocked = false;
      this.setMessage('The garden is awake.', 2100);
    });
  }

  drawSky() {
    const s = window.FTTM.GameSettings;
    this.add.rectangle(s.worldWidth / 2, this.worldBottom / 2, s.worldWidth, this.worldBottom, 0x102655).setScrollFactor(1).setDepth(-30);
    this.add.rectangle(s.worldWidth / 2, this.groundY + 260, s.worldWidth, 560, 0x07152e).setDepth(-28);

    // Distant parallax hills: simple + atmospheric, closer to Hoa/Ori than debug geometry.
    this.drawDistantHillLayer(0, this.groundY + 40, 0x1a3b5f, 0.30, 0.28, 900);
    this.drawDistantHillLayer(240, this.groundY + 10, 0x214a66, 0.24, 0.36, 720);
    this.drawDistantHillLayer(70, this.groundY - 28, 0x2d5e6d, 0.18, 0.48, 520);

    // Stars and soft sky particles.
    for (let i = 0; i < 115; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, s.worldWidth),
        Phaser.Math.Between(24, Math.max(90, this.groundY - 230)),
        Phaser.Math.FloatBetween(0.7, 1.9),
        0xffffff,
        Phaser.Math.FloatBetween(0.14, 0.52)
      ).setScrollFactor(0.35).setDepth(-14);
      this.tweens.add({ targets: star, alpha: star.alpha * 0.42, duration: Phaser.Math.Between(1300, 3000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Rainbow near the lower lake valley: background payoff, not a foreground prop.
    this.rainbow = this.add.graphics().setDepth(-10).setScrollFactor(0.55);
    const rx = 1980, ry = this.groundY - 42;
    const colors = [0xff8fa3, 0xffd38e, 0xfff6a3, 0xbef7a1, 0x9bd5ff, 0xc9a6ff];
    colors.forEach((c, i) => {
      this.rainbow.lineStyle(9, c, 0.27);
      this.rainbow.beginPath();
      this.rainbow.arc(rx, ry, 270 - i * 15, Math.PI, Math.PI * 2, false);
      this.rainbow.strokePath();
    });

    // First moon reveal, high and spacious. Clouds uncover it when Amber reaches the hill.
    this.revealMoon = this.add.container(4880, this.groundY - 510).setDepth(-4);
    this.revealMoon.setAlpha(0);
    this.revealMoon.add(this.add.circle(0, 0, 124, 0xffefb8, 0.10));
    this.revealMoon.add(this.add.circle(0, 0, 78, 0xffefb8, 0.88));
    this.revealMoon.add(this.add.circle(30, -16, 64, 0x102655, 0.34));
    this.moonClouds = [];
    for (const c of [[4820, this.groundY - 438, 185, 44], [4930, this.groundY - 410, 235, 52], [4735, this.groundY - 392, 160, 40]]) {
      const cloud = this.add.ellipse(c[0], c[1], c[2], c[3], 0xffffff, 0.11).setDepth(-3).setScrollFactor(0.85);
      this.moonClouds.push(cloud);
    }
  }

  drawDistantHillLayer(offsetX, baseY, color, alpha, scroll, width) {
    const s = window.FTTM.GameSettings;
    const g = this.add.graphics().setDepth(-16).setScrollFactor(scroll);
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(-200, baseY + 360);
    g.lineTo(-200, baseY + 70);
    for (let x = -200; x <= s.worldWidth + 600; x += width) {
      const peakX = x + width * 0.5 + offsetX % 150;
      const peakY = baseY - Phaser.Math.Between(20, 96);
      this.quadLine(g, x, baseY + Phaser.Math.Between(20, 55), peakX, peakY, x + width, baseY + Phaser.Math.Between(8, 70), 18);
    }
    g.lineTo(s.worldWidth + 700, baseY + 390);
    g.closePath();
    g.fillPath();
  }

  createLandscapeFromScratch() {
    this.platforms = this.physics.add.staticGroup();
    this.checkpoints = this.physics.add.staticGroup();
    this.landLayers = this.add.graphics().setDepth(-2);
    this.grassLayer = this.add.graphics().setDepth(5);
    const gy = this.groundY;

    // v5.0 Vertical World Foundation:
    // Compact, but with strong height variation. The main route remains readable,
    // while side areas use vertical space to feel hidden and discovered.
    this.addGroundSegment(0, gy - 285, 660, 0x6fae72, 'home hill', { left: 58, right: 18, dip: 22 });
    this.addGroundSegment(610, gy - 255, 460, 0x74b875, 'flower garden high', { left: 16, right: 42, dip: 18 });
    this.addGroundSegment(1010, gy - 182, 380, 0x6aa76f, 'soft descent 1', { left: 30, right: 56, dip: 28 });
    this.addGroundSegment(1340, gy - 88, 370, 0x609b68, 'soft descent 2', { left: 45, right: 60, dip: 34 });
    this.addGroundSegment(1640, gy + 42, 780, 0x5d9365, 'low lake valley', { left: 36, right: 20, dip: 16 });
    this.addGroundSegment(2350, gy - 12, 360, 0x659d69, 'lake exit slope', { left: 28, right: 42, dip: 20 });
    this.addGroundSegment(2650, gy - 96, 360, 0x6ba66e, 'climb to park 1', { left: 32, right: 58, dip: 26 });
    this.addGroundSegment(2960, gy - 205, 800, 0x657f68, 'upper park path', { left: 42, right: 22, dip: 16 });
    this.addGroundSegment(3720, gy - 170, 360, 0x647b66, 'park exit ledge', { left: 18, right: 54, dip: 20 });
    this.addGroundSegment(4010, gy - 245, 430, 0x6ba76e, 'moon approach climb', { left: 35, right: 62, dip: 26 });
    this.addGroundSegment(4390, gy - 335, 980, 0x73b674, 'high moon reveal meadow', { left: 54, right: 24, dip: 20 });

    // Nature-integrated traversal: tree branches and small root ledges instead of floating blocks.
    this.addSoftBranch(1510, gy - 220, 155, 20);
    this.addSoftBranch(1608, gy - 292, 170, 20);
    this.addSoftBranch(1760, gy - 250, 120, 18);

    // Hidden lower side area below the park. It should feel like choosing a secret path.
    this.addGroundSegment(3260, gy + 96, 560, 0x4f835d, 'hidden lower blue-grape nook', { left: 24, right: 18, dip: 12 });
    this.addSoftBranch(3198, gy - 96, 132, 18); // entry hint
    this.addSoftBranch(3845, gy - 96, 150, 18); // return hint

    // Extra foreground silhouettes for depth. Non-colliding.
    this.drawForegroundGrassBand(520, gy - 220, 380);
    this.drawForegroundGrassBand(1690, gy + 66, 680);
    this.drawForegroundGrassBand(3000, gy - 180, 720);
    this.drawForegroundGrassBand(4400, gy - 310, 760);

    // Invisible checkpoints.
    this.addCheckpoint(235, gy - 356);
    this.addCheckpoint(1120, gy - 250);
    this.addCheckpoint(1690, gy - 30);
    this.addCheckpoint(2830, gy - 170);
    this.addCheckpoint(3430, gy + 55);
    this.addCheckpoint(4440, gy - 405);
  }



  drawForegroundGrassBand(x, y, w) {
    const g = this.add.graphics().setDepth(24).setAlpha(0.28);
    g.fillStyle(0x0b261f, 1);
    g.beginPath();
    g.moveTo(x - 60, y + 90);
    for (let i = 0; i <= 12; i++) {
      const px = x + (w / 12) * i;
      const py = y + Phaser.Math.Between(20, 58);
      g.lineTo(px, py);
      g.lineTo(px + Phaser.Math.Between(8, 24), y + Phaser.Math.Between(-8, 22));
    }
    g.lineTo(x + w + 80, y + 120);
    g.lineTo(x - 60, y + 120);
    g.closePath();
    g.fillPath();
  }

  quadLine(g, x0, y0, cx, cy, x1, y1, steps = 14) {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      g.lineTo(x, y);
    }
  }

  addGroundSegment(x, topY, w, color, label, shape = {}) {
    const h = 44;

    // Collision stays simple, wide and child-friendly.
    const collider = this.add.rectangle(x + w / 2, topY + h / 2, w, h, 0x000000, 0);
    this.physics.add.existing(collider, true);
    this.platforms.add(collider);

    // Visible terrain is intentionally more organic than the collision.
    const leftLift = shape.left || 24;
    const rightLift = shape.right || 24;
    const dip = shape.dip || 22;
    const g = this.add.graphics().setDepth(0);

    // Main hill body.
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(x - 34, topY + 40);
    this.quadLine(g, x - 34, topY + 40, x + w * 0.18, topY - leftLift, x + w * 0.42, topY + dip * 0.25);
    this.quadLine(g, x + w * 0.42, topY + dip * 0.25, x + w * 0.72, topY + dip, x + w + 34, topY - rightLift * 0.45);
    g.lineTo(x + w + 72, topY + 190);
    g.lineTo(x - 72, topY + 190);
    g.closePath();
    g.fillPath();

    // Soft darker underside for depth.
    g.fillStyle(0x1f453d, 0.22);
    g.beginPath();
    g.moveTo(x - 20, topY + 80);
    this.quadLine(g, x - 20, topY + 80, x + w * 0.25, topY + 48, x + w * 0.58, topY + 72);
    this.quadLine(g, x + w * 0.58, topY + 72, x + w * 0.82, topY + 94, x + w + 38, topY + 60);
    g.lineTo(x + w + 58, topY + 182);
    g.lineTo(x - 56, topY + 182);
    g.closePath();
    g.fillPath();

    // Curved grass highlight along the playable top.
    const grass = this.add.graphics().setDepth(6);
    grass.lineStyle(9, 0xc7ef8c, 0.92);
    grass.beginPath();
    grass.moveTo(x - 14, topY + 4);
    this.quadLine(grass, x - 14, topY + 4, x + w * 0.24, topY - 8, x + w * 0.50, topY + 5, 10);
    this.quadLine(grass, x + w * 0.50, topY + 5, x + w * 0.76, topY + 14, x + w + 16, topY + 1, 10);
    grass.strokePath();

    // Small grass tufts, sparse and soft.
    for (let i = 0; i < Math.max(5, Math.floor(w / 110)); i++) {
      const tx = x + 28 + i * (w - 56) / Math.max(1, Math.floor(w / 110));
      const ty = topY + Phaser.Math.Between(-2, 10);
      const tuft = this.add.container(tx, ty).setDepth(8);
      tuft.add(this.add.rectangle(-5, 2, 2, 18, 0xaee883, 0.72).setAngle(-18));
      tuft.add(this.add.rectangle(0, 0, 2, 22, 0xc7ef8c, 0.74));
      tuft.add(this.add.rectangle(5, 2, 2, 18, 0xaee883, 0.72).setAngle(18));
      this.tweens.add({ targets: tuft, angle: Phaser.Math.Between(-3, 3), duration: Phaser.Math.Between(1100, 2100), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    if (label) {
      const t = this.add.text(x + 14, topY + 58, '', { fontFamily: 'Arial', fontSize: '12px', color: '#ffffff' }).setAlpha(0);
      t.setData('label', label);
    }
  }

  addSoftBranch(x, y, w, h) {
    const branchCollider = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(14);
    this.physics.add.existing(branchCollider, true);
    this.platforms.add(branchCollider);

    const g = this.add.graphics().setDepth(14);
    g.fillStyle(0x8f633b, 1);
    g.beginPath();
    g.moveTo(x, y + h * 0.55);
    this.quadLine(g, x, y + h * 0.55, x + w * 0.35, y - 6, x + w, y + h * 0.35, 10);
    g.lineTo(x + w, y + h + 4);
    this.quadLine(g, x + w, y + h + 4, x + w * 0.45, y + h + 10, x, y + h + 2, 10);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0xc7924e, 0.65);
    g.beginPath();
    g.moveTo(x + 8, y + h * 0.45);
    this.quadLine(g, x + 8, y + h * 0.45, x + w * 0.42, y, x + w - 8, y + h * 0.35, 10);
    g.strokePath();
  }

  addCheckpoint(x, y) {
    const zone = this.add.zone(x, y, 150, 180);
    this.physics.add.existing(zone, true);
    zone.setData('spawnX', x);
    zone.setData('spawnY', y - 34);
    this.checkpoints.add(zone);
  }

  createHomeAndGarden() {
    const gy = this.groundY;

    // Amber's house v4.1: one cohesive, readable shape instead of loose blocks.
    this.house = this.add.container(270, gy - 330).setDepth(10);

    // House shadow / hill contact.
    this.house.add(this.add.ellipse(0, 188, 230, 42, 0x1d3a34, 0.22));

    // Main body and side volume connect as one house.
    this.house.add(this.add.rectangle(0, 86, 178, 154, 0xf5d29b, 1));
    this.house.add(this.add.rectangle(0, 10, 190, 16, 0xe6bd83, 1));

    // Roof as a single large roof with underside trim.
    this.house.add(this.add.triangle(0, -18, -112, 72, 112, 72, 0, -86, 0xd0726c));
    this.house.add(this.add.rectangle(0, 72, 206, 12, 0xb85f61, 1));

    // Chimney attached to roof.
    this.house.add(this.add.rectangle(58, -56, 30, 78, 0x875b45, 1));
    this.house.add(this.add.rectangle(58, -100, 42, 18, 0xb0bfd6, 0.55));

    // Door and warm windows.
    this.house.add(this.add.rectangle(0, 154, 44, 78, 0x8a5a3c, 1));
    this.house.add(this.add.circle(14, 154, 3, 0xffefaa, 1));
    for (const w of [[-48, 82], [48, 82], [-48, 28], [48, 28]]) {
      this.house.add(this.add.rectangle(w[0], w[1], 38, 34, 0x9bd7ff, 0.88));
      this.house.add(this.add.rectangle(w[0], w[1], 22, 21, 0xfff1b0, 0.26));
      this.house.add(this.add.rectangle(w[0], w[1], 4, 34, 0x6fa8c8, 0.38));
      this.house.add(this.add.rectangle(w[0], w[1], 38, 4, 0x6fa8c8, 0.38));
    }

    // Tiny path and flowers around the house to make it feel rooted.
    this.add.ellipse(275, gy - 111, 90, 30, 0xd8c293, 0.34).setDepth(6);
    for (const fx of [155, 190, 360, 392]) {
      this.add.rectangle(fx, gy - 188, 3, 28, 0x7fc46a, 0.84).setDepth(9);
      this.add.circle(fx, gy - 206, 6, 0xffc9e8, 0.92).setDepth(11);
    }

    // Little smoke puffs.
    for (let i = 0; i < 4; i++) {
      const puff = this.add.circle(336 + i * 18, gy - 452 - i * 18, 13 + i * 3, 0xffffff, 0.10).setDepth(9);
      this.tweens.add({ targets: puff, y: puff.y - 28, x: puff.x + 14, alpha: 0.02, duration: 2600 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Garden fence and flowers that react when Amber walks through them.
    this.gardenFlowers = [];
    for (let i = 0; i < 18; i++) {
      const x = 590 + i * 22;
      const y = gy - 242 - Phaser.Math.Between(0, 20);
      const stem = this.add.rectangle(x, y + 18, 3, 36, 0x7fc46a, 0.92).setDepth(9);
      const bloom = this.add.circle(x, y, Phaser.Math.Between(5, 8), Phaser.Math.RND.pick([0xffc9e8, 0xe1d4ff, 0xfff0a6, 0xbee9ff]), 0.94).setDepth(11);
      const flower = this.add.container(0, 0, [stem, bloom]);
      flower.setData('baseX', x);
      flower.setData('baseY', y);
      this.gardenFlowers.push(flower);
    }
    for (let i = 0; i < 7; i++) {
      this.add.rectangle(560 + i * 64, gy - 226, 7, 64, 0xd7bd86, 0.9).setDepth(8);
      this.add.rectangle(560 + i * 64, gy - 251, 52, 7, 0xd7bd86, 0.82).setDepth(8);
    }
  }


  createLakeScene() {
    const gy = this.groundY;

    // Desired composition: Tree -> Bench -> Lake, with rainbow as background payoff.
    // This entire scene sits in the lower valley, so the dynamic camera has a real reason to descend.
    this.drawClimbTree(1575, gy - 215);
    this.drawBench(1845, gy + 8);

    // Lake after the bench, broad and calm.
    this.lake = this.add.ellipse(2100, gy + 118, 580, 104, 0x70b8cf, 0.52).setDepth(3);
    this.add.ellipse(2100, gy + 124, 470, 54, 0xa7e2eb, 0.30).setDepth(4);
    this.add.ellipse(2100, gy + 90, 330, 18, 0xffffff, 0.10).setDepth(5);

    for (let i = 0; i < 16; i++) {
      const reed = this.add.rectangle(1850 + i * 34, gy + 92, 4, Phaser.Math.Between(38, 78), 0x8dcc75, 0.84).setOrigin(0.5, 1).setDepth(7);
      this.tweens.add({ targets: reed, angle: Phaser.Math.Between(-8, 8), duration: Phaser.Math.Between(900, 1700), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.frog = this.add.text(2165, gy + 58, '🐸', { fontSize: '28px' }).setDepth(12).setAlpha(0.88);
    this.tweens.add({ targets: this.frog, y: gy + 40, duration: 500, yoyo: true, repeat: -1, repeatDelay: 2600, ease: 'Sine.easeOut' });
  }


  drawBench(x, y) {
    this.add.rectangle(x, y, 96, 12, 0x8b5a3b).setDepth(15);
    this.add.rectangle(x, y - 22, 100, 10, 0x9a6542).setDepth(15);
    this.add.rectangle(x - 36, y + 25, 9, 50, 0x5a3a2a).setDepth(14);
    this.add.rectangle(x + 36, y + 25, 9, 50, 0x5a3a2a).setDepth(14);
  }

  drawClimbTree(x, y) {
    this.add.rectangle(x, y + 145, 34, 260, 0x7d5637).setDepth(9);
    this.add.circle(x - 52, y + 45, 74, 0x4d925c).setDepth(10);
    this.add.circle(x + 30, y + 18, 90, 0x58a363).setDepth(10);
    this.add.circle(x + 92, y + 70, 58, 0x4d925c).setDepth(10);
    for (const a of [[x - 30, y + 22], [x + 28, y - 8], [x + 75, y + 76]]) {
      this.add.circle(a[0], a[1], 7, 0xff6b6b).setDepth(16);
    }
  }

  createParkScene() {
    const gy = this.groundY;
    // Park sits higher than the lake: compact, readable route with a cinematic lift.
    for (const x of [3005, 3275, 3545]) this.drawLampPost(x, gy - 182);
    for (const x of [3085, 3495]) this.drawBench(x, gy - 156);
    for (const x of [3195, 3635]) this.drawTrashBin(x, gy - 144);

    // Birds eating crumbs along the park path.
    for (const x of [2990, 3145, 3420, 3610]) {
      const bird = this.add.text(x, gy - 158, '🐦', { fontSize: '25px' }).setDepth(16).setAlpha(0.9);
      this.tweens.add({ targets: bird, x: x + Phaser.Math.Between(-16, 22), duration: Phaser.Math.Between(900, 1500), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.circle(x + 18, gy - 136, 3, 0xf6d38d, 0.75).setDepth(15);
    }
  }

  drawLampPost(x, y) {
    this.add.rectangle(x, y + 64, 9, 128, 0x40455d).setDepth(13);
    this.add.circle(x, y - 6, 25, 0xfff2b8, 0.18).setDepth(12);
    this.add.circle(x, y - 6, 12, 0xfff2b8, 0.86).setDepth(15);
  }

  drawTrashBin(x, y) {
    this.add.rectangle(x, y + 20, 34, 44, 0x3c6b62, 1).setDepth(14);
    this.add.rectangle(x, y - 4, 42, 8, 0x2f514d, 1).setDepth(15);
  }

  createSideArea() {
    const gy = this.groundY;

    // Hidden side area: visible as a curious dip behind bushes, not a straight path collectible.
    for (let i = 0; i < 15; i++) {
      const x = 3180 + i * 38;
      const y = gy - 126 + Phaser.Math.Between(-8, 8);
      const size = Phaser.Math.Between(20, 34);
      const alpha = (i === 2 || i === 3 || i === 4) ? 0.42 : 0.92; // subtle entry gap
      this.add.circle(x, y, size, 0x416f4e, alpha).setDepth(18);
    }

    // Butterfly hint moves into the lower path.
    const butterfly = this.add.text(3250, gy - 194, 'ʚɞ', { fontFamily: 'Arial', fontSize: '24px', color: '#d8c7ff' }).setOrigin(0.5).setDepth(22);
    this.tweens.add({ targets: butterfly, y: gy - 86, x: 3325, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The discovered nook below the route.
    this.add.ellipse(3560, gy + 38, 460, 88, 0x274d44, 0.30).setDepth(1);
    for (let i = 0; i < 20; i++) {
      const x = 3350 + i * 24;
      this.add.rectangle(x, gy + 70, 3, Phaser.Math.Between(30, 58), 0x75b862, 0.78).setOrigin(0.5, 1).setDepth(9);
      this.add.circle(x, gy + 44 - Phaser.Math.Between(0, 12), 4, 0x9bb7ff, 0.72).setDepth(12);
    }
    this.add.text(3560, gy + 14, 'stil hoekje', { fontFamily: 'Arial', fontSize: '18px', color: '#dbeebc' }).setOrigin(0.5).setAlpha(0.0);
  }


  createMoonRevealArea() {
    const gy = this.groundY;
    this.moonRevealZone = this.add.zone(4320, gy - 292, 300, 270);
    this.physics.add.existing(this.moonRevealZone, true);
    this.moonRevealed = false;

    this.finishZone = this.add.zone(5260, gy - 305, 220, 240);
    this.physics.add.existing(this.finishZone, true);
    this.finishMarker = this.add.container(5260, gy - 322).setDepth(16);
    this.finishMarker.add(this.add.circle(0, 0, 42, 0xfff2b8, 0.11));
    this.finishMarker.add(this.add.text(0, 0, '✧', { fontFamily: 'Arial', fontSize: '34px', color: '#fff6da' }).setOrigin(0.5).setAlpha(0.58));
    this.tweens.add({ targets: this.finishMarker, alpha: 0.48, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  createAtmosphere() {
    const s = window.FTTM.GameSettings;
    for (let i = 0; i < 70; i++) {
      const p = this.add.circle(Phaser.Math.Between(0, s.worldWidth), Phaser.Math.Between(120, this.groundY - 20), Phaser.Math.FloatBetween(1.2, 2.8), 0xffffff, Phaser.Math.FloatBetween(0.13, 0.42)).setDepth(7);
      this.tweens.add({ targets: p, x: p.x + Phaser.Math.Between(-30, 48), y: p.y + Phaser.Math.Between(-18, 18), duration: Phaser.Math.Between(2300, 5200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Light flower clusters: sparse foreground polish, not gameplay.
    for (const cluster of [[650, -248], [1180, -180], [1880, 70], [2780, -92], [3350, -205], [4560, -330]]) {
      for (let i = 0; i < 10; i++) {
        const fx = cluster[0] + Phaser.Math.Between(-120, 120);
        const fy = this.groundY + cluster[1] + Phaser.Math.Between(-10, 10);
        this.add.rectangle(fx, fy + 12, 2, 24, 0x7fc46a, 0.62).setDepth(9);
        this.add.circle(fx, fy, Phaser.Math.Between(3, 6), Phaser.Math.RND.pick([0xffc9e8, 0xe1d4ff, 0xfff0a6, 0xbee9ff]), 0.72).setDepth(11);
      }
    }

    // Birds crossing rainbow/lake and park.
    for (const b of [[1240, this.groundY - 270], [2140, this.groundY - 330], [4700, this.groundY - 420]]) {
      const bird = this.add.text(b[0], b[1], '⌁', { fontFamily: 'Arial', fontSize: '36px', color: '#ffffff' }).setOrigin(0.5).setDepth(5).setAlpha(0.42);
      this.tweens.add({ targets: bird, x: bird.x + 420, y: bird.y - 20, duration: 5200, repeat: -1, repeatDelay: 1800, ease: 'Sine.easeInOut' });
    }
  }

  createPlayer() {
    this.player = this.add.container(235, this.groundY - 356).setDepth(40);
    this.activeCheckpoint = { x: 235, y: this.groundY - 356 };
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

  createCollectibles() {
    this.fluffs = this.physics.add.staticGroup();
    this.plants = this.physics.add.staticGroup();

    // First Moon Fluff in/above the tree near the lake.
    this.addMoonFluff(1668, this.groundY - 334);

    // First optional plant in the hidden side area.
    this.addPlant('Blauwe druifjes gevonden!', 3580, this.groundY + 50, '♧', '#9bb7ff');
  }

  addMoonFluff(x, y) {
    const visual = this.add.container(x, y).setDepth(30);
    visual.add(this.add.circle(0, 0, 30, 0xfff6b9, 0.20));
    visual.add(this.add.circle(0, 0, 12, 0xfffbdb, 0.95));
    visual.add(this.add.text(0, 1, '✦', { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5));
    visual.setData('collected', false);
    this.physics.add.existing(visual, true);
    visual.body.setSize(58, 58);
    visual.body.setOffset(-29, -29);
    this.fluffs.add(visual);
    this.tweens.add({ targets: visual, y: y - 14, duration: 1250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  addPlant(name, x, y, icon, color) {
    const plant = this.add.container(x, y).setDepth(30);
    plant.add(this.add.text(0, 0, icon, { fontFamily: 'Arial', fontSize: '38px', color }).setOrigin(0.5));
    plant.setData('plantName', name);
    plant.setData('collected', false);
    this.physics.add.existing(plant, true);
    plant.body.setSize(64, 64);
    plant.body.setOffset(-32, -32);
    this.plants.add(plant);
  }

  createInteractionZones() {
    const gy = this.groundY;
    this.benchZone = this.add.zone(1845, gy - 15, 170, 120);
    this.physics.add.existing(this.benchZone, true);
    this.appleZone = this.add.zone(1575, gy - 210, 250, 330);
    this.physics.add.existing(this.appleZone, true);
  }

  updateGardenFlowers() {
    if (!this.gardenFlowers || !this.player) return;
    for (const flower of this.gardenFlowers) {
      const baseX = flower.getData('baseX');
      const baseY = flower.getData('baseY');
      const d = Math.abs(this.player.x - baseX);
      const sway = d < 95 ? (this.player.x < baseX ? 7 : -7) : 0;
      flower.x = Phaser.Math.Linear(flower.x, sway, 0.18);
      flower.y = Phaser.Math.Linear(flower.y, d < 95 ? -3 : 0, 0.15);
      flower.rotation = Phaser.Math.Linear(flower.rotation, sway * 0.018, 0.15);
    }
  }

  triggerMoonReveal() {
    if (this.moonRevealed) return;
    this.moonRevealed = true;
    this.setMessage('The clouds are moving.', 2400);
    this.tweens.add({ targets: this.revealMoon, alpha: 1, duration: 1200, ease: 'Sine.easeInOut' });
    this.moonClouds.forEach((c, i) => {
      this.tweens.add({ targets: c, x: c.x + 210 + i * 70, alpha: 0.02, duration: 1800 + i * 260, ease: 'Sine.easeInOut' });
    });
  }

  collectMoonFluff(player, fluff) {
    if (!fluff || fluff.getData('collected')) return;
    fluff.setData('collected', true);
    if (fluff.body) fluff.body.enable = false;
    this.collected += 1;
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(this.collected, this.totalFluffs);
    this.setMessage('You found the first moon fluff.', 2300);
    this.tweens.add({ targets: fluff, y: fluff.y - 34, scale: 1.35, alpha: 0, duration: 340, ease: 'Sine.easeOut', onComplete: () => fluff.destroy() });
  }

  collectPlant(player, plant) {
    if (!plant || plant.getData('collected')) return;
    plant.setData('collected', true);
    if (plant.body) plant.body.enable = false;
    this.setMessage(plant.getData('plantName'), 2100);
    this.tweens.add({ targets: plant, y: plant.y - 20, alpha: 0, scale: 1.25, duration: 340, onComplete: () => plant.destroy() });
  }

  touchCheckpoint(player, zone) {
    if (!zone) return;
    this.activeCheckpoint = { x: zone.getData('spawnX'), y: zone.getData('spawnY') };
  }

  doInteraction() {
    const now = this.time.now;
    if (now - this.lastDoAt < 450) return;
    this.lastDoAt = now;
    const nearBench = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1845, this.groundY - 15) < 165;
    const nearTree = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1575, this.groundY - 210) < 210;

    if (nearBench) {
      this.setMessage('Amber sits and watches the rainbow.', 2600);
      this.tweens.add({ targets: this.player, scaleY: 0.88, duration: 150, yoyo: true, ease: 'Sine.easeInOut' });
      this.spawnBirds(1910, this.groundY - 295);
      return;
    }
    if (nearTree) {
      this.setMessage('The apples smell sweet.', 2100);
      const apple = this.add.circle(this.player.x + 18 * this.facing, this.player.y - 38, 7, 0xff6b6b).setDepth(60);
      this.tweens.add({ targets: apple, x: this.player.x + 5 * this.facing, y: this.player.y - 34, alpha: 0, duration: 420, onComplete: () => apple.destroy() });
      return;
    }
    this.setMessage('Handstand!', 900);
    this.tweens.add({ targets: this.player, angle: 180, duration: 170, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => { this.player.angle = 0; } });
  }

  spawnBirds(x, y) {
    for (let i = 0; i < 4; i++) {
      const bird = this.add.text(x - i * 24, y + i * 9, '⌁', { fontFamily: 'Arial', fontSize: '30px', color: '#ffffff' }).setOrigin(0.5).setDepth(70).setAlpha(0.45);
      this.tweens.add({ targets: bird, x: bird.x + 380, y: bird.y - 40, alpha: 0, duration: 2300 + i * 220, ease: 'Sine.easeInOut', onComplete: () => bird.destroy() });
    }
  }

  tryFinish() {
    if (this.finished) return;
    if (this.collected < this.totalFluffs) {
      this.setMessage('Find the moon fluff first.', 2000);
      return;
    }
    this.finished = true;
    this.player.body.setVelocity(0, 0);
    this.currentSpeed = 0;
    this.cameras.main.stopFollow();
    this.setMessage('The moon is awake.', 2800);
    this.time.delayedCall(900, () => {
      for (let i = 0; i < 20; i++) {
        const h = this.add.text(this.revealMoon.x, this.revealMoon.y + 16, '♡', { fontFamily: 'Arial', fontSize: Phaser.Math.Between(18, 34) + 'px', color: '#ffd4e5' }).setOrigin(0.5).setDepth(120);
        this.tweens.add({ targets: h, x: h.x + Phaser.Math.Between(-145, 145), y: h.y - Phaser.Math.Between(60, 190), alpha: 0, duration: Phaser.Math.Between(1100, 1900), delay: i * 55, onComplete: () => h.destroy() });
      }
      if (window.FTTM.showFinishPanel) window.FTTM.showFinishPanel();
    });
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
      const p = this.add.circle(x, y, 3, 0xffffff, 0.78).setDepth(60);
      this.tweens.add({ targets: p, x: x + Phaser.Math.Between(-38, 38), y: y + Phaser.Math.Between(8, 42), alpha: 0, scale: 0.2, duration: 260, ease: 'Sine.easeOut', onComplete: () => p.destroy() });
    }
  }

  createBlowEffect() {
    const dir = this.facing;
    for (let i = 0; i < 9; i++) {
      const seed = this.add.circle(this.player.x + dir * 28, this.player.y - 22, 3, 0xffffff, 0.86).setDepth(62);
      this.tweens.add({ targets: seed, x: seed.x + dir * Phaser.Math.Between(60, 135), y: seed.y + Phaser.Math.Between(-52, 18), alpha: 0, scale: Phaser.Math.FloatBetween(0.6, 1.35), duration: Phaser.Math.Between(480, 760), delay: i * 18, ease: 'Sine.easeOut', onComplete: () => seed.destroy() });
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
    const cp = this.activeCheckpoint || { x: 235, y: this.groundY - 292 };
    this.player.setPosition(cp.x, cp.y);
    this.player.body.setVelocity(0, 0);
    this.currentSpeed = 0;
    this.jumpCount = 0;
    this.setMessage('Try again softly.', 1000);
  }

  updateCamera(initial) {
    if (this.finished) return;
    const s = window.FTTM.GameSettings;

    // Recalculate the visible world area from the current canvas and zoom.
    // This makes vertical camera movement work consistently on mobile landscape.
    this.visibleW = this.scale.width / this.worldZoom;
    this.visibleH = this.scale.height / this.worldZoom;

    const maxX = Math.max(0, s.worldWidth - this.visibleW);
    const maxY = Math.max(0, this.worldBottom - this.visibleH);
    const speed = this.currentSpeed || 0;

    // Horizontal framing: keep Amber left of center while moving right,
    // and give a little extra look-space when moving left.
    let targetAnchor;
    if (Math.abs(speed) > 35) {
      targetAnchor = speed > 0
        ? (this.isPortrait ? 0.20 : 0.22)
        : (this.isPortrait ? 0.50 : 0.45);
    } else {
      targetAnchor = this.cameraAnchor !== undefined ? this.cameraAnchor : (this.isPortrait ? 0.30 : 0.26);
    }

    if (initial || this.cameraAnchor === undefined) this.cameraAnchor = targetAnchor;
    else this.cameraAnchor = Phaser.Math.Linear(this.cameraAnchor, targetAnchor, 0.045);

    let desiredX = this.player.x - this.visibleW * this.cameraAnchor;
    desiredX = Phaser.Math.Clamp(desiredX, 0, maxX);

    // v5.0 dynamic vertical follow:
    // This deliberately makes the vertical movement visible for testing.
    // It follows real terrain changes smoothly, but filters out small jump bobbing.
    const onGround = this.player.body && (this.player.body.blocked.down || this.player.body.touching.down);
    const playerY = this.player.y;

    if (initial || this.cameraHeightFocusY === undefined) {
      this.cameraHeightFocusY = playerY;
    } else {
      const deltaY = playerY - this.cameraHeightFocusY;
      const strongHeightChange = Math.abs(deltaY) > 90;
      if (onGround || strongHeightChange) {
        this.cameraHeightFocusY = Phaser.Math.Linear(this.cameraHeightFocusY, playerY, 0.13);
      }
    }

    // Keep Amber a little below center. This makes descending to the lake and
    // climbing to the park visibly move the camera without becoming jumpy.
    let desiredY = this.cameraHeightFocusY - this.visibleH * (this.isPortrait ? 0.57 : 0.54);
    desiredY = Phaser.Math.Clamp(desiredY, 0, maxY);

    if (initial || this.cameraTargetX === undefined) {
      this.cameraTargetX = desiredX;
      this.cameraTargetY = desiredY;
      this.cameras.main.scrollX = desiredX;
      this.cameras.main.scrollY = desiredY;
      return;
    }

    this.cameraTargetX = Phaser.Math.Linear(this.cameraTargetX, desiredX, 0.12);
    this.cameraTargetY = Phaser.Math.Linear(this.cameraTargetY, desiredY, 0.18);
    this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, this.cameraTargetX, 0.16);
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, this.cameraTargetY, 0.18);
  }

  update(time, delta) {
    if (this.finished) return;
    const input = window.FTTM.InputState || {};
    const s = window.FTTM.GameSettings;
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;

    let target = 0;
    if (!this.inputLocked) {
      if (input.left) target -= s.playerSpeed;
      if (input.right) target += s.playerSpeed;
    }

    const rate = target === 0 ? s.deceleration : s.acceleration;
    const step = rate * (delta / 1000);
    if (this.currentSpeed < target) this.currentSpeed = Math.min(this.currentSpeed + step, target);
    if (this.currentSpeed > target) this.currentSpeed = Math.max(this.currentSpeed - step, target);
    this.player.body.setVelocityX(this.currentSpeed);

    if (Math.abs(this.currentSpeed) > 8) {
      this.facing = this.currentSpeed < 0 ? -1 : 1;
      this.player.scaleX = this.facing;
    }

    if (!this.inputLocked) this.handleVariableJump(input, onGround);
    else this.jumpWasDown = input.jump;

    if (!this.wasGrounded && onGround) this.playLandingFeedback();
    this.wasGrounded = onGround;

    if (!this.inputLocked && input.blow) {
      this.doInteraction();
      this.createBlowEffect();
    }

    if (this.player.y > this.groundY + 390) this.respawn();

    this.updateGardenFlowers();
    this.animatePlayer(delta, onGround);
    this.updateCamera(false);
  }
}

window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;
window.LevelScene = LevelScene;

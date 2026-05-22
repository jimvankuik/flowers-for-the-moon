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

    // v4.6 camera test pass:
    // deliberately taller world and stronger vertical follow so the camera behaviour is clearly testable.
    this.groundY = this.isPortrait ? this.visibleH - 145 : this.visibleH - 128;
    this.worldBottom = this.visibleH + 1650;

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
    this.createCameraTestGuides();
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
    this.add.rectangle(s.worldWidth / 2, this.worldBottom / 2, s.worldWidth, this.worldBottom, 0x122a60).setScrollFactor(1).setDepth(-20);
    this.add.rectangle(s.worldWidth / 2, this.groundY + 175, s.worldWidth, 420, 0x081633).setDepth(-18);

    // Stars and soft sky particles.
    for (let i = 0; i < 95; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, s.worldWidth),
        Phaser.Math.Between(26, Math.max(80, this.groundY - 170)),
        Phaser.Math.FloatBetween(0.7, 1.8),
        0xffffff,
        Phaser.Math.FloatBetween(0.16, 0.56)
      ).setScrollFactor(0.35).setDepth(-14);
      this.tweens.add({ targets: star, alpha: star.alpha * 0.42, duration: Phaser.Math.Between(1300, 2800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Rainbow near the lake: soft, distant background object.
    this.rainbow = this.add.graphics().setDepth(-10).setScrollFactor(0.55);
    const rx = 1980, ry = this.groundY - 54;
    const colors = [0xff8fa3, 0xffd38e, 0xfff6a3, 0xbef7a1, 0x9bd5ff, 0xc9a6ff];
    colors.forEach((c, i) => {
      this.rainbow.lineStyle(8, c, 0.28);
      this.rainbow.beginPath();
      this.rainbow.arc(rx, ry, 250 - i * 14, Math.PI, Math.PI * 2, false);
      this.rainbow.strokePath();
    });

    // Moon reveal is hidden behind clouds at first.
    this.revealMoon = this.add.container(4250, this.groundY - 405).setDepth(-4);
    this.revealMoon.setAlpha(0);
    this.revealMoon.add(this.add.circle(0, 0, 112, 0xffefb8, 0.11));
    this.revealMoon.add(this.add.circle(0, 0, 74, 0xffefb8, 0.88));
    this.revealMoon.add(this.add.circle(28, -16, 60, 0x122a60, 0.34));
    this.moonClouds = [];
    for (const c of [[4205, this.groundY - 335, 180, 42], [4300, this.groundY - 305, 230, 50], [4120, this.groundY - 292, 160, 38]]) {
      const cloud = this.add.ellipse(c[0], c[1], c[2], c[3], 0xffffff, 0.10).setDepth(-3).setScrollFactor(0.85);
      this.moonClouds.push(cloud);
    }
  }

  createLandscapeFromScratch() {
    this.platforms = this.physics.add.staticGroup();
    this.checkpoints = this.physics.add.staticGroup();
    const gy = this.groundY;

    // v4.1 composition pass: same intro idea, cleaner spatial design.
    // Route: warm home -> flower garden -> slope to lake -> tree/bank/lake -> park -> hidden lower side area -> moon reveal.
    // v4.3 uses stronger height variation to test soft vertical camera follow.
    // These are still prototype land blocks, but the route now reads as:
    // high home hill -> gentle garden drop -> low lake -> rising park -> hidden lower nook -> high moon reveal.
    this.addGroundSegment(0, gy - 280, 560, 0x6da96e, 'home hill high');
    this.addGroundSegment(560, gy - 225, 440, 0x72ad72, 'flower garden');
    this.addGroundSegment(1000, gy - 70, 390, 0x68a46c, 'downhill approach');
    this.addGroundSegment(1390, gy + 120, 950, 0x5f9a69, 'LOW lake scene - camera test');
    this.addGroundSegment(2340, gy - 20, 380, 0x68a46c, 'long hill to park');
    this.addGroundSegment(2720, gy - 275, 840, 0x637f68, 'HIGH park path - camera test');
    this.addGroundSegment(3560, gy - 210, 420, 0x697f65, 'park exit');
    this.addGroundSegment(3980, gy - 380, 980, 0x6ca76e, 'HIGH moon reveal hill - camera test');

    // Tree climb at the lake. Kept simple and forgiving; camera should rise gently when climbing.
    this.addSoftBranch(1485, gy - 155, 155, 20);
    this.addSoftBranch(1595, gy - 230, 165, 20);

    // Real side area: below the park path, visually separated and only reached by choosing the small hidden descent.
    this.addGroundSegment(3095, gy + 420, 520, 0x4f835d, 'VERY LOW hidden blue-grape nook - camera test');
    this.addSoftBranch(3040, gy - 70, 130, 18); // gentle little step down / entry lip
    this.addSoftBranch(3535, gy - 70, 150, 18); // soft step back up

    // Invisible checkpoints.
    this.addCheckpoint(230, gy - 292);
    this.addCheckpoint(1130, gy - 172);
    this.addCheckpoint(1510, gy - 52);
    this.addCheckpoint(2440, gy - 138);
    this.addCheckpoint(3180, gy + 377);
    this.addCheckpoint(4040, gy - 322);
  }


  addGroundSegment(x, topY, w, color, label) {
    const h = 44;
    const collider = this.add.rectangle(x + w / 2, topY + h / 2, w, h, 0x000000, 0);
    this.physics.add.existing(collider, true);
    this.platforms.add(collider);

    // Still prototype geometry, but visually treated as flowing land instead of old block platforms.
    this.add.rectangle(x + w / 2, topY + 36, w, 96, color, 1).setDepth(0);
    this.add.rectangle(x + w / 2, topY + 3, w, 10, 0xc7ef8c, 0.98).setDepth(4);
    this.add.ellipse(x + w * 0.25, topY + 54, w * 0.62, 132, 0x234941, 0.26).setDepth(-1);
    this.add.ellipse(x + w * 0.75, topY + 58, w * 0.58, 142, 0x1e403a, 0.22).setDepth(-1);

    if (label) {
      const t = this.add.text(x + 14, topY + 58, '', { fontFamily: 'Arial', fontSize: '12px', color: '#ffffff' }).setAlpha(0); // label hidden; useful placeholder only.
      t.setData('label', label);
    }
  }

  addSoftBranch(x, y, w, h) {
    const branch = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x9a7040, 1).setDepth(14);
    branch.setStrokeStyle(3, 0xc7924e, 0.75);
    this.physics.add.existing(branch, true);
    this.platforms.add(branch);
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
    this.house = this.add.container(255, gy - 268).setDepth(10);

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
    this.add.ellipse(260, gy - 50, 90, 30, 0xd8c293, 0.34).setDepth(6);
    for (const fx of [150, 182, 342, 372]) {
      this.add.rectangle(fx, gy - 122, 3, 28, 0x7fc46a, 0.84).setDepth(9);
      this.add.circle(fx, gy - 140, 6, 0xffc9e8, 0.92).setDepth(11);
    }

    // Little smoke puffs.
    for (let i = 0; i < 4; i++) {
      const puff = this.add.circle(318 + i * 18, gy - 390 - i * 18, 13 + i * 3, 0xffffff, 0.10).setDepth(9);
      this.tweens.add({ targets: puff, y: puff.y - 28, x: puff.x + 14, alpha: 0.02, duration: 2600 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Garden fence and flowers that react when Amber walks through them.
    this.gardenFlowers = [];
    for (let i = 0; i < 18; i++) {
      const x = 590 + i * 22;
      const y = gy - 108 - Phaser.Math.Between(0, 20);
      const stem = this.add.rectangle(x, y + 18, 3, 36, 0x7fc46a, 0.92).setDepth(9);
      const bloom = this.add.circle(x, y, Phaser.Math.Between(5, 8), Phaser.Math.RND.pick([0xffc9e8, 0xe1d4ff, 0xfff0a6, 0xbee9ff]), 0.94).setDepth(11);
      const flower = this.add.container(0, 0, [stem, bloom]);
      flower.setData('baseX', x);
      flower.setData('baseY', y);
      this.gardenFlowers.push(flower);
    }
    for (let i = 0; i < 7; i++) {
      this.add.rectangle(560 + i * 64, gy - 93, 7, 64, 0xd7bd86, 0.9).setDepth(8);
      this.add.rectangle(560 + i * 64, gy - 118, 52, 7, 0xd7bd86, 0.82).setDepth(8);
    }
  }


  createLakeScene() {
    const gy = this.groundY;

    // Desired composition: Tree -> Bench -> Lake, rainbow behind the lake view.
    this.drawClimbTree(1515, gy - 238);
    this.drawBench(1745, gy - 54);

    // Lake after the bench, more visible as the view/payoff.
    this.lake = this.add.ellipse(1955, gy + 56, 520, 92, 0x70b8cf, 0.50).setDepth(3);
    this.add.ellipse(1955, gy + 62, 430, 48, 0xa7e2eb, 0.28).setDepth(4);

    for (let i = 0; i < 12; i++) {
      const reed = this.add.rectangle(1795 + i * 36, gy + 27, 4, Phaser.Math.Between(38, 72), 0x8dcc75, 0.84).setOrigin(0.5, 1).setDepth(7);
      this.tweens.add({ targets: reed, angle: Phaser.Math.Between(-8, 8), duration: Phaser.Math.Between(900, 1700), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.frog = this.add.text(2025, gy + 5, '🐸', { fontSize: '28px' }).setDepth(12).setAlpha(0.88);
    this.tweens.add({ targets: this.frog, y: gy - 10, duration: 500, yoyo: true, repeat: -1, repeatDelay: 2600, ease: 'Sine.easeOut' });
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
    // Park fixtures: not gameplay obstacles, just identity.
    for (const x of [2740, 3040, 3330]) this.drawLampPost(x, gy - 150);
    for (const x of [2820, 3270]) this.drawBench(x, gy - 124);
    for (const x of [2920, 3410]) this.drawTrashBin(x, gy - 112);

    // Birds eating crumbs along the park path.
    for (const x of [2730, 2875, 3150, 3360]) {
      const bird = this.add.text(x, gy - 126, '🐦', { fontSize: '25px' }).setDepth(16).setAlpha(0.9);
      this.tweens.add({ targets: bird, x: x + Phaser.Math.Between(-16, 22), duration: Phaser.Math.Between(900, 1500), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.circle(x + 18, gy - 104, 3, 0xf6d38d, 0.75).setDepth(15);
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

    // Hidden side area v4.1: the plant is no longer on the main path.
    // Main-path bushes create a visual curtain. A small gap hints that Amber can go down.
    for (let i = 0; i < 13; i++) {
      const x = 3000 + i * 36;
      const y = gy - 68 + Phaser.Math.Between(-8, 8);
      const size = Phaser.Math.Between(18, 30);
      const alpha = (i === 3 || i === 4) ? 0.48 : 0.92; // subtle entry gap
      this.add.circle(x, y, size, 0x416f4e, alpha).setDepth(18);
    }

    // Little visual clue: butterfly flies down into the hidden path.
    const butterfly = this.add.text(3118, gy - 122, 'ʚɞ', { fontFamily: 'Arial', fontSize: '24px', color: '#d8c7ff' }).setOrigin(0.5).setDepth(22);
    this.tweens.add({ targets: butterfly, y: gy - 68, x: 3155, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The discovered nook below the route.
    this.add.ellipse(3360, gy + 325, 430, 82, 0x274d44, 0.28).setDepth(1);
    for (let i = 0; i < 16; i++) {
      const x = 3170 + i * 24;
      this.add.rectangle(x, gy + 270, 3, Phaser.Math.Between(30, 56), 0x75b862, 0.78).setOrigin(0.5, 1).setDepth(9);
      this.add.circle(x, gy + 247 - Phaser.Math.Between(0, 12), 4, 0x9bb7ff, 0.72).setDepth(12);
    }
    this.add.text(3360, gy + 240, 'stil hoekje', { fontFamily: 'Arial', fontSize: '18px', color: '#dbeebc' }).setOrigin(0.5).setAlpha(0.0);
  }


  createMoonRevealArea() {
    const gy = this.groundY;
    this.moonRevealZone = this.add.zone(3940, gy - 175, 240, 240);
    this.physics.add.existing(this.moonRevealZone, true);
    this.moonRevealed = false;

    this.finishZone = this.add.zone(4660, gy - 155, 200, 220);
    this.physics.add.existing(this.finishZone, true);
    this.finishMarker = this.add.container(4660, gy - 168).setDepth(16);
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
    // Birds crossing rainbow/lake and park.
    for (const b of [[1240, this.groundY - 270], [2140, this.groundY - 330], [3780, this.groundY - 300]]) {
      const bird = this.add.text(b[0], b[1], '⌁', { fontFamily: 'Arial', fontSize: '36px', color: '#ffffff' }).setOrigin(0.5).setDepth(5).setAlpha(0.42);
      this.tweens.add({ targets: bird, x: bird.x + 420, y: bird.y - 20, duration: 5200, repeat: -1, repeatDelay: 1800, ease: 'Sine.easeInOut' });
    }
  }


  createCameraTestGuides() {
    // Temporary v4.6 test-only guides. These make vertical camera movement easy to see.
    const s = window.FTTM.GameSettings;
    const gy = this.groundY;
    const guideData = [
      { y: gy - 380, label: 'HIGH AREA', color: 0xfff2b8 },
      { y: gy - 120, label: 'MID AREA', color: 0xffffff },
      { y: gy + 120, label: 'LOW LAKE', color: 0x9bd5ff },
      { y: gy + 420, label: 'VERY LOW SIDE AREA', color: 0xc9a6ff }
    ];
    guideData.forEach((g) => {
      const line = this.add.rectangle(s.worldWidth / 2, g.y, s.worldWidth, 3, g.color, 0.18).setDepth(80);
      const label = this.add.text(30, g.y - 28, g.label, { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff' }).setDepth(81).setAlpha(0.65);
    });
    this.cameraDebugText = this.add.text(18, 58, 'CAMERA TEST v4.6', { fontFamily: 'Arial', fontSize: '16px', color: '#fff6da' })
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.9);
  }

  createPlayer() {
    this.player = this.add.container(235, this.groundY - 292).setDepth(40);
    this.activeCheckpoint = { x: 235, y: this.groundY - 292 };
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
    this.addMoonFluff(1610, this.groundY - 275);

    // First optional plant in the hidden side area.
    this.addPlant('Blauwe druifjes gevonden!', 3375, this.groundY + 335, '♧', '#9bb7ff');
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
    this.benchZone = this.add.zone(1745, gy - 80, 160, 110);
    this.physics.add.existing(this.benchZone, true);
    this.appleZone = this.add.zone(1515, gy - 160, 230, 300);
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
    const nearBench = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1745, this.groundY - 80) < 155;
    const nearTree = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1515, this.groundY - 160) < 195;

    if (nearBench) {
      this.setMessage('Amber sits and watches the rainbow.', 2600);
      this.tweens.add({ targets: this.player, scaleY: 0.88, duration: 150, yoyo: true, ease: 'Sine.easeInOut' });
      this.spawnBirds(1810, this.groundY - 285);
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

    // v4.6 CAMERA TEST PASS:
    // This is intentionally stronger than the final camera should be.
    // It follows Amber's vertical position directly enough that the effect is unmistakable.
    const playerY = this.player.y;

    if (initial || this.cameraHeightFocusY === undefined) {
      this.cameraHeightFocusY = playerY;
    } else {
      this.cameraHeightFocusY = Phaser.Math.Linear(this.cameraHeightFocusY, playerY, 0.34);
    }

    // Center Amber slightly below the middle. This makes low/high areas clearly visible.
    let desiredY = this.cameraHeightFocusY - this.visibleH * (this.isPortrait ? 0.54 : 0.50);
    desiredY = Phaser.Math.Clamp(desiredY, 0, maxY);

    if (initial || this.cameraTargetX === undefined) {
      this.cameraTargetX = desiredX;
      this.cameraTargetY = desiredY;
      this.cameras.main.scrollX = desiredX;
      this.cameras.main.scrollY = desiredY;
      return;
    }

    this.cameraTargetX = Phaser.Math.Linear(this.cameraTargetX, desiredX, 0.12);
    this.cameraTargetY = Phaser.Math.Linear(this.cameraTargetY, desiredY, 0.30);
    this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, this.cameraTargetX, 0.16);
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, this.cameraTargetY, 0.30);

    if (this.cameraDebugText) {
      this.cameraDebugText.setText(`CAMERA TEST v4.6 | scrollY ${Math.round(this.cameras.main.scrollY)}`);
    }
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

    if (this.player.y > this.groundY + 260) this.respawn();

    this.updateGardenFlowers();
    this.animatePlayer(delta, onGround);
    this.updateCamera(false);
  }
}

window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;
window.LevelScene = LevelScene;

class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
    this.collected = 0;
    this.totalFluffs = 1;
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.jumpWasDown = false;
    this.wasGrounded = false;
    this.facing = 1;
    this.finished = false;
    this.inputLocked = true;
    this.activeCheckpoint = { x: 360, y: 760 };
    this.cameraY = 0;
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

    this.worldW = s.worldWidth;
    this.worldH = 1900;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setZoom(this.worldZoom);

    if (window.FTTM.hideFinishPanel) window.FTTM.hideFinishPanel();
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(0, this.totalFluffs);

    this.drawStorybookSky();
    this.createCollisionWorld();
    this.drawContinuousLandscape();
    this.drawBackgroundSetpieces();
    this.drawHome();
    this.drawGarden();
    this.drawLakeArea();
    this.drawParkAndSideArea();
    this.drawMoonReveal();
    this.createPlayer();
    this.createCollectiblesAndTriggers();
    this.createAmbientLife();

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

  // ---------- UI / intro ----------
  setMessage(text, duration = 2200) {
    const el = document.getElementById('message-panel');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => el.classList.add('hidden'), duration);
  }

  startIntroSequence() {
    this.setMessage('Amber hoort iets buiten.', 2200);
    const note = this.add.text(250, 610, '♪', { fontFamily: 'Arial', fontSize: '38px', color: '#fff2b8' }).setOrigin(0.5).setDepth(90);
    this.tweens.add({ targets: note, x: 410, y: 565, alpha: 0, scale: 1.45, duration: 1500, ease: 'Sine.easeOut', onComplete: () => note.destroy() });
    this.time.delayedCall(1200, () => {
      this.inputLocked = false;
      this.setMessage('De Fluistervelden zijn wakker.', 2300);
    });
  }

  // ---------- world drawing ----------
  drawStorybookSky() {
    const bg = this.add.graphics().setDepth(-60);
    bg.fillGradientStyle(0x071632, 0x102c63, 0x112b5a, 0x06111f, 1);
    bg.fillRect(0, 0, this.worldW, this.worldH);

    // distant blue valley layers
    this.drawDistantHills(0, 1120, 0x16395b, 0.34, 0.22, 980);
    this.drawDistantHills(300, 1040, 0x1f4d65, 0.28, 0.32, 760);
    this.drawDistantHills(140, 970, 0x2d626e, 0.19, 0.43, 560);

    // night stars
    for (let i = 0; i < 145; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, this.worldW),
        Phaser.Math.Between(35, 800),
        Phaser.Math.FloatBetween(0.7, 2.0),
        0xffffff,
        Phaser.Math.FloatBetween(0.15, 0.52)
      ).setScrollFactor(0.38).setDepth(-42);
      this.tweens.add({ targets: star, alpha: star.alpha * 0.35, duration: Phaser.Math.Between(1400, 3200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // soft clouds
    for (const c of [[880,315,190,40],[1110,280,150,34],[3050,305,230,42],[4300,260,300,55],[5000,350,220,42]]) {
      this.add.ellipse(c[0], c[1], c[2], c[3], 0xffffff, 0.08).setDepth(-40).setScrollFactor(0.45);
    }

    // big moon in far right sky
    this.moon = this.add.container(4820, 360).setDepth(-32).setScrollFactor(0.72);
    this.moon.add(this.add.circle(0, 0, 132, 0xfff1bf, 0.11));
    this.moon.add(this.add.circle(0, 0, 82, 0xfff1bf, 0.9));
    this.moon.add(this.add.circle(24, -20, 60, 0x102c63, 0.25));
    this.moon.setAlpha(0.18);
  }

  drawDistantHills(offset, baseY, color, alpha, scroll, step) {
    const g = this.add.graphics().setDepth(-48).setScrollFactor(scroll);
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(-300, this.worldH);
    g.lineTo(-300, baseY);
    for (let x = -300; x <= this.worldW + 500; x += step) {
      const cx = x + step * 0.5 + (offset % 180);
      const cy = baseY - Phaser.Math.Between(60, 180);
      this.curveTo(g, x, baseY + Phaser.Math.Between(-20, 40), cx, cy, x + step, baseY + Phaser.Math.Between(-10, 50), 16);
    }
    g.lineTo(this.worldW + 500, this.worldH);
    g.closePath();
    g.fillPath();
  }

  createCollisionWorld() {
    this.platforms = this.physics.add.staticGroup();
    this.checkpoints = this.physics.add.staticGroup();

    // Invisible colliders follow the painted path. The visible landscape is drawn separately.
    const rects = [
      [0, 815, 880, 70],          // home hill
      [750, 865, 420, 70],
      [1080, 930, 410, 70],
      [1400, 1010, 420, 70],
      [1740, 1105, 560, 70],      // lower lake path
      [2250, 1045, 370, 70],
      [2550, 965, 360, 70],
      [2860, 870, 670, 70],       // park hill
      [3490, 930, 350, 70],
      [3780, 830, 520, 70],       // moon approach
      [4260, 745, 1050, 70],      // high reveal meadow
      [3140, 1170, 630, 70],      // hidden side area lower path
      [1450, 805, 190, 30],       // tree branch 1
      [1555, 710, 190, 30],       // tree branch 2
      [1660, 768, 140, 28],       // tree branch 3
    ];
    for (const [x,y,w,h] of rects) {
      const p = this.platforms.create(x + w/2, y + h/2, null);
      p.setDisplaySize(w, h).setVisible(false).refreshBody();
    }
  }

  drawContinuousLandscape() {
    // Main continuous terrain silhouette. This is the big change for v6:
    // one storybook hillside instead of loose platform rectangles.
    const g = this.add.graphics().setDepth(-5);
    g.fillStyle(0x5f9b63, 1);
    g.beginPath();
    g.moveTo(-100, this.worldH);
    g.lineTo(-100, 785);
    this.curveTo(g, -100, 785, 350, 760, 790, 815, 18);
    this.curveTo(g, 790, 815, 1150, 850, 1480, 975, 18);
    this.curveTo(g, 1480, 975, 1900, 1165, 2300, 1080, 18);
    this.curveTo(g, 2300, 1080, 2550, 1010, 2880, 890, 18);
    this.curveTo(g, 2880, 890, 3200, 805, 3550, 920, 18);
    this.curveTo(g, 3550, 920, 3820, 880, 4250, 775, 18);
    this.curveTo(g, 4250, 775, 4740, 705, 5500, 745, 24);
    g.lineTo(5500, this.worldH);
    g.closePath();
    g.fillPath();

    // darker underside depth
    const under = this.add.graphics().setDepth(-6);
    under.fillStyle(0x234c45, 0.72);
    under.beginPath();
    under.moveTo(-100, this.worldH);
    under.lineTo(-100, 885);
    this.curveTo(under, -100, 885, 500, 920, 1050, 960, 16);
    this.curveTo(under, 1050, 960, 1700, 1190, 2300, 1190, 16);
    this.curveTo(under, 2300, 1190, 3050, 1010, 3650, 1010, 16);
    this.curveTo(under, 3650, 1010, 4300, 860, 5500, 840, 16);
    under.lineTo(5500, this.worldH);
    under.closePath();
    under.fillPath();

    // bright grassy top line and winding path
    const top = this.add.graphics().setDepth(4);
    top.lineStyle(18, 0xaddf7c, 0.72);
    top.beginPath();
    top.moveTo(-60, 785);
    this.curveTo(top, -60, 785, 350, 760, 790, 815, 20);
    this.curveTo(top, 790, 815, 1150, 850, 1480, 975, 20);
    this.curveTo(top, 1480, 975, 1900, 1165, 2300, 1080, 20);
    this.curveTo(top, 2300, 1080, 2550, 1010, 2880, 890, 20);
    this.curveTo(top, 2880, 890, 3200, 805, 3550, 920, 20);
    this.curveTo(top, 3550, 920, 3820, 880, 4250, 775, 20);
    this.curveTo(top, 4250, 775, 4740, 705, 5480, 745, 26);
    top.strokePath();

    const path = this.add.graphics().setDepth(3);
    path.lineStyle(34, 0xbfa073, 0.28);
    path.beginPath();
    path.moveTo(360, 807);
    this.curveTo(path, 360, 807, 820, 850, 1280, 960, 16);
    this.curveTo(path, 1280, 960, 1700, 1115, 2260, 1090, 16);
    this.curveTo(path, 2260, 1090, 2650, 955, 3040, 880, 16);
    this.curveTo(path, 3040, 880, 3330, 830, 3600, 920, 14);
    this.curveTo(path, 3600, 920, 4100, 805, 4660, 745, 18);
    path.strokePath();

    // Hidden lower side area. It has its own continuous shape.
    const sg = this.add.graphics().setDepth(-4);
    sg.fillStyle(0x4f875a, 0.96);
    sg.beginPath();
    sg.moveTo(3030, this.worldH);
    sg.lineTo(3030, 1170);
    this.curveTo(sg, 3030, 1170, 3350, 1130, 3780, 1175, 18);
    sg.lineTo(3780, this.worldH);
    sg.closePath();
    sg.fillPath();

    const sgTop = this.add.graphics().setDepth(4);
    sgTop.lineStyle(16, 0x9bce73, 0.62);
    sgTop.beginPath();
    sgTop.moveTo(3040, 1170);
    this.curveTo(sgTop, 3040, 1170, 3350, 1130, 3760, 1175, 18);
    sgTop.strokePath();

    // foreground dark vignette grasses for depth
    this.drawForegroundClumps();
  }

  drawForegroundClumps() {
    const g = this.add.graphics().setDepth(30).setAlpha(0.32);
    g.fillStyle(0x071c19, 1);
    const clumps = [[-80,1330,720],[1600,1410,900],[3000,1350,900],[4300,1180,900]];
    for (const [x,y,w] of clumps) {
      g.beginPath();
      g.moveTo(x, this.worldH);
      g.lineTo(x, y);
      for (let i=0;i<16;i++) {
        const px = x + i*w/15;
        g.lineTo(px, y - Phaser.Math.Between(10,70));
        g.lineTo(px + Phaser.Math.Between(20,60), y + Phaser.Math.Between(5,40));
      }
      g.lineTo(x+w, this.worldH);
      g.closePath();
      g.fillPath();
    }
  }

  drawBackgroundSetpieces() {
    // distant warm village lights in the valley
    for (let i=0;i<55;i++) {
      const x = Phaser.Math.Between(2600, 5100);
      const y = Phaser.Math.Between(760, 1080);
      const l = this.add.circle(x, y, Phaser.Math.FloatBetween(2,5), 0xffd98e, 0.55).setDepth(-20).setScrollFactor(0.62);
      this.tweens.add({ targets:l, alpha:0.18, yoyo:true, repeat:-1, duration:Phaser.Math.Between(1300,3000), ease:'Sine.easeInOut'});
    }

    // large trees as scene anchors
    this.drawTree(1500, 1050, 1.05, -1);
    this.drawTree(3140, 870, 1.15, -1);
    this.drawTree(4680, 735, 0.95, -1);

    // lamps along the main path
    for (const [x,y] of [[780,800],[2360,1038],[2970,865],[3370,860],[4050,795]]) this.drawLamp(x,y);
  }

  drawHome() {
    const c = this.add.container(430, 690).setDepth(8);

    // unified cozy cottage silhouette
    const body = this.add.graphics();
    body.fillStyle(0xf8d79b, 1);
    body.fillRoundedRect(-150, -12, 300, 250, 18);
    body.fillStyle(0xe7bb77, 1);
    body.fillRect(-160, -18, 320, 20);
    c.add(body);

    const roof = this.add.graphics();
    roof.fillStyle(0xc56c58, 1);
    roof.beginPath();
    roof.moveTo(-190, -8);
    roof.lineTo(0, -195);
    roof.lineTo(205, -8);
    roof.closePath();
    roof.fillPath();
    roof.lineStyle(8, 0x9d4f45, 0.65);
    roof.strokeTriangle(-190,-8,0,-195,205,-8);
    c.add(roof);

    // warm windows + door
    this.addWindow(c, -86, 58);
    this.addWindow(c, 68, 58);
    this.addWindow(c, -86, 145);
    this.addWindow(c, 68, 145);
    const door = this.add.graphics();
    door.fillStyle(0x8b5d36, 1);
    door.fillRoundedRect(-34, 132, 68, 106, 18);
    door.fillStyle(0xffe7a0, 1);
    door.fillCircle(18, 181, 5);
    c.add(door);

    // chimney and smoke integrated into roof
    const chimney = this.add.graphics();
    chimney.fillStyle(0x8a5437, 1);
    chimney.fillRoundedRect(96, -160, 54, 132, 8);
    chimney.fillStyle(0xb6b0a7, 1);
    chimney.fillRoundedRect(86, -174, 74, 20, 6);
    c.add(chimney);
    for (let i=0;i<5;i++) {
      const puff = this.add.circle(128 + i*38, -205 - i*26, 24+i*3, 0xd5d7e0, 0.18-i*0.015);
      c.add(puff);
      this.tweens.add({ targets:puff, y:puff.y-18, alpha:puff.alpha*0.45, duration:1800+i*260, yoyo:true, repeat:-1, ease:'Sine.easeInOut'});
    }

    // flowers and tiny fence around home
    for (let i=0;i<24;i++) this.drawTinyFlower(160 + i*24, 800 + Phaser.Math.Between(-12,18), 8);
    this.drawFence(690, 840, 520, 0.95);
  }

  addWindow(container, x, y) {
    const g = this.add.graphics();
    g.fillStyle(0xffe7a0, 0.95);
    g.fillRoundedRect(x-30, y-30, 60, 60, 12);
    g.lineStyle(5, 0xb7d8e9, 0.85);
    g.strokeRoundedRect(x-30, y-30, 60, 60, 12);
    g.lineStyle(3, 0xb7d8e9, 0.75);
    g.lineBetween(x, y-28, x, y+28);
    g.lineBetween(x-28, y, x+28, y);
    container.add(g);
  }

  drawGarden() {
    // flowers move when Amber walks through them
    this.gardenFlowers = [];
    for (let i=0;i<38;i++) {
      const x = 760 + i*17 + Phaser.Math.Between(-5,5);
      const y = 830 + Phaser.Math.Between(-12,18);
      const stem = this.add.line(x, y, 0, 0, 0, -36, 0x9fd58a, 0.65).setDepth(9).setLineWidth(3);
      const blossom = this.add.circle(x, y-38, Phaser.Math.Between(6,10), Phaser.Math.RND.pick([0xffb3c7,0xfbe9a0,0xc6dcff,0xd7b4ff]), 0.9).setDepth(10);
      this.gardenFlowers.push({stem, blossom, x, y});
    }
  }

  drawLakeArea() {
    // pond as lower quiet payoff, with rainbow behind
    this.drawRainbow(1900, 875, 520, 0.32);
    const water = this.add.graphics().setDepth(2);
    water.fillStyle(0x75c7d0, 0.55);
    water.fillEllipse(2050, 1236, 900, 170);
    water.fillStyle(0xb7fff4, 0.18);
    water.fillEllipse(2075, 1214, 560, 40);

    // dock/bench, tree > bench > meertje composition
    this.drawBench(1725, 1075, 1.0);
    this.drawReeds(1840, 1160, 16);
    this.drawFrog(2130, 1165);
    this.drawWaterPlants(2310, 1190);
  }

  drawParkAndSideArea() {
    // upper park identity, simplified but warm
    this.drawBench(3120, 845, 0.95);
    this.drawBench(3440, 870, 0.9);
    this.drawTrash(3295, 875);
    this.drawTrash(3645, 910);
    this.drawLamp(3000, 845);
    this.drawLamp(3580, 890);

    // birds eating near path
    for (const [x,y] of [[3060,830],[3175,850],[3520,885],[3610,895]]) this.drawBird(x,y);

    // hidden side area: foreground bushes hide the drop
    const bush = this.add.graphics().setDepth(18);
    bush.fillStyle(0x2c6d48, 0.92);
    for (let i=0;i<13;i++) bush.fillCircle(3030+i*42, 930+Phaser.Math.Between(-10,20), Phaser.Math.Between(34,52));
    this.drawTinyFlower(3410, 1134, 11, 0x9bc8ff);
    this.drawTinyFlower(3445, 1122, 9, 0x9bc8ff);
    this.add.text(3435, 1094, 'Blauwe Druifjes', { fontFamily:'Arial', fontSize:'28px', color:'#d9eeff', stroke:'#102655', strokeThickness:5 }).setOrigin(0.5).setDepth(16).setAlpha(0.0);
  }

  drawMoonReveal() {
    // clouds that disappear when the reveal trigger is reached
    this.revealClouds = [];
    for (const c of [[4380,640,210,52],[4560,610,260,58],[4740,650,190,44]]) {
      const cloud = this.add.ellipse(c[0], c[1], c[2], c[3], 0xffffff, 0.12).setDepth(-22).setScrollFactor(0.72);
      this.revealClouds.push(cloud);
    }

    // finish light on final meadow
    this.finishGlow = this.add.container(5050, 690).setDepth(20);
    this.finishGlow.add(this.add.circle(0,0,70,0xffefb8,0.10));
    this.finishGlow.add(this.add.circle(0,0,32,0xffefb8,0.55));
    this.finishGlow.setAlpha(0.75);
  }

  // ---------- props ----------
  drawTree(x, y, scale=1, depth=0) {
    const c = this.add.container(x, y).setDepth(depth);
    const trunk = this.add.graphics();
    trunk.fillStyle(0x6a472c, 1);
    trunk.fillRoundedRect(-32*scale, -210*scale, 64*scale, 230*scale, 20*scale);
    c.add(trunk);
    const leafColors = [0x3f8a51,0x4d9b5b,0x2f7447,0x5aaa63];
    for (let i=0;i<12;i++) {
      const lx = Phaser.Math.Between(-130,130)*scale;
      const ly = Phaser.Math.Between(-330,-170)*scale;
      const r = Phaser.Math.Between(76,118)*scale;
      c.add(this.add.circle(lx, ly, r, leafColors[i%leafColors.length], 0.96));
    }
    // integrated branches for climbing tree near lake
    if (x < 1800) {
      this.drawBranch(x-68, y-248, 180, 0.96);
      this.drawBranch(x+45, y-342, 185, 0.9);
      this.drawBranch(x+140, y-282, 130, 0.82);
    }
    return c;
  }

  drawBranch(x,y,w,scale=1) {
    const g = this.add.graphics().setDepth(12);
    g.lineStyle(20*scale, 0x8d6239, 1);
    g.beginPath();
    g.moveTo(x, y);
    this.curveTo(g, x, y, x+w*.5, y-12, x+w, y+4, 10);
    g.strokePath();
    g.lineStyle(5, 0xc5965d, 0.5);
    g.beginPath();
    g.moveTo(x+8, y-5);
    this.curveTo(g, x+8, y-5, x+w*.5, y-18, x+w-10, y-2, 10);
    g.strokePath();
  }

  drawBench(x, y, scale=1) {
    const g = this.add.graphics().setDepth(12);
    g.fillStyle(0x8d5a34,1);
    g.fillRoundedRect(x-75*scale, y-35*scale, 150*scale, 22*scale, 6*scale);
    g.fillRoundedRect(x-65*scale, y-5*scale, 130*scale, 20*scale, 6*scale);
    g.fillStyle(0x5c3b25,1);
    g.fillRect(x-52*scale, y+15*scale, 13*scale, 50*scale);
    g.fillRect(x+42*scale, y+15*scale, 13*scale, 50*scale);
  }

  drawFence(x, y, w, scale=1) {
    const g = this.add.graphics().setDepth(13);
    g.lineStyle(10*scale, 0xb8945b, 0.88);
    g.lineBetween(x, y, x+w, y-8);
    g.lineBetween(x, y+40, x+w, y+32);
    for (let i=0;i<=8;i++) {
      const px = x + i*w/8;
      g.lineStyle(8*scale, 0xc8a56a, 0.95);
      g.lineBetween(px, y-38, px, y+58);
    }
  }

  drawLamp(x,y) {
    const g = this.add.graphics().setDepth(12);
    g.lineStyle(8,0x304044,1);
    g.lineBetween(x,y+72,x,y-28);
    g.fillStyle(0xffe698,0.9);
    g.fillCircle(x,y-42,20);
    g.fillStyle(0xffe698,0.15);
    g.fillCircle(x,y-42,58);
  }

  drawTinyFlower(x,y,r=8,color=null) {
    const col = color || Phaser.Math.RND.pick([0xffb3c7,0xfbe9a0,0xc6dcff,0xd7b4ff,0xffffff]);
    this.add.line(x,y,0,0,0,-26,0x96c783,0.55).setDepth(8).setLineWidth(3);
    this.add.circle(x,y-30,r,col,0.86).setDepth(9);
  }

  drawReeds(x,y,count) { for(let i=0;i<count;i++) this.add.line(x+i*13,y+Phaser.Math.Between(-8,8),0,0,0,-Phaser.Math.Between(60,105),0x7aac6d,0.55).setDepth(8).setLineWidth(4); }
  drawWaterPlants(x,y) { for(let i=0;i<9;i++) this.add.ellipse(x+i*20,y+Phaser.Math.Between(-8,8),28,9,0xb7e5c7,0.45).setDepth(7); }
  drawFrog(x,y) { const c=this.add.container(x,y).setDepth(12); c.add(this.add.circle(0,0,24,0x74ba63,1)); c.add(this.add.circle(-9,-16,6,0xf9fff1,1)); c.add(this.add.circle(9,-16,6,0xf9fff1,1)); c.add(this.add.circle(-9,-16,2,0x222222,1)); c.add(this.add.circle(9,-16,2,0x222222,1)); return c; }
  drawBird(x,y) { const c=this.add.container(x,y).setDepth(12); c.add(this.add.ellipse(0,0,32,18,0xaec6d9,1)); c.add(this.add.circle(12,-8,9,0xc7d9e8,1)); c.add(this.add.triangle(21,-8,0,0,13,5,0,10,0xffd685,1)); return c; }
  drawTrash(x,y) { const g=this.add.graphics().setDepth(12); g.fillStyle(0x496d55,1); g.fillRoundedRect(x-22,y-44,44,58,6); g.fillStyle(0x31503d,1); g.fillRoundedRect(x-28,y-52,56,12,5); }

  drawRainbow(x,y,r,alpha) {
    const colors=[0xff8fa3,0xffd38e,0xfff6a3,0xbef7a1,0x9bd5ff,0xc9a6ff];
    const g=this.add.graphics().setDepth(-24).setScrollFactor(0.62);
    colors.forEach((c,i)=>{ g.lineStyle(10,c,alpha); g.beginPath(); g.arc(x,y,r-i*18,Math.PI,Math.PI*2,false); g.strokePath(); });
  }

  curveTo(g, x0, y0, cx, cy, x1, y1, steps=14) {
    for (let i=1;i<=steps;i++) {
      const t=i/steps, mt=1-t;
      g.lineTo(mt*mt*x0+2*mt*t*cx+t*t*x1, mt*mt*y0+2*mt*t*cy+t*t*y1);
    }
  }

  // ---------- gameplay objects ----------
  createPlayer() {
    this.player = this.physics.add.sprite(360, 720, null).setSize(46, 88).setOffset(-23, -44);
    this.player.setCollideWorldBounds(false);
    this.player.setDragX(0);
    this.player.setMaxVelocity(430, 900);
    this.playerArt = this.add.container(this.player.x, this.player.y).setDepth(50);
    this.bodyArt = this.add.ellipse(0, 28, 54, 82, 0xff9fc4, 1);
    this.headArt = this.add.circle(0, -26, 34, 0xffe6bf, 1);
    this.hairArt = this.add.triangle(-15, -55, -50, -78, 14, -72, -15, -38, 0xffd735, 1);
    this.eyeArt = this.add.circle(14, -30, 4, 0x222222, 1);
    this.playerArt.add([this.bodyArt, this.headArt, this.hairArt, this.eyeArt]);
  }

  createCollectiblesAndTriggers() {
    this.fluffs = this.physics.add.staticGroup();
    this.plants = this.physics.add.staticGroup();

    const fluff = this.fluffs.create(1645, 655, null).setCircle(34).setVisible(false).refreshBody();
    this.drawFluffArt(1645, 655);

    const plant = this.plants.create(3435, 1120, null).setCircle(28).setVisible(false).refreshBody();
    this.drawPlantArt(3435, 1120);

    this.checkpoints.create(360, 720, null).setDisplaySize(80,120).setVisible(false).refreshBody();
    this.checkpoints.create(1830, 1040, null).setDisplaySize(80,120).setVisible(false).refreshBody();
    this.checkpoints.create(3140, 830, null).setDisplaySize(80,120).setVisible(false).refreshBody();
    this.checkpoints.create(4320, 720, null).setDisplaySize(80,120).setVisible(false).refreshBody();

    this.finishZone = this.physics.add.staticGroup();
    this.finishZone.create(5100, 690, null).setDisplaySize(170, 220).setVisible(false).refreshBody();

    this.moonRevealZone = this.physics.add.staticGroup();
    this.moonRevealZone.create(3920, 760, null).setDisplaySize(220, 320).setVisible(false).refreshBody();
  }

  drawFluffArt(x,y) {
    const c=this.add.container(x,y).setDepth(42);
    const glow=this.add.circle(0,0,46,0xfff3bb,0.14); const core=this.add.circle(0,0,15,0xfff6cf,0.95);
    c.add([glow,core]);
    for(let i=0;i<9;i++){ const a=i*Math.PI*2/9; c.add(this.add.line(0,0,0,0,Math.cos(a)*26,Math.sin(a)*26,0xfff6cf,0.75).setLineWidth(3)); }
    this.tweens.add({targets:c,y:y-12,scale:1.08,duration:1400,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  }

  drawPlantArt(x,y) {
    const c=this.add.container(x,y).setDepth(22);
    for(let i=0;i<7;i++){ c.add(this.add.circle(-24+i*8, -i*3, 8, 0x90b8ff, 0.96)); }
    c.add(this.add.line(0,14,0,0,0,-48,0x73ac70,0.9).setLineWidth(5));
    c.add(this.add.ellipse(-15,-10,28,12,0x6da768,0.9));
    c.add(this.add.ellipse(15,-24,28,12,0x6da768,0.9));
  }

  createAmbientLife() {
    // fireflies / warm points of life
    for (let i=0;i<34;i++) {
      const x=Phaser.Math.Between(450,5000), y=Phaser.Math.Between(620,1120);
      const p=this.add.circle(x,y,Phaser.Math.FloatBetween(2.5,5),0xffe59a,0.35).setDepth(18);
      this.tweens.add({targets:p,x:x+Phaser.Math.Between(-30,30),y:y+Phaser.Math.Between(-24,24),alpha:0.08,duration:Phaser.Math.Between(1600,3600),yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    }
    // occasional birds in sky
    for (let i=0;i<6;i++) {
      const bird=this.add.text(900+i*680, Phaser.Math.Between(360,620),'⌁',{fontFamily:'Arial',fontSize:'26px',color:'#cfe0ff'}).setDepth(-8).setAlpha(0.45);
      this.tweens.add({targets:bird,x:bird.x+180,y:bird.y-30,duration:Phaser.Math.Between(7000,12000),repeat:-1,yoyo:true,ease:'Sine.easeInOut'});
    }
  }

  // ---------- overlaps ----------
  collectMoonFluff(player, fluff) {
    if (!fluff.active) return;
    fluff.disableBody(true, true);
    this.collected = Math.min(this.totalFluffs, this.collected + 1);
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(this.collected, this.totalFluffs);
    this.setMessage('Maanpluis gevonden!', 1700);
  }

  collectPlant(player, plant) {
    if (!plant.active) return;
    plant.disableBody(true, true);
    this.setMessage('Blauwe Druifjes gevonden!', 2200);
  }

  touchCheckpoint(player, cp) { this.activeCheckpoint = { x: cp.x, y: cp.y - 80 }; }

  triggerMoonReveal() {
    if (this.moonRevealed) return;
    this.moonRevealed = true;
    this.setMessage('De wolken schuiven opzij...', 2200);
    this.tweens.add({ targets:this.moon, alpha:1, duration:1600, ease:'Sine.easeOut' });
    this.revealClouds.forEach((cloud,i)=>this.tweens.add({targets:cloud,x:cloud.x+220+i*80,alpha:0,duration:1800,ease:'Sine.easeInOut'}));
  }

  tryFinish() {
    if (this.finished) return;
    if (this.collected < this.totalFluffs) { this.setMessage('Vind eerst het maanpluis.', 1600); return; }
    this.finished = true;
    this.inputLocked = true;
    this.player.setVelocity(0,0);
    if (window.FTTM.showFinishPanel) window.FTTM.showFinishPanel();
  }

  // ---------- update ----------
  update(time, delta) {
    if (!this.player) return;
    const input = (window.FTTM && window.FTTM.InputState) || {};
    const s = window.FTTM.GameSettings;
    const dt = Math.min(delta / 1000, 0.033);

    if (!this.finished && !this.inputLocked) {
      let target = 0;
      if (input.left) target -= s.playerSpeed;
      if (input.right) target += s.playerSpeed;
      const vx = this.player.body.velocity.x;
      const rate = target === 0 ? s.deceleration : s.acceleration;
      const next = Phaser.Math.Linear(vx, target, Math.min(1, rate * dt / Math.max(1, Math.abs(target - vx))));
      this.player.setVelocityX(next);
      if (target !== 0) this.facing = Math.sign(target);

      const grounded = this.player.body.blocked.down || this.player.body.touching.down;
      if (grounded && !this.wasGrounded) this.jumpCount = 0;
      if (input.jump && !this.jumpWasDown) {
        if (grounded || this.jumpCount < this.maxJumps) {
          this.player.setVelocityY(s.jumpVelocity);
          this.jumpCount += 1;
        }
      }
      if (!input.jump && this.jumpWasDown && this.player.body.velocity.y < s.jumpCutVelocity) this.player.setVelocityY(s.jumpCutVelocity);
      this.jumpWasDown = !!input.jump;
      this.wasGrounded = grounded;
    }

    if (this.player.y > this.worldH - 80) this.respawn();
    this.playerArt.setPosition(this.player.x, this.player.y);
    this.playerArt.setScale(this.facing < 0 ? -1 : 1, 1);
    this.updateGardenReaction();
    this.updateCamera(false);
  }

  updateGardenReaction() {
    if (!this.gardenFlowers) return;
    for (const f of this.gardenFlowers) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y);
      const sway = d < 95 ? (this.facing * 7) : Math.sin(this.time.now*0.002 + f.x*0.02)*2;
      f.stem.rotation = Phaser.Math.Linear(f.stem.rotation, Phaser.Math.DegToRad(sway), 0.08);
      f.blossom.x = f.x + sway;
    }
  }

  respawn() {
    this.player.setVelocity(0,0);
    this.player.setPosition(this.activeCheckpoint.x, this.activeCheckpoint.y);
  }

  updateCamera(initial=false) {
    const cam = this.cameras.main;
    const desiredX = Phaser.Math.Clamp(this.player.x - this.visibleW * 0.38, 0, this.worldW - this.visibleW);
    const desiredY = Phaser.Math.Clamp(this.player.y - this.visibleH * 0.58, 0, this.worldH - this.visibleH);
    if (initial) { cam.scrollX = desiredX; cam.scrollY = desiredY; this.cameraY = desiredY; return; }
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, desiredX, 0.075);
    // soft cinematic vertical follow, now part of the base camera identity
    this.cameraY = Phaser.Math.Linear(this.cameraY, desiredY, 0.045);
    cam.scrollY = this.cameraY;
  }
}

window.LevelScene = LevelScene;
window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;

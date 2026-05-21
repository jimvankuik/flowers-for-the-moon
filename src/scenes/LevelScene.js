class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
    this.currentSpeed = 0;
    this.facing = 1;
    this.jumpWasDown = false;
    this.jumpLocked = false;
    this.jumpCount = 0;
    this.collected = 0;
    this.totalFluffs = 3;
    this.finished = false;
    this.lastSafe = { x: 150, y: 0 };
  }

  create() {
    const s = window.FTTM.GameSettings;
    this.screenW = this.scale.width;
    this.screenH = this.scale.height;
    this.isPortrait = this.screenH > this.screenW;
    // v2.3 fix: use screen-sized world height for the first prototype.
    // Previous v2.x builds placed the ground too low for mobile landscape,
    // so UI loaded while Amber/platforms sat below the visible play area.
    this.worldZoom = 1;
    this.visibleW = this.screenW;
    this.visibleH = this.screenH;
    this.groundY = this.visibleH - (this.isPortrait ? 260 : 240);
    this.safeFallY = this.visibleH + 260;
    this.cameras.main.setBackgroundColor('#10275f');
    if (window.FTTM.hideFinishPanel) window.FTTM.hideFinishPanel();
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(0, this.totalFluffs);

    this.platforms = this.physics.add.staticGroup();
    this.fluffs = this.physics.add.staticGroup();
    this.plants = this.physics.add.staticGroup();
    this.interactionZones = [];
    this.checkpoints = [];

    this.drawSky();
    this.drawMoonFar();
    this.createLandscapeFromScratch();
    this.createAtmosphere();
    this.createPlayer();
    this.createCollectibles();
    this.createInteractions();
    this.createGoal();

    this.physics.add.collider(this.player, this.platforms, () => this.onGroundTouch());
    this.physics.add.overlap(this.player, this.fluffs, this.collectFluff, null, this);
    this.physics.add.overlap(this.player, this.plants, this.collectPlant, null, this);
    this.physics.add.overlap(this.player, this.goalZone, this.tryFinish, null, this);

    this.physics.world.setBounds(0, 0, s.worldWidth, this.visibleH + 420);
    this.cameras.main.setBounds(0, 0, s.worldWidth, this.visibleH);
    this.cameras.main.setZoom(this.worldZoom);
    this.updateCamera(true);

    this.showLine('The moon is waiting.', 2600);
    this.scale.on('resize', () => { if (!this.finished) this.scene.restart(); });
  }

  drawSky() {
    const s = window.FTTM.GameSettings;
    this.add.rectangle(s.worldWidth/2, this.visibleH/2, s.worldWidth, this.visibleH, 0x10275f).setDepth(-100);
    this.add.rectangle(s.worldWidth/2, this.visibleH*0.78, s.worldWidth, this.visibleH*0.46, 0x274c7d, .22).setDepth(-99);
    for (let i=0; i<155; i++) {
      const yMax = Math.max(120, this.groundY - 90);
      const star = this.add.circle(Phaser.Math.Between(0, s.worldWidth), Phaser.Math.Between(18, yMax), Phaser.Math.FloatBetween(.8, 2.3), 0xffffff, Phaser.Math.FloatBetween(.18, .72)).setDepth(-95);
      star.setScrollFactor(Phaser.Math.FloatBetween(.12, .34));
      this.tweens.add({ targets: star, alpha: star.alpha * .35, duration: Phaser.Math.Between(1400, 2800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    for (let i=0; i<12; i++) {
      const cloud = this.add.ellipse(Phaser.Math.Between(200, s.worldWidth-200), Phaser.Math.Between(80, Math.max(130, this.groundY-260)), Phaser.Math.Between(160, 360), Phaser.Math.Between(28, 70), 0xffffff, Phaser.Math.FloatBetween(.045, .10)).setDepth(-94);
      cloud.setScrollFactor(Phaser.Math.FloatBetween(.10, .23));
      this.tweens.add({ targets: cloud, x: cloud.x + Phaser.Math.Between(-35,35), duration: Phaser.Math.Between(5500, 9000), yoyo: true, repeat: -1, ease:'Sine.easeInOut' });
    }
  }

  drawMoonFar() {
    this.moon = this.add.container(5850, Math.max(105, this.groundY - 355)).setDepth(-90);
    this.moon.setScrollFactor(.62);
    this.moon.add(this.add.circle(0,0,132,0xfff0bb,.18));
    const body = this.add.circle(0,0,82,0xfff1b6,.94);
    body.setStrokeStyle(4, 0xffffff, .45);
    this.moon.add(body);
    this.moon.add(this.add.circle(-26,-18,10,0xdcc98f,.28));
    this.moon.add(this.add.circle(22,18,8,0xdcc98f,.24));
    this.moon.add(this.add.circle(4,-42,5,0xdcc98f,.18));
    const boy = this.add.container(10, 24);
    boy.add(this.add.circle(0,-25,13,0xffd9bd));
    boy.add(this.add.rectangle(0,6,24,46,0x8fc4ff));
    boy.add(this.add.circle(5,-27,2,0x1e2448));
    boy.add(this.add.rectangle(-6,-38,18,8,0x5e4a38));
    this.moon.add(boy);
  }

  addPlatform(x, y, w, h, color=0x5f9567, stroke=0xc7f093) {
    const rect = this.add.rectangle(x + w/2, y + h/2, w, h, color, 1).setDepth(1);
    rect.setStrokeStyle(3, stroke, .85);
    this.physics.add.existing(rect, true);
    this.platforms.add(rect);
    const grass = this.add.rectangle(x + w/2, y + 5, w, 10, 0xd6f2a0, .42).setDepth(3);
    return rect;
  }

  addHill(x, y, w, h, color=0x467955) {
    const hill = this.add.ellipse(x + w/2, y + h/2, w, h, color, .72).setDepth(0);
    hill.setStrokeStyle(2, 0xbde88a, .22);
    return hill;
  }

  createLandscapeFromScratch() {
    const gy = this.groundY;
    // Wide, calm opening field.
    this.addHill(-120, gy-18, 880, 170, 0x446f58);
    this.addPlatform(-80, gy, 920, 48);
    this.checkpoints.push({ x: 150, y: gy-84 });

    // A soft dip that leads to a hidden cozy side path below.
    this.addHill(680, gy+50, 760, 150, 0x3f6f56);
    this.addPlatform(820, gy-40, 470, 42);
    this.addPlatform(1040, gy+86, 420, 40, 0x4b7f5a); // optional lower path
    this.checkpoints.push({ x: 900, y: gy-120 });

    // Gentle climb with organic spacing, not obstacle-course like.
    this.addHill(1370, gy-20, 780, 180, 0x426e59);
    this.addPlatform(1485, gy-108, 430, 38);
    this.addPlatform(2010, gy-150, 440, 38);

    // Wind reveal area: a broad safe plateau with sky space.
    this.addHill(2410, gy-56, 1040, 210, 0x3f735b);
    this.addPlatform(2570, gy-75, 910, 44);
    this.windArea = new Phaser.Geom.Rectangle(2640, gy-315, 880, 270);
    this.checkpoints.push({ x: 2650, y: gy-155 });

    // Small, friendly platforming sequence; airy but forgiving.
    this.addPlatform(3650, gy-145, 360, 38);
    this.addPlatform(4140, gy-205, 360, 38);
    this.addPlatform(4630, gy-160, 390, 38);
    this.checkpoints.push({ x: 3700, y: gy-225 });

    // Calm rest clearing.
    this.addHill(5010, gy-35, 840, 190, 0x426f58);
    this.addPlatform(5140, gy-62, 760, 44);

    // Final soft hill and moon reveal.
    this.addHill(5840, gy-135, 780, 330, 0x4c7e5e);
    this.addPlatform(5920, gy-168, 720, 44);
    this.checkpoints.push({ x: 5300, y: gy-140 });

    // Decorative meadow bases.
    for (let i=0; i<20; i++) {
      const x = Phaser.Math.Between(40, 6500);
      const y = gy + Phaser.Math.Between(12, 100);
      this.add.ellipse(x, y, Phaser.Math.Between(140, 360), Phaser.Math.Between(28, 74), 0x294d3e, .16).setDepth(-1);
    }
  }

  createAtmosphere() {
    const gy = this.groundY;
    const s = window.FTTM.GameSettings;
    // Flower clusters and swaying grass.
    for (let i=0; i<190; i++) {
      const x = Phaser.Math.Between(0, s.worldWidth);
      const y = gy - Phaser.Math.Between(-10, 70);
      const stem = this.add.rectangle(x, y + 14, 3, Phaser.Math.Between(18, 38), 0x77bd62, Phaser.Math.FloatBetween(.45, .78)).setDepth(4);
      const bloomColor = Phaser.Math.RND.pick([0xffd0eb, 0xffffff, 0xc7d8ff, 0xf7f3a8, 0xd9b6ff]);
      const bloom = this.add.circle(x, y, Phaser.Math.Between(3,7), bloomColor, Phaser.Math.FloatBetween(.58,.95)).setDepth(5);
      this.tweens.add({ targets:[stem,bloom], angle: Phaser.Math.FloatBetween(-3,3), duration: Phaser.Math.Between(1600,3400), yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    }
    // Drifting fluff particles.
    for (let i=0; i<70; i++) {
      const p = this.add.circle(Phaser.Math.Between(0,s.worldWidth), Phaser.Math.Between(80, gy-20), Phaser.Math.FloatBetween(1.5,3.8), 0xffffff, Phaser.Math.FloatBetween(.18,.56)).setDepth(10);
      this.tweens.add({ targets:p, x:p.x+Phaser.Math.Between(-60,90), y:p.y-Phaser.Math.Between(20,120), alpha:Phaser.Math.FloatBetween(.06,.28), duration:Phaser.Math.Between(4500,9800), yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    }
    // Butterflies and small life.
    for (let i=0; i<12; i++) {
      this.createButterfly(Phaser.Math.Between(250, 6100), Phaser.Math.Between(gy-190, gy-70));
    }
    for (let i=0; i<7; i++) {
      const bird = this.add.text(Phaser.Math.Between(500,6200), Phaser.Math.Between(80, Math.max(120, gy-300)), '⌁', { fontFamily:'Arial', fontSize:'24px', color:'#ffffff' }).setAlpha(.28).setDepth(-88);
      bird.setScrollFactor(.34);
    }
    // Wind visual column.
    for (let i=0; i<34; i++) {
      const p = this.add.circle(Phaser.Math.Between(2670,3460), Phaser.Math.Between(gy-260, gy-80), Phaser.Math.FloatBetween(2,5), 0xffffff, Phaser.Math.FloatBetween(.16,.48)).setDepth(12);
      this.tweens.add({ targets:p, y:p.y-Phaser.Math.Between(120,260), x:p.x+Phaser.Math.Between(20,90), alpha:0, duration:Phaser.Math.Between(1800,3600), delay:Phaser.Math.Between(0,1400), repeat:-1, ease:'Sine.easeOut' });
    }
  }

  createButterfly(x,y) {
    const b = this.add.container(x,y).setDepth(14);
    const l = this.add.ellipse(-4,0,9,14,0xffc4e2,.78);
    const r = this.add.ellipse(4,0,9,14,0xc8d5ff,.78);
    const body = this.add.rectangle(0,2,2,12,0x44354d,.5);
    b.add([l,r,body]);
    this.tweens.add({ targets:b, x:x+Phaser.Math.Between(-80,90), y:y+Phaser.Math.Between(-35,35), duration:Phaser.Math.Between(2800,5400), yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    this.tweens.add({ targets:[l,r], scaleX:.45, duration:180, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
  }

  createPlayer() {
    this.player = this.add.container(150, this.groundY - 84).setDepth(50);
    this.shadow = this.add.ellipse(0,66,50,12,0x000000,.18);
    this.leftFoot = this.add.ellipse(-10,62,15,7,0xf0a0c3);
    this.rightFoot = this.add.ellipse(10,62,15,7,0xf0a0c3);
    const hair = this.add.ellipse(-8,-18,32,48,0xffdd54);
    const dress = this.add.ellipse(0,28,42,76,0xffb7d5);
    const head = this.add.circle(0,-20,22,0xffe0bd);
    const fringe = this.add.triangle(-5,-40,-22,0,16,0,-3,24,0xffdd54);
    const eye = this.add.circle(8,-22,2.5,0x1d2148);
    this.player.add([this.shadow,this.leftFoot,this.rightFoot,hair,dress,head,fringe,eye]);
    this.physics.add.existing(this.player);
    this.player.body.setSize(34,82);
    this.player.body.setOffset(-17,-42);
    this.player.body.setCollideWorldBounds(false);
    this.lastSafe = { x: 150, y: this.groundY - 84 };
  }

  createCollectibles() {
    const gy = this.groundY;
    const fluffs = [
      { x: 610, y: gy-92, hint:'Een zacht pluisje.' },
      { x: 3235, y: gy-205, hint:'De wind draagt het omhoog.' },
      { x: 6120, y: gy-275, hint:'Nog één voor de maan.' }
    ];
    fluffs.forEach((d, idx) => {
      const f = this.add.container(d.x,d.y).setDepth(30);
      const glow = this.add.circle(0,0,28,0xfff2b6,.18);
      const core = this.add.circle(0,0,10,0xffffff,.95);
      for(let i=0;i<8;i++){
        const a = Math.PI*2*i/8;
        f.add(this.add.circle(Math.cos(a)*12, Math.sin(a)*12, 4, 0xffffff, .72));
      }
      f.add([glow, core]);
      f.setData('kind','fluff');
      f.setData('collected',false);
      f.setData('hint',d.hint);
      this.physics.add.existing(f,true);
      f.body.setSize(58,58); f.body.setOffset(-29,-29);
      this.fluffs.add(f);
      this.tweens.add({ targets:f, y:d.y-12, duration:1200+idx*180, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    });

    const plants = [
      { x: 1175, y: gy+48, name:'Blauwe Druifjes gevonden!' },
      { x: 1565, y: gy-152, name:'Blauwe Regen gevonden!' },
      { x: 5450, y: gy-108, name:'Stinkende Gouwe gevonden!' }
    ];
    plants.forEach((d) => {
      const p = this.add.container(d.x,d.y).setDepth(25);
      p.add(this.add.rectangle(0,16,4,34,0x5caf57));
      p.add(this.add.circle(-8,0,6,0x789cff,.85));
      p.add(this.add.circle(0,-4,7,0x789cff,.9));
      p.add(this.add.circle(8,0,6,0x789cff,.85));
      p.setData('name',d.name); p.setData('collected',false);
      this.physics.add.existing(p,true); p.body.setSize(50,60); p.body.setOffset(-25,-28);
      this.plants.add(p);
    });
  }

  createInteractions() {
    const gy = this.groundY;
    // Optional discovery path: bench + apple tree + plant.
    this.createBench(1285, gy+42);
    this.createAppleTree(1415, gy+42);
    // Calm clearing: stump and flower.
    this.createStump(5325, gy-114);
    this.createDreamFlower(5580, gy-110);
  }

  addInteractionZone(x,y,w,h,type,text) {
    const zone = this.add.zone(x,y,w,h);
    this.physics.add.existing(zone,true);
    zone.setData('type',type);
    zone.setData('text',text);
    zone.setData('used',false);
    this.interactionZones.push(zone);
    return zone;
  }

  createBench(x,y) {
    const c = this.add.container(x,y).setDepth(18);
    c.add(this.add.rectangle(0,0,92,12,0x8b623d));
    c.add(this.add.rectangle(-32,22,10,44,0x6e4b31));
    c.add(this.add.rectangle(32,22,10,44,0x6e4b31));
    c.add(this.add.rectangle(0,-18,82,10,0x9a7048));
    this.addInteractionZone(x,y-22,150,100,'bench','The wind sounds soft here.');
  }

  createAppleTree(x,y) {
    const c = this.add.container(x,y-48).setDepth(17);
    c.add(this.add.rectangle(0,54,24,96,0x744b2b));
    c.add(this.add.circle(0,0,60,0x4f8a4f,.95));
    c.add(this.add.circle(-40,18,42,0x5c9b58,.95));
    c.add(this.add.circle(42,20,45,0x5c9b58,.95));
    for(let i=0;i<5;i++) c.add(this.add.circle(Phaser.Math.Between(-48,48), Phaser.Math.Between(-24,34), 7, 0xff6f6f));
    this.addInteractionZone(x,y-50,150,150,'apple','Amber eet een appel. Lekker zoet.');
  }

  createStump(x,y) {
    const c = this.add.container(x,y+20).setDepth(18);
    c.add(this.add.ellipse(0,-16,64,26,0xb5814d));
    c.add(this.add.rectangle(0,10,56,52,0x8f643d));
    c.add(this.add.ellipse(0,36,56,18,0x6d472d));
    this.addInteractionZone(x,y,140,120,'handstand','Amber doet een handstand!');
  }

  createDreamFlower(x,y) {
    const c = this.add.container(x,y).setDepth(20);
    c.add(this.add.rectangle(0,24,5,48,0x67bf55));
    for(let i=0;i<9;i++){ const a=Math.PI*2*i/9; c.add(this.add.circle(Math.cos(a)*15,Math.sin(a)*15,8,0xd9c8ff,.86)); }
    c.add(this.add.circle(0,0,8,0xfff3b9));
    this.tweens.add({ targets:c, scale:1.08, duration:900, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    this.addInteractionZone(x,y,120,120,'flower','Some flowers still dream.');
  }

  createGoal() {
    const gy = this.groundY;
    this.goalX = 6420;
    const arch = this.add.container(this.goalX, gy-246).setDepth(22);
    arch.add(this.add.circle(0,0,92,0xfff0bb,.12));
    arch.add(this.add.rectangle(-52,92,16,190,0xb8d47a,.7));
    arch.add(this.add.rectangle(52,92,16,190,0xb8d47a,.7));
    arch.add(this.add.ellipse(0,0,135,54,0xf2d8ff,.45));
    arch.add(this.add.text(0, -4, '✦', { fontFamily:'Arial', fontSize:'44px', color:'#fff6c7' }).setOrigin(.5));
    this.goalZone = this.add.zone(this.goalX, gy-120, 220, 260);
    this.physics.add.existing(this.goalZone,true);
  }

  collectFluff(player, fluff) {
    if (!fluff || fluff.getData('collected')) return;
    fluff.setData('collected', true);
    if (fluff.body) fluff.body.enable = false;
    this.collected += 1;
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(this.collected, this.totalFluffs);
    this.showLine(fluff.getData('hint') || 'Maanpluis gevonden!', 1900);
    this.tweens.add({ targets: fluff, y: fluff.y-42, alpha: 0, scale: 1.45, duration: 420, ease:'Sine.easeOut', onComplete:()=>fluff.destroy() });
    for(let i=0;i<14;i++) this.sparkle(fluff.x, fluff.y, 0xfff4c2);
  }

  collectPlant(player, plant) {
    if (!plant || plant.getData('collected')) return;
    plant.setData('collected', true);
    if (plant.body) plant.body.enable = false;
    this.showLine(plant.getData('name'), 2200);
    this.tweens.add({ targets: plant, scale:1.18, yoyo:true, duration:120, repeat:1, onComplete:()=>{ plant.alpha=.55; }});
  }

  tryFinish() {
    if (this.finished) return;
    if (this.collected < this.totalFluffs) {
      this.showLine('Zoek eerst alle 3 maanpluisjes.', 2200);
      return;
    }
    this.finished = true;
    this.player.body.setVelocity(0,0);
    this.showLine('A little closer to the moon.', 2600);
    for(let i=0;i<32;i++) {
      const p = this.add.circle(this.player.x, this.player.y-42, Phaser.Math.FloatBetween(2,5), 0xffffff, .88).setDepth(80);
      this.tweens.add({ targets:p, x:this.moon.x + Phaser.Math.Between(-35,35), y:this.moon.y + Phaser.Math.Between(-35,35), alpha:0, duration:Phaser.Math.Between(900,1700), delay:i*40, ease:'Sine.easeInOut', onComplete:()=>p.destroy() });
    }
    this.time.delayedCall(1500, () => { if(window.FTTM.showFinishPanel) window.FTTM.showFinishPanel(); });
  }

  sparkle(x,y,color) {
    const p = this.add.circle(x,y,Phaser.Math.FloatBetween(2,4),color,.9).setDepth(90);
    this.tweens.add({ targets:p, x:x+Phaser.Math.Between(-48,48), y:y+Phaser.Math.Between(-55,25), alpha:0, scale:.2, duration:Phaser.Math.Between(480,850), ease:'Sine.easeOut', onComplete:()=>p.destroy() });
  }

  showLine(text, ms) {
    if (window.FTTM.showMessage) window.FTTM.showMessage(text, ms || 2400);
  }

  onGroundTouch() {
    if (!this.player || !this.player.body || !this.player.body.blocked.down) return;
    // Keep safe point updated on stable ground, but not in the middle of gaps.
    if (this.player.x > 40 && this.player.x < window.FTTM.GameSettings.worldWidth - 80) {
      this.lastSafe = { x: this.player.x, y: this.player.y };
    }
  }

  nearestInteraction() {
    let best = null, bestDist = 999999;
    for (const z of this.interactionZones) {
      const dx = Math.abs(z.x - this.player.x);
      const dy = Math.abs(z.y - this.player.y);
      if (dx < z.input?.hitArea?.width) {}
      if (dx < 95 && dy < 105) {
        const d = dx + dy;
        if (d < bestDist) { best = z; bestDist = d; }
      }
    }
    return best;
  }

  runInteraction(zone) {
    const type = zone.getData('type');
    const text = zone.getData('text');
    this.showLine(text, 2400);
    if (type === 'bench') {
      this.player.body.setVelocity(0,0);
      this.tweens.add({ targets:this.player, scaleY:.86, y:this.player.y+10, duration:180, yoyo:true, hold:520, ease:'Sine.easeInOut' });
    } else if (type === 'apple') {
      const apple = this.add.circle(this.player.x+24*this.facing, this.player.y-45, 7, 0xff6f6f).setDepth(95);
      this.tweens.add({ targets:apple, x:this.player.x+5, y:this.player.y-22, scale:.25, alpha:0, duration:520, ease:'Sine.easeIn', onComplete:()=>apple.destroy() });
    } else if (type === 'handstand') {
      this.tweens.add({ targets:this.player, angle:360*this.facing, duration:650, ease:'Sine.easeInOut', onComplete:()=>{ this.player.angle=0; }});
    } else if (type === 'flower') {
      for(let i=0;i<18;i++) this.sparkle(zone.x, zone.y, 0xdac8ff);
    }
  }

  handleInput(delta) {
    const s = window.FTTM.GameSettings;
    const input = window.FTTM.InputState || {};
    const keyboard = this.input.keyboard;
    const cursors = this.cursors || (this.cursors = keyboard.createCursorKeys());
    const keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const keyE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    const left = input.left || cursors.left.isDown || keyA.isDown;
    const right = input.right || cursors.right.isDown || keyD.isDown;
    const jump = input.jump || cursors.up.isDown || keyW.isDown || keySpace.isDown;
    const interact = input.blow || keyE.isDown;

    let target = 0;
    if (left) target -= s.playerSpeed;
    if (right) target += s.playerSpeed;
    const rate = target !== 0 ? s.acceleration : s.deceleration;
    this.currentSpeed = Phaser.Math.MoveTowards(this.currentSpeed, target, rate * delta / 1000);
    this.player.body.setVelocityX(this.currentSpeed);
    if (Math.abs(this.currentSpeed) > 12) {
      this.facing = this.currentSpeed > 0 ? 1 : -1;
      this.player.scaleX = this.facing;
    }

    const onGround = this.player.body.blocked.down;
    if (onGround) this.jumpCount = 0;
    const pressed = jump && !this.jumpWasDown;
    const released = !jump && this.jumpWasDown;
    if (released) this.jumpLocked = false;
    if (pressed && !this.jumpLocked) {
      if (onGround) {
        this.player.body.setVelocityY(s.jumpVelocity);
        this.jumpCount = 1;
        this.jumpLocked = true;
        this.playJumpFeedback();
      } else if (this.jumpCount === 1) {
        this.player.body.setVelocityY(s.doubleJumpVelocity);
        this.jumpCount = 2;
        this.jumpLocked = true;
        this.createDoubleJumpBurst();
        this.playJumpFeedback();
      }
    }
    if (released && this.player.body.velocity.y < s.jumpCutVelocity) this.player.body.setVelocityY(s.jumpCutVelocity);
    this.jumpWasDown = jump;

    const justInteract = interact && !this.interactWasDown;
    if (justInteract) {
      const z = this.nearestInteraction();
      if (z) this.runInteraction(z);
      else this.createBlowEffect();
    }
    this.interactWasDown = interact;

    this.animatePlayer(delta, onGround);
  }

  playJumpFeedback(){ this.tweens.add({ targets:this.player, scaleY:1.04, duration:80, yoyo:true, ease:'Sine.easeOut' }); }

  createDoubleJumpBurst(){
    const x=this.player.x, y=this.player.y+38;
    for(let i=0;i<8;i++){
      const p=this.add.circle(x,y,3,0xffffff,.78).setDepth(85);
      this.tweens.add({targets:p,x:x+Phaser.Math.Between(-38,38),y:y+Phaser.Math.Between(8,42),alpha:0,scale:.2,duration:280,ease:'Sine.easeOut',onComplete:()=>p.destroy()});
    }
  }

  createBlowEffect(){
    const dir=this.facing;
    for(let i=0;i<10;i++){
      const seed=this.add.circle(this.player.x+dir*28,this.player.y-22,3,0xffffff,.86).setDepth(85);
      this.tweens.add({targets:seed,x:seed.x+dir*Phaser.Math.Between(60,135),y:seed.y+Phaser.Math.Between(-46,18),alpha:0,scale:Phaser.Math.FloatBetween(.6,1.35),duration:Phaser.Math.Between(480,760),delay:i*18,ease:'Sine.easeOut',onComplete:()=>seed.destroy()});
    }
  }

  animatePlayer(delta,onGround){
    const moving=Math.abs(this.currentSpeed)>18&&onGround;
    if(moving){
      this.walkTime=(this.walkTime||0)+delta*.012;
      const step=Math.sin(this.walkTime), lift=Math.abs(step);
      this.player.angle=Phaser.Math.Clamp(this.currentSpeed/260,-1,1)*1.5;
      this.leftFoot.x=-10+step*4; this.rightFoot.x=10-step*4;
      this.leftFoot.y=62-Math.max(0,step)*4; this.rightFoot.y=62-Math.max(0,-step)*4;
      this.shadow.scaleX=1+lift*.08;
    } else {
      this.player.angle=Phaser.Math.Linear(this.player.angle,0,.15);
      this.leftFoot.x=Phaser.Math.Linear(this.leftFoot.x,-10,.18);
      this.rightFoot.x=Phaser.Math.Linear(this.rightFoot.x,10,.18);
      this.leftFoot.y=Phaser.Math.Linear(this.leftFoot.y,62,.18);
      this.rightFoot.y=Phaser.Math.Linear(this.rightFoot.y,62,.18);
      this.shadow.scaleX=Phaser.Math.Linear(this.shadow.scaleX,1,.18);
    }
  }

  updateCamera(initial=false) {
    const s = window.FTTM.GameSettings;
    const max = Math.max(0, s.worldWidth - this.visibleW);
    const speed = this.currentSpeed || 0;
    let anchor = this.isPortrait ? .24 : .27;
    if (speed > 35) anchor = this.isPortrait ? .16 : .23;
    if (speed < -35) anchor = this.isPortrait ? .52 : .46;

    // Special soft reveal near wind and final hill: let the world breathe.
    if (this.player.x > 2700 && this.player.x < 3450) anchor = this.isPortrait ? .20 : .20;
    if (this.player.x > 5900) anchor = this.isPortrait ? .22 : .22;

    let targetX = Phaser.Math.Clamp(this.player.x - this.visibleW * anchor, 0, max);
    let targetY = 0;
    if (this.player.x > 2700 && this.player.x < 3450) targetY = -22;
    if (this.player.x > 5900) targetY = -32;
    if (initial) {
      this.cameras.main.scrollX = targetX;
      this.cameras.main.scrollY = targetY;
    } else {
      this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, targetX, .075);
      this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, targetY, .05);
    }
  }

  update(time, delta) {
    if (!this.player || !this.player.body || this.finished) { this.updateCamera(); return; }
    this.handleInput(delta);
    this.updateCamera();

    if (this.player.y > this.safeFallY) {
      const p = this.lastSafe || { x:150, y:this.groundY-84 };
      this.player.body.setVelocity(0,0);
      this.player.setPosition(p.x, p.y - 4);
      this.currentSpeed = 0;
      this.showLine('Probeer het nog eens.', 1200);
    }

    // Contextual hint near interaction zones.
    const z = this.nearestInteraction();
    if (z && (!this.lastHintTime || time - this.lastHintTime > 3000)) {
      this.lastHintTime = time;
      this.showLine('Tik op DOE om iets te doen.', 1400);
    }
  }
}
window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;
window.LevelScene = LevelScene;

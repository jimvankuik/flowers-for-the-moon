
class LevelScene extends Phaser.Scene {
  constructor() {
    super("LevelScene");
    this.controls = { left:false, right:false, jump:false, blow:false };
    this.activeButtonPointers = {};
    this.collected = 0;
    this.totalFlowers = 0;
    this.finished = false;
  }

  create() {
    this.screenW = this.scale.width;
    this.screenH = this.scale.height;
    this.isPortrait = this.screenH >= this.screenW;

    // Bewust verder uitgezoomd dan v17.
    this.worldZoom = this.isPortrait ? 0.56 : 0.82;
    if (this.screenW < 420 && this.isPortrait) this.worldZoom = 0.54;

    this.visibleW = this.screenW / this.worldZoom;
    this.visibleH = this.screenH / this.worldZoom;

    // Extra veilige zone zodat de Safari browserbalk niets afdekt.
    this.bottomSafe = this.isPortrait ? 270 : 145;
    this.groundY = this.visibleH - this.bottomSafe;

    this.physics.world.setBounds(0, 0, 3300, this.visibleH + 320);
    this.input.addPointer(6);

    this.drawBackground();
    this.createPlatforms();
    this.createPlayer();
    this.createFlowers();
    this.createMoonGoal();
    this.createHud();
    this.createControls();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.flowers, this.collectFlower, null, this);
    this.physics.add.overlap(this.player, this.goalZone, this.finishLevel, null, this);

    this.cameras.main.setBounds(0, 0, 3300, this.visibleH);
    this.cameras.main.setZoom(this.worldZoom);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(this.visibleW * 0.26, this.visibleH * 0.16);

    this.scale.on("resize", () => this.scene.restart());
  }

  uiScale() { return 1 / this.worldZoom; }
  fx(v) { return v / this.worldZoom; }
  fy(v) { return v / this.worldZoom; }

  drawBackground() {
    this.add.rectangle(1650, this.visibleH / 2, 3300, this.visibleH, 0x13285d);

    for (let i = 0; i < 155; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, 3300),
        Phaser.Math.Between(12, Math.max(300, this.groundY - 110)),
        Phaser.Math.FloatBetween(1, 2.3),
        0xffffff,
        Phaser.Math.FloatBetween(0.22, 0.78)
      );
      star.setScrollFactor(0.25);
    }

    for (let i = 0; i < 8; i++) {
      const cloud = this.add.ellipse(
        Phaser.Math.Between(130, 3150),
        Phaser.Math.Between(90, Math.max(170, this.groundY - 280)),
        Phaser.Math.Between(130, 250),
        Phaser.Math.Between(24, 50),
        0xffffff,
        0.05
      );
      cloud.setScrollFactor(0.18);
    }

    this.add.rectangle(1650, this.groundY + 75, 3300, 150, 0x071038);
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();

    const gy = this.groundY;
    const platforms = [
      {x:0, y:gy, w:700, h:42},
      {x:850, y:gy-85, w:360, h:36},
      {x:1340, y:gy-150, w:360, h:36},
      {x:1850, y:gy-90, w:380, h:36},
      {x:2460, y:gy, w:840, h:42}
    ];

    platforms.forEach(p => {
      const block = this.add.rectangle(p.x + p.w/2, p.y + p.h/2, p.w, p.h, 0x5f9567);
      block.setStrokeStyle(4, 0xb6eb86);
      this.physics.add.existing(block, true);
      this.platforms.add(block);

      const glow = this.add.rectangle(p.x + p.w/2, p.y + 4, p.w, 7, 0xd9f89b, 0.45);
      glow.setDepth(2);
    });
  }

  createPlayer() {
    this.player = this.add.container(125, this.groundY - 72);

    this.player.add(this.add.ellipse(0, 64, 48, 12, 0x000000, 0.18));
    this.player.add(this.add.ellipse(-8, -18, 32, 48, 0xffdd54));
    this.player.add(this.add.ellipse(0, 28, 42, 76, 0xffb7d5));
    this.player.add(this.add.circle(0, -20, 22, 0xffe0bd));
    this.player.add(this.add.triangle(-5, -40, -22, 0, 16, 0, -3, 24, 0xffdd54));
    this.player.add(this.add.circle(8, -22, 2.5, 0x1d2148));

    this.physics.add.existing(this.player);
    this.player.body.setSize(34, 82);
    this.player.body.setOffset(-17, -42);
    this.player.body.setCollideWorldBounds(true);
  }

  createFlowers() {
    this.flowers = this.physics.add.staticGroup();

    const flowers = [
      [300, this.groundY - 52],
      [1010, this.groundY - 137],
      [1520, this.groundY - 202],
      [2040, this.groundY - 142],
      [2700, this.groundY - 52]
    ];

    this.totalFlowers = flowers.length;

    flowers.forEach(d => {
      const f = this.add.container(d[0], d[1]);
      f.add(this.add.rectangle(0, 24, 4, 44, 0x67bf55));

      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 / 8) * i;
        f.add(this.add.circle(Math.cos(a) * 10, Math.sin(a) * 10, 7, 0xffffff));
      }

      f.add(this.add.circle(0, 0, 4, 0xfff0b4));

      this.physics.add.existing(f, true);
      f.body.setSize(44, 76);
      f.body.setOffset(-22, -20);
      f.setData("collected", false);
      this.flowers.add(f);
    });
  }

  createMoonGoal() {
    const moonX = 2960;
    const moonY = Math.max(145, this.groundY - 430);

    this.moonGroup = this.add.container(moonX, moonY);
    this.moonGroup.setDepth(8);

    const glow = this.add.circle(0, 0, 110, 0xfff2b6, 0.16);
    const moon = this.add.circle(0, 0, 72, 0xffefaf);
    moon.setStrokeStyle(4, 0xffffff, 0.72);
    const crater = this.add.circle(-18, -12, 9, 0xdac88a, 0.3);

    const boy = this.add.container(10, 18);
    boy.add(this.add.circle(0, -28, 16, 0xffd8b5));
    boy.add(this.add.rectangle(0, 4, 30, 52, 0x92bfff));
    boy.add(this.add.circle(6, -30, 2.3, 0x1d2148));

    this.moonGroup.add([glow, moon, crater, boy]);

    this.goalZone = this.add.zone(2850, this.groundY - 60, 320, 180);
    this.physics.add.existing(this.goalZone, true);
  }

  createHud() {
    const s = this.uiScale();

    const bg = this.add.graphics();
    bg.fillStyle(0x071038, 0.55);
    bg.fillRoundedRect(this.fx(14), this.fy(18), 350*s, 60*s, 16*s);
    bg.setScrollFactor(0);
    bg.setDepth(300);

    this.counter = this.add.text(this.fx(28), this.fy(25), "Pluisbloemen: 0/" + this.totalFlowers, {
      fontFamily:"Arial",
      fontSize:Math.round(24*s)+"px",
      fontStyle:"bold",
      color:"#ffffff"
    }).setScrollFactor(0).setDepth(301);

    this.subtitle = this.add.text(this.fx(28), this.fy(54), "Verzamel bloemen voor je broer op de maan", {
      fontFamily:"Arial",
      fontSize:Math.round(14*s)+"px",
      color:"#ffffff"
    }).setScrollFactor(0).setDepth(301);

    // Versie duidelijk boven de browsernavigatie.
    this.add.text(this.fx(14), this.fy(this.screenH - (this.isPortrait ? 210 : 112)), "v18-stable-modern-controls", {
      fontFamily:"Arial",
      fontSize:Math.round(13*s)+"px",
      color:"#ffffff",
      alpha:0.8
    }).setScrollFactor(0).setDepth(400);
  }

  createControls() {
    const y = this.screenH - (this.isPortrait ? 155 : 92);

    this.createModernButton(74, y, "◀", "left", 36, "blue");
    this.createModernButton(158, y, "▶", "right", 36, "blue");

    this.createModernButton(this.screenW - 164, y - 12, "↑", "jump", 44, "blue");
    this.createModernButton(this.screenW - 72, y + 16, "✿", "blow", 38, "red");
  }

  createModernButton(screenX, screenY, label, key, screenRadius, theme) {
    const s = this.uiScale();
    const r = screenRadius * s;
    const x = this.fx(screenX);
    const y = this.fy(screenY);

    const group = this.add.container(x, y);
    group.setScrollFactor(0);
    group.setDepth(350);

    const isRed = theme === "red";

    const shadow = this.add.circle(0, 10*s, r+8*s, 0x000000, 0.26);
    const rimOuter = this.add.circle(0, 0, r+5*s, 0xf5d8ad, 1);
    const rimInner = this.add.circle(0, 0, r+1*s, 0x7a5431, 1);
    const face = this.add.circle(0, 0, r-5*s, isRed ? 0x621128 : 0x1d2556, 1);
    const face2 = this.add.circle(0, 2*s, r-13*s, isRed ? 0x8d1738 : 0x29366f, 1);
    const highlight = this.add.ellipse(-8*s, -14*s, r*1.18, r*0.42, 0xffffff, 0.13);
    const shineDot = this.add.circle(-14*s, -17*s, 4*s, 0xffffff, 0.18);

    const text = this.add.text(0, -1*s, label, {
      fontFamily:"Arial",
      fontStyle:"bold",
      fontSize:Math.round((key === "jump" ? 33 : 27)*s)+"px",
      color:"#ffffff"
    }).setOrigin(0.5);

    group.add([shadow, rimOuter, rimInner, face, face2, highlight, shineDot, text]);
    group.setSize((r+8*s)*2, (r+8*s)*2);
    group.setInteractive();

    group.on("pointerdown", pointer => {
      this.activeButtonPointers[pointer.id] = key;
      this.controls[key] = true;
      group.setScale(0.93);
      face.setFillStyle(isRed ? 0x9e2149 : 0x36499a);
      face2.setFillStyle(isRed ? 0xb52a56 : 0x425ab8);
    });

    const release = pointer => {
      if (this.activeButtonPointers[pointer.id] === key) {
        delete this.activeButtonPointers[pointer.id];
        this.controls[key] = false;
        group.setScale(1);
        face.setFillStyle(isRed ? 0x621128 : 0x1d2556);
        face2.setFillStyle(isRed ? 0x8d1738 : 0x29366f);
      }
    };

    group.on("pointerup", release);
    group.on("pointerout", release);
    group.on("pointercancel", release);
  }

  collectFlower(player, flower) {
    if (!flower || flower.getData("collected")) return;

    flower.setData("collected", true);
    this.collected++;
    this.counter.setText("Pluisbloemen: " + this.collected + "/" + this.totalFlowers);

    // Veilig voor Phaser containers: géén disableBody(), want dat liet iOS vastlopen.
    if (flower.body) {
      flower.body.enable = false;
    }

    this.tweens.add({
      targets: flower,
      y: flower.y - 36,
      alpha: 0,
      scale: 1.35,
      duration: 260,
      ease: "Sine.easeOut",
      onComplete: function() {
        flower.setActive(false);
        flower.setVisible(false);
      }
    });
  }

  finishLevel() {
    if (this.finished || this.collected < this.totalFlowers) return;

    this.finished = true;
    this.player.body.setVelocity(0,0);

    const s = this.uiScale();

    const panel = this.add.graphics();
    panel.fillStyle(0x071038, 0.88);
    panel.fillRoundedRect(this.fx(38), this.fy(115), (this.screenW-76)*s, 170*s, 24*s);
    panel.setScrollFactor(0).setDepth(500);

    this.add.text(this.fx(this.screenW/2), this.fy(160), "Goed gedaan, Amber! 🌙", {
      fontFamily:"Arial",
      fontSize:Math.round(32*s)+"px",
      fontStyle:"bold",
      color:"#ffffff"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501);

    this.add.text(this.fx(this.screenW/2), this.fy(218), "Je gaf de pluisbloemen aan je broer op de maan.", {
      fontFamily:"Arial",
      fontSize:Math.round(20*s)+"px",
      color:"#ffffff",
      align:"center",
      wordWrap:{ width:(this.screenW-120)*s }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501);
  }

  update() {
    if (this.finished) return;

    let speed = 0;
    if (this.controls.left) speed = -260;
    if (this.controls.right) speed = 260;

    this.player.body.setVelocityX(speed);

    if (speed < 0) this.player.setScale(-1,1);
    if (speed > 0) this.player.setScale(1,1);

    if (this.controls.jump && this.player.body.blocked.down) {
      this.player.body.setVelocityY(-560);
    }
  }
}

window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;

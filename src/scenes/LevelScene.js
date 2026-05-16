class LevelScene extends Phaser.Scene {
  constructor() {
    super("LevelScene");
    this.controls = { left: false, right: false, jump: false, blow: false };
    this.collected = 0;
    this.totalFlowers = 0;
    this.finished = false;
  }

  create() {
    const settings = window.FTTM.GameSettings;
    const level = window.FTTM.Level1;

    this.physics.world.setBounds(0, 0, settings.worldWidth, settings.baseHeight + 220);

    this.createBackground(settings);
    this.createPlatforms(level);
    this.createPlayer();
    this.createFlowers(level);
    this.createMoonBoy(level);
    this.createHud();
    this.createTouchControls();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.flowers, this.collectFlower, null, this);
    this.physics.add.overlap(this.player, this.moonBoyZone, this.tryFinishLevel, null, this);

    this.cameras.main.setBounds(0, 0, settings.worldWidth, settings.baseHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(120, 80);
  }

  createBackground(settings) {
    const sky = this.add.rectangle(settings.worldWidth / 2, 270, settings.worldWidth, 540, 0x101f4b);
    sky.setScrollFactor(0.15);

    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, settings.worldWidth);
      const y = Phaser.Math.Between(20, 430);
      const size = Phaser.Math.Between(1, 3);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.35, 0.85));
      star.setScrollFactor(0.25);
    }

    this.add.rectangle(settings.worldWidth / 2, 535, settings.worldWidth, 90, 0x070d2b);
  }

  createPlatforms(level) {
    this.platforms = this.physics.add.staticGroup();

    level.platforms.forEach((p) => {
      const block = this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0x5e8d62);
      block.setStrokeStyle(4, 0xa5d875);
      this.physics.add.existing(block, true);
      this.platforms.add(block);
    });
  }

  createPlayer() {
    this.player = this.add.container(120, 430);

    const body = this.add.ellipse(0, 22, 42, 70, 0xffd4e5);
    const head = this.add.circle(0, -20, 22, 0xffe0bd);
    const hair = this.add.rectangle(-8, -32, 30, 22, 0xffd44d);
    const eye = this.add.circle(8, -22, 2.5, 0x1b2548);

    this.player.add([body, head, hair, eye]);

    this.physics.add.existing(this.player);
    this.player.body.setSize(34, 82);
    this.player.body.setOffset(-17, -42);
    this.player.body.setCollideWorldBounds(true);
  }

  createFlowers(level) {
    this.flowers = this.physics.add.staticGroup();
    this.totalFlowers = level.flowers.length;

    level.flowers.forEach((f) => {
      const flower = this.add.container(f.x, f.y);
      flower.add(this.add.rectangle(0, 25, 4, 45, 0x6bbb55));
      flower.add(this.add.circle(0, 0, 10, 0xffffff));
      flower.add(this.add.circle(-8, 0, 8, 0xffffff));
      flower.add(this.add.circle(8, 0, 8, 0xffffff));
      flower.add(this.add.circle(0, -8, 8, 0xffffff));
      flower.add(this.add.circle(0, 8, 8, 0xffffff));
      flower.add(this.add.circle(0, 0, 4, 0xf9f0b7));

      this.physics.add.existing(flower, true);
      flower.body.setSize(44, 72);
      flower.body.setOffset(-22, -18);
      flower.setData("collected", false);
      this.flowers.add(flower);
    });
  }

  createMoonBoy(level) {
    const x = level.moonBoy.x;
    const y = level.moonBoy.y;

    this.moon = this.add.circle(x, y - 50, 70, 0xfff0b8, 0.95);
    this.moon.setStrokeStyle(4, 0xffffff, 0.75);

    this.boy = this.add.container(x, y);
    this.boy.add(this.add.circle(0, -30, 18, 0xffd8b5));
    this.boy.add(this.add.rectangle(0, 10, 36, 70, 0x86b7ff));
    this.boy.add(this.add.circle(6, -32, 2, 0x1b2548));

    this.moonBoyZone = this.add.zone(x, y, 120, 150);
    this.physics.add.existing(this.moonBoyZone, true);
  }

  createHud() {
    this.hudText = this.add.text(16, 18, "Pluisbloemen: 0/" + this.totalFlowers, {
      fontFamily: "Arial",
      fontSize: "24px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#0b1235",
      strokeThickness: 5
    });
    this.hudText.setScrollFactor(0);

    this.helpText = this.add.text(16, 50, "Verzamel bloemen en breng ze naar de jongen op de maan", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#ffffff",
      stroke: "#0b1235",
      strokeThickness: 4
    });
    this.helpText.setScrollFactor(0);
  }

  createTouchControls() {
    const h = this.scale.height;
    const bottom = h - 84;
    const leftX = 70;
    const rightX = 155;
    const jumpX = this.scale.width - 155;
    const blowX = this.scale.width - 70;

    const makeButton = (x, y, label, key) => {
      const circle = this.add.circle(x, y, 46, 0xffffff, 0.18).setStrokeStyle(3, 0xffffff, 0.35);
      const text = this.add.text(x, y, label, {
        fontFamily: "Arial",
        fontSize: "28px",
        fontStyle: "bold",
        color: "#ffffff"
      }).setOrigin(0.5);

      circle.setScrollFactor(0).setInteractive();
      text.setScrollFactor(0);

      const down = () => { this.controls[key] = true; circle.setAlpha(0.34); };
      const up = () => { this.controls[key] = false; circle.setAlpha(0.18); };

      circle.on("pointerdown", down);
      circle.on("pointerup", up);
      circle.on("pointerout", up);
      circle.on("pointercancel", up);
    };

    makeButton(leftX, bottom, "◀", "left");
    makeButton(rightX, bottom, "▶", "right");
    makeButton(jumpX, bottom, "↑", "jump");
    makeButton(blowX, bottom, "✿", "blow");
  }

  collectFlower(player, flower) {
    if (!flower || flower.getData("collected")) return;

    flower.setData("collected", true);
    this.collected += 1;
    this.hudText.setText("Pluisbloemen: " + this.collected + "/" + this.totalFlowers);

    this.tweens.add({
      targets: flower,
      y: flower.y - 32,
      alpha: 0,
      scale: 1.4,
      duration: 260,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (flower.body) {
          flower.body.enable = false;
        }
        flower.setVisible(false);
      }
    });
  }

  tryFinishLevel() {
    if (this.finished || this.collected < this.totalFlowers) return;

    this.finished = true;
    this.player.body.setVelocity(0, 0);

    const msg = this.add.text(this.cameras.main.scrollX + this.scale.width / 2, 130, "Je gaf de bloemen aan je broer op de maan 🌙", {
      fontFamily: "Arial",
      fontSize: "26px",
      fontStyle: "bold",
      color: "#ffffff",
      align: "center",
      stroke: "#0b1235",
      strokeThickness: 6
    }).setOrigin(0.5);

    msg.setScrollFactor(0);

    for (let i = 0; i < 20; i++) {
      const heart = this.add.text(this.boy.x, this.boy.y - 70, "♡", {
        fontFamily: "Arial",
        fontSize: Phaser.Math.Between(18, 34) + "px",
        color: "#ffd4e5"
      }).setOrigin(0.5);

      this.tweens.add({
        targets: heart,
        x: heart.x + Phaser.Math.Between(-150, 150),
        y: heart.y - Phaser.Math.Between(60, 190),
        alpha: 0,
        duration: Phaser.Math.Between(900, 1700),
        delay: i * 65,
        onComplete: () => heart.destroy()
      });
    }
  }

  update() {
    const settings = window.FTTM.GameSettings;
    if (!this.player || !this.player.body || this.finished) return;

    let vx = 0;
    if (this.controls.left) vx -= settings.playerSpeed;
    if (this.controls.right) vx += settings.playerSpeed;

    this.player.body.setVelocityX(vx);

    if (vx < 0) this.player.setScale(-1, 1);
    if (vx > 0) this.player.setScale(1, 1);

    if (this.controls.jump && this.player.body.blocked.down) {
      this.player.body.setVelocityY(settings.jumpVelocity);
    }

    if (this.controls.blow && !this.lastBlowTime) {
      this.lastBlowTime = this.time.now;
      this.createBlowEffect();
    }

    if (!this.controls.blow) {
      this.lastBlowTime = 0;
    }

    if (this.player.y > 750) {
      this.player.setPosition(120, 430);
      this.player.body.setVelocity(0, 0);
    }
  }

  createBlowEffect() {
    const dir = this.player.scaleX < 0 ? -1 : 1;

    for (let i = 0; i < 8; i++) {
      const seed = this.add.circle(this.player.x + dir * 24, this.player.y - 18, 3, 0xffffff, 0.85);
      this.tweens.add({
        targets: seed,
        x: seed.x + dir * Phaser.Math.Between(50, 115),
        y: seed.y + Phaser.Math.Between(-45, 15),
        alpha: 0,
        duration: 550,
        delay: i * 18,
        onComplete: () => seed.destroy()
      });
    }
  }
}

window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;

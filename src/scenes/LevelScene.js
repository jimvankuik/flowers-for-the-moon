class LevelScene extends Phaser.Scene {
  constructor() {
    super("LevelScene");
    this.controls = { left: false, right: false, jump: false, blow: false };
    this.collected = 0;
    this.totalFlowers = 0;
    this.finished = false;
    this.lastBlowTime = 0;
  }

  create() {
    var settings = window.FTTM.GameSettings;
    var level = window.FTTM.Level1;

    this.physics.world.setBounds(0, 0, settings.worldWidth, settings.baseHeight + 260);

    this.createBackground(settings);
    this.createPlatforms(level);
    this.createPlayer();
    this.createFlowers(level);
    this.createMoonBoy(level);
    this.createHud();
    this.createTouchControls();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.flowers, this.collectFlower, null, this);
    this.physics.add.overlap(this.player, this.finishZone, this.tryFinishLevel, null, this);

    this.cameras.main.setBounds(0, 0, settings.worldWidth, settings.baseHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(160, 90);
  }

  createBackground(settings) {
    this.add.rectangle(settings.worldWidth / 2, 270, settings.worldWidth, 540, 0x122451);

    for (var i = 0; i < 110; i++) {
      var x = Phaser.Math.Between(0, settings.worldWidth);
      var y = Phaser.Math.Between(22, 430);
      var size = Phaser.Math.FloatBetween(1, 2.7);
      var star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.28, 0.85));
      star.setScrollFactor(0.25);
    }

    for (var c = 0; c < 8; c++) {
      var cloud = this.add.ellipse(
        Phaser.Math.Between(120, settings.worldWidth - 120),
        Phaser.Math.Between(80, 260),
        Phaser.Math.Between(110, 210),
        Phaser.Math.Between(22, 45),
        0xffffff,
        0.06
      );
      cloud.setScrollFactor(0.18);
    }

    this.add.rectangle(settings.worldWidth / 2, 535, settings.worldWidth, 90, 0x070d2b);
  }

  createPlatforms(level) {
    this.platforms = this.physics.add.staticGroup();

    for (var i = 0; i < level.platforms.length; i++) {
      var p = level.platforms[i];
      var block = this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0x5d8f61);
      block.setStrokeStyle(4, 0xa5d875);
      this.physics.add.existing(block, true);
      this.platforms.add(block);

      var topGlow = this.add.rectangle(p.x + p.w / 2, p.y + 3, p.w, 6, 0xd7f5a0, 0.45);
      topGlow.setDepth(2);
    }
  }

  createPlayer() {
    this.player = this.add.container(120, 430);

    var shadow = this.add.ellipse(0, 64, 48, 12, 0x000000, 0.18);
    var hairBack = this.add.ellipse(-8, -18, 32, 48, 0xffd94c);
    var dress = this.add.ellipse(0, 28, 42, 76, 0xffb6d5);
    var head = this.add.circle(0, -20, 22, 0xffe0bd);
    var fringe = this.add.triangle(-5, -40, -22, 0, 16, 0, -3, 24, 0xffd94c);
    var eye = this.add.circle(8, -22, 2.5, 0x1b2548);

    this.player.add([shadow, hairBack, dress, head, fringe, eye]);

    this.physics.add.existing(this.player);
    this.player.body.setSize(34, 82);
    this.player.body.setOffset(-17, -42);
    this.player.body.setCollideWorldBounds(true);
  }

  createFlowers(level) {
    this.flowers = this.physics.add.staticGroup();
    this.totalFlowers = level.flowers.length;

    for (var i = 0; i < level.flowers.length; i++) {
      var f = level.flowers[i];
      var flower = this.add.container(f.x, f.y);
      flower.add(this.add.rectangle(0, 25, 4, 45, 0x6bbb55));

      for (var j = 0; j < 8; j++) {
        var a = (Math.PI * 2 / 8) * j;
        flower.add(this.add.circle(Math.cos(a) * 10, Math.sin(a) * 10, 7, 0xffffff, 0.95));
      }

      flower.add(this.add.circle(0, 0, 4, 0xf9f0b7));
      this.physics.add.existing(flower, true);
      flower.body.setSize(44, 76);
      flower.body.setOffset(-22, -20);
      flower.setData("collected", false);
      this.flowers.add(flower);
    }
  }

  createMoonBoy(level) {
    var x = level.moonBoy.x;
    var y = level.moonBoy.y;

    this.moonGroup = this.add.container(x, y);
    var moonGlow = this.add.circle(0, 0, 98, 0xfff2b6, 0.16);
    var moon = this.add.circle(0, 0, 64, 0xffedb0, 0.98);
    moon.setStrokeStyle(4, 0xffffff, 0.7);
    var crater1 = this.add.circle(-20, -16, 9, 0xdcc987, 0.35);
    var crater2 = this.add.circle(18, 12, 7, 0xdcc987, 0.3);
    var crater3 = this.add.circle(6, -28, 5, 0xdcc987, 0.25);

    var boy = this.add.container(12, 18);
    boy.add(this.add.circle(0, -28, 16, 0xffd8b5));
    boy.add(this.add.rectangle(0, 5, 32, 56, 0x8fbfff));
    boy.add(this.add.circle(6, -30, 2.4, 0x1b2548));
    boy.add(this.add.rectangle(-8, -42, 22, 10, 0x6a4a32));
    boy.add(this.add.rectangle(-12, 35, 8, 24, 0x8fbfff));
    boy.add(this.add.rectangle(12, 35, 8, 24, 0x8fbfff));

    this.moonGroup.add([moonGlow, moon, crater1, crater2, crater3, boy]);
    this.moonGroup.setDepth(5);

    this.finishZone = this.add.zone(level.finishZone.x, level.finishZone.y, level.finishZone.w, level.finishZone.h);
    this.physics.add.existing(this.finishZone, true);

    this.add.text(x - 125, y + 92, "Breng hier de bloemen", {
      fontFamily: "Arial",
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#0b1235",
      strokeThickness: 5
    }).setDepth(8);
  }

  createHud() {
    var bg = this.add.graphics();
    bg.fillStyle(0x071038, 0.48);
    bg.fillRoundedRect(12, 14, 330, 58, 14);
    bg.setScrollFactor(0);

    this.hudText = this.add.text(26, 23, "Pluisbloemen: 0/" + this.totalFlowers, {
      fontFamily: "Arial",
      fontSize: "24px",
      fontStyle: "bold",
      color: "#ffffff"
    });
    this.hudText.setScrollFactor(0);

    this.helpText = this.add.text(26, 51, "Verzamel bloemen voor je broer op de maan", {
      fontFamily: "Arial",
      fontSize: "14px",
      color: "#ffffff",
      alpha: 0.92
    });
    this.helpText.setScrollFactor(0);

    var versionText = this.add.text(14, 518, window.FTTM.GameSettings.version, {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffffff",
      alpha: 0.65
    });
    versionText.setScrollFactor(0);
    versionText.setDepth(300);
  }

  createTouchControls() {
    var bottom = 454;
    var leftX = 76;
    var rightX = 156;
    var jumpX = 798;
    var blowX = 888;

    this.makeButton(leftX, bottom, "‹", "left", 43);
    this.makeButton(rightX, bottom, "›", "right", 43);
    this.makeButton(jumpX, bottom, "↑", "jump", 43);
    this.makeButton(blowX, bottom, "✿", "blow", 43);
  }

  makeButton(x, y, label, key, size) {
    var group = this.add.container(x, y);
    group.setScrollFactor(0);
    group.setDepth(100);

    var outer = this.add.circle(0, 0, size, 0xffffff, 0.10);
    outer.setStrokeStyle(2, 0xffffff, 0.26);
    var inner = this.add.circle(0, 0, size - 10, 0x86b7ff, 0.15);
    inner.setStrokeStyle(1, 0xffffff, 0.28);
    var text = this.add.text(0, -2, label, {
      fontFamily: "Arial",
      fontSize: key === "blow" ? "27px" : "31px",
      fontStyle: "bold",
      color: "#ffffff"
    });
    text.setOrigin(0.5);

    group.add([outer, inner, text]);
    group.setSize(size * 2, size * 2);
    group.setInteractive();

    var scene = this;

    group.on("pointerdown", function () {
      scene.controls[key] = true;
      outer.setAlpha(0.24);
      inner.setAlpha(0.35);
      group.setScale(0.95);
    });

    var up = function () {
      scene.controls[key] = false;
      outer.setAlpha(0.10);
      inner.setAlpha(0.15);
      group.setScale(1);
    };

    group.on("pointerup", up);
    group.on("pointerout", up);
    group.on("pointercancel", up);
  }

  collectFlower(player, flower) {
    if (!flower || flower.getData("collected")) return;

    flower.setData("collected", true);
    this.collected += 1;
    this.hudText.setText("Pluisbloemen: " + this.collected + "/" + this.totalFlowers);

    this.tweens.add({
      targets: flower,
      y: flower.y - 36,
      alpha: 0,
      scale: 1.45,
      duration: 300,
      ease: "Sine.easeOut",
      onComplete: function () {
        if (flower.body) flower.body.enable = false;
        flower.setVisible(false);
      }
    });
  }

  tryFinishLevel() {
    if (this.finished || this.collected < this.totalFlowers) return;

    this.finished = true;
    this.player.body.setVelocity(0, 0);
    this.controls.left = false;
    this.controls.right = false;
    this.controls.jump = false;
    this.controls.blow = false;

    this.cameras.main.pan(this.moonGroup.x - 230, 270, 600, "Sine.easeInOut");

    var scene = this;
    this.time.delayedCall(260, function () {
      scene.playGiveFlowersAnimation();
    });
  }

  playGiveFlowersAnimation() {
    var startX = this.player.x + 12;
    var startY = this.player.y - 50;
    var targetX = this.moonGroup.x + 18;
    var targetY = this.moonGroup.y + 18;
    var scene = this;

    for (var i = 0; i < this.totalFlowers; i++) {
      var flower = this.add.container(startX, startY);
      flower.setDepth(20);
      flower.add(this.add.rectangle(0, 18, 3, 28, 0x6bbb55));
      flower.add(this.add.circle(0, 0, 8, 0xffffff));
      flower.add(this.add.circle(-6, 0, 6, 0xffffff));
      flower.add(this.add.circle(6, 0, 6, 0xffffff));
      flower.add(this.add.circle(0, -6, 6, 0xffffff));
      flower.add(this.add.circle(0, 6, 6, 0xffffff));
      flower.add(this.add.circle(0, 0, 3, 0xf9f0b7));

      this.tweens.add({
        targets: flower,
        x: targetX + Phaser.Math.Between(-20, 18),
        y: targetY + Phaser.Math.Between(-20, 18),
        scale: 0.75,
        duration: 850,
        delay: i * 160,
        ease: "Sine.easeInOut",
        onComplete: function (tween, targets) {
          var obj = targets[0];
          scene.tweens.add({
            targets: obj,
            alpha: 0,
            y: obj.y - 16,
            duration: 420,
            onComplete: function () { obj.destroy(); }
          });
        }
      });
    }

    this.time.delayedCall(1200, function () {
      scene.showFinishMessage();
    });
  }

  showFinishMessage() {
    var panel = this.add.graphics();
    panel.setScrollFactor(0);
    panel.setDepth(200);
    panel.fillStyle(0x071038, 0.82);
    panel.fillRoundedRect(120, 135, 720, 170, 28);
    panel.lineStyle(3, 0xffffff, 0.22);
    panel.strokeRoundedRect(120, 135, 720, 170, 28);

    var title = this.add.text(480, 177, "Goed gedaan, Amber! 🌙", {
      fontFamily: "Arial",
      fontSize: "34px",
      fontStyle: "bold",
      color: "#ffffff",
      align: "center"
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(201);

    var subtitle = this.add.text(480, 230, "Je gaf de pluisbloemen liefdevol aan je broer op de maan.", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 620 }
    });
    subtitle.setOrigin(0.5);
    subtitle.setScrollFactor(0);
    subtitle.setDepth(201);

    for (var i = 0; i < 22; i++) {
      var heart = this.add.text(this.moonGroup.x, this.moonGroup.y, "♡", {
        fontFamily: "Arial",
        fontSize: Phaser.Math.Between(20, 38) + "px",
        color: "#ffd4e5"
      });
      heart.setOrigin(0.5);
      heart.setDepth(21);

      this.tweens.add({
        targets: heart,
        x: heart.x + Phaser.Math.Between(-170, 170),
        y: heart.y - Phaser.Math.Between(70, 210),
        alpha: 0,
        duration: Phaser.Math.Between(1000, 1900),
        delay: i * 55,
        onComplete: function (tween, targets) { targets[0].destroy(); }
      });
    }
  }

  update() {
    var settings = window.FTTM.GameSettings;
    if (!this.player || !this.player.body || this.finished) return;

    var vx = 0;
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

    if (this.player.y > 760) {
      this.player.setPosition(120, 430);
      this.player.body.setVelocity(0, 0);
    }
  }

  createBlowEffect() {
    var dir = this.player.scaleX < 0 ? -1 : 1;

    for (var i = 0; i < 8; i++) {
      var seed = this.add.circle(this.player.x + dir * 24, this.player.y - 18, 3, 0xffffff, 0.85);
      seed.setDepth(10);
      this.tweens.add({
        targets: seed,
        x: seed.x + dir * Phaser.Math.Between(50, 115),
        y: seed.y + Phaser.Math.Between(-45, 15),
        alpha: 0,
        duration: 550,
        delay: i * 18,
        onComplete: function (tween, targets) { targets[0].destroy(); }
      });
    }
  }
}

window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;

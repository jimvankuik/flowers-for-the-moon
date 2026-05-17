
class LevelScene extends Phaser.Scene {
  constructor() {
    super("LevelScene");
    this.collected = 0;
    this.totalFlowers = 0;
    this.finished = false;
    this.finishStarted = false;
    this.lastBlowAt = 0;
    this.currentSpeed = 0;
    this.facing = 1;
    this.wasGrounded = false;
    this.walkTime = 0;
    this.jumpWasDown = false;
    this.jumpLocked = false;
    this.controls = { left:false, right:false, jump:false, blow:false };
    this.pointerToControl = {};
    this.buildMarker = "v31-real-fixes-levelscene";
  }

  create() {
    this.screenW = this.scale.width;
    this.screenH = this.scale.height;
    this.isPortrait = this.screenH >= this.screenW;

    // Landscape bewust veel verder uitgezoomd. Portrait blijft speelbaar.
    this.worldZoom = this.isPortrait ? 0.56 : 0.26;
    if (this.screenW < 420 && this.isPortrait) this.worldZoom = 0.54;

    this.visibleW = this.screenW / this.worldZoom;
    this.visibleH = this.screenH / this.worldZoom;

    // Fullscreen/home-screen: geen browser safe-area meer reserveren.
    this.bottomSafe = this.isPortrait ? 112 : 48;
    this.groundY = this.visibleH - this.bottomSafe;

    // Portrait: start bewust op 35% van het scherm, zodat camera vanaf het begin goed staat.
    this.startX = Math.max(260, this.visibleW * 0.35);

    var settings = window.FTTM.GameSettings;
    this.physics.world.setBounds(0, 0, settings.worldWidth, this.visibleH + 320);

    this.input.addPointer(8);

    if (window.FTTM.hideFinishPanel) window.FTTM.hideFinishPanel();
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(0, 5);

    this.drawBackground(settings);
    this.createPlatforms();
    this.createPlayer();
    this.createFlowers();
    this.createMoonGoal(settings);
    this.createCanvasControls();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.flowers, this.collectFlower, null, this);
    this.physics.add.overlap(this.player, this.goalZone, this.startFinishSequence, null, this);

    this.cameras.main.setBounds(0, 0, settings.worldWidth, this.visibleH);
    this.cameras.main.setZoom(this.worldZoom);
    this.updateCamera(true);

    this.input.on("pointerup", this.releasePointer, this);
    this.input.on("pointerupoutside", this.releasePointer, this);

    this.scale.on("resize", () => {
      if (!this.finished) this.scene.restart();
    });
  }

  sx(v) { return v / this.worldZoom; }
  sy(v) { return v / this.worldZoom; }

  drawBackground(settings) {
    this.add.rectangle(settings.worldWidth / 2, this.visibleH / 2, settings.worldWidth, this.visibleH, 0x13285d);

    for (let i = 0; i < 155; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, settings.worldWidth),
        Phaser.Math.Between(12, Math.max(300, this.groundY - 110)),
        Phaser.Math.FloatBetween(1, 2.3),
        0xffffff,
        Phaser.Math.FloatBetween(0.22, 0.78)
      );
      star.setScrollFactor(0.25);
    }

    for (let i = 0; i < 8; i++) {
      const cloud = this.add.ellipse(
        Phaser.Math.Between(130, settings.worldWidth - 150),
        Phaser.Math.Between(90, Math.max(170, this.groundY - 280)),
        Phaser.Math.Between(130, 250),
        Phaser.Math.Between(24, 50),
        0xffffff,
        0.05
      );
      cloud.setScrollFactor(0.18);
    }

    this.add.rectangle(settings.worldWidth / 2, this.groundY + 75, settings.worldWidth, 150, 0x071038);
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();

    const gy = this.groundY;
    const platforms = [
      {x:0, y:gy, w:1150, h:42},
      {x:1180, y:gy-85, w:360, h:36},
      {x:1660, y:gy-150, w:360, h:36},
      {x:2140, y:gy-90, w:380, h:36},
      {x:2700, y:gy, w:700, h:42}
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
    this.player = this.add.container(this.startX, this.groundY - 72);

    this.shadow = this.add.ellipse(0, 66, 50, 12, 0x000000, 0.18);
    this.leftFoot = this.add.ellipse(-10, 62, 15, 7, 0xf0a0c3);
    this.rightFoot = this.add.ellipse(10, 62, 15, 7, 0xf0a0c3);
    const hairBack = this.add.ellipse(-8, -18, 32, 48, 0xffdd54);
    const dress = this.add.ellipse(0, 28, 42, 76, 0xffb7d5);
    const head = this.add.circle(0, -20, 22, 0xffe0bd);
    const fringe = this.add.triangle(-5, -40, -22, 0, 16, 0, -3, 24, 0xffdd54);
    const eye = this.add.circle(8, -22, 2.5, 0x1d2148);

    this.player.add([this.shadow, this.leftFoot, this.rightFoot, hairBack, dress, head, fringe, eye]);

    this.physics.add.existing(this.player);
    this.player.body.setSize(34, 82);
    this.player.body.setOffset(-17, -42);
    this.player.body.setCollideWorldBounds(true);
  }

  createFlowers() {
    this.flowers = this.physics.add.staticGroup();

    const flowers = [
      [this.startX + 210, this.groundY - 52],
      [1320, this.groundY - 137],
      [1800, this.groundY - 202],
      [2280, this.groundY - 142],
      [2860, this.groundY - 52]
    ];

    this.totalFlowers = flowers.length;
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(0, this.totalFlowers);

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

  createMoonGoal(settings) {
    const moonX = settings.worldWidth - 310;
    const moonY = Math.max(145, this.groundY - 430);

    this.moonGroup = this.add.container(moonX, moonY);
    this.moonGroup.setDepth(8);

    const glow = this.add.circle(0, 0, 110, 0xfff2b6, 0.16);
    const moon = this.add.circle(0, 0, 72, 0xffefaf);
    moon.setStrokeStyle(4, 0xffffff, 0.72);
    const crater1 = this.add.circle(-18, -12, 9, 0xdac88a, 0.3);
    const crater2 = this.add.circle(18, 15, 7, 0xdac88a, 0.25);

    const boy = this.add.container(10, 18);
    boy.add(this.add.circle(0, -28, 16, 0xffd8b5));
    boy.add(this.add.rectangle(0, 4, 30, 52, 0x92bfff));
    boy.add(this.add.circle(6, -30, 2.3, 0x1d2148));
    boy.add(this.add.rectangle(-8, -42, 20, 9, 0x6a4a32));

    this.moonGroup.add([glow, moon, crater1, crater2, boy]);

    this.goalZone = this.add.zone(settings.worldWidth - 440, this.groundY - 60, 360, 190);
    this.physics.add.existing(this.goalZone, true);
  }

  createCanvasControls() {
    // Controls staan nu in Phaser canvas i.p.v. DOM, zodat iOS geen vergrootglas/callout meer triggert.
    this.createControlButton(72, this.screenH - 66, "‹", "LINKS", "left", false);
    this.createControlButton(158, this.screenH - 66, "›", "RECHTS", "right", false);

    this.createControlButton(this.screenW - 172, this.screenH - 66, "⌃", "SPRINGEN", "jump", true);
    this.createControlButton(this.screenW - 74, this.screenH - 66, "✿", "BLAZEN", "blow", false);
  }

  createControlButton(screenX, screenY, icon, label, key, iconOnly) {
    const x = this.sx(screenX);
    const y = this.sy(screenY);
    const group = this.add.container(x, y);
    group.setScrollFactor(0);
    group.setDepth(500);

    const isFlower = key === "blow";
    const isJump = key === "jump";
    const circleRadius = isJump ? this.sx(32) : this.sx(27);

    const iconCircle = this.add.circle(0, -this.sy(12), circleRadius, isFlower ? 0x4a1822 : 0x351f23, isJump ? 0.0 : 0.72);
    const iconText = this.add.text(0, -this.sy(13), icon, {
      fontFamily: "Arial",
      fontSize: Math.round((isJump ? 44 : 33) / this.worldZoom) + "px",
      fontStyle: "bold",
      color: "#fff8e8"
    }).setOrigin(0.5);

    const labelBg = this.add.graphics();
    labelBg.fillStyle(0x37181d, 0.86);
    labelBg.fillRoundedRect(-this.sx(44), this.sy(22), this.sx(88), this.sy(22), this.sy(11));

    const labelText = this.add.text(0, this.sy(33), label, {
      fontFamily: "Arial",
      fontSize: Math.round(11 / this.worldZoom) + "px",
      fontStyle: "bold",
      color: "#fff8e8"
    }).setOrigin(0.5);

    group.add([iconCircle, iconText, labelBg, labelText]);

    const hit = this.add.zone(0, 0, this.sx(92), this.sy(92)).setOrigin(0.5);
    group.add(hit);
    hit.setInteractive({ useHandCursor: false });

    hit.on("pointerdown", pointer => {
      this.pointerToControl[pointer.id] = key;
      this.controls[key] = true;
      group.setScale(0.94);
    });

    hit.on("pointerout", pointer => {
      // Niet loslaten bij out; multi-touch voelt beter als alleen pointerup/cancel loslaat.
    });
  }

  releasePointer(pointer) {
    const key = this.pointerToControl[pointer.id];
    if (!key) return;
    this.controls[key] = false;
    delete this.pointerToControl[pointer.id];

    // Zet alle controls terug naar normale schaal.
    this.children.list.forEach(obj => {
      if (obj && obj.type === "Container" && obj.depth === 500) obj.setScale(1);
    });
  }

  collectFlower(player, flower) {
    if (!flower || flower.getData("collected")) return;

    flower.setData("collected", true);
    this.collected++;
    if (window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(this.collected, this.totalFlowers);

    if (flower.body) flower.body.enable = false;

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

  startFinishSequence() {
    if (this.finishStarted || this.collected < this.totalFlowers) return;

    this.finishStarted = true;
    this.finished = true;
    this.player.body.setVelocity(0, 0);

    this.cameras.main.pan(this.moonGroup.x - this.visibleW * 0.33, this.visibleH * 0.42, 650, "Sine.easeInOut");

    this.time.delayedCall(420, () => this.playFlowerGiftAnimation());
  }

  playFlowerGiftAnimation() {
    const startX = this.player.x + 10;
    const startY = this.player.y - 48;
    const targetX = this.moonGroup.x + 12;
    const targetY = this.moonGroup.y + 20;

    for (let i = 0; i < this.totalFlowers; i++) {
      const f = this.add.container(startX, startY);
      f.setDepth(30);
      f.add(this.add.rectangle(0, 18, 3, 28, 0x67bf55));
      f.add(this.add.circle(0, 0, 8, 0xffffff));
      f.add(this.add.circle(-6, 0, 6, 0xffffff));
      f.add(this.add.circle(6, 0, 6, 0xffffff));
      f.add(this.add.circle(0, -6, 6, 0xffffff));
      f.add(this.add.circle(0, 6, 6, 0xffffff));
      f.add(this.add.circle(0, 0, 3, 0xfff0b4));

      this.tweens.add({
        targets: f,
        x: targetX + Phaser.Math.Between(-22, 20),
        y: targetY + Phaser.Math.Between(-18, 18),
        scale: 0.76,
        duration: 850,
        delay: i * 160,
        ease: "Sine.easeInOut",
        onComplete: () => {
          this.tweens.add({ targets: f, alpha: 0, y: f.y - 16, duration: 420, onComplete: () => f.destroy() });
        }
      });
    }

    this.time.delayedCall(1300, () => {
      this.showHearts();
      if (window.FTTM.showFinishPanel) window.FTTM.showFinishPanel();
    });
  }

  showHearts() {
    for (let i = 0; i < 24; i++) {
      const heart = this.add.text(this.moonGroup.x, this.moonGroup.y, "♡", {
        fontFamily: "Arial",
        fontSize: Phaser.Math.Between(20, 38) + "px",
        color: "#ffd4e5"
      });
      heart.setOrigin(0.5);
      heart.setDepth(35);

      this.tweens.add({
        targets: heart,
        x: heart.x + Phaser.Math.Between(-170, 170),
        y: heart.y - Phaser.Math.Between(70, 210),
        alpha: 0,
        duration: Phaser.Math.Between(1000, 1900),
        delay: i * 55,
        onComplete: () => heart.destroy()
      });
    }
  }

  createBlowEffect() {
    const dir = this.facing;

    for (let i = 0; i < 10; i++) {
      const seed = this.add.circle(this.player.x + dir * 28, this.player.y - 22, 3, 0xffffff, 0.86);
      seed.setDepth(12);

      this.tweens.add({
        targets: seed,
        x: seed.x + dir * Phaser.Math.Between(60, 135),
        y: seed.y + Phaser.Math.Between(-46, 18),
        alpha: 0,
        scale: Phaser.Math.FloatBetween(0.6, 1.35),
        duration: Phaser.Math.Between(480, 760),
        delay: i * 18,
        ease: "Sine.easeOut",
        onComplete: () => seed.destroy()
      });
    }
  }

  animatePlayer(delta, onGround) {
    const absSpeed = Math.abs(this.currentSpeed);
    const moving = absSpeed > 18 && onGround;

    if (moving) {
      this.walkTime += delta * 0.012;
      const step = Math.sin(this.walkTime);
      const lift = Math.abs(step);

      this.player.angle = Phaser.Math.Clamp(this.currentSpeed / 260, -1, 1) * 1.5;
      this.leftFoot.x = -10 + step * 4;
      this.rightFoot.x = 10 - step * 4;
      this.leftFoot.y = 62 - Math.max(0, step) * 4;
      this.rightFoot.y = 62 - Math.max(0, -step) * 4;
      this.shadow.scaleX = 1 + lift * 0.08;
    } else {
      this.player.angle = Phaser.Math.Linear(this.player.angle, 0, 0.15);
      this.leftFoot.x = Phaser.Math.Linear(this.leftFoot.x, -10, 0.18);
      this.rightFoot.x = Phaser.Math.Linear(this.rightFoot.x, 10, 0.18);
      this.leftFoot.y = Phaser.Math.Linear(this.leftFoot.y, 62, 0.18);
      this.rightFoot.y = Phaser.Math.Linear(this.rightFoot.y, 62, 0.18);
      this.shadow.scaleX = Phaser.Math.Linear(this.shadow.scaleX, 1, 0.18);
    }
  }

  playJumpFeedback() {
    this.tweens.add({
      targets: this.player,
      scaleY: 1.04,
      duration: 85,
      yoyo: true,
      ease: "Sine.easeOut"
    });
  }

  playLandingFeedback() {
    this.cameras.main.shake(70, 0.002);
    this.tweens.add({
      targets: this.player,
      scaleY: 0.94,
      duration: 75,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.player.scaleY = 1;
        this.player.scaleX = this.facing;
      }
    });
  }

  handleVariableJump(input, onGround) {
    const settings = window.FTTM.GameSettings;
    const jumpPressedNow = input.jump && !this.jumpWasDown;
    const jumpReleasedNow = !input.jump && this.jumpWasDown;

    if (jumpPressedNow && onGround && !this.jumpLocked) {
      this.player.body.setVelocityY(settings.jumpVelocity);
      this.jumpLocked = true;
      this.playJumpFeedback();
    }

    if (jumpReleasedNow && this.player.body.velocity.y < settings.jumpCutVelocity) {
      this.player.body.setVelocityY(settings.jumpCutVelocity);
    }

    if (!input.jump && onGround) {
      this.jumpLocked = false;
    }

    this.jumpWasDown = input.jump;
  }

  updateCamera(initial) {
    const maxScroll = window.FTTM.GameSettings.worldWidth - this.visibleW;

    // 35% vanaf links, exact zoals gevraagd. Geen deadzone, geen vertraging die achterloopt.
    let targetRatio = this.facing >= 0 ? 0.35 : 0.58;
    const desiredX = Phaser.Math.Clamp(this.player.x - this.visibleW * targetRatio, 0, maxScroll);

    this.cameras.main.scrollX = initial ? desiredX : Phaser.Math.Linear(this.cameras.main.scrollX, desiredX, 0.92);
    this.cameras.main.scrollY = 0;
  }

  update(time, delta) {
    if (this.finished) return;

    const input = this.controls;
    const settings = window.FTTM.GameSettings;
    const onGround = this.player.body.blocked.down;

    let targetSpeed = 0;
    if (input.left) targetSpeed -= settings.playerSpeed;
    if (input.right) targetSpeed += settings.playerSpeed;

    const rate = targetSpeed === 0 ? settings.deceleration : settings.acceleration;
    const step = rate * (delta / 1000);

    if (this.currentSpeed < targetSpeed) this.currentSpeed = Math.min(this.currentSpeed + step, targetSpeed);
    if (this.currentSpeed > targetSpeed) this.currentSpeed = Math.max(this.currentSpeed - step, targetSpeed);

    this.player.body.setVelocityX(this.currentSpeed);

    if (Math.abs(this.currentSpeed) > 8) {
      this.facing = this.currentSpeed < 0 ? -1 : 1;
      this.player.scaleX = this.facing;
    }

    this.handleVariableJump(input, onGround);

    if (!this.wasGrounded && onGround) {
      this.playLandingFeedback();
    }
    this.wasGrounded = onGround;

    if (input.blow && this.time.now - this.lastBlowAt > 360) {
      this.lastBlowAt = this.time.now;
      this.createBlowEffect();
    }

    if (this.player.y > this.groundY + 260) {
      this.player.setPosition(this.startX, this.groundY - 72);
      this.player.body.setVelocity(0, 0);
      this.currentSpeed = 0;
    }

    this.animatePlayer(delta, onGround);
    this.updateCamera(false);
  }
}

window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;
// build-marker: v31-real-fixes-levelscene

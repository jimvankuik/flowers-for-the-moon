class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
  }

  create() {
    this.level = LEVEL_1;
    this.collectedFlowers = 0;
    this.canFinish = false;
    this.levelFinished = false;

    this.worldWidth = 2050;
    this.worldHeight = Math.max(GAME_SETTINGS.height, this.scale.height);
    this.yOffset = Math.max(0, this.worldHeight - GAME_SETTINGS.height);

    // In portrait the camera should show more height, not stretch the game.
    // All game objects keep their original proportions.

    this.createWorld();
    this.createPlayer();
    this.createPlatforms();
    this.createFlowers();
    this.createMoonBoy();
    this.createControls();
    this.createUI();
    this.createCamera();
    this.createCollisions();
  }

  createWorld() {
    const worldWidth = this.worldWidth;
    const worldHeight = this.worldHeight;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x0d1430, 0x0d1430, 0x2b416f, 0x2b416f, 1);
    sky.fillRect(0, 0, worldWidth, worldHeight);

    this.add.circle(1700, 95, 58, 0xf7f1c8, 0.92);
    this.add.circle(1677, 75, 10, 0xd8d0a9, 0.35);
    this.add.circle(1722, 112, 8, 0xd8d0a9, 0.25);

    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, worldWidth);
      const y = Phaser.Math.Between(20, Math.max(120, Math.min(360, this.worldHeight - 230))); 
      const size = Phaser.Math.FloatBetween(1, 2.3);
      this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.35, 0.85));
    }

    for (let i = 0; i < 10; i++) {
      const x = 70 + i * 220;
      const y = this.worldHeight - 70 + Phaser.Math.Between(-12, 12);
      this.add.ellipse(x, y, 190, 55, 0x243a67, 0.35);
    }
  }

  createPlayer() {
    const start = this.level.start;

    this.player = this.add.container(start.x, start.y + this.yOffset);
    this.playerBody = this.add.ellipse(0, 8, 34, 48, 0xffd6de);
    this.playerHead = this.add.circle(0, -25, 18, 0xffe1c4);
    this.playerHair = this.add.ellipse(0, -36, 38, 24, 0xf7d35b);
    this.playerEye = this.add.circle(7, -27, 2, 0x25304f);
    this.playerArm = this.add.rectangle(18, 2, 8, 28, 0xffe1c4);
    this.player.add([this.playerHair, this.playerHead, this.playerEye, this.playerBody, this.playerArm]);

    this.physics.add.existing(this.player);
    this.player.body.setSize(30, 58);
    this.player.body.setOffset(-15, -48);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setDragX(1200);
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();

    this.level.platforms.forEach((p) => {
      const platform = this.add.rectangle(p.x + p.w / 2, p.y + this.yOffset + p.h / 2, p.w, p.h, 0x456b56);
      platform.setStrokeStyle(3, 0xb8d884, 0.6);
      this.physics.add.existing(platform, true);
      this.platforms.add(platform);

      const grass = this.add.rectangle(p.x + p.w / 2, p.y + this.yOffset + 3, p.w, 8, 0x8fc96b);
      grass.setDepth(2);
    });

    this.softObstacles = this.physics.add.staticGroup();
    this.level.softObstacles.forEach((o) => {
      const puddle = this.add.ellipse(o.x + o.w / 2, o.y + this.yOffset + 8, o.w, o.h, 0x8cc7ff, 0.65);
      this.physics.add.existing(puddle, true);
      this.softObstacles.add(puddle);
    });
  }

  createFlowers() {
    this.flowers = this.physics.add.group({ allowGravity: false, immovable: true });

    this.level.flowers.forEach((f) => {
      const flower = this.add.container(f.x, f.y + this.yOffset);
      flower.add(this.add.rectangle(0, 14, 3, 26, 0x6fa85e));
      flower.add(this.add.circle(0, 0, 9, 0xffffff));
      flower.add(this.add.circle(9, -3, 5, 0xffffff, 0.9));
      flower.add(this.add.circle(-7, -4, 5, 0xffffff, 0.9));
      flower.add(this.add.circle(2, -9, 5, 0xffffff, 0.9));
      this.physics.add.existing(flower);
      flower.body.setCircle(16);
      flower.body.setOffset(-16, -16);
      this.flowers.add(flower);

      this.tweens.add({ targets: flower, y: f.y + this.yOffset - 7, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
  }

  createMoonBoy() {
    const m = this.level.moonBoy;
    this.moonBoy = this.add.container(m.x, m.y + this.yOffset);
    this.moonBoy.add(this.add.circle(0, -18, 20, 0xffdec5));
    this.moonBoy.add(this.add.ellipse(0, 16, 42, 58, 0x9fc4ff));
    this.moonBoy.add(this.add.circle(-7, -20, 2, 0x25304f));
    this.moonBoy.add(this.add.circle(7, -20, 2, 0x25304f));
    this.moonBoy.add(this.add.arc(0, -12, 7, 0, 180, false, 0x25304f));

    this.moonGlow = this.add.circle(m.x, m.y + this.yOffset - 2, 62, 0xf7f1c8, 0.14);
    this.moonGlow.setDepth(-1);

    this.physics.add.existing(this.moonBoy, true);
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,SPACE');

    this.touch = { left: false, right: false, jump: false, blow: false };
    this.buttons = [];

    const w = this.scale.width;
    const h = this.scale.height;
    const y = Math.max(235, h - 110);
    this.makeButton(62, y, 46, '◀', () => this.touch.left = true, () => this.touch.left = false);
    this.makeButton(155, y, 46, '▶', () => this.touch.right = true, () => this.touch.right = false);
    this.makeButton(Math.max(245, w - 158), y, 48, '⤒', () => this.touch.jump = true, () => this.touch.jump = false);
    this.makeButton(Math.max(320, w - 64), y, 48, '✿', () => this.blowFlowers());
  }

  makeButton(x, y, radius, label, down, up) {
    const circle = this.add.circle(x, y, radius, 0xffffff, 0.18).setScrollFactor(0).setInteractive();
    circle.setStrokeStyle(2, 0xffffff, 0.45);
    const text = this.add.text(x, y, label, { fontSize: '30px', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0);
    circle.on('pointerdown', down);
    circle.on('pointerup', up || (() => {}));
    circle.on('pointerout', up || (() => {}));
    this.buttons.push(circle, text);
  }

  createUI() {
    this.flowerText = this.add.text(20, 18, `Pluisbloemen: 0/${GAME_SETTINGS.flowerGoal}`, {
      fontSize: this.scale.width < 520 ? '18px' : '24px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.22)', padding: { x: 12, y: 7 }
    }).setScrollFactor(0);

    this.helpText = this.add.text(20, 55, 'Verzamel bloemen en breng ze naar de jongen op de maan', {
      fontSize: this.scale.width < 520 ? '12px' : '16px', color: '#fff6c9'
    }).setScrollFactor(0);
  }

  createCamera() {
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  createCollisions() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.softObstacles, () => this.softBounce());
    this.physics.add.overlap(this.player, this.flowers, (_, flower) => this.collectFlower(flower));
    this.physics.add.overlap(this.player, this.moonBoy, () => this.tryFinishLevel());
  }

  update() {
    if (this.levelFinished) return;

    const left = this.cursors.left.isDown || this.keys.A.isDown || this.touch.left;
    const right = this.cursors.right.isDown || this.keys.D.isDown || this.touch.right;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.touch.jump;

    if (left) {
      this.player.body.setVelocityX(-GAME_SETTINGS.playerSpeed);
      this.player.setScale(-1, 1);
    } else if (right) {
      this.player.body.setVelocityX(GAME_SETTINGS.playerSpeed);
      this.player.setScale(1, 1);
    }

    if (jump && this.player.body.blocked.down) {
      this.player.body.setVelocityY(-GAME_SETTINGS.jumpSpeed);
      this.touch.jump = false;
    }

    if (this.player.y > this.worldHeight + 120) {
      this.player.setPosition(90, 380 + this.yOffset);
      this.player.body.setVelocity(0, 0);
      this.helpText.setText('Geen probleem, we zetten je weer veilig neer.');
    }

    if (this.player.body.velocity.x !== 0 && this.player.body.blocked.down) {
      this.player.rotation = Math.sin(this.time.now / 90) * 0.035;
    } else {
      this.player.rotation = 0;
    }
  }

  collectFlower(flower) {
    if (!flower || flower.getData('collected')) return;

    // Containers do not support disableBody() reliably on iOS/Safari.
    // Disable only the Arcade body and then play the pickup tween.
    flower.setData('collected', true);
    if (flower.body) {
      flower.body.enable = false;
    }

    this.collectedFlowers += 1;
    this.flowerText.setText(`Pluisbloemen: ${this.collectedFlowers}/${GAME_SETTINGS.flowerGoal}`);

    this.tweens.add({
      targets: flower,
      y: flower.y - 45,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 450,
      ease: 'Sine.out',
      onComplete: () => flower.destroy()
    });

    if (this.collectedFlowers >= GAME_SETTINGS.flowerGoal) {
      this.canFinish = true;
      this.helpText.setText('Mooi! Breng de bloemen naar je broer op de maan');
    }
  }

  blowFlowers() {
    const facing = this.player.scaleX < 0 ? -1 : 1;
    for (let i = 0; i < 12; i++) {
      const seed = this.add.circle(this.player.x + 18 * facing, this.player.y - 22, 3, 0xffffff, 0.95);
      this.tweens.add({
        targets: seed,
        x: seed.x + facing * Phaser.Math.Between(60, 150),
        y: seed.y + Phaser.Math.Between(-35, 30),
        alpha: 0,
        duration: Phaser.Math.Between(650, 1000),
        ease: 'Sine.out',
        onComplete: () => seed.destroy()
      });
    }
  }

  softBounce() {
    if (this.player.body.velocity.y > 0) {
      this.player.body.setVelocityY(-260);
      this.helpText.setText('Zachte waterplas! Je stuitert gewoon terug.');
    }
  }

  tryFinishLevel() {
    if (this.levelFinished) return;

    if (!this.canFinish) {
      this.helpText.setText('Verzamel eerst alle pluisbloemen voor je broer.');
      return;
    }

    this.levelFinished = true;
    this.player.body.setVelocity(0, 0);
    this.player.body.enable = false;
    this.finishAnimation();
  }

  finishAnimation() {
    this.helpText.setText('Je geeft de pluisbloemen aan je broer op de maan ❤️');

    this.cameras.main.stopFollow();
    this.tweens.add({ targets: this.cameras.main, scrollX: Math.max(0, this.moonBoy.x - this.scale.width / 2), duration: 700, ease: 'Sine.inOut' });

    this.time.delayedCall(500, () => {
      for (let i = 0; i < 22; i++) {
        const petal = this.add.circle(this.player.x, this.player.y - 35, Phaser.Math.Between(3, 6), 0xffffff, 0.9);
        this.tweens.add({
          targets: petal,
          x: this.moonBoy.x + Phaser.Math.Between(-18, 18),
          y: this.moonBoy.y - 20 + Phaser.Math.Between(-18, 18),
          alpha: 0,
          duration: Phaser.Math.Between(950, 1450),
          ease: 'Sine.inOut',
          onComplete: () => petal.destroy()
        });
      }
    });

    this.time.delayedCall(1800, () => {
      this.add.text(this.cameras.main.scrollX + this.scale.width / 2, Math.max(120, this.scale.height * 0.28), 'Level gehaald!', {
        fontSize: '44px', color: '#ffffff', stroke: '#25304f', strokeThickness: 7
      }).setOrigin(0.5);
      this.add.text(this.cameras.main.scrollX + this.scale.width / 2, Math.max(170, this.scale.height * 0.28 + 55), 'De maan voelt nu een beetje dichterbij.', {
        fontSize: '22px', color: '#fff6c9', stroke: '#25304f', strokeThickness: 4
      }).setOrigin(0.5);
    });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0d1430',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GAME_SETTINGS.gravity },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  input: {
    activePointers: 4
  },
  scene: [BootScene, LevelScene]
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});

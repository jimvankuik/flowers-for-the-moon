(function(){
  const settings = window.FTTM.GameSettings;
  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#10275f',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: window.innerWidth, height: window.innerHeight },
    physics: { default: 'arcade', arcade: { gravity: { y: settings.gravityY }, debug: false } },
    scene: [window.BootScene, window.LevelScene]
  };
  window.FTTM.game = new Phaser.Game(config);
})();

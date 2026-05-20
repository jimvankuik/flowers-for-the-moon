window.addEventListener('load', function(){
  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#13285d',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: window.FTTM.GameSettings.gravityY },
        debug: false
      }
    },
    scene: [window.FTTM.LevelScene]
  };
  window.FTTM.game = new Phaser.Game(config);
});

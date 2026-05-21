(function(){
  function startGame(){
    const settings = window.FTTM.GameSettings;
    const Boot = window.BootScene || (window.FTTM && window.FTTM.BootScene);
    const Level = window.LevelScene || (window.FTTM && window.FTTM.LevelScene);
    const scenes = Boot ? [Boot, Level] : [Level];
    const config = {
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#10275f',
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: window.innerWidth, height: window.innerHeight },
      physics: { default: 'arcade', arcade: { gravity: { y: settings.gravityY }, debug: false } },
      scene: scenes
    };
    window.FTTM.game = new Phaser.Game(config);
  }
  if (window.Phaser && window.FTTM && window.FTTM.GameSettings) startGame();
  else window.addEventListener('load', startGame);
})();

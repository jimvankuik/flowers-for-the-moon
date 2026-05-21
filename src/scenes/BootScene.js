class BootScene extends Phaser.Scene {
  constructor(){ super('BootScene'); }
  create(){ this.scene.start('LevelScene'); }
}
window.FTTM = window.FTTM || {};
window.FTTM.BootScene = BootScene;
window.BootScene = BootScene;

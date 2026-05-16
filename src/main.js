(function () {
  function showError(message) {
    document.body.innerHTML = '<div style="color:white;font-family:Arial;padding:24px;line-height:1.4"><h2>Flowers to the Moon start niet</h2><p>' + message + '</p><p style="opacity:.75">Controleer of alle bestanden uit dezelfde zip zijn geüpload.</p></div>';
  }

  if (!window.Phaser) {
    showError("Phaser is niet geladen.");
    return;
  }

  if (!window.FTTM || !window.FTTM.GameSettings || !window.FTTM.Level1 || !window.FTTM.BootScene || !window.FTTM.LevelScene) {
    showError("Gamebestanden zijn niet goed geladen.");
    return;
  }

  var settings = window.FTTM.GameSettings;

  var config = {
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#071038",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: settings.baseWidth,
      height: settings.baseHeight
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: settings.gravityY },
        debug: false
      }
    },
    scene: [window.FTTM.BootScene, window.FTTM.LevelScene]
  };

  new Phaser.Game(config);
})();

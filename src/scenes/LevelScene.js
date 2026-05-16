
class LevelScene extends Phaser.Scene {
  constructor() {
    super("LevelScene");
    this.controls = { left:false,right:false,jump:false,blow:false };
    this.activeButtonPointers = {};
    this.collected = 0;
    this.totalFlowers = 0;
    this.finished = false;
  }

  create() {
    this.screenW = this.scale.width;
    this.screenH = this.scale.height;

    this.isPortrait = this.screenH >= this.screenW;
    this.worldZoom = this.isPortrait ? 0.72 : 0.92;

    // extra safe area for browser ui
    this.bottomSafe = this.isPortrait ? 220 : 120;

    this.visibleHeight = this.screenH / this.worldZoom;
    this.groundY = this.visibleHeight - this.bottomSafe;

    this.physics.world.setBounds(0,0,3100,this.visibleHeight + 300);

    this.input.addPointer(5);

    this.drawBackground();
    this.createPlatforms();
    this.createPlayer();
    this.createFlowers();
    this.createMoonGoal();
    this.createHud();
    this.createControls();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.flowers, this.collectFlower, null, this);
    this.physics.add.overlap(this.player, this.goalZone, this.finishLevel, null, this);

    this.cameras.main.setBounds(0,0,3100,this.visibleHeight);
    this.cameras.main.setZoom(this.worldZoom);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.scale.on("resize", ()=> this.scene.restart());
  }

  uiScale() {
    return 1 / this.worldZoom;
  }

  fx(v){ return v / this.worldZoom; }
  fy(v){ return v / this.worldZoom; }

  drawBackground() {
    this.add.rectangle(1550, this.visibleHeight/2, 3100, this.visibleHeight, 0x13285d);

    for(let i=0;i<140;i++){
      let s=this.add.circle(
        Phaser.Math.Between(0,3100),
        Phaser.Math.Between(10,this.groundY-120),
        Phaser.Math.FloatBetween(1,2.3),
        0xffffff,
        Phaser.Math.FloatBetween(0.2,0.8)
      );
      s.setScrollFactor(0.25);
    }

    this.add.rectangle(1550,this.groundY+70,3100,140,0x071038);
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();

    const list = [
      {x:0,y:this.groundY,w:620,h:40},
      {x:760,y:this.groundY-80,w:320,h:34},
      {x:1200,y:this.groundY-140,w:320,h:34},
      {x:1650,y:this.groundY-80,w:340,h:34},
      {x:2200,y:this.groundY,w:900,h:40}
    ];

    list.forEach(p=>{
      const r=this.add.rectangle(p.x+p.w/2,p.y+p.h/2,p.w,p.h,0x5f9567);
      r.setStrokeStyle(4,0xb6eb86);
      this.physics.add.existing(r,true);
      this.platforms.add(r);
    });
  }

  createPlayer() {
    this.player=this.add.container(120,this.groundY-70);

    this.player.add(this.add.ellipse(0,64,48,12,0x000000,0.18));
    this.player.add(this.add.ellipse(-8,-18,32,48,0xffdd54));
    this.player.add(this.add.ellipse(0,28,42,76,0xffb7d5));
    this.player.add(this.add.circle(0,-20,22,0xffe0bd));
    this.player.add(this.add.triangle(-5,-40,-22,0,16,0,-3,24,0xffdd54));
    this.player.add(this.add.circle(8,-22,2.5,0x1d2148));

    this.physics.add.existing(this.player);
    this.player.body.setSize(34,82);
    this.player.body.setOffset(-17,-42);
    this.player.body.setCollideWorldBounds(true);
  }

  createFlowers() {
    this.flowers=this.physics.add.staticGroup();

    const data=[
      [280,this.groundY-50],
      [900,this.groundY-130],
      [1360,this.groundY-190],
      [1820,this.groundY-130],
      [2460,this.groundY-50]
    ];

    this.totalFlowers=data.length;

    data.forEach(d=>{
      const f=this.add.container(d[0],d[1]);

      f.add(this.add.rectangle(0,24,4,44,0x67bf55));

      for(let i=0;i<8;i++){
        let a=(Math.PI*2/8)*i;
        f.add(this.add.circle(Math.cos(a)*10,Math.sin(a)*10,7,0xffffff));
      }

      f.add(this.add.circle(0,0,4,0xfff0b4));

      this.physics.add.existing(f,true);
      f.body.setSize(44,76);
      f.body.setOffset(-22,-20);

      this.flowers.add(f);
    });
  }

  createMoonGoal() {
    const moonX=2760;
    const moonY=150;

    this.add.circle(moonX,moonY,70,0xffefaf);
    this.add.circle(moonX-18,moonY-12,9,0xdac88a,0.3);

    const boy=this.add.container(moonX+10,moonY+18);
    boy.add(this.add.circle(0,-28,16,0xffd8b5));
    boy.add(this.add.rectangle(0,4,30,52,0x92bfff));

    this.goalZone=this.add.zone(2580,this.groundY-60,280,180);
    this.physics.add.existing(this.goalZone,true);
  }

  createHud() {
    const s=this.uiScale();

    const bg=this.add.graphics();
    bg.fillStyle(0x071038,0.55);
    bg.fillRoundedRect(this.fx(14),this.fy(18),340*s,58*s,16*s);
    bg.setScrollFactor(0);

    this.counter=this.add.text(this.fx(28),this.fy(25),"Pluisbloemen: 0/"+this.totalFlowers,{
      fontFamily:"Arial",
      fontSize:Math.round(24*s)+"px",
      fontStyle:"bold",
      color:"#ffffff"
    }).setScrollFactor(0);

    this.subtitle=this.add.text(this.fx(28),this.fy(54),"Verzamel bloemen voor je broer op de maan",{
      fontFamily:"Arial",
      fontSize:Math.round(14*s)+"px",
      color:"#ffffff"
    }).setScrollFactor(0);

    this.add.text(this.fx(14),this.fy(this.screenH-28),"v17-modern-ui",{
      fontFamily:"Arial",
      fontSize:Math.round(12*s)+"px",
      color:"#ffffff",
      alpha:0.7
    }).setScrollFactor(0);
  }

  createControls() {
    const y=this.screenH - (this.isPortrait ? 155 : 92);

    this.createModernButton(70,y,"◀","left",false);
    this.createModernButton(150,y,"▶","right",false);

    this.createModernButton(this.screenW-160,y-10,"↑","jump",true);
    this.createModernButton(this.screenW-70,y+20,"✿","blow",false,true);
  }

  createModernButton(screenX,screenY,label,key,big=false,accent=false) {
    const s=this.uiScale();

    const radius=(big ? 42 : 34) * s;

    const container=this.add.container(this.fx(screenX),this.fy(screenY));
    container.setScrollFactor(0);
    container.setDepth(300);

    const shadow=this.add.circle(0,8*s,radius+5*s,0x000000,0.22);

    const outer=this.add.circle(0,0,radius,accent ? 0x7a1431 : 0x1d2448,0.92);
    outer.setStrokeStyle(4*s,0xf0d8b8,1);

    const inner=this.add.circle(0,0,radius-7*s,accent ? 0x4f0c1e : 0x252f5e,1);

    const gloss=this.add.ellipse(0,-radius*0.38,radius*1.1,radius*0.45,0xffffff,0.08);

    const text=this.add.text(0,-1*s,label,{
      fontFamily:"Arial",
      fontStyle:"bold",
      fontSize:Math.round((big?34:28)*s)+"px",
      color:"#ffffff"
    }).setOrigin(0.5);

    container.add([shadow,outer,inner,gloss,text]);

    container.setSize(radius*2,radius*2);
    container.setInteractive();

    container.on("pointerdown",(pointer)=>{
      this.activeButtonPointers[pointer.id]=key;
      this.controls[key]=true;
      container.setScale(0.93);
      outer.setFillStyle(accent ? 0xa11f45 : 0x304089);
    });

    const release=(pointer)=>{
      if(this.activeButtonPointers[pointer.id]===key){
        delete this.activeButtonPointers[pointer.id];
        this.controls[key]=false;
        container.setScale(1);
        outer.setFillStyle(accent ? 0x7a1431 : 0x1d2448);
      }
    };

    container.on("pointerup",release);
    container.on("pointerout",release);
    container.on("pointercancel",release);
  }

  collectFlower(player,flower) {
    if(!flower.active) return;

    flower.disableBody(true,true);

    this.collected++;
    this.counter.setText("Pluisbloemen: "+this.collected+"/"+this.totalFlowers);
  }

  finishLevel() {
    if(this.finished || this.collected < this.totalFlowers) return;

    this.finished=true;

    const s=this.uiScale();

    const bg=this.add.graphics();
    bg.fillStyle(0x071038,0.88);
    bg.fillRoundedRect(this.fx(45),this.fy(110),640*s,170*s,22*s);
    bg.setScrollFactor(0);
    bg.setDepth(500);

    const title=this.add.text(this.fx(this.screenW/2),this.fy(155),"Goed gedaan Amber 🌙",{
      fontFamily:"Arial",
      fontSize:Math.round(34*s)+"px",
      fontStyle:"bold",
      color:"#ffffff"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501);

    const body=this.add.text(this.fx(this.screenW/2),this.fy(215),"Je gaf alle pluisbloemen aan je broer op de maan.",{
      fontFamily:"Arial",
      fontSize:Math.round(20*s)+"px",
      color:"#ffffff",
      align:"center"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501);
  }

  update() {
    if(this.finished) return;

    let speed=0;

    if(this.controls.left) speed=-260;
    if(this.controls.right) speed=260;

    this.player.body.setVelocityX(speed);

    if(speed<0) this.player.setScale(-1,1);
    if(speed>0) this.player.setScale(1,1);

    if(this.controls.jump && this.player.body.blocked.down){
      this.player.body.setVelocityY(-560);
    }
  }
}

window.FTTM = window.FTTM || {};
window.FTTM.LevelScene = LevelScene;

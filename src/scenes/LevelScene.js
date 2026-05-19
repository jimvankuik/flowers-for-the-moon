
class LevelScene extends Phaser.Scene {
  constructor(){super('LevelScene');this.collected=0;this.totalFlowers=0;this.finished=false;this.finishStarted=false;this.lastBlowAt=0;this.currentSpeed=0;
    this.jumpCount=0;this.maxJumps=2;this.facing=1;this.wasGrounded=false;this.walkTime=0;this.jumpWasDown=false;this.jumpLocked=false;}
  create(){this.screenW=this.scale.width;this.screenH=this.scale.height;this.isPortrait=this.screenH>=this.screenW;this.worldZoom = this.isPortrait ? 0.56 : 0.40;if(this.screenW<420&&this.isPortrait)this.worldZoom=0.54;this.visibleW=this.screenW/this.worldZoom;this.visibleH=this.screenH/this.worldZoom;this.bottomSafe = this.isPortrait ? 120 : 70;this.groundY=this.visibleH-this.bottomSafe;let s=window.FTTM.GameSettings;this.physics.world.setBounds(0,0,s.worldWidth,this.visibleH+320);if(window.FTTM.hideFinishPanel)window.FTTM.hideFinishPanel();if(window.FTTM.setFlowerCounter)window.FTTM.setFlowerCounter(0,5);this.drawBackground(s);this.createPlatforms();this.createPlayer();this.createFlowers();this.createMoonGoal(s);this.createFinishMarker();this.physics.add.collider(this.player,this.platforms);this.physics.add.overlap(this.player,this.flowers,this.collectFlower,null,this);this.physics.add.overlap(this.player,this.goalZone,this.startFinishSequence,null,this);this.cameras.main.setBounds(0,0,s.worldWidth,this.visibleH);this.cameras.main.setZoom(this.worldZoom);this.updateCamera(true);this.scale.on('resize',()=>{if(!this.finished)this.scene.restart();});}
  drawBackground(s){this.add.rectangle(s.worldWidth/2,this.visibleH/2,s.worldWidth,this.visibleH,0x13285d);for(let i=0;i<155;i++){let star=this.add.circle(Phaser.Math.Between(0,s.worldWidth),Phaser.Math.Between(12,Math.max(300,this.groundY-110)),Phaser.Math.FloatBetween(1,2.3),0xffffff,Phaser.Math.FloatBetween(.22,.78));star.setScrollFactor(.25);}for(let i=0;i<8;i++){let cloud=this.add.ellipse(Phaser.Math.Between(130,s.worldWidth-150),Phaser.Math.Between(90,Math.max(170,this.groundY-280)),Phaser.Math.Between(130,250),Phaser.Math.Between(24,50),0xffffff,.05);cloud.setScrollFactor(.18);}this.add.rectangle(s.worldWidth/2,this.groundY+75,s.worldWidth,150,0x071038);}
  createPlatforms(){this.platforms=this.physics.add.staticGroup();let gy=this.groundY;[
    {x:0,y:gy,w:700,h:42},
    {x:850,y:gy-85,w:360,h:36},
    {x:1340,y:gy-150,w:360,h:36},
    {x:1850,y:gy-90,w:380,h:36},
    {x:2460,y:gy,w:1740,h:42}
  ].forEach(p=>{let b=this.add.rectangle(p.x+p.w/2,p.y+p.h/2,p.w,p.h,0x5f9567);b.setStrokeStyle(4,0xb6eb86);this.physics.add.existing(b,true);this.platforms.add(b);let g=this.add.rectangle(p.x+p.w/2,p.y+4,p.w,7,0xd9f89b,.45);g.setDepth(2);});}

  createPlayer(){this.player=this.add.container(125,this.groundY-72);this.shadow=this.add.ellipse(0,66,50,12,0x000000,.18);this.leftFoot=this.add.ellipse(-10,62,15,7,0xf0a0c3);this.rightFoot=this.add.ellipse(10,62,15,7,0xf0a0c3);let hair=this.add.ellipse(-8,-18,32,48,0xffdd54),dress=this.add.ellipse(0,28,42,76,0xffb7d5),head=this.add.circle(0,-20,22,0xffe0bd),fringe=this.add.triangle(-5,-40,-22,0,16,0,-3,24,0xffdd54),eye=this.add.circle(8,-22,2.5,0x1d2148);this.player.add([this.shadow,this.leftFoot,this.rightFoot,hair,dress,head,fringe,eye]);this.physics.add.existing(this.player);this.player.body.setSize(34,82);this.player.body.setOffset(-17,-42);this.player.body.setCollideWorldBounds(true);}
  createFlowers(){this.flowers=this.physics.add.staticGroup();let flowers=[
    [300,this.groundY-52],
    [1010,this.groundY-137],
    [1520,this.groundY-202],
    [2040,this.groundY-142],
    [2900,this.groundY-52]
  ];this.totalFlowers=flowers.length;if(window.FTTM.setFlowerCounter)window.FTTM.setFlowerCounter(0,this.totalFlowers);flowers.forEach(d=>{let f=this.add.container(d[0],d[1]);f.add(this.add.rectangle(0,24,4,44,0x67bf55));for(let i=0;i<8;i++){let a=Math.PI*2/8*i;f.add(this.add.circle(Math.cos(a)*10,Math.sin(a)*10,7,0xffffff));}f.add(this.add.circle(0,0,4,0xfff0b4));this.physics.add.existing(f,true);f.body.setSize(44,76);f.body.setOffset(-22,-20);f.setData('collected',false);this.flowers.add(f);});}

  createMoonGoal(s){let x=3650,y=this.isPortrait?Math.max(145,this.groundY-430):Math.max(120,this.groundY-250);this.moonGroup=this.add.container(x,y).setDepth(8);let glow=this.add.circle(0,0,125,0xfff2b6,.22),moon=this.add.circle(0,0,78,0xffefaf);moon.setStrokeStyle(4,0xffffff,.72);let c1=this.add.circle(-18,-12,9,0xdac88a,.3),c2=this.add.circle(18,15,7,0xdac88a,.25),boy=this.add.container(10,18);boy.add(this.add.circle(0,-28,16,0xffd8b5));boy.add(this.add.rectangle(0,4,30,52,0x92bfff));boy.add(this.add.circle(6,-30,2.3,0x1d2148));boy.add(this.add.rectangle(-8,-42,20,9,0x6a4a32));this.moonGroup.add([glow,moon,c1,c2,boy]);}

  createFinishMarker(){this.finishMarkerX=3320;this.finishMarker=this.add.container(this.finishMarkerX,this.groundY-108).setDepth(90);let aura=this.add.circle(0,-38,38,0xfff0b4,.2),pole=this.add.rectangle(0,30,8,132,0xfff6cf,1);pole.setStrokeStyle(2,0xffdd75,1);let flag=this.add.triangle(36,-36,-2,-62,-2,-10,80,-36,0xffd85c,1);flag.setStrokeStyle(3,0xfff0a0,1);let star=this.add.text(0,-42,'✦',{fontFamily:'Arial',fontSize:'36px',fontStyle:'bold',color:'#fff8cf'}).setOrigin(.5);this.finishMarker.add([aura,pole,flag,star]);this.tweens.add({targets:flag,x:44,duration:650,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});this.goalZone=this.add.zone(this.finishMarkerX+22,this.groundY-74,150,175);this.physics.add.existing(this.goalZone,true);}
  collectFlower(p,flower){if(!flower||flower.getData('collected'))return;flower.setData('collected',true);this.collected++;if(window.FTTM.setFlowerCounter)window.FTTM.setFlowerCounter(this.collected,this.totalFlowers);if(flower.body)flower.body.enable=false;this.tweens.add({targets:flower,y:flower.y-36,alpha:0,scale:1.35,duration:260,ease:'Sine.easeOut',onComplete:function(){flower.setActive(false);flower.setVisible(false);}});}
  startFinishSequence(){if(this.finishStarted||this.collected<this.totalFlowers)return;this.finishStarted=true;this.finished=true;this.finishCameraX=this.cameras.main.scrollX;this.cameraTargetX=this.finishCameraX;this.cameras.main.stopFollow();this.cameras.main.scrollX=this.finishCameraX;this.finishCameraX=this.cameras.main.scrollX;this.cameras.main.stopFollow();this.cameras.main.scrollX=this.finishCameraX;this.player.body.setVelocity(0,0);/* v56: camera pan uitgeschakeld tijdens finish */this.time.delayedCall(420,()=>this.playFlowerGiftAnimation());}
  playFlowerGiftAnimation(){let sx=this.player.x+10,sy=this.player.y-48,tx=this.moonGroup.x+12,ty=this.moonGroup.y+20;for(let i=0;i<this.totalFlowers;i++){let f=this.add.container(sx,sy).setDepth(30);f.add(this.add.rectangle(0,18,3,28,0x67bf55));f.add(this.add.circle(0,0,8,0xffffff));f.add(this.add.circle(-6,0,6,0xffffff));f.add(this.add.circle(6,0,6,0xffffff));f.add(this.add.circle(0,-6,6,0xffffff));f.add(this.add.circle(0,6,6,0xffffff));f.add(this.add.circle(0,0,3,0xfff0b4));this.tweens.add({targets:f,x:tx+Phaser.Math.Between(-22,20),y:ty+Phaser.Math.Between(-18,18),scale:.76,duration:850,delay:i*160,ease:'Sine.easeInOut',onComplete:()=>{this.tweens.add({targets:f,alpha:0,y:f.y-16,duration:420,onComplete:()=>f.destroy()});}});}this.time.delayedCall(1300,()=>{this.showHearts();if(window.FTTM.showFinishPanel)window.FTTM.showFinishPanel();});}
  showHearts(){for(let i=0;i<24;i++){let h=this.add.text(this.moonGroup.x,this.moonGroup.y,'♡',{fontFamily:'Arial',fontSize:Phaser.Math.Between(20,38)+'px',color:'#ffd4e5'}).setOrigin(.5).setDepth(35);this.tweens.add({targets:h,x:h.x+Phaser.Math.Between(-170,170),y:h.y-Phaser.Math.Between(70,210),alpha:0,duration:Phaser.Math.Between(1000,1900),delay:i*55,onComplete:()=>h.destroy()});}}
  createBlowEffect(){let dir=this.facing;for(let i=0;i<10;i++){let seed=this.add.circle(this.player.x+dir*28,this.player.y-22,3,0xffffff,.86).setDepth(12);this.tweens.add({targets:seed,x:seed.x+dir*Phaser.Math.Between(60,135),y:seed.y+Phaser.Math.Between(-46,18),alpha:0,scale:Phaser.Math.FloatBetween(.6,1.35),duration:Phaser.Math.Between(480,760),delay:i*18,ease:'Sine.easeOut',onComplete:()=>seed.destroy()});}}
  animatePlayer(delta,onGround){let moving=Math.abs(this.currentSpeed)>18&&onGround;if(moving){this.walkTime+=delta*.012;let step=Math.sin(this.walkTime),lift=Math.abs(step);this.player.angle=Phaser.Math.Clamp(this.currentSpeed/260,-1,1)*1.5;this.leftFoot.x=-10+step*4;this.rightFoot.x=10-step*4;this.leftFoot.y=62-Math.max(0,step)*4;this.rightFoot.y=62-Math.max(0,-step)*4;this.shadow.scaleX=1+lift*.08;}else{this.player.angle=Phaser.Math.Linear(this.player.angle,0,.15);this.leftFoot.x=Phaser.Math.Linear(this.leftFoot.x,-10,.18);this.rightFoot.x=Phaser.Math.Linear(this.rightFoot.x,10,.18);this.leftFoot.y=Phaser.Math.Linear(this.leftFoot.y,62,.18);this.rightFoot.y=Phaser.Math.Linear(this.rightFoot.y,62,.18);this.shadow.scaleX=Phaser.Math.Linear(this.shadow.scaleX,1,.18);}}
  playJumpFeedback(){this.tweens.add({targets:this.player,scaleY:1.04,duration:85,yoyo:true,ease:'Sine.easeOut'});}
  playLandingFeedback(){this.cameras.main.shake(70,.002);this.tweens.add({targets:this.player,scaleY:.94,duration:75,yoyo:true,ease:'Sine.easeOut',onComplete:()=>{this.player.scaleY=1;this.player.scaleX=this.facing;}});}
  handleVariableJump(input,onGround){let s=window.FTTM.GameSettings,pressed=input.jump&&!this.jumpWasDown,released=!input.jump&&this.jumpWasDown;if(onGround){this.jumpCount=0;}if(released){this.jumpLocked=false;}if(pressed&&!this.jumpLocked){if(onGround){this.player.body.setVelocityY(s.jumpVelocity);this.jumpCount=1;this.jumpLocked=true;this.playJumpFeedback();}else if(this.jumpCount===1){this.player.body.setVelocityY(Math.min(s.jumpVelocity*.88,-500));this.jumpCount=2;this.jumpLocked=true;this.createDoubleJumpBurst();this.playJumpFeedback();}}if(released&&this.player.body.velocity.y<s.jumpCutVelocity)this.player.body.setVelocityY(s.jumpCutVelocity);this.jumpWasDown=input.jump;}
  updateCamera(initial){
    if(this.finished&&this.finishCameraX!==undefined){
      this.cameras.main.scrollX=this.finishCameraX;
      this.cameras.main.scrollY=0;
      return;
    }

    const s=window.FTTM.GameSettings;
    const max=Math.max(0,s.worldWidth-this.visibleW);
    const speed=this.currentSpeed||0;

    // v56:
    // Harde dead-zone uit v52 verwijderd, want die veroorzaakte schokken.
    // In landscape staat Amber nu bij naar rechts lopen rond 24% vanaf links,
    // met een zachte extra look-ahead voor meer zicht vooruit.
    let targetAnchor;
    if(this.isPortrait){
      if(speed<-35) targetAnchor=.52;
      else if(speed>35) targetAnchor=.16;
      else targetAnchor=.24;
    }else{
      if(speed<-35) targetAnchor=.46;
      else if(speed>35) targetAnchor=.24;
      else targetAnchor=.28;
    }

    if(this.cameraAnchor===undefined) this.cameraAnchor=targetAnchor;
    this.cameraAnchor=Phaser.Math.Linear(this.cameraAnchor,targetAnchor,this.isPortrait?.11:.09);

    let desired=this.player.x-this.visibleW*this.cameraAnchor;

    // Zachte look-ahead i.p.v. harde correctie.
    if(speed>35){
      desired+=this.isPortrait?this.visibleW*.055:this.visibleW*.065;
    }

    const wantsFinishPreview=(this.collected>=this.totalFlowers&&this.finishMarkerX);
    if(this.finishPreviewAlpha===undefined) this.finishPreviewAlpha=0;
    this.finishPreviewAlpha=Phaser.Math.Linear(this.finishPreviewAlpha,wantsFinishPreview?1:0,.016);

    if(wantsFinishPreview){
      const finishRatio=this.isPortrait?.56:.44;
      const finishX=this.finishMarkerX-this.visibleW*finishRatio;
      const blended=Phaser.Math.Linear(desired,finishX,this.finishPreviewAlpha);
      desired=Math.max(desired,blended);
    }

    desired=Phaser.Math.Clamp(desired,0,max);

    if(this.cameraTargetX===undefined||initial){
      this.cameraTargetX=desired;
      this.cameras.main.scrollX=desired;
      this.cameras.main.scrollY=0;
      return;
    }

    this.cameraTargetX=Phaser.Math.Linear(this.cameraTargetX,desired,this.isPortrait?.20:.17);
    this.cameras.main.scrollX=Phaser.Math.Linear(this.cameras.main.scrollX,this.cameraTargetX,this.isPortrait?.18:.15);
    this.cameras.main.scrollY=0;
  }

  update(time,delta){if(this.finished)return;let input=window.FTTM.InputState||{},s=window.FTTM.GameSettings,onGround=this.player.body.blocked.down,target=0;if(input.left)target-=s.playerSpeed;if(input.right)target+=s.playerSpeed;let rate=target===0?s.deceleration:s.acceleration,step=rate*(delta/1000);if(this.currentSpeed<target)this.currentSpeed=Math.min(this.currentSpeed+step,target);if(this.currentSpeed>target)this.currentSpeed=Math.max(this.currentSpeed-step,target);this.player.body.setVelocityX(this.currentSpeed);if(Math.abs(this.currentSpeed)>8){this.facing=this.currentSpeed<0?-1:1;this.player.scaleX=this.facing;}this.handleVariableJump(input,onGround);if(!this.wasGrounded&&onGround)this.playLandingFeedback();this.wasGrounded=onGround;if(input.blow&&this.time.now-this.lastBlowAt>360){this.lastBlowAt=this.time.now;this.createBlowEffect();}if(this.player.y>this.groundY+260){this.player.setPosition(125,this.groundY-72);this.player.body.setVelocity(0,0);this.currentSpeed=0;
    this.jumpCount=0;}this.animatePlayer(delta,onGround);this.updateCamera(false);}
}
window.FTTM=window.FTTM||{};window.FTTM.LevelScene=LevelScene;

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix

// v56-double-jump-fix marker

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix-levelscene

// build-marker: v56-double-jump-fix

// build-marker: v56-double-jump-fix-levelscene

// build-marker: v56-double-jump-fix-levelscene

// build-marker: v56-double-jump-fix-levelscene

// build-marker: v56-double-jump-fix-levelscene

// build-marker: v56-double-jump-fix-levelscene

// build-marker: v56-double-jump-fix-levelscene

// build-marker: v56-double-jump-fix-levelscene

// v56 double jump patch placeholder

// build-marker: v56-double-jump-fix-levelscene

// build-marker: v56-double-jump-fix-levelscene

// build-marker: v56-double-jump-fix-levelscene

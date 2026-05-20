class LevelScene extends Phaser.Scene {
  constructor(){
    super('LevelScene');
    this.collected=0; this.totalFluffs=3; this.finished=false; this.finishStarted=false;
    this.currentSpeed=0; this.jumpCount=0; this.maxJumps=2; this.facing=1; this.wasGrounded=false;
    this.walkTime=0; this.jumpWasDown=false; this.jumpLocked=false; this.lastActionAt=0;
    this.lastSafeX=125; this.lastSafeY=0;
  }

  create(){
    this.screenW=this.scale.width; this.screenH=this.scale.height;
    this.isPortrait=this.screenH>=this.screenW;
    this.worldZoom=this.isPortrait?0.56:0.40;
    if(this.screenW<420&&this.isPortrait)this.worldZoom=0.54;
    this.visibleW=this.screenW/this.worldZoom; this.visibleH=this.screenH/this.worldZoom;
    this.bottomSafe=this.isPortrait?120:70; this.groundY=this.visibleH-this.bottomSafe;
    this.lastSafeY=this.groundY-72;
    const s=window.FTTM.GameSettings;
    this.physics.world.gravity.y=s.gravityY;
    this.physics.world.setBounds(0,0,s.worldWidth,this.visibleH+360);
    if(window.FTTM.hideFinishPanel)window.FTTM.hideFinishPanel();
    if(window.FTTM.setFlowerCounter)window.FTTM.setFlowerCounter(0,this.totalFluffs);

    this.drawBackground(s);
    this.createPlatforms();
    this.createScenery();
    this.createPlayer();
    this.createMoonFluffs();
    this.createPlantCollectibles();
    this.createInteractables();
    this.createMoonGoal(s);
    this.createFinishMarker();

    this.physics.add.collider(this.player,this.platforms,this.rememberSafeSpot,null,this);
    this.physics.add.overlap(this.player,this.fluffs,this.collectFluff,null,this);
    this.physics.add.overlap(this.player,this.plants,this.collectPlant,null,this);
    this.physics.add.overlap(this.player,this.goalZone,this.startFinishSequence,null,this);

    this.cameras.main.setBounds(0,0,s.worldWidth,this.visibleH);
    this.cameras.main.setZoom(this.worldZoom);
    this.updateCamera(true);

    this.showMessage('De maan wacht op jou.');
    this.scale.on('resize',()=>{ if(!this.finished)this.scene.restart(); });
  }

  drawBackground(s){
    this.add.rectangle(s.worldWidth/2,this.visibleH/2,s.worldWidth,this.visibleH,0x192f68);
    const sky=this.add.graphics();
    sky.fillStyle(0x243c7c,0.35); sky.fillRect(0,this.groundY-430,s.worldWidth,430);
    sky.fillStyle(0xffd7a8,0.08); sky.fillRect(0,this.groundY-160,s.worldWidth,160);

    for(let i=0;i<130;i++){
      const star=this.add.circle(Phaser.Math.Between(0,s.worldWidth),Phaser.Math.Between(16,Math.max(240,this.groundY-190)),Phaser.Math.FloatBetween(0.9,2.2),0xffffff,Phaser.Math.FloatBetween(.20,.72));
      star.setScrollFactor(.22);
    }
    for(let i=0;i<14;i++){
      const cloud=this.add.ellipse(Phaser.Math.Between(80,s.worldWidth-80),Phaser.Math.Between(80,Math.max(170,this.groundY-300)),Phaser.Math.Between(120,280),Phaser.Math.Between(24,58),0xffffff,.055);
      cloud.setScrollFactor(.16);
    }
    for(let i=0;i<18;i++){
      const hill=this.add.ellipse(i*330+80,this.groundY+105,560,220,i%2?0x183f46:0x204f54,.65).setOrigin(.5);
      hill.setScrollFactor(.45);
    }
    this.add.rectangle(s.worldWidth/2,this.groundY+75,s.worldWidth,150,0x123837);

    this.distantMoon=this.add.container(4480,150).setScrollFactor(.35).setDepth(1);
    this.distantMoon.add(this.add.circle(0,0,92,0xffefb4,.22));
    this.distantMoon.add(this.add.circle(0,0,56,0xfff2bf,.9));
  }

  addPlatform(x,y,w,h=38,color=0x5f9567){
    const b=this.add.rectangle(x+w/2,y+h/2,w,h,color).setDepth(4);
    b.setStrokeStyle(4,0xb6eb86,.85);
    this.physics.add.existing(b,true); this.platforms.add(b);
    const grass=this.add.rectangle(x+w/2,y+4,w,8,0xd9f89b,.48).setDepth(5);
    for(let i=0;i<Math.floor(w/85);i++){
      this.add.circle(x+45+i*85+Phaser.Math.Between(-20,20),y-8,Phaser.Math.Between(5,11),0xffd5e8,.55).setDepth(6);
    }
    return b;
  }

  createPlatforms(){
    this.platforms=this.physics.add.staticGroup(); const gy=this.groundY;
    this.addPlatform(0,gy,720,42);
    this.addPlatform(780,gy-55,350,36);
    this.addPlatform(1180,gy-115,390,36);
    this.addPlatform(1650,gy-65,520,36);
    this.addPlatform(2250,gy-15,470,42);
    this.addPlatform(2840,gy-115,330,36);
    this.addPlatform(3270,gy-190,370,36);
    this.addPlatform(3720,gy-92,460,36);
    this.addPlatform(4320,gy-20,780,42);
    // Optional lower discovery path
    this.addPlatform(620,gy+112,430,36,0x497c5c);
    this.addPlatform(1080,gy+70,260,36,0x497c5c);
  }

  createScenery(){
    const gy=this.groundY;
    this.ambientGroup=this.add.group();
    for(let i=0;i<95;i++){
      const fluff=this.add.circle(Phaser.Math.Between(0,5100),Phaser.Math.Between(90,gy-30),Phaser.Math.FloatBetween(1.8,3.8),0xffffff,Phaser.Math.FloatBetween(.28,.76)).setDepth(7);
      fluff.baseY=fluff.y; fluff.speed=Phaser.Math.FloatBetween(.0007,.0018); fluff.drift=Phaser.Math.FloatBetween(10,32);
      this.ambientGroup.add(fluff);
    }
    for(let i=0;i<22;i++){
      const bug=this.add.text(Phaser.Math.Between(80,5000),Phaser.Math.Between(gy-240,gy-70),'✦',{fontFamily:'Arial',fontSize:Phaser.Math.Between(12,20)+'px',color:'#fff0a8'}).setDepth(8).setAlpha(.55);
      bug.baseY=bug.y; bug.speed=Phaser.Math.FloatBetween(.001,.0022); bug.drift=Phaser.Math.FloatBetween(8,28);
      this.ambientGroup.add(bug);
    }
    // Rabbits/birds as harmless world life
    this.add.text(760,gy+62,'🐇',{fontSize:'30px'}).setDepth(7);
    this.add.text(1990,gy-125,'🦋',{fontSize:'28px'}).setDepth(7);
    this.add.text(2470,gy-58,'🐞',{fontSize:'24px'}).setDepth(7);
    this.add.text(3990,gy-135,'🦋',{fontSize:'30px'}).setDepth(7);
  }

  createPlayer(){
    this.player=this.add.container(125,this.groundY-72).setDepth(20);
    this.shadow=this.add.ellipse(0,66,50,12,0x000000,.18);
    this.leftFoot=this.add.ellipse(-10,62,15,7,0xf0a0c3);
    this.rightFoot=this.add.ellipse(10,62,15,7,0xf0a0c3);
    const hair=this.add.ellipse(-8,-18,32,48,0xffdd54), dress=this.add.ellipse(0,28,42,76,0xffb7d5), head=this.add.circle(0,-20,22,0xffe0bd), fringe=this.add.triangle(-5,-40,-22,0,16,0,-3,24,0xffdd54), eye=this.add.circle(8,-22,2.5,0x1d2148);
    this.player.add([this.shadow,this.leftFoot,this.rightFoot,hair,dress,head,fringe,eye]);
    this.physics.add.existing(this.player);
    this.player.body.setSize(34,82); this.player.body.setOffset(-17,-42); this.player.body.setCollideWorldBounds(true);
  }

  createMoonFluffs(){
    this.fluffs=this.physics.add.staticGroup();
    const spots=[[1020,this.groundY-117],[2500,this.groundY-82],[3490,this.groundY-252]];
    spots.forEach((d,i)=>{
      const f=this.add.container(d[0],d[1]).setDepth(18); f.setData('collected',false);
      const glow=this.add.circle(0,0,28,0xfff0b4,.22); const core=this.add.circle(0,0,10,0xffffff,.95);
      for(let p=0;p<8;p++){ const a=Math.PI*2/8*p; f.add(this.add.circle(Math.cos(a)*13,Math.sin(a)*13,4,0xffffff,.85)); }
      f.add([glow,core]);
      this.physics.add.existing(f,true); f.body.setSize(58,58); f.body.setOffset(-29,-29); this.fluffs.add(f);
      this.tweens.add({targets:f,y:d[1]-12,duration:1200+i*170,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    });
  }

  createPlantCollectibles(){
    this.plants=this.physics.add.staticGroup();
    const plants=[
      {name:'Blauwe Regen gevonden!',x:790,y:this.groundY+72,icon:'❀',color:'#b7a8ff'},
      {name:'Blauwe Druifjes gevonden!',x:1300,y:this.groundY+30,icon:'✿',color:'#9fb7ff'},
      {name:'Stinkende Gouwe gevonden!',x:2380,y:this.groundY-75,icon:'✾',color:'#ffe66b'}
    ];
    plants.forEach(p=>{
      const t=this.add.text(p.x,p.y,p.icon,{fontFamily:'Arial',fontSize:'36px',color:p.color}).setOrigin(.5).setDepth(18);
      t.setData('collected',false); t.setData('message',p.name);
      this.physics.add.existing(t,true); t.body.setSize(46,46); t.body.setOffset(-23,-23); this.plants.add(t);
    });
  }

  createInteractables(){
    this.interactables=[];
    const gy=this.groundY;
    this.addTextSign(360,gy-116,'The moon is waiting.');
    const bench=this.add.container(905,gy+66).setDepth(12);
    bench.add(this.add.rectangle(0,0,95,14,0x8b5a3c)); bench.add(this.add.rectangle(-32,22,8,42,0x6d402c)); bench.add(this.add.rectangle(32,22,8,42,0x6d402c));
    this.interactables.push({x:905,y:gy+66,r:95,message:'De wind klinkt hier zacht.',type:'bench'});
    this.addTextSign(930,gy+8,'Ga even zitten.');

    const apple=this.add.container(1160,gy+25).setDepth(12);
    apple.add(this.add.rectangle(0,20,12,75,0x6d402c)); apple.add(this.add.circle(0,-20,45,0x386f3a)); apple.add(this.add.circle(22,-5,8,0xe94141));
    this.interactables.push({x:1160,y:gy+25,r:95,message:'Amber eet een appel. Lekker!',type:'apple'});

    this.addTextSign(1730,gy-138,'Druk op DOEN voor kleine momentjes.');
    this.interactables.push({x:1990,y:gy-126,r:90,message:'Amber doet een handstand!',type:'handstand'});

    this.windZone=this.add.zone(2580,gy-180,520,360).setDepth(1); this.physics.add.existing(this.windZone,true);
    this.windTriggered=false;
  }

  addTextSign(x,y,msg){
    const sign=this.add.container(x,y).setDepth(13);
    sign.add(this.add.rectangle(0,0,210,42,0x071038,.65).setStrokeStyle(2,0xfff0b4,.5));
    sign.add(this.add.text(0,0,msg,{fontFamily:'Arial',fontSize:'18px',color:'#fff8cf',align:'center',wordWrap:{width:190}}).setOrigin(.5));
  }

  createMoonGoal(s){
    const x=4750,y=this.isPortrait?Math.max(145,this.groundY-430):Math.max(120,this.groundY-270);
    this.moonGroup=this.add.container(x,y).setDepth(8);
    const glow=this.add.circle(0,0,135,0xfff2b6,.22), moon=this.add.circle(0,0,82,0xffefaf); moon.setStrokeStyle(4,0xffffff,.72);
    const boy=this.add.container(10,18); boy.add(this.add.circle(0,-28,16,0xffd8b5)); boy.add(this.add.rectangle(0,4,30,52,0x92bfff)); boy.add(this.add.circle(6,-30,2.3,0x1d2148)); boy.add(this.add.rectangle(-8,-42,20,9,0x6a4a32));
    this.moonGroup.add([glow,moon,this.add.circle(-18,-12,9,0xdac88a,.3),this.add.circle(18,15,7,0xdac88a,.25),boy]);
  }

  createFinishMarker(){
    this.finishMarkerX=4660;
    this.finishMarker=this.add.container(this.finishMarkerX,this.groundY-92).setDepth(16);
    this.finishMarker.add(this.add.circle(0,-38,46,0xfff0b4,.2));
    this.finishMarker.add(this.add.rectangle(0,30,8,132,0xfff6cf,1).setStrokeStyle(2,0xffdd75,1));
    this.finishMarker.add(this.add.text(0,-42,'☾',{fontFamily:'Arial',fontSize:'48px',fontStyle:'bold',color:'#fff8cf'}).setOrigin(.5));
    this.goalZone=this.add.zone(this.finishMarkerX+24,this.groundY-74,170,180); this.physics.add.existing(this.goalZone,true);
  }

  rememberSafeSpot(){
    if(this.player.body.blocked.down && this.player.y < this.groundY+130){
      this.lastSafeX=this.player.x; this.lastSafeY=this.player.y;
    }
  }

  collectFluff(player,fluff){
    if(!fluff || fluff.getData('collected'))return;
    fluff.setData('collected',true); this.collected++;
    if(window.FTTM.setFlowerCounter)window.FTTM.setFlowerCounter(this.collected,this.totalFluffs);
    if(fluff.body)fluff.body.enable=false;
    this.showMessage(this.collected===this.totalFluffs?'Alle maanpluisjes gevonden!':'Maanpluisje gevonden!');
    this.tweens.add({targets:fluff,y:fluff.y-42,alpha:0,scale:1.45,duration:310,ease:'Sine.easeOut',onComplete:()=>fluff.destroy()});
  }

  collectPlant(player,plant){
    if(!plant || plant.getData('collected'))return;
    plant.setData('collected',true); if(plant.body)plant.body.enable=false;
    this.showMessage(plant.getData('message'));
    this.tweens.add({targets:plant,y:plant.y-28,alpha:0,scale:1.25,duration:320,ease:'Sine.easeOut',onComplete:()=>plant.destroy()});
  }

  handleAction(){
    const input=window.FTTM.InputState||{};
    if(!input.blow || this.time.now-this.lastActionAt<450)return;
    this.lastActionAt=this.time.now;
    let nearest=null, best=99999;
    this.interactables.forEach(i=>{ const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,i.x,i.y); if(d<i.r&&d<best){best=d; nearest=i;} });
    if(nearest){
      this.showMessage(nearest.message);
      if(nearest.type==='handstand')this.playHandstand();
      else if(nearest.type==='bench')this.playSit();
      else if(nearest.type==='apple')this.createSparkles(this.player.x,this.player.y-30,0xfff0b4);
    }else{
      this.createBlowEffect();
    }
  }

  playSit(){ this.tweens.add({targets:this.player,scaleY:.82,y:this.player.y+12,duration:180,yoyo:true,ease:'Sine.easeInOut'}); }
  playHandstand(){ this.tweens.add({targets:this.player,angle:180,y:this.player.y-20,duration:220,yoyo:true,ease:'Sine.easeInOut'}); }

  triggerWindMoment(){
    if(this.windTriggered)return; this.windTriggered=true;
    this.showMessage('De wind draagt ze omhoog.');
    for(let i=0;i<42;i++){
      const p=this.add.circle(2360+Phaser.Math.Between(0,520),this.groundY-40+Phaser.Math.Between(0,180),Phaser.Math.FloatBetween(2,5),0xffffff,.78).setDepth(19);
      this.tweens.add({targets:p,y:p.y-Phaser.Math.Between(230,430),x:p.x+Phaser.Math.Between(-40,75),alpha:0,duration:Phaser.Math.Between(1100,1900),delay:i*18,ease:'Sine.easeOut',onComplete:()=>p.destroy()});
    }
    this.cameras.main.shake(260,.0015);
  }

  startFinishSequence(){
    if(this.finishStarted)return;
    if(this.collected<this.totalFluffs){ this.showMessage('Zoek eerst alle maanpluisjes.'); return; }
    this.finishStarted=true; this.finished=true; this.player.body.setVelocity(0,0);
    this.showMessage('Een stukje dichter bij de maan.');
    this.time.delayedCall(500,()=>this.playFluffGiftAnimation());
  }

  playFluffGiftAnimation(){
    for(let i=0;i<this.totalFluffs;i++){
      const f=this.add.circle(this.player.x,this.player.y-44,9,0xffffff,.95).setDepth(30);
      this.tweens.add({targets:f,x:this.moonGroup.x+Phaser.Math.Between(-24,24),y:this.moonGroup.y+Phaser.Math.Between(-22,28),scale:.7,duration:950,delay:i*170,ease:'Sine.easeInOut',onComplete:()=>{this.tweens.add({targets:f,alpha:0,y:f.y-18,duration:420,onComplete:()=>f.destroy()});}});
    }
    this.time.delayedCall(1350,()=>{this.showHearts(); if(window.FTTM.showFinishPanel)window.FTTM.showFinishPanel();});
  }

  showHearts(){
    for(let i=0;i<24;i++){
      const h=this.add.text(this.moonGroup.x,this.moonGroup.y,'♡',{fontFamily:'Arial',fontSize:Phaser.Math.Between(20,38)+'px',color:'#ffd4e5'}).setOrigin(.5).setDepth(35);
      this.tweens.add({targets:h,x:h.x+Phaser.Math.Between(-170,170),y:h.y-Phaser.Math.Between(70,210),alpha:0,duration:Phaser.Math.Between(1000,1900),delay:i*55,onComplete:()=>h.destroy()});
    }
  }

  showMessage(text){ if(window.FTTM.showMessage)window.FTTM.showMessage(text); }
  createSparkles(x,y,color=0xffffff){ for(let i=0;i<12;i++){ const s=this.add.circle(x,y,3,color,.9).setDepth(28); this.tweens.add({targets:s,x:x+Phaser.Math.Between(-60,60),y:y+Phaser.Math.Between(-70,35),alpha:0,duration:Phaser.Math.Between(450,850),onComplete:()=>s.destroy()}); } }
  createBlowEffect(){ let dir=this.facing; for(let i=0;i<10;i++){ let seed=this.add.circle(this.player.x+dir*28,this.player.y-22,3,0xffffff,.86).setDepth(12); this.tweens.add({targets:seed,x:seed.x+dir*Phaser.Math.Between(60,135),y:seed.y+Phaser.Math.Between(-46,18),alpha:0,scale:Phaser.Math.FloatBetween(.6,1.35),duration:Phaser.Math.Between(480,760),delay:i*18,ease:'Sine.easeOut',onComplete:()=>seed.destroy()}); } }

  animatePlayer(delta,onGround){
    let moving=Math.abs(this.currentSpeed)>18&&onGround;
    if(moving){this.walkTime+=delta*.012;let step=Math.sin(this.walkTime),lift=Math.abs(step);this.player.angle=Phaser.Math.Clamp(this.currentSpeed/260,-1,1)*1.5;this.leftFoot.x=-10+step*4;this.rightFoot.x=10-step*4;this.leftFoot.y=62-Math.max(0,step)*4;this.rightFoot.y=62-Math.max(0,-step)*4;this.shadow.scaleX=1+lift*.08;}
    else{this.player.angle=Phaser.Math.Linear(this.player.angle,0,.15);this.leftFoot.x=Phaser.Math.Linear(this.leftFoot.x,-10,.18);this.rightFoot.x=Phaser.Math.Linear(this.rightFoot.x,10,.18);this.leftFoot.y=Phaser.Math.Linear(this.leftFoot.y,62,.18);this.rightFoot.y=Phaser.Math.Linear(this.rightFoot.y,62,.18);this.shadow.scaleX=Phaser.Math.Linear(this.shadow.scaleX,1,.18);}
  }

  playJumpFeedback(){this.tweens.add({targets:this.player,scaleY:1.04,duration:85,yoyo:true,ease:'Sine.easeOut'});}
  playLandingFeedback(){this.cameras.main.shake(70,.002);this.tweens.add({targets:this.player,scaleY:.94,duration:75,yoyo:true,ease:'Sine.easeOut',onComplete:()=>{this.player.scaleY=1;this.player.scaleX=this.facing;}});}

  handleVariableJump(input,onGround){
    const s=window.FTTM.GameSettings, pressed=input.jump&&!this.jumpWasDown, released=!input.jump&&this.jumpWasDown;
    if(onGround)this.jumpCount=0; if(released)this.jumpLocked=false;
    if(pressed&&!this.jumpLocked){
      if(onGround){this.player.body.setVelocityY(s.jumpVelocity);this.jumpCount=1;this.jumpLocked=true;this.playJumpFeedback();}
      else if(this.jumpCount===1){this.player.body.setVelocityY(-560);this.jumpCount=2;this.jumpLocked=true;this.createDoubleJumpBurst();this.playJumpFeedback();}
    }
    if(released&&this.player.body.velocity.y<s.jumpCutVelocity)this.player.body.setVelocityY(s.jumpCutVelocity);
    this.jumpWasDown=input.jump;
  }

  createDoubleJumpBurst(){
    const x=this.player.x,y=this.player.y+38;
    for(let i=0;i<8;i++){const p=this.add.circle(x,y,4,0xfff4c8,.85).setDepth(13);this.tweens.add({targets:p,x:x+Phaser.Math.Between(-70,70),y:y+Phaser.Math.Between(-35,45),alpha:0,duration:420,onComplete:()=>p.destroy()});}
  }

  updateCamera(initial=false){
    const max=window.FTTM.GameSettings.worldWidth-this.visibleW; let speed=this.currentSpeed; let targetAnchor=this.isPortrait?.24:.20;
    if(speed<-35)targetAnchor=this.isPortrait?.52:.46; else if(speed>35)targetAnchor=this.isPortrait?.16:.24;
    if(this.cameraAnchor===undefined)this.cameraAnchor=targetAnchor; this.cameraAnchor=Phaser.Math.Linear(this.cameraAnchor,targetAnchor,this.isPortrait?.11:.09);
    let desired=this.player.x-this.visibleW*this.cameraAnchor;
    if(speed>35)desired+=this.isPortrait?this.visibleW*.055:this.visibleW*.065;
    desired=Phaser.Math.Clamp(desired,0,max);
    if(initial||this.cameraTargetX===undefined){this.cameraTargetX=desired;this.cameras.main.scrollX=desired;this.cameras.main.scrollY=0;return;}
    this.cameraTargetX=Phaser.Math.Linear(this.cameraTargetX,desired,this.isPortrait?.20:.17);
    this.cameras.main.scrollX=Phaser.Math.Linear(this.cameras.main.scrollX,this.cameraTargetX,this.isPortrait?.18:.15); this.cameras.main.scrollY=0;
  }

  updateAmbient(time){
    this.ambientGroup.children.each(o=>{ if(!o.active)return; o.y=o.baseY+Math.sin(time*o.speed+o.x*.01)*o.drift; o.x+=Math.sin(time*.00025+o.y*.01)*.12; });
  }

  update(time,delta){
    if(this.finished){this.updateAmbient(time);return;}
    const input=window.FTTM.InputState||{}, s=window.FTTM.GameSettings, onGround=this.player.body.blocked.down;
    let target=0; if(input.left)target-=s.playerSpeed; if(input.right)target+=s.playerSpeed;
    const rate=target===0?s.deceleration:s.acceleration, step=rate*(delta/1000);
    if(this.currentSpeed<target)this.currentSpeed=Math.min(this.currentSpeed+step,target); if(this.currentSpeed>target)this.currentSpeed=Math.max(this.currentSpeed-step,target);
    this.player.body.setVelocityX(this.currentSpeed);
    if(Math.abs(this.currentSpeed)>8){this.facing=this.currentSpeed<0?-1:1;this.player.scaleX=this.facing;}
    this.handleVariableJump(input,onGround); this.handleAction();
    if(!this.wasGrounded&&onGround)this.playLandingFeedback(); this.wasGrounded=onGround;
    if(this.player.x>2320&&this.player.x<2850&&this.player.y<this.groundY+20)this.triggerWindMoment();
    if(this.player.y>this.groundY+260){this.player.setPosition(this.lastSafeX,this.lastSafeY);this.player.body.setVelocity(0,0);this.currentSpeed=0;this.jumpCount=0;this.showMessage('Geen zorgen. Probeer het nog eens.');}
    this.animatePlayer(delta,onGround); this.updateCamera(false); this.updateAmbient(time);
  }
}
window.FTTM=window.FTTM||{}; window.FTTM.LevelScene=LevelScene;

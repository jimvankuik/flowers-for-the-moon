class LevelScene extends Phaser.Scene {
  constructor(){
    super('LevelScene');
    this.collected=0; this.totalFluffs=3; this.finished=false; this.finishStarted=false;
    this.lastBlowAt=0; this.currentSpeed=0; this.jumpCount=0; this.maxJumps=2;
    this.facing=1; this.wasGrounded=false; this.walkTime=0; this.jumpWasDown=false; this.jumpLocked=false;
    this.lastSafe={x:125,y:0}; this.interactionZones=[];
  }

  create(){
    this.screenW=this.scale.width; this.screenH=this.scale.height; this.isPortrait=this.screenH>=this.screenW;
    // Proven v57 scaling: this is the important part that makes the world visible on mobile landscape.
    this.worldZoom = this.isPortrait ? 0.56 : 0.40;
    if(this.screenW<420&&this.isPortrait) this.worldZoom=0.54;
    this.visibleW=this.screenW/this.worldZoom;
    this.visibleH=this.screenH/this.worldZoom;
    this.bottomSafe=this.isPortrait?120:70;
    this.groundY=this.visibleH-this.bottomSafe;

    const s=window.FTTM.GameSettings;
    this.physics.world.setBounds(0,0,s.worldWidth,this.visibleH+360);
    if(window.FTTM.hideFinishPanel) window.FTTM.hideFinishPanel();
    if(window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(0,this.totalFluffs);

    this.platforms=this.physics.add.staticGroup();
    this.fluffs=this.physics.add.staticGroup();
    this.plants=this.physics.add.staticGroup();

    this.drawBackground(s);
    this.createFluisterveldenLayout();
    this.createAtmosphere();
    this.createPlayer();
    this.createMoonFluffs();
    this.createPlantCollectibles();
    this.createInteractions();
    this.createMoonGoal(s);
    this.createFinishArch();

    this.physics.add.collider(this.player,this.platforms,()=>this.updateSafePoint());
    this.physics.add.overlap(this.player,this.fluffs,this.collectFluff,null,this);
    this.physics.add.overlap(this.player,this.plants,this.collectPlant,null,this);
    this.physics.add.overlap(this.player,this.goalZone,this.tryFinish,null,this);

    this.cameras.main.setBounds(0,0,s.worldWidth,this.visibleH);
    this.cameras.main.setZoom(this.worldZoom);
    this.updateCamera(true);
    this.showLine('The moon is waiting.',2600);
    this.scale.on('resize',()=>{ if(!this.finished) this.scene.restart(); });
  }

  drawBackground(s){
    this.add.rectangle(s.worldWidth/2,this.visibleH/2,s.worldWidth,this.visibleH,0x13285d).setDepth(-100);
    this.add.rectangle(s.worldWidth/2,this.groundY+90,s.worldWidth,210,0x071038,.65).setDepth(-90);
    for(let i=0;i<170;i++){
      const star=this.add.circle(Phaser.Math.Between(0,s.worldWidth),Phaser.Math.Between(12,Math.max(260,this.groundY-120)),Phaser.Math.FloatBetween(1,2.4),0xffffff,Phaser.Math.FloatBetween(.20,.72)).setDepth(-95);
      star.setScrollFactor(.25);
    }
    for(let i=0;i<10;i++){
      const cloud=this.add.ellipse(Phaser.Math.Between(130,s.worldWidth-150),Phaser.Math.Between(90,Math.max(170,this.groundY-280)),Phaser.Math.Between(150,290),Phaser.Math.Between(26,58),0xffffff,.055).setDepth(-94);
      cloud.setScrollFactor(.18);
    }
  }

  addPlatform(x,y,w,h,color=0x5f9567){
    const b=this.add.rectangle(x+w/2,y+h/2,w,h,color).setDepth(2);
    b.setStrokeStyle(4,0xb6eb86,.9);
    this.physics.add.existing(b,true); this.platforms.add(b);
    this.add.rectangle(x+w/2,y+4,w,8,0xd9f89b,.48).setDepth(3);
    return b;
  }
  addHill(x,y,w,h,color=0x365f4d,alpha=.55){
    return this.add.ellipse(x+w/2,y+h/2,w,h,color,alpha).setDepth(0);
  }

  createFluisterveldenLayout(){
    const gy=this.groundY;
    // 1. Opening field — warm, safe, instantly readable.
    this.addHill(-220,gy-20,1100,210,0x426b55,.62);
    this.addPlatform(-120,gy,860,42);

    // 2. Gentle movement / eerste kleine flow.
    this.addHill(650,gy-5,760,170,0x3f6f56,.58);
    this.addPlatform(850,gy-80,360,36);
    this.addPlatform(1320,gy-138,390,36);

    // 3. Optional lower discovery route: cozy bench + apple.
    this.addHill(1010,gy+115,720,160,0x335c49,.55);
    this.addPlatform(1040,gy+86,520,38,0x4b7f5a);

    // 4. Wind reveal plateau — broad and safe.
    this.addHill(1780,gy-35,1050,210,0x42735b,.58);
    this.addPlatform(1900,gy-65,860,40);

    // 5. Friendly airy movement section, no precision stress.
    this.addPlatform(3060,gy-116,360,36);
    this.addPlatform(3540,gy-170,370,36);
    this.addPlatform(4020,gy-126,410,36);

    // 6. Calm rest clearing.
    this.addHill(4400,gy-20,850,190,0x426f58,.58);
    this.addPlatform(4520,gy-52,720,42);

    // 7. Soft final hill / moon reveal.
    this.addHill(5080,gy-110,760,300,0x4c7e5e,.62);
    this.addPlatform(5120,gy-138,600,42);

    this.lastSafe={x:125,y:gy-72};
  }

  createAtmosphere(){
    const gy=this.groundY, s=window.FTTM.GameSettings;
    for(let i=0;i<170;i++){
      const x=Phaser.Math.Between(0,s.worldWidth), y=gy-Phaser.Math.Between(-8,66);
      const stem=this.add.rectangle(x,y+14,3,Phaser.Math.Between(18,38),0x77bd62,Phaser.Math.FloatBetween(.45,.78)).setDepth(4);
      const bloomColor=Phaser.Math.RND.pick([0xffd0eb,0xffffff,0xc7d8ff,0xf7f3a8,0xd9b6ff]);
      const bloom=this.add.circle(x,y,Phaser.Math.Between(3,7),bloomColor,Phaser.Math.FloatBetween(.58,.95)).setDepth(5);
      this.tweens.add({targets:[stem,bloom],angle:Phaser.Math.FloatBetween(-3,3),duration:Phaser.Math.Between(1600,3400),yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    }
    for(let i=0;i<55;i++){
      const p=this.add.circle(Phaser.Math.Between(0,s.worldWidth),Phaser.Math.Between(100,gy-30),Phaser.Math.FloatBetween(1.5,3.8),0xffffff,Phaser.Math.FloatBetween(.18,.50)).setDepth(10);
      this.tweens.add({targets:p,x:p.x+Phaser.Math.Between(-55,85),y:p.y-Phaser.Math.Between(20,110),alpha:Phaser.Math.FloatBetween(.06,.26),duration:Phaser.Math.Between(4500,9200),yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    }
    // Wind reveal column.
    for(let i=0;i<30;i++){
      const p=this.add.circle(Phaser.Math.Between(2020,2660),Phaser.Math.Between(gy-250,gy-78),Phaser.Math.FloatBetween(2,5),0xffffff,Phaser.Math.FloatBetween(.18,.48)).setDepth(12);
      this.tweens.add({targets:p,y:p.y-Phaser.Math.Between(120,250),x:p.x+Phaser.Math.Between(25,90),alpha:0,duration:Phaser.Math.Between(1800,3600),delay:Phaser.Math.Between(0,1400),repeat:-1,ease:'Sine.easeOut'});
    }
    for(let i=0;i<10;i++) this.createButterfly(Phaser.Math.Between(250,5000),Phaser.Math.Between(gy-190,gy-70));
  }

  createButterfly(x,y){
    const b=this.add.container(x,y).setDepth(14);
    const l=this.add.ellipse(-4,0,9,14,0xffc4e2,.78), r=this.add.ellipse(4,0,9,14,0xc8d5ff,.78), body=this.add.rectangle(0,2,2,12,0x44354d,.5);
    b.add([l,r,body]);
    this.tweens.add({targets:b,x:x+Phaser.Math.Between(-80,90),y:y+Phaser.Math.Between(-35,35),duration:Phaser.Math.Between(2800,5400),yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.tweens.add({targets:[l,r],scaleX:.45,duration:180,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  }

  createPlayer(){
    this.player=this.add.container(125,this.groundY-72).setDepth(50);
    this.shadow=this.add.ellipse(0,66,50,12,0x000000,.18); this.leftFoot=this.add.ellipse(-10,62,15,7,0xf0a0c3); this.rightFoot=this.add.ellipse(10,62,15,7,0xf0a0c3);
    const hair=this.add.ellipse(-8,-18,32,48,0xffdd54), dress=this.add.ellipse(0,28,42,76,0xffb7d5), head=this.add.circle(0,-20,22,0xffe0bd), fringe=this.add.triangle(-5,-40,-22,0,16,0,-3,24,0xffdd54), eye=this.add.circle(8,-22,2.5,0x1d2148);
    this.player.add([this.shadow,this.leftFoot,this.rightFoot,hair,dress,head,fringe,eye]);
    this.physics.add.existing(this.player); this.player.body.setSize(34,82); this.player.body.setOffset(-17,-42); this.player.body.setCollideWorldBounds(false);
  }

  createMoonFluffs(){
    const gy=this.groundY; const data=[[330,gy-60,'Een zacht pluisje.'],[2330,gy-185,'De wind draagt het omhoog.'],[5320,gy-235,'Nog één voor de maan.']];
    data.forEach((d,idx)=>{
      const f=this.add.container(d[0],d[1]).setDepth(30); f.setData('collected',false); f.setData('hint',d[2]);
      f.add(this.add.circle(0,0,28,0xfff2b6,.20)); f.add(this.add.circle(0,0,10,0xffffff,.95));
      for(let i=0;i<8;i++){const a=Math.PI*2*i/8; f.add(this.add.circle(Math.cos(a)*12,Math.sin(a)*12,4,0xffffff,.74));}
      this.physics.add.existing(f,true); f.body.setSize(58,58); f.body.setOffset(-29,-29); this.fluffs.add(f);
      this.tweens.add({targets:f,y:d[1]-12,duration:1200+idx*180,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    });
  }

  createPlantCollectibles(){
    const gy=this.groundY; const plants=[[1190,gy+45,'Blauwe Druifjes gevonden!'],[1515,gy-180,'Blauwe Regen gevonden!'],[4680,gy-98,'Stinkende Gouwe gevonden!']];
    plants.forEach(d=>{
      const p=this.add.container(d[0],d[1]).setDepth(25); p.setData('name',d[2]); p.setData('collected',false);
      p.add(this.add.rectangle(0,16,4,34,0x5caf57)); p.add(this.add.circle(-8,0,6,0x789cff,.85)); p.add(this.add.circle(0,-4,7,0x789cff,.9)); p.add(this.add.circle(8,0,6,0x789cff,.85));
      this.physics.add.existing(p,true); p.body.setSize(50,60); p.body.setOffset(-25,-28); this.plants.add(p);
    });
  }

  createInteractions(){
    const gy=this.groundY;
    this.createBench(1320,gy+42); this.createAppleTree(1465,gy+42);
    this.createStump(4745,gy-104); this.createDreamFlower(4980,gy-98);
  }
  addInteractionZone(x,y,w,h,type,text){ const z=this.add.zone(x,y,w,h); this.physics.add.existing(z,true); z.setData('type',type); z.setData('text',text); this.interactionZones.push(z); return z; }
  createBench(x,y){ const c=this.add.container(x,y).setDepth(18); c.add(this.add.rectangle(0,0,92,12,0x8b623d)); c.add(this.add.rectangle(-32,22,10,44,0x6e4b31)); c.add(this.add.rectangle(32,22,10,44,0x6e4b31)); c.add(this.add.rectangle(0,-18,82,10,0x9a7048)); this.addInteractionZone(x,y-22,150,100,'bench','The wind sounds soft here.'); }
  createAppleTree(x,y){ const c=this.add.container(x,y-48).setDepth(17); c.add(this.add.rectangle(0,54,24,96,0x744b2b)); c.add(this.add.circle(0,0,60,0x4f8a4f,.95)); c.add(this.add.circle(-40,18,42,0x5c9b58,.95)); c.add(this.add.circle(42,20,45,0x5c9b58,.95)); for(let i=0;i<5;i++) c.add(this.add.circle(Phaser.Math.Between(-48,48),Phaser.Math.Between(-24,34),7,0xff6f6f)); this.addInteractionZone(x,y-50,150,150,'apple','Amber eet een appel. Lekker zoet.'); }
  createStump(x,y){ const c=this.add.container(x,y+20).setDepth(18); c.add(this.add.ellipse(0,-16,64,26,0xb5814d)); c.add(this.add.rectangle(0,10,56,52,0x8f643d)); c.add(this.add.ellipse(0,36,56,18,0x6d472d)); this.addInteractionZone(x,y,140,120,'handstand','Amber doet een handstand!'); }
  createDreamFlower(x,y){ const c=this.add.container(x,y).setDepth(20); c.add(this.add.rectangle(0,24,5,48,0x67bf55)); for(let i=0;i<9;i++){const a=Math.PI*2*i/9; c.add(this.add.circle(Math.cos(a)*15,Math.sin(a)*15,8,0xd9c8ff,.86));} c.add(this.add.circle(0,0,8,0xfff3b9)); this.tweens.add({targets:c,scale:1.08,duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}); this.addInteractionZone(x,y,120,120,'flower','Some flowers still dream.'); }

  createMoonGoal(s){
    const x=5050, y=this.isPortrait?Math.max(145,this.groundY-430):Math.max(120,this.groundY-285);
    this.moonGroup=this.add.container(x,y).setDepth(8);
    const glow=this.add.circle(0,0,130,0xfff2b6,.22), moon=this.add.circle(0,0,80,0xffefaf); moon.setStrokeStyle(4,0xffffff,.72);
    const boy=this.add.container(10,20); boy.add(this.add.circle(0,-28,16,0xffd8b5)); boy.add(this.add.rectangle(0,4,30,52,0x92bfff)); boy.add(this.add.circle(6,-30,2.3,0x1d2148)); boy.add(this.add.rectangle(-8,-42,20,9,0x6a4a32));
    this.moonGroup.add([glow,moon,this.add.circle(-18,-12,9,0xdac88a,.3),this.add.circle(18,15,7,0xdac88a,.25),boy]);
  }
  createFinishArch(){
    const gy=this.groundY; this.finishMarkerX=5240;
    const arch=this.add.container(this.finishMarkerX,gy-128).setDepth(22);
    arch.add(this.add.circle(0,-62,72,0xfff0bb,.16)); arch.add(this.add.rectangle(-48,25,14,165,0xb8d47a,.72)); arch.add(this.add.rectangle(48,25,14,165,0xb8d47a,.72)); arch.add(this.add.ellipse(0,-64,128,48,0xf2d8ff,.45)); arch.add(this.add.text(0,-68,'✦',{fontFamily:'Arial',fontSize:'44px',color:'#fff6c7'}).setOrigin(.5));
    this.goalZone=this.add.zone(this.finishMarkerX,gy-95,220,220); this.physics.add.existing(this.goalZone,true);
  }

  collectFluff(p,fluff){
    if(!fluff||fluff.getData('collected')) return; fluff.setData('collected',true); if(fluff.body) fluff.body.enable=false; this.collected++;
    if(window.FTTM.setFlowerCounter) window.FTTM.setFlowerCounter(this.collected,this.totalFluffs); this.showLine(fluff.getData('hint')||'Maanpluis gevonden!',1800);
    this.tweens.add({targets:fluff,y:fluff.y-42,alpha:0,scale:1.45,duration:420,ease:'Sine.easeOut',onComplete:()=>fluff.destroy()});
    for(let i=0;i<12;i++) this.sparkle(fluff.x,fluff.y,0xfff4c2);
  }
  collectPlant(p,plant){ if(!plant||plant.getData('collected')) return; plant.setData('collected',true); if(plant.body) plant.body.enable=false; this.showLine(plant.getData('name'),2100); this.tweens.add({targets:plant,scale:1.18,yoyo:true,duration:120,repeat:1,onComplete:()=>{plant.alpha=.55;}}); }
  tryFinish(){
    if(this.finishStarted) return;
    if(this.collected<this.totalFluffs){ this.showLine('Zoek eerst alle 3 maanpluisjes.',2100); return; }
    this.finishStarted=true; this.finished=true; this.player.body.setVelocity(0,0); this.showLine('A little closer to the moon.',2600);
    const sx=this.player.x+10, sy=this.player.y-48, tx=this.moonGroup.x+12, ty=this.moonGroup.y+20;
    for(let i=0;i<24;i++){const p=this.add.circle(sx,sy,Phaser.Math.FloatBetween(2,5),0xffffff,.9).setDepth(80); this.tweens.add({targets:p,x:tx+Phaser.Math.Between(-35,35),y:ty+Phaser.Math.Between(-35,35),alpha:0,duration:Phaser.Math.Between(900,1600),delay:i*45,ease:'Sine.easeInOut',onComplete:()=>p.destroy()});}
    this.time.delayedCall(1500,()=>{ if(window.FTTM.showFinishPanel) window.FTTM.showFinishPanel(); });
  }
  sparkle(x,y,color){ const p=this.add.circle(x,y,Phaser.Math.FloatBetween(2,4),color,.9).setDepth(90); this.tweens.add({targets:p,x:x+Phaser.Math.Between(-48,48),y:y+Phaser.Math.Between(-55,25),alpha:0,scale:.2,duration:Phaser.Math.Between(480,850),ease:'Sine.easeOut',onComplete:()=>p.destroy()}); }
  showLine(text,ms){ if(window.FTTM.showMessage) window.FTTM.showMessage(text,ms||2400); }
  updateSafePoint(){ if(this.player&&this.player.body&&this.player.body.blocked.down) this.lastSafe={x:this.player.x,y:this.player.y}; }

  nearestInteraction(){ let best=null,bestDist=999999; for(const z of this.interactionZones){const dx=Math.abs(z.x-this.player.x), dy=Math.abs(z.y-this.player.y); if(dx<95&&dy<105){const d=dx+dy; if(d<bestDist){best=z; bestDist=d;}}} return best; }
  runInteraction(z){ const type=z.getData('type'), text=z.getData('text'); this.showLine(text,2300); if(type==='bench'){this.player.body.setVelocity(0,0); this.tweens.add({targets:this.player,scaleY:.86,y:this.player.y+10,duration:180,yoyo:true,hold:520,ease:'Sine.easeInOut'});} else if(type==='apple'){const apple=this.add.circle(this.player.x+24*this.facing,this.player.y-45,7,0xff6f6f).setDepth(95); this.tweens.add({targets:apple,x:this.player.x+5,y:this.player.y-22,scale:.25,alpha:0,duration:520,ease:'Sine.easeIn',onComplete:()=>apple.destroy()});} else if(type==='handstand'){this.tweens.add({targets:this.player,angle:360*this.facing,duration:650,ease:'Sine.easeInOut',onComplete:()=>{this.player.angle=0;}});} else if(type==='flower'){for(let i=0;i<18;i++) this.sparkle(z.x,z.y,0xdac8ff);} }

  createBlowEffect(){ const dir=this.facing; for(let i=0;i<10;i++){const seed=this.add.circle(this.player.x+dir*28,this.player.y-22,3,0xffffff,.86).setDepth(85); this.tweens.add({targets:seed,x:seed.x+dir*Phaser.Math.Between(60,135),y:seed.y+Phaser.Math.Between(-46,18),alpha:0,scale:Phaser.Math.FloatBetween(.6,1.35),duration:Phaser.Math.Between(480,760),delay:i*18,ease:'Sine.easeOut',onComplete:()=>seed.destroy()});} }
  createDoubleJumpBurst(){ const x=this.player.x,y=this.player.y+38; for(let i=0;i<7;i++){const p=this.add.circle(x,y,3,0xffffff,.78).setDepth(40); this.tweens.add({targets:p,x:x+Phaser.Math.Between(-38,38),y:y+Phaser.Math.Between(8,42),alpha:0,scale:.2,duration:260,ease:'Sine.easeOut',onComplete:()=>p.destroy()});} }
  playJumpFeedback(){ this.tweens.add({targets:this.player,scaleY:1.04,duration:85,yoyo:true,ease:'Sine.easeOut'}); }
  playLandingFeedback(){ this.cameras.main.shake(70,.002); this.tweens.add({targets:this.player,scaleY:.94,duration:75,yoyo:true,ease:'Sine.easeOut',onComplete:()=>{this.player.scaleY=1;this.player.scaleX=this.facing;}}); }
  animatePlayer(delta,onGround){ const moving=Math.abs(this.currentSpeed)>18&&onGround; if(moving){this.walkTime+=delta*.012; const step=Math.sin(this.walkTime), lift=Math.abs(step); this.player.angle=Phaser.Math.Clamp(this.currentSpeed/260,-1,1)*1.5; this.leftFoot.x=-10+step*4; this.rightFoot.x=10-step*4; this.leftFoot.y=62-Math.max(0,step)*4; this.rightFoot.y=62-Math.max(0,-step)*4; this.shadow.scaleX=1+lift*.08;} else {this.player.angle=Phaser.Math.Linear(this.player.angle,0,.15); this.leftFoot.x=Phaser.Math.Linear(this.leftFoot.x,-10,.18); this.rightFoot.x=Phaser.Math.Linear(this.rightFoot.x,10,.18); this.leftFoot.y=Phaser.Math.Linear(this.leftFoot.y,62,.18); this.rightFoot.y=Phaser.Math.Linear(this.rightFoot.y,62,.18); this.shadow.scaleX=Phaser.Math.Linear(this.shadow.scaleX,1,.18);} }

  updateCamera(initial){
    if(this.finished) return;
    const s=window.FTTM.GameSettings, max=Math.max(0,s.worldWidth-this.visibleW), speed=this.currentSpeed||0;
    let targetAnchor=this.isPortrait?.24:.28; if(speed>35) targetAnchor=this.isPortrait?.16:.24; if(speed<-35) targetAnchor=this.isPortrait?.52:.46;
    if(this.player.x>1900&&this.player.x<2800) targetAnchor=this.isPortrait?.18:.21;
    if(this.player.x>5000) targetAnchor=this.isPortrait?.20:.23;
    if(this.cameraAnchor===undefined) this.cameraAnchor=targetAnchor;
    this.cameraAnchor=Phaser.Math.Linear(this.cameraAnchor,targetAnchor,this.isPortrait?.11:.09);
    let desired=this.player.x-this.visibleW*this.cameraAnchor;
    if(speed>35) desired+=this.isPortrait?this.visibleW*.055:this.visibleW*.065;
    desired=Phaser.Math.Clamp(desired,0,max);
    if(this.cameraTargetX===undefined||initial){this.cameraTargetX=desired; this.cameras.main.scrollX=desired; this.cameras.main.scrollY=0; return;}
    this.cameraTargetX=Phaser.Math.Linear(this.cameraTargetX,desired,this.isPortrait?.20:.17);
    this.cameras.main.scrollX=Phaser.Math.Linear(this.cameras.main.scrollX,this.cameraTargetX,this.isPortrait?.18:.15);
    this.cameras.main.scrollY=0;
  }

  update(time,delta){
    if(!this.player||!this.player.body) return;
    if(this.finished){ this.player.body.setVelocity(0,0); return; }
    const input=window.FTTM.InputState||{}, s=window.FTTM.GameSettings, onGround=this.player.body.blocked.down;
    let target=0; if(input.left) target-=s.playerSpeed; if(input.right) target+=s.playerSpeed;
    const rate=target===0?s.deceleration:s.acceleration, step=rate*(delta/1000);
    if(this.currentSpeed<target) this.currentSpeed=Math.min(this.currentSpeed+step,target);
    if(this.currentSpeed>target) this.currentSpeed=Math.max(this.currentSpeed-step,target);
    this.player.body.setVelocityX(this.currentSpeed);
    if(Math.abs(this.currentSpeed)>8){this.facing=this.currentSpeed<0?-1:1; this.player.scaleX=this.facing;}

    if(onGround) this.jumpCount=0;
    const pressed=input.jump&&!this.jumpWasDown, released=!input.jump&&this.jumpWasDown;
    if(released) this.jumpLocked=false;
    if(pressed&&!this.jumpLocked){ if(onGround){this.player.body.setVelocityY(s.jumpVelocity); this.jumpCount=1; this.jumpLocked=true; this.playJumpFeedback();} else if(this.jumpCount===1){this.player.body.setVelocityY(s.doubleJumpVelocity||-560); this.jumpCount=2; this.jumpLocked=true; this.createDoubleJumpBurst(); this.playJumpFeedback();} }
    if(released&&this.player.body.velocity.y<s.jumpCutVelocity) this.player.body.setVelocityY(s.jumpCutVelocity);
    this.jumpWasDown=input.jump;

    if(!this.wasGrounded&&onGround) this.playLandingFeedback(); this.wasGrounded=onGround;
    if(input.blow&&this.time.now-this.lastBlowAt>360){ this.lastBlowAt=this.time.now; const z=this.nearestInteraction(); if(z) this.runInteraction(z); else this.createBlowEffect(); }
    if(this.player.y>this.groundY+270){ const p=this.lastSafe||{x:125,y:this.groundY-72}; this.player.setPosition(p.x,p.y-4); this.player.body.setVelocity(0,0); this.currentSpeed=0; this.jumpCount=0; this.showLine('Probeer het nog eens.',1200); }
    this.animatePlayer(delta,onGround); this.updateCamera(false);
  }
}
window.FTTM=window.FTTM||{}; window.FTTM.LevelScene=LevelScene; window.LevelScene=LevelScene;

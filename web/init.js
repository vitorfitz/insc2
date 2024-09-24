"use strict"

const allSigils=[];
class Sigil{
    init(coords=null,name=null,desc=null,initData=function(card,sigil){},hidden=false){
        this.name=name;
        this.desc=desc;
        this.coords=coords;

        // Listeners
        this.onCardPlayed=[]; // (me,played,memory)
        this.onCardDied=[]; // (me,killed,memory)
        this.onReceivedDmg=[]; // (dmg,me,attacked,memory) returns(dmg)
        this.onReceivedAttack=[]; // (me,attacker,attacked,memory)
        this.onTurnEnded=[]; // (me,memory)
        this.onFaceDmg=[]; // (dmg,me,attacker,targetPos,memory) returns(dmg)
        this.onCardMoved=[]; // (me,oldPos,mover,memory)
        this.onCardDrawn=[]; // (me,card,memory)

        // Functions
        this.onDealtDmg=null; // (dmg,me,attacked,memory)
        this.onDealtAttack=null; // (me,attacked,index,memory)
        this.modifyTargets=null; // (me,memory)

        this.initData=initData;
        
        if(coords!=null && !hidden){
            const hash=coords[0]*100+coords[1];
            if(!coordsSet.has(hash)){
                coordsSet.add(hash);
                sigilCoords.push(coords);
            }
        }
        this.id=allSigils.length;
        allSigils.push(this);
    }

    toJSON(){
        return this.id;
    }
}

async function replace(me,biggerMe){
    let bm;
    if(me.mods){
        bm=new ModdedCard(biggerMe);
        bm.extraSigs=me.mods.extraSigs;
    }
    else{
        bm=biggerMe;
    }
    let big=GameCard.fromCard(bm);
    big.baseHealth+=me.baseHealth-me.card.getHealth();
    big.health+=me.health-me.card.getHealth();
    big.baseAttack+=me.baseAttack-me.card.getAttack();
    big.attack+=me.baseAttack-me.card.getAttack();
    if(big.baseHealth<me.baseHealth){
        big.baseHealth=me.baseHealth;
        big.health+=me.baseHealth-big.baseHealth;
    }
    big.updateStat(0,big.attack);
    big.updateStat(1,big.health);
    removeCard(me);

    const target=me.pos;
    game.board[me.side][me.pos]=null;
    me.pos=null;
    for(let s of me.sigils){
        for(let q of s.funcs.onCardMoved){
            if(q.type==listen_me) await q.func(me,target,me,s.data);
        }
    }

    let listenersIHave=new Array(listenerRefs.length).fill(false);
    for(let h=0; h<listenerRefs.length; h++){
        for(let i=0; i<me.card.getSigils().length; i++){
            if(me.card.getSigils()[i][listenerFuncs[h]].length>0){
                listenersIHave[h]=true;
                break;
            }
        }
    }

    for(let h=0; h<listenerRefs.length; h++){
        if(listenersIHave[h]){
            for(let i=0; i<2; i++){
                let l2=[];
                for(let l of game[listenerRefs[h]][i]){
                    if(l.caller!=me) l2.push(l);
                }
                game[listenerRefs[h]][i]=l2;
            }
        }
    }

    await big.place(target,me.side);
}

class SFledgling extends Sigil{
    init(biggerMe,name=null,desc=null){
        super.init([3,2],name,desc);
        this.biggerMe=biggerMe;
        this.onTurnEnded.push(new Listener(listen_enemy,async function(me){
            await replace(me,biggerMe);
        }.bind(this)))
    }
}

class SFrozen extends Sigil{
    init(futureMe,name=null,desc=null){
        super.init([3,4],name,desc);
        this.futureMe=futureMe;
        this.onCardDied.push(new Listener(listen_me,async function(me){
            // blockActions++;
            // updateBlockActions();
            // game.timeout(function(){
            //     await (GameCard.fromCard(this.futureMe,true)).place(me.pos);
            //     blockActions--;
            //     updateBlockActions();
            // }.bind(this),650)
            await (GameCard.fromCard(this.futureMe,true)).place(me.pos,me.side,false,800);
        }.bind(this)))
    }
}

class BuffSigil extends Sigil{
    init(coords,buff,name=null,desc=null,initData=function(card,sigil){},alsoAlly=false,hidden=false){
        super.init(coords,name,desc,initData,hidden);
        this.onCardMoved.push(new Listener(listen_me,async function(me,old_pos,_,memory){
            if(old_pos!=null){
                buff(-1,me,old_pos,memory);
            }
            if(me.pos!=null){
                buff(1,me,me.pos,memory);
            }
        }));
        this.onCardDied.push(new Listener(listen_me,async function(me,_,memory){
            if(!me.inGame){
                return;
            }
            buff(-1,me,me.pos,memory);
        }));

        if(alsoAlly){
            this.onCardMoved.push(new Listener(listen_ally,async function(me,_,_2,memory){
                buff(-1,me,me.pos,memory);
                buff(1,me,me.pos,memory);
            }));
            this.onCardDied.push(new Listener(listen_ally,async function(me,ded,memory){
                if(ded.pos==null) return;
                buff(-1,me,me.pos,memory);
                game.board[ded.side][ded.pos]=null;
                buff(1,me,me.pos,memory);
                game.board[ded.side][ded.pos]=ded;
            }));
        }
    }
}

function moverTrans(el,dir){
    el.style.transform="rotateY("+((dir==1)==(game.myTurn==0)? 0: 180)+"deg)";
}

class SSpawner extends Sigil{
    init(coords,spawn,name=null,desc=null){
        super.init(coords,name,desc,initDirection);

        this.onTurnEnded.push(new Listener(listen_ally,async function(me,memory){
            let pos=me.pos;
            let att=pos+memory.direction;
            if(att>=game.lanes || att<0 || game.board[game.turn][att]!=null){
                memory.direction*=-1;
                moverTrans(memory.el,memory.direction);
                att=pos+memory.direction;
                if(att>=game.lanes || att<0 || game.board[game.turn][att]!=null){ att=pos; }
            }
            if(att!=pos){
                await me.place(att);
                if(spawn!=null){
                    await (GameCard.fromCard(spawn,true)).place(pos);
                }
            }
        }));
    }
}

class StatSigil extends Sigil{
    init(statCoords,name=null,desc=null,initData=function(card,sigil){}){
        super.init(null,name,desc,initData);
        this.statCoords=statCoords;
    }
}

const allActivated=[];
class Activated{
    init(coords,name,desc,func,
        conds=function(card,data,sigil){return true;},
        initData=function(card,sigil){},
        genMsg=function(card,data){return[];}
    ){
        this.name=name;
        this.desc=desc;
        this.coords=coords;
        this.func=func;
        this.conds=conds;
        this.initData=initData;
        this.genMsg=genMsg;

        this.id=allActivated.length;
        allActivated.push(this);
    }

    toJSON(){
        return this.id;
    }
}

class VanillaActivated extends Activated{
    init(coords,cost,element,name,desc,func,
        conds=function(card,data,sigil){return true;},
        initData=function(card,sigil){},
        genMsg=function(card,data){return[];}
    ){
        let conds2=function(card,data,sigil){
            return checkCost(element,cost) && conds(card,data,sigil);
        }
        let func2=function(card,data,msg){
            spendResource(element,cost,card.side);
            func(card,data,msg);
        };
        super.init(coords,name,desc,func2,conds2,initData,genMsg);
    }
}

const mode_orig=0;
const mode_exp=1;
let mode=mode_exp;
const modeNames=["Classic","Extended"];

class Card{
    init(n,c,a,h,e,s,a2,p,collectible=true,custom=false){
        this.name=n;
        this.attack=a;
        this.health=h;
        this.cost=c;
        this.element=e;
        this.sigils=s;
        this.activated=a2;
        this.portrait=p;
        this.custom=custom;

        if(e==bones && c>10){
            this.costXPos=1;
            this.costYPos=c-4;
        }
        else{
            this.costXPos=e;
            this.costYPos=c-1;
        }

        this.visibleSigils=[];
        this.statSigil=null;
        for(let sigil of s){
            if(sigil.coords!=null){
                this.visibleSigils.push(sigil);
            }
            else if(sigil instanceof StatSigil){
                this.statSigil=sigil;
            }
        }

        if(collectible){
            this.id=cards.length;
            cards.push(this);
        }
        if(!custom){
            this.jsonID=allCards.length;
            allCards.push(this);
        }
        else{
            this.jsonID=-1;
        }
    }

    init_orig(c=this.cost,a=this.attack,h=this.health,s=this.sigils,a2=this.activated,collec=true){
        this.origCost=c;
        if(this.element==bones && c>10){
            this.origCXPos=1;
            this.origCYPos=c-4;
        }
        else{
            this.origCXPos=this.element;
            this.origCYPos=c-1;
        }

        this.origAtk=a;
        this.origHP=h;
        this.origSigils=s;
        this.origVisible=[];
        this.origAct=a2;
        for(let sigil of s){
            if(sigil.coords!=null){
                this.origVisible.push(sigil);
            }
        }
        if(collec){
            this.origID=origCards.length;
            origCards.push(this);
        }
    }

    init_orig_no_id(){
        this.init_orig(undefined,undefined,undefined,undefined,undefined,false);
    }

    getHealth(){return mode==mode_exp? this.health: this.origHP;}
    getAttack(){return mode==mode_exp? this.attack: this.origAtk;}
    getCost(){return mode==mode_exp? this.cost: this.origCost;}
    getCostXPos(){return mode==mode_exp? this.costXPos: this.origCXPos;}
    getCostYPos(){return mode==mode_exp? this.costYPos: this.origCYPos;}
    getElement(){return this.element;}
    getActivated(){return mode==mode_exp? this.activated: this.origAct;}
    getVisibleSigils(){return mode==mode_exp? this.visibleSigils: this.origVisible;}
    getSigils(){return mode==mode_exp? this.sigils: this.origSigils;}

    renderAlsoReturnCtx(scale,unsac=this.hasSigil(s_cant_be_sacced),atk=this.getAttack(),hp=this.getHealth()){
        const d=document.createElement("div");
        d.style.width=cardWidth*scale+"px";
        d.style.height=cardHeight*scale+"px";
        d.style.position="relative";

        const c=document.createElement("canvas");
        c.width=cardWidth*scale;
        c.height=cardHeight*scale;
        c.className="baseCanvas";
        const ctx=c.getContext("2d");

        let sigilEls=[];
        function addSigilElement(sig,type="canvas"){
            const tooltipEl=sigilElement(sig,type);
            d.appendChild(tooltipEl);
            sigilEls.push(tooltipEl);
            return tooltipEl;
        }

        let [cardX,cardY]=getBG(unsac);
        i_cards.draw(ctx,scale,cardX,cardY,0,0);
        i_portraits.draw(ctx,scale,this.portrait[0],this.portrait[1],1,1);
        drawStat(ctx,scale,1,hp);

        if(this.statSigil!=null){
            let [cx,cy]=this.statSigil.statCoords;
            let ox=atk_alignX-1,oy=cardHeight-1-i_stats.dims[1];

            i_stats.draw(ctx,scale,cx,cy,ox,oy);
            const el=addSigilElement(this.statSigil,"div");

            el.classList.add("bleach_survivor");
            el.style.width=i_stats.dims[0]*scale+"px";
            el.style.height=i_stats.dims[1]*scale+"px";
            el.style.left=ox*scale+"px";
            el.style.top=oy*scale+"px";
        }
        else{
            drawStat(ctx,scale,0,atk);
        }

        if(this.getCost()!=0){
            i_costs.draw(ctx,scale,this.getCostXPos(),this.getCostYPos(),cost_alignX,1);
        }
        
        if(this.getActivated()){
            const el=addSigilElement(this.getActivated());
            el.width=i_act.dims[0]*scale;
            el.height=i_act.dims[1]*scale;
            el.style.left=act_alignX*scale+"px";
            el.style.top=act_alignY*scale+"px";
            el.classList.add("actSigil");
            el.style.setProperty("--scale",scale);
            
            i_act.draw(el.getContext("2d"),scale,this.getActivated().coords[0],this.getActivated().coords[1],0,0);
        }
        else{
            let x=drawSigils(this.getVisibleSigils(),scale);
            for(let q of x){
                d.appendChild(q);
                sigilEls.push(q);
            }
        }

        // const debug=document.createElement("span");
        // debug.style.position="absolute";
        // debug.style.top="15px";
        // debug.style.left="5px";
        // debug.style.fontSize="20px";
        // debug.style.color="#00FF00";
        // debug.style.textShadow="-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000"
        // const p=new PowerEstimate(atk,hp,this.sigils);
        // debug.textContent=""+Math.round(p.calc()*1000)/1000;
        // d.appendChild(debug);

        d.appendChild(c);
        return {div: d,ctx,sigilEls};
    }

    render(scale){
        return this.renderAlsoReturnCtx(scale).div;
    }

    hasSigil(sig){
        for(let s of this.sigils){
            if(s==sig){
                return true;
            }
        }
        return false;
    }

    toJSON(){
        return this.jsonID;
    }
}

const cardWidth=42,cardHeight=56;
function calcCenterX(width){
    return (cardWidth-width)/2;
}
const weirdWidth=29;
const weirdAlignX=calcCenterX(weirdWidth);

function drawSigils(visibleSigils,scale){
    const ms=[s_sapphire,s_ruby,s_emerald];
    let allMoxen=true;
    for(let i=0; i<ms.length; i++){
        if(visibleSigils.indexOf(ms[i])==-1){
            allMoxen=false;
            break;
        }
    }
    if(allMoxen){
        const tooltipEl=document.createElement("canvas");
        tooltipEl.className="ttTrigger";
        tooltipEl.width=weirdWidth*scale;
        tooltipEl.height=i_sigils.dims[1]*scale;
        tooltipEl.style.left=weirdAlignX*scale+"px";
        tooltipEl.style.top=sig_alignY*scale+"px";
            
        i_sigils.draw(tooltipEl.getContext("2d"),scale,5,3,0,0,weirdWidth);
        return[tooltipEl,tooltipEl,tooltipEl];
    }
    
    let alignX=visibleSigils.length==2? sig_alignX2: sig_alignX;
    let els=[];
    for(let i=0; i<visibleSigils.length; i++){
        const tooltipEl=sigilElement(visibleSigils[i]);
        tooltipEl.width=i_sigils.dims[0]*scale;
        tooltipEl.height=i_sigils.dims[1]*scale;
        tooltipEl.style.left=alignX*scale+"px";
        tooltipEl.style.top=sig_alignY*scale+"px";
            
        i_sigils.draw(tooltipEl.getContext("2d"),scale,visibleSigils[i].coords[0],visibleSigils[i].coords[1],0,0);
        alignX+=i_sigils.dims[0]+1;

        let base=tooltipEl;
        if(conduitSigils.indexOf(visibleSigils[i])!=-1){
            base=document.createElement("div");
            base.style.position="absolute";
            base.style.top=0;
            base.style.bottom=0;
            base.style.left=0;
            base.style.right=0;
            const condCanvas=document.createElement("canvas");
            condCanvas.width=scale*cardWidth;
            condCanvas.height=scale*cardHeight;
            i_cards.draw(condCanvas.getContext("2d"),scale,0,4,0,0);
            base.appendChild(condCanvas);
            base.appendChild(tooltipEl);
        }
        els.push(base);
    }
    return els;
}

const s_bomb=new Sigil();
const s_digger=new Sigil();
const s_brittle=new Sigil();
const s_bifurcated=new Sigil();
const s_death_touch=new Sigil();
const s_double_death=new Sigil();
const s_fecundity=new Sigil();
const s_undying=new Sigil();
const s_ouroboros=new Sigil();
const s_sq_spawner=new SSpawner();
const s_rabbit=new Sigil();
const s_wolf_cub=new SFledgling();
const s_raven_egg=new SFledgling();
const s_sarc=new SFledgling();
const s_explosive=new Sigil();
const s_flying=new Sigil();
const s_energy=new Sigil();
const s_guardian=new Sigil();
const s_frozen_skele=new SFrozen();
const s_push=new Sigil();
const s_bones=new Sigil();
const s_reach=new Sigil();
const s_free_sac=new Sigil();
const s_quills=new Sigil();
const s_skele_spawner=new SSpawner();
const s_aquatic=new Sigil();
const s_worthy=new Sigil();
const s_trifurcated=new Sigil();
const s_tutor=new Sigil();
const s_burrow=new Sigil();
const s_sidestep=new SSpawner();
const s_sniper=new Sigil();
const s_blood_lust=new Sigil();
const s_dam=new Sigil();
const s_beehive=new Sigil();
const s_bells=new Sigil();
const s_extra_attack=new Sigil();
const s_cant_be_sacced=new Sigil();
const s_packin=new Sigil();
const s_alpha=new BuffSigil();
const s_stinky=new BuffSigil();
const s_hand=new StatSigil();
const s_mirror=new StatSigil();

const c_squirrel=new Card();
const c_skeleton=new Card();
const c_hopper=new Card();
const c_adder=new Card();
const c_automaton=new Card();
const c_banshee=new Card();
const c_energy_bot=new Card();
const c_bloodhound=new Card();
const c_bolthound=new Card();
const c_explode_bot=new Card();
const c_mrs_bomb=new Card();
const c_bonehound=new Card();
const c_bullfrog=new Card();
const c_sniper=new Card();
const c_cat=new Card();
const c_coyote=new Card();
const c_pharaoh=new Card();
const c_draugr=new Card();
const c_drowned=new Card();
const c_elk=new Card();
const c_wolf_cub=new Card();
const c_family=new Card();
const c_mice=new Card();
const c_frank_stein=new Card();
const c_ghost_ship=new Card();
const c_gravedigger=new Card();
const c_grizzly=new Card();
const c_gunner=new Card();
const c_hawk=new Card();
const c_hrokkall=new Card();
const c_insectodrone=new Card();
const c_kingfisher=new Card();
const c_squirrel_ball=new Card();
const c_l33pbot=new Card();
const c_magpie=new Card();
const c_49er=new Card();
const c_mole=new Card();
const c_mole_man=new Card();
const c_steambot=new Card();
const c_mummy_lord=new Card();
const c_necromancer=new Card();
const c_ouroboros=new Card();
const c_rabbit=new Card();
const c_raven=new Card();
const c_revenant=new Card();
const c_stoat=new Card();
const c_steel_mice=new Card();
const c_salmon=new Card();
const c_sarcophagus=new Card();
const c_thicc=new Card();
const c_477=new Card();
const c_warren=new Card();
const c_wolf=new Card();
const c_zombie=new Card();
const c_cockroach=new Card();
const c_bat=new Card();
const c_beaver=new Card();
const c_dam=new Card();
const c_bee=new Card();
const c_beehive=new Card();
const c_black_goat=new Card();
const c_daus=new Card();
const c_bell=new Card();
const c_dire_wolf=new Card();
const c_rat_king=new Card();
const c_raven_egg=new Card();
const c_alpha=new Card();
const c_mantis=new Card();
const c_moose_buck=new Card();
const c_skunk=new Card();
const c_great_white=new Card();
const c_porcupine=new Card();
const c_rattler=new Card();
const c_river_snapper=new Card();
const c_sparrow=new Card();
const c_vulture=new Card();
const c_bone_horn=new Card();
const c_tomb_raider=new Card();
const c_plasma=new Card();
const c_bone_heap=new Card();
const c_mirror_tent=new Card();
const c_m3atb0t=new Card();
const c_hand_tent=new Card();
const c_horseman=new Card();
const c_pronghorn=new Card();

const c_rock=new Card();
const c_pack_rat=new Card();
const c_undead_cat=new Card();
const c_starvation=new Card();

const a_bone_horn=new VanillaActivated();
const a_disentomb=new VanillaActivated();
const a_energy_gun=new VanillaActivated();
const a_enlarge=new VanillaActivated();

const c_mantis_god=new Card();
const c_elk_fawn=new Card();
const c_dead_hand=new Card();
const c_gambling=new Card();
const c_sentry=new Card();
const c_shutterbug=new Card();

const c_bleen=new Card();
const c_goranj=new Card();
const c_orlu=new Card();
const c_m_bleen=new Card();
const c_m_goranj=new Card();
const c_m_orlu=new Card();
const c_green=new Card();
const c_orange=new Card();
const c_blue=new Card();
const c_pupil=new Card();
const c_gourmage=new Card();
const c_green_mage=new Card();
const c_junior_sage=new Card();
const c_muscle_mage=new Card();
const c_stim_mage=new Card();
const c_mage_knight=new Card();
const c_orange_mage=new Card();
const c_practice_wizard=new Card();
const c_ruby_golem=new Card();
const c_blue_mage=new Card();
const c_force_mage=new Card();
const c_gem_fiend=new Card();
const c_hover_mage=new Card();
const c_skelemagus=new Card();
const c_mox_module=new Card();

const c_null_cond=new Card();
const c_buff_cond=new Card();
const c_factory_cond=new Card();
const c_energy_cond=new Card();

const a_enlarge_unn=new VanillaActivated();
const a_stimulation=new VanillaActivated();
const a_gamble=new VanillaActivated();
const s_handy=new Sigil();
const s_elk_fawn=new SFledgling();
const s_freer_sac=new Sigil();
const s_explosive10=new Sigil();
const s_sentry=new Sigil();
const s_sapphire=new Sigil();
const s_emerald=new Sigil();
const s_ruby=new Sigil();
const a_potofgreed=new VanillaActivated();
const s_dependant=new Sigil();
const s_looter=new Sigil();
const s_repulsive=new BuffSigil();
const s_gem_anim=new Sigil();
const s_ruby_heart=new SFrozen();
const s_op_draw=new Sigil();
const s_green_gems=new StatSigil();
const s_null_cond=new Sigil();
const s_energy_cond=new BuffSigil();
const s_buff_cond=new BuffSigil();
const s_factory_cond=new Sigil();

const conduitSigils=[s_null_cond,s_energy_cond,s_buff_cond,s_factory_cond];
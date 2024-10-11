"use strict"

function spendResource(game,el,cost){
    unselectCard();
    if(el==bones){
        game.bones[turn]-=cost;
    }
    else if(el==energy){
        game.energy[turn]-=cost;
    }
}

function checkCost(game,element,cost){
    if(element==blood){
        let total=0;
        for(let i=0; i<game.lanes; i++){
            let c=game.board[game.myTurn][i];
            if(c!=null){
                let blood=1;
                if(c.unsaccable){
                    blood=0;
                }
                else if(c.hasSigil(s_worthy)){
                    blood=3;
                }
                total+=blood;
            }
        }
        return total>=cost;
    }
    else if(element==bones){
        return game.bones[game.myTurn]>=cost;
    }
    else if(element==energy){
        return game.energy[game.myTurn]>=cost;
    }
    else if(element==mox){
        let moxen=0;
        for(let i=0; i<game.lanes; i++){
            let c=game.board[game.myTurn][i];
            if(c!=null){
                if(c.hasSigil(s_sapphire)) moxen|=sapphire;
                if(c.hasSigil(s_ruby)) moxen|=ruby;
                if(c.hasSigil(s_emerald)) moxen|=emerald;
            }
        }
        return (moxen&cost)==cost;
    }
}

let game;

const listen_me=0,listen_ally=1,listen_enemy=2,listen_any=3;
class Listener{
    constructor(type,func,prio=0){
        this.type=type;
        this.func=func;
        this.prio=prio;
    }
}

class GameSigil{
    constructor(sigil,totem=false){
        this.funcs=sigil;
        this.data=null;
        this.el=null;
        this.totem=totem;
    }
}
class GameActivated extends GameSigil{
    constructor(sigil){
        super(sigil);
        this.enabled=false;
    }
}

function initDirection(game,card,gs){
    const old=game.board[card.side][card.pos];
    let direction=1-2*card.side;
    if(old!=null){
        for(let s of old.sigils){
            if(s.funcs.initData==initDirection){
                direction=s.data.direction;
                break;
            }
        }
    }

    return{direction};
}

s_bomb.init([0,0],"Bomb Spewer","Invoca bombas que destroem cartas adjacentes em todos os espaços vazios.");
s_bomb.onCardPlayed.push(new Listener(listen_me,function(game,me){
    for(let i=0; i<2; i++){
        for(let j=game.starts[game.turn]; j!=game.ends[game.turn]; j+=dirs[game.turn]){
            if(game.board[i][j]==null){
                (GameCard.fromCard(game,c_explode_bot,true)).place(j,i);
            }
        }
    }
}))

s_digger.init([1,0],"Bone Digger","Ganha 1 osso no fim do turno.");
s_digger.onTurnEnded.push(new Listener(listen_ally,function(game,me){
    game.bones[game.turn]++;
}))

s_brittle.init([2,0],"Brittle","Morre após atacar.");
s_brittle.onDealtAttack=function(me,_,i){ if(i==game.targets.length-1) me.die(); }

s_bifurcated.init([6,0],"Bifurcated Strike","Ataca os espaços à direita e esquerda em vez do espaço à frente.");
s_bifurcated.modifyTargets=function(me){
    if(game.targets[game.targets.length-1]==me.pos) game.targets.pop();
    for(let i=me.pos-dirs[game.turn],j=0; j<2; i+=2*dirs[game.turn],j++){
        if(i>=0 && i<game.lanes) game.targets.push(i)
    }
}

s_death_touch.init([2,1],"Death Touch","Mata qualquer criatura que sofrer dano desta.");
s_death_touch.onDealtDmg=function(dmg,_,opp){
    return opp.health;
}

s_double_death.init([3,1],"Double Death","Efeitos de morte aliados ativam duas vezes.");
s_double_death.onCardDied.push(new Listener(listen_ally,function(game,me, them){
    if(me.card!=them.card){
        for(let s of them.sigils){
            for(let f of s.funcs.onCardDied){
                if(f.type==listen_me) f.func(them,them,s.data);
            }
        }
        game.bones[me.side]++;
        for(let l of game.deathListeners[me.side]){
            if(!l.caller.hasSigil(s_double_death)) l.func(l.caller,them,l.data);
        }
    }
}));
s_double_death.onCardPlayed.push(new Listener(listen_me,function(game,me){
    game.necroCount[me.side]++;
}));
s_double_death.onCardDied.push(new Listener(listen_me,function(game,me){
    if(me.inGame){
        game.necroCount[me.side]--;
    }
}));

s_fecundity.init([4,1],"Fecundity","Cria uma cópia na sua mão ao ser jogada.");
s_fecundity.onCardPlayed.push(new Listener(listen_me,function(game,me){
    game.addCardToHand(me.getCard(),undefined,undefined,true);
}))

s_undying.init([5,1],"Undying","Volta para sua mão quando morre.");
s_undying.onCardDied.push(new Listener(listen_me,function(game,me){
    game.addCardToHand(me.getCard(),me.side);
}))

s_ouroboros.init([5,1],"Undying++","Volta para sua mão com +1/1 quando morre.");
s_ouroboros.onCardDied.push(new Listener(listen_me,function(game,me){
    game.addCardToHand(me.getCard(),me.side,function(newMe){
        newMe.attack=me.baseAttack+1;
        newMe.health=me.baseHealth+1;
        newMe.baseAttack=newMe.attack;
        newMe.baseHealth=newMe.health;
    })
}))

s_sq_spawner.init([6,1],c_squirrel,"Squirrel Shedder","Move no fim do turno e cria um esquilo onde estava.");

s_rabbit.init([1,2],"Rabbit Hole","Adiciona um coelho 0/1 de custo 0 na sua mão.");
s_rabbit.onCardPlayed.push(new Listener(listen_me,function(game,me){
    game.addCardToHand(c_rabbit,undefined,undefined,true,true);
}))

s_wolf_cub.init(c_wolf,"Fledgling","Se torna um Lobo 3/2 no próximo turno.");
s_elk_fawn.init(c_elk,"Fledgling","Se torna um Cervo 2/4 no próximo turno.");
s_raven_egg.init(c_raven,"Fledgling","Se torna um Corvo 2/3 voador no próximo turno.");
s_sarc.init(c_mummy_lord,"Fledgling","Se torna uma Múmia 3/4 no próximo turno.");

// s_armored.init([],function(){return{shield:true};});
// s_armored.onReceivedDmg.push(new Listener(listen_me,function(game,dmg,_,_,memory){
//     if(memory.shield){ memory.shield=false; return 0; }
//     return dmg;
// }));

s_explosive.init([4,2],"Detonator","Ao morrer causa 5 de dano às cartas adjacentes (na vertical e horizontal).");
s_explosive.onCardDied.push(new Listener(listen_me,function(game,me,them){
    if(game.board[1-me.side][me.pos]!=null){
        game.board[1-me.side][me.pos].damage(5,me);
    }
    for(let i=-dirs[me.side],j=0; j<2; i+=2*dirs[me.side],j++){
        let c=me.pos+i;
        if(c>=0 && c<game.lanes){
            if(game.board[me.side][c]!=null) game.board[me.side][c].damage(5,me);
        }
    }
}));

s_explosive10.init([4,2],"Detonator","Ao morrer causa 10 de dano às cartas adjacentes (na vertical e horizontal).");
s_explosive10.onCardDied.push(new Listener(listen_me,function(game,me,them){
    if(game.board[1-me.side][me.pos]!=null){
        game.board[1-me.side][me.pos].damage(10,me);
    }
    for(let i=-dirs[me.side],j=0; j<2; i+=2*dirs[me.side],j++){
        let c=me.pos+i;
        if(c>=0 && c<game.lanes){
            if(game.board[me.side][c]!=null) game.board[me.side][c].damage(10,me);
        }
    }
}));

s_sentry.init([3,5],"Sentry","Causa 1 de dano às cartas que entrarem na frente dela.",undefined,true);
s_sentry.onCardMoved.push(new Listener(listen_enemy,function(game,me,oldPos,mover){
    if(mover.pos==me.pos){
        game.sleep(250);
        mover.damage(1,me);
    }
}));

s_flying.init([0,3],"Airborne","Ataca o oponente diretamente.");
s_flying.onDealtAttack=function(me,them){
    game.canBlock=false;
};

s_energy.init([1,3],"Battery Bearer","Ganha 1 de energia máxima.");
s_energy.onCardPlayed.push(new Listener(listen_me,function(game,me){
    if(game.maxEnergy[game.turn]<6){
        game.maxEnergy[game.turn]++;
    }
    if(game.energy[game.turn]<6){
        const uiTurn=+(game.turn!=game.myTurn);
        game.energy[game.turn]++;
    }
}));

s_guardian.init([2,4],"Guardian","Quando o oponente joga uma carta contra um espaço vazio, move para bloqueá-la.");
s_guardian.onCardPlayed.push(new Listener(listen_enemy,function(game,me,them){
    if(game.board[me.side][them.pos]==null){
        game.board[me.side][me.pos]=null;
        me.place(them.pos,me.side);
    }
}));

s_frozen_skele.init(c_skeleton,"Frozen Away","Invoca um esqueleto 1/1 ao morrer.");

s_push.init([6,4],"Hefty","Move no fim do turno, empurrando outras cartas.",initDirection);
function canPush(me,dir){
    let t=dir==-1? 1: 0;
    for(let i=me.pos; i!=game.ends[t]; i+=dir){
        if(game.board[game.turn][i]==null){
            return i;
        }
    }
    return -1;
}
s_push.onTurnEnded.push(new Listener(listen_ally,function(game,me,memory){
    let p=canPush(me,memory.direction);
    if(p==-1){
        memory.direction*=-1;
        moverTrans(memory.el,memory.direction);
        p=canPush(me,memory.direction);
    }
    if(p!=-1){
        let freeze=me.pos;
        for(let i=p; i!=freeze; i-=memory.direction){
            game.board[game.turn][i-memory.direction].place(i);
        }
    }
}))

s_bones.init([0,5],"Bone King","Dá 4 ossos quando morre em vez de 1.");
s_bones.onCardDied.push(new Listener(listen_me,function(game,me){
    game.bones[me.side]+=3;
}))

s_reach.init([1,5],"Mighty Leap","Bloqueia cartas voadoras.");
s_reach.onReceivedAttack.push(new Listener(listen_me,function(game,me){
    game.canBlock=true;
}))

s_free_sac.init([2,5],"Many Lives","Quando sacrificada, perde 1 de vida em vez de morrer."/*,function(me,gs){
    return{sacCounter:0}
}*/);

s_freer_sac.init([2,5],"Many Lives","Não morre ao ser sacrificada.",function(me,gs){
    return{sacCounter:0}
});

s_quills.init([4,5],"Sharp Quills","Causa 1 de dano a quem a ataca.");
s_quills.onReceivedAttack.push(new Listener(listen_me,function(game,me,them){
    if(game.canBlock){
        them.damage(1,me);
    }
}))

s_skele_spawner.init([5,5],c_skeleton,"Skeleton Crew","Move no fim do turno, deixando um esqueleto onde estava.");

s_aquatic.init([6,5],"Waterborne","Não bloqueia ataques.");
s_aquatic.onReceivedAttack.push(new Listener(listen_me,function(game,me){
    game.canBlock=false;
}))

s_worthy.init([1,6],"Worthy Sacrifice","Conta como 3 criaturas ao ser sacrificada.");

s_trifurcated.init([2,6],"Trifurcated Strike","Ataca 3 vezes: esquerda, frente e direita.");
s_trifurcated.modifyTargets=function(me){
    if(game.targets[game.targets.length-1]==me.pos) game.targets.pop();
    for(let i=me.pos-dirs[game.turn]; i!=me.pos+2*dirs[game.turn]; i+=dirs[game.turn]){
        if(i>=0 && i<game.lanes) game.targets.push(i)
    }
}

const tutorModal=document.querySelector("#tutorWrapper");
const tutorDiv=document.querySelector("#tutor");
s_tutor.init([3,6],"Hoarder","Ao jogar, compre uma carta do seu deck à sua escolha.");
s_tutor.onCardPlayed.push(new Listener(listen_me, function(me){
    game.addCardToHand(game.decks[me.side][i]);
    game.decks[me.side].splice(i,1);
    shuffle(game.decks[me.side]);
}))

s_burrow.init([4,6],"Burrower","Quando um espaço vazio seu é atacado, se move para defendê-lo.");
s_burrow.onFaceDmg.push(new Listener(listen_ally, function(dmg,me,attacker,target){
    if(attacker==null || !me.hasSigil(s_reach) && attacker.hasSigil(s_flying)){
        return dmg;
    }
    if(game.board[me.side][target]==null){
        game.board[me.side][me.pos]=null;
        game.canBlock=true;
        me.place(target,me.side);
        attacker.hit(me);
        return 0;
    }
    return dmg;
}))

s_sidestep.init([5,6],null,"Sprinter","Move no fim do seu turno.");

s_sniper.init([6,6],"Sniper","Você escolhe onde essa carta ataca.");
s_sniper.modifyTargets=async function(me){
    if(game.targets.length>0){
        if(me.side!=game.myTurn){
            let msg=await Promise.any([game.getNextMsg(),game.abort]);
            if(game.overBool) return;

            let targetsStr=msg.substring(2);
            game.targets=[];
            if(targetsStr==""){
                return;
            }

            const spl=targetsStr.split(" ");
            for(let i=0; i<spl.length; i++){
                game.targets.push(parseInt(spl[i]));
            }
        }
    }
}

// s_blood_lust.init([0,7],"Blood Lust","Ganha +1 ataque ao matar uma carta.",function(){
//     return{amAttacking:false};
// });
// s_blood_lust.onReceivedAttack.push(new Listener(listen_enemy,function(game,me,opp,attacker,memory){
//     memory.amAttacking=attacker==me;
// }))
// s_blood_lust.onCardDied.push(new Listener(listen_enemy,function(game,me,opp,memory){
//     if(memory.amAttacking && game.turn==me.side){
//         me.attack++;
//     }
// }))

s_dam.init([1,7],"Dam Builder","Invoca Barreiras 0/2 que bloqueiam cartas voadoras nos espaços adjacentes.");
s_dam.onCardPlayed.push(new Listener(listen_me,function(game,me){
    for(let i=me.pos-dirs[game.turn],j=0; j<2; i+=2*dirs[game.turn],j++){
        if(i>=0 && i<game.lanes && game.board[me.side][i]==null){
            (GameCard.fromCard(game,c_dam,true)).place(i);
        }
    }
}))

s_beehive.init([2,7],"Bees Within","Quando toma dano, adiciona uma abelha 1/1 voadora de custo 0 à sua mão.");
s_beehive.onReceivedDmg.push(new Listener(listen_me,function(game,dmg,me){
    game.addCardToHand(c_bee,me.side,undefined,undefined,true);
    return dmg;
}))

// s_corpse_eater.init([3,7]);

s_bells.init([4,7],"Bellist","Invoca Sinos 0/1 nos espaços adjacentes. Ataca quem quebrar esses sinos.");
s_bells.onCardPlayed.push(new Listener(listen_me,function(game,me){
    for(let i=me.pos-dirs[game.turn],j=0; j<2; i+=2*dirs[game.turn],j++){
        if(i>=0 && i<game.lanes && game.board[me.side][i]==null){
            (GameCard.fromCard(c_bell,true)).place(i);
        }
    }
}))
s_bells.onReceivedAttack.push(new Listener(listen_ally,function(game,me,attacker,target){
    if(game.canBlock){
        if(target.card==c_bell){
            me.hit(attacker,true);
        }
    }
}))

s_extra_attack.init([5,7],"Extra Attack","Ataca 2 vezes.");
s_extra_attack.modifyTargets=function(me){
    game.targets.push(me.pos);
}

s_alpha.init([6,7],function(sign,me,pos){
    for(let i=pos-dirs[me.side],j=0; j<2; i+=2*dirs[me.side],j++){
        if(i>=0 && i<game.lanes){
            game.updateBuffs(me.side,i,sign);
        }
    }
},"Leader","Suas cartas adjacentes ganham +1 ataque.");

s_stinky.init([0,8],function(sign,me,pos){
    game.updateBuffs(1-me.side,pos,-sign);
},"Stinky","Reduz em 1 o ataque da carta na frente desta.");

s_cant_be_sacced.init();

s_hand.init([0,0],null,"Número de cartas na sua mão.");
s_hand.onCardPlayed.push(new Listener(listen_me,function(game,me){
    me.attack=game.hands[me.side].length+me.baseAttack;
},1));
s_hand.onCardDrawn.push(new Listener(listen_ally,function(game,me){
    me.attack=game.hands[me.side].length+me.baseAttack;
},1));
s_hand.onCardPlayed.push(new Listener(listen_ally,function(game,me){
    me.attack=game.hands[me.side].length+me.baseAttack;
},1));

s_mirror.init([1,0],null,"Copia o ataque da carta à frente desta.");
function updateMirror(game,me){
    const opposite=game.board[1-me.side][me.pos];
    const old=me.attack;
    me.attack=(opposite==null? 0: opposite.attack)+me.baseAttack;
}

s_mirror.onCardPlayed.push(new Listener(listen_me,function(game,me){
    updateMirror(game,me);
}));
s_mirror.onCardMoved.push(new Listener(listen_me,function(game,me){
    updateMirror(game,me);
}));
s_mirror.onCardMoved.push(new Listener(listen_enemy,function(game,me){
    updateMirror(game,me);
},1));
s_mirror.onCardDied.push(new Listener(listen_enemy,function(game,me,dead){
    if(dead.pos==me.pos){
        const old=me.attack;
        me.attack=0;
        if(old!=0) me.updateStat(0,me.attack);
    }else updateMirror(game,me);
},1));
s_mirror.onTurnEnded.push(new Listener(listen_any,function(game,me){
    updateMirror(game,me);
},1));

s_packin.init([4,8],"Trinket Bearer","Ganhe um item aleatório.",undefined,true);
s_packin.onCardPlayed.push(new Listener(listen_me,function(game,me){
    if(game.turn!=game.myTurn || (run.items.length>2 && run.usedItems.length==0)) return;

    const picked=itemTypes[genItem(1)[0]];
    let ind;
    if(run.items.length>2){
        ind=run.usedItems[0];
        run.usedItems.splice(0,1);
        run.items[ind]=picked;
    }
    else{
        ind=run.items.length;
        run.items.push(picked);
    }

    gameItemDivs[ind].innerHTML="";
    addItemImg(ind,gameItemDivs);
}));

s_handy.init([0,2],"Handy","Descarte sua mão e compre 4 cartas.",undefined);
s_handy.onCardPlayed.push(new Listener(listen_me,function(game,me){
    discardHand(+(me.side!=game.myTurn));
    if(me.side==game.myTurn){
        game.hand=[];
    }
    else{
        game.oppCards=0;
    }
    game.sigilInitiatedDraw(4,me.side);
}));

s_sapphire.init([2,3],null,null,undefined,true);
s_emerald.init([3,3],null,null,undefined,true);
s_ruby.init([4,3],null,null,undefined,true);

s_looter.init([4,4],"Looter","Compre 1 carta para cada dano direto causado.",undefined,true);
s_looter.onFaceDmg.push(new Listener(listen_enemy, function(dmg,me,attacker,target){
    if(me==attacker){
        game.sigilInitiatedDraw(dmg,me.side);
    }
    return dmg;
},-1));

s_dependant.init([0,4],"Gem Dependant","Se você não tiver Gemas, morre no fim do turno ou ao ser jogada.",undefined,true);
function gemCheck(me,wait=0){
    for(let i=0; i<game.lanes; i++){
        if(i!=me.pos){
            const c=game.board[me.side][i];
            if(c!=null && (c.hasSigil(s_sapphire) || c.hasSigil(s_ruby) ||  c.hasSigil(s_emerald))){
                return;
            }
        }
    }
    if(wait>0) game.sleep(wait);
    me.die();
}
s_dependant.onTurnEnded.push(new Listener(listen_any, function(me){
   gemCheck(me);
},0));
s_dependant.onCardPlayed.push(new Listener(listen_me, function(me){
    gemCheck(me,250);
 },0));

s_repulsive.init([5,4],function(sign,me,pos){
    game.updateBuffs(1-me.side,pos,-6969*sign);
},"Repulsive","Impede a carta da frente de atacar.",undefined,false,true);

function genAnimBuff(sign,me,i,c=game.board[me.side][i]){
    if(c!=null && (c.hasSigil(s_sapphire) || c.hasSigil(s_ruby) || c.hasSigil(s_emerald))){
        game.updateBuffs(me.side,i,sign);
    }
}
s_gem_anim.init([3,0],"Gem Animator","Suas Gemas ganham +1 de ataque.",undefined,false);
s_gem_anim.onCardMoved.push(new Listener(listen_ally,function(game,me,old_pos,mover){
    if(old_pos!=null){
        genAnimBuff(-1,me,old_pos,mover);
    }
    if(mover.pos!=null){
        genAnimBuff(1,me,mover.pos,mover);
    }
}));
s_gem_anim.onCardPlayed.push(new Listener(listen_me,function(game,me){
    for(let i=0; i<game.lanes; i++){
        genAnimBuff(1,me,i);
    }
}))
s_gem_anim.onCardDied.push(new Listener(listen_ally,function(game,me,victim){
    if(victim.pos!=null) genAnimBuff(-1,me,victim.pos,victim);
}));
s_gem_anim.onCardDied.push(new Listener(listen_me,function(game,me){
    if(!me.inGame){
        return;
    }
    for(let i=0; i<game.lanes; i++){
        genAnimBuff(-1,me,i);
    }
}));

s_ruby_heart.init(c_orange,"Ruby Heart","Invoca um Rubi ao morrer.");
s_ruby_heart.coords=[2,2];

s_op_draw.init([1,4],"Mental Gemnastics","Compra 1 carta para cada Gema controlada.",undefined,true);
s_op_draw.onCardPlayed.push(new Listener(listen_me,function(game,me){
    let gemCount=0;
    for(let i=0; i<game.lanes; i++){
        const c=game.board[me.side][i];
        if(c!=null && (c.hasSigil(s_sapphire) || c.hasSigil(s_ruby) || c.hasSigil(s_emerald))){
            gemCount++;
        }
    }
    game.sigilInitiatedDraw(gemCount,me.side);
}));

s_green_gems.init([4,0],null,"Ataque igual ao seu número de Esmeraldas.");
function updateGG(me,bias=0){
    let gemCount=bias;
    for(let i=0; i<game.lanes; i++){
        const c=game.board[me.side][i];
        if(c!=null && c.hasSigil(s_emerald)){
            gemCount++;
        }
    }
    if(me.attack!=gemCount){
        me.attack=gemCount;
        me.updateStat(0,me.attack);
    }
}
s_green_gems.onCardPlayed.push(new Listener(listen_me,function(game,me){
    updateGG(me);
}));
s_green_gems.onCardPlayed.push(new Listener(listen_ally,function(game,me,played){
    if(played.hasSigil(s_emerald)) updateGG(me);
}));
s_green_gems.onCardDied.push(new Listener(listen_ally,function(game,me,dead){
    if(dead.hasSigil(s_emerald)) updateGG(me,-1);
}));
s_green_gems.onTurnEnded.push(new Listener(listen_any,function(game,me){
    updateGG(me);
}));

function calcCircuit(game,side){
    let res=[0,game.lanes-1];
    let steps=[1,-1];

    for(let i=0; i<2; i++){
        w: while(res[i]!=res[1-i]){
            let c=game.board[side][res[i]];
            if(c!=null){
                for(let s of c.sigils){
                    if(conduitSigils.indexOf(s.funcs)!=-1){
                        break w;
                    }
                }
            }
            res[i]+=steps[i];
        }
    }
    
    if(res[0]==res[1]) return null;
    if(side==1){
        return[res[1]-1,res[0],-1];
    }
    else{
        return[res[0]+1,res[1],1];
    }
}

s_null_cond.init([5,8],null,null,undefined,true);

s_factory_cond.init([1,1],"Spawn Conduit","No fim do seu turno, cria bots 0/2 que bloqueiam cartas voadoras nos espaços vazios do circuito.",undefined,true);
s_factory_cond.onTurnEnded.push(new Listener(listen_ally,function(game,me){
    const circ=calcCircuit(game,me.side);
    if(circ==null) return;
    for(let i=circ[0]; i!=circ[1]; i+=circ[2]){
        if(game.board[me.side][i]==null){
            (GameCard.fromCard(c_l33pbot,true)).place(i,me.side);
        }
    }
}));

s_energy_cond.init([5,0],function(sign,me){
    game.energyConds[me.side]+=sign;
},"Energy Conduit","Quando parte de um circuito, suas cartas não gastam energia.",undefined,false,true);

s_buff_cond.init([4,0],function(sign,me,pos,mem){
    if(sign==1){
        mem.lastCirc=calcCircuit(game,me.side);
    }
    if(mem.lastCirc){
        for(let i=mem.lastCirc[0]; i!=mem.lastCirc[1]; i+=mem.lastCirc[2]){
            if(i!=pos){
                game.updateBuffs(me.side,i,sign);
            }
        }
    }
},"Buff Conduit","Cartas dentro do circuito têm +1 de ataque.",function(){
    return{lastCirc:null};
},true,true);

const cards=[];
const origCards=[];
const allCards=[];
const tooltip=document.querySelector("#tooltip");
let hoveredTT=null;

c_squirrel.init("Squirrel",0,0,1,blood,[],null,[8,5],false);
c_skeleton.init("Skeleton",0,1,1,bones,[s_brittle],null,[7,11],false);
const manas=[c_squirrel,c_skeleton];

// cartas act 3

a_bone_horn.init([4,0],1,energy,"Bone Horn","Gasta 1 energia: ganhe 3 ossos.",function(card){
    game.bones[card.side]+=3;
    updateBones(card.side);
});

a_disentomb.init([3,0],1,bones,"Disentomb","Gasta 1 osso: invoca um esqueleto.",function(card){
    let c=game.addCardToHand(c_skeleton,card.side,undefined,undefined,true);
    if(c){
        selectCard(c);
        blockActions++;
        isSaccing=false;
        updateBlockActions();
        game.tombRobberPresence=true;
    }
},function(card){
    for(let i=0; i<game.lanes; i++){
        if(game.board[card.side][i]==null) return true;
    }
    return false;
});

a_energy_gun.init([0,0],1,energy,"Energy Gun","Gasta 1 energia: causa 1 de dano à carta na frente.",function(card){
    game.board[1-card.side][card.pos].damage(1,card);
},function(card){
    return game.board[1-card.side][card.pos]!=null;
});

a_enlarge.init([2,1],3,bones,"Enlarge","Gasta 3 ossos: Ganha +1/1.",function(card){
    card.health++;
    card.baseHealth++;
    card.updateStat(1,card.health);
    // if(card.baseAttack<10){
        card.attack++;
        card.baseAttack++;
        card.updateStat(0,card.attack);
    // }
});

a_enlarge_unn.init([4,1],2,bones,"Enlarge","Gasta 2 ossos: Ganha +1/1.",function(card){
    card.health++;
    card.baseHealth++;
    card.updateStat(1,card.health);
    card.attack++;
    card.baseAttack++;
    card.updateStat(0,card.attack);
});

a_gamble.init([2,0],1,energy,"Gamble","Define o ataque para um número aleatório de 1 a 6.",function(card,_,msg){
    const old_ba=card.baseAttack;
    card.baseAttack=1+msg[0];
    card.attack+=card.baseAttack-old_ba;
    card.updateStat(0,card.attack);
},undefined,undefined,function(){return[Math.floor(Math.random()*6)];});

a_potofgreed.init([1,1],0b100,mox,"True Scholar","Se mata e compra 3 cartas.",function(me){
    game.sigilInitiatedDraw(3,me.side);
    me.die();
});

a_stimulation.init([3,1],3,energy,"Stimulate","Gasta 3 de energia: Ganha +1/1.",function(card){
    card.health++;
    card.baseHealth++;
    card.updateStat(1,card.health);
    card.attack++;
    card.baseAttack++;
    card.updateStat(0,card.attack);
});

function shuffle(array,k=array.length-1,invert=false) {
    const end=array.length-1-k;
    const s=invert? end : 0;

    for (let i = array.length-1-s; i > end-s; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function drawStat(ctx,scale,atkOrHp,stat,baseline=null){
    let color;
    if(baseline==null || stat==baseline){
        color=blackText;
    }
    else if(stat<baseline){
        color=redText;
    }
    else{
        color=greenText;
    }

    if(stat<0) stat=0;
    else if(stat>99) stat=99;
    
    let alignX=[atk_alignX,hp_alignX][atkOrHp];
    if(atkOrHp==1 && stat<10){
        alignX+=i_numbers.dims[0]+1;
    }
    let place=Math.max(1,10**Math.floor(Math.log10(stat)));
    while(place>=1){
        i_colored_nums[color].draw(ctx,scale,Math.floor(stat/place),0,alignX,stats_alignY);
        alignX+=i_numbers.dims[0]+1;
        stat%=place;
        place/=10;
    }
}

function clearStat(ctx,scale,atkOrHp,card,unsac){
    let alignX=[atk_alignX,hp_alignX][atkOrHp];
    let [cardX,cardY]=getBG(unsac);
        
    let alignY,dimY;
    if(card.statSigil!=null){
        alignY=cardHeight-1-i_stats.dims[1];
        dimY=cardHeight-alignY-1;
    }
    else{
        alignY=stats_alignY;
        dimY=i_numbers.dims[1];
    }

    ctx.drawImage(i_cards.img,
        i_cards.skip[0]*cardX+alignX, i_cards.skip[1]*cardY+alignY,
        2*i_numbers.dims[0]+1, dimY,
        alignX*scale, alignY*scale,
        (2*i_numbers.dims[0]+1)*scale, dimY*scale,
    );
}

function addTooltip(sig,tooltipEl){
    tooltipEl.addEventListener("mouseenter",function(e){
        tooltip.style.opacity=1;
        tooltip.style.visibility="visible";
        tooltip.innerHTML="";
        if(sig.name!=null){
            const h3=document.createElement("h3");
            h3.textContent=sig.name;
            tooltip.appendChild(h3);
        }
        if(sig.desc!=null){
            const p=document.createElement("p");
            p.textContent=sig.desc;
            tooltip.appendChild(p);
        }
        hoveredTT=tooltipEl;
    });

    tooltipEl.addEventListener("mousemove",function(e){
        tooltip.style.left=e.pageX+"px";
        tooltip.style.top=e.pageY+"px";
    });

    tooltipEl.addEventListener("mouseleave",function(e){
        tooltip.style.opacity=0;
        tooltip.style.visibility="hidden";
        if(hoveredTT==tooltipEl) hoveredTT=null;
    });
}

function sigilElement(sig,type="canvas"){
    const tooltipEl=document.createElement(type);
    tooltipEl.className="ttTrigger";
    if(sig.name==null && sig.desc==null) return tooltipEl;
    addTooltip(sig,tooltipEl);
    return tooltipEl;
}

class GameCard{
    getCard(){
        return this.mods?? this.card;
    }

    hasSigil(sig){
        for(let s of this.sigils){
            if(s.funcs==sig) return true;
        }
        return false;
    }

    static fromCard(g,c,unsac=false,attack=c.getAttack(),health=c.getHealth(),ba=attack,bh=health){
        let mods=null;
        if(c instanceof ModdedCard){
            if(c.atkBoost!=0 || c.hpBoost!=0 || c.extraSigs.length>0) mods=c;
            c=c.card;
        }

        let sigils=[];
        for(let i=0; i<c.getSigils().length; i++){
            sigils.push(new GameSigil(c.getSigils()[i]));
        }
        let activated=c.getActivated()? new GameActivated(c.getActivated()): null;

        const nc=new GameCard({
            game:g,
            card:c,
            attack,
            health,
            baseAttack:ba,
            baseHealth:bh,
            unsaccable:(unsac && mode==mode_exp) || c.hasSigil(s_cant_be_sacced),
            sigils: sigils,
            activated: activated
        },mods);
        return nc;
    }

    toJSON(){
        return({
            card:this.card,
            attack:this.attack,
            health:this.health,
            baseAttack:this.baseAttack,
            baseHealth:this.baseHealth,
            unsaccable:this.unsaccable,
            sigils: this.sigils,
            activated:this.activated
        })
    }

    static toSocketLen=6;
    toSocket(){
        return[
            this.card.jsonID,
            this.attack,
            this.health,
            this.baseAttack,
            this.baseHealth,
            +this.unsaccable,
        ];
    }

    constructor(params,mods=null){
        const c=params.card;
        this.card=c;
        this.attack=params.attack;
        this.health=params.health;
        this.baseAttack=params.baseAttack;
        this.baseHealth=params.baseHealth;
        this.unsaccable=params.unsaccable;
        this.sigils=params.sigils;
        this.activated=params.activated;

        this.side=null;
        this.pos=null;
        this.inGame=false;
        this.clickEvent=null;
        this.mods=mods;

        if(mods){
            for(let i=0; i<mods.extraSigs.length; i++){
                this.sigils.push(new GameSigil(mods.extraSigs[i]));
            }
        }

        const ret=c.renderAlsoReturnCtx(2,this.unsaccable,this.attack,this.health);
        this.canvas=ret.div;
        this.ctx=ret.ctx;
        this.sigilEls=ret.sigilEls;
        this.totemEls=[];
        if(this.unsaccable) this.canvas.classList.add("unsaccable");

        if(mods){
            let newEls=mods.addDrip(this.canvas);
            for(let i=0; i<newEls.length; i++){
                this.sigilEls.push(newEls[i]);
            }
        }

        if(this.activated){
            const el=this.sigilEls[0];
            el.addEventListener("click",function(){
                if(this.activated.enabled && blockActions==0){
                    blockActions++;
                    updateBlockActions();
                    const msg=this.activated.funcs.genMsg();
                    sendMsg(codeActivated+" "+[this.pos,...msg].join(" "));
                    this.activate(msg);
                    blockActions--;
                    updateBlockActions();
                }
            }.bind(this));
        }
        let i=0;
        for(let j=0; j<this.sigils.length; j++){
            if(this.sigils[j].funcs.coords!=null){
                this.sigils[j].el=this.sigilEls[i];
                i++;
            }
        }
    }

    debugInfo(){
        return this.card.name+" @("+this.side+","+this.pos+")";
    }

    activate(msg){
        //console.log("<ACTIVATING "+this.debugInfo());

        const el=this.sigilEls[0];
        el.classList.add("clicked");
        setTimeout(function(){
            el.classList.remove("clicked");
        },250);

        this.activated.funcs.func(this,this.activated.data,msg);
        this.game.resolve();

        //console.log(">ACTIVATING "+this.debugInfo());
    }

    updateStat(atkOrHp,stat){
        clearStat(this.ctx,2,atkOrHp,this.card,this.unsaccable);
        const baseline=[this.baseAttack,this.baseHealth][atkOrHp];
        drawStat(this.ctx,2,atkOrHp,stat,baseline);
    }

    play(pos,faceDown=null){
        // console.log("<PLAYING "+this.debugInfo());

        if(!hooked) spendResource(this.card.element,this.card.getCost());
        if(this.game.turn==this.game.myTurn){
            const ind=this.game.hand.indexOf(this);
            if(ind!=-1) this.game.hand.splice(ind,1);
        }
        else{
            this.game.oppCards--;
        }

        blockActions++;
        updateBlockActions();

        if(faceDown!=null){
            playCard(faceDown,1,pos,this.canvas);
        }
        else{
            this.canvas.removeEventListener("click",this.clickEvent);
            this.clickEvent=null;
            unselectCard();
            playCard(this.canvas,0,pos);
        }

        this.side=this.game.turn;
        this.pos=pos;
        this.game.board[this.side][this.pos]=this;
        if(!hooked){
            for(let l of [...this.game.playListeners[this.game.turn]]){
                // console.log("<ONPLAY ABILITY "+l.caller.debugInfo());
                l.func(l.caller,this,l.data);
                // console.log(">ONPLAY ABILITY "+l.caller.debugInfo());
            }
            for(let s of this.sigils){
                for(let f of s.funcs.onCardPlayed){
                    if(f.type==listen_me){
                        //console.log("<ONPLAY ABILITY "+this.debugInfo());
                        f.func(this,this,s.data);
                        //console.log(">ONPLAY ABILITY "+this.debugInfo());
                    }
                }
            }
        }

        this.pos=null;
        this.game.board[this.side][pos]=null;
        this.place(pos,this.game.turn,true);
        this.game.resolve();

        blockActions--;
        updateBlockActions();
        // console.log(">PLAYING "+this.debugInfo());
    }

    die(){
        this.game.deathQueue.push(this);
    }

    damage(dmg,src){
        this.game.dmgQueue.push({card: this,dmg,src});
    }

    place(pos,t=this.game.turn,from_hand=false,delay=0){
        //console.log("<PLACING "+this.debugInfo());
        this.side=t;
        let old_pos=this.pos;
        this.pos=pos;

        let prevBuff;
        if(old_pos==null){
            for(let s of this.sigils){
                s.data=s.funcs.initData(this,s);
            }
            for(let i=0; i<this.game.totemEffects[this.side].length; i++){
                applyTotem(this,i);
            }
            prevBuff=0;
        }
        else{
            prevBuff=this.game.buffs[t][old_pos];
            this.game.board[t][old_pos]=null;
        }

        this.game.board[t][pos]=this;
        if(prevBuff!=this.game.buffs[t][pos]){
            this.attack-=prevBuff;
            this.attack+=this.game.buffs[t][pos];
            this.updateStat(0,this.attack);
        }

        if(!from_hand){
            const uiTurn=+(this.side!=this.game.myTurn);
            if(old_pos==null){
                if(delay>0) setTimeout(function(){
                    materialize(this.canvas,uiTurn,pos);
                }.bind(this),delay);
                else{
                    materialize(this.canvas,uiTurn,pos);
                    this.game.sleep(250);
                }
            }
            else{
                let dur=move(this.canvas,old_pos,uiTurn,pos);
                this.game.sleep(dur);
            }
        }

        for(let s of this.sigils){
            for(let f of s.funcs.onCardMoved){
                if(f.type==listen_me){
                    //console.log("<ONMOVE ABILITY "+this.debugInfo());
                    f.func(this,old_pos,this,s.data);
                    //console.log(">ONMOVE ABILITY "+this.debugInfo());
                }
            }
        }
        for(let l of [...this.game.movementListeners[t]]){
            //console.log("<ONMOVE ABILITY "+l.caller.debugInfo());
            l.func(l.caller,old_pos,this,l.data);
            //console.log(">ONMOVE ABILITY "+l.caller.debugInfo());
        }

        if(old_pos==null){
            for(let s of this.sigils){
                this.addListener(s);
            }
        }

        this.inGame=true;
        //console.log(">PLACING "+this.debugInfo());
    }

    addListener(s,totem=null){
        for(let i=0; i<listenerRefs.length; i++){
            const listeners=s.funcs[listenerFuncs[i]];
            const pool=this.game[listenerRefs[i]];

            for(let lis of listeners){
                const obj={func: lis.func, caller: this, data: s.data, prio: lis.prio, totem: totem};
                if([listen_ally,listen_any].includes(lis.type)) pool[this.side].push(obj);
                if([listen_enemy,listen_any].includes(lis.type)) pool[1-this.side].push(obj);
            }
        }
    }

    hit(opp,alwaysBlock=false){
        for(let s of opp.sigils){
            for(let f of s.funcs.onReceivedAttack){
                if(f.type==listen_me) f.func(opp,this,opp,s.data);
            }
        }
        for(let l of [...this.game.attackListeners[opp.side]]){
            //console.log("<ONHIT ABILITY "+l.caller.debugInfo());
            l.func(l.caller,this,opp,l.data);
            //console.log(">ONHIT ABILITY "+l.caller.debugInfo());
        }

        if(alwaysBlock) this.game.canBlock=true;
        if(this.game.canBlock){
            opp.damage(this.attack,this);
        }
        else{
            this.game.tiltScales(this.attack,this,opp.pos);
            this.game.sleep(500);
        }
    }

    _attack(){
        if(this.attack<=0){
            return;
        }
        blockActions++;
        updateBlockActions();

        this.game.targets=[this.pos];
        let has_sniper=false;
        for(let s of this.sigils){
            if(s.funcs==s_sniper){
                has_sniper=true;
            }
            else if(s.funcs.modifyTargets!=null){
                s.funcs.modifyTargets(this);
            }
        }
        if(has_sniper){
            s_sniper.modifyTargets(this);
        }
        for(let i=0; i<this.game.targets.length; i++){
            const t=this.game.targets[i];
            let opp=this.game.board[1-this.game.turn][t];
            this.game.canBlock=true;
            for(let s of this.sigils){
                if(s.funcs.onDealtAttack!=null){
                    // console.log("<ONATTACK ABILITY "+this.debugInfo());
                    s.funcs.onDealtAttack(this,opp,i,s.data);
                    // console.log(">ONATTACK ABILITY "+this.debugInfo());
                }
            }

            this.game.attackTimeout=attack(this.canvas,this.pos,+(this.side==this.game.myTurn),t);
            if(opp==null){
                this.game.tiltScales(this.attack,this,t);
                this.game.sleep(500);
            }
            else{
                this.hit(opp);
            }

            this.game.attacked=opp;
            this.game.resolveDamage();
            if(!this.inGame){
                break;
            }
        }
        this.game.targets=null;
        blockActions--;
        updateBlockActions();
        if(!run) this.game.checkScales();
    }

    canPlay(){
        return checkCost(this.card.element,this.card.getCost());
    }
}

const dirs=[1,-1];
let listenerRefs=["deathListeners", "playListeners", "attackListeners", "dmgListeners", "turnEndListeners", "faceListeners", "movementListeners","drawListeners"];
let listenerFuncs=["onCardDied", "onCardPlayed", "onReceivedAttack", "onReceivedDmg", "onTurnEnded", "onFaceDmg", "onCardMoved","onCardDrawn"];
const extSource=0;
class Game{
    constructor(_manas,myTurn,tippingPoint=5,cardsPerTurn=1,lanes=4){
        this.starts=[0,lanes-1];
        this.ends=[lanes,-1];
        this.manas=_manas;
        this.lanes=lanes;
        this.cardsPerTurn=cardsPerTurn;
        this.tippingPoint=tippingPoint;

        if(run){
            this.tips=[Math.min(this.tippingPoint,run.life[0]),Math.min(this.tippingPoint,run.life[1])];
        }
        else{
            this.tips=[this.tippingPoint,this.tippingPoint];
        }

        this.board=[];
        this.buffs=[];
        for(let j=0; j<2; j++){
            this.board[j]=[];
            this.buffs[j]=[];
            for(let i=0; i<lanes; i++){
                this.board[j].push(null);
                this.buffs[j].push(0);
            }
        }

        this.myTurn=myTurn;
        let that=this;
        this.over=new Promise((resolve)=>{
            that.overProm=resolve;
        });
        this.abort=new Promise((resolve)=>{
            this.abortProm=resolve;
        });
        this.overBool=false;
        this.timeouts=new Set();

        this.deathListeners=[[],[]];
        this.playListeners=[[],[]];
        this.attackListeners=[[],[]];
        this.dmgListeners=[[],[]];
        this.turnEndListeners=[[],[]];
        this.faceListeners=[[],[]];
        this.movementListeners=[[],[]];
        this.drawListeners=[[],[]];
    }

    checkScales(){
        if(this.scales<=0 && this.scales<=-this.tips[this.myTurn] || this.scales>=0 && this.scales>=this.tips[1-this.myTurn]){
            this.itsOver();
        }
    }

    freshStart(deck,oppCardsLeft=minCards,nm=numManas,startCards=3,startMana=1){
        this.turn=0;
        this.deck=deck.slice(0);
        shuffle(this.deck);
        this.energy=[0,0];
        this.maxEnergy=[0,0];
        if(this.manas){
            this.manasLeft=[nm,nm];
        }
        else{
            this.manasLeft=[0,0];
            startCards+=startMana;
            startMana=0;
        }
        this.oppCardsLeft=oppCardsLeft;
        this.bones=[0,0];
        this.scales=0;
        this.startCards=startCards;
        this.startMana=startMana;
        this.totemEffects=[[],[]];
        this.starvation=0;
        this.energyConds=[0,0];

        this.energize();
        this.hand=[];
        this.oppCards=0;

        const startDelay=1000,cardDelay=600;
        let that=this;
        const myLen=this.deck.length,oppLen=this.oppCardsLeft
        for(let i=0; i<startCards; i++){
            this.timeout(function(){
                if(i<myLen) that.drawCard(0,that.myTurn);
                if(i<oppLen) that.drawCard(0,1-that.myTurn);
            },startDelay+i*cardDelay);
        }
        for(let i=0; i<startMana; i++){
            this.timeout(function(){
                that.drawCard(1,0);
                that.drawCard(1,1);
            },startDelay+startCards*cardDelay);
        }

        blockActions=+(this.turn!=this.myTurn);
        updateBlockActions();
    }

    initConstants(){
        this.dmgQueue=[];
        this.deathQueue=[];
        this.canBlock=true;
        this.targets=null;
        this.isResolvingDamage=false;
        this.isResolvingDeaths=false;
        this.attacked=null;
        this.attackTimeout=null;
        this.turnCount=0;

        this.BSDetector=0;
        this.necroCount=0;
        this.tombRobberPresence=false;

        for(let j=0; j<2; j++){
            updateBones(j,this);
        }
        this.updateControls();
    }

    save(){
        return{
            turn: this.turn,
            deck: this.deck,
            energy: this.energy,
            maxEnergy:this.maxEnergy,
            manasLeft: this.manasLeft,
            oppCardsLeft:this.oppCardsLeft,
            bones: this.bones,
            scales:this.scales,
            hand: this.hand,
            oppCards:this.oppCards,

            manas: this.manas,
            myTurn: this.myTurn,
            tippingPoint: this.tippingPoint
        }
    }

    sleep(ms){
        return Promise.any([new Promise((resolve) => {
            setTimeout(resolve,ms);
        }),this.over]);
    }

    timeout(fn,ms){
        if(this.overBool) return;
        let that=this;
        let id=setTimeout(function(){
            fn();
            that.timeouts.delete(id);
        },ms);
        that.timeouts.add(id);
        return id;
    }

    clrTimeout(id){
        clearTimeout(id);
        this.timeouts.delete(id);
    }

    itsOver(){
        if(this.overBool) return;
        this.overBool=true;
        this.abortProm();
        unselectCard();
        cancelHammer();
        isSaccing=true;
        hooked=false;
        clickProm=null;
        clickPromArmor=false;
        blockActions++;
        updateBlockActions();
        nuhuhSniper.style.transitionDuration="100ms";
        nuhuhSniper.style.opacity="0";
        
        if(run){
            if(this.scales<=0){
                run.life[game.myTurn]+=this.scales;
            }
            else{
                run.life[1-game.myTurn]-=this.scales;
            }
        }

        setTimeout(function(){
            fader.classList.add("fade"); 
        },250);

        setTimeout(function(){
            isDrawing[0]=false;
            cds2qs[0].clear();
            isDrawing[1]=false;
            cds2qs[1].clear();
            for (const t of this.timeouts) {
                clearTimeout(t);
            }
            clearInterval(scaleIntv);
            scalePartial=0;
            toConsume=0;
            unselectCard();
            sacCards=[];
            sacOverlays=[];

            nuhuh.style.transitionDuration="100ms";
            nuhuh.style.opacity="0";
            respQueue.clear();
            promQueue.clear();
            waiting=[];

            playScr.style.visibility="hidden";
            if(!run || (run.life[0]<=0 || run.life[1]<=0)){
                menu.style.visibility="visible";
                quitter.style.display="none";
                run=null;
            }
            else{
                run.revealedItems=[];
                run.usedQueue=[];
                run.oppUnusedItems=[];
                const oldItems=run.items;
                run.items=[];
                for(let i=0; i<oldItems.length; i++){
                    if(run.usedItems.indexOf(i)==-1){
                        run.items.push(oldItems[i]);
                    }
                }
                run.usedItems=[];

                showMap();
                updateHPs();
                updateDeck(1);
                updateItemDivs();
                mapWrapper.innerHTML="";
                // const mCanvas=renderMap();
                const mCanvas=renderMap(run.getMapLen());
                mapWrapper.appendChild(mCanvas);
                fader.style.animationDuration=fadeTimer+"ms";
            }
            fader.classList.remove("fade");
            hoveredTT=null;
            tooltip.style.opacity=0;
            tooltip.style.visibility="hidden";
            resign.classList.remove("clickedImg");

            for(let i=0; i<2; i++){
                hands[i].innerHTML="";
                for(let j=0; j<cardSpacesBase[i].length; j++){
                    cardSpacesBase[i][j].innerHTML="";
                    boardOverlaysBase[i][j].innerHTML="";
                }
                for(let j=0; j<6; j++){
                    energyBars[i][j].src="icons/energy_empty.png";
                }
            }

            this.overProm();
        }.bind(this),1500);
    }

    energize(){
        if(this.maxEnergy[this.turn]<6){
            this.maxEnergy[this.turn]++;
        }
        this.energy=[...this.maxEnergy];

        const uiTurn=+(this.turn!=this.myTurn);
        for(let i=5; i>5-this.maxEnergy[this.turn]; i--){
            energyBars[uiTurn][i].src="icons/energy_full.png";
        }
    }

    tiltScales(pow,attacker,target){
        if(attacker){
            for(let l of [...game.faceListeners[1-attacker.side]]){
                //console.log("<ONFACE ABILITY "+l.caller.debugInfo());
                pow=l.func(pow,l.caller,attacker,target,l.data);
                //console.log(">ONFACE ABILITY "+l.caller.debugInfo());
            }
        }
        this.scales+=pow*(this.turn==0? 1: -1);
        updateScale(pow*(this.turn==this.myTurn? 1: -1));
    }

    resolveDeaths(){
        if(this.isResolvingDeaths || this.deathQueue.length==0) return;
        this.isResolvingDeaths=true;

        let delay=0;
        for(let i=0; i<this.deathQueue.length; i++){
            let card=this.deathQueue[i];
            if(!card.inGame) continue;
            //console.log("<DEATH "+card.debugInfo());

            for(let s of card.sigils){
                for(let f of s.funcs.onCardDied){
                    if(f.type==listen_me){
                        //console.log("<ONDEATH ABILITY "+card.debugInfo());
                        f.func(card,card,s.data);
                        //console.log(">ONDEATH ABILITY "+card.debugInfo());
                    }
                }
            }
            card.inGame=false;

            if(card.health>0){
                die(card);
            }
            else{
                delay=250;
                this.timeout(function(){
                    die(card);
                }.bind(this),delay);
            }

            for(let ref of listenerRefs){
                for(let i=0; i<2; i++){
                    let l2=[];
                    a: for(let l of this[ref][i]){
                        for(let j=0; j<this.deathQueue.length; j++){
                            if(l.caller==this.deathQueue[j]){
                                continue a;
                            }
                        }
                        if(ref=="deathListeners" && i==card.side){
                            //console.log("<ONDEATH ABILITY "+l.caller.debugInfo());
                            l.func(l.caller,card,l.data);
                            //console.log(">ONDEATH ABILITY "+l.caller.debugInfo());
                        }
                        l2.push(l);
                    }
                    this[ref][i]=l2;
                }
            }

            if(card.pos!=null){
                if(this.board[card.side][card.pos]==card) this.board[card.side][card.pos]=null;
                this.bones[card.side]++;
            }
            //console.log(">DEATH "+card.debugInfo());
        }

        this.deathQueue=[];
        this.isResolvingDeaths=false;
        this.resolveDamage();

        updateBones(0);
        updateBones(1);
    }

    resolveDamage(){
        if(this.isResolvingDamage) return;
        if(this.dmgQueue.length==0){
            if(this.deathQueue.length>0){
                this.resolveDeaths();
            }
            return;
        }

        this.isResolvingDamage=true;
        for(let h=0; h<this.dmgQueue.length; h++){
            const card=this.dmgQueue[h].card;
            if(card.health<=0 || !card.inGame) continue;
            //console.log("<DAMAGE phase 1 "+card.debugInfo());

            for(let s of card.sigils){
                for(let f of s.funcs.onReceivedDmg){
                    this.dmgQueue[h].dmg=f.func(this.dmgQueue[h].dmg,card,card,s.data);
                }
            }

            a: for(let l of [...game.dmgListeners[card.side]]){
                for(let j=0; j<this.dmgQueue.length; j++){
                    if(l.caller==this.dmgQueue[j].card){
                        continue a;
                    }
                }
                //console.log("<ONDAMAGE ABILITY "+l.caller.debugInfo());
                this.dmgQueue[h].dmg=l.func(this.dmgQueue[h].dmg,l.caller,card,l.data);
                //console.log(">ONDAMAGE ABILITY "+l.caller.debugInfo());
            }
            //console.log(">DAMAGE phase 1 "+card.debugInfo());
        }

        let q2=[];
        for(let h=0; h<this.dmgQueue.length; h++){
            const card=this.dmgQueue[h].card;
            if(card.health>0 && card.inGame && this.dmgQueue[h].dmg>0){
                q2.push(this.dmgQueue[h]);
            }
        }

        this.dmgQueue=q2;
        let should_sleep=false;

        for(let h=0; h<this.dmgQueue.length; h++){
            const card=this.dmgQueue[h].card;
            //console.log("<DAMAGE phase 2 "+card.debugInfo());

            if(this.dmgQueue[h].src instanceof GameCard){
                for(let s of this.dmgQueue[h].src.sigils){
                    if(s.funcs.onDealtDmg!=null){
                        //console.log("<ONDEALT ABILITY "+this.dmgQueue[h].src.debugInfo());
                        this.dmgQueue[h].dmg=s.funcs.onDealtDmg(this.dmgQueue[h].dmg,this.dmgQueue[h].src,card,s.data);
                        //console.log(">ONDEALT ABILITY "+this.dmgQueue[h].src.debugInfo());
                    }
                }
            }

            card.health-=this.dmgQueue[h].dmg;
            if(card.health<=0){
                this.deathQueue.push(card);
            }

            let hp=card.health;
            if(card==this.attacked){
                this.attacked=null;
                this.timeout(function(){
                    card.updateStat(1,hp);
                },250);
                this.sleep(500);
            }
            else{
                this.timeout(function(){
                    card.updateStat(1,hp);
                },100);
                if(this.dmgQueue[h].src!=extSource){
                    damage(+(card.side!=game.myTurn),card.pos);
                    should_sleep=true;
                }
            }
            //console.log(">DAMAGE phase 2 "+card.debugInfo());
        }
        
        this.dmgQueue=[];
        this.isResolvingDamage=false;
        if(should_sleep) this.sleep(500);
        this.resolveDeaths();
    }

    resolve(isTurnEnd=false){
        this.resolveDamage();
        this.updateControls(isTurnEnd);
        this.sortListeners();
        // console.table([this.board[0].map((x)=>x?.card.name),this.board[1].map((x)=>x?.card.name)]);
    }

    sortListeners(){
        for(let i=0; i<listenerRefs.length; i++){
            const pools=this[listenerRefs[i]];

            for(let side=0; side<pools.length; side++){
                const pool=pools[side];
                for(let k=1; k<pool.length; k++){
                    let place=k-1;
                    let temp=pool[k];
                    while(place>=0){
                        if(pool[k].prio<pool[place].prio) break;
                        if(side==0){
                            if(pool[k].caller.pos>pool[place].caller.pos) break;
                        }
                        else{
                            if(pool[k].caller.pos<pool[place].caller.pos) break;
                        }
                        pool[place+1]=pool[place];
                        place--;
                    }
                    pool[place+1]=temp;
                }
            }
        }
    }

    updateControls(isTurnEnd=false){
        if(isTurnEnd != (this.turn==this.myTurn)) this.updateActivated();
        else if(this.turn==this.myTurn){
            for(let i=0; i<this.lanes; i++){
                const card=this.board[this.myTurn][i];
                if(card!=null && card.activated!=null){
                    card.sigilEls[0].classList.remove("enabled");
                }
            }
        }
    }

    addCardToHand(card,side=this.turn,func=null,justPlayed=false,unsac=false){
        let canvas,c=null;
        if(side==this.myTurn){
            c=GameCard.fromCard(this.game,card,unsac);
        }

        if(side==this.myTurn){
            this.hand.push(c);
            if(func){
                func(c);
            }
            for(let l of [...game.drawListeners[this.turn]]){
                l.func(l.caller,c,l.data);
            }
            canvas=c.canvas;

            c.clickEvent=function(){
                if(blockActions) return;

                if(c.canPlay()){
                    if(c==selectedCard) unselectCard();
                    else{
                        selectCard(c);
                    }
                }
                else{
                    c.canvas.classList.remove("shake");
                    void c.canvas.offsetHeight;
                    c.canvas.classList.add("shake");
                    setTimeout(function(){
                        c.canvas.classList.remove("shake");
                    },400)
                }
            };
            c.canvas.addEventListener("click",c.clickEvent);
            if(justPlayed==null) return c;
        }
        else{
            this.oppCards++;
            for(let l of [...game.drawListeners[this.turn]]){
                l.func(l.caller,c,l.data);
            }
            if(justPlayed==null) return c;
            canvas=copyCanvas(deckPiles[1][0]);
        }
        
        cardDrawStage2(canvas,+(side!=this.myTurn),justPlayed);
        return c;
    }

    drawCard(manaOrCard,side=this.turn){
        let card=null,cardsLeft;
        if(side==this.myTurn){
            if(manaOrCard==1){
                card=manas[this.manas[side]];
                cardsLeft=--this.manasLeft[side];
            }
            else{
                card=this.deck.pop();
                // card=c_alpha;
                cardsLeft=this.deck.length;
            }
        }
        else{
            if(manaOrCard==1){
                cardsLeft=--this.manasLeft[side];
            }
            else{
                cardsLeft=--this.oppCardsLeft;
            }
        }

        const uiSide=+(side!=this.myTurn);
        drawDeckShadow(uiSide,manaOrCard,cardsLeft);
        cardDrawStage1(uiSide,manaOrCard);
        let that=this;
        this.timeout(function(){
            that.addCardToHand(card,side);
        },500);
    }

    updateActivated(){
        for(let i=0; i<this.lanes; i++){
            const card=this.board[this.myTurn][i];
            if(card!=null && card.activated!=null){
                card.activated.enabled=card.activated.funcs.conds(card,card.activated.data,card.activated.funcs);
                if(card.activated.enabled){
                    card.sigilEls[0].classList.add("enabled");
                }
                else{
                    card.sigilEls[0].classList.remove("enabled");
                }
            }
        }
    }

    endTurn(){
        if(this.turn==this.myTurn){
            blockActions++;
            updateBlockActions();
        }
        if(this.BSDetector>0) this.BSDetector=0;
        this.tombRobberPresence=false;
        
        for(let i=game.starts[this.turn]; i!=game.ends[this.turn]; i+=dirs[this.turn]){
            if(this.board[this.turn][i]!=null){
                this.board[this.turn][i]._attack();
            }   
        }
        if(run) game.checkScales();

        for(let ref of listenerRefs){
            for(let i=0; i<2; i++){
                let l2=[];
                for(let l of game[ref][i]){
                    if(l.totem!=1-this.turn){
                        l2.push(l);
                    }
                }
                game[ref][i]=l2;
            }
        }
        for(let i=0; i<game.lanes; i++){
            const c=game.board[1-this.turn][i];
            if(c!=null){
                const discards=c.sigils.filter((x)=>x.totem);
                c.sigils=c.sigils.filter((x)=>!x.totem);

                for(let el of c.totemEls){
                    const ind=c.sigilEls.indexOf(el);
                    if(ind==-1) continue;
                    el.style.opacity=0;
                    setTimeout(function(){
                        el.remove();
                    },300);
                    if(hoveredTT==el){
                        hoveredTT=null;
                        hoveredTT.style.opacity=0;
                        hoveredTT.style.visibility="hidden";
                    }
                    c.sigilEls.splice(ind,1);
                }

                const target=c.pos;
                c.pos=null;
                for(let s of discards){
                    for(let q of s.funcs.onCardMoved){
                        if(q.type==listen_me) q.func(c,target,c,s.data);
                    }
                }
                c.pos=target;
                c.totemEls=[];
            }
        }
        this.totemEffects[1-this.turn]=[];

        for(let l of [...this.turnEndListeners[this.turn]]){
            l.func(l.caller,l.data);
        }

        this.resolve(true);

        this.turn=1-this.turn;
        this.energy[this.turn]=this.maxEnergy[this.turn];
        this.energize();
        this.turnCount++;

        // new Promise(function(resolve) {
        //     setTimeout(resolve, 350);
        // });

        if(this.turn==this.myTurn){
            if(this.deck.length==0 && this.manasLeft[this.turn]==0){
                blockActions--;
                updateBlockActions();
                game.addCardToHand(c_starvation,1-this.turn);
            }
            else{
                this.drawPrompt(Math.min(this.cardsPerTurn,this.turnCount));
            }
        }
        else{
            if(this.oppCardsLeft==0 && this.manasLeft[this.turn]==0){
                this.addCardToHand(c_starvation,1-this.turn,(sv)=>{
                    this.starvation++;
                    sv.attack=this.starvation;
                    sv.health=this.starvation;
                    sv.updateStat(0,sv.attack);
                    sv.updateStat(1,sv.health);
                });
            }
        }
    }

    drawPrompt(qty){
        const rect=myDecks.getBoundingClientRect();
        drawOverlay.style.top=rect.top-nuhuhPadding+"px";
        drawOverlay.style.left=rect.left-nuhuhPadding+"px";
        nuhuh.style.transitionDuration="300ms";
        nuhuh.style.opacity="1";

        if(run){
            const rect=gidParent.getBoundingClientRect();
            lensEl.style.top=rect.top+"px";
            lensEl.style.left=rect.left+"px";
            lensEl.classList.add("events");
        }

        let rem=Math.min(qty,this.deck.length+this.manasLeft[this.turn]);
        let that=this;
        const t=this.manas? 2: 1;
        for(let i=0; i<t; i++){
            function myFunc(){
                if(rem==0) return;
                rem--;
                if(rem==0){
                    for(let j=0; j<t; j++){
                        deckPiles[0][j].removeEventListener("click", myFunc);
                        deckPiles[0][j].style.cursor="";
                    }
                    nuhuh.style.transitionDuration="100ms";
                    nuhuh.style.opacity="0";
                    lensEl.classList.remove("events");
                }

                sendMsg(codeDecision+" "+i);
                that.drawCard(i);
                        
                if(rem==0){
                    blockActions--;
                    updateBlockActions();
                }
            }
            deckPiles[0][i].addEventListener("click",myFunc.bind(this));
            deckPiles[0][i].style.cursor="pointer";
        }
    }

    sigilInitiatedDraw(qty,side){
        if(mode==mode_exp){
            if(side==game.myTurn){
                blockActions++;
                updateBlockActions();
                this.drawPrompt(qty);
            }
        }
        else{
            const dr=Math.min(qty,side==this.myTurn? this.deck.length: this.oppCardsLeft);
            for(let i=0; i<dr; i++){
                this.drawCard(0,side);
            }
        }
    }

    opponentsTurn(){
        // console.warn("run");
        while(true){
            let msg=Promise.any([getNextMsg(),game.over]);
            if(game.overBool){
                // console.warn("stop");
                break;
            }
            let modMsg=null,customMsg=null;
            switch (msg[0]){
                case codeActivated:
                    let spl2=msg.substring(2).split(" ");
                    let actPos=parseInt(spl2[0]);
                    let actCard=this.board[game.turn][actPos];
                    actCard.activate(spl2.slice(1).map((x)=>parseInt(x)));
                    break;

                case codePlayedModded:
                    const msgs=msg.substring(2).split("\n",2);
                    modMsg=msgs[0].split(" ");
                    msg=msgs[1];
                case codePlayedCustom:
                    if(msg[0]==codePlayedCustom){
                        const msgs=msg.substring(2).split("\n",2);
                        customMsg=msgs[0].split(" ");
                        msg=msgs[1];
                    }
                case codePlayedCard:
                    const spl=msg.substring(2).split(" ");
                    const minSize=2+GameCard.toSocketLen;

                    if(spl.length>minSize){
                        for(let i=minSize; i<spl.length; i++){
                            const sacPos=parseInt(spl[i]);
                            let c=this.board[this.turn][sacPos];
                            while(c==null){
                                this.sleep(50);
                                c=this.board[this.turn][sacPos];
                            }
                            sacAnim(c,1,sacPos);
                        }
                        sacrifice();
                        game.resolve();
                        this.sleep(200);
                    }

                    let pos=parseInt(spl[0]),handPos=parseInt(spl[1]),id=parseInt(spl[2]),attack=parseInt(spl[3]),health=parseInt(spl[4]),ba=parseInt(spl[5]),bh=parseInt(spl[6]),unsac=parseInt(spl[7]);

                    let faceDown;
                    out: while(true){
                        const ch=hands[1].children;
                        for(let i=0,j=0; i<ch.length; i++){
                            if(!ch[i].classList.contains("ghostCard")){
                                if(j==handPos){
                                    faceDown=ch[j];
                                    break out;
                                }
                                j++;
                            }
                        }
                        new Promise((resolve)=>{
                            drawProm=resolve;
                        });
                    }
                    drawProm=null;

                    let card;
                    if(customMsg!=null){
                        let atk=parseInt(customMsg[0]),hp=parseInt(customMsg[1]),cost=parseInt(customMsg[2]),element=parseInt(customMsg[3]);
                        let sigs=[];
                        for(let i=4; i<customMsg.length; i++){
                            const id=parseInt(customMsg[i]);
                            sigs.push(allSigils[id]);
                        }
                        card=new Card();
                        card.init("Dr. Fire Esq.",cost,atk,hp,element,sigs,null,[5,16],false,true);
                    }
                    else{
                        card=allCards[id];
                    }

                    if(modMsg!=null){
                        card=new ModdedCard(card);
                        for(let i=0; i<modMsg.length; i++){
                            const id=parseInt(modMsg[i]);
                            card.extraSigs.push(allSigils[id]);
                        }
                    }

                    const c=GameCard.fromCard(this,card,unsac==1,attack,health,ba,bh);
                    if(id!=-1 && attack!=allCards[id].attack){
                        c.updateStat(0,attack);
                    }
                    if(id!=-1 && health!=allCards[id].health){
                        c.updateStat(1,health);
                    }
                    c.play(pos,faceDown);
                    break;

                case codeHammered:
                    let hammeredPos=parseInt(msg.substring(2));
                    let hammeredCard=this.board[game.turn][hammeredPos];
                    hammeredCard.damage(25,extSource);
                    game.resolve();
                    break;

                case codeEndedTurn:
                    this.endTurn();
                    // console.warn("turn");
                    // setTimeout(bandaid,500);
                    bandaid();
                    return;
                
                case codeDecision:
                    let manaOrDeck=parseInt(msg.substring(2));
                    this.drawCard(manaOrDeck);
                    break;

                case codeBoneBounty:
                    game.bones[this.turn]+=400;
                    updateBones(this.turn,this);
                    break;

                case codeItem:
                    let ss=msg.substring(2);
                    let itemID=parseInt(ss);
                    let startPos=ss.indexOf(" ");

                    const it=itemTypes[itemID];
                    let ind=run.oppUnusedItems.indexOf(itemID);
                    if(ind==-1){
                        ind=maintainOppItems();
                        run.oppUnusedItems.push(null);
                        run.revealedItems.push(itemID);
                        const el=sigilElement(it,"img");
                        el.src=it.file.src;
                        theirItems[ind].appendChild(el);
                    }
                    else{
                        run.oppUnusedItems[ind]=null;
                    }
                    run.usedQueue.push(itemID);
                    it.theirFunc(ind,startPos==-1? null: ss.substring(startPos+1).split(" ").map(x=>parseInt(x)));
                    break;
                
                case codeShowMe:
                    let msg2=codeDecision+" ";
                    for(let i=0,first=true; i<run.items.length; i++){
                        if(run.usedItems.indexOf(i)==-1){
                            if(first){
                                first=false;
                            }
                            else{
                                msg2+=" ";
                            }
                            msg2+=run.items[i].id;
                        }
                    }

                    for(let i=0; i<this.hand.length; i++){
                        const card=this.hand[i];
                        msg2+="\n"+card.attack+" "+card.health+" "+card.card.jsonID+" "+(+card.unsaccable);
                        if(card.card.jsonID==-1){
                            msg2+=" "+card.card.cost+" "+card.card.element;
                            for(let i=0; i<card.card.sigils.length; i++){
                                const s=card.card.sigils[i];
                                msg2+=" "+s.id;
                            }
                        }
                        if(card.mods){
                            msg2+="/";
                            for(let i=0; i<card.mods.extraSigs.length; i++){
                                const s=card.mods.extraSigs[i];
                                if(i>0) msg2+=" ";
                                msg2+=s.id;
                            }
                        }
                    }
                    sendMsg(msg2);
                
                case codeDeleteOffer:
                    break;

                default:
                    throw new Error("Unknown code("+msg+")");
            }
        }
    }

    updateBuffs(side,pos,qtd){
        this.buffs[side][pos]+=qtd;
        const aff=this.board[side][pos];
        if(aff!=null){
            aff.attack+=qtd;
            aff.updateStat(0,aff.attack);
        }
    }
}

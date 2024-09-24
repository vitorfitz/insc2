"use strict"

let run;
class Run{
    constructor(myTurn,tippingPoint=5,cardsPerTurn=1,lifeTotal=25,lanes=4){
        this.tippingPoint=tippingPoint;
        this.cardsPerTurn=cardsPerTurn;
        this.lifeTotal=lifeTotal;
        this.lanes=lanes;
        this.myTurn=myTurn;
        this.manas=[-1,-1];

        this.over=new Promise((resolve)=>{
            this.overProm=resolve;
        });
        this.overBool=false;
    }

    async freshStart(){
        this.life=[this.lifeTotal,this.lifeTotal];
        this.deck=[];
        this.fdeck=[];
        this.items=[];
        this.usedItems=[];
        this.revealedItems=[];
        this.oppUnusedItems=[];
        this.usedQueue=[];
        this.customCards=[];
        arenaDeck.innerHTML="";
        this.oppDeckSize=10;
        this.poisoned=false;

        mapWrapper.innerHTML="";
        const mCanvas=await renderMap();
        mapWrapper.appendChild(mCanvas);
    }

    getMapLen(){
        return 1;
        const dif=run.life[0]-run.life[1];
        if(dif>=20){
            return 0;
        }
        else if(run.life[0]==run.lifeTotal && dif==0 || dif<=-10){
            return 2;
        }
        else return 1;
    }
}

let cleanup=null;

const fadeTimer=500;
function addDrip(extraSigs,canvas,scale=2){
    if(extraSigs.length==0) return[];

    let els=[];
    const tagHolder=document.createElement("div");
    tagHolder.className="tagBearer";
    canvas.appendChild(tagHolder);

    for(let i=0; i<extraSigs.length; i++){
        const bgDiv=document.createElement("div");
        bgDiv.style.height=10*scale+"px";
        bgDiv.style.width=15*scale+"px";
        bgDiv.style.paddingLeft=2*scale+"px";
        if(i!=extraSigs.length-1) bgDiv.style.marginBottom=scale/8*i_sigils.dims[1]+"px";
        tagHolder.appendChild(bgDiv);

        const tapeClone=tapeImg.cloneNode();
        bgDiv.appendChild(tapeClone);

        const el=sigilElement(extraSigs[i]);
        els.push(el);
        bgDiv.appendChild(el);
        el.width=scale/2*i_sigils.dims[0];
        el.height=scale/2*i_sigils.dims[1];

        i_sigils.draw(el.getContext("2d"),scale/2,...extraSigs[i].coords,0,0);
    }
    return els;
}

const tapeImg=new Image();
tapeImg.src="icons/tape.png";
class ModdedCard{
    constructor(c){
        this.card=c;
        this.atkBoost=0;
        this.hpBoost=0;
        this.extraSigs=[];
        this.inUse=true;
        // this.extraAct=null;
    }

    getHealth(){return this.hpBoost+this.card.getHealth();}
    getAttack(){return this.atkBoost+this.card.getAttack();}
    getCost(){return this.card.cost;}
    getElement(){return this.card.element;}
    getVisibleSigils(){return [...this.extraSigs,...this.card.getVisibleSigils()];}

    addDrip(canvas,scale=2){
        return addDrip(this.extraSigs,canvas,scale);
    }

    renderAlsoReturnCtx(scale){
        let c=this.card.renderAlsoReturnCtx(scale,undefined,this.card.attack+this.atkBoost,this.card.health+this.hpBoost);
        this.addDrip(c.div,scale);
        return c;
    }

    render(scale){
        return this.renderAlsoReturnCtx(scale).div;
    }
}

const cardSelect=document.querySelector("#card_choice");
function newRun(otherJSON,configs){
    lensEl.style.display="";
    run=new Run(otherJSON.myTurn,configs.tippingPoint,configs.cardsPerTurn,configs.lifeTotal);
    mode=mode_exp;
    run.freshStart();
    updateHPs();
    updateDeck(1);
    updateItemDivs();
    // cardPick(10,3,buffedCards);
    cardPick(10,0,randomCards);
    fader.style.animationDuration=fadeTimer+"ms";
    quitter.style.display="";
}

const pick3=document.querySelector("#pick3");
const ccShadow=document.querySelector("#ccShadow");
const ccOverlay=drawNuhuh(pick3.offsetWidth+2*100,pick3.offsetHeight+2*100,100,80);
ccShadow.appendChild(ccOverlay);

const pickSpaces=pick3.querySelectorAll(".cardSpace");
let presentedCards=[];
let halt=false;

for(let i=0; i<pickSpaces.length; i++){
    pickSpaces[i].addEventListener("click",function(){
        if(halt) return;
        if(trialMode){
            playTrial(i);
        }
        else if(cardPickPos==cardPickEls.length && run.manas[0]==-1){
            if(i==1){
                run.manas[0]=0;
            }
            else if(i==2){
                run.manas[0]=1;
            }
            stopPicking(true);
        }
        else if(presentedCards[i]){
            const card=presentedCards[i];
            presentedCards[i]=null;
            run.deck.push(card);
            // cardPickEls[cardPickPos].appendChild(presentedCards[i].render(2));
            let pos=cardPickPos;
            cardPickPos++;

            const origRect=centerRect(pickSpaces[i].getBoundingClientRect());
            const targetRect=centerRect(cardPickEls[pos].getBoundingClientRect());
            const trans=createTransporter(pickSpaces[i].firstElementChild,null,origRect,targetRect,cardSelect,-1,0.5);
            hoveredTT=null;
            tooltip.style.opacity=0;
            tooltip.style.visibility="hidden";
            halt=true;

            setTimeout(function(){
                cardPickEls[pos].appendChild(card.render(2));
                trans.remove();
                halt=false;
                if(pos!=cardPickEls.length-1){
                    presentCards();
                }
            },250);

            if(cardPickPos==cardPickEls.length){
                if(run.manas[0]==-1){
                    setTimeout(function(){
                        pick3.style.width=pick3.offsetWidth+"px";
                        pickSpaces[0].style.display="none";
                        rerollEl.style.display="none";
                        pickSpaces[1].innerHTML="";
                        pickSpaces[1].appendChild(c_squirrel.render(4));
                        pickSpaces[2].innerHTML="";
                        pickSpaces[2].appendChild(c_skeleton.render(4));
                    },250);
                }
                else{
                    stopPicking(); 
                }
            }
        }
    });
}

function randomCards(){
    const copy=[...cards];
    shuffle(copy,pickSpaces.length);
    return copy.slice(cards.length-pickSpaces.length).map((x)=>new ModdedCard(x));
}

function presentCards(){
    if(trialMode){
        showTrials();
    }
    else{
        presentedCards=generate();
        for(let i=0; i<presentedCards.length; i++){
            const c=presentedCards[i].render(4);
            pickSpaces[i].innerHTML="";
            pickSpaces[i].appendChild(c);
        }
    }
}

function pickCleanup(delayRemoval){
    presentedCards=[];
    halt=false;
    trialMode=false;
    arenaDeck.innerHTML="";
    cardSelect.style.visibility="hidden";
    if(delayRemoval){
        for(let i=0; i<pickSpaces.length; i++){
            pickSpaces[i].innerHTML="";
        }
    }
}

function stopPicking(delayRemoval=false){
    if(!delayRemoval){
        for(let i=0; i<pickSpaces.length; i++){
            pickSpaces[i].innerHTML="";
        }
        cleanup=function(){pickCleanup(false);};
    }
    fader.classList.add("fade");
    setTimeout(function(){
        showMap();
    },fadeTimer);
}

const arenaDeck=document.createElement("div");
arenaDeck.id="arena_deck";
const arenaDeckCC=document.querySelector("#arena_deck_cc");
let cardPickPos=0;
let cardPickEls=[];
let generate;
let rerolls;
let trialMode=false;
const rerollEl=document.querySelector("#reroll");
const rerollArrow=rerollEl.querySelector("#arrow");
const rerollDoor=rerollEl.querySelector("#door");
const rerollSpan=rerollEl.querySelector("span");

function updateReroll(){
    if(rerolls==0){
        if(run.manas[0]!=-1){
            rerollArrow.style.display="none";
            rerollDoor.style.display="";
            rerollSpan.textContent="Sair";
            rerollEl.style.display="";
        }  
        else{
            rerollEl.style.display="none";
        }
    }
    else{
        rerollEl.style.display="";
        rerollSpan.textContent="x"+rerolls;
        rerollArrow.style.display="";
        rerollDoor.style.display="none";
    }
}

rerollEl.addEventListener("click",function(){
    if(rerolls==0){
        stopPicking();
    }
    else{
        presentCards();
        rerolls--;
        updateReroll();
    }
});

function cardPick(n,rr=0,gen=randomCards){
    map.style.visibility="hidden";
    cardSelect.style.visibility="visible";
    cardPickPos=0;
    cardPickEls=[];
    generate=gen;
    rerolls=rr;
    pickSpaces[0].style.display="";
    arenaDeckCC.appendChild(arenaDeck);
    calcMargin(arenaDeck,run.fdeck.length,5,1000);
    cardPickPt2(n);
}

function cardPickPt2(n){
    cleanup=function(){pickCleanup(true);};
    updateReroll();
    for(let i=0; i<run.fdeck.length; i++){
        arenaDeck.appendChild(run.fdeck[i].render(2));
    }
    for(let i=0; i<n; i++){
        cardPickEls.push(document.createElement("div"));
        cardPickEls[i].style.marginLeft="5px";
        arenaDeck.appendChild(cardPickEls[i]);
    }
    presentCards();
}

const map=document.querySelector("#map");
const mapWrapper=map.querySelector("#wrapwrapwrap");

function genMapModel(len=2, width=3, conns=3){
    let mm=[];
    let vis=new Array(width).fill(true);
    let visCount=3;

    for(let i=0; i<len; i++){
        let possible=[];
        mm[i]=[];

        for(let j=0; j<width; j++){
            if(vis[j]){
                const end=Math.min(width-1,j+1);
                for(let k=Math.max(0,j-1); k<=end; k++){
                    possible.push([j,k]);
                }
            }
            mm[i][j]=[];
        }

        shuffle(possible);
        let banned=new Array(width-1).fill(-2);
        let picked=[];
        let skipped=[];
        let exited=new Array(width).fill(0);
        let repeatThresh=visCount;
        let qtd=0;

        for(let j=0; j<possible.length && qtd<conns; j++){
            const v=possible[j];
            if(exited[v[0]]){
                if(repeatThresh>=width){
                    continue;
                }
                else{
                    repeatThresh++;
                }
            }

            if(v[0]!=v[1]){
                const banIndex=Math.min(v[0],v[1]);
                if(banned[banIndex]==-1){
                    continue;
                }
                else if(banned[banIndex]>=0){
                    skipped.push(banned[banIndex]);
                    exited[possible[banned[banIndex]][0]]--;
                    picked.push(j);
                    exited[v[0]]++;
                }
                else{
                    picked.push(j);
                    qtd++;
                    exited[v[0]]++;
                    banned[banIndex]=-1;
                    // if(v[0]==0 || v[0]==width-1){
                    //     banned[banIndex]=-1;
                    // }
                    // else{
                    //     banned[banIndex]=j;
                    // }
                }
            }
            else{
                picked.push(j);
                qtd++;
                exited[v[0]]++;
            }
        }

        const oldVis=[...vis];
        visCount=0;
        vis.fill(false);
        let removeOne=-1;

        for(let j=0; j<width; j++){
            if(exited[j]==0 && oldVis[j]){
                mm[i][j].push(j);
                vis[j]=true;
                visCount++;

                if(qtd>=conns){
                    for(let k=0; k<width; k++){
                        if(exited[k]>=2){
                            removeOne=k;
                            exited[k]--;
                            qtd--;
                        }
                    }
                }
            }
        }

        if(qtd+visCount==2 && width==3 && oldVis[1]){
            mm[i][1].push(1);
            if(!vis[1]){
                vis[1]=true;
                visCount++;
            }
        }

        for(let j=0,s=0; j<picked.length; j++){
            if(s<skipped.length && skipped[s]==j){
                s++;
            }
            else{
                const v=possible[picked[j]];
                if(v[0]==removeOne){
                    removeOne=-1;
                    continue;
                }

                mm[i][v[0]].push(v[1]);
                if(!vis[v[1]]){
                    vis[v[1]]=true;
                    visCount++;
                }
            }
        }
    }

    return mm;
}

function has(pe,sigil){
    return pe.sigils.indexOf(sigil)!=-1;
}

let sigilEstimates={};
{
    const se=sigilEstimates;
    se[s_bomb.id]={mod:(pe)=>{
        pe.additiveExt+=7.5;
        if(pe.hp<=5){
            if(has(pe,s_flying)) pe.offense*=0.75;
            else pe.offense*=0.3;
            pe.defense*=0.3;
        }
        else{
            pe.defense*=(pe.hp-5)/pe.hp;
        }
    }};
    se[s_digger.id]={mod:(pe)=>{
        pe.additive+=0.5;
        pe.presence+=0.2;
    }};
    se[s_brittle.id]={uselessAt0: true,mod:(pe)=>{
        if(pe.attack>0) pe.defense=0;
    }};
    se[s_bifurcated.id]={uselessAt0: true,mod:(pe)=>{
        if(has(pe,s_flying)) pe.offense*=1.96;
        else{
            pe.offense*=1.8;
            if(!has(pe,s_aquatic)) pe.additive+=((0.5+pe.defense)*(0.5+pe.offense))*0.08;
        }
    }};
    se[s_extra_attack.id]={uselessAt0: true,ea:(pe)=>{
        if(has(pe,s_flying)) pe.offense*=2.06;
        else if(has(pe,s_death_touch)) pe.offense+=pe.offense/pe.dt*1.13;
        else pe.offense*=2.2;
    }};
    se[s_death_touch.id]={uselessAt0: true,mod:(pe)=>{
        if(pe.attack==0) {
            if(has(pe,s_quills)) pe.additive+=3.75;
            pe.dt=1; return;
        };
        if(has(pe,s_flying)) pe.dt=1+0.1/(pe.attack*(pe.attack+1)/2);
        else if(has(pe,s_bifurcated)) pe.dt=1+1.5/(pe.attack*(pe.attack+1)/2);
        else pe.dt=1+2/(pe.attack*(pe.attack+1)/2);
        pe.offense*=pe.dt;
    },boost:(pe)=>{
        if(has(pe,s_sidestep) || has(pe,s_push) || has(pe,s_sq_spawner) || has(pe,s_skele_spawner) || has(pe,s_burrow) || has(pe,s_guardian)) pe.additive+=Math.max(0,Math.min(2.2,pe.dt-0.333)*pe.defense*0.2);
    }};
    se[s_double_death.id]={mod:(pe)=>{
        pe.additiveExt+=3.9;
        pe.presence+=0.7;
    }};
    se[s_fecundity.id]={ext:(pe)=>{
        pe.additiveExt+=Math.max(5,3+6.5/pe.res);
    }};
    se[s_undying.id]={ext:(pe)=>{
        if(has(pe,s_worthy)) pe.additiveExt+=Math.max(5,3+6.5/pe.res);
        else if(!has(pe,s_fecundity)) pe.additiveExt+=Math.max(1.5+6.5/pe.res,Math.min(pe.defense*0.3,1)+5*(0.77**((has(pe,s_aquatic)? 2: 1)*(pe.defense-0.5)+1)));
        else pe.additiveExt+=0.5;
    }};
    se[s_sq_spawner.id]={mod:(pe)=>{
        if(!has(pe,s_dam)) pe.additive+=0.8;
        pe.presence+=0.4;
    }};
    se[s_skele_spawner.id]={mod:(pe)=>{
        if(!has(pe,s_dam)) pe.additive+=0.8;
        pe.presence+=0.6;
    }};
    se[s_rabbit.id]={ext:(pe)=>{
        pe.additiveExt+=2;
    }};
    se[s_explosive.id]={ext:(pe)=>{
        pe.additiveExt+=Math.max(0,5-pe.res/2);
    }};
    se[s_flying.id]={uselessAt0: true,boost:(pe)=>{
        if(pe.offense!=0) pe.additive+=((0.5+pe.defense)*(0.5+pe.offense))*0.28;
    }};
    se[s_energy.id]={ext:(pe)=>{
       pe.res+=2.5/2**(pe.res/7.5+0.5);
    }};
    se[s_push.id]={};
    se[s_bones.id]={boost:(pe)=>{
        pe.additive+=3-3*(1-0.7**pe.defense);
    }};
    se[s_reach.id]={boost:(pe)=>{
        if(!has(pe,s_aquatic)){
            if(has(pe,s_burrow)) pe.additive+=(pe.defense+1/3)/5;
            else pe.additive+=(pe.defense+1)/8;
        }
    }};
    se[s_sidestep.id]={boost:(pe)=>{
        if(!has(pe,s_burrow) && !has(pe,s_guardian) && !has(pe,s_sq_spawner) && !has(pe,s_skele_spawner) && !has(pe,s_push) && !has(pe,s_dam) && !(has(pe,s_death_touch) && pe.attack>0)) pe.additive+=pe.defense/8;
    }};
    se[s_guardian.id]={};
    se[s_free_sac.id]={mod:(pe)=>{
        if(pe.hp>1){
            const f=1-1/2**(pe.hp);
            if(has(pe,s_worthy)){
                pe.additiveExt+=11.25*f;
                pe.presence+=4;
                pe.defense/=4;
            }
            else{
                pe.additiveExt+=1.6*f+pe.hp*0.4;
                pe.presence+=0.5;
                pe.defense/=2;
            }
        }
    }};
    se[s_quills.id]={boost:(pe)=>{
        if(!has(pe,s_aquatic) && !(has(pe,s_brittle) && pe.attack>0)){
            if(has(pe,s_death_touch)){
                if(!has(pe,s_burrow)){
                    pe.additive+=((1+pe.defense)*(Math.max(1-5*(pe.defense),0)+pe.offense/pe.dt))*0.4;
                }
            }
            else{
                if(has(pe,s_burrow)){
                    pe.additive+=(pe.defense+0.5+1.5**Math.min(10,pe.defense)/15)*0.64;
                }
                else{
                    pe.additive+=pe.defense*0.25+0.5;
                }
            }
        }
    }};
    se[s_aquatic.id]={aquatic:(pe)=>{
        if(!(has(pe,s_brittle) && pe.attack>0)){
            pe.defense=pe.offense+pe.presence+0.1*(pe.hp-1);
            if(has(pe,s_stinky)) pe.defense*=1.7;
            pe.additive+=pe.presence*4;
        }
    }};
    se[s_worthy.id]={ext:(pe)=>{
        if(!(has(pe,s_free_sac) && pe.hp>1)) pe.res+=6.5/2**((pe.res-pe.hp/pe.res*2)/6.5)+(pe.hp>5? 0: Math.max(0,((5-pe.hp)**1.5)*0.15));
    }};
    se[s_tutor.id]={boost:(pe)=>{
        pe.additiveExt+=6;
    }};
    se[s_burrow.id]={mod:(pe)=>{
        pe.defense*=0.75;
    },boost:(pe)=>{
        if(!has(pe,s_aquatic)){
            let mult=0.9;
            if(has(pe,s_death_touch) && has(pe,s_quills)) {mult+=1.2; pe.additive-=Math.min(pe.defense,2);}
            if(has(pe,s_beehive)) mult+=0.5;
            pe.additive+=mult*(pe.defense+(1.5**Math.min(13,pe.defense*mult))/60);
        }
    }};
    se[s_sniper.id]={uselessAt0: true,boost:(pe)=>{
        if(pe.offense!=0){
            if(!has(pe,s_flying)) pe.additive+=((1+pe.defense)*(1+pe.offense))*0.36;
            else pe.additive+=(pe.offense)*0.2;
        }
    }};
    se[s_dam.id]={boost:(pe)=>{
        if(has(pe,s_alpha)) pe.additiveExt+=3.7;
        else if(has(pe,s_explosive)) pe.additiveExt+=1.6;
        else pe.additiveExt+=3.2;
    }};
    se[s_alpha.id]={mod:(pe)=>{
        pe.additive+=1.8;
        if(has(pe,s_guardian) || has(pe,s_burrow)) pe.presence+=0.3;
        else pe.presence+=0.6;
    }};
    se[s_stinky.id]={mod:(pe)=>{
        pe.defense*=1.7;
        pe.additive+=1;
    }};
    se[s_beehive.id]={mod:(pe)=>{
        if(!has(pe,s_aquatic) && !(has(pe,s_brittle) && pe.attack>0)){
            pe.additive+=((pe.defense+0.5)**0.55)*2.2;
        }
    }};
}

const eligibleCards=[];
a: for(let i=0; i<cards.length; i++){
    if(cards[i].activated) continue;
    for(let j=0; j<cards[i].sigils.length; j++){
        if(!(cards[i].sigils[j].id in sigilEstimates)){
            continue a;
        }
    }
    eligibleCards.push(cards[i]);
}

const eligibleSigils=[];
for(let id in sigilEstimates){
    eligibleSigils.push(allSigils[id]);
}

class PowerEstimate{
    constructor(atk,hp,sigils=[]){
        this.attack=atk;
        this.hp=hp;
        this.offense=atk;
        this.presence=0;
        this.defense=hp;
        this.additive=0;
        this.additiveExt=0;
        this.multiplicative=1;
        this.sigils=sigils;
    }
    calc(){
        let s=[];
        for(let i=0; i<this.sigils.length; i++){
            const se=sigilEstimates[this.sigils[i].id];
            if(se){
                s.push(se);
            }
        }

        for(let i=0; i<s.length; i++){
            if(s[i].mod) s[i].mod(this);
        }
        for(let i=0; i<s.length; i++){
            if(s[i].ea) s[i].ea(this);
        }
        for(let i=0; i<s.length; i++){
            if(s[i].aquatic) s[i].aquatic(this);
        }
        for(let i=0; i<s.length; i++){
            if(s[i].boost) s[i].boost(this);
        }

        if(this.offense==0 && !has(this,s_beehive)) this.offense=Math.max(0,8-this.defense)/(15+30*this.presence);
        let res=(this.offense*2.5)+this.defense*1;
        let excessHP=Math.abs(this.defense-this.offense);
        if(this.offense>this.defense) excessHP*=2.5;
        excessHP+=Math.abs(this.defense-this.offense);
        excessHP*=8;
        excessHP/=10+2*res;
        excessHP+=0.8;
        if(excessHP>0){
            res-=5*excessHP;
            res+=5*(0.95**excessHP-1)/(0.95-1);
        }

        if(this.offense>5) res+=(this.offense-5)**2.2/10;
        res+=this.additive;
        res+=this.defense*(this.presence);
        if(res<3) res+=(3-res)/2;
        this.res=res;

        for(let i=0; i<s.length; i++){
            if(s[i].ext) s[i].ext(this);
        }
        this.res+=this.additiveExt;
        this.res*=this.multiplicative;
        return this.res;
    }
}

function correctPE(est,chosenEl,chosenCost,sigilObjs){
    const isSus=sigilObjs.indexOf(s_fecundity)!=-1 || sigilObjs.indexOf(s_undying)!=-1;
    if(isSus){
        if(chosenCost==1 && chosenEl==blood){
            return est*1.5;
        }
        else if(chosenCost<=3 && chosenEl==blood && sigilObjs.indexOf(s_worthy)!=-1){
            return est*1.5;
        }
        else if(chosenCost<=1 && chosenEl==bones){
            return est*1.5;
        }
        else if(chosenCost<=3 && chosenEl==bones && sigilObjs.indexOf(s_dam)!=-1){
            return est*1.5;
        }
        else if(chosenCost<=4 && chosenEl==bones && sigilObjs.indexOf(s_bones)!=-1){
            return est*1.5;
        }
    }
    return est;
}

const costToPower=[
    [3,4.5,6,7.5,9,11,13,15,17,19,21,23,25],
    [3,6.5,9.5,14.5,25],
    [3,3.5,4.5,5.5,7,8.5,10]
];
function elToPosition(el){
    switch(el){
        case bones: return 0;
        case blood: return 1;
        case energy: return 2;
    }
}

const forbiddenCombos={};
function addForbidden(s1,s2){
    forbiddenCombos[s1.id]=s2;
    forbiddenCombos[s2.id]=s1;
}
addForbidden(s_skele_spawner,s_sq_spawner);
addForbidden(s_bomb,s_dam);

function checkAllowed(sigs){
    for(let i=0; i<sigs.length; i++){
        const fc=forbiddenCombos[sigs[i].id];
        if(fc && sigs.indexOf(fc)!=-1) return false;
    }
    return true;
}

const numMono=5;
const numDual=5;
function buffedCards(){
    const copy=[...eligibleCards];
    shuffle(copy,pickSpaces.length);
    const picks=copy.slice(eligibleCards.length-pickSpaces.length);
    let results=[];

    for(let i=0; i<picks.length; i++){
        let sCopy=[];
        for(let j=0; j<eligibleSigils.length; j++){
            const s=eligibleSigils[j];
            if(s!=s_skele_spawner && !(picks[i].attack==0 && sigilEstimates[s.id].uselessAt0) && picks[i].sigils.indexOf(s)==-1){
                sCopy.push(s);
            }
        }

        // console.log(picks[i]);
        // picks[i]=c_477;
        let basePower=costToPower[elToPosition(picks[i].element)][picks[i].cost];
        let minThresh=(basePower)*1.24;
        let maxThresh=(basePower)*1.36;
        // console.log(minThresh,maxThresh);

        let combos=[];
        for(let j of sCopy){
            const together=[j,...picks[i].sigils];
            if(checkAllowed(together)){
                const ev=correctPE((new PowerEstimate(picks[i].attack,picks[i].health,together)).calc(),picks[i].element,picks[i].cost,together);
                if(ev>=minThresh && ev<=maxThresh){
                    for(let i=0; i<numMono; i++){
                        combos.push([j]);
                        if(j==s_burrow) for(let i=0; i<3; i++) combos.push([j]);
                        if(j==s_tutor) for(let i=0; i<3; i++) combos.push([j]);
                        if(j==s_flying) for(let i=0; i<3; i++) combos.push([j]);
                    }
                }
            }
        }
        for(let j=0; j<numDual*sCopy.length;){
            shuffle(sCopy,2);
            const combo=sCopy.slice(sCopy.length-2);
            const together=[...combo,...picks[i].sigils];
            if(checkAllowed(together)){
                const ev=correctPE((new PowerEstimate(picks[i].attack,picks[i].health,together)).calc(),picks[i].element,picks[i].cost,together);
                if(ev>=minThresh && ev<=maxThresh){
                    combos.push(combo); 
                    if(combo.indexOf(s_brittle)!=-1) {for(let i=0; i<19; i++) combos.push(combo)};
                    if(combo.indexOf(s_burrow)!=-1) for(let i=0; i<3; i++) combos.push(combo);
                    if(combo.indexOf(s_tutor)!=-1) for(let i=0; i<3; i++) combos.push(combo);
                    if(combo.indexOf(s_flying)!=-1) for(let i=0; i<3; i++) combos.push(combo);
                }
                j++;
            }
        }
        // console.log(combos);

        let choice=[];
        if(combos.length>0){
            choice=combos[Math.floor(Math.random()*combos.length)];
        }
        const modded=new ModdedCard(picks[i]);
        modded.extraSigs=choice;
        results.push(modded);
    }

    return results;
}

let nodeTypes=[];
let imgMap={};
class NodeType{
    constructor(name,desc,src,fn,lots=()=>1){
        this.name=name;
        this.desc=desc;
        this.fn=fn;
        this.lots=lots;
        this.id=nodeTypes.length;
        nodeTypes.push(this);

        if(!(src in imgMap)){
            imgMap[src]=new ImgWrapper("map/"+src);
        }
        this.src=imgMap[src];
    }
}

class ImgWrapper extends Image{
    constructor(src){
        super();
        this.src=src;
        this.loaded=new Promise((resolve)=>{
            this.onload=resolve;
        });
    }
}

const waitSpan=document.querySelector("#mcWrapper span");

const cardNode=new NodeType("Card Choice","Adicione 2 cartas ao seu deck.","pick_card.webp",async function(){
    fader.classList.add("fade");
    await new Promise((resolve)=>setTimeout(function(){
        fader.classList.remove("fade");
        cardPick(2,5);
        resolve();
    },fadeTimer));
},()=>4);

const battleNode=new NodeType("Batalha",null,"battle.webp",function(){
    (async function(){
        waitSpan.style.display="inline-flex";
        sendMsg(codeDecision+" "+run.fdeck.length+" "+run.manas[0]);
        let msg=await Promise.any([getNextMsg(),run.over]);
        waitSpan.style.display="";
        if(run.overBool) return;

        let spl=msg.substring(2).split(" ");
        run.oppDeckSize=parseInt(spl[0]);
        if(spl.length>1) run.manas[1]=parseInt(spl[1]);
        
        fader.classList.add("fade");
        await new Promise((resolve)=>setTimeout(function(){
            fader.classList.remove("fade");
            map.style.visibility="hidden";
            fader.style.animationDuration="";
            resolve();
        },fadeTimer));

        if(game) await game.over;
        if((run.life[0]<=3) != (run.life[1]<=3)){
            if(run.life[0]<=3) run.myTurn=0;
            else if(run.life[1]<=3) run.myTurn=1;
        }
        game=new Game(run.myTurn==0? run.manas: [run.manas[1],run.manas[0]],run.myTurn,run.tippingPoint,run.cardsPerTurn);
        game.freshStart(run.fdeck,run.oppDeckSize,10);
        game.initConstants();
        playScreen();
        run.myTurn=1-run.myTurn;
    })();
},()=>0);

const trialNode=new NodeType("Deck Trial","Escolha uma categoria, se seu deck passar nela você ganha uma carta OP.","trial.webp",async function(){
    fader.classList.add("fade");
    await new Promise((resolve)=>setTimeout(function(){
        fader.classList.remove("fade");
        trialMode=true;
        cardPick(0,1,buffedCards);
        resolve();
    },fadeTimer));
},()=>2);
const buildNode=new NodeType("Build-a-Card","Crie uma carta e adicione ao seu deck.","build.webp",async function(){
    fader.classList.add("fade");
    await new Promise((resolve)=>setTimeout(function(){
        fader.classList.remove("fade");
        letsBuildACard();
        resolve();
    },fadeTimer));
},()=>1);
const fireNode=new NodeType("Campfire","Aumenta o ataque ou vida de uma carta.","Campfire.webp",async function(){
    fader.classList.add("fade");
    await new Promise((resolve)=>setTimeout(function(){
        fader.classList.remove("fade");
        campfire();
        resolve();
    },fadeTimer));
},()=>6);

function genItem(n){
    let totalLots=0;
    let lots=[];
    for(let i=0; i<itemTypes.length; i++){
        const prob=itemTypes[i].lots();
        totalLots+=prob;
        lots.push(prob);
    }
    return pickRandom(lots,totalLots,n);
}

const itemNode=new NodeType("Item","Escolha um de 3 itens.","item.webp",async function(n){
    if(run.items.length>=3){
        run.deck.push(new ModdedCard(c_pack_rat));

        const wRect=mapWrapper.getBoundingClientRect();
        const myRect={top: wRect.top+n.y, left: wRect.left+n.x};
        const targetRectish=deckDivs[0].getBoundingClientRect();
        const targetRect={top: targetRectish.top+targetRectish.height/2, left: targetRectish.left+targetRectish.width/2};
        const trans=createTransporter(c_pack_rat.render(1), filled_canvas(1,i_cards,[2,2]), myRect, targetRect, map, 250,2,new Promise((resolve)=>setTimeout(function(){
            resolve();
            setTimeout(function(){
                trans.remove();
                drawShadow(deckShadows2[0], run.deck.length-shownCards);
                deckDivs[0].firstElementChild.style.visibility="";
                toggleShow=true;
            },250);
        },500)),undefined,true);
        
        trans.style.translate="-50% -50%";
        trans.style.transitionProperty="opacity,top,left,scale,transform";
        trans.style.transitionDuration="150ms";
        trans.style.opacity=0;
        void trans.offsetHeight;
        trans.style.opacity=1;
        return;
    }

    itemModal.style.opacity="1";
    itemModal.style.visibility="visible";
    itemModal.style.transitionDelay="";

    const picked=genItem(3);
    itemPres.innerHTML="";
    let dontBeGreedy=false;

    for(let i=0; i<picked.length; i++){
        const it=itemTypes[picked[i]];
        const itemImg=sigilElement(it,"img");
        itemImg.src=it.file.src;
        itemPres.appendChild(itemImg);
        itemImg.addEventListener("click",function(){
            if(dontBeGreedy) return;
            addItem(itemTypes[picked[i]]);
            closeItemModal();
            dontBeGreedy=true;
        });
    }
},()=>8);

class MapNode{
    constructor(x,y){
        this.x=x;
        this.y=y;
        this.fwd=[];
        this.back=[];
        this.type=null;
        this.el=null;
    }
}

function binarySearch(arr, val) {
    let start = 0;
    let end = arr.length - 1;

    while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        if (val <= arr[mid]) {
            end = mid - 1;
        } else {
            start = mid + 1;
        }
    }
    return start;
}

function pickRandom(lots,totalLots,n){
    let remaining=totalLots;
    let picked=[];
    let skipped=new Array(lots.length).fill(false);

    for(let j=0; j<n; j++){
        const rng=Math.random()*remaining;
        let curr=0,ind=0;
        for(; curr<rng; ind++){
            if(!skipped[ind]) curr+=lots[ind];
        }
        ind--;
        picked.push(ind);
        remaining-=lots[ind];
        skipped[ind]=true;
    }

    shuffle(picked);
    return picked;
}

const mapPaddingX=50,mapPaddingY=50;
async function renderMap(len=2,xSpacing=150,ySpacing=115,conns=3){
    const width=3;
    const d=document.createElement("div");
    d.style.position="relative";
    const c=document.createElement("canvas");
    const ctx=c.getContext("2d");
    c.width=xSpacing*(width-1)+mapPaddingX;
    c.height=ySpacing*(len+2)+mapPaddingY;
    d.appendChild(c);

    const mm=[[[],[],[]],...genMapModel(len,width,conns),[]];

    for(let i=0; i<width; i++){
        if(len==0 || mm[1][i].length>0){
            mm[0][1].push(i);
        }
    }

    let targets=new Array(width).fill(false);
    for(let i=0; i<width; i++){
        for(let j of mm[mm.length-2][i]){
            targets[j]=true;
        }
    }
    for(let i=0; i<width; i++){
        if(targets[i]){
            mm[mm.length-1][i]=[1];
        }
        else{
            mm[mm.length-1][i]=[];
        }
    }

    ctx.strokeStyle="#2f2f2f";
    ctx.lineWidth=4;
    let yPos=mapPaddingX/2;

    let mapNodes=[];
    // let nodeArray=[];
    for(let i=0; i<mm.length; i++){
        let xPos=mapPaddingY/2;
        mapNodes[i]=[];
        for(let j=0; j<width; j++){
            if(mm[i][j].length>0){
                mapNodes[i][j]=new MapNode(xPos, c.height-yPos);
                // nodeArray.push(mapNodes[i][j]);
            }
            xPos+=xSpacing;
        }
        yPos+=ySpacing;
    }
    const end=new MapNode(mapPaddingX/2+xSpacing, c.height-yPos);
    mapNodes.push([null,end,null]);
    // nodeArray.push(end);

    for(let i=0; i<mm.length; i++){
        for(let j=0; j<width; j++){
            if(mapNodes[i][j]){
                for(let k of mm[i][j]){
                    // if(mapNodes[i+1][k]==null){
                    //     debugger;
                    // }
                    // else{
                    mapNodes[i][j].fwd.push(mapNodes[i+1][k]);
                    mapNodes[i+1][k].back.push(mapNodes[i][j]);
                    // }
                }
            }
        }
    }

    let totalLots=0;
    let lots=[];
    for(let i=0; i<nodeTypes.length; i++){
        const prob=nodeTypes[i].lots();
        totalLots+=prob;
        lots.push(prob);
    }
    for(let i=1; i<mapNodes.length-1; i++){
        const picked=pickRandom(lots,totalLots,3);
        // const picked=[itemNode.id,itemNode.id,itemNode.id];
        for(let j=0; j<width; j++){
            const n=mapNodes[i][j];
            if(n){
                n.type=nodeTypes[picked[j]];
                if(n.type==buildNode){
                    n.y+=2;
                }
            }
        }
    }
    mapNodes[0][1].type=battleNode;
    mapNodes[mapNodes.length-1][1].type=battleNode;

    const skip=30;
    let currNode=mapNodes[0][1];

    for(let i=0; i<mapNodes.length; i++){
        for(let j=0; j<width; j++){
            const node=mapNodes[i][j];
            if(!node) continue;
            await node.type.src.loaded;

            const imx=Math.round(node.x-node.type.src.width/2);
            const imy=Math.round(node.y-node.type.src.height/2);

            let tt=sigilElement(node.type,"img");
            d.appendChild(tt);
            tt.style.position="absolute";
            tt.style.left=imx+"px";
            tt.style.top=imy+"px";
            tt.width=node.type.src.width;
            tt.height=node.type.src.height;
            if(i==1) tt.style.cursor="pointer";
            // tt.getContext("2d").drawImage(node.type.src,0,0);
            tt.src=node.type.src.src;
            node.el=tt;

            if(i>0){
                tt.addEventListener("click",async function(){
                    if(currNode && currNode.fwd.indexOf(node)!=-1){
                        const old=currNode;
                        currNode=node;
                        run.fdeck=run.deck.filter((x)=>x.inUse);
                        await node.type.fn(node);

                        old.el.classList.remove("currentNode");
                        old.el.style.cursor="";
                        old.el.classList.add("pastNode");
                        node.el.classList.add("currentNode");
                        for(let n of node.fwd){
                            n.el.style.cursor="pointer";
                        }

                        for(let j=0; j<width; j++){
                            const n=mapNodes[i][j];
                            if(n && n!=node){
                                n.el.classList.add("pastNode");
                                n.el.style.cursor="";
                            }
                        }
                    }
                });
            }
            else{
                tt.classList.add("currentNode");
            }

            for(let f of node.fwd){
                const ang=Math.atan2(f.y-node.y,f.x-node.x);
                let skip_ini=node.type==buildNode? skip+10*Math.abs(Math.cos(ang)): skip;
                let skip_end=f.type==buildNode? skip+10*Math.abs(Math.cos(ang)): skip;
                const sx_ini=Math.cos(ang)*skip_ini,sy_ini=Math.sin(ang)*skip_ini;
                const sx_end=Math.cos(ang)*skip_end,sy_end=Math.sin(ang)*skip_end;
                ctx.beginPath();
                ctx.moveTo(node.x+sx_ini,node.y+sy_ini);
                ctx.lineTo(f.x-sx_end,f.y-sy_end);
                ctx.stroke();
            }
        }
    }

    return d;
}

const heartDivs=map.querySelectorAll(".heart");
const deckDivs=map.querySelectorAll(".actual");
const deckShadows2=map.querySelectorAll(".shadow");
const itemDivs=map.querySelector(".backg .items").children;

for(let i=0; i<2; i++){
    const r=filled_canvas(2,i_cards,[2,2]);
    deckDivs[i].appendChild(r);
}

function updateDeck(i){
    drawShadow(deckShadows2[i], i==1? run.oppDeckSize: run.deck.length);
}
function updateHPs(){
    for(let i=0; i<2; i++){
        heartDivs[i].textContent=run.life[i];
    }
}

deckDivs[0].style.cursor="pointer";
const deckViewer=map.querySelector("#spreadDeck");

let viewerIntv,shownCards=0,toggleShow=true;
let readyProm,pendingAnims=0;

function centerRect(r){
    return{
        left:r.left+r.width/2,
        top:r.top+r.height/2,
    }
}

function createTransporter(card, nc, myRect, targetRect,el,dur=-1,scale=-1,prom=null,qlass="transporter", reverseNC=false) {
    const trans = document.createElement("div");
    trans.className = qlass;
    el.appendChild(trans);
    trans.appendChild(card);
    if(nc && !reverseNC) trans.style.transform = "rotateY(180deg)";

    trans.style.top = myRect.top + "px";
    trans.style.left = myRect.left + "px";

    function theRest(){
        if(dur!=-1) trans.style.transitionDuration=dur+"ms";
        void trans.offsetHeight;
        trans.style.top = targetRect.top + "px";
        trans.style.left = targetRect.left + "px";
        if(scale!=-1) trans.style.scale=scale;
        
        if(nc){
            trans.style.transform = reverseNC? "rotateY(180deg)": "rotateY(0deg)";
            setTimeout(function () {
                trans.replaceChild(nc, card);
            }, dur/2);
        }
    }

    if(prom){
        prom.then(theRest);
    }
    else{
        theRest();
    }
    return trans;
}

function deckViewerEl(dc){
    const nc=dc.render(2);
    const ncw=document.createElement("div");
    ncw.appendChild(nc);
    const closeBtn=document.createElement("button");
    closeBtn.className="del";
    ncw.appendChild(closeBtn);
    if(!dc.inUse) ncw.classList.add("unused");

    // ncw.addEventListener("click",function(){
    //     ncw.classList.toggle("unused");
    //     dc.inUse=!dc.inUse;
    // });
    return ncw;
}

deckDivs[0].addEventListener("click",async function(){
    if(readyProm) return;
    clearInterval(viewerIntv);
    if(pendingAnims!=0){
        await new Promise((resolve)=>{
            readyProm=resolve;
        });
        readyProm=null;
    }

    if(toggleShow){
        toggleShow=false;
        deckViewer.style.width=cardWidth*2*Math.max(3,Math.ceil(run.deck.length/3))+"px";
        viewerIntv=setInterval(function(){
            if(shownCards==run.deck.length) return;

            const card=copyCanvas(deckDivs[0].firstElementChild);
            const dc=run.deck[shownCards];
            const ncw=deckViewerEl(dc);

            shownCards++;
            if(shownCards==run.deck.length){
                clearInterval(viewerIntv);
                viewerIntv=null;
                deckDivs[0].firstElementChild.style.visibility="hidden";
            }
            else{
                drawShadow(deckShadows2[0], run.deck.length-shownCards);
            }

            pendingAnims++;
            const placeholder=document.createElement("div");
            placeholder.style.width=card.width+"px";
            placeholder.style.height=card.height+"px";
            placeholder.className="placeholder";
            deckViewer.appendChild(placeholder);
            const targetRect=placeholder.getBoundingClientRect();
            const myRect=deckDivs[0].firstElementChild.getBoundingClientRect();

            const trans=createTransporter(card,ncw,myRect,targetRect,map,200);
        
            setTimeout(function(){
                deckViewer.replaceChild(ncw,placeholder);
                trans.remove();
                pendingAnims--;
                if(readyProm && pendingAnims==0){
                    readyProm();
                }
            },200);
        },50);
    }
    else{
        toggleShow=true;

        viewerIntv=setInterval(function(){
            if(shownCards==0) return;

            shownCards--;
            const card=deckViewer.children[shownCards];
            if(shownCards==0){
                clearInterval(viewerIntv);
                viewerIntv=null;
                deckDivs[0].firstElementChild.style.visibility="hidden";
                hoveredTT=null;
                tooltip.style.opacity=0;
                tooltip.style.visibility="hidden";
            }

            if(!card) return;
            const nc=copyCanvas(deckDivs[0].firstElementChild);
            const pickedCards=shownCards;

            pendingAnims++;
            const targetRect=deckDivs[0].firstElementChild.getBoundingClientRect();
            const myRect=card.getBoundingClientRect();

            const trans=createTransporter(card,nc,myRect,targetRect,map,200);
        
            setTimeout(function(){
                drawShadow(deckShadows2[0], run.deck.length-pickedCards);
                deckDivs[0].firstElementChild.style.visibility="";
                trans.remove();
                pendingAnims--;
                if(readyProm && pendingAnims==0){
                    readyProm();
                }
            },200);
        },50);
    }
});

function showMap(){
    if(!run) return;
    fader.classList.remove("fade");
    if(cleanup){
        cleanup();
        cleanup=null;
    }
    map.style.visibility="visible";
    deckViewer.style.width=cardWidth*2*Math.max(3,Math.ceil(run.deck.length/3))+"px";
    hoveredTT=null;
    tooltip.style.visibility="hidden";
    tooltip.style.opacity=0;

    if(run.deck.length==0){
        deckDivs[0].firstElementChild.style.visibility="hidden";
    }
    else if(!toggleShow){
        for(; shownCards<run.deck.length; shownCards++){
            deckViewer.appendChild(deckViewerEl(run.deck[shownCards]));
        }
    }
    else{
        if(run.deck.length-shownCards>0){
            drawShadow(deckShadows2[0], run.deck.length-shownCards);
            deckDivs[0].firstElementChild.style.visibility="";
        }
    }
}

let trials=[];
class Trial{
    constructor(reducer,file,amount){
        this.reducer=reducer;
        this.amount=amount;

        if(!(file in imgMap)){
            imgMap[file]=new ImgWrapper("map/"+file);
        }
        this.file=imgMap[file];
        trials.push(this);
    }
}

const trialBones=new Trial(((c)=>c.getElement()==bones? c.getCost(): 0),"Trial_bones.webp",4);
const trialAttack=new Trial(((c)=>c.getAttack()),"Trial_power.webp",5);
const trialHealth=new Trial(((c)=>c.getHealth()),"Trial_toughness.webp",7);
const trialBlood=new Trial(((c)=>c.getElement()==blood? c.getCost(): 0),"Trial_blood.webp",3);
const trialEnergy=new Trial(((c)=>c.getElement()==energy? c.getCost(): 0),"trial_energy.png",3);
const trialSigils=new Trial(((c)=>c.getVisibleSigils().length),"Trial_abilities.webp",3);

async function showTrials(){
    shuffle(trials,3);
    
    for(let i=trials.length-3,j=0; i<trials.length; i++,j++){
        const trial=trials[i];
        pickSpaces[j].innerHTML="";
        
        await trial.file.loaded;
        const trialCard=document.createElement("div");
        trialCard.className="trial";
        pickSpaces[j].appendChild(trialCard);

        const wrapper=document.createElement("div");
        trialCard.appendChild(wrapper);

        const img=trial.file.cloneNode();
        wrapper.appendChild(img);

        // const number=document.createElement("canvas");
        // number.width=4*i_numbers.dims[0];
        // number.height=4*i_numbers.dims[1];
        // i_numbers.draw(number.getContext("2d"),4,trial.amount,0,0,0);
        const number=document.createElement("span");
        number.textContent=trial.amount;
        wrapper.appendChild(number);
    }
}

const mopup=document.querySelector("#mopup");
async function playTrial(i){
    let chosenTrans;
    let chosenRect;
    for(let j=0; j<pickSpaces.length; j++){
        const ch=pickSpaces[j].firstElementChild;
        if(j==i){
            const myRect=ch.getBoundingClientRect();
            chosenRect={top:myRect.top-100,left:innerWidth/2-myRect.width/2};
            chosenTrans=createTransporter(ch,null,myRect,chosenRect,cardSelect,-1,-1,null,"transporter2");
        }
        else{
            ch.style.opacity=0;
            setInterval(function(){
                ch.remove();
            },300);
        }
    }

    const ch=[...arenaDeck.children];
    const JSMoment=ch[ch.length-1].getBoundingClientRect()
    const targetRect={width:JSMoment.width,height:JSMoment.height,top:JSMoment.top,left:JSMoment.left};
    let transes=[];
    rerollEl.style.display="none";
    let inds=[];

    for(let i=ch.length-1; i>=0; i--){
        const myRect=ch[i].getBoundingClientRect();
        const trans=createTransporter(ch[i],null,myRect,targetRect,mopup,i==ch.length-1? 0: (ch.length*1.5-i)*50);
        trans.style.zIndex=69+ch.length-i;
        transes.push(trans);
        const ghost=document.createElement("div");
        ghost.textContent=" ";
        arenaDeck.appendChild(ghost);
        ghost.style.width=myRect.width+"px";
        ghost.style.height=myRect.height+"px";
        targetRect.top-=1;
        targetRect.left-=1;
        inds.push(i);
        if(i!=ch.length-1) await new Promise((resolve)=>setTimeout(resolve,25));
    }

    await new Promise((resolve)=>setTimeout(resolve,ch.length*75-50));
    mopup.style.translate="0 200px";
    await new Promise((resolve)=>setTimeout(resolve,300));
    transes.forEach((trans)=>trans.remove());
    const len=Math.min(3,inds.length);
    shuffle(inds,len);
    const starterRect={top:innerHeight+200,left:innerWidth/2};
    let acc=0;
    const trial=trials[trials.length-3+i];
    console.log(trial);
    transes=[];

    for(let i=0,j=inds.length-len; i<len; i++,j++){
        const cardBack=filled_canvas(2,i_cards,[2,2]);
        const targetRect={top:cardHeight*6+50+chosenRect.top,left:(cardWidth*4+50)*(i-1)+innerWidth/2};
        const trans=createTransporter(cardBack,ch[inds[j]],starterRect,targetRect,cardSelect,300,2,null,"transporter3");
        transes.push(trans);
        const contrib=trial.reducer(run.fdeck[inds[j]]);
        console.log(contrib);
        acc+=contrib;
        await new Promise((resolve)=>setTimeout(resolve,500));
    }

    const flash=document.createElement("div");
    flash.className="flash"
    if(acc>=trial.amount){
        flash.style.backgroundColor="#308f20";
    }
    else{
        flash.style.backgroundColor="#af2030";
    }
    chosenTrans.firstElementChild.firstElementChild.appendChild(flash);
    trialMode=false;

    if(acc>=trial.amount){
        await new Promise((resolve)=>setTimeout(resolve,1250));
        if(run && !run.overBool){
            arenaDeck.innerHTML="";
            cardPickPt2(1);
        }
    }
    else{
        await new Promise((resolve)=>setTimeout(resolve,1000));
        if(run && !run.overBool){
            fader.classList.add("fade");
            await new Promise((resolve)=>setTimeout(resolve,fadeTimer));
            showMap();
        }
    }
    chosenTrans.remove();
    transes.forEach((trans)=>trans.remove());
    mopup.style.translate="";
}

const buildACard=document.querySelector("#cardFactory");
const bcHolder=buildACard.querySelector("#cardHolder").firstElementChild;
const bcAttack=bcHolder.querySelector("#attack");
const bcHealth=bcHolder.querySelector("#health");
const bcCanvas=bcHolder.querySelector("canvas");
const bcSigils=buildACard.querySelector("#sigilPick");
const bcCost=buildACard.querySelector("#cost");
const costCanvas=bcCost.querySelector("canvas");

{   
    bcCanvas.width=4*cardWidth;
    bcCanvas.height=4*cardHeight;
    const ctx=bcCanvas.getContext("2d");
    i_cards.draw(ctx,4,1,0,0,0);
    i_portraits.draw(ctx,4,5,16,1,1);
}

{   
    costCanvas.width=4*i_costs.dims[0];
    costCanvas.height=4*i_costs.dims[1];
}
let chosenCost;
let chosenEl;
let oldPower;
const elements=[bones,blood,energy];

function updateCost(){
    const ctx=costCanvas.getContext("2d");
    ctx.clearRect(0,0,costCanvas.width,costCanvas.height);
    if(chosenCost==0) return;

    let xpos,ypos;
    if(elements[chosenEl]==bones && chosenCost>10){
        xpos=1;
        ypos=chosenCost-4;
    }
    else{
        xpos=elements[chosenEl];
        ypos=chosenCost-1;
    }
    i_costs.draw(ctx,4,xpos,ypos,0,0);
    updateOPmeter();
}

const plus=buildACard.querySelector("#plus").firstElementChild;
plus.addEventListener("click",function(){
    if(chosenCost>=costToPower[chosenEl].length-1) return;
    chosenCost++;
    oldPower=costToPower[chosenEl][chosenCost];
    updateCost();
});
const minus=buildACard.querySelector("#minus").firstElementChild;
minus.addEventListener("click",function(){
    if(chosenCost<=1) return;
    chosenCost--;
    oldPower=costToPower[chosenEl][chosenCost];
    updateCost();
});
const switchBtn=buildACard.querySelector("#switch");
switchBtn.addEventListener("click",function(){
    chosenEl++;
    chosenEl%=3;
    chosenCost=binarySearch(costToPower[chosenEl],oldPower);
    if(chosenCost==0){
        chosenCost=1;
    }
    else if(chosenCost==costToPower[chosenEl].length){
        chosenCost=costToPower[chosenEl].length-1;
    }
    updateCost();
});

let sigilQueue,sigilEls=[],sigilObjs=[];
function updateSigils(){
    for(let el of sigilEls){
        el.remove();
    }
    sigilObjs=sigilQueue.map((x)=>x.sigil);
    sigilEls=drawSigils(sigilObjs,4);
    for(let el of sigilEls){
        bcHolder.appendChild(el);
    }
    updateOPAI();
    updateOPmeter();
}

let bcAtk,bcHP;
bcAttack.addEventListener("input",function(){
    const val=parseInt(bcAttack.value);
    if(val>=0 && val<=14){
        bcAtk=val;
        updateOPAI();
        updateOPmeter();
    }
});

bcHealth.addEventListener("input",function(){
    const val=parseInt(bcHealth.value);
    if(val>=1 && val<=25){
        bcHP=val;
        updateOPAI();
        updateOPmeter();
    }
});

let est;
function updateOPAI(){
    est=(new PowerEstimate(bcAtk,bcHP,sigilObjs)).calc();
}

const baseRotate=120,redRotate=255,maxRotate=300;
const redRatio=maxRotate/redRotate;
let shakingIntv=null,canShake=true;

function setRandomInterval(callback, minInterval, maxInterval) {
    let timeout;
  
    function run() {
      const interval = Math.random() * (maxInterval - minInterval) + minInterval;
      timeout = setTimeout(() => {
        callback();
        run();
      }, interval);
    }
  
    run();
  
    return {
      clear() {
        clearTimeout(timeout);
      }
    };
  }
  
const mult=1/(redRatio-1);
const shakeDur=260;
let failChance;

async function updateOPmeter(){
    const powerPercent=correctPE(est,chosenEl,chosenCost,sigilObjs)/costToPower[chosenEl][chosenCost]*0.91;
    let meterPercent=powerPercent;
    if(meterPercent>1) meterPercent-=(meterPercent-1)/2;
    let rotation=baseRotate+Math.min(maxRotate,redRotate*meterPercent);
    pointer.style.transform="rotate("+rotation+"deg)";

    if(shakingIntv) shakingIntv.clear();
    shakingIntv=null;
    failChance=Math.min(1,Math.max(0,(meterPercent-1)*mult));

    if(meterPercent>1){
        const base=1000;
        const sh=shakeDur-base+base/failChance;

        canShake=false;
        shake(1+Math.min(9,(meterPercent-1)*5)).then(()=>canShake=true);
        shakingIntv=setRandomInterval(function(){
            shake(1,true);
        },260,sh);
    }
}

const cfStuff=document.querySelector("#cfStuff>*");
const its=4;
const eachDur=shakeDur/its;

async function shake(amount,isFromInterval=false){
    let randomAngle=Math.random()*2*Math.PI;
    const decr=amount/its;

    for(let i=0;; i++){
        if(isFromInterval && !canShake){
            return;
        }
        cfStuff.style.translate=Math.cos(randomAngle)*amount+"px "+Math.sin(randomAngle)*amount+"px";
        if(i==its-1){
            cfStuff.style.translate="0px 0px";
            return;
        }
        else{
            amount-=decr;
            randomAngle+=3*Math.PI/4+Math.random()*Math.PI/2;
            await new Promise((resolve)=>setTimeout(resolve,eachDur));
        }
    }
}

const opCanvas=buildACard.querySelector("#opmeter canvas");
{
    const ctx=opCanvas.getContext("2d");
    // const rimWidth=4;
    const redlineWidth=6;
    const dims=(opCanvas.width)/2;

    // ctx.lineWidth=rimWidth;
    // ctx.strokeStyle="black";
    // let r=dims-rimWidth/2;
    // ctx.arc(dims,dims,r-rimWidth/2,Math.PI/3,2*Math.PI/3,true);
    // ctx.stroke();

    ctx.lineWidth=redlineWidth;
    ctx.strokeStyle="#af0000";
    // r-=redlineWidth;
    const r=dims-redlineWidth/2;
    ctx.arc(dims,dims,r,Math.PI/12,Math.PI/3,false);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle="#bfbfcf";
    ctx.arc(dims,dims,r,2*Math.PI/3,Math.PI/12,false);
    ctx.stroke();
}

const pointer=document.createElement("canvas");
opCanvas.parentNode.appendChild(pointer);
pointer.className="pointer";
const ptrWidth=4,ptrLen=32,middleRadius=5;

{
    const ctx=pointer.getContext("2d");
    pointer.height=2*middleRadius;
    pointer.width=ptrLen+middleRadius;

    ctx.fillStyle="#2f2f2f";
    ctx.arc(middleRadius,middleRadius,middleRadius-1,0,2*Math.PI);
    ctx.fill();
    ctx.fillRect(middleRadius,middleRadius-ptrWidth/2,ptrLen,ptrWidth);

    pointer.style.translate="-"+middleRadius+"px -"+middleRadius+"px";
    pointer.style.transformOrigin=middleRadius+"px "+middleRadius+"px";
}

const bcBtn=buildACard.querySelector("#create");
const splosh=buildACard.querySelector("#splosh");
let ncCanvas;

bcBtn.addEventListener("click",async function(){
    bcBtn.style.display="none";
    let randomAngle=Math.random()*2*Math.PI;
    let amount=0;
    const changeItrs=5,totalItrs=20,changeEnd=totalItrs-changeItrs;
    const max=2+failChance*18;
    const change=max/changeItrs;
    if(shakingIntv) shakingIntv.clear();
    shakingIntv=null;
    canShake=false;
    buildACard.classList.add("blockAll");

    const rect=bcHolder.getBoundingClientRect();
    bcHolder.style.transform="rotateY(90deg)";
    await new Promise((resolve)=>setTimeout(resolve,150));

    for(let i=0;; i++){
        if(i==totalItrs-1){
            cfStuff.style.translate="";
            await new Promise((resolve)=>setTimeout(resolve,eachDur));
            break;
        }
        else{
            if(i<changeItrs){
                amount+=change;
            }
            else if(i>=changeEnd){
                amount-=change;
            }

            cfStuff.style.translate=Math.cos(randomAngle)*amount+"px "+Math.sin(randomAngle)*amount+"px";
            randomAngle+=3*Math.PI/4+Math.random()*Math.PI/2;
            await new Promise((resolve)=>setTimeout(resolve,eachDur));
        }
    }

    const success=Math.random()>failChance;
    if(success){
        const newCard=new Card();
        run.deck.push(new ModdedCard(newCard));
        newCard.init("Custom",chosenCost,bcAtk,bcHP,elements[chosenEl],sigilObjs,null,[5,16],false,true);
        ncCanvas=newCard.render(4);
        ncCanvas.style.top=rect.top+rect.height/2+"px";
        ncCanvas.style.left=rect.left+rect.width/2+"px";
        ncCanvas.style.transform="rotateY(-90deg)";
        ncCanvas.classList.add("transporter");
        buildACard.appendChild(ncCanvas);
        void ncCanvas.offsetHeight;
        ncCanvas.style.transform="";
        await new Promise((resolve)=>setTimeout(resolve,750));

        // ncCanvas.style.top=innerHeight+100+rect.height/2+"px";
        // ncCanvas.style.left=innerWidth/2+"px";
        const rect2=arenaDeck.lastElementChild.getBoundingClientRect();
        ncCanvas.style.top=rect2.top+rect2.height/2+"px";
        ncCanvas.style.left=rect2.left+rect2.width/2+"px";
        ncCanvas.style.scale="0.5";
        await new Promise((resolve)=>setTimeout(resolve,250));
    }
    else{
        splosh.style.display="inline-flex";
        void splosh.offsetHeight;
        splosh.style.transform="rotateY(0deg)";
        await new Promise((resolve)=>setTimeout(resolve,750));
    }

    if(!run.overBool){
        fader.classList.add("fade");
        setTimeout(function(){
            showMap();
        },fadeTimer);
    }
});

const adcf=document.querySelector("#adcf");
function letsBuildACard(){
    cleanup=function(){
        bcHolder.style.transform="";
        buildACard.classList.remove("blockAll");
        arenaDeck.innerHTML="";
        buildACard.style.visibility="hidden";
        bcSigils.innerHTML="";
        
        if(ncCanvas){
            ncCanvas.remove();
            ncCanvas=null;
        }
        else{
            splosh.style.display="";
            splosh.style.transform="";
        }
    };

    map.style.visibility="hidden";
    buildACard.style.visibility="visible";
    chosenCost=1;
    chosenEl=blood;
    oldPower=costToPower[chosenEl][chosenCost];
    bcAtk=0;
    bcHP=1;
    sigilObjs=[];
    bcAttack.value=bcAtk;
    bcHealth.value=bcHP;
    bcBtn.style.display="";
    canShake=true;
    updateOPAI();
    updateCost();
    
    adcf.appendChild(arenaDeck);
    calcMargin(arenaDeck,run.fdeck.length,5,1000);
    arenaDeck.innerHTML="";
    for(let i=0; i<run.fdeck.length; i++){
        arenaDeck.appendChild(run.fdeck[i].render(2));
    }
    const d=document.createElement("div");
    d.style.marginLeft="5px";
    arenaDeck.appendChild(d);

    sigilQueue=[];
    shuffle(eligibleSigils,12);
    for(let i=eligibleSigils.length-12,j=0; i<eligibleSigils.length; i++,j++){
        if(j>0 && j%4==0){
            bcSigils.appendChild(document.createElement("br"));
        }
        const c=document.createElement("canvas");
        c.width=2*i_sigils.dims[0];
        c.height=2*i_sigils.dims[1];
        const ctx=c.getContext("2d");
        i_sigils.draw(ctx,2,...eligibleSigils[i].coords,0,0);
        bcSigils.appendChild(c);

        c.addEventListener("click",function(){
            for(let i=0; i<sigilQueue.length; i++){
                if(sigilQueue[i].el==c){
                    sigilQueue.splice(i,1);
                    c.classList.remove("selectedSig");
                    updateSigils();
                    return;
                }
            }

            if(sigilQueue.length>=2){
                let deleted=sigilQueue[0];
                sigilQueue.splice(0,1);
                deleted.el.classList.remove("selectedSig");
            }

            sigilQueue.push({el: c,sigil: eligibleSigils[i]});
            c.classList.add("selectedSig");
            updateSigils();
        });
    }

    updateSigils();
}

const campfireDiv=document.querySelector("#campfire");
const campfireImgs=document.querySelectorAll("#cfImgs>img");
const adcf2=document.querySelector("#adcf2");
const cfCardDiv=document.querySelector("#cfCard");
const boostBtn=document.querySelector("#boost");
const leaveBtn=document.querySelector("#leave");
const oddsDiv=boostBtn.querySelector(".dice");
const oddsSpan=boostBtn.querySelector(".dice>span");
const boneBank=campfireDiv.querySelector("#boneItem");
const compoundTrans=document.querySelector("#compound");
const cfScale=parseInt(getComputedStyle(cfCardDiv).getPropertyValue("--scale"));
let sentToFire=null;
let stfPos=null;
let stfCtx=null;
let burnCount=0;
let odds=0;
let animProm=null;
let blockClicks=false;
let fireType;

leaveBtn.addEventListener("click",function(){
    leaveCampfire();
});

boostBtn.addEventListener("click",function(){
    if(sentToFire==null || blockClicks) return;
    burnCount++;

    const roll=run.poisoned? 20: (Math.random()*20)%20+1;
    if(roll>odds){
        if(!(run.deck[stfPos] instanceof ModdedCard)){
            run.deck[stfPos]=new ModdedCard(run.deck[stfPos]);
        }
        const c=run.deck[stfPos];
        if(fireType==0){
            c.atkBoost++;
        }
        else{
            c.hpBoost+=2;
        }

        function anim(sentToFire,stfCtx){
            cfCardDiv.style.transitionDuration="100ms";
            void cfCardDiv.offsetHeight;
            cfCardDiv.style.transform="rotateX(30deg)";
            
            compoundTrans.style.transform="rotateY(180deg)";
            let finishFunc;
            animProm=new Promise((resolve)=>finishFunc=resolve);

            setTimeout(function(){
                clearStat(stfCtx,cfScale,fireType,c.card,c.card.hasSigil(s_cant_be_sacced));
                const stat=[c.getAttack(),c.getHealth()][fireType];
                drawStat(stfCtx,cfScale,fireType,stat,stat);
                cfCardDiv.innerHTML="";
                cfCardDiv.appendChild(filled_canvas(cfScale,i_cards,[2,2]));
            },100);

            setTimeout(function(){
                compoundTrans.style.transform="rotateY(360deg)";
                setTimeout(function(){
                    cfCardDiv.innerHTML="";
                    cfCardDiv.appendChild(sentToFire);
                },100);
                setTimeout(function(){
                    cfCardDiv.style.transform="";
                },200);
                setTimeout(function(){
                    compoundTrans.style.transition = 'none';
                    compoundTrans.style.transform="";
                    compoundTrans.offsetHeight;
                    compoundTrans.style.transition = '';
                    finishFunc();
                },350);
            },300);
        }
        if(animProm) animProm.then(function(){
            if(sentToFire) anim(sentToFire,stfCtx);
        });
        else anim(sentToFire,stfCtx);

        if(odds==0){
            setOdds(15);
        }
        else{
            leaveCampfire(500);
        }

        if(shownCards>stfPos){
            deckViewer.replaceChild(c.render(2),deckViewer.children[stfPos]);
        }
    }
    else{
        const card=run.deck[stfPos];
        if(card.getVisibleSigils().indexOf(s_death_touch)!=-1){
            run.poisoned=true;
        }
        run.deck.splice(stfPos,1);
        if(run.items.length<3) addItem(bonesItem);
        leaveCampfire(1000);

        if(shownCards>stfPos){
            deckViewer.children[stfPos].remove();
            shownCards--;
        }

        function anim(sentToFire){
            sentToFire.style.opacity=0;
            setTimeout(function(){
                boneBank.style.opacity=1;
            },250);
        }
        if(animProm) animProm.then(function(){
            if(sentToFire) anim(sentToFire);
        });
        else anim(sentToFire);
    }
});

async function leaveCampfire(delay=0){
    blockClicks=true;
    if(delay>0) await new Promise((resolve)=>setTimeout(resolve,delay))
    fader.classList.add("fade");
    setTimeout(function(){
        showMap();
    },fadeTimer);
}

const naughtySigils=[s_extra_attack,s_bifurcated];

function containsAny(arr1, arr2) {
    return arr1.some(element => arr2.includes(element));
}

function setOdds(n){
    odds=n;
    if(odds>0 && !run.poisoned){
        oddsDiv.style.display="block";
        oddsSpan.textContent=odds;
    }
    else{
        oddsDiv.style.display="none";
    }
}

function campfire(){
    map.style.visibility="hidden";
    campfireDiv.style.visibility="visible";
    fireType=+(Math.random()<0.5);
    campfireImgs[fireType].style.display="block";
    campfireImgs[1-fireType].style.display="none";
    campfireImgs[2].style.display=run.poisoned? "block": "none";
    boneBank.style.transition="none";
    boneBank.style.opacity=0;
    void boneBank.offsetWidth;
    boneBank.style.transition="";
    boostBtn.style.display="none";
    burnCount=0;
    sentToFire=null;
    blockClicks=false;
    animProm=null;

    cleanup=function(){
        campfireDiv.style.visibility="hidden";
        sentToFire=null;
        animProm=null;
        cfCardDiv.innerHTML="";
        cfCardDiv.style.transitionDuration="";
        arenaDeck.innerHTML="";
    };

    adcf2.appendChild(arenaDeck);
    calcMargin(arenaDeck,run.fdeck.length,5,1000);
    arenaDeck.innerHTML="";
    for(let i=0; i<run.fdeck.length; i++){
        const card=run.fdeck[i];
        const rendered=card.render(2);
        arenaDeck.appendChild(rendered);
        rendered.addEventListener("click",function(){
            if(burnCount==0){
                boostBtn.style.display="";
                const obj=run.fdeck[i].renderAlsoReturnCtx(cfScale);
                sentToFire=obj.div;
                stfCtx=obj.ctx;
                stfPos=run.deck.indexOf(run.fdeck[i]);
                cfCardDiv.innerHTML="";
                cfCardDiv.appendChild(sentToFire);
                
                cfCardDiv.style.transition="none";
                cfCardDiv.style.opacity=0;
                cfCardDiv.style.transform="rotateX(35deg)";
                void cfCardDiv.offsetHeight;
                cfCardDiv.style.transition="";
                cfCardDiv.style.transitionDuration="600ms,300ms";
                cfCardDiv.style.opacity=1;
                cfCardDiv.style.transform="";

                if((card instanceof ModdedCard && (card.card.custom || card.atkBoost>0 || card.hpBoost>0 || card.extraSigs.length>0)) || card.custom || (fireType==0 && containsAny(card.getVisibleSigils(),naughtySigils))){
                    setOdds(15);
                }
                else{
                    setOdds(0);
                }
            }
        });
    }
}

function quitRun(){
    if(run && !run.overBool){
        if(game && !game.overBool){
            game.itsOver();
        }
        else{
            fader.style.animationDuration="";
            fader.classList.add("fade");
            closeItemModal();
            run.overBool=true;
            
            setTimeout(function(){
                menu.style.visibility="visible";
                quitter.style.display="none";
                run=null;
                fader.classList.remove("fade");
                hoveredTT=null;
                tooltip.style.opacity=0;
                tooltip.style.visibility="hidden";
                map.style.visibility="hidden";

                if(cleanup){
                    cleanup();
                    cleanup=null;
                }
            },1000);
        }
        return true;
    }
    return false;
}

const quitter=document.querySelector("#quit");
quitter.addEventListener("click",function(){
    if(quitRun()){
        sendMsg(codeResign);
    }
});
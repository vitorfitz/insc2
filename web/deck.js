"use strict"

const menu=document.querySelector("#menu");
const editor=document.querySelector("#editor");
const playScr=document.querySelector("#game");
const pregame=document.querySelector("#pregame");
const joinGame=document.querySelector("#join");
const fader=document.querySelector("#fade");

const menuOpts=document.querySelectorAll("#menu>*>.opt>*");
for(let i=0; i<menuOpts.length; i++){
    menuOpts[i].addEventListener("mousemove",function(){
        menuOpts[i].parentNode.classList.add("more");
    });
    menuOpts[i].addEventListener("mouseleave",function(){
        menuOpts[i].parentNode.classList.remove("more");
    });
}

const deckSels=document.querySelectorAll(".deckSel");
const select=document.createElement("select");
const noDecks=document.createElement("span");
noDecks.textContent="Você não tem decks";
noDecks.style.color="#af2030";
let validDecks=[];

select.addEventListener("input",function(){
    const iv=parseInt(select.value);
    if(iv>=0){
        localStorage.setItem("lastDeck",select.value);
        localStorage.setItem("lastDeckM"+decks[iv].mode,select.value);
    }
})

function updateDeckSelect(i){
    let validInds=[];
    validDecks=decks.filter(function(d,j){
        if(d.size==minCards && (i==1 || d.mode==actModes[modeInd])){
            validInds.push(j);
            return true;
        }
        return false;
    });
    if(validDecks.length==0){
        deckSels[i].innerHTML="";
        deckSels[i].appendChild(noDecks);
    }
    else{
        let lastDeck=localStorage.getItem("lastDeck"+(i==1? "": "M"+actModes[modeInd]));
        if(lastDeck!=null){
            lastDeck=parseInt(lastDeck);
        }

        select.innerHTML="";
        for(let i=0; i<validDecks.length; i++){
            const opt=document.createElement("option");
            opt.textContent=validDecks[i].name;
            opt.value=validInds[i];
            if(validInds[i]==lastDeck){
                opt.setAttribute("selected",true);
            }
            select.appendChild(opt);
        }
        deckSels[i].innerHTML="";
        deckSels[i].appendChild(select);
    }
}

menuOpts[0].addEventListener("click",function(){
    pregame.style.visibility="visible";
    pregame.style.opacity="1";
    updateDeckSelect(0);
});

menuOpts[1].addEventListener("click",async function(){
    joinGame.style.visibility="visible";
    joinGame.style.opacity="1";
    updateDeckSelect(1);
    if(canStart) startGameSearch();
    isSearchOpen=true;
});

let gameSearchIntv=null;
function startGameSearch(){
    respQueue.clear();
    promQueue.clear();
    waiting=[];
    // gameSearchIntv=setInterval(function(){
    //     searchGames();
    // },1000);
    searchGames();
}

const refreshBtn=document.querySelector("#refresh");
refreshBtn.addEventListener("click",function(){
    searchGames();
});

menuOpts[2].addEventListener("click",function(){
    editor.style.visibility="visible";
    menu.style.visibility="hidden";
    cardPool=mode==mode_exp? cards: origCards;
    calcFilters();
});

const modals=document.querySelectorAll("#menu .modalBG");
for(let i=0; i<modals.length; i++){
    const m=modals[i];
    const closeBtn=m.querySelector(".close");
    m.addEventListener("click",function(e){
        if(e.target==m || e.target==closeBtn){
            closeModal(m);
            if(i==1){
                clearInterval(gameSearchIntv);
                isSearchOpen=false;
            }
            else if(i==0 && isPlayClicked){
                playBtn.classList.remove("waiting");
                sendMsg(codeDeleteOffer);
            }
        }
    });
}
function closeModal(m){
    m.style.opacity=0;
    m.style.visibility="";
}

const playBtn=document.querySelector(".play");
const deckShadows=[
    document.querySelectorAll("#myDecks .shadow"),
    document.querySelectorAll("#oppDecks .shadow"),
];
const deckShadowLimit=12;

function drawShadow(c,cards){
    const thicc=Math.round(deckShadowLimit*(cards-1)/(minCards-1));
    var ctx = c.getContext('2d');
    ctx.lineWidth = 0;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#020a11';
    ctx.beginPath();
    ctx.moveTo(c.width-2*cardWidth, c.height);
    ctx.lineTo(c.width-2*cardWidth, c.height-2*cardHeight);
    ctx.lineTo(c.width, c.height-2*cardHeight);
    ctx.lineTo(c.width-thicc, c.height-2*cardHeight-thicc);
    ctx.lineTo(c.width-2*cardWidth-thicc, c.height-2*cardHeight-thicc);
    ctx.lineTo(c.width-2*cardWidth-thicc, c.height-thicc);
    ctx.closePath();
    ctx.fill();
    c.parentNode.style.top=c.parentNode.style.left=thicc+"px";
}

function drawDeckShadow(uiSide,manaOrCard,cards){
    if(cards==0){
        deckPiles[uiSide][manaOrCard].parentNode.style.visibility="hidden";
        return;
    }
    
    deckPiles[uiSide][manaOrCard].parentNode.style.visibility="";
    const c=deckShadows[uiSide][manaOrCard];
    drawShadow(c,cards);
}

const triangleParent=document.querySelector("#triangle");
const triangle=document.createElement("canvas");
triangle.height=18;
triangle.width=Math.round(triangle.height*Math.sqrt(3)/2);
{
    const ctx=triangle.getContext("2d");
    ctx.fillStyle="#bfbfbf";
    ctx.lineWidth=0;
    ctx.moveTo(0,0);
    ctx.lineTo(0,triangle.height);
    ctx.lineTo(triangle.width,triangle.height/2);
    ctx.closePath();
    ctx.fill();
}
triangleParent.appendChild(triangle);

function copyCanvas(c){
    const c2=document.createElement("canvas");
    c2.width=c.width;
    c2.height=c.height;
    c2.getContext("2d").drawImage(c,0,0);
    return c2;
}

function cardDrawStage1(pl,div){
    let el=deckPiles[pl][div];
    if(div==1) el=el.lastElementChild;
    let copy=copyCanvas(el);
    deckSpaces[pl][div].appendChild(copy);
    copy.className="drawing";
    void copy.offsetHeight;
    copy.style.transform="translateY("+(pl==0? 1: -1)*500+"px)";
    setTimeout(function(){
        copy.remove();
    },600);
}

let drawProm=null;
const maxHandWidth=600;
const defaultMargin=5;

function calcMargin(hand,cards,def=defaultMargin,max=maxHandWidth,scale=2){
    if(cards==0) return def;
    let m=Math.min(def,(max-cardWidth*scale*(cards+1))/(cards));
    hand.style.setProperty("--margin",m+"px");
    return m;
}

let cds2qs=[new Queue(),new Queue()];
let isDrawing=[false,false];
async function cardDrawStage2(card,pl,justPlayed=false){
    if(isDrawing[pl]) await new Promise((resolve)=>cds2qs[pl].enqueue(resolve));
    isDrawing[pl]=true;

    const cards=hands[pl].children.length;
    let margin=calcMargin(hands[pl],cards);

    const desiredWidth=(cards+(justPlayed? 0: 1))*(2*cardWidth+margin)-margin;
    const desiredPos=(innerWidth+desiredWidth)/2-2*cardWidth;
    hands[pl].style.width=hands[pl].offsetWidth+"px";
    void hands[pl].offsetWidth;
    hands[pl].style.width=desiredWidth+"px";

    // setTimeout(function(){
    card.style.left=desiredPos+"px";
    card.classList.add("adding");
    card.classList.add("suppressEvents");
    card.style.top=(pl==0? 1: -1)*500+"px";

    hands[pl].parentNode.appendChild(card);
    void card.offsetHeight;
    card.style.top="0";

    setTimeout(function(){
        card.classList.remove("adding");
        setTimeout(function(){
            card.classList.remove("suppressEvents");
        },200)
        card.style.left="";
        card.style.top="";
        if(!card.classList.contains("wackyStuff")){
            const el=hands[pl].lastElementChild;
            if(el) el.style.transition="none";
            hands[pl].appendChild(card);
            setTimeout(function(){
                if(el) el.style.transition="";
            },100)
        }

        if(game.overBool){
            return;
        }

        if(drawProm) drawProm();
        setTimeout(function(){
            isDrawing[pl]=false;
            if(!cds2qs[pl].empty()) cds2qs[pl].dequeue()();
        },100);
        hands[pl].style.width="";
        if(finishedDrawing && hands[pl].children.length==game.startCards+game.startMana){
            finishedDrawing();
            finishedDrawing=null;
        }
    },500);
    // },100);
}

let animationIntv=null;
let selectedCard=null;
function unselectCard(){
    if(selectedCard==null) return;
    boards[0].classList.remove("spacesClickable");
    selectedCard.canvas.classList.remove("selected");
    selectedCard.canvas.style.transform="";
    clearInterval(animationIntv);
    selectedCard=null;

    for(let i=0; i<sacCards.length; i++){
        sacOverlays[i].style.opacity=0;
        const aaa=sacOverlays[i];
        setTimeout(function(){
            aaa.remove();
        },120);
    }
    sacs=0;
    sacPos=[];
    boards[0].classList.remove("cardsClickable");
    boards[0].classList.remove("spacesClickable");
    sacOverlays=[];
    sacCards=[];
}

function selectCard(card){
    unselectCard();
    card.canvas.classList.add("selected");
    const angv=Math.PI/150;
    let offset=0;
    selectedCard=card;
    let ang=0;

    if(card.card.element==blood && card.card.cost>0){
        boards[0].classList.add("cardsClickable");
        boards[0].classList.remove("spacesClickable");
    }
    else{
        boards[0].classList.add("spacesClickable");
    }

    animationIntv=setInterval(function(){
        if (offset<5) offset+=0.1;
        ang+=angv;

        card.canvas.style.transform="translate("+Math.round(Math.cos(ang)*offset)+"px, "+Math.round(Math.sin(ang)*offset/2)+"px)";
    },20);
}

function playCard(card,pl,target,nc=null){
    const div=document.createElement("div");
    div.className="ghostCard";
    const myRect=card.getBoundingClientRect();

    if(card.classList.contains("ghostCard")){
        card=card.nextSibling;
        // console.log("saved?",card);
        // console.warn(faceDown);
    }

    try{hands[pl].replaceChild(div,card);}catch(_){
        div.remove();
        card.classList.add("wackyStuff");
    }
    // hands[pl].replaceChild(div,card);
    void div.offsetHeight;
    let margin=calcMargin(hands[pl],hands[pl].children.length-2);
    div.style.width="0px";
    div.style.marginRight=(div==hands[pl].lastElementChild? defaultMargin-margin: 0)+"px";

    setTimeout(function(){
        div.remove();
    },300);

    const trans=document.createElement("div");
    trans.className="transporter";
    playScr.appendChild(trans);
    trans.appendChild(card);
    card.classList.add("suppressEvents");

    card.classList.remove("selected");
    clearInterval(animationIntv);
    void card.offsetHeight;
    card.style.transform="";
    trans.style.top=myRect.top+"px";
    trans.style.left=myRect.left+"px";
    void trans.offsetHeight;

    if(pl==1 && nc!=null){
        trans.style.transform="rotateY(180deg)";
        setTimeout(function(){
            // try{trans.replaceChild(nc,card);}catch(_){debugger;}
            trans.replaceChild(nc,card);
            nc.classList.add("suppressEvents");
        },100);
    }
    const targetEl=cardSpaces[pl][target];
    const targetOverlay=boardOverlays[pl][target];
    const targetRect=targetEl.getBoundingClientRect();
    trans.style.top=targetRect.top+"px";
    trans.style.left=targetRect.left+"px";

    setTimeout(function(){
        const c2=nc==null? card: nc;
        targetEl.appendChild(c2);
        trans.remove();
        c2.classList.remove("wackyStuff");
        targetOverlay.innerHTML="";
        const par=targetEl.parentNode;
        par.classList.remove("helpme");
        setTimeout(function(){
            c2.classList.remove("suppressEvents");
        },200)
    },200);
}

function unplayCard(pl,target){
    hoveredTT=null;
    tooltip.style.opacity=0;
    tooltip.style.visibility="hidden";

    const card=cardSpaces[pl][target].firstElementChild;
    card.classList.add("suppressEvents");

    const div=document.createElement("div");
    div.className="ghostCard noTrans";
    hands[pl].appendChild(div);

    const myRect=card.getBoundingClientRect();
    const handRect=hands[pl].getBoundingClientRect();
    const handSize=hands[pl].children.length-1;
    let margin=calcMargin(hands[pl],handSize);
    const targetRect={
        top:handRect.top,
        left:handRect.left+handSize*(2*cardWidth+margin)-margin
    }

    div.style.width="0px";
    div.style.marginRight=defaultMargin-margin;
    void div.offsetHeight;
    div.classList.remove("noTrans");
    div.style.width="84px";
    div.style.marginRight="0px";
    
    let nc=pl==1? filled_canvas(2,i_cards,[2,2]): null;
    let trans=createTransporter(card, nc, myRect, targetRect, playScr);

    setTimeout(function(){
        trans.remove();
        hands[pl].replaceChild(nc??trans.firstElementChild,div);
        setTimeout(function(){
            card.classList.remove("suppressEvents");
        },200);
    },200);

    return card;
}

function discardHand(pl){
    const ch=[...hands[pl].children];
    let transes=[];
    let rects=[];
    for(let i=0; i<ch.length; i++){
        rects[i]=ch[i].getBoundingClientRect();
    }

    for(let i=0; i<ch.length; i++){
        ch[i].classList.add("suppressEvents");
        const targetRect={
            top:rects[i].top+500*(pl==0? 1: -1),
            left:rects[i].left
        }
        const trans=createTransporter(ch[i], null, rects[i], targetRect, playScr);
        trans.style.transitionTimingFunction="ease-in";
        trans.style.transitionDuration="500ms";
        transes.push(trans);
    }

    setTimeout(function(){
        for(let i=0; i<transes.length; i++){
            transes[i].remove();
        }
    },500);
}

function materialize(card,pl,target){
    const targetEl=cardSpaces[pl][target];
    targetEl.innerHTML="";
    targetEl.appendChild(card);
    card.style.scale="0";
    card.style.opacity="0";
    card.classList.add("suppressEvents");
    const dur=250;
    card.style.transition="scale "+dur+"ms ease-out,opacity "+dur+"ms ease-out";
    void card.offsetHeight;
    card.style.opacity=1;
    card.style.scale=1;
    setTimeout(function(){
        card.style.opacity="";
        card.style.scale="";
        card.style.transition="";
        setTimeout(function(){
            card.classList.remove("suppressEvents");
        },200)
    },dur)
}

function damage(pl,target){
    const attackOverlay=document.createElement("canvas");
    attackOverlay.style.transitionDuration="150ms";
    attackOverlay.width=i_cards.dims[0]*2;
    attackOverlay.height=i_cards.dims[1]*2;
    i_cards.draw(attackOverlay.getContext("2d"),2,1,3,0,0);
    boardOverlays[pl][target].appendChild(attackOverlay);
    void attackOverlay.offsetHeight;
    attackOverlay.style.opacity=0.75;
    // const hit=game.board[+(pl!=game.myTurn)][target];
    
    // setTimeout(function(){
        // console.log(pl,target,{...hit});
        // if(hit!=null) hit.updateStat(1);
    // },225);
    setTimeout(function(){
        attackOverlay.style.opacity=0;
    },350);
    setTimeout(function(){
        attackOverlay.remove();
    },500);
}

function moveForward(card,pos,pl,target){
    let plSign=pl==0? -1: 1;
    let targetDir;
    if(target<pos){
        targetDir=-1;
    }
    else if(target==pos){
        targetDir=0;
    }
    else{
        targetDir=1;
    }
    if(game.myTurn==1){
        targetDir*=-1;
    }

    card.style.transform="translate("+(20*targetDir)+"px,"+(-20*plSign)+"px)";
}

function attack(card,pos,pl,target){
    moveForward(card,pos,pl,target);
    setTimeout(function(){
        card.style.transform="";
    },500);

    const s=cardSpaces[pl][target];
    game.timeout(function(){
        if(!game.canBlock){
            s.style.opacity=0;
            setTimeout(function(){
                s.style.opacity="";
            },650);
        }
    },0);

    return game.timeout(function(){
        damage(pl,target);
    },150);
}

function removeCard(card){
    card.canvas.remove();
    if(card.sigilEls.indexOf(hoveredTT)!=-1){
        hoveredTT=null;
        tooltip.style.opacity=0;
        tooltip.style.visibility="hidden";
    }
}

function die(card){
    const pl=+(card.side!=game.myTurn);

    const deadDiv=document.createElement("div");
    boardOverlays[pl][card.pos].appendChild(deadDiv);
    deadDiv.className="dead";
    
    const par=cardSpaces[pl][card.pos].parentNode;
    setTimeout(function(){
        par.classList.add("helpme");
    },200);
    
    setTimeout(function(){
        deadDiv.remove();
        par.classList.remove("helpme");
        removeCard(card);
    },600);
}

function move(card,pos,pl,target){
    if(target==pos) return;

    let durations=[-1,150,300,400];
    let dips=[-1,0,50,75];
    let ind=Math.min(durations.length-1,Math.abs(target-pos));
    let duration=durations[ind];
    let plSign=pl==0? 1: -1;
    let dip=-dips[ind]*plSign;
    let difX=120*(target-pos)*(game.myTurn==1? -1: 1);

    const incr=Math.PI*50/duration;
    let angle=Math.PI;
    card.style.transition="translate 50ms linear";
    card.classList.add("suppressEvents");

    let intv=null;
    const spaces=cardSpaces;

    function f(){
        if(angle+0.00001>2*Math.PI){
            card.style.translate="";
            card.style.transition="";
            spaces[pl][target].appendChild(card);
            clearInterval(intv);
            setTimeout(function(){
                card.classList.remove("suppressEvents");
            },200)
            return;
        }
        angle+=incr;
        card.style.translate=(Math.cos(angle)*(difX/2)+difX/2)+"px "+Math.sin(angle)*dip+"px";
    }
    f();
    intv=setInterval(f,50);
    return duration;
}

function bandaid(){
    for(let i=0; i<2; i++){
        const uiTurn=+(i!=game.myTurn);
        for(let j=0; j<game.lanes; j++){
            const overlay=boardOverlays[uiTurn][j];
            if(overlay.children.length!=0){
                continue;
            }

            const card=game.board[i][j];
            const space=cardSpaces[uiTurn][j];
            if(card==null){
                space.innerHTML="";
            }
            else{
                let children=space.children;
                let child=null;
                if(children.length==1){
                    child=children[0];
                }
                if(child!=card.canvas){
                    space.innerHTML="";
                    space.appendChild(card.canvas);
                }
            }
        }
    }
}

const scalePtr=document.querySelector("#scale_ptr");
const scaleVal=scalePtr.querySelector("span");
function setScale(val){
    const lw=scaleCanvas.getContext("2d").lineWidth;
    const tpmax=2*game.tippingPoint;
    scalePtr.style.top=lw/2+(scaleCanvas.height-lw)*(tpmax-val-game.tippingPoint)/tpmax+"px";
    scaleVal.textContent=val;
}

let blockActions=0;
const bell=document.querySelector("#bell");
bell.addEventListener("click",async function(){
    if(!blockActions){
        unselectCard();
        sendMsg(codeEndedTurn);
        await game.endTurn();
        if(game) await game.opponentsTurn();
    }
});

const hammer=document.querySelector("#hammer");
let hammerTime=false;

function cancelHammer(){
    hammer.classList.remove("clickedImg");
    hammerTime=false;
    boards[0].classList.remove("cardsClickable");
    boards[0].classList.remove("hammering");
}

hammer.addEventListener("click",function(){
    if(hammerTime){
        cancelHammer();
        blockActions--;
        updateBlockActions();
    }
    else if(!blockActions){
        unselectCard();
        hammer.classList.add("clickedImg");
        hammerTime=true;
        blockActions++;
        updateBlockActions();
        boards[0].classList.add("cardsClickable");
        boards[0].classList.add("hammering");
    }
});

const resign=document.querySelector("#resign");
const areYouSure=resign.querySelector("div");
const resignForReal=areYouSure.querySelector("button");

resign.addEventListener("click",function(e){
    if(e.target==resignForReal){
        game.itsOver();
        sendMsg(codeResign);
        resign.classList.remove("clickedImg");
    }
    else{
        resign.classList.toggle("clickedImg");
    }
});
resign.addEventListener("mouseleave",function(){
    resign.classList.remove("clickedImg");
});

const bsPopup=document.querySelector("#cut_the_bs");
const bsBtn=bsPopup.querySelector("button");
bsBtn.addEventListener("click",function(){
    game.bones[game.myTurn]+=400;
    updateBones(game.myTurn);
    bsPopup.style.opacity="0";
    bsPopup.style.visibility="hidden";
    bsPopup.style.transitionDuration="";
    blockActions--;
    updateBlockActions();
    game.BSDetector=-1;
    sendMsg(codeBoneBounty);
});

function BSDetected(){
    if(game.BSDetector<0) return;

    game.BSDetector++;
    if(game.BSDetector>2){
        bsPopup.style.opacity="1";
        bsPopup.style.visibility="visible";
        bsPopup.style.transitionDuration="400ms";
        blockActions++;
        updateBlockActions();
    }
}

let sacs=0;
let sacOverlays=[];
let sacCards=[];
let sacPos=[];
let isSaccing=true,hooked=false;

function sacAnim(card,side,pos){
    const sacOverlay=document.createElement("canvas");
    sacOverlay.style.transitionDuration="100ms";
    sacOverlay.width=i_cards.dims[0]*2;
    sacOverlay.height=i_cards.dims[1]*2;
    i_cards.draw(sacOverlay.getContext("2d"),2,0,2,0,0);
    boardOverlays[side][pos].appendChild(sacOverlay);
    void sacOverlay.offsetHeight;
    sacOverlay.style.opacity=0.75;
    sacOverlays.push(sacOverlay);
    sacCards.push(card);
    if(side==0) sacPos.push(card.pos);
}

async function sacrifice(){
    let catsAmongUs=false;
    let undied=[];
    for(let i=0; i<sacCards.length; i++){
        let fs=null;
        for(let s of sacCards[i].sigils){
            if(s.funcs==s_free_sac || s.funcs==s_freer_sac){
                fs=s;
                break;
            }
        }
        if(fs==null){
            sacCards[i].die();
        }
        else{
            catsAmongUs=true;
            if(fs.funcs==s_free_sac) sacCards[i].damage(1,extSource);
            else{
                fs.data.sacCounter++;
                if(fs.data.sacCounter>=9 && sacCards[i].card==c_cat){
                    undied.push(sacCards[i]);
                }
            }
        }
        const aaa=sacOverlays[i];
        setTimeout(function(){
            aaa.remove();
        },600);
    }
    for(let u of undied){
        await replace(u,c_undead_cat);
    }
    sacOverlays=[];
    sacCards=[];
    return catsAmongUs;
}

let clickProm=null;
let clickPromArmor=false;

playScr.addEventListener("click",function(){
    if(clickPromArmor){
        clickPromArmor=false;
    }
    else if(clickProm){
        clickProm(null);
        clickProm=null;
    }
});

for(let h=0; h<cardSpacesBase[0].length; h++){
    cardSpacesBase[0][h].parentNode.parentNode.addEventListener("click",async function(){
        const i=game.myTurn==0? h: cardSpacesBase[0].length-h-1;

        if(clickProm){
            clickProm([0,i]);
            clickProm=null;
            return;
        }

        if(hammerTime){
            const card=game.board[game.myTurn][i];
            if(card==null) return;
            cancelHammer();
            
            sendMsg(codeHammered+" "+card.pos);
            card.damage(25,extSource);
            if(game.tombRobberPresence && game.necroCount>0 && card.card==c_skeleton && game.bones[game.myTurn]>0){
                BSDetected();
            }

            await game.resolve();
            blockActions--;
            updateBlockActions();
            return;
        }

        if(!selectedCard) return;

        if(selectedCard.card.element==blood && selectedCard.card.cost!=0 && isSaccing){
            const card=game.board[game.myTurn][i];
            if(card==null || card.unsaccable){
                return;
            }

            const value=card.hasSigil(s_worthy)? 3: 1;
            const ind=sacCards.indexOf(card);
            if(ind!=-1){
                sacs-=value;
                sacCards.splice(ind,1);
                sacPos.splice(ind,1);
                const sacOverlay=sacOverlays[ind];
                sacOverlays.splice(ind,1);
                sacOverlay.style.opacity=0;
                setTimeout(function(){
                    sacOverlay.remove();
                },600);
                return;
            }

            sacs+=value;
            sacAnim(card,0,i);

            if(sacs>=selectedCard.card.getCost()){
                let canProceed=false;
                for(let i=0; i<sacCards.length; i++){
                    if(!sacCards[i].hasSigil(s_freer_sac) && (!sacCards[i].hasSigil(s_free_sac) || sacCards[i].health==1)){
                        canProceed=true;
                        break;
                    }
                }

                if(!canProceed){
                    for(let i=0; i<game.lanes; i++){
                        if(game.board[game.turn][i]==null){
                            canProceed=true;
                            break;
                        }
                    }
                }

                if(canProceed){
                    const catsAmongUs=await sacrifice();
                    // if(catsAmongUs && selectedCard.hasSigil(s_fecundity) && selectedCard.card.cost<=2){
                    //     BSDetected();
                    // }

                    boards[0].classList.remove("cardsClickable");
                    hands[0].classList.remove("cardsClickable");
                    isSaccing=false;
                    sacs=0;
                    blockActions+=2;
                    updateBlockActions();
                    await game.resolve();
                    blockActions--;
                    updateBlockActions();
                }
            }
        }
        else{
            if((blockActions && isSaccing) || blockActions>1 || game.board[game.myTurn][i]!=null) return;
            const played=selectedCard;
            const handIndex=game.hand.indexOf(selectedCard);

            let prefix="";
            if(played.mods && played.mods.extraSigs.length>0){
                prefix+=codePlayedModded;
                for(let s of played.mods.extraSigs){
                    prefix+=" "+s.id;
                }
                prefix+="\n";
            }
            if(played.card.custom){
                const c=played.card;
                prefix+=codePlayedCustom+" "+c.attack+" "+c.health+" "+c.cost+" "+c.element;
                for(let s of c.sigils){
                    prefix+=" "+s.id;
                }
                prefix+="\n";
            }

            const msgVals=[codePlayedCard,i,handIndex,...played.toSocket(),...sacPos];            
            sendMsg(prefix+msgVals.join(" "));
            sacPos=[];

            await selectedCard.play(i);
            if(!isSaccing){
                blockActions--;
                updateBlockActions();
                isSaccing=true;
                hooked=false;
            }
        }
    });
}

for(let h=0; h<cardSpacesBase[1].length; h++){
    cardSpacesBase[1][h].parentNode.parentNode.addEventListener("click",async function(){
        const i=game.myTurn==0? h: cardSpacesBase[0].length-h-1;

        if(clickProm){
            clickProm([1,i]);
            clickProm=null;
            return;
        }
    });
}

let scaleIntv=null;
let toConsume=0;
let scalePartial=0;
function updateScale(damage){
    if(toConsume==0){
        function f(){
            if(toConsume==0){
                clearInterval(scaleIntv);
                return;
            }
            const dir=toConsume>0? 1: -1;
            scalePartial+=dir;
            if(scalePartial<=0 && scalePartial<-game.tips[0] || scalePartial>=0 && scalePartial>game.tips[1]){
                scaleVal.textContent=scalePartial;
            }
            else{
                setScale(scalePartial);
            }
            toConsume-=dir;
        }
        clearInterval(scaleIntv);
        scaleIntv=setInterval(f,300);
        toConsume=damage;
        f();
    }
    else{
        toConsume+=damage;
    }
}

async function newGame(chosen,myJSON,theirJSON,creator){
    let _manas=null;
    mode=actModes[creator.mode];
    if(mode==mode_exp){
        if(theirJSON.myTurn==0){
            _manas=[myJSON.mana,theirJSON.mana];
        }
        else{
            _manas=[theirJSON.mana,myJSON.mana];
        }
    }

    if(game) await game.over;
    lensEl.style.display="none";
    game=new Game(_manas,theirJSON.myTurn,creator.tippingPoint,creator.cardsPerTurn);
    game.freshStart(deckToArray(decks[chosen]));
    game.initConstants();
    playScreen();
    bandaid();
}

const hearts=playScr.querySelectorAll(".heart");
const act1Stuff=playScr.querySelectorAll(".act1stuff");
const gidParent=playScr.querySelector("#myItems");
const gameItemDivs=gidParent.children;
const theirItems=playScr.querySelector("#oppItems").children;

for(let i=0; i<gameItemDivs.length; i++){
    gameItemDivs[i].addEventListener("click",async function(){
        if(i<run.items.length && run.usedItems.indexOf(i)==-1 && blockActions==0){
            blockActions++;
            updateBlockActions();
            clickPromArmor=true;
            await run.items[i].myFunc(i);
            blockActions--;
            updateBlockActions();
        }
    });
}

let finishedDrawing=null;
function playScreen(){
    playScr.style.visibility="visible";

    for(let i=0; i<2; i++){
        const r=filled_canvas(2,i_cards,[2,2]);
        deckSpaces[i][0].innerHTML="";
        deckSpaces[i][0].appendChild(r);
        deckPiles[i][0]=r;

        if(game.manas){
            const r2=manas[game.manas[game.myTurn==0? i: 1-i]].render(2);
            deckSpaces[i][1].innerHTML="";
            deckSpaces[i][1].appendChild(r2);
            deckPiles[i][1]=r2;

            drawDeckShadow(i,1,numManas);
        }
    }
    drawDeckShadow(0,0,game.deck.length);
    drawDeckShadow(1,0,game.oppCardsLeft);

    for(let c of gameItemDivs){
        c.innerHTML="";
    }
    for(let c of theirItems){
        c.innerHTML="";
    }

    if(run){
        for(let i=0; i<2; i++){
            act1Stuff[i].style.display="";
            hearts[i].textContent=run.life[1-i];
        }
        updateItemDivs(gameItemDivs);
        resign.classList.remove("selectable");
    }
    else{
        for(let i=0; i<2; i++){
            act1Stuff[i].style.display="none";
        }
        resign.classList.add("selectable");
    }

    const ctx=scaleCanvas.getContext("2d");
    ctx.clearRect(0,0,scaleCanvas.width,scaleCanvas.height);
    ctx.lineWidth=2;
    const step=(scaleCanvas.height-ctx.lineWidth)/(2*game.tippingPoint);
    ctx.strokeStyle="#7f7f7f";
    const midWidth=20;
    const extWidth=30;
    const smallWidth=10;
    const midOffset=scaleCanvas.width-extWidth/2;
    
    ctx.beginPath();
    ctx.moveTo(midOffset,(game.tippingPoint-game.tips[1])*step);
    ctx.lineTo(midOffset,(game.tippingPoint+game.tips[0])*step);
    ctx.stroke();

    for(let i=game.tippingPoint-game.tips[1]; i<=game.tippingPoint+game.tips[0]; i++){
        let tam;
        if(i==game.tippingPoint-game.tips[1] || i==game.tippingPoint+game.tips[0]){
            tam=extWidth;
        }
        else if(i==game.tippingPoint){
            tam=midWidth;
        }
        else{
            tam=smallWidth;
        }

        ctx.moveTo(midOffset-tam/2,ctx.lineWidth/2+i*step);
        ctx.lineTo(midOffset+tam/2,ctx.lineWidth/2+i*step);
        ctx.stroke();
    }

    setScale(0);
    cardSpaces=[[...cardSpacesBase[0]],[...cardSpacesBase[1]]];
    boardOverlays=[[...boardOverlaysBase[0]],[...boardOverlaysBase[1]]];
    if(game.myTurn==1){
        for(let i=0; i<2; i++){
            cardSpaces[i].reverse();
            boardOverlays[i].reverse();
        }
    }

    if(game.turn!=game.myTurn){
        (new Promise((resolve)=>{
            finishedDrawing=resolve;
        })).then(()=>{
            game.opponentsTurn();
        });
    }
}

const errors=document.querySelectorAll("#menu .modalBG .error");
let errorTimers=new Array(errors.length).fill(null);
let errorHovers=new Array(errors.length).fill(false);
let errorStale=new Array(errors.length).fill(true);

for(let i=0; i<errors.length; i++){
    errors[i].addEventListener("mouseenter",function(){
        errorHovers[i]=true;
    });
    errors[i].addEventListener("mouseleave",function(){
        errorHovers[i]=false;
        if(errorStale[i]){
            hideError(i);
        }
    });
}

function hideError(i){
    errors[i].classList.remove("showError");
    void errors[i].offsetHeight;
    errors[i].classList.add("hideError");
}

function showError(msg,i){
    errors[i].innerHTML=msg;
    errors[i].classList.remove("hideError");
    void errors[i].offsetHeight;
    errors[i].classList.add("showError");
    errorStale[i]=false;

    clearTimeout(errorTimers);
    errorTimers[i]=setTimeout(function(){
        errorStale[i]=true;
        if(!errorHovers[i]){
            hideError(i);
        }
    },2000);
}

const scaleInput=document.querySelector("#sc");
const nameInput=document.querySelector("#name");
const cptInput=document.querySelector("#cpt");
const lifeInput=document.querySelector("#hp");

function validateDeck(mode,i){
    let chosen=select.value;
    if(chosen==null || chosen==""){
        chosen=-1;
    }
    else{
        chosen=parseInt(chosen);
    }
    if(chosen==-1 || decks[chosen].size!=minCards) showError("Escolha um deck!",i);
    if(decks[chosen].mode!=mode){
        showError("Esse deck não é compatível.",i);
        return -1;
    }
    return chosen;
}

const actClasses=["a2","a2","a1"];
const actText=["Classic","Extended","Draft"];
const actModes=[mode_orig,mode_exp,mode_exp];
const acts=[1,1,0];
let modeInd=1;
const actTitles=pregame.querySelectorAll("h2 span");
const configDiv=pregame.querySelector("#configs");

function whenChanged(){
    if(isPlayClicked){
        sendMsg(codeDeleteOffer);
        playBtn.classList.remove("waiting");
    }
}

for(let i=0; i<actClasses.length; i++){
    actTitles[i].addEventListener("click",function(){
        if(i!=modeInd){
            const old_mi=modeInd;
            actTitles[modeInd].classList.remove("selectedAct");
            configDiv.classList.remove(actClasses[modeInd]);
            modeInd=i;
            actTitles[modeInd].classList.add("selectedAct");
            configDiv.classList.add(actClasses[modeInd]);
            updateDeckSelect(0);
            whenChanged();
            if(actModes[modeInd]!=actModes[old_mi]){
                const ins=[scaleInput,cptInput];
                for(let inp of ins){
                    let temp=inp.value;
                    const attr=inp.getAttribute("data-latent");
                    inp.value=attr;
                    inp.setAttribute("data-latent",temp);
                }
            }
        }
    });
}

const allInputs=pregame.querySelectorAll("input,select");
for(let i of allInputs){
    i.addEventListener("input",function(){
        whenChanged();
    });
}
select.addEventListener("input",function(){
    whenChanged();
});

let isPlayClicked=false;
playBtn.addEventListener("click",async function(){
    if(isPlayClicked) return;
    respQueue.clear();
    promQueue.clear();
    waiting=[];
    let chosen;
    if(acts[modeInd]==modeAct2){
        chosen=validateDeck(actModes[modeInd],0);
        if(chosen==-1) return;
    }

    isPlayClicked=true;
    playBtn.classList.add("waiting");
    await socketReady;

    const json={
        name: nameInput.value,
        data:{
            tippingPoint: parseInt(scaleInput.value),
            cardsPerTurn: parseInt(cptInput.value),
            mode: modeInd,
        }
    }
    if(acts[modeInd]==modeAct1){
        json.data.lifeTotal=parseInt(lifeInput.value);
    }
    else if(acts[modeInd]==modeAct2 && actModes[modeInd]==mode_exp){
        json.data.mana=decks[chosen].mana;
    }
    
    sendMsg(codeCreateGame+JSON.stringify(json));
    let msg=await getNextMsg();
    if(msg!="{}"){
        let msg2=JSON.parse(msg);
        showError(msg2.error,0);
        isPlayClicked=false;
        return;
    }

    let otherPlayer=await getNextMsg();
    playBtn.classList.remove("waiting");
    if(otherPlayer=="{}"){ // was deleted
        isPlayClicked=false;
        return;
    }

    let otherJSON=JSON.parse(otherPlayer);
    menu.style.visibility="hidden";
    isPlayClicked=false;
    closeModal(modals[0]);
    if(acts[modeInd]==modeAct2){
        newGame(chosen,json.data,otherJSON,json.data);
    }
    else if(acts[modeInd]==modeAct1){
        newRun(otherJSON,json.data);
    }
});

const findErrorEl=document.querySelector("#fgError");
const gameList=document.querySelector("#foundGames");
async function searchGames(){
    sendMsg(codeListGames);
    let msg=await getNextMsg();

    let p;
    if(msg=="null"){
        p=[];
    }
    else{
        p=JSON.parse(msg);
    }
    gameList.innerHTML="";
        
    if(p.length>0){
        findErrorEl.textContent="";

        for(let i=0; i<p.length; i++){
            const m=p[i].data.mode;
            const game=document.createElement("div");
            const name=document.createElement("h3");
            name.textContent=p[i].name;
            game.appendChild(name);
            const mode=document.createElement("span");
            mode.textContent=actText[p[i].data.mode];
            game.appendChild(mode);

            const info=document.createElement("div");
            info.className="info";
            game.appendChild(info);

            const showInfo=document.createElement("div")
            info.appendChild(showInfo);
            showInfo.innerHTML=`<div><div>Limite da balança</div><div>`+p[i].data.tippingPoint+`</div></div><div><div>Cartas por turno</div><div>`+p[i].data.cardsPerTurn+`</div></div>`
            if(acts[m]==modeAct1) showInfo.innerHTML+=`<div><div>Vida total</div><div>`+p[i].data.lifeTotal+`</div></div>`;

            info.addEventListener("click",function(){
                showInfo.classList.toggle("visible");
            });
            info.addEventListener("mouseleave",function(){
                showInfo.classList.remove("visible");
            });

            const join=document.createElement("div");
            join.className="join";
            game.appendChild(join);

            let closure_i=i;
            join.addEventListener("click",async function(){
                let chosen;
                if(acts[m]==modeAct2){
                    chosen=validateDeck(actModes[m],1);
                    if(chosen==-1) return;
                }

                const json={
                    name: p[closure_i].name
                }
                if(acts[m]==modeAct2 && actModes[m]==mode_exp){
                    json.data={
                        mana: decks[chosen].mana
                    }
                }
                sendMsg(codeJoinGame+JSON.stringify(json));

                let otherPlayer=await getNextMsg();
                let otherJSON=JSON.parse(otherPlayer);
                if(otherJSON.error){
                    showError(otherJSON.error,1);
                    return;
                }

                menu.style.visibility="hidden";
                closeModal(modals[1]);
                if(acts[otherJSON.mode]==modeAct2){
                    newGame(chosen,json.data,otherJSON,otherJSON);
                }
                else if(acts[otherJSON.mode]==modeAct1){
                    newRun(otherJSON,otherJSON);
                }
            });

            gameList.appendChild(game);
        }
    }
    else{
        findErrorEl.textContent="Nenhum jogo encontrado";
    }
}

const myDecks=playScr.querySelector("#myDecks");
const nuhuh=document.querySelector("#nuhuh");
const nuhuhPadding=70;
const drawOverlay=drawNuhuh(myDecks.offsetWidth+2*nuhuhPadding,myDecks.offsetHeight+2*nuhuhPadding,50,70);
drawOverlay.style.opacity=0.5;
nuhuh.prepend(drawOverlay);

const nuhuhSniper=document.querySelector("#nuhuhSniper");
const sniperOverlay=drawNuhuh(boards[1].offsetWidth+2*nuhuhPadding,boards[1].offsetHeight+2*nuhuhPadding,50,70);
nuhuhSniper.appendChild(sniperOverlay);

const fullShadow=document.querySelector("#fullShadow");
const fullOverlay=drawNuhuh(boards[0].offsetWidth+2*100+60,boards[0].parentNode.parentNode.offsetHeight+2*100,100,80);
fullShadow.appendChild(fullOverlay);

function drawNuhuh(w,h,shadow,corner){
    const drawOverlay=document.createElement("canvas");
    drawOverlay.width=w;
    drawOverlay.height=h;

    const ctx=drawOverlay.getContext("2d");
    const put=ctx.getImageData(0, 0, drawOverlay.width, drawOverlay.height);
    const img=put.data;
    const dims=[drawOverlay.width, drawOverlay.height];

    for(let dir1=1,i=0; dir1>=-1; dir1-=2,i++){
        for(let dir2=1,j=0; dir2>=-1; dir2-=2,j++){
            const extremes=[[0,dims[0]][i],[0,dims[1]][j]];
            const centers=[extremes[0]+dir1*(corner+shadow),extremes[1]+dir2*(corner+shadow)];

            for(let k=extremes[0]; k!=centers[0]; k+=dir1){
                for(let l=extremes[1]; l!=centers[1]; l+=dir2){
                    const dist=Math.sqrt((k-centers[0])**2+(l-centers[1])**2);
                    let transp;
                    if(dist<=corner){
                        transp=0;
                    }
                    else if(dist>=corner+shadow){
                        transp=255;
                    }
                    else{
                        transp=Math.round(255*(dist-corner)/shadow);
                    }
                    const pixel=[0,0,0,transp];
                    for(let m=0; m<4; m++){
                        img[4*(l*drawOverlay.width+k)+m]=pixel[m];
                    }
                }
            }

            const startCenter=[0,dims[j]][i]+(corner+shadow)*dir1;
            const endCenter=dims[j]-startCenter;
            if((startCenter>=endCenter+dir1)==1-i) continue;
            const startEdge=[0,0,dims[1],dims[0]][2*i+j];
            const endEdge=startEdge+dir1*shadow;

            for(let k=startEdge; k!=endEdge; k+=dir1){
                const transp=Math.round(255*(1-Math.abs(k-startEdge)/shadow));
                const pixel=[0,0,0,transp];
                for(let l=startCenter; l!=endCenter+dir1; l+=dir1){
                    for(let m=0; m<4; m++){
                        if(j==1) img[4*(l*drawOverlay.width+k)+m]=pixel[m];
                        else img[4*(k*drawOverlay.width+l)+m]=pixel[m];
                    }
                }
            }
        }
    }

    ctx.putImageData(put,0,0);
    return drawOverlay;
}

// deck

const deckSlots=9;
const copyLimit=2;
const minCards=20;
const numManas=15;
const deckDiv=document.querySelector("#decks");
const deckEditDiv=document.querySelector("#edit");
const deckTable=deckEditDiv.querySelector("#cards_in_deck");
const deckSizeEdit=deckEditDiv.querySelector(".size");
const deckTitle=deckEditDiv.querySelector("h3");
const editTitle=deckEditDiv.querySelector("header img");
const saveDeck=document.querySelector("#save");

let beingEdited=-1;
let decks=[];
let deckEls=[];
let deckData=[];

class Deck{
    constructor(){
        this.cards=[];
        this.mana=0;
        this.size=0;
        this.name="";
        this.mode=mode_exp;
    }
}

function deckToArray(d){
    let arr=[];
    for(let i=0; i<d.cards.length; i++){
        for(let j=0; j<d.cards[i]; j++){
            arr.push((d.mode==mode_exp? cards: origCards)[i]);
        }
    }
    return arr;
}

function updateDeckSize(el,i,dm=null){
    el.textContent=decks[i].size+"/"+minCards;
    if(decks[i].size==minCards){
        el.className="size ok";
    }
    else{
        el.className="size";
    }
    if(dm){
        dm.textContent=decks[i].size==0? "": modeNames[decks[i].mode];
    }
}

function updateMode(){
    if(mode==mode_exp){
        secondaryEl.style.display="";
        deckTable.style.paddingTop="";
    }
    else{
        secondaryEl.style.display="none";
        deckTable.style.paddingTop="15px";
    }
}

function tidyUpPile(p){
    const ch=p.children;
    if(ch.length>3){
        const delta=7/(ch.length-3);
        for(let i=ch.length-1,sum=delta; i>=3; i--,sum+=delta){
            ch[i].style.top=-sum+"px";
            ch[i].style.left=-sum+"px";
        }
        if(ch.length>=6){
            ch[1].style.display="";
            ch[1].textContent="x"+(ch.length-2);
        }
        else{
            ch[1].style.display="none";
        }
    }
}

const modeSwitchEl=document.querySelector("#mode_parent");
const modeSpan=document.querySelector("#mode");
const secondaryEl=document.querySelector("#secondary");
let regret;
modeSwitchEl.addEventListener("click",function(){
    const i=beingEdited;
    mode=1-mode;
    decks[i].mode=mode;
    modeSpan.textContent=modeNames[decks[i].mode];
    cardPool=mode==mode_exp? cards: origCards;
    calcFilters();

    const oldr=regret;
    regret=[...decks[i].cards];
    if(oldr){
        decks[i].cards=oldr;
    }
    else{
        decks[i].cards=new Array(mode==mode_exp? cards.length: origCards.length).fill(0);
        if(mode==mode_exp){
            for(let j=0; j<regret.length; j++){
                if(origCards[j].id!=null){
                    decks[i].cards[origCards[j].id]=Math.min(2,regret[j]);
                }
            }
        }
        else{
            for(let j=0; j<regret.length; j++){
                if(cards[j].origID!=null){
                    decks[i].cards[cards[j].origID]=regret[j];
                }
            }
        }
    }

    deckTable.innerHTML="";
    deckEls=[];
    let sum=0;
    for(let j=0; j<decks[i].cards.length; j++){
        for(let k=0; k<decks[i].cards[j]; k++){
            cardToTableRow(j);
        }
        sum+=decks[i].cards[j];
    }
    decks[i].size=sum;
    updateDeckSize(deckSizeEdit,beingEdited);
    updateMode();
});

function cardToTableRow(i){
    const deck=decks[beingEdited].cards;
    if(deckEls[i]!=null){
        const c=cardPool[i].render(1.5);
        deckEls[i].appendChild(c);
        tidyUpPile(deckEls[i]);
    }
    else{
        const div=document.createElement("div");
        const delBtn=document.createElement("div");
        delBtn.className="del";
        delBtn.addEventListener("click",function(){
            deck[i]--;
            decks[beingEdited].size--;
            updateDeckSize(deckSizeEdit,beingEdited);
            if(deck[i]>0){
                deckEls[i].lastChild.remove();
                tidyUpPile(deckEls[i]);
            }
            else{
                div.remove();
                deckEls[i]=null;
            }
            regret=null;
        });
        div.appendChild(delBtn);

        const counter=document.createElement("div");
        counter.className="cnt";
        div.appendChild(counter);
        counter.style.display="none";

        const c=cardPool[i].render(1.5);
        div.appendChild(c);
        deckEls[i]=div;
        deckTable.appendChild(div);
    }
}

for(let i=0; i<deckSlots; i++){
    const saved=localStorage.getItem("deck"+i);
    if(saved!=null){
        decks[i]=JSON.parse(saved);
        if(!("mode" in decks[i])){
            decks[i].mode=mode_exp;
        }
        const l=decks[i].mode==mode_exp? cards.length: origCards.length;
        for(let j=decks[i].cards.length; j<l; j++){
            decks[i].cards[j]=0;
        }
    }
    else{
        decks[i]=new Deck();
        decks[i].name="Unnamed "+i;
        decks[i].cards=Array.from({ length: cards.length }).fill(0);
    }
}

editTitle.addEventListener("click",function(){
    deckTitle.focus();
});

const manaSel=deckEditDiv.querySelectorAll("#sec .caret");
const manaCanvas=deckEditDiv.querySelector("#sec canvas");
let selectedMana;

function updateMana(){
    const ctx=manaCanvas.getContext("2d");
    ctx.clearRect(0,0,manaCanvas.width,manaCanvas.height);
    i_portraits.draw(ctx,1.5,...manas[selectedMana].portrait,0,0);
}

manaSel[0].addEventListener("click",function(){
    selectedMana--;
    if(selectedMana<0) selectedMana+=manas.length;
    updateMana();
});

manaSel[1].addEventListener("click",function(){
    selectedMana++;
    if(selectedMana>=manas.length) selectedMana=0;
    updateMana();
});

const banned=document.querySelector("#banned");
const agreeBtn=banned.querySelector("button");
agreeBtn.addEventListener("click",function(){
    closeModal(banned);
});

saveDeck.addEventListener("click",function(){
    const deck=decks[beingEdited];
    // if(deck.cards[c_mice.id]>0 && deck.cards[c_cat.id]>0){
    //     banned.style.visibility="visible";
    //     banned.style.opacity=1;
    //     return;
    // }

    deck.name=deckTitle.textContent;
    deck.mana=selectedMana;
    deckData[beingEdited].name.textContent=deck.name;
    updateDeckSize(deckData[beingEdited].size,beingEdited,deckData[beingEdited].mode);

    localStorage.setItem("deck"+beingEdited,JSON.stringify(deck));

    deckEditDiv.style.bottom="100%";
    beingEdited=-1;
});

let beingCopied=null;
let copiedEl=null;

function bruh1(){
    copiedEl.classList.remove("green");
}
function bruh2(){
    copiedEl.classList.add("green");
}

for(let i=0; i<deckSlots; i++){
    const aDeck=document.createElement("div");
    const title=document.createElement("div");
    const cardCount=document.createElement("div");
    const ccParent=document.createElement("div");
    const dMode=document.createElement("div");
    ccParent.appendChild(dMode);
    ccParent.appendChild(cardCount);

    title.textContent=decks[i].name;
    updateDeckSize(cardCount,i,dMode);
    aDeck.appendChild(title);
    aDeck.appendChild(ccParent);
    deckDiv.appendChild(aDeck);

    deckData.push({
        size:cardCount,
        mode:dMode,
        name:title,
    });

    const optElWrapper=document.createElement("div");
    optElWrapper.className="deckOpts";
    aDeck.appendChild(optElWrapper);
    const optEl=document.createElement("div");
    optElWrapper.appendChild(optEl);

    const copyBtn=document.createElement("img");
    copyBtn.src="icons/copy.svg";
    optEl.appendChild(copyBtn);
    const trashBtn=document.createElement("img");
    trashBtn.src="icons/trash-icon.svg";
    optEl.appendChild(trashBtn);

    aDeck.addEventListener("click",function(e){
        if(e.target==copyBtn){
            beingCopied=i;
            deckDiv.classList.add("copying");
            copiedEl=aDeck;
            aDeck.classList.add("green");
            aDeck.addEventListener("mouseenter",bruh1);
            aDeck.addEventListener("mouseleave",bruh2);
        }
        else if(e.target==trashBtn){
            localStorage.removeItem("deck"+i);
            decks[i].cards=Array.from({ length: cards.length }).fill(0);
            decks[i].size=0;
            updateDeckSize(cardCount,i,dMode);
        }
        else if(e.target!=optEl){
            if(beingCopied!=null){
                const d=decks[beingCopied];
                decks[i].cards=[...d.cards];
                decks[i].size=d.size;
                decks[i].mana=d.mana;
                deckDiv.classList.remove("copying");
                copiedEl.classList.remove("green");
                copiedEl.removeEventListener("mouseenter",bruh1);
                copiedEl.removeEventListener("mouseleave",bruh2);
                localStorage.setItem("deck"+i,JSON.stringify(decks[i]));
                updateDeckSize(cardCount,i,dMode);
                beingCopied=null;
                copiedEl=null;
            }
            else{
                beingEdited=i;
                deckEditDiv.style.bottom="0";
                deckEls=[];
                deckTable.innerHTML="";
                deckTitle.textContent=decks[i].name;
                selectedMana=decks[i].mana;
                updateMana();
                updateDeckSize(deckSizeEdit,beingEdited);
                // deckEditDiv.style.overflow="hidden";
                // setTimeout(function(){
                //     deckEditDiv.style.overflow="";
                // },200);
                
                if(mode!=decks[i].mode){
                    mode=decks[i].mode;
                    cardPool=mode==mode_exp? cards: origCards;
                    calcFilters();
                    updateMode();
                }
                modeSpan.textContent=modeNames[mode];

                for(let j=0; j<decks[i].cards.length; j++){
                    for(let k=0; k<decks[i].cards[j]; k++){
                        cardToTableRow(j);
                    }
                }
                regret=null;
            }
        }
    })
}

const costOuter=document.querySelector("#costFilter");
const costTypes=document.querySelector("#cost_type");
const costOp=document.querySelector("#cost_op");
const costNumber=document.querySelector("#cost_number");
const costDivs=[costTypes,costOp,costNumber];
const qtds=[3,3,9];
let subdivs=[];

for(let i=0; i<costDivs.length; i++){
    for(let j=0; j<qtds[i]; j++){
        const d=document.createElement("div");
        costDivs[i].appendChild(d);
    }
    costDivs[i].addEventListener("click",function(){
        activateCostFilter();
        calcFilters();
    })
}

function empty_canvas(scale,img){
    const canvas=document.createElement("canvas");
    canvas.width=img.dims[0]*scale;
    canvas.height=img.dims[1]*scale;
    return canvas;
}

function filled_canvas(scale,img,pos,offset=[0,0]){
    const canvas=empty_canvas(scale,img);
    const ctx=canvas.getContext("2d");
    img.draw(ctx,scale,pos[0],pos[1],offset[0],offset[1]);
    return canvas;
}

const cht=[...costTypes.children];
for(let i=0; i<cht.length; i++){
    let c;
    if(i==0){
        c=filled_canvas(3,i_sigils,s_bones.coords);
    }
    else if(i==1){
        c=filled_canvas(4,i_costs,[blood,0],[-7.5,0.5]);
    }
    else{
        c=filled_canvas(4,i_costs,[energy,0],[-7,0.5]);
    }
    cht[i].appendChild(c);
}

const cho=[...costOp.children];
for(let i=0; i<cho.length; i++){
    const s=document.createElement("span");
    s.textContent=["≥","≤","="][i];
    s.className="canvas_like";
    cho[i].appendChild(s);
}

const chn=[...costNumber.children];
for(let i=0; i<chn.length; i++){
    chn[i].appendChild(filled_canvas(6,i_numbers,[i+1,0]));
}

let costSubdivs=[cht,cho,chn];
let carets=[]
let selectedCosts=[0,0,0];
let isCFActive=false;
let height=null;

function activateCostFilter(){
    costOuter.className="";
    isCFActive=true;
}
function deactivateCostFilter(){
    costOuter.className="all_inactive";
    isCFActive=false;
}

for(let i=0; i<costDivs.length; i++){
    costSubdivs[i][selectedCosts[i]].style.display="flex";
    let parent=costDivs[i].parentNode;
    if(height==null) height=parent.offsetHeight;

    carets[i]=[...parent.children].slice(0,2);
    for(let j=0; j<2; j++){
        carets[i][j].addEventListener("click",function(){
            const dir=j==0? 1: -1;
            let newIndex=(selectedCosts[i]+dir)%costSubdivs[i].length;
            if(newIndex<0){
                newIndex+=costSubdivs[i].length;
            }

            const newEl=costSubdivs[i][newIndex];
            const oldEl=costSubdivs[i][selectedCosts[i]];
            let old_sel=selectedCosts[i];
            selectedCosts[i]=newIndex;

            newEl.style.display="flex";

            // move without transition
            newEl.style.transition="none";
            newEl.style.top=-dir*height+"px";

            void newEl.offsetHeight;
            
            // move with transition
            newEl.style.transition=null;
            newEl.style.top="0px";
            
            oldEl.style.top=dir*height+"px";

            activateCostFilter();
            calcFiltersLater();

            setTimeout(function(){
                if(selectedCosts[i]==old_sel) return;

                oldEl.style.display="none";
                oldEl.style.top="0px";
            },300);
        });
        carets[i][j].addEventListener("mouseleave",function(){
            if(isCFActive) calcFilters();
        });
    }
}

const trashC=costOuter.querySelector(".trash");
trashC.addEventListener("click",function(){
    deactivateCostFilter();
    calcFilters();
})

const sfDiv=document.querySelector("#sigilFilter");
const sigilFilters=[...sfDiv.children].slice(0,2);
const sigilsDiv=document.createElement("div");
sigilsDiv.className="sigil_select";
const sdWidth=Math.floor(Math.sqrt(sigilCoords.length));
const sdHeight=Math.ceil(sigilCoords.length/sdWidth);
let selectedSF=0;
let selectedSigs=[-1,-1];
let sigilButtons=[];
const sfScale=3;
let canvases=[];
let sfInterval=null;

function showSelected(_new){
    let old=selectedSigs[selectedSF];
    if(old==_new) return;
    if(old!=-1){
        sigilButtons[old].className="";
    }
    if(_new!=-1){
        sigilButtons[_new].className="selected";
    }
}

for(let i=0; i<sdWidth*sdHeight; i++){
    if(i!=0 && i%sdWidth==0){
        sigilsDiv.appendChild(document.createElement("br"));
    }
    const divCanvas=document.createElement("div");
    if(i<sigilCoords.length){
        divCanvas.appendChild(filled_canvas(2,i_sigils,sigilCoords[i]));

        divCanvas.addEventListener("click",function(){
            showSelected(i);
            selectedSigs[selectedSF]=i;
            const ctx=canvases[selectedSF];
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.canvas.className="";
            i_sigils.draw(ctx,sfScale,sigilCoords[i][0],sigilCoords[i][1],0,0);
            calcFilters();
        });

        sigilButtons.push(divCanvas);
    }

    sigilsDiv.appendChild(divCanvas);
}

function drawEmpty(ctx){
    ctx.canvas.className="inactive";
    i_sigils.draw(ctx,sfScale,5,4,0,0);
}

for(let i=0; i<sigilFilters.length; i++){
    const c=empty_canvas(sfScale,i_sigils);
    const ctx=c.getContext("2d");
    drawEmpty(ctx);
    canvases.push(ctx);
    sigilFilters[i].appendChild(c);

    sigilFilters[i].addEventListener("mouseover",function(){
        clearInterval(sfInterval);
        showSelected(selectedSigs[i]);
        sigilFilters[i].appendChild(sigilsDiv);
        void sigilsDiv.offsetHeight;
        sigilsDiv.style.opacity="1";
        selectedSF=i;
    });
    sigilFilters[i].addEventListener("mouseleave",function(){
        sigilsDiv.style.opacity="0";
        sfInterval=setInterval(function(){
            sigilsDiv.remove();
        },275);
    })
}

const trashSF=sfDiv.querySelector(".trash");
trashSF.addEventListener("click",function(){
    for(let i=0; i<2; i++){
        if(selectedSigs[i]!=-1){
            sigilButtons[selectedSigs[i]].className="";
            let ctx=canvases[i];
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            drawEmpty(ctx);
        }
    }
    selectedSigs=[-1,-1];
    calcFilters();
})

let filter_intv=null;
function calcFiltersLater(){
    clearInterval(filter_intv);
    filter_intv=setInterval(function(){
        calcFilters();
    },350);
}

function matchesSigils(card){
    for(let i=0; i<selectedSigs.length; i++){
        if(selectedSigs[i]!=-1){
            let has=false;
            const s=card.getVisibleSigils();
            for(let j=0; j<s.length; j++){
                if(s[j].coords==sigilCoords[selectedSigs[i]]){
                    has=true;
                    break;
                }
            }
            if(!has) return false;
        }
    }
    return true;
}

let cardPool=cards;
let filteredCards=[...cardPool];
function calcFilters(){
    clearInterval(filter_intv);
    filteredCards=[];

    if(!isCFActive){
        for(let i=0; i<cardPool.length; i++){
            if(matchesSigils(cardPool[i])){
                filteredCards.push(cardPool[i]);
            }
        }
    }
    else{
        let targetCost=selectedCosts[2]+1;
        for(let i=0; i<cardPool.length; i++){
            if(cardPool[i].element==elements[selectedCosts[0]]){
                let cond;
                switch(selectedCosts[1]){
                    case 2: cond=cardPool[i].getCost()==targetCost; break;
                    case 1: cond=cardPool[i].getCost()<=targetCost; break;
                    default: cond=cardPool[i].getCost()>=targetCost;
                }
                if(cond && matchesSigils(cardPool[i])){
                    filteredCards.push(cardPool[i]);
                }
            }
        }
    }

    showCardPages();
}

const cardsDiv=document.querySelector("#cards");
const cardPaddingX=34;
const cardPaddingY=34;
const cardScale=3;
const cardDivWidth=cardsDiv.offsetWidth;
const cardDivHeight=cardsDiv.offsetHeight;
const cardsPerPageX=Math.floor((cardsDiv.offsetWidth+cardPaddingX)/(cardScale*cardWidth+cardPaddingX));
const cardsPerPageY=Math.floor((cardsDiv.offsetHeight+cardPaddingY)/(cardScale*cardHeight+cardPaddingY));
const cardsPerPage=cardsPerPageX*cardsPerPageY;

let currPage=0;
let pages=[];

function updatePage(curr){
    if(pages.length==0) return;
    if(currPage!=-1){
        pages[currPage].style.display="";
    }
    pages[curr].style.display="block";
    currPage=curr;
}

function showCardPages(){
    filteredCards.sort(function(a,b){
        if(b.element!=a.element){
           return a.element-b.element;
        }
        else{
            return a.getCost()-b.getCost();
        }
    });
    cardsDiv.innerHTML="";
    pages=[];

    for(let i=0; i<filteredCards.length; i+=cardsPerPage){
        const page=document.createElement("div");
        for(let j=0; j<cardsPerPage; j++){
            const cardEl=document.createElement("div");
            cardEl.style.width=cardWidth*cardScale+"px";
            cardEl.style.height=cardHeight*cardScale+"px";

            if(i+j<filteredCards.length){
                cardEl.appendChild(filteredCards[i+j].render(cardScale));
                cardEl.addEventListener("click",function(){
                    const deck=decks[beingEdited];
                    const id=mode==mode_exp? filteredCards[i+j].id: filteredCards[i+j].origID;
                    if(beingEdited!=-1){
                        let ok;
                        if(mode==mode_orig){
                            ok=deck.cards[id]==0 || (id!=c_ouroboros.origID && id!=c_drowned.origID);
                        }
                        else{
                            ok=deck.cards[id]<copyLimit;
                        }
                        if(ok){
                            deck.cards[id]++;
                            deck.size++;
                            updateDeckSize(deckSizeEdit,beingEdited);
                            cardToTableRow(id);
                            regret=null;
                        }
                    }
                })
            }

            if(j%cardsPerPageX!=0){
                cardEl.style.paddingLeft=cardPaddingX+"px";
            }
            else if(j!=0){
                page.appendChild(document.createElement("br"));
            }
            if(j>=cardsPerPageX) cardEl.style.paddingTop=cardPaddingY+"px";
            page.appendChild(cardEl);
        }
        cardsDiv.appendChild(page);
        pages.push(page);
    }

    currPage=-1;
    updatePage(0);
}
setTimeout(function(){
    showCardPages();
},500);

const pageCarets=document.querySelectorAll("#cards_wrapper .caret");
for(let i=0; i<2; i++){
    pageCarets[i].addEventListener("click",function(){
        const dir=i==0? -1: 1;
        let newPage=(currPage+dir)%pages.length;
        if(newPage<0){
            newPage+=pages.length;
        }
        updatePage(newPage);
    });
}

const rets=document.querySelectorAll(".ret");
for(let r of rets){
    const ctx=r.getContext("2d");
    i_sigils.draw(ctx,2,s_sidestep.coords[0],s_sidestep.coords[1],0,0);
}

const retCanvas=document.querySelector("#left .ret");
retCanvas.addEventListener("click",function(){
    editor.style.visibility="hidden";
    menu.style.visibility="visible";
});
"use strict"

let itemTypes=[];
class Item{
    constructor(name,desc,file,lots,theirFunc,myFunc=null){
        this.name=name;
        this.desc=desc;
        this.lots=lots;
        this.theirFunc=theirFunc;
        this.id=itemTypes.length;
        itemTypes.push(this);

        if(myFunc==null){
            myFunc=async function(i){
                sendMsg(codeItem+" "+this.id);
                await theirFunc(i);
            }.bind(this);
        }
        this.myFunc=myFunc;

        if(!(file in imgMap)){
            imgMap[file]=new ImgWrapper("items/"+file);
        }
        this.file=imgMap[file];
    }
}

const rockItem=new Item("Boulder in a Bottle","Obtenha uma Pedra 0/5.","boulder.webp",()=>1,async function(i){
    await consumeItem(i);
    await game.addCardToHand(c_rock,game.turn);
});

const sqItem=new Item("Squirrel in a Bottle","Obtenha um Esquilo 0/1","squirrel.webp",()=>1,async function(i){
    await consumeItem(i);
    await game.addCardToHand(c_squirrel,game.turn);
});


const pliersItem=new Item("Pliers","Causa 1 de dano ao oponente.","pliers.webp",()=>1,async function(i){
    await consumeItem(i);
    await game.tiltScales(1,null,null);
    game.checkScales();
});

const bonesItem=new Item("Hoggy Bank","Ganhe 2 ossos.","bones.webp",()=>0.25,async function(i){
    await consumeItem(i);
    game.bones[game.turn]+=2;
    updateBones(game.turn);
});

function applyTotem(c,ind){
    const sig=game.totemEffects[c.side][ind];
    if(sig==s_undying && c.card.cost==0) return null;
    const gs=new GameSigil(sig,true);

    const el=sigilElement(sig);
    el.width=i_sigils.dims[0]*2;
    el.height=i_sigils.dims[1]*2;
    el.style.translate="0px "+(c.totemEls.length)*34+"px";
    el.classList.add("fromTotem");
    i_sigils.draw(el.getContext("2d"),2,...sig.coords,0,0);
    c.sigilEls.push(el);
    c.totemEls.push(el);
    gs.el=el;
    c.canvas.appendChild(el);
    el.style.opacity=0;
    void el.offsetHeight;
    el.style.opacity=1;
    if(sig.initData) gs.data=sig.initData(c,gs);
    c.sigils.push(gs);
    c.addListener(gs,c.side);
    return gs;
}

function makeTotem(sig,img,lotFn){
    return new Item("Instant Totem","Dê "+sig.name+" às suas cartas"+(sig==s_undying? " QUE CUSTAM MAIS DE 0": "")+" por 1 turno.",img,lotFn,async function(i){
        game.totemEffects[game.turn].push(sig);
        await consumeItem(i);

        for(let i=0; i<game.lanes; i++){
            const c=game.board[game.turn][i];
            if(c!=null){
                let gs=applyTotem(c,game.totemEffects[game.turn].length-1);
                if(gs){
                    for(let f of sig.onCardMoved){
                        if(f.type==listen_me){
                            await f.func(c,null,c,gs.data);
                        }
                    }
                }
            }
        }
        game.sortListeners();
    });
}

const totemItems=[
    makeTotem(s_quills,"spike_totem.webp",()=>0.25),
    makeTotem(s_stinky,"stink_totem.webp",()=>0.25),
    makeTotem(s_sq_spawner,"sq_totem.webp",()=>0.25),
    makeTotem(s_undying,"totem_of_undying.webp",()=>0.25),
    makeTotem(s_burrow,"burrow_totem.webp",()=>0.25),
]

function maintainOppItems(search=run.revealedItems){
    let ind;

    if(run.revealedItems.length>2){
        ind=run.oppUnusedItems.indexOf(null);
        if(ind==-1){
            if(run.usedQueue.length==0){
                oldest=lensItem.id;
            }
            else{
                oldest=run.usedQueue[0];
                run.usedQueue.splice(0,1);
            }
            ind=search.indexOf(oldest);
        }
        run.revealedItems.splice(ind,1);
        run.oppUnusedItems.splice(ind,1);
    }
    else{
        ind=run.revealedItems.length;
    }
    return ind;
}

const lensEl=document.querySelector("#floatingLens")
const lenses=lensEl.children;
for(let i=0; i<lenses.length; i++){
    lenses[i].addEventListener("click",async function(){
        if(run && game.turn==game.myTurn && blockActions==1 && run.items[i]==lensItem && run.usedItems.indexOf(i)==-1){
            blockActions++;
            updateBlockActions();
            await lensItem.myFunc(i);
            blockActions--;
            updateBlockActions();
        }
    });
}

const lensItem=new Item("Magpie's Lens","Coloque uma carta no topo do seu deck.","lens.webp",()=>1,
null,
async function(i){
    await Promise.all([consumeItem(i),tutor((i)=>{
        let temp=game.deck[i];
        game.deck[i]=game.deck[game.deck.length-1];
        game.deck[game.deck.length-1]=temp;
        shuffle(game.deck,game.deck.length-2,true);
    }).then(()=>{if(game.deck.length>0) deckPiles[0][0].click();})]);
});

for(let i=0; i<lenses.length; i++){
    addTooltip(lensItem,lenses[i].firstElementChild);
}

function removeListeners(card){
    for(let ref of listenerRefs){
        for(let i=0; i<2; i++){
            let l2=[];
            for(let l of game[ref][i]){
                if(l.caller!=card){
                    l2.push(l);
                }
            }
            game[ref][i]=l2;
        }
    }
}

const hookItem=new Item("Fisherman's Hook","Mude uma carta sua de posição.","hook.webp",()=>1,
async function(i,args){
    const target=args[0];
    const targetData=game.board[game.turn][target];
    const uiTurn=+(game.turn!=game.myTurn);
    const cardDiv=unplayCard(uiTurn,target);
    targetData.pos=null;
    game.board[game.turn][target]=null;
    for(let s of targetData.sigils){
        for(let q of s.funcs.onCardMoved){
            if(q.type==listen_me) await q.func(targetData,target,targetData,s.data);
        }
    }
    for(let l of [...game.movementListeners[game.turn]]){
        await l.func(l.caller,target,targetData,l.data);
    }
    removeListeners(targetData);

    await Promise.all([consumeItem(i),game.addCardToHand(targetData.getCard(),targetData.side,function(c){
        c.health=targetData.health;
        c.updateStat(1,c.health);
    },null).then((card)=>{
        if(uiTurn==0){
            cardDiv.parentNode.replaceChild(card.canvas,cardDiv);
            selectCard(card);
            isSaccing=false;
            hooked=true;
            blockActions++;
            updateBlockActions();
        }
    })]);
},
async function(i){
    boards[0].classList.add("cardsClickable");
    const rect=boards[0].getBoundingClientRect();
    sniperOverlay.style.top=rect.top-nuhuhPadding+"px";
    sniperOverlay.style.left=rect.left-nuhuhPadding+"px";
    nuhuhSniper.style.transitionDuration="300ms";
    nuhuhSniper.style.opacity="0.5";

    while(true){
        let res=await Promise.any([game.over,new Promise((resolve)=>clickProm=resolve)]);
        if(!res){
            break;
        }
        boards[0].classList.remove("cardsClickable");
        let [pl,target]=res;
        if(pl==0 && game.board[game.myTurn][target]!=null){
            sendMsg(codeItem+" "+hookItem.id+" "+target);
            hookItem.theirFunc(i,[target]);
            break;
        }
    }

    nuhuhSniper.style.transitionDuration="100ms";
    nuhuhSniper.style.opacity="0";
});

const bleachItem=new Item("Magical Bleach","Remova as habilidades das cartas do oponente.","silence.webp",()=>1,
async function(i,args){
    const pl=1-game.turn;
    const b=game.board[pl];
    for(let i=0; i<b.length; i++){
        const targetData=b[i];
        if(targetData==null){
            continue;
        }

        const target=targetData.pos;
        let s2=[];
        targetData.pos=null;
        for(let s of targetData.sigils){
            if(s.funcs instanceof StatSigil) s2.push(s);
            else for(let q of s.funcs.onCardMoved){
                if(q.type==listen_me) await q.func(targetData,target,targetData,s.data);
            }
        }
        targetData.sigils=s2;

        for(let l of [...game.movementListeners[pl]]){
            await l.func(l.caller,target,targetData,l.data);
        }
        targetData.pos=target;
        removeListeners(targetData);

        const purged=targetData.sigilEls.filter((x)=>!x.classList.contains("bleach_survivor"));
        for(let s of purged){
            s.style.animation="fadeIn 500ms linear reverse";
            s.style.opacity="0";
        }
        setTimeout(function(){
            for(let s of purged){
                s.remove();
            }
        },500);
    }
    
    await consumeItem(i);
});

function closeItemModal(){
    itemModal.style.opacity="0";
    itemModal.style.visibility="hidden";
    itemModal.style.transitionDelay="0ms";
    hoveredTT=null;
    tooltip.style.visibility="hidden";
    tooltip.style.opacity=0;
}

function addItem(it){
    const len=run.items.length;
    run.items.push(it);
    addItemImg(len,itemDivs);
}

async function consumeItem(i){
    let el;
    if(game.turn==game.myTurn){
        el=gameItemDivs[i].firstChild;
        run.usedItems.push(i);
    }
    else{
        el=theirItems[i].firstChild;
    }
    el.classList.add("shakeAndFade");
    void el.offsetHeight;
    el.style.filter="saturate(25%)";
    lenses[i].classList.remove("usableLens");
    await new Promise((resolve)=>setTimeout(resolve,500));
}

function addItemImg(i,id){
    const item=run.items[i];
    const c=sigilElement(item,"img");
    c.src=item.file.src;
    c.style.position="relative";
    id[i].appendChild(c);
    if(id==gameItemDivs && item==lensItem){
        lenses[i].classList.add("usableLens");
    }
}

function updateItemDivs(id=itemDivs,ini=0){
    for(let i=ini; i<id.length; i++){
        id[i].innerHTML="";
        lenses[i].classList.remove("usableLens");
    }
    for(let i=ini; i<run.items.length; i++){
        addItemImg(i,id);
    }
}

const itemModal=document.querySelector("#itemModal");
const closeIM=itemModal.querySelector(".close");
closeIM.addEventListener("click",function(){ closeItemModal(); });
i_sigils.draw(closeIM.getContext("2d"),2,...[s_sidestep.coords],0,0);
const itemPres=document.querySelector("#itemPick");
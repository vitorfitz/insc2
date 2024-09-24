"use strict"

const codeActivated = "A";
const codeQuit = "Q";
const codeEndedTurn = "E";
const codeHammered = "H";
const codePlayedCard = "P";
const codePlayedModded = "N";
const codePlayedCustom = "K";
const codeCreateGame = "C";
const codeJoinGame = "J";
const codeResign = "R";
const codeGameOver = "O";
const codeRejoinGame = "B";
const codeDeleteOffer = "D";
const codeListGames = "L";
const codeDecision = "M";
const codeBoneBounty = "F";
const codeStartRound = "U";
const codeItem = "I";
const codeShowMe = "S";

const modeAct1=0;
const modeAct2=1;

class Queue {
    constructor() {
        this.items = [];
        this.start=0;
    }
  
    enqueue(element) {
      this.items.push(element);
    }
  
    dequeue() {
        const el=this.items[this.start];
        this.items[this.start]=null;
        this.start++;

        const maxWaste=10000;
        if(this.start>=maxWaste){
            this.start=0;
            this.items=this.items.slice(maxWaste);
        }
        return el;
    }

    empty(){
        return this.start==this.items.length
    }

    clear(){
        this.items.length=this.start;
    }
}

let protocol = location.protocol == 'https:' ? 'wss:' : 'ws:';
let host = location.hostname;
let port = location.port ? location.port : (protocol == 'wss:' ? 443 : 80);

let socket=new WebSocket(`${protocol}//${host}:${port}/ws`);
let promQueue=new Queue();
let respQueue=new Queue();
let canStart=false;
let isSearchOpen=false;
let waiting=[];

function insertSorted(array, element) {
    let index = array.findIndex(el => el.no > element.no);
    if (index == -1) {
        array.push(element);
    } else {
        array.splice(index, 0, element);
    }
}

socket.onmessage = function(event) {
    console.log("got "+event.data);
    let msg=event.data;
    parseMsg(msg);
};

function parseMsg(msg){
    switch (msg){
        case codeResign:
            if(game) game.itsOver();
            else quitRun();
            return
                
        case codeQuit:
            console.log("Seu oponente saiu.");
            return

        case codeRejoinGame:
            console.log("Seu oponente voltou.");
            return
    }

    if(promQueue.empty()){
        respQueue.enqueue(msg);
    }
    else{
        promQueue.dequeue()(msg);
    }
}

async function getNextMsg(){
    if(!respQueue.empty()) return respQueue.dequeue();
    return new Promise(resolve => promQueue.enqueue(resolve));
}

function sendMsg(msg){
    console.log("sent "+msg);
    socket.send(msg);
}

socket.onerror = function(event) {
    throw new Error(event.message);
};

let socketReady=(async function(){
    await new Promise((resolve, reject) => {
        if (socket.readyState == WebSocket.OPEN) {
            resolve();
        } else {
            socket.onopen = () => resolve();
            socket.onerror = (event) => reject(new Error('WebSocket error: ' + event.message));
        }
    });

    let myID=localStorage.getItem("id");
    if(myID==null){
        socket.send("-1");
    }
    else{
        socket.send(myID);
    }

    getNextMsg().then(function(resp){
        localStorage.setItem("id",resp);
    });
    canStart=true;
    if(isSearchOpen) startGameSearch();
})();

onbeforeunload=function(){
    if(game && !game.overBool){
        this.localStorage.setItem("game",JSON.stringify(game.save()));
    }
}
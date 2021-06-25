import {currentTurn, isMultiplayer, setMultiplayer, turnIsGreen, selected} from "./gameState";
import {matchMsg} from "./uiComponents";

export var socket = null;

export const setSocket = (val) => socket = val;

export var gameRoom = {id: null, green: null, blue: null};

export function isOpponentTurn() {
    return isMultiplayer && (turnIsGreen() && gameRoom.green !== socket.id || !turnIsGreen() && gameRoom.blue !== socket.id);
}

export function multiplayerMenu(enabled) {
    setMultiplayer(enabled);

    let menu = document.getElementById("settings-multiplayer");
    let aiMenu = document.getElementById("settings-ai");
    if (enabled) {
        menu.style.display = 'flex';
        aiMenu.style.display = 'none';
        greenScoreLabel.classList.add('label-long');
        blueScoreLabel.classList.add('label-long');
        privateMatch.innerHTML = 'Exit Private Match';
        privateMatch.classList.add('match-btn-select');
    } else {
        menu.style.display = 'none';
        aiMenu.style.display = 'block';
        blueScoreLabel.classList.remove('label-long');
        greenScoreLabel.classList.remove('label-long');
        greenTileLabel.innerHTML = 'Green';
        blueTileLabel.innerHTML = 'Blue';
        privateMatch.innerHTML = 'Create Private Match';
        privateMatch.classList.remove('match-btn-select');
    }
}


let privateMatch;

export var blueBtn, greenBtn, greenTileLabel, blueTileLabel, greenScoreLabel, blueScoreLabel;

export function setupMatchComponents({startSocket}) {


    let findMatch = document.getElementById('find-match');
    const selected = 'match-btn-select';
    findMatch.onclick = () => {
        findMatch.classList.toggle(selected);
        privateMatch.classList.remove(selected);

        if (findMatch.classList.contains(selected)) {
            matchMsg.innerText = "Finding a match...";
            multiplayerMenu(true);
        } else {
            matchMsg.innerText = "";
            multiplayerMenu(false);
        }
    };

    privateMatch = document.getElementById('private-match');
    privateMatch.onclick = () => {

        findMatch.classList.remove(selected);

        if (!privateMatch.classList.contains(selected)) {
            if (socket === null) startSocket();
            matchMsg.innerText = "Generating private link...";
            socket.emit('private-match');
            multiplayerMenu(true);
        } else {
            matchMsg.innerText = "";
            multiplayerMenu(false);
            socket.disconnect();
            socket = null;
        }
    };

    blueBtn = document.querySelector('#settings-multiplayer .blue-btn');
    greenBtn = document.querySelector('#settings-multiplayer .green-btn');
    greenScoreLabel = document.getElementById('green-score');
    blueScoreLabel = document.getElementById('blue-score');
    greenTileLabel = document.getElementById('green-tile-label');
    blueTileLabel = document.getElementById('blue-tile-label');

    [blueBtn, greenBtn].forEach(btn => {
        btn.onclick = () => {
            if (!btn.classList.contains('btn-selected')) {

                let isGreen = btn.classList.contains('green-btn');
                updateUiColor(isGreen);

                if (isGreen) {
                    socket.emit('change-color', 'green');
                } else {
                    socket.emit('change-color', 'blue');
                }


            }
        };
    });

}

export function idToLink(id) {

    let location = window.location.hostname;
    if (window.location.port && window.location.port !== "") location += ":" + window.location.port;

    return `http://${location}/influence/${id}`;
}


function updateUiColor(isGreen, fromEmit = false) {
    let myBtn, otherBtn, myTileLabel, otherTileLabel;

    let hasChanged = false;

    if (isGreen) {
        myTileLabel = greenTileLabel;
        otherTileLabel = blueTileLabel;
    } else {
        myTileLabel = blueTileLabel;
        otherTileLabel = greenTileLabel;
    }

    if (isGreen && !greenBtn.classList.contains('btn-selected')) {
        myBtn = greenBtn;
        otherBtn = blueBtn;
        hasChanged = true;
    } else if (!isGreen && !blueBtn.classList.contains('btn-selected')) {
        myBtn = blueBtn;
        otherBtn = greenBtn;
        hasChanged = true;
    }


    myTileLabel.innerHTML = 'You';
    otherTileLabel.innerHTML = 'Opponent';

    if (hasChanged) {
        myBtn.classList.add('btn-selected');
        otherBtn.classList.remove('btn-selected');

        let pronoun = fromEmit ? 'Opponent' : 'You';
        let color = !fromEmit && isGreen || fromEmit && !isGreen ? 'green' : 'blue';
        matchMsg.innerHTML = `${pronoun} switched to the ${color} player <br>` + matchMsg.innerHTML;
    }
}


export function updateUI(room, fromEmit = false) {

    if (gameRoom.id !== room.id) {

        let url = idToLink(room.id);
        if (window.location.href !== url)
            window.history.pushState({}, '', url);
    }

    let isGreen = room.green === socket.id;

    let currOpponent, prevOpponent;
    if (isGreen) {
        currOpponent = room.blue;
        prevOpponent = gameRoom.blue;
    } else {
        currOpponent = room.green;
        prevOpponent = gameRoom.green;
    }

    if (currOpponent === null && prevOpponent !== null && prevOpponent !== socket.id) {
        matchMsg.innerHTML = 'Opponent left<br>' + matchMsg.innerHTML;
    } else if (currOpponent !== null && prevOpponent === null && prevOpponent !== socket.id) {
        matchMsg.innerHTML = 'Opponent joined<br>' + matchMsg.innerHTML;
    }

    gameRoom = room;

    multiplayerMenu(true);
    updateUiColor(isGreen, fromEmit);

}

export function sendMove() {
    socket.emit('move', {color: currentTurn % 2 === 1 ? 'green' : 'blue', index: selected.cell.index});
}

export function send(msg) {
    socket.emit(msg);
}

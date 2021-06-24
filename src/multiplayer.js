import {
    cellList,
    endTurn,
    setSelected,
    turnColor,
    selected,
    undo,
    restart,
    sendAnalytics,
    processMoveList, updateScore
} from "./gameState";
import {GREEN} from "./utilities";
import {animateSelect} from "./animateSelect";

export var matchMsg;

export var socket = null;
export var isMultiplayer;
export var gameRoom = {id: null, green: null, blue: null};


function multiplayerMenu(enabled) {
    isMultiplayer = enabled;

    let menu = document.getElementById("settings-multiplayer");
    let aiMenu = document.getElementById("settings-ai");
    if (enabled) {
        menu.style.display = 'flex';
        aiMenu.style.display = 'none';
        greenTileLabel.classList.add('label-long');
        blueTileLabel.classList.add('label-long');
        privateMatch.innerHTML = 'Exit Private Match';
        privateMatch.classList.add('match-btn-select');
    } else {
        menu.style.display = 'none';
        aiMenu.style.display = 'block';
        greenTileLabel.classList.remove('label-long');

        blueTileLabel.classList.remove('label-long');
        greenTileLabel.innerHTML = 'Green';
        blueTileLabel.innerHTML = 'Blue';
        privateMatch.innerHTML = 'Create Private Match';
        privateMatch.classList.remove('match-btn-select');
    }
}

function startSocket() {

    let url;
    if (window.location.hostname === 'localhost') url = 'http://localhost:3000';
    else url = `http://${window.location.hostname}`;

    socket = io(url);

    setupSocket();
}

let privateMatch;

export function setupMatchComponents() {

    matchMsg = document.getElementById('match-msg');

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

    let roomId = window.location.pathname.replace('/influence/', '');
    if (!roomId.includes('influence') && roomId.length > 5) {
        startSocket();
        //Attempt to join the room
        matchMsg.innerText = `Joining room ${roomId}...`;
        socket.emit('private-room-join', roomId);
    }

}

let blueBtn, greenBtn, greenTileLabel, blueTileLabel;

function idToLink(id) {

    let location = window.location.hostname;
    if (window.location.port && window.location.port !== "") location += ":" + window.location.port;

    return `http://${location}/influence/${id}`;
}

function getColor(room) {
    let color;
    if (room.green === socket.id) color = 'green';
    else if (room.blue === socket.id) color = 'blue';
    else throw "Error: Cannot find player's color";
    return color;
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

function updateUI(room, fromEmit = false) {

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
    } else if (currOpponent !== null && prevOpponent === null  && prevOpponent !== socket.id) {
        matchMsg.innerHTML = 'Opponent joined<br>' + matchMsg.innerHTML;
    }

    gameRoom = room;


    multiplayerMenu(true);


    updateUiColor(isGreen, fromEmit);

}

export function sendMove() {
    socket.emit('move', {color: turnColor === GREEN ? 'green' : 'blue', index: selected.cell.index});
}

export function send(msg) {
    socket.emit(msg);
}

function setupSocket() {
    socket.on('private-room', (room) => {
        let link = idToLink(room.id);
        updateUI(room);
        matchMsg.innerHTML = `You are now in room ${room.id} as the ${getColor(room)} player. Share the link: <a href="${link}">${link}</a>`;
        sendAnalytics('createPrivateMatch');
        restart();
    });

    socket.on('private-room-joined', (room) => {
        updateUI(room);
        let status;
        if (room.green !== null && room.blue !== null) status = 'Both players are in the room.';
        else status = 'Waiting for an opponent.';

        matchMsg.innerHTML = `Joined room ${room.id} as the ${getColor(room)} player. ${status}`;
        sendAnalytics('joinPrivateMatch');
        processMoveList(room.moveList);
        updateScore();
    });

    socket.on('msg-no-action', (msg) => {
        matchMsg.innerHTML = msg + '<br>' + matchMsg.innerHTML;
    });

    socket.on('update-players', (room) => {
        updateUI(room, true);
    });

    socket.on('move', (move) => {
        setSelected(cellList[move.index].button);
        animateSelect();
        endTurn();
    });
    socket.on('restart', () => {
        restart();
        matchMsg.innerHTML = `Opponent restarted the game`;
    });
    socket.on('undo', () => {
        matchMsg.innerHTML = 'Opponent cancelled the last move<br>' + matchMsg.innerHTML;
        undo();
    });
}
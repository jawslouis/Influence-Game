import {matchMsg} from "./uiComponents";
import {endTurn, processMoveList, restart, sendAnalytics, undo, updateScore} from "./gameController";
import {cellList, setSelected} from "./gameState";
import {animateSelect} from "./animateSelect";
import {
    idToLink,
    setSocket,
    setupMatchComponents,
    socket, updateUI
} from "./multiplayer";

export function setupMultiplayer() {

    setupMatchComponents({startSocket});
    let roomId = window.location.pathname.replace('/influence/', '');
    if (!roomId.includes('influence') && roomId.length > 5) {
        startSocket();
        //Attempt to join the room
        matchMsg.innerText = `Joining room ${roomId}...`;
        socket.emit('private-room-join', roomId);
    }
}

function startSocket() {

    let url;
    if (window.location.hostname === 'localhost') url = 'http://localhost:3000';
    else url = `http://${window.location.hostname}`;

    setSocket(io(url));
    setupSocket();
}

function getColor(room) {
    let color;
    if (room.green === socket.id) color = 'green';
    else if (room.blue === socket.id) color = 'blue';
    else throw "Error: Cannot find player's color";
    return color;
}

export function setupSocket() {
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
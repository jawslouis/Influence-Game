import {BLUE, gameWidth, GREEN} from "./utilities";
import {g} from "./index";
import {blueIsOn, findBestCell, greenIsOn} from "./ai";

import {closeOverlays, resultString, setScore, settings, showGameOver, updateElements} from "./uiComponents";
import {Cell, valToScale} from "./cell";
import {animateCellUpdate, animateDeselect, animateSelect, checkGroup, stopAnimateFuture} from "./animateSelect";
import {gameRoom, isMultiplayer, matchMsg, send, socket} from "./multiplayer";


export const GREEN_BORDER = 0x05520c;
export const BLUE_BORDER = 0x23306f;
export var aiStop = false;
export var selected = null;
export var turnColor = GREEN;
export var currentTurn = 1;
export var cellList = [];

export var fillData = {time: gameWidth};
export var turnBorderColor = GREEN_BORDER;


const ai_time = 500;
const ai_delay_time = 200;
export const cell_update_time = 500;

let hasStarted = false;

export function turnValue() {

    if (currentTurn === 1) {
        return 0.57;
    } else if (currentTurn % 2 === 1) {
        return 1;
    } else {
        return -1;
    }
}

export const setAiStop = (val) => aiStop = val;


function isAiTurn() {
    return turnColor === GREEN && greenIsOn() || turnColor === BLUE && blueIsOn();
}

function isOpponentTurn() {
    return isMultiplayer && (turnColor === GREEN && gameRoom.green !== socket.id || turnColor === BLUE && gameRoom.blue !== socket.id);
}

export function isUserTurn() {
    return !isOpponentTurn() && !isAiTurn();
}

export function selectButton(button) {
    if (selected !== null && selected !== button) {
        animateDeselect();
    }
    if (button.cell.aboveThreshold()) {
        // cannot select this cell
        return;
    }
    selected = button;
    animateSelect();
}

var needsUpdate = true;
var boardHistory = [];


function deselect() {
    let oldSelected = selected;
    selected = null;
    checkGroup(oldSelected);
    stopAnimateFuture();
}

export function setSelected(val) {
    selected = val;
}

export function sendAnalytics(action) {

    let data = {...settings, multiplayer: isMultiplayer};

    if (action === 'end') {
        data.result = resultString;
    }

    gtag('event', action, {
        'event_category': 'influence',
        'event_label': JSON.stringify(data),
    });
}

export function processMoveList(moves) {
    moves.forEach(move => {
        cellList[move.index].setValue(turnValue());
        updateBoard(cellList);
        currentTurn++;

    });
    updateTurnColor();
    updateElements();

    cellList.forEach(cell => cell.prevValue = 0);

    animateCellUpdate(startTurn);
}

function updateTurnColor() {
    if (currentTurn % 2 === 0) {
        turnColor = BLUE;
        turnBorderColor = BLUE_BORDER;

    } else {
        turnColor = GREEN;
        turnBorderColor = GREEN_BORDER;
    }
}

export function endTurn() {

    if (!hasStarted) {
        // game started. send analytics event
        sendAnalytics('start');
        hasStarted = true;
    }

    var turnVal = turnValue();

    if (needsUpdate) {
        currentTurn++;
        // save board state
        var currentBoard = cellList.map(function (x) {
            return x.value;
        });
        boardHistory.push(currentBoard);
    }

    if (selected !== null) {
        selected.cell.setValue(turnVal);
        deselect();
    }

    updateTurnColor();
    updateElements();

    var ended = false;

    if (needsUpdate) {
        ended = updateBoard(cellList);

        if (ended) animateCellUpdate();
        else animateCellUpdate(startTurn);

    }

    // count score now

    var greenScore = 0;
    var blueScore = 0;
    for (var i = 0; i < cellList.length; i++) {
        if (cellList[i].aboveThreshold()) {
            if (cellList[i].value > 0) {
                greenScore++;
            } else {
                blueScore++;
            }
        }
    }

    setScore(greenScore, blueScore);

    turnActive = false;

    if (ended) {
        aiStop = true;
        showGameOver(greenScore, blueScore);
        sendAnalytics('end');
        return;
    }

    // game has not ended. Complete the animation
    if (!needsUpdate) {
        needsUpdate = true;
    }

}


function resetItems() {
    turnActive = false;
    hasStarted = false;
    animateDeselect();
    updateElements();

}

export function restartClick() {
    if (isMultiplayer) {
        send('restart');
        matchMsg.innerHTML = `You restarted the game`;
    }
    restart();
}

export function restart() {

    currentTurn = 1;
    for (var i = 0; i < cellList.length; i++) {
        var c = cellList[i];
        c.reset();
    }


    setScore(0, 0);
    aiStop = false;

    turnColor = GREEN;
    turnBorderColor = GREEN_BORDER;

    boardHistory = [];

    resetItems();

    closeOverlays();
    startTurn();
}

export function undoClick() {
    if (isMultiplayer) {
        send('undo');
        matchMsg.innerHTML = 'You cancelled the last move<br>' + matchMsg.innerHTML;
    }
    undo();
}

export function undo() {

    deselect();

    if (currentTurn === 1) {
        return; // nothing to do
    }

    var boardState = boardHistory.pop();
    for (var i = 0; i < cellList.length; i++) {
        var c = cellList[i];
        c.prevValue = c.value;
        c.value = boardState[i];
    }

    animateCellUpdate();


    resetItems();
    currentTurn--;
    needsUpdate = false;
    aiStop = true;
    endTurn();

}

export var turnActive = false;


function startAI() {
    var selection = findBestCell();

    selectButton(selection.button);

    g.time.events.add(ai_time, function () {

        if (!aiStop) {
            endTurn();
        }
        turnActive = false;
    });
}

export function startTurn() {

    if (turnActive) return; // do nothing, turn already in progress

    if (isAiTurn()) {

        aiStop = false;

        // auto-make a move
        turnActive = true;

        if (selected !== null) {
            // deselect it
            animateDeselect();
        }

        if (ai_delay_time > 0) {
            g.time.events.add(ai_delay_time, startAI);
        } else startAI();
    }

}


export function updateBoard(board) {
    let i;
// update all cells

    for (i = 0; i < board.length; i++) {
        board[i].updateNextValue();
    }

    let ended = true;
    for (i = 0; i < board.length; i++) {
        var c = board[i];
        c.prevValue = c.value;
        c.value = c.nextValue;
        if (!c.aboveThreshold()) {
            // check if the game has ended
            ended = false;
        }
    }
    return ended;
}

export function copyBoard(original) {

    let copy = original.map(cell => cell.copyCell());

    for (var i = 0; i < original.length; i++) {
        for (var j = 0; j < original[i].neighbors.length; j++) {
            var idx = original[i].neighbors[j].index;
            copy[i].neighbors.push(copy[idx]);
        }
    }

    return copy;
}
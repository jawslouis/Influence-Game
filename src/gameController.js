import {findBestCell} from "./ai";
import {
    blueIsOn, closeOverlays,
    greenIsOn,
    resultString,
    setScore,
    settings,
    showGameOver,
    updateElements, matchMsg,
} from "./uiComponents";
import {animateCellUpdate, animateDeselect, animateSelect, checkGroup, stopAnimateFuture} from "./animateSelect";
import {isOpponentTurn, send} from "./multiplayer";
import {
    cellList,
    currentTurn,
    turnValue,
    updateBoard,
    selected,
    setSelected,
    setCurrentTurn, turnIsGreen, isMultiplayer
} from "./gameState";
import {d, g} from "./display";
import {copyBoard} from "./cell";


export var aiStop = false;

let hasStarted = false;


export const setAiStop = (val) => aiStop = val;


function isAiTurn() {
    return turnIsGreen(currentTurn) && greenIsOn() || !turnIsGreen(currentTurn) && blueIsOn();
}


export function isUserTurn() {

    if (isMultiplayer) return !isOpponentTurn();
    else return !isAiTurn();
}

export function selectButton(button) {
    if (selected !== null && selected !== button) {
        animateDeselect({selected, currentTurn});
    }
    if (button.cell.aboveThreshold()) {
        // cannot select this cell
        return;
    }
    setSelected(button);
    animateSelect();
}

let boardHistory = [];
export var moveHistory = [];

function deselect() {
    let oldSelected = selected;
    setSelected(null);
    checkGroup(oldSelected);
    stopAnimateFuture({clearNeedsUpdate: false});
}

export function sendAnalytics(action) {

    let data = {...settings, multiplayer: isMultiplayer};

    if (action === 'end') {
        data.result = resultString;
    }

    // the below takes about 14ms. Execute it after the main UI loop is completed
    setTimeout(() => gtag('event', action, {
        'event_category': 'influence',
        'event_label': JSON.stringify(data),
    }), 0);

}

export function processMoveList(moves) {
    moves.forEach(move => {
        cellList[move.index].setValue(turnValue());
        updateBoard(cellList);
        setCurrentTurn(currentTurn + 1);

    });
    updateElements(currentTurn);

    cellList.forEach(cell => {
        cell.prevValue = 0;
    });

    animateCellUpdate(startTurn);
}


export function updateScore() {
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
    return {greenScore, blueScore};
}

export function endTurn() {

    d.bmdCleared = false;

    if (!hasStarted) {
        // game started. send analytics event
        sendAnalytics('start');
        hasStarted = true;
    }

    var turnVal = turnValue();


    setCurrentTurn(currentTurn + 1);
    // save board state
    var currentBoard = cellList.map(function (x) {
        return x.value;
    });
    boardHistory.push(currentBoard);


    if (selected !== null) {
        selected.cell.setValue(turnVal);
        moveHistory.push(selected.cell.index);
        deselect();
    }

    updateElements(currentTurn);

    let ended = updateBoard(cellList);

    if (ended) animateCellUpdate();
    else animateCellUpdate(startTurn);


    // count score now
    let {greenScore, blueScore} = updateScore();

    turnActive = false;

    if (ended) {
        aiStop = true;
        showGameOver(greenScore, blueScore);
        sendAnalytics('end');
    }

}

function resetItems() {
    turnActive = false;
    hasStarted = false;
    animateDeselect({selected, currentTurn});
    updateElements(currentTurn);
    updateScore();
}

export function restartClick() {
    if (isMultiplayer) {
        send('restart');
        matchMsg.innerHTML = `You restarted the game`;
    }
    restart();
}

export function restart() {

    setCurrentTurn(1);
    for (var i = 0; i < cellList.length; i++) {
        var c = cellList[i];
        c.reset();
    }


    setScore(0, 0);
    aiStop = false;

    boardHistory = [];
    moveHistory = [];

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
    moveHistory.pop();
    for (var i = 0; i < cellList.length; i++) {
        var c = cellList[i];
        c.prevValue = c.value;
        c.value = boardState[i];
    }

    animateCellUpdate();
    setCurrentTurn(currentTurn - 1);
    resetItems();
    aiStop = true;
}

export var turnActive = false;


export function startTurn() {

    if (turnActive) return; // do nothing, turn already in progress

    if (isAiTurn() && !isMultiplayer) {

        aiStop = false;

        // auto-make a move
        turnActive = true;

        if (selected !== null) {
            // deselect it
            animateDeselect({selected, currentTurn});
        }
        startAI();

    }

}

let aiWorker = null;
const ai_time_before_select = 500;
const ai_time_btwn_select_and_end = 200;

export const setAiWorker = (val) => aiWorker = val;

export function startAiWorker() {
    if (window.Worker) {
        let aiWorker = new Worker(new URL('./aiWorker.js', import.meta.url));
        aiWorker.onmessage = function (e) {
            receiveAiResult(e.data);
        };
        return aiWorker;
    }
    return null;
}

export function receiveAiResult(index) {
    function doSelect() {
        selectButton(cellList[index].button);
        g.time.events.add(ai_time_btwn_select_and_end, function () {
            if (!aiStop) {
                endTurn();
            }
            turnActive = false;
        });
    }

    if (turnIsGreen() && settings.aiGreen === 'Very Hard' || !turnIsGreen() && settings.aiBlue === 'Very Hard') {
        doSelect();
    } else {
        // add delay for the faster AIs
        g.time.events.add(ai_time_before_select, doSelect);
    }

}

export function startAI() {
    if (aiWorker !== null) {
        let copy = copyBoard(cellList, true);
        aiWorker.postMessage({settings, cellList: copy, currentTurn});
    } else {

        let index = findBestCell({settings, cellList, currentTurn});
        receiveAiResult(index);

    }

}
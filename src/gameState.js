import {BLUE, gameWidth, getColorBandFromValue, GREEN} from "./utilities";
import {bmd, g, borderGroup, buttonGroup} from "./index";
import {blueIsOn, greenIsOn, findBestCell} from "./ai";
import {closeOverlays, setScore, showGameOver, updateElements} from "./uiComponents";
import {Cell} from "./cell";


export const GREEN_BORDER = 0x05520c;
export const BLUE_BORDER = 0x23306f;
export var aiStop = false;
export var selected = null;
export var turnColor = GREEN;
export var currentTurn = 1;
export var cellList = [];
export var futureCellList = null;
export var fillData = {time: gameWidth};
export var turnBorderColor = GREEN_BORDER;
let transitionTween = null;

// const ai_time = 100;
// export const cell_update_time = 10;
const ai_time = 500;
export const cell_update_time = 500;

const selection_time = 200;

const startFill = gameWidth * 0.77;
const endFill = gameWidth * 0.24;

export function turnValue() {

    if (currentTurn === 1) {
        return 0.57;
    } else if (turnColor === GREEN) {
        return 1;
    } else {
        return -1;
    }
}

export const setAiStop = (val) => aiStop = val;

function animateSelection(button) {

    if (button.cell.colorTween !== null) {
        button.cell.colorTween.stop(true);
        button.cell.colorTween = null;
    }

    if (button.cell.borderTween !== null) {
        button.cell.borderTween.stop(true);
        button.cell.borderTween = null;
    }
    if (button.cell.buttonTween !== null) {
        button.cell.buttonTween.stop(true);
        button.cell.buttonTween = null;
    }

    // change groups, so that button can go over neighboring borders
    buttonGroup.remove(button, false, true);
    borderGroup.add(button);

    button.bringToTop();
    button.cell.border.bringToTop();

    // select button
    selected = button;
    button.cell.updateColor(false);

    // animate selection

    button.scale.setTo(1, 1);
    let tweenButton = g.add.tween(button.scale).to({
        x: 1.5,
        y: 1.5
    }, selection_time, Phaser.Easing.Quadratic.Out, true).yoyo(true);
    button.cell.buttonTween = tweenButton;

    button.cell.border.scale.setTo(1, 1);
    let tweenBorder = g.add.tween(button.cell.border.scale).to({
        x: 1.5,
        y: 1.5
    }, selection_time, Phaser.Easing.Quadratic.Out, false).yoyo(true);
    tweenBorder.onComplete.add(function () {
        button.cell.borderTween = null;
        checkGroup(button);
    });
    button.cell.borderTween = tweenBorder;
    tweenBorder.start();

    animateFutureState();
}

function stopAnimateFuture(){
    if (transitionTween !== null) {
        transitionTween.stop(false);
        transitionTween = null;
    }
    fillData.time = gameWidth; // no fill

    futureCellList.forEach(cell => {
        if (cell.borderAlphaTween !== null) {

            cell.borderAlphaTween.stop(false);
            cell.borderAlphaTween = null;
            cell.value = cell.prevValue;
            cell.updateBorder();
        }
    })
}

function animateFutureState() {

    if (selected === null) throw 'Error: Cell needs to be selected';

    if (futureCellList === null)
        futureCellList = copyBoard(cellList);

    cellList.forEach(cell => {
        futureCellList[cell.index].value = cell.value;
    });

    futureCellList[selected.cell.index].value = turnValue();

    updateBoard(futureCellList);

    if (transitionTween !== null) {
        transitionTween.stop(false);
    }

    bmd.clear();
    for (var i = 0; i < futureCellList.length; i++) {
        futureCellList[i].updateColor(true, true);
    }
    bmd.update();

    fillData.time = startFill;
    transitionTween = g.add.tween(fillData).to({time: endFill}, cell_update_time*3, Phaser.Easing.Exponential.InOut, true, 1000, -1, true);

}


export function isAiTurn() {
    return turnColor === GREEN && greenIsOn() || turnColor === BLUE && blueIsOn();
}

export function animateDeselect() {
    // transition color back to original

    if (selected == null) return;

    let currentSelected = selected; // needed to keep track of reference
    let colorBlend = {val: 0};

    let colorBand = getColorBandFromValue(turnValue(), currentSelected.cell.value);

    let colorTween = g.add.tween(colorBlend).to({val: 100}, 1000, Phaser.Easing.Quadratic.Out);

    colorTween.onUpdateCallback(() => {
        currentSelected.tint = colorBand(colorBlend.val);
    });

    colorTween.onComplete.add(() => {
        currentSelected.cell.colorTween = null;
    });

    selected = null;
    stopAnimateFuture();
    checkGroup(currentSelected);
    currentSelected.cell.updateBorder();
    currentSelected.cell.colorTween = colorTween;
    colorTween.start();

}

export function selectButton(button) {
    if (selected !== null && selected !== button) {
        animateDeselect();
    }
    if (button.cell.aboveThreshold()) {
        // cannot select this cell
        return;
    }
    animateSelection(button);
}

var needsUpdate = true;
var boardHistory = [];

function animateCellUpdate(postUpdate = null) {

    if (transitionTween !== null) {
        transitionTween.stop(false);
        cellList.forEach(cell => {
            cell.fillPrevColor();
        });
        transitionTween = null;
    }

    bmd.clear();
    for (var i = 0; i < cellList.length; i++) {
        cellList[i].updateColor(true);
    }
    bmd.update();

    fillData.time = startFill;
    transitionTween = g.add.tween(fillData).to({time: endFill}, cell_update_time, "Linear", false);
    // Using game width. Since pointer co-ordinates have to be used, the shader will convert from game width to 0-1 range.
    transitionTween.onComplete.add(function () {

        for (var i = 0; i < cellList.length; i++) {
            cellList[i].updateColor(false);
        }
        fillData.time = gameWidth; // reset so the canvas will be transparent

        if (postUpdate != null) {
            postUpdate();
        }

        transitionTween = null;
    });
    transitionTween.start();
}

function checkGroup(button) {
    if (selected !== button) {
        if (button.cell.borderTween === null) {
            borderGroup.remove(button, false, true);
            buttonGroup.add(button);
        }
    }
}

function deselect() {
    let oldSelected = selected;
    selected = null;
    checkGroup(oldSelected);
    stopAnimateFuture();
}

export function endTurn() {

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

    if (currentTurn % 2 === 0) {
        turnColor = BLUE;
        turnBorderColor = BLUE_BORDER;

    } else {
        turnColor = GREEN;
        turnBorderColor = GREEN_BORDER;

    }

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
        return;
    }

    // game has not ended. Complete the animation
    if (!needsUpdate) {
        needsUpdate = true;
    }

}


function resetItems() {
    turnActive = false;
    animateDeselect();
    updateElements();
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

export function startTurn() {

    if (turnActive) return; // do nothing, turn already in progress

    if (isAiTurn()) {
        // auto-make a move
        turnActive = true;

        if (selected !== null) {
            // deselect it
            animateDeselect();
        }

        var selection = findBestCell();

        selectButton(selection.button);

        g.time.events.add(ai_time, function () {

            if (!aiStop) {
                endTurn();
            }
            turnActive = false;
        });
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

    let copy = original.map(cell => {
        return new Cell(cell.button, cell.border, cell.index);
    });

    for (var i = 0; i < original.length; i++) {
        for (var j = 0; j < original[i].neighbors.length; j++) {
            var idx = original[i].neighbors[j].index;
            copy[i].neighbors.push(copy[idx]);
        }
    }

    return copy;
}
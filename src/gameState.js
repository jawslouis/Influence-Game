import {valueAtTurn} from "./utilities";

export function updateBoard(board) {

    // update all cells
    let i;
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

export var selected;
export var currentTurn = 1;
export var cellList = [];
export var isMultiplayer = false;

export function setMultiplayer(val) {
    isMultiplayer = val;
}

export function turnValue() {
    return valueAtTurn(currentTurn);
}

export function setCurrentTurn(turn) {
    currentTurn = turn;
}

export function setSelected(newSelected) {
    selected = newSelected;
}

export function turnIsGreen() {
    return currentTurn % 2 === 1;
}
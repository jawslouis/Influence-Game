import {valueAtTurn} from "./utilities";

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


export function copyBoard(original, copyVal = false) {

    let copy = original.map(cell => copyVal ? cell.copyCellVal() : cell.copyCell());

    original.forEach((origCell, i) => {
        origCell.neighbors.forEach(neighbor => {
            let idx = neighbor.index;
            copy[i].neighbors.push(copy[idx]);
        });
    });
    return copy;

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
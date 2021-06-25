import {cellList, selected, turnValue} from "./gameState";
import {valToColor, valToScale} from "./utilities";
import {calculateFill, eraseFill} from "./animateTransition";
import {Cell, copyCellVal} from "./cell";


export function resetCell(cell) {
    cell.value = 0;
    cell.prevValue = 0;
    cell.nextValue = 0;
    updateCellColor(cell, false);
}

export function updateCellColor(cell, animate = false) {

    let cellScale = valToScale(cell.value);
    let prevValScale = valToScale(cell.prevValue);

    cell.updateScale(cellScale, prevValScale, animate);
    cell.updateBorder(animate);


    if (animate && cell.needCalculateFill()) {
        // animate the transition

        eraseFill(cell);
        calculateFill(cell);

        if (cellScale < prevValScale)
            cell.button.tint = valToColor(cell.value);

    } else {
        let cellVal = cell.button === selected ? turnValue() : cell.value;
        cell.button.tint = valToColor(cellVal);
    }

}

export function copyBoard(original, copyVal = false) {

    let copy = original.map(cell => copyVal ? copyCellVal(cell) : cell.copyCell());

    original.forEach((origCell, i) => {
        origCell.neighbors.forEach(neighbor => {
            let idx = neighbor.index;
            copy[i].neighbors.push(copy[idx]);
        });
    });
    return copy;

}
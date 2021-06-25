import {getColorBandFromValue} from "./utilities";
import {valToScale} from "./utilities";
import {g, group, hideBmd} from "./display";
import {cellList, turnValue, updateBoard, selected, setSelected} from "./gameState";
import {animateTransition, setTransitionTween, transitionTween} from "./animateTransition";
import {copyBoard, updateCellColor} from "./cellController";

const selectTime = 200;
const deselectTime = 1000;

let futureCellList = null;
let isFutureColor = false;

export function animateSelect() {
    let button = selected;
    let cell = button.cell;

    if (cell.colorTween !== null) {
        cell.colorTween.stop(true);
        cell.colorTween = null;
    }

    if (cell.borderTween !== null) {
        cell.borderTween.stop(true);
        cell.borderTween = null;
    }
    if (cell.buttonTween !== null) {
        cell.buttonTween.stop(true);
        cell.buttonTween = null;
    }

    // change groups, so that button can go over neighboring borders
    group.bgBorder.remove(button.cell.bgBorder, false, true);
    group.border.add(cell.bgBorder);

    group.valBorder.remove(cell.valBorder, false, true);
    group.border.add(cell.valBorder);

    group.button.remove(button, false, true);
    group.border.add(button);

    cell.bgBorder.bringToTop();
    cell.valBorder.bringToTop();
    button.bringToTop();
    cell.border.bringToTop();

    // select button
    updateCellColor(button.cell, false);

    // animate selection
    let buttonScale = valToScale(turnValue());
    button.scale.setTo(buttonScale);
    let buttonVal = {scale: buttonScale};
    let tweenButton = g.add.tween(buttonVal).to({
        scale: buttonScale * 1.5
    }, selectTime, Phaser.Easing.Quadratic.Out, false).yoyo(true);
    tweenButton.onUpdateCallback(() => {
        button.scale.setTo(buttonVal.scale);
    });
    tweenButton.onComplete.add(() => {
        button.cell.buttonTween = null;
    });
    button.cell.buttonTween = tweenButton;
    tweenButton.start();

    let borderVal = {scale: 1};
    button.cell.setBorderScale(1);

    let tweenBorder = g.add.tween(borderVal).to({scale: 1.5}, selectTime, Phaser.Easing.Quadratic.Out, false).yoyo(true);

    tweenBorder.onUpdateCallback(() => {
        button.cell.setBorderScale(borderVal.scale);
    });

    tweenBorder.onComplete.add(function () {
        button.cell.setBorderScale(1);
        button.cell.borderTween = null;
        checkGroup(button);
    });
    button.cell.borderTween = tweenBorder;
    tweenBorder.start();

    animateFutureState();
}

export function stopAnimateFuture({clearNeedsUpdate}) {

    if (transitionTween !== null) {
        transitionTween.stop(false);
        setTransitionTween(null);
    }

    hideBmd();

    if (futureCellList !== null) {
        futureCellList.forEach(cell => {
            if (cell.borderAlphaTween !== null) {

                cell.borderAlphaTween.stop(false);
                cell.borderAlphaTween = null;
                cell.value = cell.prevValue;
                cell.updateBorder();
            }
        });
    }

    if (isFutureColor) {
        cellList.forEach(cell => {
            updateCellColor(cell);
        });
        isFutureColor = false;
    }
}

function animateFutureState() {

    if (selected === null) throw 'Error: Cell needs to be selected';

    if (futureCellList === null)
        futureCellList = copyBoard(cellList);

    // need this regardless of whether board was copied
    cellList.forEach(cell => {
        futureCellList[cell.index].value = cell.value;
    });

    futureCellList[selected.cell.index].value = turnValue();

    updateBoard(futureCellList);

    if (transitionTween !== null) {
        transitionTween.stop(true);
    }

    animateTransition(futureCellList, true, () => isFutureColor = true);

}

export function animateDeselect() {
    // transition color back to original
    if (selected == null) return;

    let currentSelected = selected;

    // update color
    let colorBlend = {val: 0};
    let colorBand = getColorBandFromValue(turnValue(), currentSelected.cell.value);
    let colorTween = g.add.tween(colorBlend).to({val: 100}, deselectTime, Phaser.Easing.Quadratic.Out);
    colorTween.onUpdateCallback(() => {
        currentSelected.tint = colorBand(colorBlend.val);
    });
    colorTween.onComplete.add(() => {
        currentSelected.cell.colorTween = null;
    });
    currentSelected.cell.colorTween = colorTween;
    colorTween.start();

    let currentScale = valToScale(currentSelected.cell.value);
    if (currentSelected.cell.buttonTween !== null) {
        currentSelected.cell.buttonTween.stop(false);
    }

    // shrink from full size
    currentSelected.scale.setTo(currentSelected.cell.border.scale.x);

    let scaleTween = g.add.tween(currentSelected.scale).to({
        x: currentScale,
        y: currentScale
    }, deselectTime, Phaser.Easing.Quadratic.Out, false);

    scaleTween.onComplete.add(() => {
        currentSelected.cell.buttonTween = null;
    });
    currentSelected.cell.buttonTween = scaleTween;

    scaleTween.start();

    setSelected(null);
    stopAnimateFuture({clearNeedsUpdate: true});
    checkGroup(currentSelected);

    currentSelected.cell.updateBorder(false);

}

export function animateCellUpdate(postUpdate = null) {

    if (transitionTween !== null) {
        transitionTween.stop(false);
        cellList.forEach(cell => {
            cell.fillPrevColor();
        });

        setTransitionTween(null);
    }

    animateTransition(cellList, false, postUpdate);
}


export function checkGroup(button) {
    // ensure that the button is displayed at the right level
    if (selected !== button) {
        if (button.cell.borderTween === null) {
            let c = button.cell;

            group.border.remove(button, false, true);
            group.border.remove(c.bgBorder);
            group.border.remove(c.valBorder);

            group.button.add(button);
            group.bgBorder.add(c.bgBorder);
            group.valBorder.add(c.valBorder);

        }
    }
}
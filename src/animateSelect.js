import {bmd, borderGroup, buttonGroup, g} from "./index";
import {gameWidth, getColorBandFromValue} from "./utilities";
import {
    cell_update_time,
    cellList,
    copyBoard,
    fillData,
    selected, setSelected, thresholdScale,
    turnValue,
    updateBoard
} from "./gameState";
import {valToScale} from "./cell";

const selection_time = 200;

const startFill = gameWidth * 0.77;
const endFill = gameWidth * 0.24;

let transitionTween = null;
let futureCellList = null;

export function animateSelection() {

    let button = selected;

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
    button.cell.updateColor(false);

    // animate selection
    let buttonScale = valToScale(turnValue());
    let tScale = {scale: buttonScale};
    let tweenButton = g.add.tween(tScale).to({
        scale: 1.5
    }, selection_time, Phaser.Easing.Quadratic.Out, false).yoyo(true);
    tweenButton.onUpdateCallback(() => {
        button.scale.setTo(tScale.scale);
    });
    tweenButton.onComplete.add(() => {
        button.cell.buttonTween = null;
    });
    button.cell.buttonTween = tweenButton;
    tweenButton.start();

    button.cell.border.scale.setTo(thresholdScale);
    let borderScale = thresholdScale * 1.5;
    let tweenBorder = g.add.tween(button.cell.border.scale).to({
        x: borderScale,
        y: borderScale
    }, selection_time, Phaser.Easing.Quadratic.Out, false).yoyo(true);
    tweenBorder.onComplete.add(function () {
        button.cell.borderTween = null;
        checkGroup(button);
    });
    button.cell.borderTween = tweenBorder;
    tweenBorder.start();

    animateFutureState();
}

export function stopAnimateFuture() {

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
        transitionTween.stop(true);
    }

    transitionTween = g.add.tween(fillData).to({time: endFill}, cell_update_time, "Linear", false, 1000, 0, false);
    transitionTween.onStart.add(() => {
        bmd.clear();
        fillData.time = startFill;
        for (var i = 0; i < futureCellList.length; i++) {
            futureCellList[i].updateColor(true, true);
        }
        bmd.update();

    });
    transitionTween.start();
}

const deselectTime = 1000;

export function animateDeselect() {
    // transition color back to original

    if (selected == null) return;

    let currentSelected = selected; // needed to keep track of reference
    let colorBlend = {val: 0};

    let colorBand = getColorBandFromValue(turnValue(), currentSelected.cell.value);

    let colorTween = g.add.tween(colorBlend).to({val: 100}, deselectTime, Phaser.Easing.Quadratic.Out);

    colorTween.onUpdateCallback(() => {
        currentSelected.tint = colorBand(colorBlend.val);
    });

    colorTween.onComplete.add(() => {
        currentSelected.cell.colorTween = null;
    });

    let currentScale = valToScale(currentSelected.cell.value);


    if (currentSelected.cell.buttonTween !== null) {
        currentSelected.cell.buttonTween.stop(false);
    }

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
    stopAnimateFuture();
    checkGroup(currentSelected);
    currentSelected.cell.updateBorder();
    currentSelected.cell.colorTween = colorTween;
    colorTween.start();

}


export function animateCellUpdate(postUpdate = null) {

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
        transitionTween = null;

        if (postUpdate != null) {
            postUpdate();
        }


    });
    transitionTween.start();
}


export function checkGroup(button) {
    // ensure that the button is displayed at the right level
    if (selected !== button) {
        if (button.cell.borderTween === null) {
            borderGroup.remove(button, false, true);
            buttonGroup.add(button);
        }
    }
}
import {BLUE_BORDER, borderColor, GREEN_BORDER, threshold, valToColor, valToScale} from "./utilities";
import {calculateFill, transition_time} from "./animateTransition";
import {currentTurn, selected, turnValue} from "./gameState";
import {g} from "./display"

export function aboveThreshold(cell) {
    return Math.abs(cell.value) >= threshold;
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

export function copyCellVal(c) {
    let cell = new Cell(c.index);
    cell.value = c.value;
    return cell;
}

export class Cell {

    constructor(idx) {
        this.button = null;
        this.value = 0;
        this.nextValue = 0;
        this.prevValue = 0;
        this.neighbors = [];
        this.border = null;
        this.index = idx;
        this.colorTween = null;
        this.buttonTween = null;
        this.borderTween = null;
        this.borderAlphaTween = null;
        this.bgBorder = null;
        this.valBorder = null;

    }

    copyCell() {
        let cell = new Cell(this.index);
        cell.button = this.button;
        cell.border = this.border;
        cell.valBorder = this.valBorder;
        cell.bgBorder = this.bgBorder;
        return cell;
    }

    setBorderTint(tint) {
        this.border.tint = tint;
        this.valBorder.tint = tint;
        this.bgBorder.tint = tint;
    }

    setBorderAlpha(alpha) {
        this.border.alpha = alpha;
        this.valBorder.alpha = alpha;
        this.bgBorder.alpha = alpha;
    }

    setBorderScale(scale) {
        this.border.scale.setTo(scale);
        this.valBorder.scale.setTo(scale);
        this.bgBorder.scale.setTo(scale);
    }

    updateBorder(animate = false) {

        let val = Math.abs(this.value);

        if (val > threshold) {
            if (this.value >= 0) {
                this.setBorderTint(GREEN_BORDER);
            } else {
                this.setBorderTint(BLUE_BORDER);
            }
        }

        if (!animate) {
            if (val > threshold) {
                this.setBorderAlpha(1);
            } else if (this.button === selected) {
                this.setBorderAlpha(1);
                this.setBorderTint(borderColor(currentTurn));
            } else {
                this.setBorderAlpha(0);
            }

        } else {

            let prevVal = Math.abs(this.prevValue);

            let borderAppearing = val > threshold && prevVal <= threshold;
            if (borderAppearing || val <= threshold && prevVal > threshold) {
                // border appeared/disappeared. animate the change
                if (this.button !== selected) {
                    let prevAlpha = prevVal > threshold ? 1 : 0;

                    this.doBorderTween(prevAlpha, borderAppearing, transition_time, Phaser.Easing.Exponential.InOut);

                }
            }
        }

    }

    doBorderTween(prevAlpha, borderAppearing, updateTime, easing) {
        if (this.borderAlphaTween !== null) {
            this.borderAlphaTween.stop(false);
        }

        let alpha = {val: prevAlpha};


        this.borderAlphaTween = g.add.tween(alpha).to({val: 1 - prevAlpha}, updateTime, easing, false);
        this.borderAlphaTween.onUpdateCallback(() => {
            this.setBorderAlpha(alpha.val);
        });

        this.borderAlphaTween.start();
    }

    reset() {
        this.value = 0;
        this.prevValue = 0;
        this.nextValue = 0;
        this.updateCellColor(false);
    }

    aboveThreshold() {
        return aboveThreshold(this);
    }

    setValue(val) {
        this.prevValue = this.value;
        this.value = val;
    }

    updateNextValue() {
        var neighborAvg = 0;
        var count = 0;
        for (var j = 0; j < this.neighbors.length; j++) {
            neighborAvg += this.neighbors[j].value;
            count += 1;
        }

        neighborAvg = neighborAvg / count;

        this.nextValue = Math.max(Math.min(neighborAvg * 0.3 + this.value, 1), -1);
    }

    updateScale(cellScale, prevValScale, animate = false) {

        if (animate) {
            if (cellScale < prevValScale)
                this.button.scale.setTo(cellScale);
            return;
        }

        this.button.scale.setTo(cellScale);
    }

    updateCellColor(animate = false) {

        let cellVal = this.button === selected ? turnValue() : this.value;

        let cellScale = valToScale(this.value);
        let prevValScale = valToScale(this.prevValue);

        this.updateScale(cellScale, prevValScale, animate);
        this.updateBorder(animate);

        if (animate && this.prevValue !== this.value) {
            // animate the transition

            calculateFill({cell: this, cellVal});
            if (cellScale < prevValScale)
                this.button.tint = valToColor(cellVal);

        } else {
            this.button.tint = valToColor(cellVal);
        }

    }

    fillPrevColor() {
        let colorValue = this.button === selected ? turnValue() : this.prevValue;
        this.button.tint = valToColor(colorValue);
    }

}
import {valToColor} from "./utilities";
import {calculateFill} from "./animateTransition";
import {
    BLUE_BORDER,
    cell_update_time,
    fillData,
    GREEN_BORDER,
    selected,
    threshold,
    turnBorderColor,
    turnValue
} from "./gameState";
import {g} from "./index";

export function valToScale(val) {
    return Math.abs(val) * 0.6 + 0.4;
}

export class Cell {

    constructor(button, border, idx) {
        this.button = button;
        this.value = 0;
        this.nextValue = 0;
        this.prevValue = 0;
        this.neighbors = [];
        this.border = border;
        this.index = idx;
        this.colorTween = null;
        this.buttonTween = null;
        this.borderTween = null;
        this.borderAlphaTween = null;
        this.inputOver = false;

    }

    updateBorder() {

        let val = Math.abs(this.value);
        if (val > threshold) {
            this.border.alpha = 1;

            if (this.value >= 0) {
                this.border.tint = GREEN_BORDER;
            } else {
                this.border.tint = BLUE_BORDER;
            }

        } else if (this.button === selected) {
            this.border.alpha = 1;
            this.border.tint = turnBorderColor;
        } else {
            this.border.alpha = 0;
        }
    }

    reset() {
        this.value = 0;
        this.prevValue = 0;
        this.nextValue = 0;
        this.updateColor(false);
    }

    aboveThreshold() {
        return Math.abs(this.value) > threshold;
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

    updateScale(animate = false, isFast = false) {
        if (animate) return;

        let cellScale = valToScale(this.value);
        this.button.scale.setTo(cellScale);
    }

    updateDisplay(animate) {
        this.updateColor(animate);
        this.updateScale(animate);
        this.updateBorder(animate);
    }

    updateColor(animate, isFast = false) {

        let cellVal = this.button === selected ? turnValue() : this.value;

        this.updateScale(animate, isFast);
        this.updateBorder();

        if (animate && this.prevValue !== this.value) {
            // animate the transition

            calculateFill(this, cellVal);

            let val = Math.abs(this.value), prevVal = Math.abs(this.prevValue);
            if (val > threshold && prevVal <= threshold || val <= threshold && prevVal > threshold) {
                // border appeared/disappeared. animate the change
                if (this.button !== selected) {
                    let prevAlpha = prevVal > threshold ? 1 : 0;
                    this.border.alpha = prevAlpha;

                    if (this.borderAlphaTween !== null) {
                        this.borderAlphaTween.stop(false);
                    }

                    if (!isFast) {
                        this.borderAlphaTween = g.add.tween(this.border).to({alpha: 1 - prevAlpha}, cell_update_time * 0.6, Phaser.Easing.Exponential.InOut, true);
                    } else {
                        this.borderAlphaTween = g.add.tween(this.border).to({alpha: 1 - prevAlpha}, cell_update_time, Phaser.Easing.Exponential.InOut, true, 0, 0, false);
                    }

                }
            }

        } else {
            this.button.tint = valToColor(cellVal);
        }

    }

    fillPrevColor() {
        let colorValue = this.button === selected ? turnValue() : this.prevValue;
        this.button.tint = valToColor(colorValue);
    }

}
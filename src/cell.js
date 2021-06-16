import {valToColor} from "./utilities";
import {calculateFill} from "./animateTransition";
import {BLUE_BORDER, cell_update_time, fillData, GREEN_BORDER, selected, turnBorderColor, turnValue} from "./gameState";
import {g} from "./index";


const threshold = 0.5;


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

    updateColor(animate, isLoop = false) {

        let cellColor = this.button === selected ? valToColor(turnValue()) : valToColor(this.value);

        this.updateBorder();

        if (animate && this.prevValue !== this.value) {
            // animate the transition

            calculateFill(this, cellColor);

            let val = Math.abs(this.value), prevVal = Math.abs(this.prevValue);
            if (val > threshold && prevVal <= threshold || val <= threshold && prevVal > threshold) {
                // border appeared/disappeared. animate the change
                if (this.button !== selected) {
                    let prevAlpha = prevVal > threshold ? 1 : 0;
                    this.border.alpha = prevAlpha;

                    if (this.borderAlphaTween !== null) {
                        this.borderAlphaTween.stop(false);
                    }

                    if (!isLoop) {
                        this.borderAlphaTween = g.add.tween(this.border).to({alpha: 1 - prevAlpha}, cell_update_time * 0.6, Phaser.Easing.Exponential.InOut, true);
                    } else {
                        this.borderAlphaTween = g.add.tween(this.border).to({alpha: 1 - prevAlpha}, cell_update_time, Phaser.Easing.Exponential.InOut, true, 1000, 0, false);
                    }

                }
            }

        } else {
            this.button.tint = cellColor;
        }

    }

    fillPrevColor() {
        let colorValue = this.button === selected ? turnValue() : this.prevValue;
        this.button.tint = valToColor(colorValue);
    }

}
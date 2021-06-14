export const GREEN = 0x038003;
export const BLUE = 0x005bd5;
export const gameHeight = 660;
export const gameWidth = 865;


// Use this method instead of Phaser.Color.interpolateColor so that the returned color does not include alpha.
// Tints do not expect alpha in the color hex
function interpolateColor(color1, color2, steps, currentStep) {

    var src1 = Phaser.Color.getRGB(color1);
    var src2 = Phaser.Color.getRGB(color2);
    var r = (((src2.red - src1.red) * currentStep) / steps) + src1.red;
    var g = (((src2.green - src1.green) * currentStep) / steps) + src1.green;
    var b = (((src2.blue - src1.blue) * currentStep) / steps) + src1.blue;

    return Phaser.Color.getColor(r, g, b);
}


export function valToColor(value) {
    if (value >= 0) {
        return interpolateColor(0xffffff, GREEN, 100, value * 100);
    } else {
        return interpolateColor(0xffffff, BLUE, 100, -value * 100);
    }

}


export function getColorBandFromValue(startValue, endValue) {
    return createColorInterpolation(valToColor(startValue), valToColor(endValue));
}

function createColorInterpolation(startColor, endColor) {
    return (value) => interpolateColor(startColor, endColor, 100, value);
}
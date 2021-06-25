/*
Shader method is used because of speed (60FPS). Benchmarks for other approaches:
- Bitmap-based coloring in ProcessPixels: 45 FPS (20 FPS on phone)
- Identifying the hexagon using math in ProcessPixels: 15 FPS
- Identifying hexagon using containers in ProcessPixels: 2 FPS
 */
import {gameHeight, gameWidth, transition_time, valToColor, valToScale} from "./utilities";
import {clearBmd, d, fillData, g, hideBmd, showBmd, updateBmd} from "./display";
import {cellList, updateBoard} from "./gameState";
import {copyBoard, updateCellColor} from "./cellController";

// Using game width. Since pointer co-ordinates have to be used, the shader will convert from game width to 0-1 range.
export const startFill = gameWidth * 0.77;
export const endFill = gameWidth * 0.24;

var fragmentSrc = [

    "precision mediump float;",

    "uniform float     time;",
    "uniform vec2      resolution;",
    "uniform sampler2D iChannel0;",
    "uniform vec2      mouse;",

    "void main( void ) {",

    "vec2 uv = gl_FragCoord.xy / resolution.xy;",
    "uv.y -= 1.0;",
    "uv.y *= -1.0;",

    "if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;",

    "vec4 texColor = texture2D(iChannel0, uv);",

    "if (texColor.w <= 0.0000) discard;",
    "if (texColor.w <= mouse.x) discard;",

    "float maxMultiple = 1.0 / texColor.w;",
    "texColor *= maxMultiple;",

    "gl_FragColor = texColor;",

    "}"
];


export function setupFilters(g) {

    d.increase = createFilter(g, d.bmdIncrease);
    d.decrease = createFilter(g, d.bmdDecrease);


}

function createFilter(g, bmd) {

    var sprite = g.add.sprite(0, 0, bmd);
    sprite.width = bmd.width;
    sprite.height = bmd.height;

    var customUniforms = {
        iChannel0: {type: 'sampler2D', value: sprite.texture, textureData: {repeat: false}},
    };

    var filter = new Phaser.Filter(g, customUniforms, fragmentSrc);
    filter.setResolution(gameWidth, gameHeight);

    sprite.filters = [filter];

    return {filter, sprite};

}

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let count = 0;

function printCount(text) {
    // console.log(`${text} count = ${count}`);
    count = 0;
}

export function calculateFill(cell) {
    count++;
    cellList[cell.index].renderedValue = {from: cell.prevValue, to: cell.value};

    if (cell.prevValue === cell.value) {
        // just need to erase current fill.
        eraseFill(cell);
        return;
    }

// figure out which are our influencers
    var influencers = [];

    for (const n of cell.neighbors) {
        if ((cell.prevValue > cell.value && cell.prevValue > n.prevValue)
            || (cell.prevValue < cell.value && cell.prevValue < n.prevValue)) {
            let diff = Math.abs(cell.prevValue - n.prevValue);
            influencers.push({n, diff});
        }
    }

    let currScale = valToScale(cell.value);
    let prevScale = valToScale(cell.prevValue);
    let isIncreasing = currScale > prevScale;

    let cellColor, cellScale;

    if (isIncreasing) {
        cellColor = valToColor(cell.value);
        cellScale = currScale;
    } else {
        cellColor = valToColor(cell.prevValue);
        cellScale = prevScale;
    }

    let fillPattern = d.fillPattern;
    fillPattern.tint = cellColor;
    fillPattern.scale.setTo(cellScale);

    function drawBmd(pattern) {
        let bmd = isIncreasing ? d.bmdIncrease : d.bmdDecrease;
        bmd.draw(pattern, cell.button.x, cell.button.y);
    }

    if (influencers.length === 0) {
        // we are probably restarting. randomly choose an angle
        fillPattern.alpha = 1.0;
        fillPattern.angle = getRandomInt(0, 5) * 60;
        drawBmd(fillPattern);
        return;

    }

    // sort in decreasing order
    influencers.sort((a, b) => b.diff - a.diff);

    let delta = influencers[0].diff;
    let topInf = [influencers[0].n];

    // for performance, only select top 2 influencers
    if (influencers.length > 1) {
        topInf.push(influencers[1].n);
        delta += influencers[1].diff;
    }


    // figure out the direction of influencers
    for (const inf of topInf) {

        if (inf.index === cell.index - 1) {
            // influence from top
            fillPattern.angle = 180;

        } else if (inf.index === cell.index + 1) {
            // influence from bottom
            fillPattern.angle = 0;
        } else if (inf.index === cell.index - 5) {
            // bottom left
            fillPattern.angle = 60;
        } else if (inf.index === cell.index - 6) {
            // top left
            fillPattern.angle = 120;
        } else if (inf.index === cell.index + 5) {
            // top right
            fillPattern.angle = 240;
        } else {
            // bottom right
            fillPattern.angle = 300;
        }

        if (!isIncreasing) {
            // reverse the direction
            fillPattern.angle += 180;
        }

        fillPattern.alpha = Math.abs(inf.prevValue - cell.prevValue) / delta;
        drawBmd(fillPattern);

    }
}

export var transitionTween = null;
export const setTransitionTween = (val) => transitionTween = val;

let futureCellList = null;

export function eraseFill(cell) {
    d.bmdIncrease.draw(d.spriteCellInner, cell.button.x, cell.button.y, d.spriteCellInner.width, d.spriteCellInner.height, 'destination-out');
    d.bmdDecrease.draw(d.spriteCellInner, cell.button.x, cell.button.y, d.spriteCellInner.width, d.spriteCellInner.height, 'destination-out');
}

function precalculateFillFn(index) {
    let i;
    for (i = index; i < futureCellList.length && i - index < 18; i++) {
        let cell = futureCellList[i];
        if (cell.needCalculateFill()) {
            calculateFill(cell);
        }
    }
    if (i <  futureCellList.length){
        setTimeout(()=>precalculateFillFn(i),0);
    } else {

        printCount('precalculateFill:');
    }

}


export function precalculateFill() {
    clearBmd();

    if (futureCellList === null)
        futureCellList = copyBoard(cellList);

    // need this regardless of whether board was copied
    cellList.forEach(cell => {
        futureCellList[cell.index].value = cell.value;
    });

    updateBoard(futureCellList);


    precalculateFillFn(0);

    // futureCellList.forEach(cell => {
    //     if (cell.needCalculateFill()) {
    //         calculateFill(cell);
    //     }
    // });

}

export function animateTransition(cells, hasDelay, postUpdate = null,) {

    fillData.time = startFill;
    let delay = hasDelay ? 1000 : 0;

    transitionTween = g.add.tween(fillData).to({time: endFill}, transition_time, "Linear", false, delay);

    transitionTween.onStart.add(() => {
        // do this expensive code when the tween actually starts. user may move on to another cell before this is called. so we can skip executing the code.
        for (var i = 0; i < cells.length; i++) {
            updateCellColor(cells[i], true);
        }
        printCount('animateTransition:');
        updateBmd();
        showBmd();
    });

    transitionTween.onComplete.add(function () {

        for (var i = 0; i < cells.length; i++) {
            updateCellColor(cells[i], false);
        }

        hideBmd();

        transitionTween = null;

        if (postUpdate != null) {
            postUpdate();
        }


    });
    transitionTween.start();
}
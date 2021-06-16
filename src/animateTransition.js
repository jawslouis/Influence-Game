/*
Shader method is used because of speed (60FPS). Benchmarks for other approaches:
- Bitmap-based coloring in ProcessPixels: 45 FPS (20 FPS on phone)
- Identifying the hexagon using math in ProcessPixels: 15 FPS
- Identifying hexagon using containers in ProcessPixels: 2 FPS
 */
import {bmd, fillPattern} from "./index";
import {gameHeight, gameWidth} from "./utilities";

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


export function createUI(g, bmd) {
    var sprite = g.add.sprite(0, 0, bmd);
    sprite.width = bmd.width;
    sprite.height = bmd.height;

    var customUniforms = {
        iChannel0: {type: 'sampler2D', value: sprite.texture, textureData: {repeat: false}},
    };


    var filter = new Phaser.Filter(g, customUniforms, fragmentSrc);
    filter.setResolution(gameWidth, gameHeight);

    sprite.filters = [filter];

    return filter;

}

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


export function calculateFill(cell, cellColor) {
// figure out which are our influencers
    var influencers = [];
    var delta = 0;
    for (var i = 0; i < cell.neighbors.length; i++) {
        var n = cell.neighbors[i];
        if ((cell.prevValue > cell.value && cell.prevValue > n.prevValue)
            || (cell.prevValue < cell.value && cell.prevValue < n.prevValue)) {
            influencers.push(n);
            delta += Math.abs(cell.prevValue - n.prevValue);
        }
    }

    fillPattern.tint = cellColor;

    if (influencers.length === 0) {
        // we are probably restarting. randomly choose an angle

        fillPattern.alpha = 1.0;
        fillPattern.angle = getRandomInt(0, 5) * 60;
        bmd.draw(fillPattern, cell.button.x, cell.button.y);
        return;

    }

    // figure out the direction of influencers

    for (var i = 0; i < influencers.length; i++) {
        var inf = influencers[i];

        if (inf.index == cell.index - 1) {
            // influence from top
            fillPattern.angle = 180;

        } else if (inf.index == cell.index + 1) {
            // influence from bottom
            fillPattern.angle = 0;
        } else if (inf.index == cell.index - 5) {
            // bottom left
            fillPattern.angle = 60;
        } else if (inf.index == cell.index - 6) {
            // top left
            fillPattern.angle = 120;
        } else if (inf.index == cell.index + 5) {
            // top right
            fillPattern.angle = 240;
        } else {
            // bottom right
            fillPattern.angle = 300;
        }

        fillPattern.alpha = Math.abs(inf.prevValue - cell.prevValue) / delta;
        bmd.draw(fillPattern, cell.button.x, cell.button.y);

    }
}
import {Cell, valToScale} from "./cell";
import {createUI} from "./animateTransition";
import {setupComponents, updateElements} from "./uiComponents";
import {
    cellList,
    endTurn,
    fillData,
    isUserTurn,
    selectButton,
    selected,
} from "./gameState";
import {gameHeight, gameWidth, GREEN, thresholdScale} from "./utilities";
import {phaserMod} from "./phaserMod";
import {animateDeselect, endFill, startFill} from "./animateSelect";
import {isMultiplayer, sendMove, setupMatchComponents} from "./multiplayer";
import css from "../static/influence.css";

export var bmdIncrease;
export var bmdDecrease;

const BACKGROUND = "#a1ffeb";

export var g;
export var group = {};

const showCellNum = false;

window.onload = function () {

    g = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, "game-canvas", {
        init: init,
        preload: preload,
        create: create,
        update: update,
    });

    document.body.style.backgroundColor = BACKGROUND;
    setupComponents();
    phaserMod();
};

let pointerFilterIncrease;
let pointerFilterDecrease;

function init() {
    g.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
    g.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    g.scale.refresh();

    pointerFilterIncrease = new Phaser.Pointer(g, 5, Phaser.PointerMode.CONTACT);
    pointerFilterDecrease = new Phaser.Pointer(g, 6, Phaser.PointerMode.CONTACT);
}

function preload() {
    g.load.image('cell_inner', '/static/cell_inner.png');
    g.load.image('cell_border', '/static/cell_border.png');
    g.load.image('cell_bg', '/static/cell_bg.png');
    g.load.image('cell_pattern', '/static/cell_pattern.png');
    g.load.image('cell_outline', '/static/cell_outline.png');
    g.load.image('end_turn', '/static/end_turn.png');
}

function rowColToHeightWidth(row, col) {
    var height = (row + 0.75) * grid_height + 3;
    var width = (col + 0.7) * grid_width + 30;

    if ((col + 2) % 2 === 1) {
        height += grid_height / 2;
    }
    return {y: height, x: width};
}

var grid_width;
var grid_height;
export var spriteCellInner;

function pointerUp(pointer) {

    if (!pointer.withinGame) {
        // pointer is outside the board. do nothing
        return;
    }

    if (!isUserTurn()) {
        console.log('not user turn');
        return;
    }

    if (selected !== null) {
        if (isMultiplayer) sendMove();
        endTurn();
    }

    // need to manually reset inputover for cells
    cellList.forEach(cell => {
        if (cell.inputOver) {
            cell.inputImg.input._pointerOutHandler(pointer, false);
            cell.inputOver = false;
        }
    });
}

function linkNeighbors(cell1, cell2) {
    cell1.neighbors.push(cell2);
    cell2.neighbors.push(cell1);
}


function create() {

    setupMatchComponents();

    g.stage.backgroundColor = BACKGROUND;
    g.input.maxPointers = 1;
    g.input.onUp.add(pointerUp);

    var grid = [];
    grid_height = g.cache.getImage('cell_border').height;
    grid_width = grid_height * 0.855;

    var bmdBackground = g.make.bitmapData(gameWidth, gameHeight);
    var cellOutline = g.make.sprite(0, 0, 'cell_outline');
    cellOutline.anchor.setTo(0.5, 0.5);

    // create animation
    bmdIncrease = g.make.bitmapData(gameWidth, gameHeight);
    bmdDecrease = g.make.bitmapData(gameWidth, gameHeight);
    g.stage.updateTransform();
    fillPattern = g.make.sprite(0, 200, 'cell_pattern');
    fillPattern.tint = GREEN;
    fillPattern.anchor.setTo(0.5, 0.5);
    spriteCellInner = g.make.sprite(0, 200, 'cell_inner');
    spriteCellInner.anchor.setTo(0.5, 0.5);

    var bgTile = g.make.sprite(0, 0, 'cell_bg');
    bgTile.anchor.setTo(0.5, 0.5);

    group.button = g.add.group();
    group.border = g.add.group();
    let inputGroup = g.add.group();
    let textGroup = g.add.group();
    group.valBorder = g.add.group();
    group.bgBorder = g.add.group();

    var style = {
        font: "32px Arial",
        fill: "#000000",
        wordWrap: true,
        wordWrapWidth: spriteCellInner.width,
        align: "center",
    };

    const numRows = 6;
    const numCols = 9;

    for (let col = 0; col < numCols; col++) {
        for (let row = 0; row < numRows; row++) {

            if (col % 2 === 1 && row === numRows-1) break;

            var hwTuple = rowColToHeightWidth(row, col);
            var height = hwTuple.y;
            var width = hwTuple.x;
            bmdBackground.draw(bgTile, width, height);

        }
    }

    // create a hex grid
    for (var col = 0; col < numCols; col++) {

        grid.push([]);
        for (var row = 0; row < numRows; row++) {

            if (col % 2 === 1 && row === numRows-1) break;

            var hwTuple = rowColToHeightWidth(row, col);
            var height = hwTuple.y;
            var width = hwTuple.x;

            let bgBorder = g.add.image(width, height, 'cell_bg');
            bgBorder.anchor.setTo(0.5, 0.5);
            bgBorder.alpha = 0;
            group.bgBorder.add(bgBorder);

            let valBorder = g.add.image(width, height, 'cell_inner');
            valBorder.anchor.setTo(0.5, 0.5);
            valBorder.alpha = 0;
            group.valBorder.add(valBorder);

            let cellButton = g.add.image(width, height, 'cell_inner');
            cellButton.anchor.setTo(0.5, 0.5);
            group.button.add(cellButton);

            let cellInput = g.add.image(width, height, 'cell_inner');
            cellInput.inputEnabled = true;
            cellInput.input.useHandCursor = true;
            cellInput.anchor.setTo(0.5, 0.5);
            cellInput.alpha = 0;
            cellInput.events.onInputOver.add(() => {
                // console.log("Over: Cell " + cellButton.cell.index);

                if (!isUserTurn()) return;


                cellButton.cell.inputOver = true;
                selectButton(cellButton);
            }, this);
            cellInput.events.onInputOut.add(() => {
                // console.log(`Out: Cell ${button.cell.index}, Pointer ${pointer.id}`);

                if (!isUserTurn()) return;

                cellButton.cell.inputOver = false;
                if (selected === cellButton) {
                    animateDeselect();
                }
            }, this);

            inputGroup.add(cellInput);


            bmdBackground.draw(spriteCellInner, width, height);
            bmdBackground.draw(cellOutline, width, height);


            var cellBorder = g.add.image(width, height, 'cell_border');
            cellBorder.anchor.setTo(0.5, 0.5);
            cellBorder.scale.setTo(thresholdScale);
            cellBorder.alpha = 0;
            group.border.add(cellBorder);


            var cell = new Cell(cellList.length);
            cell.button = cellButton;
            cell.border = cellBorder;
            cell.inputImg = cellInput;
            cell.valBorder = valBorder;
            cell.bgBorder = bgBorder;
            cell.updateScale();
            cellButton.cell = cell;
            grid[col].push(cell);
            cellList.push(cell);

            if (showCellNum) {
                let text = g.add.text(width, height, cell.index, style);
                text.anchor.setTo(0.5, 0.5);
                textGroup.add(text);
            }

            // add neighbors
            if (row > 0) {
                // link to the one on top
                linkNeighbors(cell, grid[col][row - 1]);
            }

            if (col > 0) {
                // link to the prev col

                // link to the top left
                if (col % 2 === 1) {
                    linkNeighbors(cell, grid[col - 1][row]);
                } else if (row > 0) {
                    linkNeighbors(cell, grid[col - 1][row - 1]);
                }

                // link to the bottom left
                if (col % 2 === 1) {
                    linkNeighbors(cell, grid[col - 1][row + 1]);
                } else if (row < numRows-1) {
                    linkNeighbors(cell, grid[col - 1][row]);
                }
            }

        }
    }

    bmdIncrease.update();
    bmdDecrease.update();

    // arrange the different layers;

    bmdBackground.addToWorld(0, 0, 0, 0, 1, 1);
    g.world.bringToTop(group.bgBorder);
    g.world.bringToTop(group.valBorder);
    g.world.bringToTop(group.button);

    filterIncrease = createUI(g, bmdIncrease);
    filterDecrease = createUI(g, bmdDecrease);

    g.world.bringToTop(group.border);
    g.world.bringToTop(inputGroup);

    if (showCellNum)
        g.world.bringToTop(textGroup);

    updateElements();

}

let filterIncrease;
let filterDecrease;
export var fillPattern;


export function clearBmd(update = false) {
    bmdDecrease.clear();
    bmdIncrease.clear();

    if (update) updateBmd();
}

export function updateBmd() {
    bmdIncrease.update();
    bmdDecrease.update();
}

function update() {
    pointerFilterIncrease.x = fillData.time;
    pointerFilterDecrease.x = startFill - (fillData.time - endFill);
    filterIncrease.update(pointerFilterIncrease);
    filterDecrease.update(pointerFilterDecrease);
}




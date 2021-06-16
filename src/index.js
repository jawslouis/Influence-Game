import {Cell} from "./cell";
import {createUI} from "./animateTransition";
import {setupComponents, updateElements} from "./uiComponents";
import {
    animateDeselect,
    cellList,
    endTurn,
    fillData,
    isAiTurn,
    selectButton,
    selected
} from "./gameState";
import {gameHeight, gameWidth, GREEN} from "./utilities";
import {phaserMod} from "./phaserMod";


export var bmd;

const BACKGROUND = "#a1ffeb";

export var g;
export var buttonGroup;
export var borderGroup;


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


let pointerFilter = new Phaser.Pointer(g, 5, Phaser.PointerMode.CONTACT);

function init() {
    g.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
    g.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    g.scale.refresh();

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
var spriteCellInner;

function pointerUp(pointer) {

    if (!pointer.withinGame) {
        // pointer is outside the board. do nothing
        return;
    }

    if (isAiTurn()) return;

    if (selected !== null) endTurn();

    // need to manually reset inputover for cells
    cellList.forEach(cell => {
        if (cell.inputOver) {
            // console.log(`Invoked pointerout for cell ${cell.index}`);
            cell.button.input._pointerOutHandler(pointer, false);
            cell.inputOver = false;
        }
    });
}

function linkNeighbors(cell1, cell2) {
    cell1.neighbors.push(cell2);
    cell2.neighbors.push(cell1);
}



function create() {
    g.stage.backgroundColor = BACKGROUND;
    g.input.maxPointers = 1;
    g.input.onUp.add(pointerUp);

    var grid = [];
    grid_height = g.cache.getImage('cell_border').height;
    grid_width = grid_height * 0.855;

    var bmdOutline = g.make.bitmapData(gameWidth, gameHeight);
    var cellOutline = g.make.sprite(0, 0, 'cell_outline');
    cellOutline.anchor.setTo(0.5, 0.5);

    // create animation
    bmd = g.make.bitmapData(gameWidth, gameHeight);
    g.stage.updateTransform();
    fillPattern = g.make.sprite(0, 200, 'cell_pattern');
    fillPattern.tint = GREEN;
    fillPattern.anchor.setTo(0.5, 0.5);
    spriteCellInner = g.make.sprite(0, 200, 'cell_inner');
    spriteCellInner.anchor.setTo(0.5, 0.5);

    buttonGroup = g.add.group();
    borderGroup = g.add.group();
    let textGroup = g.add.group();

    var style = {
        font: "32px Arial",
        fill: "#000044",
        wordWrap: true,
        wordWrapWidth: spriteCellInner.width,
        align: "center",
    };


    // create a hex grid
    for (var col = 0; col < 9; col++) {

        grid.push([]);
        for (var row = 0; row < 6; row++) {

            if (col % 2 === 1) {
                if (row === 5) break;
            }
            var hwTuple = rowColToHeightWidth(row, col);
            var height = hwTuple.y;
            var width = hwTuple.x;

            let cellButton = g.add.button(width, height, 'cell_inner');
            cellButton.anchor.setTo(0.5, 0.5);
            cellButton.inputEnabled = true;

            cellButton.events.onInputOver.add((button) => {
                // console.log("Over: Cell " + button.cell.index);

                if (isAiTurn()) return;

                button.cell.inputOver = true;
                selectButton(button);
            }, this);
            cellButton.onInputOut.add((button, pointer) => {
                // console.log(`Out: Cell ${button.cell.index}, Pointer ${pointer.id}`);

                if (isAiTurn()) return;

                button.cell.inputOver = false;
                if (selected === button) {
                    animateDeselect();
                }
            }, this);

            buttonGroup.add(cellButton);
            bmdOutline.draw(cellOutline, width, height);

            var cellBorder = g.add.sprite(width, height, 'cell_border');
            cellBorder.anchor.setTo(0.5, 0.5);
            cellBorder.alpha = 0;
            borderGroup.add(cellBorder);

            var cell = new Cell(cellButton, cellBorder, cellList.length);
            cellButton.cell = cell;
            grid[col].push(cell);
            cellList.push(cell);

            var bgTile = g.add.sprite(width, height, 'cell_bg');
            bgTile.anchor.setTo(0.5, 0.5);

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
                } else if (row < 5) {
                    linkNeighbors(cell, grid[col - 1][row]);
                }
            }

        }
    }

    g.world.bringToTop(buttonGroup);

    bmd.update();
    filter = createUI(g, bmd);
    bmdOutline.addToWorld(0, 0, 0, 0, 1, 1);

    g.world.bringToTop(borderGroup);

    if (showCellNum)
        g.world.bringToTop(textGroup);

    updateElements();

}

var filter;
export var fillPattern;


function update() {

    pointerFilter.x = fillData.time;
    filter.update(pointerFilter);
}




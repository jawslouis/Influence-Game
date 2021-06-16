import {Cell, valToScale} from "./cell";
import {createUI} from "./animateTransition";
import {setupComponents, updateElements} from "./uiComponents";
import {
    cellList,
    endTurn,
    fillData,
    isAiTurn,
    selectButton,
    selected,
    threshold, thresholdScale
} from "./gameState";
import {gameHeight, gameWidth, GREEN} from "./utilities";
import {phaserMod} from "./phaserMod";
import {animateDeselect} from "./animateSelect";


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
    g.stage.backgroundColor = BACKGROUND;
    g.input.maxPointers = 1;
    g.input.onUp.add(pointerUp);

    var grid = [];
    grid_height = g.cache.getImage('cell_inner').height;
    grid_width = grid_height * 0.855;

    var bmdBackground = g.make.bitmapData(gameWidth, gameHeight);
    var cellOutline = g.make.sprite(0, 0, 'cell_outline');
    cellOutline.anchor.setTo(0.5, 0.5);
    var smallCellOutline = g.make.sprite(0, 0, 'cell_outline');
    smallCellOutline.anchor.setTo(0.5, 0.5);
    smallCellOutline.scale.setTo(thresholdScale);

    // create animation
    bmd = g.make.bitmapData(gameWidth, gameHeight);
    g.stage.updateTransform();
    fillPattern = g.make.sprite(0, 200, 'cell_pattern');
    fillPattern.tint = GREEN;
    fillPattern.anchor.setTo(0.5, 0.5);
    spriteCellInner = g.make.sprite(0, 200, 'cell_inner');
    spriteCellInner.anchor.setTo(0.5, 0.5);

    var bgTile = g.make.sprite(0, 0, 'cell_bg');
    bgTile.anchor.setTo(0.5, 0.5);

    buttonGroup = g.add.group();
    borderGroup = g.add.group();
    let inputGroup = g.add.group();
    let textGroup = g.add.group();

    var style = {
        font: "32px Arial",
        fill: "#000044",
        wordWrap: true,
        wordWrapWidth: spriteCellInner.width,
        align: "center",
    };


    const numCols = 9;
    const numRows = 6;

    for (let col = 0; col < 9; col++) {
        for (let row = 0; row < 6; row++) {

            if (col % 2 === 1 && row === 5) break;

            var hwTuple = rowColToHeightWidth(row, col);
            var height = hwTuple.y;
            var width = hwTuple.x;
            bmdBackground.draw(bgTile, width, height);

        }
    }


    // paint over gaps between cells
    let tuple1 = rowColToHeightWidth(0, 0);
    let tuple2 = rowColToHeightWidth(0, 1);

    let heightOffset = tuple2.y - tuple1.y;
    let widthOffset = (tuple2.x - tuple1.x) / 3;

    spriteCellInner.scale.setTo(0.5);
    for (let col = 0; col < 9; col++) {
        for (let row = 0; row < 5; row++) {
            // figure out coordinates for bottom 2 corners. need to paint over the gaps there.

            if (row === 4 && col % 2 === 1) break;

            var hwTuple = rowColToHeightWidth(row, col);
            var height = hwTuple.y;
            var width = hwTuple.x;

            if (col !== 0) {
                // bottom left
                bmdBackground.draw(spriteCellInner, width - widthOffset, height + heightOffset);
            }
            if (col !== 8) {
                bmdBackground.draw(spriteCellInner, width + widthOffset, height + heightOffset);
            }

        }
    }
    spriteCellInner.scale.setTo(1);

    // create a hex grid
    for (var col = 0; col < 9; col++) {

        grid.push([]);
        for (var row = 0; row < 6; row++) {

            if (col % 2 === 1 && row === 5) break;

            var hwTuple = rowColToHeightWidth(row, col);
            var height = hwTuple.y;
            var width = hwTuple.x;

            let cellButton = g.add.image(width, height, 'cell_inner');
            cellButton.anchor.setTo(0.5, 0.5);
            buttonGroup.add(cellButton);

            let cellInput = g.add.image(width, height, 'cell_inner');
            cellInput.inputEnabled = true;
            cellInput.input.useHandCursor = true;
            cellInput.anchor.setTo(0.5, 0.5);
            cellInput.alpha = 0;
            cellInput.events.onInputOver.add(() => {
                // console.log("Over: Cell " + cellButton.cell.index);

                if (isAiTurn()) return;

                cellButton.cell.inputOver = true;
                selectButton(cellButton);
            }, this);
            cellInput.events.onInputOut.add(() => {
                // console.log(`Out: Cell ${button.cell.index}, Pointer ${pointer.id}`);

                if (isAiTurn()) return;

                cellButton.cell.inputOver = false;
                if (selected === cellButton) {
                    animateDeselect();
                }
            }, this);

            inputGroup.add(cellInput);


            bmdBackground.draw(spriteCellInner, width, height);
            bmdBackground.draw(smallCellOutline, width, height);

            var cellBorder = g.add.image(width, height, 'cell_outline');
            cellBorder.anchor.setTo(0.5, 0.5);
            cellBorder.scale.setTo(thresholdScale);
            cellBorder.alpha = 0;
            borderGroup.add(cellBorder);

            var cell = new Cell(cellButton, cellBorder, cellList.length);
            cell.inputImg = cellInput;
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
                } else if (row < 5) {
                    linkNeighbors(cell, grid[col - 1][row]);
                }
            }

        }
    }


    bmd.update();

    bmdBackground.addToWorld(0, 0, 0, 0, 1, 1);
    g.world.bringToTop(buttonGroup);

    filter = createUI(g, bmd);

    g.world.bringToTop(borderGroup);
    g.world.bringToTop(inputGroup);

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




/* Note: Cannot import game state values as this is run in a web worker thread */
import {valueAtTurn} from "./utilities";
import {updateBoard, difficulty} from "./gameState";
import {aboveThreshold} from "./cell";
import {copyBoard} from "./cellController";


// have to use pure function for web worker
function turnGreen(turn) {
    return turn % 2 === 1;
}

function resetSimulation({simulBoard, cellList}) {

    for (var i = 0; i < cellList.length; i++) {
        var c = simulBoard[i];
        c.value = cellList[i].value;
    }
}

function boardScore(board) {
    var score = 0;
    for (var i = 0; i < board.length; i++) {
        score += board[i].value;
    }
    return score;
}

function difficultyToNum(diff, numChoices) {

    switch (diff) {
        case difficulty.Easy:
            return Math.round(numChoices * 0.4);
        case difficulty.Medium:
            return Math.round(numChoices * 0.1);
        case difficulty.Hard:
            return 0;
        default:
            throw  'Error: difficulty not found';
    }
}


// Try selecting each cell and simulate 20 turns passing with no moves. The highest-scoring cell is chosen.
function greedySearch({cellList, currentTurn, settings}) {

    // create a copy of the game board
    let simulBoard = copyBoard(cellList, true);

    let scoreList = [];

    for (var i = 0; i < cellList.length; i++) {

        var c = cellList[i];

        if (aboveThreshold(c)) {
            continue;
        }
        var score;
        resetSimulation({simulBoard, cellList});
        var ended = false;

        // update for many turns
        simulBoard[i].value = valueAtTurn(currentTurn);
        for (var j = 0; j < 20 && !ended; j++) {
            ended = updateBoard(simulBoard);
            if (ended) break;
        }

        if (turnGreen(currentTurn)) score = boardScore(simulBoard);
        else score = -boardScore(simulBoard);

        scoreList.push({score: score, cell: c});

    }

    // sort by descending score
    scoreList.sort((a, b) => b.score - a.score);

    const result = turnGreen(currentTurn) ? difficultyToNum(settings.aiGreen, scoreList.length) : difficultyToNum(settings.aiBlue, scoreList.length);
    return scoreList[result].cell;
}

export function findBestCell({settings, cellList, currentTurn}) {

    let isGreen = currentTurn % 2 === 1;
    let result;
    if (isGreen && settings.aiGreen === difficulty.VeryHard || !isGreen && settings.aiBlue === difficulty.VeryHard) {
        // for very hard AI
        result = MCTS({cellList, currentTurn});
    } else result = greedySearch({cellList, currentTurn, settings});

    return result.index;
}

// Monte Carlo tree search for the very hard AI
function MCTS({cellList, currentTurn}) {

    const start = Date.now();
    let board = copyBoard(cellList, true);
    let root = new TreeNode(null, board, null, currentTurn - 1);

    for (let i = 0; i < 10000; i++) {
        let leaf = selectLeaf(root);
        simulatePlay(leaf);
    }

    let mostSimul = 0;
    let bestChild = null;
    root.children.forEach(child => {
        if (child.numSimulations() > mostSimul) {
            mostSimul = child.numSimulations();
            bestChild = child;
        }
    });

    return cellList[bestChild.move];

}

function getScore(simulateBoard) {

    let greenScore = 0;
    let blueScore = 0;
    simulateBoard.forEach(cell => {
        if (aboveThreshold(cell)) {
            if (cell.value > 0) {
                greenScore++;
            } else {
                blueScore++;
            }
        }
    });

    let result = {green: 0, blue: 0};
    if (greenScore > blueScore) result.green++;
    else if (blueScore > greenScore) result.blue++;
    else {
        // it's a tie
        result.green += 0.5;
        result.blue += 0.5;
    }
    return result;
}

function simulatePlay(node) {
    let result;

    if (node.isTerminal) result = node.terminalResult;
    else {
        let moves = getValidMoves(node.board);
        if (moves.length === 0) {
            node.isTerminal = true;
            node.terminalResult = getScore(node.board);
            result = node.terminalResult;
        } else {

            let simulateBoard = copyBoard(node.board, true);

            let ended = false;
            for (let j = 0; j < 20 && !ended; j++) {
                ended = updateBoard(simulateBoard);
                if (ended) break;
            }
            result = getScore(simulateBoard);
        }
    }

    // propagation step
    let parent = node;
    while (parent !== null) {
        parent.addScore(result);
        parent = parent.parent;
    }


}


function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// only called when this is a leaf node
function expandNode(node) {

    let moves = getValidMoves(node.board);
    if (moves.length === 0) {
        return node;
    }
    let move = randomElement(moves);

    return node.createChild(move);
}


function getValidMoves(board) {
    let moves = [];
    board.forEach(cell => {
        if (!aboveThreshold(cell)) moves.push(cell.index);
    });

    return moves;
}

function randomElement(list) {
    let selection = getRandomInt(list.length);
    return list[selection];
}


function selectLeaf(node) {

    if (node.isTerminal) return node;
    if (node.children.length === 0) return expandNode(node);

    let moves = getValidMoves(node.board);
    if (node.children.length < moves.length) {
        // there are still moves without corresponding child nodes. create a node for one.
        while (moves.length > 0) {

            let idx = getRandomInt(moves.length);
            let move = moves.splice(idx, 1)[0];

            if (!node.childMoves.includes(move)) {
                return node.createChild(move);
            }
        }
    }

    let selectionScore, selectedChild = null;
    node.children.forEach(child => {
        let childScore = child.getSelectionScore();
        if (selectedChild === null || childScore > selectionScore) {
            selectionScore = childScore;
            selectedChild = child;
        }
    });
    return selectLeaf(selectedChild);
}

// tree node for MCTS
class TreeNode {
    constructor(parent, board, move, turn) {
        this.children = [];
        this.greenWins = 0;
        this.blueWins = 0;
        this.move = move; // move to get to this board state
        this.turn = turn; // turn where move was made
        this.board = board;
        this.ended = false;
        this.parent = parent;
        this.childMoves = [];
        this.isTerminal = false;
    }

    numSimulations() {
        return this.blueWins + this.greenWins;
    }

    addScore(score) {
        this.blueWins += score.blue;
        this.greenWins += score.green;
    }

    getSelectionScore() {

        let totalSimulations = this.greenWins + this.blueWins;
        let wins = this.turn % 2 === 1 ? this.greenWins : this.blueWins;
        let exploitation = wins / totalSimulations;

        let parentSimulations = this.parent.greenWins + this.parent.blueWins;
        let factor = 1.414;
        let exploration = factor * Math.sqrt(Math.log(parentSimulations) / totalSimulations);

        return exploitation + exploration;

    }

    createChild(move) {

        let nextBoard = copyBoard(this.board, true);
        let nextTurn = this.turn + 1;
        nextBoard[move].value = valueAtTurn(nextTurn);
        updateBoard(nextBoard);
        let child = new TreeNode(this, nextBoard, move, nextTurn);
        this.childMoves.push(move);
        this.children.push(child);
        return child;
    }
}
import {currentTurn, difficulty, settings} from "./gameState";

const GREEN_STR = '#038003';
const BLUE_STR = '#005bd5';
export const GREEN_CLASS = 'green';
export const BLUE_CLASS = 'blue';

export const greenIsOn = () => settings.aiGreen !== difficulty.None;
export const blueIsOn = () => settings.aiBlue !== difficulty.None;

const tileSuffix = (score) => score === 1 ? ' tile' : ' tiles';

export var matchMsg;

export function setScore(greenScore, blueScore) {
    document.getElementById('score-green').innerHTML = greenScore + tileSuffix(greenScore);
    document.getElementById('score-blue').innerHTML = blueScore + tileSuffix(blueScore);
}

function setScoreBorder(currentTurn) {

    let greenBorder = document.getElementById('green-score-border');
    let blueBorder = document.getElementById('blue-score-border');
    if (currentTurn % 2 === 1) {
        blueBorder.style.opacity = '0';
        greenBorder.style.opacity = '1';
    } else {
        greenBorder.style.opacity = '0';
        blueBorder.style.opacity = '1';
    }

}

export function updateElements(currentTurn) {
    setScoreBorder(currentTurn);
    let opacity = currentTurn === 1 ? "0.5" : "1";
    document.getElementById('undo-btn').style.opacity = opacity;
}

let gameOverOverlay, settingsOverlay;
export var resultString;

export function showGameOver(greenScore, blueScore) {
    let winDiv = document.getElementById("winner");

    if (greenScore > blueScore) {
        resultString = "Green Wins!";
        winDiv.style.color = GREEN_STR;
    } else if (blueScore > greenScore) {
        resultString = "Blue Wins!";
        winDiv.style.color = BLUE_STR;
    } else {
        //tie
        resultString = "It's a Tie!";
        winDiv.style.color = 'gray';
    }
    winDiv.innerHTML = resultString;
    gameOverOverlay.classList.remove('hidden');
}

let settingsBg;
let gameAiStop, gameStartTurn;

function elemToDifficulty(elem) {
    let attr = elem.getAttribute('ai');
    switch (attr) {
        case 'none':
            return difficulty.None;
        case 'easy':
            return difficulty.Easy;
        case 'medium':
            return difficulty.Medium;
        case 'hard':
            return difficulty.Hard;
        case 'very hard':
            return difficulty.VeryHard;
        default:
            throw 'Error: Difficulty not found';
    }
}

export function setupComponents({undoClick, restartClick, setAiStop, startTurn}) {

    gameAiStop = setAiStop;
    gameStartTurn = startTurn;

    matchMsg = document.getElementById('match-msg');

    document.getElementById('undo-btn').onclick = () => {
        if (currentTurn <= 1) return; // do nothing
        rotateUndo();
        undoClick();
    };

    document.getElementById('settings').onclick = () => {
        showSettings(true);
    };

    document.querySelectorAll('.restart').forEach(elem => {
        elem.onclick = () => restartClick();
    });

    gameOverOverlay = document.getElementById('gameover-overlay');
    settingsOverlay = document.getElementById('settings-overlay');

    document.querySelectorAll('#settings-ai .btn-grp div').forEach(elem => {
        let color = elem.closest('.' + GREEN_CLASS) !== null ? GREEN_CLASS : BLUE_CLASS;
        elem.onclick = () => {

            if (!elem.classList.contains('btn-selected')) {
                document.querySelectorAll(`.${color} .btn-grp div`).forEach(e => e.classList.remove('btn-selected'));
                elem.classList.add('btn-selected');

                if (color === GREEN_CLASS) {
                    settings.aiGreen = elemToDifficulty(elem);
                } else settings.aiBlue = elemToDifficulty(elem);
            }
        };
    });

    settingsBg = document.getElementById('settings-bg');
    settingsBg.onclick = () => {
        showSettings(false);
    };

    // set blue Easy AI
    document.querySelector('.blue .btn-grp :nth-child(2)').click();
    // document.querySelector('.blue .btn-grp :nth-child(5)').click();
}


function showSettings(show) {

    if (show) {
        gameAiStop(true);
        settingsBg.style.visibility = 'visible';
        settingsOverlay.classList.remove('hidden');
        settingsOverlay.classList.add('visible');
    } else {
        gameAiStop(false);
        settingsBg.style.visibility = 'hidden';
        settingsOverlay.classList.remove('visible');
        settingsOverlay.classList.add('hidden');

        gameStartTurn();
    }
}


export function closeOverlays() {
    gameOverOverlay.classList.add('hidden');
    showSettings(false);
}

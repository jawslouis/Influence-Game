import {gameWidth} from "./utilities";

export const d = {};
export const group = {};
export var fillData = {time: gameWidth};
export var g;

export function setGame(game){
    g = game;
}

export function clearBmd(update = false) {
    d.bmdDecrease.clear();
    d.bmdIncrease.clear();

    if (update) updateBmd();
}

export function updateBmd() {
    d.bmdIncrease.update();
    d.bmdDecrease.update();
}
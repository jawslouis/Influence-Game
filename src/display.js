import {gameWidth} from "./utilities";

export const d = {
    bmdCleared: false,
};
export const group = {};
export var fillData = {time: gameWidth};
export var g;

export function setGame(game) {
    g = game;
}

export function clearBmd() {
    d.bmdDecrease.clear();
    d.bmdIncrease.clear();
    d.bmdCleared = true;
}

export function hideBmd() {
    d.increase.sprite.visible = false;
    d.decrease.sprite.visible = false;
}

export function showBmd() {
    d.increase.sprite.visible = true;
    d.decrease.sprite.visible = true;
}

export function updateBmd() {
    d.bmdIncrease.update();
    d.bmdDecrease.update();
}
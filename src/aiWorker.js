import {findBestCell} from "./ai";

self.onmessage = function (e) {
    let result = findBestCell(e.data);
    postMessage(result);
};
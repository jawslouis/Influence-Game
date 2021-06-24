import {findBestCell} from "./ai";

self.onmessage = function (e) {
    console.log('Worker: Message received from main script');
    let result = findBestCell(e.data);
    postMessage(result);
};
export const phaserMod = () => {
    /**
     * Internal method handling the pointer released event.
     * @method Phaser.InputHandler#_releasedHandler
     * @private
     * @param {Phaser.Pointer} pointer
     */
    Phaser.InputHandler.prototype._releasedHandler = function (pointer) {

        if (this.sprite === null) {
            //  Abort. We've been destroyed.
            return;
        }

        var data = this._pointerData[pointer.id];

        //  If was previously touched by this Pointer, check if still is AND still over this item
        if (data.isDown && pointer.isUp) {
            data.isDown = false;
            data.isUp = true;
            data.timeUp = this.game.time.time;
            data.downDuration = data.timeUp - data.timeDown;

            //  Only release the InputUp signal if the pointer is still over this sprite
            var isOver = this.checkPointerOver(pointer);

            if (this.sprite && this.sprite.events) {
                if (!this.dragStopBlocksInputUp ||
                    this.dragStopBlocksInputUp && !(this.draggable && this.isDragged && this._draggedPointerID === pointer.id)) {
                    this.sprite.events.onInputUp$dispatch(this.sprite, pointer, isOver);
                }

                if (this.sprite && this.sprite.parent && this.sprite.parent.type === Phaser.GROUP) {
                    this.sprite.parent.onChildInputUp.dispatch(this.sprite, pointer, isOver);
                }

                //  The onInputUp event may have changed the sprite so that checkPointerOver is no longer true, so update it.
                if (isOver) {
                    isOver = this.checkPointerOver(pointer);
                }
            }

            /* this part is changed from Phaser. always set to false, so inputover can be triggered after pointer is released */
            data.isOver = false;

            if (!isOver && this.useHandCursor) {
                this.game.canvas.style.cursor = "default";
                this._setHandCursor = false;
            }

            //  It's possible the onInputUp event created a new Sprite that is on-top of this one, so force a Pointer update
            pointer.dirty = true;

            this._pendingDrag = false;

            //  Stop drag
            if (this.draggable && this.isDragged && this._draggedPointerID === pointer.id) {
                this.stopDrag(pointer);
            }
        }

    };

    Phaser.RenderTexture = class RenderTexture {
    };
};
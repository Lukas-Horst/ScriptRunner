import {JsonObject, KeyDownEvent, KeyUpEvent } from "@elgato/streamdeck";

export class ButtonPressHandler<T extends JsonObject> {
    private longPressTimer: NodeJS.Timeout | null = null;
    private readonly longPressDelay: number;

    constructor(
        private onShortPress: (ev: KeyUpEvent<T>) => void,
        private onLongPress: (ev: KeyDownEvent<T>) => void,
        longPressDelay: number = 1000,
    ) {
        this.longPressDelay = longPressDelay;
    }

    public handleKeyDown(ev: KeyDownEvent<T>): void {
        // Clear any existing timer to prevent multiple timers from running
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }

        this.longPressTimer = setTimeout(() => {
            this.onLongPress(ev);
            this.longPressTimer = null; // Clear the timer after execution
        }, this.longPressDelay);
    }

    public handleKeyUp(ev: KeyUpEvent<T>): void {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.onShortPress(ev);
            this.longPressTimer = null;
        }
    }
}
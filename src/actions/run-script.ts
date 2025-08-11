import { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { exec } from "child_process";
import * as path from 'path';
import streamDeck, { LogLevel } from "@elgato/streamdeck";
const logger = streamDeck.logger.createScope("run-script");

@action({ UUID: "com.lukas-horst.scriptrunner.run-script" })
export class RunScript extends SingletonAction<RunScriptSettings> {

    // This map stores the schedule ID for each coordinate
    private scheduleMap = new Map<string|undefined, NodeJS.Timeout>();
    // This map stores the info if the autostart was activated for each coordinate
    private autostartMap = new Map<string|undefined, boolean>();

    /**
     * Called when the action appears on the Stream Deck.
     * It updates the image based on the file extension in the settings.
     * @param ev The WillAppearEvent payload.
     */
    override onWillAppear(ev: WillAppearEvent<RunScriptSettings>): void | Promise<void> {
        const { settings } = ev.payload;
        const id = settings.actionId;
        const autostart = settings.autostart;
        if (autostart && !this.autostartMap.has(id)) {
            this.autostartMap.set(id, true);
            // @ts-ignore
            const scheduleInt = parseInt(settings.schedule, 10);
            this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, true);
            this.startSchedule(settings, ev.action, id, scheduleInt);
        } else {
            this.autostartMap.set(id, false);
            this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, false);
        }
    }

    /**
     * Called when the settings for the action are received or changed.
     * It updates the image based on the file extension.
     * @param ev The DidReceiveSettingsEvent payload.
     */
    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<RunScriptSettings>): Promise<void> | void {
        const { settings } = ev.payload;
        const id = settings.actionId;
        // Adding new added id's to the autostart
        if (!this.autostartMap.has(id)) {
            this.autostartMap.set(id, false);
        }
        this.stopSchedule(id, ev);
        this.updateImageBasedOnFileExtension(settings, ev.action, false);
    }

    /**
     * Called when the action is removed from the Stream Deck.
     * It cleans up any running schedules to prevent memory leaks.
     * @param ev The WillDisappearEvent payload.
     */
    override onWillDisappear(ev: WillDisappearEvent<RunScriptSettings>): void | Promise<void> {
        // Clean up all running schedules when an action disappears
        this.scheduleMap.forEach(id => clearInterval(id));
        this.scheduleMap.clear();
    }

    /**
     * Updates the action's image based on the file extension in the settings.
     * @param settings The settings object containing the file path.
     * @param action The action instance to update the image for.
     * @param running True if the script is currently running
     */
    private updateImageBasedOnFileExtension(settings: RunScriptSettings, action: any, running: boolean): void {
        const file = settings.file;
        const scheduleInt = settings.schedule ? parseInt(settings.schedule, 10) : undefined;
        if (!file) {
            action.setImage("imgs/plugin/script-runner-logo.png");
            return;
        }
        const runningString = running ? "run-" : "";

        if (file.endsWith(".py")) {
            if (scheduleInt) {
                action.setImage(`imgs/plugin/${runningString}python-schedule.png`);
            } else {
                action.setImage(`imgs/plugin/${runningString}python-script.png`);
            }
        } else if (file.endsWith(".ps1")) {
            if (scheduleInt) {
                action.setImage(`imgs/plugin/${runningString}powershell-schedule.png`);
            } else {
                action.setImage(`imgs/plugin/${runningString}powershell-script.png`);
            }
        } else {
            action.setImage("imgs/plugin/invalid.png");
        }
    }

    /**
     * Called when the user presses the key.
     * It toggles the scheduled execution of the script or runs it once.
     * @param ev The KeyDownEvent payload.
     */
    override async onKeyDown(ev: KeyDownEvent<RunScriptSettings>): Promise<void> {
        const { settings } = ev.payload;
        const scheduleInt = settings.schedule ? parseInt(settings.schedule, 10) : undefined;

        const id = settings.actionId;

        if (this.stopSchedule(id, ev)) {return;}
        this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, true);

        // If a schedule is configured and is a valid number, start it
        if (settings.file && scheduleInt !== undefined && !isNaN(scheduleInt) && scheduleInt > 0) {
            this.startSchedule(settings, ev.action, id, scheduleInt);
        } else if (settings.file) {
            // No valid schedule, run the script once
            this.executeScript(settings.file, settings.parameters, ev.action, settings.terminal);
            // Updating the image with a 1.5s delay
            setTimeout(() => {
                this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, false);
            }, 1500);
        }
    }

    /**
     * Executes a script immediately and then sets up a recurring schedule for its execution.
     * The schedule is stored in the `scheduleMap` to be managed later (e.g., to be stopped).
     * @param settings The settings object containing script file path, parameters, etc.
     * @param action The action instance to be used for executing the script.
     * @param id A unique id identifying the action's on the Stream Deck.
     * @param scheduleInt The interval in seconds for the script to be re-executed.
     */
    private startSchedule(settings: RunScriptSettings, action: any, id: string|undefined, scheduleInt: number): void {
        // Execute the script immediately
        // @ts-ignore
        this.executeScript(settings.file, settings.parameters, action, settings.terminal);

        // Then set an interval to run it repeatedly and store the ID
        const newScheduleId = setInterval(() => {
            // @ts-ignore
            this.executeScript(settings.file, settings.parameters, action, settings.terminal);
        }, scheduleInt * 1000); // Schedule is in seconds, so multiply by 1000

        this.scheduleMap.set(id, newScheduleId);
    }

    /**
     * Stops a running scheduled script based on its unique identifier.
     * It clears the interval, removes the entry from the schedule map, and updates the action's image.
     * @param id The unique identifier for the schedule to be stopped.
     * @param ev The Stream Deck event payload, used to access settings and action properties.
     */
    private stopSchedule(id: string | undefined, ev: KeyDownEvent<RunScriptSettings> | DidReceiveSettingsEvent<RunScriptSettings>): boolean {
        if (this.scheduleMap.has(id)) {
            this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, false);
            clearInterval(this.scheduleMap.get(id)!);
            this.scheduleMap.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Gets the row and column coordinates from a Stream Deck event.
     * @param event The Stream Deck event object.
     * @returns A tuple containing the row and column coordinates: [row, column].
     */
    private getCoordinates(event: KeyDownEvent<RunScriptSettings> | WillAppearEvent<RunScriptSettings>): [number, number] {
        // @ts-ignore
        const { row, column } = event.payload.coordinates;
        return [row, column];
    }

    /**
     * Executes the script and displays the output on the Stream Deck key.
     * @param filePath The path to the script file.
     * @param parameters The optional parameters to pass to the script.
     * @param action The action instance to set the title for.
     * @param inTerminal A boolean indicating if the script should run in a new terminal window.
     */
    private executeScript(filePath: string, parameters: string = "", action: any, inTerminal: boolean = false): void {
        const command = this.getExecutionCommand(filePath, parameters, inTerminal);

        if (!command) {
            return;
        }

        exec(command, (error, stdout, stderr) => {
            if (!error) {
                // Update the title only if a schedule is not running to avoid race conditions
                const key = `${action.coordinates.row},${action.coordinates.column}`;
                if (!this.scheduleMap.has(key)) {
                    const output = stdout.trim();
                }
            }
        });
    }

    /**
     * Determines the correct command to execute a file based on its extension and adds parameters.
     * @param filePath The path to the script file.
     * @param parameters The parameters to append to the command.
     * @param inTerminal A boolean indicating if the script should run in a new terminal window.
     * @returns The full command string to be executed, or null if the file type is not supported.
     */
    private getExecutionCommand(filePath: string, parameters: string, inTerminal: boolean): string | null {
        let baseCommand: string | null = null;

        if (filePath.endsWith(".py")) {
            baseCommand = `python "${filePath}" ${parameters}`;
        } else if (filePath.endsWith(".ps1")) {
            baseCommand = `powershell.exe -ExecutionPolicy Bypass -File "${filePath}" ${parameters}`;
        }

        if (!baseCommand) {
            return null;
        }

        if (inTerminal) {
            const fileDir = path.dirname(filePath);
            return `start cmd.exe /k "cd /d "${fileDir}" && ${baseCommand}"`;
        }

        return baseCommand;
    }

    /**
     * Opens a new terminal window and prints a given string.
     * @param message The string to be printed in the terminal.
     */
    private printToTerminal(message: string): void {
        const command = `start cmd.exe /k "echo ${message}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error opening terminal: ${error.message}`);
            } else {
                console.log(`Terminal opened with message: ${message}`);
            }
        });
    }
}


type RunScriptSettings = {
    file?: string;
    parameters?: string;
    terminal?: boolean;
    schedule?: string;
    autostart?: boolean;
    trueImage?: string;
    falseImage?: string;
    separateScript?: boolean;
    actionId?: string;
};
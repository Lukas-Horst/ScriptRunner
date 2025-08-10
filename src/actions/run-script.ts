import { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { exec } from "child_process";
import * as path from 'path';

@action({ UUID: "com.lukas-horst.scriptrunner.run-script" })
export class RunScript extends SingletonAction<RunScriptSettings> {

    // This map stores the schedule ID for each coordinate
    private scheduleMap = new Map<string, NodeJS.Timeout>();

    /**
     * Called when the action appears on the Stream Deck.
     * It updates the image based on the file extension in the settings.
     * @param ev The WillAppearEvent payload.
     */
    override onWillAppear(ev: WillAppearEvent<RunScriptSettings>): void | Promise<void> {
        this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, false);
    }

    /**
     * Called when the settings for the action are received or changed.
     * It updates the image based on the file extension.
     * @param ev The DidReceiveSettingsEvent payload.
     */
    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<RunScriptSettings>): Promise<void> | void {
        this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, false);
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
        const coordinates = this.getCoordinates(ev);
        const scheduleInt = settings.schedule ? parseInt(settings.schedule, 10) : undefined;

        const key = `${coordinates[0]},${coordinates[1]}`;

        // If a schedule is already running for this button, stop it
        if (this.scheduleMap.has(key)) {
            this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, false);
            clearInterval(this.scheduleMap.get(key)!);
            this.scheduleMap.delete(key);
            return;
        }
        this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, true);

        // If a schedule is configured and is a valid number, start it
        if (settings.file && scheduleInt !== undefined && !isNaN(scheduleInt) && scheduleInt > 0) {
            // Execute the script immediately
            this.executeScript(settings.file, settings.parameters, ev.action, settings.terminal);

            // Then set an interval to run it repeatedly and store the ID
            const newScheduleId = setInterval(() => {
                // @ts-ignore
                this.executeScript(settings.file, settings.parameters, ev.action, settings.terminal);
            }, scheduleInt * 1000); // Schedule is in seconds, so multiply by 1000
            this.scheduleMap.set(key, newScheduleId);
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
     * Gets the row and column coordinates from a Stream Deck event.
     * @param event The Stream Deck event object.
     * @returns A tuple containing the row and column coordinates: [row, column].
     */
    private getCoordinates(event: KeyDownEvent<RunScriptSettings>): [number, number] {
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
    trueImage?: string;
    falseImage?: string;
};
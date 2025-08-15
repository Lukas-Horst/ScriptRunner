import {
    action,
    KeyDownEvent,
    SingletonAction,
    WillAppearEvent,
    DidReceiveSettingsEvent,
    WillDisappearEvent,
    KeyUpEvent
} from "@elgato/streamdeck";
import { exec } from "child_process";
import * as path from 'path';
import streamDeck, { LogLevel } from "@elgato/streamdeck";
const logger = streamDeck.logger.createScope("run-script");
import { ButtonPressHandler } from "../button-press-handler";

@action({ UUID: "com.lukas-horst.scriptrunner.run-script" })
export class RunScript extends SingletonAction<RunScriptSettings> {

    // This map stores the schedule ID for each coordinate
    private scheduleMap = new Map<string|undefined, NodeJS.Timeout>();
    // This map stores the info if the autostart was activated for each coordinate
    private autostartMap = new Map<string|undefined, boolean>();
    private imageSetMap = new Map<string|undefined, boolean>();
    private currentImageMap = new Map<string|undefined, string>();

    private buttonHandler = new ButtonPressHandler<RunScriptSettings>(
        (ev) => this.shortPressAction(ev),
        (ev) => this.longPressAction(ev),
    );

    /**
     * Checks if the file type is valid
     * @param file The file to check.
     * @return True if valid.
     */
    private checkScriptType (file: string|undefined): boolean {
        if (file) {
            return file.endsWith(".py") || file.endsWith(".ps1");
        }
        return false;
    }

    /**
     * Called when the action appears on the Stream Deck.
     * It updates the image based on the file extension in the settings.
     * @param ev The WillAppearEvent payload.
     */
    override onWillAppear(ev: WillAppearEvent<RunScriptSettings>): void | Promise<void> {
        const { settings } = ev.payload;
        const id = settings.actionId;
        const autostart = settings.autostart;
        let scheduleInt = settings.separateSchedule ? parseInt(settings.separateSchedule, 10) : undefined;
        let start = false;
        const separateAutostart = settings.separateScheduleCheckbox && !this.autostartMap.has(id) && scheduleInt
            && this.checkScriptType(settings.separateFile);
        if (!this.currentImageMap.has(id)) {
            this.currentImageMap.set(id, 'imgs/plugin/script-runner-logo.png');
        }

        // Autostart for the normal script
        if (autostart && !this.autostartMap.has(id) && this.checkScriptType(settings.file)) {
            this.autostartMap.set(id, true);
            // @ts-ignore
            scheduleInt = parseInt(settings.schedule, 10);
            ev.action.setImage('imgs/plugin/script-autostart.png');
            start = true;
        // Autostart for the separate script
        } else if (separateAutostart) {
            this.autostartMap.set(id, true);
            ev.action.setImage('imgs/plugin/separate-script-autostart.png');
            start = true;
        // No autostart
        } else {
            this.autostartMap.set(id, false);
            this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, false);
        }
        setTimeout(() => {
            if (start && scheduleInt) {
                this.startSchedule(settings, ev.action, id, scheduleInt);
                if (!separateAutostart) {
                    this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, true);
                }
            }
        }, 1500);
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
        this.stopSchedule(id, ev, true);
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
        // Checking if the image is manually set
        const id = settings.actionId;
        if (this.imageSetMap.has(id)) {
            if (this.imageSetMap.get(id)) {
                return;
            }
        }
        const file = settings.file;
        const scheduleInt = settings.schedule ? parseInt(settings.schedule, 10) : undefined;
        if (!file) {
            this.currentImageMap.set(id, 'imgs/plugin/script-runner-logo.png');
            action.setImage(this.currentImageMap.get(id));
            return;
        }
        const runningString = running ? "run-" : "";

        if (file.endsWith(".py")) {
            if (scheduleInt) {
                this.currentImageMap.set(id, `imgs/plugin/${runningString}python-schedule.png`);
            } else {
                this.currentImageMap.set(id, `imgs/plugin/${runningString}python-script.png`);
            }
        } else if (file.endsWith(".ps1")) {
            if (scheduleInt) {
                this.currentImageMap.set(id, `imgs/plugin/${runningString}powershell-schedule.png`);
            } else {
                this.currentImageMap.set(id, `imgs/plugin/${runningString}powershell-script.png`);
            }
        } else {
            this.currentImageMap.set(id, 'imgs/plugin/invalid.png');
        }
        action.setImage(this.currentImageMap.get(id));
    }

    override onKeyDown(ev: KeyDownEvent<RunScriptSettings>): void {
        // Just delegate the event to the handler
        this.buttonHandler.handleKeyDown(ev);
    }

    override onKeyUp(ev: KeyUpEvent<RunScriptSettings>): void {
        // Just delegate the event to the handler
        this.buttonHandler.handleKeyUp(ev);
    }

    private shortPressAction(ev: KeyUpEvent<RunScriptSettings>): void {
        const { settings } = ev.payload;
        if (!this.checkScriptType(settings.file)) {return;}
        const id = settings.actionId;
        if (this.stopSchedule(id, ev)) {return;}
        this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, true);

        let scheduleInt = undefined;
        if (settings.separateScheduleCheckbox) {
            scheduleInt = settings.separateSchedule ? parseInt(settings.separateSchedule, 10) : undefined;
        } else {
            scheduleInt = settings.schedule ? parseInt(settings.schedule, 10) : undefined;
        }
        const isScheduled = scheduleInt !== undefined && !isNaN(scheduleInt) && scheduleInt > 0;

        // If a schedule is configured and is a valid number, start it
        if (settings.file && isScheduled && !settings.separateScheduleCheckbox) {
            // @ts-ignore
            this.startSchedule(settings, ev.action, id, scheduleInt);
            return;
        }
        const separateFile = settings.separateFile;
        let separateScript = this.checkScriptType(separateFile);
        if (settings.file) {
            // No valid schedule, run the script once
            this.executeScript(settings.file, settings.parameters, ev.action, settings.terminal,
                settings.trueImage, settings.falseImage, settings.actionId, !separateScript);
            // Updating the image with a 1.5s delay
            setTimeout(() => {
                if (separateScript && separateFile) {
                    // Executing the separate script if it exists
                    this.executeScript(separateFile, settings.separateParameters, ev.action, settings.terminal,
                        settings.trueImage, settings.falseImage, settings.actionId, separateScript);
                }
                this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action, false);
            }, 1000);
        }
    }

    private longPressAction(ev: KeyDownEvent<RunScriptSettings>): void {
        const { settings } = ev.payload;
        const scheduleInt = settings.separateSchedule ? parseInt(settings.separateSchedule, 10) : undefined;
        if (!this.checkScriptType(settings.separateFile) || !scheduleInt) {return;}
        const id = settings.actionId;
        let start = false;
        // Checking if the image script schedule is running
        if (this.scheduleMap.has(id)) {
            this.stopSchedule(id, ev, true);
            ev.action.setImage('imgs/plugin/script-schedule-ended.png');
        } else {
            ev.action.setImage('imgs/plugin/script-schedule-started.png');
            start = true;
        }
        setTimeout(() => {
            ev.action.setImage(this.currentImageMap.get(id));
            if (start) {
                this.startSchedule(settings, ev.action, id, scheduleInt);
            }
        }, 1500);
    }

    /**
     * Executes a script immediately and then sets up a recurring schedule for its execution.
     * The schedule is stored in the `scheduleMap` to be managed later (e.g., to be stopped).
     * @param settings The settings object containing script file path, parameters, etc.
     * @param action The action instance to be used for executing the script.
     * @param id A unique id identifying the action's on the Stream Deck.
     * @param scheduleInt The interval in seconds for the script to be re-executed.
     */
    private startSchedule(settings: RunScriptSettings, action: any, id: string | undefined, scheduleInt: number): void {
        let countdown = settings.countdown;
        let timer = scheduleInt;

        let file = settings.file;
        let parameters = settings.parameters;
        if (settings.separateScheduleCheckbox) {
            file = settings.separateFile;
            parameters = settings.separateParameters;
        }

        // Check if countdown is enabled
        if (countdown) {
            // Set the initial title with the countdown
            action.setTitle(timer.toString());
        }

        // Execute the script immediately
        // @ts-ignore
        this.executeScript(file, parameters, action, settings.terminal, settings.trueImage,
            settings.falseImage, settings.actionId, settings.separateScript);

        // Then set an interval to run it repeatedly and store the ID
        const newScheduleId = setInterval(() => {
            // Update the timer for the countdown
            timer--;
            if (countdown) {
                action.setTitle(timer.toString());
            }

            // If the timer reaches 0, reset it and execute the script
            if (timer <= 0) {
                // @ts-ignore
                this.executeScript(file, parameters, action, settings.terminal,
                    settings.trueImage, settings.falseImage, settings.actionId, settings.separateScript);
                timer = scheduleInt;
            }
        }, 1000); // The countdown updates every second

        this.scheduleMap.set(id, newScheduleId);
    }

    /**
     * Stops a running scheduled script based on its unique identifier.
     * It clears the interval, removes the entry from the schedule map, and updates the action's image.
     * @param id The unique identifier for the schedule to be stopped.
     * @param ev The Stream Deck event payload, used to access settings and action properties.
     * @param forced Forced stop for the schedule.
     * @return True if the stop was done
     */
    private stopSchedule(id: string | undefined, ev: KeyDownEvent<RunScriptSettings> | KeyUpEvent<RunScriptSettings> | DidReceiveSettingsEvent<RunScriptSettings>, forced: boolean = false): boolean {
        const settings = ev.payload.settings;
        if ((this.scheduleMap.has(id) && !settings.separateScheduleCheckbox) || forced) {
            ev.action.setTitle("");
            this.updateImageBasedOnFileExtension(settings, ev.action, false);
            clearInterval(this.scheduleMap.get(id)!);
            this.scheduleMap.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Executes the script and displays the output on the Stream Deck key.
     * @param filePath The path to the script file.
     * @param parameters The optional parameters to pass to the script.
     * @param action The action instance to set the title for.
     * @param inTerminal A boolean indicating if the script should run in a new terminal window.
     * @param trueImage Thew image shown, if the return value of a script is true
     * @param falseImage The image shown, if the return value of a script is false
     * @param id The unique identifier for the schedule
     * @param separateScript If the image changes with the return value of the separate script
     */
    private executeScript(filePath: string, parameters: string = "", action: any,
                          inTerminal: boolean = false, trueImage: string|undefined,
                          falseImage: string|undefined, id: string|undefined, separateScript: boolean = false): void {
        const command = this.getExecutionCommand(filePath, parameters, inTerminal);

        if (!command) {
            return;
        }

        exec(command, (error, stdout, stderr) => {
            if (!error) {
                const output = stdout.trim();
                const true_values: string[] = ['True', 'true', '1'];
                const false_values: string[] = ['False', 'false', '0'];
                if (true_values.includes(output) && trueImage && separateScript) {
                    this.currentImageMap.set(id, trueImage);
                    action.setImage(trueImage);
                    this.imageSetMap.set(id, true);
                } else if (false_values.includes(output) && falseImage && separateScript) {
                    this.currentImageMap.set(id, falseImage);
                    action.setImage(falseImage);
                    this.imageSetMap.set(id, true);
                } else if (!(false_values.includes(output) && falseImage) || !(true_values.includes(output) && trueImage) && separateScript) {
                    this.imageSetMap.set(id, false);
                }
            }
        });
    }

    /**
     * Determines the correct command to execute a file based on its extension and adds parameters.
     * @param filePath The path to the script file.
     * @param parameters The optional parameters to pass to the script.
     * @param inTerminal A boolean indicating if the script should run in a new terminal window.
     * @returns The full command string to be executed, or null if the file type is not supported.
     */
    private getExecutionCommand(filePath: string, parameters: string = "",
                                inTerminal: boolean = false): string | null {
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
    countdown?: boolean;
    separateFile?: string;
    separateParameters?: string;
    separateSchedule?: string;
    separateScheduleCheckbox?: boolean;
};
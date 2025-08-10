import { action, KeyDownEvent, SingletonAction, WillAppearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { exec } from "child_process";
import * as path from 'path';

@action({ UUID: "com.lukas-horst.scriptrunner.run-script" })
export class RunScript extends SingletonAction<RunScriptSettings> {
    override onWillAppear(ev: WillAppearEvent<RunScriptSettings>): void | Promise<void> {
        this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<RunScriptSettings>): Promise<void> | void {
        this.updateImageBasedOnFileExtension(ev.payload.settings, ev.action);
    }

    /**
     * Updates the action's image based on the file extension in the settings.
     * @param settings The settings object containing the file path.
     * @param action The action instance to update the image for.
     */
    private updateImageBasedOnFileExtension(settings: RunScriptSettings, action: { setImage: (image: string) => Promise<void> }): void {
        const file = settings.file;
        if (!file) {
            action.setImage("imgs/plugin/script-runner-logo.png");
            return;
        }

        if (file.endsWith(".py")) {
            action.setImage("imgs/plugin/run-python.png");
        } else if (file.endsWith(".ps1")) {
            action.setImage("imgs/plugin/run-powershell.png");
        } else {
            action.setImage("imgs/plugin/invalid.png");
        }
    }

    override async onKeyDown(ev: KeyDownEvent<RunScriptSettings>): Promise<void> {
        const { settings } = ev.payload;

        if (settings.file) {
            // Pass the action instance and terminal setting to the executeScript function
            this.executeScript(settings.file, settings.parameters, ev.action, settings.terminal);
        }
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
            console.error(`Unsupported file type for script: ${filePath}`);
            action.setTitle("Invalid file");
            return;
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing script: ${error.message}`);
                // Set the title to show the error
                action.setTitle("Error: " + stderr.substring(0, 20) + "...");
            } else {
                console.log(`Script output: ${stdout}`);
                // Set the title with the script's output
                const output = stdout.trim();
                action.setTitle(output || "Done!");
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

        // If inTerminal is true, wrap the command to run it in a new terminal window
        if (inTerminal) {
            // Get the directory of the file using the path module
            const fileDir = path.dirname(filePath);
            // Use 'cd' to change to the correct directory before executing the command
            return `start cmd.exe /k "cd /d "${fileDir}" && ${baseCommand}"`;
        }

        return baseCommand;
    }
}


type RunScriptSettings = {
    file?: string;
    parameters?: string;
    terminal?: boolean;
};
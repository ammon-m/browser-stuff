import Terminal from "./lib/Terminal.js";
import { CommandParser } from "./lib/CommandParser.js"
import Logger from "./lib/Logger.js"
import ThemeColorSet from "./lib/ThemeColorSet.js"
import Dictionary from "./lib/Dictionary.js";
import * as minifs from "./lib/minifs.js"

'use strict';

globalThis.ROOTPATH = "/browser-stuff";

/**@enum InputState */
globalThis.InputState = {
    Command: 0,
    Write: 1,
}

globalThis.global = {
    user: "user",
    device: "Conch",
    cwd: "~",
    canType: true,
    echo: true,
    theme: Object.freeze(ThemeColorSet.Default),
    stack: new Dictionary(),

    inputState: InputState.Command,

    inputListeners: Object.assign([], {
        addListener: (listener) => {
            const li = {id: _inputListenerId++, callback: listener}
            global.inputListeners.push(li)
            return li;
        },
        removeListener: (listener) => {
            const idx = global.inputListeners.findIndex(value => {
                return (Object.is(value, listener) || value.id == listener.id || value.id == listener);
            });
            if(idx != -1)
            {
                global.inputListeners.splice(idx, 1);
            }
        },
        invokeAll: (value) => {
            for(const listener of global.inputListeners)
            {
                listener.callback(value);
            }
        },
    }),

    printMotd: () => {
        terminal.WriteLine("Welcome to ");
        terminal.SetBold(true);
        terminal.Write("Conch");
        terminal.SetBold(false);
        terminal.Write(` [v${VERSION}]`);
        terminal.WriteLine(`An experimental browser-based shell\n`);
    },

    ExecuteTerminalCommand: async () => {},

    /**
     * @returns {Promise<string>}
     */
    ReadCommand: () => {
        return new Promise((resolve, reject) => {
            const listener = global.inputListeners.addListener((input) => {
                resolve(input);
                global.inputListeners.removeListener(listener);
            });
        });
    },

    Sleep: (ms) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(ms)
            }, ms )
        })
    },
}

/**
 * @param {string} string
 * @param {number} index
 * @param {string} replacement
 */
function stringReplaceShift(string, index, replacement) {
    if(index <= 0)
        return replacement + string;
    else if(index < string.length)
        return string.substring(0, index) + replacement + string.substring(index, string.length);
    else
        return string + replacement;
}

const font = "14px monospace"

let input = ""
let cursorPos = 0

let cursorBlink = false;
let cursorBlinkTicker = -1;

function BlinkCursor()
{
    cursorBlink = !cursorBlink;
    drawCanvas();
}

function ResetCursorBlink()
{
    // cursorBlink = false;
    // clearInterval(cursorBlinkTicker);
    // cursorBlinkTicker = setInterval(BlinkCursor, 500);
}

const theme = global.theme;

const contextMenuElement = document.getElementById("contextMenu");
contextMenuElement.classList.add("hidden");
contextMenuElement.style.left = "0";
contextMenuElement.style.top = "0";

const contextMenuItems = {
    cCut:   (event) => { copy(event, true, true); contextMenuClose(); },
    cCopy:  (event) => { copy(event, true); contextMenuClose(); },
    cPaste: (event) => { paste(event, true); contextMenuClose(); },
    dTest: (event) => {},
}

function contextMenuClose()
{
    consoleFocused = true;
    ctxMenuKillable = true;
    contextMenuElement.classList.add("hidden");
    drawCanvas();
}

export const fs = new minifs.FileSystem()

export const VERSION = Object.preventExtensions({
    breaking: 1,
    update: 2,
    patch: 0,
    branch: "bleeding edge",

    toString: () => {
        return `${VERSION.breaking}.${VERSION.update}.${VERSION.patch}`;
    },
})

let consoleFocused = true;
let ctxMenuKillable = true;

let _inputListenerId = 0;

/**
 * @param {string} motd
 */
async function init(motd)
{
    if(motd)
    {
        console.log(motd)
    }

    let _prefix = Object.keys(contextMenuItems)[0][0];
    for(const key of Object.keys(contextMenuItems))
    {
        const element = document.createElement("li");

        if(_prefix != key[0])
        {
            _prefix = key[0];
            contextMenuElement.appendChild(document.createElement("hr"));
        }

        element.innerText = key.slice(1);
        element.addEventListener("click", contextMenuItems[key]);

        contextMenuElement.appendChild(element);
    }

    global.echo = false;
    await receiveUserCommand("motd");
    global.echo = true;

    window.addEventListener("keydown", async event => {
        if(event.code == "Escape")
        {
            consoleFocused = false;
            ResetCursorBlink();
            drawCanvas();
            event.preventDefault();
        }

        if(!consoleFocused || !global.canType) return;

        if(event.code == "Enter")
        {
            global.canType = false;
            global.inputListeners.invokeAll(input);
            await receiveUserCommand(input);
            global.canType = true;
            global.inputState = InputState.Command;
            ResetCursorBlink();
            drawCanvas();
            event.preventDefault();
        }
        else if(event.code == "Backspace" && cursorPos >= 1)
        {
            input = input.slice(0, cursorPos - 1) + input.slice(cursorPos);
            cursorPos--;
            ResetCursorBlink();
            drawCanvas();
            tryScroll();
            event.preventDefault();
        }
        else if(event.code == "ArrowUp" && commandHistory.length > 0 && !event.shiftKey)
        {
            if(--commandHistoryPos < 0) commandHistoryPos = 0;
            input = commandHistory[commandHistoryPos];
            cursorPos = input.length;
            ResetCursorBlink();
            drawCanvas();
            tryScroll();
            event.preventDefault();
        }
        else if(event.code == "ArrowDown" && commandHistory.length > 0 && !event.shiftKey)
        {
            if(++commandHistoryPos > commandHistory.length) commandHistoryPos = commandHistory.length;
            if(commandHistoryPos == commandHistory.length)
                input = "";
            else
                input = commandHistory[commandHistoryPos];
            cursorPos = input.length;
            ResetCursorBlink();
            drawCanvas();
            tryScroll();
            event.preventDefault();
        }
        else if(event.code == "ArrowLeft" && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = 0;
            else if(cursorPos >= 1) cursorPos--;
            ResetCursorBlink();
            drawCanvas();
            tryScroll();
            event.preventDefault();
        }
        else if(event.code == "ArrowRight" && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = input.length;
            else if(cursorPos <= input.length - 1) cursorPos++;
            ResetCursorBlink();
            drawCanvas();
            tryScroll();
            event.preventDefault();
        }
        else if(event.key.length == 1 && !event.ctrlKey && !event.metaKey)
        {
            input = stringReplaceShift(input, cursorPos, event.key);
            cursorPos++;
            commandHistoryPos = commandHistory.length;
            ResetCursorBlink();
            drawCanvas();
            tryScroll();
            event.preventDefault();
        }
    });

    window.addEventListener("cut", (event) => copy(event, false, true), false);
    window.addEventListener("copy", copy, false);
    window.addEventListener("paste", paste, false);

    let scroll = 0;
    let unfocusable = false;

    window.addEventListener("wheel", event => {
        if(unfocusable) return;

        scroll += event.deltaY / 60;
        const val = Math.round(scroll);
        scroll -= val;

        terminal.Scroll(val);
    });

    mainElement.addEventListener("mouseleave", event => {
        unfocusable = true;
    });

    mainElement.addEventListener("mouseenter", event => {
        unfocusable = false;
    });

    contextMenuElement.addEventListener("mouseleave", event => {
        ctxMenuKillable = true;
    });

    contextMenuElement.addEventListener("mouseenter", event => {
        ctxMenuKillable = false;
    });

    mainElement.addEventListener("contextmenu", event => {
        contextMenuElement.style.left = event.clientX + "px";
        contextMenuElement.style.top = event.clientY - lineHeight + "px";
        contextMenuElement.classList.remove("hidden");
        consoleFocused = false;
        unfocusable = false;
        drawCanvas();
        event.preventDefault();
    }, false)

    window.addEventListener("mousedown", event => {
        if(!(consoleFocused ^ unfocusable))
        {
            consoleFocused = !unfocusable;
            drawCanvas();
            event.preventDefault();
        }
        if(ctxMenuKillable) contextMenuElement.classList.add("hidden");
    });
}

function tryScroll()
{
    let y = terminal.GetEndPosition().y
    if(y - terminal._scroll > maxRows)
        terminal.ScrollTo(y + 3/lineHeight - maxRows)
}

async function paste(event, manual = false)
{
    if(!consoleFocused && !manual) return;

    let str = "";
    if(manual)
    {
        str = await navigator.clipboard.readText();
    }
    else
    {
        str = event.clipboardData.getData("text/plain");
        event.preventDefault();
    }

    input = stringReplaceShift(input, cursorPos, str);
    cursorPos += str.length;
    commandHistoryPos = commandHistory.length;
    ResetCursorBlink();
    tryScroll();
    drawCanvas();
}

async function copy(event, manual = false, cut = false)
{
    if((!consoleFocused && !manual) || input.length == 0) return;

    if(manual)
    {
        await navigator.clipboard.writeText(input);
    }
    else
    {
        event.clipboardData.setData("text/plain", input);
        event.preventDefault();
    }

    if(cut)
    {
        input = "";
        cursorPos = 0;
        commandHistoryPos = commandHistory.length;
        ResetCursorBlink();
        drawCanvas();
    }
}

/**
 * @param {string} value
 */
async function receiveUserCommand(value)
{
    if(value === null || value === undefined) return;

    if(global.echo)
    {
        switch(global.inputState)
        {
            case InputState.Command:
                terminal.SetColor(global.theme.user)
                terminal.WriteLine(global.user + "@" + global.device)

                terminal.SetColor(global.theme.foreground)
                terminal.Write(":")

                terminal.SetColor(global.theme.path)
                terminal.Write(global.cwd)

                terminal.SetColor(global.theme.foreground)
                terminal.Write("$ ")
                break;
            case InputState.Write:
                terminal.SetColor(global.theme.foreground)
                terminal.WriteLine("> ")
                break;
        }

        terminal.Write(value);

        commandHistory.push(value);
    }
    commandHistoryPos = commandHistory.length;

    if(value == "") return;

    input = ""
    cursorPos = 0

    const parser = new CommandParser()
    let commands = null

    if(global.inputState == InputState.Command)
    {
        try
        {
            commands = parser.parse(value)
        }
        catch(error)
        {
            logger.error(error);
        }
    }

    let y = terminal.GetEndPosition().y

    if(commands == null)
    {
        if(y - terminal._scroll > maxRows)
            terminal.ScrollTo(y + 3/lineHeight - maxRows)
        return;
    }

    try
    {
        for(const command of commands)
            await command.execute()
    }
    catch(error)
    {
        error.name = "CommandExecutionError: " + error.name
        logger.error(error)
    }

    y = terminal.GetEndPosition().y
    if(y - terminal._scroll > maxRows)
        terminal.ScrollTo(y + 3/lineHeight - maxRows)
}
global.ExecuteTerminalCommand = receiveUserCommand;

/**@type {string[]}*/
const commandHistory = []
let commandHistoryPos = 0

const logger = new Logger((entries) => {
    renderOutput(entries)
})

globalThis.logger = logger;

/**@type {CanvasRenderingContext2D} */
const textCtx = document.getElementById("text").getContext("2d")
/**@type {CanvasRenderingContext2D} */
const cursorCtx = document.getElementById("selection").getContext("2d")

const mainElement = document.getElementById("main")

textCtx.canvas.width = Math.floor(mainElement.clientWidth / 2) * 2;
textCtx.canvas.height = Math.floor(mainElement.clientHeight / 2) * 2;
cursorCtx.canvas.width = Math.floor(mainElement.clientWidth / 2) * 2;
cursorCtx.canvas.height = Math.floor(mainElement.clientHeight / 2) * 2;

textCtx.font = font;
cursorCtx.font = font;

const charWidth = textCtx.measureText("0").width + Number(textCtx.letterSpacing.replace("px", ""));
const lineHeight = 16

const maxColumns = Math.floor(textCtx.canvas.width / charWidth)
const maxRows = Math.floor(textCtx.canvas.height / lineHeight)

const xPadding = 2;

const terminal = new Terminal(textCtx);
terminal.SetCharWidth(charWidth);
terminal.SetLineHeight(lineHeight);
terminal.SetMaxColumns(maxColumns);
terminal.SetMaxRows(maxRows);
terminal.SetXPadding(xPadding);
terminal.onRedraw = () => {
    drawCanvas()
};
globalThis.terminal = terminal;

function renderOutput(entries)
{
    if(!entries)
    {
        terminal.Clear()
        return;
    }

    for(var i = 0; i < entries.length; i++)
    {
        const ln = entries[i]

        terminal.SetColor(global.theme.foreground)
        if(ln.type == "Warning") terminal.SetColor(global.theme.warning)
        if(ln.type == "Error") terminal.SetColor(global.theme.error)

        terminal.WriteLine(ln.message)
    }
}

function drawCanvas()
{
    cursorCtx.clearRect(0, 0, cursorCtx.canvas.width, cursorCtx.canvas.height)
    cursorCtx.font = font;

    const end = terminal.GetEndPosition()
    let x = 0
    let y = end.y - terminal._scroll

    let len

    switch(global.inputState)
    {
        case InputState.Write:
            len = 2
            cursorCtx.fillStyle = theme.foreground;
            cursorCtx.fillText("> ", x * charWidth + xPadding, y * lineHeight);
            x += 2

            break;
        case InputState.Command: default:
            len = (global.user + "@" + global.device + ":" + global.cwd + "$ ").length

            cursorCtx.fillStyle = theme.user;
            cursorCtx.fillText(global.user + "@" + global.device, x * charWidth + xPadding, y * lineHeight);
            x += (global.user + "@" + global.device).length

            cursorCtx.fillStyle = theme.foreground;
            cursorCtx.fillText(":", x * charWidth + xPadding, y * lineHeight);
            x++

            cursorCtx.fillStyle = theme.path;
            cursorCtx.fillText(global.cwd, x * charWidth + xPadding, y * lineHeight);
            x += global.cwd.length

            cursorCtx.fillStyle = theme.foreground;
            cursorCtx.fillText("$ ", x * charWidth + xPadding, y * lineHeight);
            x += 2

            break;
    }

    cursorCtx.fillStyle = theme.foreground;
    cursorCtx.fillText(input, x * charWidth + xPadding, y * lineHeight);

    if(!cursorBlink)
    {
        cursorCtx.fillStyle = theme.foreground
        if(consoleFocused)
        {
            cursorCtx.fillRect((len + cursorPos) * charWidth + xPadding, (y - 1) * lineHeight + 3, charWidth, lineHeight)

            cursorCtx.fillStyle = theme.background
            cursorCtx.fillText(input[cursorPos] ? input[cursorPos] : " ", (len + cursorPos) * charWidth + xPadding, y * lineHeight)
        }
        else
        {
            cursorCtx.strokeStyle = theme.foreground;
            cursorCtx.lineWidth = 1;
            cursorCtx.strokeRect((len + cursorPos) * charWidth + xPadding + 0.5, (y - 1) * lineHeight + 3 + 0.5, charWidth - 1, lineHeight - 1);
        }
    }

    cursorCtx.fillStyle = theme.background
    cursorCtx.fillRect(cursorCtx.canvas.width - charWidth, 0, charWidth, cursorCtx.canvas.height)

    const totalLines = terminal._rawText.split("\n").length;

    cursorCtx.fillStyle = theme.foreground
    cursorCtx.fillRect(
        cursorCtx.canvas.width - charWidth,
        (Math.floor(terminal._scroll) / (totalLines + maxRows)) * cursorCtx.canvas.height,
        charWidth,
        (maxRows / (totalLines + maxRows)) * cursorCtx.canvas.height
    )
}

init("hello world")

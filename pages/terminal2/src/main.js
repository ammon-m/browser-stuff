import Terminal from "./lib/CanvasRenderer.js";
import { CommandParser } from "./lib/CommandParser.js"
import Logger from "./lib/Logger.js"
import ThemeColorSet from "./lib/ThemeColorSet.js"
import Dictionary from "./lib/Dictionary.js";
import * as minifs from "./lib/minifs.js"

'use strict';

globalThis.global = {
    user: "user",
    device: "Conch",
    cwd: "~",
    canType: true,
    echo: true,
    theme: Object.freeze(ThemeColorSet.Default),
    stack: new Dictionary(),

    printMotd: () => {
        terminal.WriteLine("Welcome to ");
        terminal.SetBold(true);
        terminal.Write("Conch");
        terminal.SetBold(false);
        terminal.Write(` [v${VERSION}]`);
        terminal.WriteLine(`An experimental browser-based shell\n`);
    }
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

/**
 * @param {string} motd
 */
function init(motd)
{
    if(motd)
    {
        console.log(motd)
    }

    global.echo = false;
    receiveUserCommand("motd")
    global.echo = true;

    window.addEventListener("keydown", event => {
        if(!global.canType) return;

        if(event.code == "Escape")
        {
            consoleFocused = false;
            ResetCursorBlink();
            drawCanvas();
            event.preventDefault();
        }

        if(!consoleFocused) return;

        if(event.code == "Enter")
        {
            receiveUserCommand(input);
            ResetCursorBlink();
            event.preventDefault();
        }
        else if(event.code == "Backspace" && cursorPos >= 1)
        {
            input = input.slice(0, cursorPos - 1) + input.slice(cursorPos);
            cursorPos--;
            ResetCursorBlink();
            drawCanvas();
            event.preventDefault();
        }
        else if(event.code == "ArrowUp" && commandHistory.length > 0 && !event.shiftKey)
        {
            if(--commandHistoryPos < 0) commandHistoryPos = 0;
            input = commandHistory[commandHistoryPos];
            cursorPos = input.length;
            ResetCursorBlink();
            drawCanvas();
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
            event.preventDefault();
        }
        else if(event.code == "ArrowLeft" && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = 0;
            else if(cursorPos >= 1) cursorPos--;
            ResetCursorBlink();
            drawCanvas();
            event.preventDefault();
        }
        else if(event.code == "ArrowRight" && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = input.length;
            else if(cursorPos <= input.length - 1) cursorPos++;
            ResetCursorBlink();
            drawCanvas();
            event.preventDefault();
        }
        else if(event.key.length == 1 && !event.ctrlKey && !event.metaKey)
        {
            input = stringReplaceShift(input, cursorPos, event.key);
            cursorPos++;
            commandHistoryPos = commandHistory.length;
            ResetCursorBlink();
            drawCanvas();
            event.preventDefault();
        }
    });

    window.addEventListener("paste", event => {
        if(!consoleFocused) return;

        let str = event.clipboardData.getData("text/plain");

        input = stringReplaceShift(input, cursorPos, str);
        cursorPos += str.length;
        commandHistoryPos = commandHistory.length;
        ResetCursorBlink();
        drawCanvas();
        event.preventDefault();
    }, false);

    let scroll = 0;

    window.addEventListener("wheel", event => {
        scroll += event.deltaY / 60;
        const val = Math.round(scroll);
        scroll -= val;

        terminal.Scroll(val);
    });

    let unfocusable = false;

    mainElement.addEventListener("mouseleave", event => {
        unfocusable = true;
    });

    mainElement.addEventListener("mouseenter", event => {
        unfocusable = false;
    });

    window.addEventListener("mousedown", event => {
        if((consoleFocused && unfocusable) || (!consoleFocused && !unfocusable))
        {
            consoleFocused = !unfocusable;
            drawCanvas();
            event.preventDefault();
        }
    });
}

/**
 * @param {string} value
 */
function receiveUserCommand(value)
{
    if(!value) return;

    if(global.echo)
    {
        terminal.SetColor(global.theme.user)
        terminal.WriteLine(global.user + "@" + global.device)

        terminal.SetColor(global.theme.foreground)
        terminal.Write(":")

        terminal.SetColor(global.theme.path)
        terminal.Write(global.cwd)

        terminal.SetColor(global.theme.foreground)
        terminal.Write("$ ")

        terminal.Write(value)
    }

    commandHistoryPos = commandHistory.length

    if(value == "") return;

    commandHistory.push(value)
    commandHistoryPos = commandHistory.length

    console.log("[Conch] " + value)

    input = ""
    cursorPos = 0

    const parser = new CommandParser()
    let commands = null

    try
    {
        commands = parser.parse(value)
    }
    catch(error)
    {
        logger.error(error)

        error.name = "[Conch] " + error.name
        console.error(error)
        return;
    }
    if(commands == null) return;

    try
    {
        for(const command of commands)
            command.execute()
    }
    catch(error)
    {
        error.name = "CommandExecutionError"
        logger.error(error)

        error.name = "[Conch] " + error.name
        console.error(error)
    }

    let y = terminal.GetEndPosition().y
    terminal.ScrollTo(y + 3/lineHeight - maxRows)
}

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

    let len = (global.user + "@" + global.device + ":" + global.cwd + "$ ").length

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
        (terminal._scroll / (totalLines + maxRows + 2)) * cursorCtx.canvas.height,
        charWidth,
        ((maxRows + 3/lineHeight) / (totalLines + maxRows - 1)) * cursorCtx.canvas.height
    )
}

init("hello world")

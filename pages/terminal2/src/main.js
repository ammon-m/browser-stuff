import Terminal from "./lib/CanvasRenderer.js";
import { CommandParser } from "./lib/CommandParser.js"
import Logger from "./lib/Logger.js"
import ThemeColorSet from "./lib/ThemeColorSet.js"
import * as minifs from "./lib/minifs.js"

'use strict';

globalThis.global = {
    user: "user",
    device: "vm",
    cwd: "~",
    canType: true,
    theme: Object.freeze(ThemeColorSet.Default),

    stack: {},
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

const output = {
    value: ""
}

let input = ""
let cursorPos = 0

let pastingAll = false;

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

/**
 * @param {string} motd
 */
function init(motd)
{
    if(motd)
    {
        console.log(motd)
    }

    terminal.WriteLine("Welcome to ")
    terminal.SetBold(true)
    terminal.Write("Conch")
    terminal.SetBold(false)
    terminal.Write(` [v${VERSION}]\nAn experimental browser-based shell\n`)

    window.addEventListener("keydown", event => {
        if(!global.canType) return;

        if(event.code == "Enter")
        {
            receiveUserCommand(input)
            event.preventDefault()
        }
        else if(event.code == "Backspace" && cursorPos >= 1)
        {
            input = input.slice(0, cursorPos - 1) + input.slice(cursorPos)
            cursorPos--
            drawCanvas();
            event.preventDefault()
        }
        else if(event.code == "ArrowUp" && commandHistory.length > 0 && !event.shiftKey)
        {
            if(--commandHistoryPos < 0) commandHistoryPos = 0
            input = commandHistory[commandHistoryPos]
            cursorPos = input.length
            drawCanvas();
            event.preventDefault()
        }
        else if(event.code == "ArrowDown" && commandHistory.length > 0 && !event.shiftKey)
        {
            if(++commandHistoryPos > commandHistory.length) commandHistoryPos = commandHistory.length
            if(commandHistoryPos == commandHistory.length)
                input = ""
            else
                input = commandHistory[commandHistoryPos]
            cursorPos = input.length
            drawCanvas();
            event.preventDefault()
        }
        else if(event.code == "ArrowLeft" && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = 0
            else if(cursorPos >= 1) cursorPos--
            drawCanvas();
        }
        else if(event.code == "ArrowRight" && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = input.length
            else if(cursorPos <= input.length - 1) cursorPos++
            drawCanvas();
        }
        else if(event.key.match(/[\w,\.\{\}\[\]\|=\-_!~\^\*@\"'`#\$%&\/\\ ]/) && event.key.length == 1 && !event.ctrlKey && !event.metaKey)
        {
            input = stringReplaceShift(input, cursorPos, event.key)
            cursorPos++;
            commandHistoryPos = commandHistory.length
            drawCanvas();
            event.preventDefault()
        }
        else if(event.code == "KeyV" && event.ctrlKey && event.shiftKey)
        {
            pastingAll = true;
        }
    })

    window.addEventListener("paste", event => {
        let str = event.clipboardData.getData("text/plain");

        if(!pastingAll)
        {
            str = str.replaceAll(/[^\w,\.\{\}\[\]\|=\-_!~\^\*@\"'`#\$%&\/\\ ]/g, "")
        }

        input = stringReplaceShift(input, cursorPos, str)
        cursorPos += str.length
        commandHistoryPos = commandHistory.length
        drawCanvas();

        pastingAll = false;
        event.preventDefault();
    }, false)

    let scroll = 0

    window.addEventListener("wheel", event => {
        scroll += event.deltaY / 60;
        const val = Math.round(scroll);
        scroll -= val;

        terminal.Scroll(val);
    });
}

/**
 * @param {string} value
 */
function receiveUserCommand(value)
{
    if(!value) return;

    commandHistory.push(value)
    commandHistoryPos = commandHistory.length

    terminal.SetColor(global.theme.user)
    terminal.WriteLine(global.user + "@" + global.device)

    terminal.SetColor(global.theme.foreground)
    terminal.Write(":")

    terminal.SetColor(global.theme.path)
    terminal.Write(global.cwd)

    terminal.SetColor(global.theme.foreground)
    terminal.Write("$ ")

    terminal.Write(value)

    if(value == "") return;

    console.log("[Conch] " + value)

    input = ""
    cursorPos = 0

    const parser = new CommandParser()
    let command = null

    try
    {
        command = parser.parse(value)
    }
    catch(error)
    {
        logger.error(error)

        error.name = "[Conch] " + error.name
        console.error(error)
        return;
    }
    if(command == null) return;

    try
    {
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

const terminal = new Terminal(textCtx)
terminal.SetCharWidth(charWidth)
terminal.SetLineHeight(lineHeight)
terminal.SetMaxColumns(maxColumns)
terminal.SetMaxRows(maxRows)
terminal.SetXPadding(xPadding)
terminal.onRedraw = () => {
    drawCanvas()
}

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

    cursorCtx.fillStyle = theme.foreground
    cursorCtx.fillRect((len + cursorPos) * charWidth + xPadding, (y - 1) * lineHeight + 3, charWidth, lineHeight)

    cursorCtx.fillStyle = theme.background
    cursorCtx.fillText(input[cursorPos] ? input[cursorPos] : " ", (len + cursorPos) * charWidth + xPadding, y * lineHeight)

    cursorCtx.fillRect(cursorCtx.canvas.width - charWidth, 0, charWidth, cursorCtx.canvas.height)

    const totalLines = terminal._rawText.split("\n").length;

    cursorCtx.fillStyle = theme.foreground
    cursorCtx.fillRect(cursorCtx.canvas.width - charWidth, (Math.max(0, terminal._scroll - totalLines + 1) / (totalLines + 2)) * cursorCtx.canvas.height, charWidth, ((maxRows + 3/lineHeight) / (totalLines + 2) + 3/lineHeight) * cursorCtx.canvas.height)
}

init("hello world")

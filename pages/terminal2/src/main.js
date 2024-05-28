import Terminal from "./lib/CanvasRenderer.js";
import { CommandParser } from "./lib/CommandParser.js"
import Logger from "./lib/Logger.js"
import ThemeColorSet from "./lib/ThemeColorSet.js"
import * as minifs from "./lib/minifs.js"

'use strict';

globalThis.global = {
    user: "user",
    device: "terminal2",
    cwd: "~",
    canType: true,
    theme: ThemeColorSet.Default,
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

/**
 * @param {string} motd
 */
function init(motd)
{
    if(motd) console.log(motd)

    window.addEventListener("keydown", event => {
        if(!global.canType) return;

        if(event.code == "Enter")
        {
            cursorPos = 0
            receiveUserCommand(input)
            event.preventDefault()
        }
        else if(event.code == "Backspace" && cursorPos >= 1)
        {
            input = input.slice(0, cursorPos - 1) + input.slice(cursorPos)
            cursorPos--
            event.preventDefault()
        }
        else if(event.code == "ArrowUp" && commandHistory.length > 0 && !event.shiftKey)
        {
            if(--commandHistoryPos < 0) commandHistoryPos = 0
            input = commandHistory[commandHistoryPos]
            cursorPos = input.length
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
            event.preventDefault()
        }
        else if(event.code == "ArrowLeft" && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = 0
            else if(cursorPos >= 1) cursorPos--
        }
        else if(event.code == "ArrowRight" && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = input.length
            else if(cursorPos <= input.length - 1) cursorPos++
        }
        else if(event.key.match(/[\w,\.\{\}\[\]\|=\-_!~\^\*@\"'`#\$%&\/\\ ]/) && event.key.length == 1 && !event.ctrlKey && !event.metaKey)
        {
            input = stringReplaceShift(input, cursorPos, event.key)
            cursorPos++;
            commandHistoryPos = commandHistory.length
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

        pastingAll = false;
        event.preventDefault();
    }, false)
}

/**
 * @param {string} value
 */
function receiveUserCommand(value)
{
    if(!value || value == "") return;

    commandHistory.push(value)
    commandHistoryPos = commandHistory.length
    logger.log("> " + value)

    console.log(value)

    input = ""

    const parser = new CommandParser()
    let command = null

    try
    {
        command = parser.parse(value)
    }
    catch(error)
    {
        logger.error(error)
        return;
    }
    if(command == null) return;

    command.execute()
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
terminal.SetXPadding(xPadding)

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

        if(ln.type == "Warning") terminal.SetColor("#eaab3d")
        if(ln.type == "Error") terminal.SetColor("#f62d33")

        terminal.WriteLine(ln.message)
    }
}

function drawCanvas()
{
    cursorCtx.clearRect(0, 0, cursorCtx.canvas.width, cursorCtx.canvas.height)
    cursorCtx.font = font;

    const end = terminal.GetEndPosition()
    let x = 0
    let y = end.y + 1

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
    cursorCtx.fillRect((len + cursorPos) * charWidth + xPadding, end.y * lineHeight + 3, charWidth, lineHeight)

    cursorCtx.fillStyle = theme.background
    cursorCtx.fillText(input[cursorPos] ? input[cursorPos] : " ", (len + cursorPos) * charWidth + xPadding, end.y * lineHeight)
}

init("hello world")

setInterval(drawCanvas, 1000 / 60)

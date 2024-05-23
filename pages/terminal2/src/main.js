import { CommandParser } from "./lib/CommandParser.js"
import Logger from "./lib/Logger.js"
import ThemeColorSet from "./lib/ThemeColorSet.js"
import * as minifs from "./lib/minifs.js"

window.addEventListener("DOMContentLoaded", event => {
    init("hello world")
})

function stringReplaceShift(string, index, replacement) {
    if(index < string.length)
        return string.substring(0, index) + replacement + string.substring(index, string.length - replacement.length);
    else
        return string + replacement
}

const output = {
    value: ""
}

let input = ""
let cursorPos = 0

let pastingAll = false;

globalThis.global = {
    user: "user",
    device: "terminal2",
    cwd: "~",
    theme: ThemeColorSet.Default
}

export const fs = new minifs.FileSystem()

/**
 * @param {string} motd
 */
function init(motd)
{
    if(motd) console.log(motd)

    drawCanvas()

    window.addEventListener("keydown", event => {
        if(event.code == "Enter")
        {
            cursorPos = 0
            receiveUserCommand(input)
            event.preventDefault()
        }
        else if(event.code == "Backspace")
        {
            input = input.slice(0, cursorPos - 1) + input.slice(cursorPos)
            cursorPos--
            event.preventDefault()

            drawCanvas()
        }
        else if(event.code == "ArrowUp" && commandHistory.length > 0 && !event.shiftKey)
        {
            if(--commandHistoryPos < 0) commandHistoryPos = 0
            input = commandHistory[commandHistoryPos]
            cursorPos = input.length
            event.preventDefault()

            drawCanvas()
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

            drawCanvas()
        }
        else if(event.code == "ArrowLeft" && cursorPos > 0 && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = 0
            else cursorPos--

            drawCanvas()
        }
        else if(event.code == "ArrowRight" && cursorPos < input.length && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = input.length
            else cursorPos++

            drawCanvas()
        }
        else if(event.key.match(/[\w,\.\{\}\[\]\|=\-_!~\^\*@\"'`#\$%&\/\\ ]/) && event.key.length == 1 && !event.ctrlKey && !event.metaKey)
        {
            input = stringReplaceShift(input, cursorPos, event.key)
            cursorPos++;
            commandHistoryPos = commandHistory.length
            event.preventDefault()

            drawCanvas()
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

        drawCanvas()
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

    drawCanvas()
}

/**@type {string[]}*/
const commandHistory = []
let commandHistoryPos = 0

const logger = new Logger((entries) => {
    renderOutput(entries)
})

globalThis.logger = logger;

function renderOutput(entries)
{
    if(!entries) { output.value = ""; return; }

    let str = ""
    for(var i = 0; i < entries.length; i++)
    {
        const ln = entries[i]

        let type = ""
        if(ln.type == "Warning") type = " warn"
        if(ln.type == "Error") type = " error"

        let shift = ""
        if(ln.message.startsWith("> ")) shift = ` style="margin-left: -2ch;"`

        let txt = ln.message

        str += `<span class="line${type}"${shift}>${txt}</span>`
    }
    output.value = str

    drawCanvas()
}

const mainElement = document.getElementById("main");

const font = "14px monospace"

/**@type {HTMLCanvasElement} */
const textCanvas = document.getElementById("text")
const textCtx = textCanvas.getContext("2d")
textCtx.canvas.width = mainElement.clientWidth;
textCtx.canvas.height = mainElement.clientHeight;

/**@type {HTMLCanvasElement} */
const cursorCanvas = document.getElementById("selection")
const cursorCtx = cursorCanvas.getContext("2d")
cursorCtx.canvas.width = mainElement.clientWidth;
cursorCtx.canvas.height = mainElement.clientHeight;

textCtx.font = font;
cursorCtx.font = font;

const charWidth = textCtx.measureText("0").width + textCtx.letterSpacing;
const lineHeight = 15

const maxColumns = Math.floor(textCanvas.width / charWidth)
const maxRows = Math.floor(textCanvas.height / charWidth)

function drawCanvas()
{
    //#region text

    textCtx.fillStyle = global.theme.background;
    textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);

    textCtx.fillStyle = global.theme.foreground;
    textCtx.font = font;

    let str = global.user + "@" + global.device + ":" + global.path + "$ "
    let x = 5
    let y = 5

    textCtx.fillStyle = global.theme.user;
    textCtx.fillText(global.user + "@" + global.device, x * charWidth, y * lineHeight);
    x += (global.user + "@" + global.device).length

    textCtx.fillStyle = global.theme.foreground;
    textCtx.fillText(":", x * charWidth, y * lineHeight);
    x++

    textCtx.fillStyle = global.theme.path;
    textCtx.fillText(global.cwd, x * charWidth, y * lineHeight);
    x += global.cwd.length

    textCtx.fillStyle = global.theme.foreground;
    textCtx.fillText("$ ", x * charWidth, y * lineHeight);
    x += 2

    textCtx.fillStyle = global.theme.foreground;
    textCtx.fillText(input, x * charWidth, y * lineHeight, (maxColumns - str.length) * charWidth);

    //#endregion

    //#region cursor

    cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height)
    cursorCtx.font = font;

    cursorCtx.fillStyle = global.theme.foreground
    cursorCtx.fillRect(cursorPos * charWidth, y * lineHeight, charWidth, lineHeight)

    cursorCtx.fillStyle = global.theme.background
    cursorCtx.fillText(input[cursorPos] ? input[cursorPos] : " ", cursorPos * charWidth, y * lineHeight)

    //#endregion
}

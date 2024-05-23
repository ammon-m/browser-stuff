import { CommandParser } from "./lib/CommandParser.js"
import Logger from "./lib/Logger.js"
import ThemeColorSet from "./lib/ThemeColorSet.js"
import * as minifs from "./lib/minifs.js"

'use strict';

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

globalThis.global = {
    user: "user",
    device: "terminal2",
    cwd: "~"
}

const theme = ThemeColorSet.Default

export const fs = new minifs.FileSystem()

/**
 * @param {string} motd
 */
function init(motd)
{
    if(motd) console.log(motd)

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
        else if(event.code == "ArrowLeft" && cursorPos > 0 && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = 0
            else cursorPos--
        }
        else if(event.code == "ArrowRight" && cursorPos < input.length && !event.shiftKey)
        {
            if(event.ctrlKey) cursorPos = input.length
            else cursorPos++
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
}

/**@type {CanvasRenderingContext2D} */
const textCtx = document.getElementById("text").getContext("2d")
// /**@type {CanvasRenderingContext2D} */
// const cursorCtx = document.getElementById("selection").getContext("2d")

const mainElement = document.getElementById("main")

textCtx.canvas.width = mainElement.clientWidth;
textCtx.canvas.height = mainElement.clientHeight;
// cursorCtx.canvas.width = mainElement.clientWidth;
// cursorCtx.canvas.height = mainElement.clientHeight;

textCtx.font = font;
// cursorCtx.font = font;

const charWidth = textCtx.measureText("0").width + textCtx.letterSpacing;
const lineHeight = 14

const maxColumns = Math.floor(textCtx.canvas.width / charWidth)
const maxRows = Math.floor(textCtx.canvas.height / lineHeight)

function drawCanvas()
{
    textCtx.fillStyle = theme.background;
    textCtx.fillRect(0, 0, textCtx.canvas.width, textCtx.canvas.height);

    textCtx.fillStyle = theme.foreground;
    textCtx.font = font;

    let str = global.user + "@" + global.device + ":" + global.cwd + "$ "
    let x = 1
    let y = 1

    textCtx.fillStyle = theme.foreground;
    textCtx.fillText(global.user + "@" + global.device, x * charWidth, y * lineHeight);
    x += (global.user + "@" + global.device).length

    textCtx.fillStyle = theme.foreground;
    textCtx.fillText(":", x * charWidth, y * lineHeight);
    x++

    textCtx.fillStyle = theme.foreground;
    textCtx.fillText(global.cwd, x * charWidth, y * lineHeight);
    x += global.cwd.length

    textCtx.fillStyle = theme.foreground;
    textCtx.fillText("$ ", x * charWidth, y * lineHeight);
    x += 2

    textCtx.fillStyle = theme.foreground;
    textCtx.fillText(input, x * charWidth, y * lineHeight);


    // cursorCtx.clearRect(0, 0, cursorCtx.canvas.width, cursorCtx.canvas.height)
    // cursorCtx.font = font;

    // cursorCtx.fillStyle = theme.foreground
    // cursorCtx.fillRect(cursorPos * charWidth, y * lineHeight, charWidth, lineHeight)

    // cursorCtx.fillStyle = theme.background
    // cursorCtx.fillText(input[cursorPos] ? input[cursorPos] : " ", cursorPos * charWidth, y * lineHeight)
}

init("hello world")

setInterval(drawCanvas, 1000 / 60)

// goguardian stinking up the shit
// window.removeEventListener("haldlgldplgnggkjaafhelgiaglafanh0.8198154280017336")

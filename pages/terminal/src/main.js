import { CommandParser } from "./lib/CommandParser.js"
import Logger from "./lib/Logger.js"
import * as minifs from "./lib/minifs.js"

window.addEventListener("DOMContentLoaded", event => {
    init("hello world")
})

const output = document.getElementById("output")
/**@type {HTMLInputElement}*/
const input = document.getElementById("input")

/**
 * @param {string} motd
 */
function init(motd)
{
    if(motd) console.log(motd)

    // input.setAttribute("pattern", "[\\w,\\.\\{\\}\\[\\]=\\-_!~^*@\"'`#$%&\\/\\\\ ]+")
    // basically any ascii character except newlines

    input.addEventListener("input", event => {
        commandHistoryPos = commandHistory.length
    })

    window.addEventListener("keydown", event => {
        if(event.key == "Enter")
        {
            receiveUserCommand(input.value)
            event.preventDefault()
        }
        else if(document.activeElement.id == input.id)
        {
            if(event.key == "Escape")
            {
                document.activeElement.blur()
                event.preventDefault()
            }
            if(event.key == "ArrowUp" && commandHistory.length && !event.shiftKey)
            {
                if(--commandHistoryPos < 0) commandHistoryPos = 0
                input.value = commandHistory[commandHistoryPos]
                event.preventDefault()
            }
            if(event.key == "ArrowDown" && commandHistory.length && !event.shiftKey)
            {
                if(++commandHistoryPos > commandHistory.length) commandHistoryPos = commandHistory.length
                if(commandHistoryPos == commandHistory.length)
                    input.value = ""
                else
                    input.value = commandHistory[commandHistoryPos]
                event.preventDefault()
            }
        }
        else
        {
            if(event.key.match(/[\w,\.\{\}\[\]\|=\-_!~\^\*@\"'`#\$%&\/\\ ]/) && event.key.length == 1 && !event.ctrlKey && !event.metaKey)
            {
                input.focus()
                input.value += event.key
                event.preventDefault()
            }
        }
    })
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

    input.value = ""

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

export const logger = new Logger((entries) => {
    renderOutput(entries)
})

function renderOutput(entries)
{
    if(!entries) { output.innerHTML = ""; return; }

    var str = ""
    for(var i = 0; i < entries.length; i++)
    {
        const ln = entries[i]

        let type = ""
        if(ln.type == "Warning") type = " warn"
        if(ln.type == "Error") type = " error"

        let shift = ""
        if(ln.message.startsWith("> ")) shift = ` style="margin-left: -2ch;"`

        let txt = ln.message
        if(ln.message.startsWith("> "))
            txt = txt.replaceAll("<", "&lt;")

        str += `<span class="line${type}"${shift}>${txt}</span>`
    }
    output.innerHTML = str
    output.scrollTop = output.scrollHeight
}

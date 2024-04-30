import { CommandParser } from "./lib/CommandParser.js"
import * as parser from "./lib/CommandParser.js"
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
            if(event.key == "ArrowUp")
            {
                if(--commandHistoryPos < 0) commandHistoryPos = 0
                input.value = commandHistory[commandHistoryPos]
                event.preventDefault()
            }
            if(event.key == "ArrowDown")
            {
                if(++commandHistoryPos > commandHistory.length) commandHistoryPos = commandHistory.length
                if(commandHistoryPos == commandHistory.length)
                    input.value = ""
                else
                    input.value = commandHistory[commandHistoryPos]
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

    log.submit(value)
    commandHistory.push(value)
    commandHistoryPos = commandHistory.length

    input.value = ""

    renderOutput()

    const parser = new CommandParser()
    let command = null

    try
    {
        command = parser.parse(value)
    }
    catch(error)
    {
        console.log(error)
        log.submit(error)
        return;
    }
    if(command == null) return;

    // yay command !!!
}

/**@type {string[]}*/
const commandHistory = []
let commandHistoryPos = 0

/**@type {string[]}*/
export const log = []
log.submit = function(...items) {
    let out = this.push(items.map(value => {
        if(value.toString)
            return value.toString()
        return String(value)
    }))
    renderOutput()
    return out
}

function renderOutput()
{
    var str = ""
    for(var i = 0; i < log.length; i++)
    {
        str += `<span class="line">${log[i]}</span>`
    }
    output.innerHTML = str
    output.scrollTop = output.scrollHeight
}

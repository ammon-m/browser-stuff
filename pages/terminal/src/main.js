import * as parser from "./lib/CommandParser.js"
import * as minifs from "./lib/minifs.js"

window.addEventListener("DOMContentLoaded", event => {
    init("hello world")
})

/**@type {string[]}*/
let logLines = []

const container = document.getElementById("container")
const output = document.getElementById("output")
const input = document.getElementById("input")

/**
 * @param {string} motd 
 */
function init(motd)
{
    if(motd) console.log(motd)

    input.setAttribute("pattern", "[\\w,\\.\\{\\}\\[\\]=-_!~^*@\"'`#$%&/\\\\ ]+")
    // basically any ascii character except newlines

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
        }
    })
}

/**
 * @param {string} value 
 */
function receiveUserCommand(value)
{
    commandHistory.push(value)
    commandHistoryPos = commandHistory.length

    // CommandParser.CommandParserResult.Success

    let result = parser.CommandParser.parse()
}

/**@type {string[]}*/
const commandHistory = []
let commandHistoryPos = 0

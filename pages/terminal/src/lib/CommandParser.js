import { logger } from "../main.js";

const tokenTypes = Object.freeze({
    opCurly: /\{/,
    clCurly: /\}/,
    opSquare: /\[/,
    clSquare: /\]/,
    comma: /\,/,
    dot: /\./,
    number: /\d+(?:\.\d+)?/,
    string: /(?:".*"|'.*')/,
    literal: /[a-zA-Z_][a-zA-Z_0-9]*/,
    boolean: /true|false/,
    question: /\?/,
    EoL: /\s*$/,
})

class CommandExecutionEvent
{
    /**@type {Token[]} */
    parameters = []

    constructor(parameters)
    {
        this.parameters = parameters
    }
}

class Command
{
    /**@private */
    callback;

    /**
     * @param {string} name 
     * @param {any[]} parameters 
     * @param {(event: CommandExecutionEvent) => any} callback 
     */
    constructor(name, parameters, callback = () => {})
    {
        this.type = "Command"
        this.name = name
        this.parameters = parameters
        this.callback = callback
    }

    execute()
    {
        this.callback(new CommandExecutionEvent(this.parameters))
    }
}

const commandsList =
{
    /** @param {CommandExecutionEvent} event */
    help: (event) => {
        const cmd = event.parameters[0]
        if(cmd.type == "EoL")
            logger.log("List of all available commands" + "<br>&nbsp;&nbsp;" + (Object.keys(commandsList).join("<br>&nbsp;&nbsp;"))
            + "<br><br>Use help &lt;command> to learn more about a specific command")
        else if(!commandsList.hasOwnProperty(cmd.value))
            logger.error(new SyntaxError(`Unknown command '${cmd.value}'`))
        else logger.log(commandsHelp[cmd.value])
    },

    /** @param {CommandExecutionEvent} event */
    print: (event) => {
        if(event.parameters[0].value == "")
            logger.error(new SyntaxError("First argument of print cannot be an empty string"))
        else logger.log(
            event.parameters[0].value
            .replaceAll("\\n", "<br>")
            .replaceAll("\\t", "&nbsp;&nbsp;&nbsp;&nbsp;")
            .replaceAll(/<\/?script>/g, "")
            .replaceAll(/on(\w+)\s*=\s*".*"/g, "")
            .replaceAll(/on(\w+)\s*=\s*'.*'/g, "")
        )
    }
}

const commandsHelp =
{
    help: "the ever helpful help command, helps you get some of that sweet help when you need it",
    print: "prints the string as raw html to the log"
}

export class CommandParser
{
    parse(string)
    {
        this.string = string
        this.lexer = new Lexer(this.string, tokenTypes)

        return this.Command()
    }

    Command()
    {
        let name = this.Literal()

        switch(name.value)
        {
            case "help": return new Command("help", [
                this.HelpCommandArgument(),
                this.End(),
            ], commandsList.help);

            case "print": return new Command("print", [
                this.String(),
                this.End(),
            ], commandsList.print);
        }
        throw new SyntaxError(`Unknown command '${name.value}'`)
    }

    Literal()
    {
        const token = this.eat('literal')
        return {
            type: "Word",
            value: token.value
        }
    }

    Question()
    {
        const token = this.eat('question')
        return {
            type: "Operator",
            value: token.value
        }
    }

    HelpCommandArgument()
    {
        const token = this.eat('literal EoL')
        return token
    }

    String()
    {
        const token = this.eat('string')
        return {
            type: "String",
            value: token.value.slice(1, token.value.length - 1) // remove quotes
        }
    }

    End()
    {
        const token = this.eat('EoL')
        return {
            type: "EoL",
            value: token.value
        }
    }

    /**
     * @returns {Token}
     */
    lookAhead()
    {
        return this.lexer.nextToken()
    }

    /**
     * @param {string} tokenType
     */
    eat(tokenType)
    {
        let types = tokenType.split(" ")
        let token = this.lookAhead()

        if(!token || (!types.includes(token.type) && token.type == 'EoL'))
            throw new SyntaxError(`Unexpected end of input`)

        if(types.includes(token.type))
            return token

        var expected = tokenType
        if(types.length > 1)
            expected = types.join(" | ")

        throw new SyntaxError(`Unexpected symbol \`${token.value}\`, expected ${expected} (at position ${this.lexer.pos.index - 1})`)
    }
}

class Lexer
{
    constructor(code, types)
    {
        this.code = code
        this.types = types
        this.pos = new Position(0, this.code)
        this.slice = this.code

        this.depth = 0
    }

    advance(n = 1)
    {
        this.pos.advance(n)
        this.slice = this.code.slice(this.pos.index)

        while ([' '].includes(this.slice[0]))
            this.advance()
    }

    nextToken()
    {
        var token = null;

        for (let _type in this.types) {
            const e = this.types[_type].exec(this.slice) // REGEXXXXXX
            if (e === null || e.index != 0)
                continue;

            token = new Token(_type, e[0], this.pos.clone());
            break;
        }

        if (token === null) {
            throw new SyntaxError(`Invalid symbol ${this.slice[0]} at position ${this.pos.index}`)
        }
        this.advance(token.value.length)

        return token;
    }

    peekToken()
    {
        var token = null;

        for (let _type in this.types) {
            const e = this.types[_type].exec(this.slice) // REGEXXXXXX
            if (e === null || e.index != 0)
                continue;

            token = new Token(_type, e[0], this.pos.clone());
            break;
        }

        if (token === null) {
            throw new SyntaxError(`Invalid symbol ${this.slice[0]} at position ${this.pos.index}`)
        }

        return token;
    }
}

class Position
{
    index = 0
    code = ""

    constructor(index, code)
    {
        this.index = index
        this.code = code
    }

    advance(n = 1)
    {
        for (let i = 0; i < (n || 1); i++)
        {
            this.index++
        }
    }

    clone()
    {
        return new Position(this.index, this.code)
    }

    toString()
    {
        return this.index.toString()
    }
}

class Token
{
    type = ""
    value = ""
    pos

    constructor(_type, value, pos)
    {
        this.type = _type
        this.value = value
        this.pos = pos
    }

    toString()
    {
        return `<${this.type}:${this.value}>`
    }
}

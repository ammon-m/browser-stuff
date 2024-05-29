const tokenTypes = Object.freeze({
    opCurly: /\{/,
    clCurly: /\}/,
    opSquare: /\[/,
    clSquare: /\]/,
    comma: /\,/,
    dot: /\./,
    number: /\d+(?:\.\d+)?/,
    string: /"(\\"|.)*"/,
    path: /[^\/\t]+(\/[^\/\t]+)*(\.[a-zA-Z0-9]+|\/)/,
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
        return this.callback(new CommandExecutionEvent(this.parameters))
    }
}

const commandsList =
{
    /** @param {CommandExecutionEvent} event */
    help: (event) => {
        const cmd = event.parameters[0]
        if(cmd.type == "EoL")
            logger.log("List of all available commands:\n  " + (Object.keys(commandsList).join("\n  "))
            + "\n\nUse help <command> to learn more about a specific command\n")
        else if(!commandsList.hasOwnProperty(cmd.value))
            throw new SyntaxError(`Unknown command '${cmd.value}'\n`)
        else if(!commandsHelp.hasOwnProperty(cmd.value))
            logger.log("[no documentation]\n")
        else logger.log(commandsHelp[cmd.value] + "\n")
    },

    /** @param {CommandExecutionEvent} event */
    echo: (event) => {
        if(event.parameters[0].value == "")
            throw new SyntaxError("First argument of echo cannot be empty\n")
        else logger.log(event.parameters[0].value)
    },

    /** @param {CommandExecutionEvent} event */
    clear: (event) => {
        logger.clear()
    },

    /** @param {CommandExecutionEvent} event */
    user: (event) => {
        if(event.parameters[0].value == "")
            throw new SyntaxError("First argument of user cannot be empty\n")
        else if(global.user != event.parameters[0].value)
        {
            global.user = event.parameters[0].value
        }
    },

    stack: (event) => {},
}

const commandsHelp =
{
    help: "the ever helpful help command, helps you get some of that sweet help when you need it",
    echo: "prints the value to the log",
    clear: "clears the log",
    user: "prints the string as raw html to the log",
    stack: "provides basic functionality that allows the user to read and write to the variable stack",
}

export class CommandParser
{
    commands =
    {
        help: () => new Command("help", [
            this.HelpCommandArgument(),
            this.End(),
        ], commandsList.help),

        echo: () => new Command("echo", [
            this.String(),
            this.End(),
        ], commandsList.echo),

        clear: () => new Command("clear", [
            this.End(),
        ], commandsList.clear),

        user: () => new Command("user", [
            this.String(),
            this.End(),
        ], commandsList.user),

        /**@returns {Command} */
        stack: () => new Command("stack", [
            this.Literal(),
        ], (event) => {
            switch(event.parameters[0].value)
            {
                case "push":
                {
                    const arg1 = this.Literal();
                    const arg2 = this.lexer.peekToken();
                    switch(arg2.type)
                    {
                        case "opCurly":
                        case "clCurly":
                        case "opSquare":
                        case "clSquare":
                            throw new SyntaxError("support for expressions not yet implemented\n");
                        case "EoL":
                            global.stack[arg1.value] = "";
                            return;
                        case "string":
                            global.stack[arg1.value] = arg2.value.includes(" ") ? arg2.value : arg2.value.slice(1, arg2.value.length - 1);
                            break;
                        case "literal":
                        case "path":
                        default:
                            global.stack[arg1.value] = arg2.value;
                            break;
                    }
                    return;
                }
                case "pop":
                {
                    const arg1 = this.Literal();
                    const r = global.stack[arg1.value];
                    Reflect.deleteProperty(global.stack, arg1.value);
                    return r;
                }
                case "list":
                {
                    let label = "\nname";
                    let longest = 16;

                    for(const key of Object.keys(global.stack))
                    {
                        if(longest < key.length + 4)
                            longest = key.length + 4;
                    }

                    for(var i = 0; i < longest - 4; i++)
                        label += " ";
                    label += "value";

                    logger.log(label);

                    for(const key of Object.keys(global.stack))
                    {
                        let str = "- " + key;
                        for(var i = 0; i < longest - key.length; i++)
                            str += " ";
                        str += global.stack[key].toString();

                        logger.log(str);
                    }

                    logger.log("");
                    return;
                }
                case "flush":
                {
                    global.stack = {}
                    return;
                }
            }
            throw new SyntaxError("First argument must be one of: push, pop, list, or flush\n");
        }),
    }

    /**
     * Throws {@linkcode SyntaxError} if the command fails at any point.
     * @returns {Command}
     */
    parse(string)
    {
        this.string = string
        this.lexer = new Lexer(this.string, tokenTypes)

        return this.Command()
    }

    Command()
    {
        let name = this.eat('*')

        if(this.commands.hasOwnProperty(name.value)) return this.commands[name.value]();

        throw new SyntaxError(`Unknown command '${name.value}'\n`)
    }

    Literal()
    {
        const token = this.eat('literal')
        return {
            type: "literal",
            value: token.value
        }
    }

    Question()
    {
        const token = this.eat('question')
        return {
            type: "operator",
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
        const token = this.eat('string literal')
        const string = token.value.startsWith('"') || token.value.startsWith("'")
        return {
            type: "string",
            value: string ? token.value.slice(1, token.value.length - 1) : token.value // remove quotes
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
     * @returns {Token}
     */
    eat(tokenType)
    {
        let types = tokenType.split(" ")
        let token = this.lookAhead()

        if(!token || (!types.includes(token.type) && token.type == 'EoL'))
            throw new SyntaxError(`Unexpected end of input\n`)

        if(types.includes(token.type) || tokenType == "*")
            return token

        var expected = tokenType
        if(types.length > 1)
            expected = types.join(" | ")

        throw new SyntaxError(`Unexpected symbol \`${token.value}\`, expected ${expected} at position ${this.lexer.pos.index - 1}\n`)
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
        var token = this.peekToken();

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

            token = new Token(_type, e[0]);
            break;
        }

        if (token === null) {
            throw new SyntaxError(`Invalid symbol ${this.slice[0]} at position ${this.pos.index}\n`)
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

    constructor(_type, value, pos)
    {
        this.type = _type
        this.value = value
    }

    toString()
    {
        return `<${this.type}:${this.value}>`
    }
}

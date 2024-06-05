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
     * @param {(event: CommandExecutionEvent) => Promise<any>} callback 
     */
    constructor(name, parameters, callback = async () => {})
    {
        this.type = "command"
        this.name = name
        this.parameters = parameters
        this.callback = callback
    }

    async execute()
    {
        return await this.callback(new CommandExecutionEvent(this.parameters))
    }
}

const commandsList =
{
    /** @param {CommandExecutionEvent} event */
    help: async (event) => {
        const cmd = event.parameters[0]
        let str = ""
        if(cmd.type == "EoL")
            str = ("List of all available commands:\n  " + (Object.keys(commandsList).join("\n  "))
            + "\n\nUse help <command> to learn more about a specific command\n")
        else if(!commandsList.hasOwnProperty(cmd.value))
            throw new SyntaxError(`Unknown command '${cmd.value}'\n`)
        else if(!commandsHelp.hasOwnProperty(cmd.value))
            str = ("[no documentation]\n")
        else str = (commandsHelp[cmd.value] + "\n")

        logger.log(str);
        return str
    },

    echo: async (event) => {},

    /** @param {CommandExecutionEvent} event */
    clear: async (event) => {
        logger.clear()
    },

    /** @param {CommandExecutionEvent} event */
    user: async (event) => {
        if(event.parameters[0].value == "")
            throw new SyntaxError("First argument of user cannot be empty\n")
        else if(global.user != event.parameters[0].value)
        {
            global.user = event.parameters[0].value
        }
    },

    stack: async (event) => {},
    motd: async (event) => {},
}

const commandsHelp =
{
    help: "the ever helpful help command, helps you get some of that sweet help when you need it",
    echo: "prints the value to the log",
    clear: "clears the log",
    user: "changes the username",
    stack: "provides basic functionality that allows the user to read and write to the variable stack",
    motd: "print the motd",
}

export class CommandParser
{
    commands =
    {
        help: () => new Command("help", [
            this.HelpCommandArgument(),
        ], commandsList.help),

        echo: () => new Command("echo", [
            this.Expression()
        ], async (event) => {
            const val = await evaluate(event.parameters[0]);
            logger.log(val);

            return val;
        }),

        clear: () => new Command("clear", [], commandsList.clear),

        user: () => new Command("user", [
            this.String(),
        ], commandsList.user),

        /**@returns {Command} */
        stack: () => new Command("stack", [
            this.Word(),
        ], async (event) => {
            switch(event.parameters[0].value)
            {
                case "set":
                {
                    const arg1 = this.Word();
                    const arg2 = this.Expression();
                    global.stack.Set(arg1.value, await evaluate(arg2));
                    return;
                }
                case "get":
                {
                    const arg1 = this.Word();
                    return {
                        type: "variable",
                        value: arg1.value,
                    }
                }
                case "list":
                {
                    let label = "name";
                    let longest = 16;

                    for(const key of Object.keys(global.stack._keyvalues))
                    {
                        if(longest < key.length + 4)
                            longest = key.length + 4;
                    }

                    for(var i = 0; i < longest - 4; i++)
                        label += " ";
                    label += "value";

                    logger.log(label);

                    for(const key of Object.keys(global.stack._keyvalues))
                    {
                        let str = "- " + key;
                        for(var i = 0; i < longest - key.length; i++)
                            str += " ";
                        str += global.stack.Get(key).toString();

                        logger.log(str);
                    }

                    logger.log("");

                    return;
                }
                case "flush":
                {
                    global.stack.Clear();
                    return;
                }
            }
            throw new SyntaxError("First argument must be one of: set, get, list, or flush\n");
        }),

        motd: () => new Command("motd", [], async (event) => {
            global.printMotd();
        }),

        test: () => new Command("test", [], async (event) => {
            const testValue =
            `echo "these commands are synthetic user inputs!"
            motd
            help
            echo "2 + 2 = " + (2 + 2)`

            global.echo = false;
            for(const line of testValue.split(/\r?\n/g))
            {
                await global.ExecuteTerminalCommand(line);
            }
            global.echo = true;
        }),

        maybe: () => new Command("maybe", [], async (event) => {
            return await this.ask("example question",
                async () => {
                    await global.ExecuteTerminalCommand('echo "user said yes"');
                    await global.ExecuteTerminalCommand('echo "yay!!!"');
                },
                async () => {
                    await global.ExecuteTerminalCommand('echo "user said no"');
                    await global.ExecuteTerminalCommand('echo "man...."');
                }
            );
        }),

        license: () => new Command("license", [], async (event) => {
            let ret = "";

            const out = `MIT License

Copyright (c) 2024 bscit

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

            await this.ask("u sure?", async () => {
                ret = out;
                for(const line of out.split(/\r?\n/g))
                {
                    await global.ExecuteTerminalCommand('echo "' + line + '"');
                }
            })

            return ret;
        })
    }

    /**
     * halt execution until user confirms a yes or no question
     * @param {string} question
     * @param {async () => {}} yes
     * @param {async () => {}} no
     * 
     * @returns {Promise<string>} `y` or `n`
     */
    async ask(question, yes, no, badInput = false)
    {
        global.echo = false;

        if(badInput)
            await global.ExecuteTerminalCommand('echo "value must be one of y or n!"');
        else
            await global.ExecuteTerminalCommand('echo "' + question + ' [y/n]"');

        global.inputState = InputState.Write;
        global.echo = true;
        global.canType = true;

        terminal.Redraw();

        let input = await global.ReadCommand(); // wait for input by user first (I could use this for file streams!)

        global.inputState = InputState.Command;
        global.echo = false;
        global.canType = false;

        switch(input)
        {
            case "y":
                if(yes) await yes();
                global.echo = true;
                return input;
            case "n":
                if(no) await no();
                global.echo = true;
                return input;
            default:
                return await this.ask(question, yes, no, true);
        }
    }

    /**
     * Throws {@linkcode SyntaxError} if the command fails at any point.
     * @returns {Command[]}
     */
    parse(string)
    {
        this.string = string.startsWith(" ") ? string.replace(/ +/, "") : string
        this.lexer = new Lexer(this.string, tokenTypes)

        this._lookAhead = this.lexer.nextToken();

        const arr = [this.Command()];

        if(this._lookAhead.type != ";" && this._lookAhead.type != "EoL")
            throw new SyntaxError("Expected end of input, got " + this._lookAhead.type);

        while(this._lookAhead.type == ";")
        {
            this.eat(";");
            switch(this._lookAhead.type)
            {
                case "path": {
                    const token = this.eat("path");
                    logger.warn("The filesystem hasn't been implemented yet");
                    break;
                }
                default:
                    arr.push(this.Command());
                    break;
            }
        }
        this.End();
        return arr;
    }

    /**
     * @returns {Command}
     */
    Command()
    {
        switch(this._lookAhead.type)
        {
            case "word": {
                let name = this.Word();
                if(this.commands.hasOwnProperty(name.value)) return this.commands[name.value]();

                switch(this._lookAhead.type)
                {
                    case "=": {
                        this.eat("=");
                        const value = this._lookAhead.type == "EoL" ? {
                            type: "string",
                            value: ""
                        } : this.Expression();

                        return new Command("", [],
                            async () => {
                                global.stack.Set(name.value, await evaluate(value));
                                return value;
                            },
                        );
                    }
                    case "additiveOperator":
                        const token = this.eat(this._lookAhead.type);
                        if(this._lookAhead.type == "additiveOperator" && this._lookAhead.value == token.value)
                        {
                            this.eat(token.type);
                            const value = {
                                type: "BinaryExpression",
                                operator: token.value,
                                left: {
                                    type: "variable",
                                    value: name.value,
                                },
                                right: {
                                    type: "number",
                                    value: 1
                                },
                            };
    
                            return new Command("", [],
                                async () => {
                                    global.stack.Set(name.value, await evaluate(value));
                                    return value;
                                },
                            );
                        }
                    case "multiplicativeOperator": {
                        this.eat("=");
                        const value = {
                            type: "BinaryExpression",
                            operator: token.value,
                            left: {
                                type: "variable",
                                value: name.value,
                            },
                            right: this.Expression(),
                        };

                        return new Command("", [],
                            async () => {
                                global.stack.Set(name.value, await evaluate(value));
                                return value;
                            },
                        );
                    }
                    default:
                        throw new SyntaxError(`Unknown command: ${name.value}\ntry using the help command to see get help\n`);
                }
            }
        }

        throw new SyntaxError(
`Unknown command: ${this.string.split(" ")[0]}
try using the help command to see get help
`)
    }

    Word()
    {
        const token = this.eat('word')
        return {
            type: "word",
            value: token.value
        }
    }

    HelpCommandArgument()
    {
        if(this._lookAhead.type == "word") return this.Word();
        return {
            type: "EoL",
            value: "",
        };
    }

    String()
    {
        const token = this.eat('string word')
        const string = token.value.startsWith('"')
        return {
            type: "string",
            value: string ? token.value.slice(1, token.value.length - 1) : token.value // remove quotes
        }
    }

    End()
    {
        const token = this.eat('EoL ;');
        return {
            type: "EoL",
            value: token.value,
        };
    }

    Expression()
    {
        return this.AdditiveExpression();
    }

    Equatable()
    {
        if(this._lookAhead.type == "word" && this.commands.hasOwnProperty(this._lookAhead.value))
            return this.Command();
        return this.Literal();
    }

    Literal()
    {
        switch(this._lookAhead.type)
        {
            case "$": return this.Variable();
            case "number": return this.Number();
            case "string": return this.String();
            case "word": return this.Word();
        }
        throw new SyntaxError(`Unexpected ${this._lookAhead.type} \`${this._lookAhead.value}\`, expected variable, string, or word\n`);
    }

    Number()
    {
        const token = this.eat("number");
        return {
            type: token.type,
            value: Number(token.value),
        };
    }

    PrimaryExpression()
    {
        switch(this._lookAhead.type)
        {
            case "(": return this.ParenthesizedExpression();
            default: return this.Equatable();
        }
    }

    ParenthesizedExpression()
    {
        this.eat("(");
        const expression = this.Expression();
        this.eat(")");
        return expression;
    }

    AdditiveExpression()
    {
        return this._BinaryExpression("MultiplicativeExpression", "additiveOperator");
    }

    MultiplicativeExpression()
    {
        return this._BinaryExpression("PrimaryExpression", "multiplicativeOperator");
    }

    _BinaryExpression(name, type)
    {
        let left = this[name]();

        while(this._lookAhead.type == type)
        {
            const operator = this.eat(type).value;

            const right = this[name]();

            left = {
                type: "BinaryExpression",
                operator,
                left,
                right,
            };
        }

        return left;
    }

    Variable()
    {
        this.eat("$");
        let token = null;
        switch(this._lookAhead.type)
        {
            case "number":
                token = this.eat("number");
                break;
            case "word":
                token = this.eat("word");
                break;
            default:
                throw new SyntaxError(`Unexpected ${this._lookAhead.type} \`${this._lookAhead.value}\`, expected word\n`);
        }
        return {
            type: "variable",
            value: token.value,
        };
    }

    Array()
    {
        this.eat("[");

        const arr = {
            type: "array",
            value: [],
        };

        while(this._lookAhead.type != "]")
        {
            arr.value.push(this.Expression());
            if(this._lookAhead.type != "]") this.eat(",");
        }

        this.eat("]")

        return type
    }

    /**
     * @param {string} tokenType
     * @returns {Token}
     */
    eat(tokenType)
    {
        let types = tokenType.split(" ")
        let token = this._lookAhead;

        if(!token || (!types.includes(token.type) && (token.type == 'EoL' || token.type == ';')))
            throw new SyntaxError(`Unexpected end of input\n`)

        var expected = tokenType
        if(types.length > 1)
            expected = types.join(" | ")

        if(!types.includes(token.type) && tokenType != "*")
            throw new SyntaxError(`Unexpected ${token.type} \`${token.value}\`, expected ${expected}, at position ${this.lexer.pos.index - 1}\n`)

        this._lookAhead = this.lexer.nextToken();

        return token
    }
}

/**@typedef {{type: string, operator: string, left: BinaryExpression | Token, right: BinaryExpression | Token}} BinaryExpression */
/**@typedef {Token | BinaryExpression | Command} BinaryExpressionHead */

/**
 * @param {BinaryExpressionHead} expression
 */
async function evaluate(expression)
{
    switch(expression.type)
    {
        case "BinaryExpression":
            switch(expression.operator)
            {
                case "+": return await evaluate(expression.left) + await evaluate(expression.right);
                case "-": return await evaluate(expression.left) - await evaluate(expression.right);
                case "*": return await evaluate(expression.left) * await evaluate(expression.right);
                case "/": return await evaluate(expression.left) / await evaluate(expression.right);
            }
        case "command":
            return await expression.execute();
        case "number":
            return Number(expression.value);
        case "variable":
            return global.stack.Get(expression.value);
        case "array":
            const arr = [];
            for(var i = 0; i < expression.value.length; i++)
            {
                arr.push(await evaluate(expression.value[i]));
            }
            return arr;
        default:
            return expression.value;
    }
}

const tokenTypes = Object.freeze({
    string: /^"(\\"|.)*?"/,
    "(": /^\(/,
    ")": /^\)/,
    "{": /^\{/,
    "}": /^\}/,
    "[": /^\[/,
    "]": /^\]/,
    "=": /^=/,
    ";": /^;/,
    ":": /^:/,
    ",": /^\,/,
    ".": /^\./,
    "?": /^\?/,
    "$": /^\$/,
    "|": /^\|/,
    additiveOperator: /^(\+|-)/,
    multiplicativeOperator: /^(\*|\/)/,
    // path: /^([^\/\t]+(\/[^\/\t]+)*((\.[a-zA-Z0-9]+)|\/))/,
    number: /^(\d+(?:\.\d+)?)/,
    word: /^[a-zA-Z_][a-zA-Z_0-9]*/,
    boolean: /^(true|false)/,
    EoL: /^\s*$/,
})

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
            if (e === null)
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

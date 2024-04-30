export const CommandParserResult =
{
    Success: 0,
    Failure: 1
}

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
})

class Command
{
    constructor(name, arguments)
    {
        this.type = "Command"
        this.name = name
        this.arguments = arguments
    }
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
        const name = this.Literal()
        switch(name.value)
        {
            case "print": return new Command("print", [
                this.String()
            ]);
        }
    }

    Literal()
    {
        const token = this.eat('literal')
        return {
            type: "Word",
            value: token.value
        }
    }

    String()
    {
        const token = this.eat('string')
        return {
            type: "String",
            value: token.value.slice(1, token.value.length - 1) // remove quotes
        }
    }

    /**
     * @returns {Token}
     */
    lookAhead()
    {
        return this.lexer.nextToken()
    }

    eat(tokenType)
    {
        let token = this.lookAhead()

        if(!token)
            throw new SyntaxError(`Unexpected end of input`)

        if(token.type == tokenType)
            return token

        throw new SyntaxError(`Got ${token.value}, expected ${tokenType}`)
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
            throw new SyntaxError(`Unexpected symbol ${this.slice[0]} at position ${this.pos.index}`)
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
            throw new SyntaxError(`Unexpected symbol ${this.slice[0]} at position ${this.pos.index}`)
        }

        return token;
    }
}

class Position {
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
        return `${this.index}`
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

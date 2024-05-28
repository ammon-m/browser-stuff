import ThemeColorSet from "./ThemeColorSet.js"

export default class Terminal
{
    /**
     * Gets the current global theme
     */
    static get Colors()
    {
        return Object.freeze(global.theme)
    }

    _scroll = 0
    _drawingState = new DrawingState()

    /**@type {TextSymbol[]} */
    _textSymbols = []

    _rawText = ""
    _rawTextContainsNewline = false

    charWidth = 10
    lineHeight = 16
    maxColumns = 50
    xPadding = 0

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    constructor(ctx)
    {
        this.ctx = ctx
        this.SetColor(Terminal.Colors.foreground)
    }

    _addSymbol(string, color)
    {
        this._rawText += string;
        if(string.includes("\n") && !this._rawTextContainsNewline) this._rawTextContainsNewline = true;

        let split = string.split(/(?=\n)/g)
        for(var i = string.startsWith("\n"); i < split.length; i++)
        {
            this._textSymbols.push(new TextSymbol(split[i], color));
        }
    }

    Clear()
    {
        this._rawText = ""
        this._rawTextContainsNewline = false
        this._textSymbols = []
        this._scroll = 0
        this.ResetColor()
    }

    ResetColor()
    {
        this._drawingState.color = Terminal.Colors.foreground;
    }

    SetColor(colorCssString)
    {
        this._drawingState.color = colorCssString;
    }

    GetColor()
    {
        return this._drawingState.color
    }

    Scroll(amount)
    {
        this._scroll = Math.min(Math.max(this._scroll + amount, 0), this._rawText.split("\n").length - 1)
        this.Redraw();
    }

    ScrollTo(amount)
    {
        this._scroll = Math.min(Math.max(amount, 0), this._rawText.split("\n").length - 1)
        this.Redraw();
    }

    Read()
    {
        return this._rawText[this._rawText.length - 1]
    }

    ReadLine()
    {
        return _rawTextContainsNewline ? this._rawText.slice(this._rawText.lastIndexOf("\n") + 1) : this._rawText
    }

    /**
     * @param {string} string
     */
    Write(string)
    {
        this._addSymbol(string, this._drawingState.color)
        this.Redraw();
    }

    /**
     * @param {string} string
     */
    WriteLine(string)
    {
        this._addSymbol("\n" + string, this._drawingState.color)
        this.Redraw();
    }

    SetCharWidth(width)
    {
        this.charWidth = width;
        this.Redraw();
    }

    SetLineHeight(height)
    {
        this.lineHeight = height;
        this.Redraw();
    }

    SetMaxColumns(columns)
    {
        this.maxColumns = columns;
        this.Redraw();
    }

    SetXPadding(padding)
    {
        this.xPadding = padding;
        this.Redraw();
    }

    Redraw()
    {
        this.ctx.fillStyle = Terminal.Colors.background
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)

        let x = 0;
        let y = 1 - 3/this.lineHeight;
        this._textSymbols.forEach((symbol, i) => {
            if(i < this._scroll) return;

            let str = symbol.Value.slice(0)
            if(str.startsWith("\n") || x + str.length > this.maxColumns)
            {
                x = 0
                y++
            }
            this.ctx.fillStyle = symbol.Color;
            this.ctx.fillText(str.replace("\n", ""), x * this.charWidth + this.xPadding, y * this.lineHeight)
        })
    }

    GetEndPosition()
    {
        let x = 0;
        let y = 1 - 3/this.lineHeight;

        for(var i = this._scroll; i < this._rawText.length; i++)
        {
            x++
            if(this._rawText[i] == "\n")
            {
                x = 0
                y++
            }
        }

        return {x, y}
    }
}

class TextSymbol
{
    Value;
    Color;

    constructor(string = "", color = "#ffffff")
    {
        this.Value = string
        this.Color = color
    }

    ToString()
    {
        return this.Value;
    }
}

class DrawingState
{
    color = "#ffffff"
}

// syntax:
// 
// <c:#ffffff>text
// <c:orange>more text
// 

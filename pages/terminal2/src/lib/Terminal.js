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
    maxColumns = 100
    maxRows = 50
    xPadding = 0

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    constructor(ctx)
    {
        this.ctx = ctx
        this.SetColor(Terminal.Colors.foreground)
        this.SetBackgroundColor(Terminal.Colors.background)
    }

    _addSymbol(string)
    {
        this._rawText += string;
        if(string.includes("\n") && !this._rawTextContainsNewline) this._rawTextContainsNewline = true;

        let split = string.split(/(?=\n)/)
        for(var i = 0; i < split.length; i++)
        {
            this._textSymbols.push(
                new TextSymbol(
                    split[i],
                    this.GetColor(),
                    this.GetBackgroundColor(),
                    this.GetBold(),
                    this.GetItalic()
                )
            );
        }
    }

    Clear()
    {
        this._rawText = ""
        this._rawTextContainsNewline = false
        this._textSymbols = []
        this._scroll = 0
        this.ResetColor()
        this.Redraw()
    }

    GetColor()
    {
        return this._drawingState.fgColor
    }

    SetColor(colorCssString)
    {
        this._drawingState.fgColor = colorCssString;
    }

    ResetColor()
    {
        this._drawingState.fgColor = Terminal.Colors.foreground;
        ResetBackgroundColor();
    }

    GetBackgroundColor()
    {
        return this._drawingState.bgColor
    }

    SetBackgroundColor(colorCssString)
    {
        this._drawingState.bgColor = colorCssString;
    }

    ResetBackgroundColor()
    {
        this._drawingState.bgColor = Terminal.Colors.background;
    }

    GetBold()
    {
        return this._drawingState.bold
    }

    SetBold(bold)
    {
        this._drawingState.bold = bold;
    }

    GetItalic()
    {
        return this._drawingState.italic
    }

    SetItalic(italic)
    {
        this._drawingState.italic = italic;
    }

    Scroll(amount)
    {
        this.ScrollTo(this._scroll + amount)
    }

    ScrollTo(amount)
    {
        const len = this._rawText.split("\n").length;
        this._scroll = Math.min(Math.max(amount, 0), len - (this._rawText == ""))
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
        this._addSymbol(string);
        this.Redraw();
    }

    /**
     * @param {string} string
     */
    WriteLine(string)
    {
        this._addSymbol((this._rawText.length > 0 ? "\n" : "") + string);
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

    SetMaxRows(rows)
    {
        this.maxRows = rows;
        this.Redraw();
    }

    SetXPadding(padding)
    {
        this.xPadding = padding;
        this.Redraw();
    }

    Redraw()
    {
        this.ctx.fillStyle = Terminal.Colors.background;
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        let x = 0;
        let y = 1 - 3/this.lineHeight;

        const ogFont = this.ctx.font;
        const ogColor = this.ctx.fillStyle;

        this._textSymbols.forEach((symbol, i) =>
        {
            let str = symbol.Value;
            if(str.startsWith("\n") || x + str.length > this.maxColumns)
            {
                x = 0;
                y++;
            }
            if(y < this._scroll) return;

            str = str.replace("\n", "");

            this.ctx.font = (symbol.Italic ? "italic " : "") + (symbol.Bold ? "bold " : "") + ogFont;

            this.ctx.fillStyle = symbol.BgColor;
            this.ctx.fillRect(x * this.charWidth + this.xPadding, (y - this._scroll) * this.lineHeight, str.length * this.charWidth, this.lineHeight);

            this.ctx.fillStyle = symbol.FgColor;
            this.ctx.fillText(str, x * this.charWidth + this.xPadding, (y - this._scroll) * this.lineHeight);

            x += str.length;
        })

        this.ctx.font = ogFont;
        this.ctx.fillStyle = ogColor;

        this.onRedraw();
    }

    onRedraw = () => {}

    GetEndPosition()
    {
        let x = 0;
        let y = 1 - 3/this.lineHeight;

        for(var i = 0; i < this._rawText.length; i++)
        {
            if(i == 0) y++
            x++
            if(this._rawText[i] == "\n")
            {
                x = 0
                y++
            }
        }

        return {x, y};
    }

    /**@returns {Promise<KeyboardEvent>} */
    ReadKey()
    {
        return new Promise((resolve, reject) => {
            const listener = event => {
                window.removeEventListener("keydown", listener)
                resolve(event)
            }
            window.addEventListener("keydown", listener, false);
        });
    }
}

class TextSymbol
{
    Value;
    FgColor;
    BgColor;
    Bold;
    Italic;

    constructor(string = "", fgColor = "#ffffff", bgColor = "#000000", bold = false, italic = false)
    {
        this.Value = string
        this.FgColor = fgColor
        this.BgColor = bgColor
        this.Bold = bold
        this.Italic = italic
    }

    ToString()
    {
        return this.Value;
    }
}

class DrawingState
{
    fgColor = "#ffffff"
    bgColor = "#000000"
    bold = false
    italic = false
}

// syntax:
// 
// <c:#ffffff>text
// <c:orange>more text
// 

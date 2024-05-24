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

    set Color(colorCssString)
    {
        this._drawingState.color = colorCssString;
    }

    get Color()
    {
        return this._drawingState.color
    }

    constructor(ctx)
    {
        this.ctx = ctx
        
    }

    Scroll(amount)
    {
        this._scroll = Math.min(Math.max(this._scroll + amount, 0), this._rawText.split("\n").length - 1)
    }

    ScrollTo(amount)
    {
        this._scroll = Math.min(Math.max(amount, 0), this._rawText.split("\n").length - 1)
    }

    Read()
    {
        return this._rawText[this._rawText.length - 1]
    }

    ReadLine()
    {
        return _rawTextContainsNewline ? this._rawText.slice(this._rawText.lastIndexOf("\n")) : this._rawText
    }
}

class TextSymbol
{
    Value = "";
    Color = () => ThemeColorSet.Default.foreground;

    constructor(string, color)
    {
        this.Value = string
        this.Color = () => color
    }

    ToString()
    {
        return this.Value;
    }
}

const MAX_SAFE_INT = 2**53 - 1

class Range
{
    min = 0;
    max = 1;

    constructor(min, max)
    {
        this.min = Math.min(min, max);
        this.max = Math.max(min, max);
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

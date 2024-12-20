export default class Logger
{
    lines = []
    entries = []
    onSubmit = () => {}

    constructor(onSubmit = () => {})
    {
        this.lines = []
        this.entries = []
        this.onSubmit = onSubmit
    }

    clear()
    {
        this.lines = []
        this.entries = []
        this.onSubmit(null)
    }

    _log(_type)
    {
        const arr = []

        Array.from(arguments).forEach((value, i) => {
            if(i == 0) return;

            let str
            if(value.hasOwnProperty("toString"))
                str = value.toString()
            else str = String(value)

            this.lines.push(str)

            /**@type {import("./Logger.js").LogEntry} */
            const entry = {
                type: _type,
                message: str,
                fgColor: "foreground",
                bgColor: "background"
            }

            if(_type === "Error") entry.fgColor = "red";
            if(_type === "Warning") entry.fgColor = "yellow";

            this.entries.push(entry)
            arr.push(entry)
        })

        this.onSubmit(arr)

        return this.entries.length
    }

    log() {
        return this._log("Info", Array.from(arguments))
    }

    warn() {
        return this._log("Warning", Array.from(arguments))
    }

    error() {
        return this._log("Error", Array.from(arguments))
    }

    toString()
    {
        return this.lines.join("\n")
    }
}

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
        Array.from(arguments).forEach((value, i) => {
            if(i == 0) return;

            let str
            if(value.hasOwnProperty("toString"))
                str = value.toString()
            else str = String(value)

            this.lines.push(str)

            this.entries.push({
                type: _type,
                message: str
            })
        })

        this.onSubmit(this.entries)

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

export default class Logger
{
    lines: string[]
    entries: LogEntry[]
    onSubmit: (entries: LogEntry[]) => void

    constructor(onSubmit: (entries: LogEntry[]) => void)

    clear(): void

    /**
     * Push an entry or several entries to the Logger instance
     * @param items
     * @returns The new length of the list of lines
     */
    log(...items: any[]): number

    /**
     * Push an entry or several entries to the Logger instance
     * @param items
     * @returns The new length of the list of lines
     */
    warn(...items: any[]): number

    /**
     * Push an entry or several entries to the Logger instance
     * @param items
     * @returns The new length of the list of lines
     */
    error(...items: any[]): number

    toString(): string
}

interface LogEntry extends IArguments
{
    type: string
    message: string
}

/*
 * Authors: @ammon-m
 * 
 * Description:
 *  minifs is a module that provides a simple lightweight virtual file system
 * 
 */

export class Uri
{
    /**
     * The `./path/to/file` part of `./path/to/file.ext`
     */
    path = ""

    /**
     * The `file.ext` part of `./path/to/file.ext`
     */
    fileName = ""

    /**
     * The `ext` part of `./path/to/file.ext`
     * @type {string | null}
     */
    fileExtension = ""

    constructor(path)
    {
        const e = /([^\/\t]+(\/[^\/\t]+)*)(\.([a-zA-Z0-9]+)|\/)/.exec(path)
        if(!e)
            throw new SyntaxError("Invalid path")

        let split = e[0].split("/")

        let ext = e[4] == "" ? null : e[4]
        this.fileExtension = ext

        this.fileName = e[0].endsWith("/")
            ? split[split.length - 1]
            : split[split.length];

        this.path = e[0].endsWith("/")
            ? e[0]
            : e[0].replace("." + ext, "");
    }

    toString()
    {
        return this.path + (this.fileExtension ? "." + this.fileExtension : "/")
    }
}

/**
 * @param {number} value
 * @returns {string}
 */
export function IntToChar(value)
{
    return String.fromCharCode(Number(value))[0];
}

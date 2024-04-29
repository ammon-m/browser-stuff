/*
 * Authors: @ammon-m
 * 
 * Description:
 *  minifs is a small module that provides an in-memory digital file system
 * 
 */

export class Uri
{
    /**
     * The `/some/path` part of `./some/path.ext`
     */
    path = ""

    /**
     * The `path` part of `./some/path.ext`
     */
    fileName = ""

    /**
     * The `ext` part of `./some/path.ext`
     * @type {string | null}
     */
    fileExtension = ""

    constructor()
    {
        
    }
}

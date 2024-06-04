import * as common from "./Common.js"

export class FileSystem
{
    /**@private */
    __files = new FileSystemItem()

    /**
     * @param {common.Uri} path
     */
    get(path)
    {
        let depth = 0
        const split = path.toString().split("/")
        let g = this.__files
        for(var i = 0; i < split.length; i++)
        {
            if(i == split.length - 1 && split[i] == "") break;
            if(!g.items.hasOwnProperty(split[i])) throw new SyntaxError("File does not exist")
            g = g.items[split[i]]
        }
        return g
    }
}

class FileSystemItem
{
    items = {}
    data = new Uint8Array();
}

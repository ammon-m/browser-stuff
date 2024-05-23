export default class ThemeColorSet
{
    constructor({user = "#15d43e", path = "#7b85ed", background = "#000000", foreground = "#c0c0c0"})
    {
        this.user = user
        this.path = path
        this.background = background
        this.foreground = foreground
    }

    static get Default() {
        return new ThemeColorSet({})
    }
}

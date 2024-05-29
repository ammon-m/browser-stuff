const white = "#ffffff"

export default class ThemeColorSet
{
    user = white;
    path = white;
    background = white;
    foreground = white;
    warning = white;
    error = white;

    static get Default() {
        const set = new ThemeColorSet()
        set.user = "#15d43e"
        set.path = "#7b85ed"
        set.background = "#000000"
        set.foreground = "#c0c0c0"
        set.warning = "#eaab3d"
        set.error = "#f62d33"
        return set
    }
}

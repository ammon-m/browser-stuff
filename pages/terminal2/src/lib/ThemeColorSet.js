const white = "#ffffff"

export default class ThemeColorSet
{
    user = white;
    path = white;
    background = white;
    foreground = white;
    warning = white;
    error = white;

    black = white;
    red = white;
    green = white;
    yellow = white;
    blue = white;
    magenta = white;
    cyan = white;
    white = white;

    static get Default() {
        const set = new ThemeColorSet()

        set.background = "#000000"
        set.foreground = "#c0c0c0"

        set.black = "#101010"
        set.red = "#f62d33"
        set.green = "#15d43e"
        set.yellow = "#eaab3d"
        set.blue = "#7b85ed"
        set.magenta = "#ed2f7b"
        set.cyan = "#23e8bd"
        set.white = "#ffffff"

        set.user = set.green
        set.path = set.blue
        set.warning = set.yellow
        set.error = set.red

        return set
    }
}

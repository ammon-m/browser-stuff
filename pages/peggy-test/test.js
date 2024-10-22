import * as peggy from "./parser.mjs";

function reparse()
{
    document.getElementById("output").innerText = JSON.stringify(peggy.parse(
        document.getElementById("input").innerText
    ));
}

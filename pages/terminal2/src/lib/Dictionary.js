/**
 * Manages and stores named values
 */
export default class Dictionary
{
    _keyvalues = {};

    constructor()
    {
        this._keyvalues = {};
    }

    Set(key, value)
    {
        if(value !== "")
            this._keyvalues[key] = value;
        else
            Reflect.deleteProperty(this._keyvalues, key);
    }

    Get(key)
    {
        const val = this._keyvalues[key];
        return (val !== undefined) ? val : "";
    }

    Clear()
    {
        const keys = Object.keys(this._keyvalues);
        for(const key of keys)
        {
            Reflect.deleteProperty(this._keyvalues, key);
        }
    }
}

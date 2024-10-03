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
        if(value !== "" && value !== null && value !== undefined)
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
        let result = 0;
        for(const key of keys)
        {
            result |= Reflect.deleteProperty(this._keyvalues, key);
        }
        return (result && true);
    }
}

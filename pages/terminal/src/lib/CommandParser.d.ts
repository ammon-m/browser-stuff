export enum CommandParserResult
{
    Success = 0,
    Failure = 1
}

export class CommandParser
{
    parse(value: string): CommandParserResult
}

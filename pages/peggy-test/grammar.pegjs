Root
  = (_ @(Block / Statement / If))+

Block
  = "{" _ @Root _ "}"

Statement
  = @(Assignment / Declare / UnaryVariableAssignment) EndOfStatement

EndOfStatement ";"
  = _ ";"

Declare "declare"
  = @Identifier _ @Assignment

Assignment "assign"
  = @Identifier _ @AssignmentOperator _ @(Expression / UnaryVariableAssignment)

UnaryVariableAssignment
  = Increment / Decrement

Increment "increment"
  = @Identifier _ @"++"
  / @"++" _ @Identifier
Decrement "decrement"
  = @Identifier _ @"--"
  / @"--" _ @Identifier

Expression "expression"
  = BinaryExpression
  / Range
  / Factor

BinaryExpression
  = @BinaryOperator _ @(Factor / Expression) _ @(Factor / Expression)

Range "range"
  = @Index? _ @".." _ @Index?

Index "index"
  = "^"? (Factor / BinaryExpression)

ArithmeticOperator
  = ("+" / "-" / "*" / "/" /
  	 "&" / "|" / "^" /
     ">>" / "<<")
BooleanOperator
  = (">=" / "<=" / ">" / "<" / "==" / "!=")

BinaryOperator "operator"
  = ArithmeticOperator
  / BooleanOperator

AssignmentOperator
  = $(ArithmeticOperator? "=")

Factor "term"
  = Literal
  / UnaryVariableAssignment
  / Accessor
  / Identifier
  / List

Literal
  = Number

Number
  = Float
  / Integer

Identifier "identifier"
  = $([a-zA-Z_][a-zA-Z0-9_]*)$(_ "." _ Identifier)? { return text().replace(/\s*/g, "") }

Integer
  = _ sign:(("-")?)"0b"num:[0-1]+ {
      return parseInt((sign ? sign : "") + num.join(""), 2);
  	}
  / _ sign:(("-")?)?"0x"num:[a-fA-F0-9]+ {
  	  return parseInt((sign ? sign : "") + num.join(""), 16);
  	}
  / _ ("-")? [0-9]+ { return parseInt(text(), 10); }

Float
  = _ num:("-"? [0-9]+ ("."[0-9])?) "f" { return parseFloat(text(), 10); }

List
  = @"[" @Expression|.., ListDelimiter| ListDelimiter? @"]"

Accessor
  = @(Identifier) @"[" _ @(Range / Index) _ @"]"

ListDelimiter
  = _ "," _

If
  = @"if" _ "(" _ @Expression _ ")" _ @(Block / Statement / If) _ @Else?

Else
  = @"else" _ @(Block / Statement / If)

_ "whitespace"
  = [ \t\n\r]*

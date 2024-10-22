// Simple Arithmetics Grammar
// ==========================
//
// Accepts expressions like "* 2 + 3 4" and computes their value.

Statement
  = _ (Assignment / UnaryVariableAssignment)?
    _ ";"

Assignment "assignment"
  = Identifier _ AssignmentOperator _ (Expression / UnaryVariableAssignment)

UnaryVariableAssignment
  = Increment / Decrement

Increment
  = Identifier _ "++"
Decrement
  = Identifier _ "--"

Expression "expression"
  = op:BinaryOperator _ left:Factor _ right:Factor _ {
  	  switch(op)
      {
      	case "+": return left + right;
      	case "-": return left - right;
      	case "*": return left * right;
      	case "/": return left / right;
      	case "&": return left & right;
      	case "|": return left | right;
      	case "^": return left ^ right;
      	case ">>":return left >> right;
      	case "<<":return left << right;
      	case "<": return left < right ? 1 : 0;
      	case ">": return left > right ? 1 : 0;
      	case "<=":return left <= right ? 1 : 0;
      	case ">=":return left >= right ? 1 : 0;
      	case "==":return left == right ? 1 : 0;
      	case "!=":return left != right ? 1 : 0;
      }
    }
  / Literal

ArithmeticOperator
  = ("+" / "-" / "*" / "/" /
  	 "&" / "|" / "^" /
     ">>" / "<<")

BinaryOperator "operator"
  = ArithmeticOperator
  / (">=" / "<=" / ">" / "<" / "==" / "!=")

AssignmentOperator
  = ArithmeticOperator? "="

Factor "term"
  = Literal
  / expr:Expression { return expr; }

Literal
  = Number

Number
  = Float
  / Integer

Identifier "identifier"
  = [a-zA-Z_][a-zA-Z0-9_]*

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

_ "whitespace"
  = [ \t\n\r]*

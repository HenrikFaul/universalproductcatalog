const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2 };

function tokenize(expression) {
  const tokens = [];
  let i = 0;
  while (i < expression.length) {
    const char = expression[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (/[()+\-*/]/.test(char)) {
      tokens.push({ type: 'op', value: char });
      i += 1;
      continue;
    }
    if (/\d/.test(char)) {
      let number = char;
      i += 1;
      while (i < expression.length && /[\d.]/.test(expression[i])) {
        number += expression[i++];
      }
      tokens.push({ type: 'num', value: Number(number) });
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      let ident = char;
      i += 1;
      while (i < expression.length && /[a-zA-Z0-9_.]/.test(expression[i])) {
        ident += expression[i++];
      }
      tokens.push({ type: 'ident', value: ident });
      continue;
    }
    throw new Error(`Invalid token at ${i}`);
  }
  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const stack = [];
  for (const token of tokens) {
    if (token.type === 'num' || token.type === 'ident') {
      output.push(token);
      continue;
    }
    if (token.value === '(') {
      stack.push(token);
      continue;
    }
    if (token.value === ')') {
      while (stack.length && stack[stack.length - 1].value !== '(') output.push(stack.pop());
      if (!stack.length) throw new Error('Mismatched parentheses');
      stack.pop();
      continue;
    }
    while (
      stack.length
      && PRECEDENCE[stack[stack.length - 1].value] >= PRECEDENCE[token.value]
    ) {
      output.push(stack.pop());
    }
    stack.push(token);
  }
  while (stack.length) {
    const op = stack.pop();
    if (op.value === '(') throw new Error('Mismatched parentheses');
    output.push(op);
  }
  return output;
}

function resolveIdentifier(identifier, context) {
  const path = identifier.split('.');
  let cur = context;
  for (const part of path) {
    cur = cur?.[part];
  }
  if (typeof cur !== 'number') {
    throw new Error(`Identifier ${identifier} must resolve to number`);
  }
  return cur;
}

export function evaluateFormula(expression, context) {
  const rpn = toRpn(tokenize(expression));
  const stack = [];
  for (const token of rpn) {
    if (token.type === 'num') {
      stack.push(token.value);
      continue;
    }
    if (token.type === 'ident') {
      stack.push(resolveIdentifier(token.value, context));
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    switch (token.value) {
      case '+': stack.push(a + b); break;
      case '-': stack.push(a - b); break;
      case '*': stack.push(a * b); break;
      case '/': stack.push(b === 0 ? Infinity : a / b); break;
      default: throw new Error('Unsupported operator');
    }
  }
  if (stack.length !== 1) throw new Error('Invalid formula');
  return stack[0];
}

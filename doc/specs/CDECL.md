## z88dk/Old SDCC Z80 function call ABI

All parameters passed via stack, right-to-left order. Caller clears stack.
Return values:
    byte: on `L`
    word: on `HL`
    dword: high word on `DE`, low word on `HL`

## z88dk/Old SDCC Z80 `fastcall` function call ABI

Single argument and return value on registers:
    byte: on `L`
    word: on `HL`
    dword: high word on `DE`, low word on `HL`

## z88dk/Old SDCC Z80 `callee` function call ABI

All parameters passed via stack, right-to-left order. Callee clears stack, restoring return address.
Return values:
    byte: on `L`
    word: on `HL`
    dword: high word on `DE`, low word on `HL`

## New SDCC 4.2.0 Z80 function call ABI

Up to two byte or word function arguments in registers, spillover in stack
Single byte argument: `void fn1c(char arg)` => `arg => A`
Single word argument: `void fn1s(int arg)` => `arg => HL`
Two byte arguments: `void fn2c(char arg1, char arg2)` => `arg1 => A`, `arg2 => L`
Two word arguments: `void fn2s(int arg1, int arg2)` => `arg1 => HL`, `arg2 => DE`
Two mixed arguments, byte then word: `void fn1b1s(char arg1, int arg2)` => `arg1 => L`, `arg2 => DE`
Two mixed arguments, word then byte: `void fn1s1b(int arg1, char arg2)` => `arg1 => HL`, `arg2 => E`
Return values: 
    byte: on `A`;
    word: on `DE`;
    dword: high word on `HL`, low word on `DE`
    larger than dword: on stack

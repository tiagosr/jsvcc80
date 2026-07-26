jsvcc80
=======

A fully-local agent orchestration/process experiment "disguised" as an effort to produce a working C compiler for the Z80 CPU.

The intention is to learn what are the processes that avoid "agent orchestration rot", where the process of prompting an implementation starts giving way to the degradation of software planning and architecture decisions (both on the model's and on the user/prompter's side). The threshold for this phenomenon seems more manageable (on both mental and financial terms) in the current crop of LLMs that can be run in a local setup, on either a 48GB Macbook Pro M4 or a 128GB AMD "Strix Halo" Ryzen AI MAX+.

I'm compiling findings about this process on [FINDINGS.md](FINDINGS.md).

## Current Implementation Status

### ✅ Completed
See [CHANGELOG.md](CHANGELOG.md)

### 🔄 In Progress
- Nothing at the moment

### 🔜 Next Steps
1. Implement a disassembler for object files, and flat binaries with a settable address base
2. Implement an object file viewer
3. Implement new SDCC Z80 calling convention
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
4. Add character string operations to the C standard library (`sprintf`, `sscanf`, `strlen`, `strtoi`, etc.)
5. Add file stream abstractions to the C standard library (`FILE`, `putc`, `getc`, `fprintf`, `fscanf`, etc.)
6. Implement symbol map compiling and exporting for debugging
7. Implement `unsigned:n` bit fields


### 📔 Backlog (issues identified during implementation for later priorization)
- Fix `typedef unsigned int newType` parsing

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
1. Fix support for missing compound statements `&=`, `|=`, `^=`, `<<=`, `>>=`.
3. Implement single-precision IEEE 754 `float` with optionally-linkable soft-float `+`, `-`, `*`, `/`, `%` operations, `isnan`, `isinf`
4. Implement nearest integer, absolute value, remainder `fabsf`, `frexpf`, `ldexpf`, `ceilf`, `floorf`, `modff`
5. Fix `typedef unsigned int newType` parsing
6. Implement soft-float trigonometric operations (`sinf`, `cosf`, `tanf`, `cotf`, `asinf`, `acosf`, `atanf`, `atan2f`)
7. Implement soft-float exponential operations (`expf`, `powf`, `logf`, `log10f`, `sqrtf`)
8. Implement object file viewer (like binutils' `objdump`)
9. Add line:column information for tokens to give proper error/debugging location information


### 📔 Backlog (issues identified during implementation for later priorization)
- Change `FILE` to use callbacks for abstraction, which the (per file descriptor: read/write character, seek/get position (if stream supports))
- Fix long files issue?
- Fix deep call nesting compilation failure

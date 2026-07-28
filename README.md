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
1. Implement soft-float trigonometric operations (`sinf`, `cosf`, `tanf`, `cotf`, `asinf`, `acosf`, `atanf`, `atan2f`)
2. Implement soft-float exponential operations (`expf`, `powf`, `logf`, `log10f`, `sqrtf`)


### 📔 Backlog (issues identified during implementation for later priorization)
- Fix long files issue?

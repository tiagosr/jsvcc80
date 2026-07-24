Findings
========

Findings about the agent orchestration experiment.

## Software design issues
- There seems to be a sweet-spot of capability/overbearingness in the models about what kinds of tasks an LLM (local or frontier) takes on before they either start creating "laziness" - especially with delegating implementation decisions to the LLM, allowing the implementation and the quality of the output to drift away from control - or "babysitting" - especially with monitoring the thought processes to see where a model might drift away from the spec towards a dead end or a poorly-defined direction. The sweet-spot seems to be on the range of 15B to 50B parameters - more and it invites laziness, less and it invites babysitting
- In fact, "babysitting" might be a better range to operate a coding LLM through than "laziness" - although the process and outcome of the babysitting range actually hinges on the user's own capabilities in defining the tasks that the models will take on. An experienced software developer, capable of scoping and architecture work, is able to drive an LLM to higher-quality output and less iteration cycles than a person with less experience on scoping, and runs a smaller risk of mental overload while monitoring the LLM's output.

## Context scale issues
- Some models have a proclivity to generate large classes, increasing the file sizes and increasing the chances of issues with future sessions. Directives to reduce the file sizes (limit functions per file, limit function sizes) need to be better defined - another case of preferentially not trusting the model's judgement on that.

## Tooling issues
- Some combinations of "harness + AGENTS.md + inference engine + model" can trigger incredibly weird inference loops - in particular `Qwen 3.6 27B` and `Qwen 3.6 35B A3B` on the Strix Halo over the network requesting from my Macbook started outputting endless `/` after a certain point, and a similar effect from `Gemma 4 31B` - and that seemed to be happening only on requests **from** the Macbook, not from any of the other machines in my network.
- Some harnesses have their own stability issues: OpenCode is more stable on the terminal version, but more complete on the desktop version; Pi is terminal-only, but doesn't provide local inference connection by default - I needed to install `@hypabolic/crossbar` in order to access the models over LM Studio in both same-machine and network cases, even if LM Studio is a standard available provider.
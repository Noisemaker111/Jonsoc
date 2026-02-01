# Error Stack Trace Cleaner PRD

## Overview

Always-on preprocessing system that detects bloated error messages, stack traces, and diagnostic output from user input, cleans them via a cheap fast model, and passes the refined input to the main agent. The system should be transparent, idempotent, and progressively improvable with data.

## Problem Statement

Users frequently paste full compiler outputs, stack traces, terminal error logs, and build tool output that contain:

- Repeated error blocks (same error reported 3-8 times)
- Internal tool noise (esbuild callbacks, vite plugin frames, internal stack frames)
- Configuration messages not relevant to debugging
- Verbose explanations from build tools
- Duplicate file listings
- Timing and performance logs unrelated to the actual error

This bloat consumes context window, dilutes signal, and forces the main agent to wade through noise before understanding the actual problem.

## Goals

1. **Reduce input token count** by 60-80% for typical error pastes
2. **Preserve all actionable information** (error message, file paths, line numbers, import specifiers)
3. **Zero latency impact** on non-error inputs (under 50ms detection)
4. **Transparent operation** — user should never know it's happening unless they opt-in to see the diff
5. **Self-improving** — collect metrics to tune detection and cleaning quality over time

## Non-Goals

- Fixing or solving errors (that's the main agent's job)
- Handling non-error user inputs (leave those alone)
- Supporting every possible error format out of the box (start with Node.js/Vite/TypeScript stack traces)
- Replacing human debugging

## Success Metrics

| Metric                                | Target                             |
| ------------------------------------- | ---------------------------------- |
| Detection accuracy                    | >95% of error stacks detected      |
| False positive rate                   | <2% of non-error inputs processed  |
| Token reduction (on processed inputs) | 60-80% reduction                   |
| End-to-end latency                    | <100ms including model call        |
| User satisfaction                     | No complaints about "missing info" |

## System Architecture

### High-Level Flow

```
User Input Stream
        |
        v
┌─────────────────────┐
│ Input Preprocessor  │
│ (Always On)         │
└─────────┬───────────┘
          |
          v
┌─────────────────────┐
│ Detection Engine    │ ──► Is Error/Stack? ──► YES ──► Call Clean Model
│ - Pattern Matchers  │                                      |
│ - Heuristics        │                                      |
└─────────┬───────────┘                                      |
          |                                                  v
          v                                            ┌───────────────┐
┌─────────────────────┐                                    │ Cheap Model   │
│ Pass Through         │ ◄─────────────────────────────────┤ (Haiku/4o-mini)│
│ (Non-error)          │   (Return cleaned output          └───────┬───────┘
└─────────────────────┘    or original if not applicable)           |
                                                            v
                                                    ┌───────────────┐
                                                    │ Postprocessor │
                                                    │ - Validation  │
                                                    │ - Diff Gen    │
                                                    └───────┬───────┘
                                                            |
                                                            v
                                                    ┌───────────────┐
                                                    │ Main Agent    │
                                                    └───────────────┘
```

### Components

#### 1. Input Preprocessor

The entry point for all user input. This component is always listening and makes a fast, deterministic decision about whether to invoke the cleaning pipeline.

**Responsibilities:**

- Receive raw user input as UTF-8 string
- Run detection heuristics in under 50ms
- Route to appropriate pipeline (cleaning or passthrough)
- Handle edge cases (empty input, binary data, extremely long inputs)

#### 2. Detection Engine

Multi-stage classifier that determines if input should be cleaned.

**Stage 1: Fast Pattern Matching (Regex)**

- Stack trace line patterns: `at async ... (file:line:col)`, `at Object.<anonymous> (file:line:col)`
- Error markers: `✘`, `Error:`, `error:`, `FAILED`, `Failed`, `[ERROR]`
- Build tool output: `vite`, `esbuild`, `tsc`, `bun`, `webpack`, `rollup`
- File paths with line numbers: `/path/to/file.ts:123` or `C:\path\file.ts:123`

**Stage 2: Heuristic Scoring**

- Count lines matching stack trace patterns
- Calculate error-to-noise ratio (actionable lines vs total lines)
- Check for duplicate error blocks (same error message appearing multiple times)
- Measure verbosity indicators (long stack frames, internal tool frames)

**Stage 3: Threshold Decision**

- If score > threshold: route to cleaning pipeline
- If score < threshold: passthrough
- Log decision for metric collection

**Thresholds (tunable via config):**

```
STACK_TRACE_THRESHOLD = 0.7  # Score above this = clean
REPEAT_BLOCK_THRESHOLD = 2   # Same error appearing N times = clean
VERBOSITY_THRESHOLD = 0.5    # Noise ratio above this = clean
```

#### 3. Cleaning Model Prompt

The prompt fed to the cheap model. Must be strict, structured, and idempotent.

**System Prompt:**

```
You are an error stack trace cleaner. Your job is to extract ONLY the actionable information from error output.

INPUT DEFINITION:
- Compiler errors
- Stack traces from Node.js/Vite/esbuild/TypeScript
- Build tool output
- Test runner failures
- Runtime exceptions

YOUR TASK:
1. Identify the core error(s) — what actually went wrong
2. Extract affected files with line numbers
3. Extract problematic import paths, module specifiers, or code snippets
4. Remove ALL stack trace frames from internal tooling (esbuild, vite plugins, bun internals)
5. Remove duplicate error blocks (keep only 1 instance)
6. Remove verbose explanations from build tools
7. Remove configuration messages, URLs, timing info
8. If input is NOT an error or stack trace, return {"is_error": false}
9. If input IS an error but NOT bloated (already clean), return {"is_clean": true}

OUTPUT FORMAT:
Return valid JSON with this schema:
{
  "is_error": boolean,        // true if input was error/stack trace
  "is_clean": boolean,        // true if input was already minimal
  "cleaned": string,          // if cleaning happened, the cleaned output
  "summary": {
    "core_error": string,     // 1-sentence error description
    "files": [                // array of affected files
      {
        "path": "relative/path/file.ts",
        "lines": [1, 15, 23], // line numbers involved
        "imports": ["problematic/path"] // if applicable
      }
    ],
    "imports_affected": ["@jonsoc/convex/convex/_generated/api"], // problematic import paths
    "duplicate_count": 3     // how many duplicate blocks were collapsed
  },
  "metrics": {
    "original_lines": 67,
    "cleaned_lines": 8,
    "reduction_percent": 88
  }
}

STRICT RULES:
- Never explain the error or suggest fixes
- Never interpret what the error means
- Only output the cleaned text, nothing else
- Preserve exact file paths, line numbers, and import paths
- If unsure whether something is actionable, INCLUDE IT
- If input is not an error, return {"is_error": false} with no cleaned text
```

**Model Selection Criteria:**

- Fast: under 500ms response
- Cheap: < $0.001 per call
- Reliable JSON output
- Good at following strict instructions

**Recommended Models (in priority order):**

1. Anthropic Haiku (fastest, cheapest, good at structured output)
2. OpenAI GPT-4o-mini (reliable JSON, good instruction following)
3. Google Gemini 2.0 Flash (fast, cheap, structured output)

#### 4. Postprocessor

Validates and enriches the model output.

**Validation Checks:**

- Valid JSON returned
- `is_error` field present and correct type
- If `cleaned` present, not empty
- No obvious information loss (reduced line count > 50% is expected but validate)

**Enrichment:**

- Generate diff between original and cleaned for logging
- Add metadata (timestamp, input length, output length, reduction ratio)
- Extract any additional structured data if useful

**Fallback Behavior:**

- If model fails: passthrough original input with warning logged
- If JSON invalid: passthrough original input with warning logged
- If validation fails: passthrough original input with warning logged

#### 5. Passthrough Handler

Routes non-error inputs directly to main agent without modification.

**Always Passthrough:**

- Conversational messages ("hey, how do I...")
- Questions ("what is...")
- Commands ("generate a...")
- Single line queries
- Code snippets without error context

**Detection Bypass for Edge Cases:**

- Known safe patterns (short inputs < 500 chars)
- User explicitly requests no cleaning (`--no-clean` or similar flag in future)

## Data Collection

### What to Log (Anonymized)

For continuous improvement, collect:

```
PER CLEANING EVENT:
- Original input length (tokens)
- Cleaned output length (tokens)
- Reduction percentage
- Detection score
- Model used
- Processing time
- Whether main agent reported "missing info" (requires feedback loop)
```

**Stored in:** Ephemeral session log, rotate daily

### Feedback Loop from Main Agent

How do we know if cleaning removed something important?

**Method 1: Explicit Feedback**

```
Main Agent Output (Optional):
<!-- If cleaning removed something important -->
<error_cleaning_feedback>
Removed too much: the "internal esbuild frames" actually showed that
the error originated in a user-defined function, not the build itself.
</error_cleaning_feedback>
```

**Method 2: Implicit Metrics**

- Track cases where main agent says "I need more context" after cleaning
- Track cases where conversation goes back and forth asking for details from original
- Compare solution time with vs without cleaning (A/B test if feasible)

**Method 3: User Override**

```
/error-cleaning-report — show last 5 cleanings with diffs
/error-cleaning-toggle — disable for this session
```

### Model Fine-Tuning / Prompt Evolution

Quarterly review of:

- Top 10 failure cases (false positives, false negatives)
- Common patterns in "removed too much" feedback
- New error formats from emerging tools (Next.js, Astro, etc.)
- Threshold tuning based on precision/recall trade-off

## User Experience

### Default Behavior (Invisible)

- User pastes full stack trace
- System silently cleans it
- Main agent receives only actionable info
- User never knows cleaning happened

### Transparency Options

**Option A: Diff View (Default Off, Configurable)**

```
/error-cleaning on --show-diff

[Original (67 lines) → Cleaned (8 lines), 88% reduction]
--- PASTE ---
```

**Option B: Per-Session Toggle**

```
/error-cleaning off  # Disable for this conversation
/error-cleaning on   # Re-enable
```

**Option C: Verbose Logging (Debug Mode)**

```
[ERROR CLEANER] Detected: stack trace (score: 0.89)
[ERROR CLEANER] Cleaned: 67 lines → 8 lines (88% reduction)
[ERROR CLEANER] Model: Haiku, 234ms
[ERROR CLEANER] Summary: 3 duplicate blocks collapsed
```

### User Controls

**Config File (`jonsoc.json`):**

```json
{
  "errorCleaning": {
    "enabled": true,
    "showDiff": false,
    "verbose": false,
    "model": "haiku", // "haiku", "4o-mini", "gemini-flash"
    "threshold": {
      "stackTrace": 0.7,
      "repeatBlock": 2,
      "verbosity": 0.5
    }
  }
}
```

**CLI Commands:**

```
--error-cleaning=auto    # Default (always on, auto-detect)
--error-cleaning=always # Force clean everything
--error-cleaning=off    # Disable entirely
--error-cleaning=verbose # Log all cleaning events
```

## Edge Cases

### Edge Case 1: Mixed Input

User pastes error output plus their own commentary:

```
I got this error when running bun dev:

[full stack trace]

What does this mean?

CLEANING BEHAVIOR:
- Extract just the error portion
- Preserve user's question
- Result: "What does this mean?" + cleaned error
```

### Edge Case 2: Extremely Long Input (> 10k tokens)

```
BEHAVIOR:
- Truncate after first error if it's clearly error-only
- If mixed content, passthrough with warning
- Log for analysis
```

### Edge Case 3: Binary or Non-Text Input

```
BEHAVIOR:
- Detect binary (null bytes, encoding)
- Passthrough unchanged
- Log as anomaly
```

### Edge Case 4: Already Minimal Input

```
Input: "Error: Cannot find module 'foo' at line 42"
CLEANING BEHAVIOR:
- Detect as error but already clean
- Return {"is_clean": true}
- No cleaning needed
```

### Edge Case 5: Unknown New Error Format

```
BEHAVIOR:
- If detection uncertain, err on side of cleaning
- Log for review
- Improve regex/heuristics in next iteration
```

## Implementation Phases

### Phase 1: MVP (1 Sprint)

**Scope:**

- Vite/esbuild/TypeScript stack traces only
- Detection via regex only
- Single model (Haiku)
- Basic logging
- Always on, no user controls

**Deliverables:**

- Detection function
- Cleaning function
- Postprocessor with validation
- Metrics collection (basic)
- Documentation

**Success Criteria:**

- > 90% token reduction on typical Vite errors
- <200ms end-to-end latency
- No crashes on non-error inputs

### Phase 2: Robustness (1 Sprint)

**Scope:**

- Expand detection to Node.js, Bun, Webpack, Rollup errors
- Add heuristic scoring
- User controls (config file, CLI flags)
- Better fallback behavior
- Diff view for transparency

**Deliverables:**

- Enhanced detection engine
- Config system
- Per-session toggle
- Diff generation
- Better error handling

### Phase 3: Intelligence (1 Sprint)

**Scope:**

- Feedback loop from main agent
- Automatic threshold tuning
- Detection of new error patterns via logs
- A/B testing capability
- User-facing feedback mechanism

**Deliverables:**

- Feedback collection system
- Threshold auto-tuning
- Pattern learning
- User override commands

### Phase 4: Optimization (Ongoing)

**Ongoing Tasks:**

- Monitor metrics weekly
- Add support for new tools as they emerge
- Fine-tune prompt based on edge cases
- Model comparison (Haiku vs 4o-mini vs Gemini)
- Cost optimization (cache common errors?)

## Risks and Mitigations

| Risk                                   | Mitigation                                                 |
| -------------------------------------- | ---------------------------------------------------------- |
| Removing critical info                 | Logging + feedback loop; conservative thresholds initially |
| Latency too high                       | Optimize detection (regex is fast); parallelize model call |
| False positives (cleaning normal text) | High threshold initially; manual review of logs            |
| Model deprecation                      | Support multiple models; abstraction layer                 |
| User distrust                          | Transparency options; opt-out; diff view                   |

## Open Questions

1. **Should we clean terminal output that IS the answer?** (e.g., user wants to know what the error means, not just see the file/line)

2. **Cache common errors?** (30% of errors might be common like "module not found" — could skip model call)

3. **Should cleaning apply to agent output too?** (if agent returns stack trace in response)

4. **Multi-language support?** (Python stack traces, Ruby, Go — when to add)

5. **Privacy:** What level of anonymization for logged errors? (file paths may contain sensitive info)

## Appendix: Example Transformations

### Example 1: Vite/esbuild Error

**Original (67 lines):**

```
VITE v7.1.4  ready in 1957 ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
(!) Failed to run dependency scan. Skipping dependency pre-bundling. Error:
  Failed to scan for dependencies from entries:
  C:/Users/Jk101/Projects/jonsoc/packages/web/index.html

  ✘ [ERROR] Missing "./convex/_generated/api" specifier in "@jonsoc/convex" package [plugin vite:dep-scan]

    src/components/user-menu.tsx:1:20:
      1 │ import { api } from "@jonsoc/convex/convex/_generated/api"
        ╵                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  This error came from the "onResolve" callback registered here:

  ../../node_modules/.bun/esbuild@0.25.12/node_modules/esbuild/lib/main.js:1141:20:
      1141 │       let promise = setup({
           ╵                     ^

  ... (repeated for 3 more files, with full esbuild stack traces) ...
```

**Cleaned (8 lines):**

```
✘ [ERROR] Missing "./convex/_generated/api" specifier in "@jonsoc/convex" package

Files:
- src/components/user-menu.tsx:1
- src/routes/dashboard.tsx:1
- src/routes/index.tsx:1

Problematic imports:
- @jonsoc/convex/convex/_generated/api (note: double "convex")
```

### Example 2: TypeScript Error

**Original:**

```
error TS2322: Type 'string' is not assignable to type 'number'.

src/components/button.tsx:42:15
    42 |   const width: number = props.size.toString()
                              ~~~~~~~~~~~~~~~~~~~~~~
src/components/button.tsx:43:12
    43 |   return <button style={{ width }} />

This error came from...

../../node_modules/typescript/lib/typescript.js:17689:15
    at checkExpressionCWithTypeCaster (/project/node_modules/typescript/lib/typescript.js:17689:15)
    at checkExpressionC (/project/node_modules/typescript/lib/typescript.js:17686:20)
    ... (15 more internal frames)
```

**Cleaned:**

```
error TS2322: Type 'string' is not assignable to type 'number'.

File: src/components/button.tsx:42-43
Problem: Assigning string to number type
Code: const width: number = props.size.toString()
```

### Example 3: Node.js Error

**Original:**

```
TypeError: Cannot read properties of undefined (reading 'map')

    at Array.map (<anonymous>)
    at Object.getItems (src/utils/data.ts:15:23)
    at Function.getData (src/services/api.ts:42:11)
    at async Component.render (src/components/list.tsx:78:5)
    at Component.update (src/framework/component.js:1142:15)
    at Component.scheduleUpdate (src/framework/scheduler.js:89:20)
    at Scheduler.work (src/framework/scheduler.js:234:15)
    at Scheduler.flush (src/framework/scheduler.js:156:10)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)

Node.js version: v20.8.1
```

**Cleaned:**

```
TypeError: Cannot read properties of undefined (reading 'map')

File: src/utils/data.ts:15
Stack:
  - Array.map
  - getItems (data.ts:15)
  - getData (src/services/api.ts:42)
  - Component.render (src/components/list.tsx:78)

Missing: data.items is undefined
```

## References

- [Vite Dependency Pre-bundling](https://vitejs.dev/guide/dep-pre-bundling.html)
- [TypeScript Error Codes](https://github.com/Microsoft/TypeScript/blob/main/src/compiler/diagnosticMessages.json)
- [esbuild API](https://esbuild.github.io/api/)
- [Stack Overflow: How to parse stack traces](https://stackoverflow.com/questions/6159907/how-to-parse-a-stack-trace)

## Timeline

| Phase                 | Duration | Owner |
| --------------------- | -------- | ----- |
| Phase 1: MVP          | 1 sprint | TBD   |
| Phase 2: Robustness   | 1 sprint | TBD   |
| Phase 3: Intelligence | 1 sprint | TBD   |
| Phase 4: Optimization | Ongoing  | TBD   |

## Budget

| Item                                 | Cost           |
| ------------------------------------ | -------------- |
| Cheap model API calls (est. 100/day) | $0.10-0.50/day |
| Development time                     | 3 sprints      |
| Operations overhead                  | Minimal        |

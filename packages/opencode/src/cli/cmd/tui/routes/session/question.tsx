import { createStore } from "solid-js/store"
import { createMemo, For, Show } from "solid-js"
import { useKeyboard, useRenderer } from "@opentui/solid"
import type { TextareaRenderable } from "@opentui/core"
import { useKeybind } from "../../context/keybind"
import { tint, useTheme } from "../../context/theme"
import type { QuestionAnswer, QuestionRequest } from "@opencode-ai/sdk/v2"
import { useSDK } from "../../context/sdk"
import { SplitBorder } from "../../component/border"
import { useTextareaKeybindings } from "../../component/textarea-keybindings"
import { useDialog } from "../../ui/dialog"

export function QuestionPrompt(props: { request: QuestionRequest }) {
  const sdk = useSDK()
  const { theme } = useTheme()
  const keybind = useKeybind()
  const renderer = useRenderer()
  const bindings = useTextareaKeybindings()

  const questions = createMemo(() => props.request.questions)
  const [store, setStore] = createStore({
    tab: 0,
    answers: [] as QuestionAnswer[],
    custom: [] as string[],
    selected: 0,
    editing: false,
    focused: false,
  })

  let textarea: TextareaRenderable | undefined

  const question = createMemo(() => questions()[store.tab])
  const options = createMemo(() => (question()?.options ?? []).slice(0, 3))
  const custom = createMemo(() => true)
  const other = createMemo(() => custom() && store.selected === options().length)
  const input = createMemo(() => store.custom[store.tab] ?? "")
  const multi = createMemo(() => question()?.multiple === true)
  const letters = ["A", "B", "C"]
  const totalOptions = createMemo(() => options().length + (custom() ? 1 : 0))
  const customPicked = createMemo(() => {
    const value = input()
    if (!value) return false
    return store.answers[store.tab]?.includes(value) ?? false
  })
  const focused = createMemo(() => store.focused)
  const lastIndex = createMemo(() => Math.max(questions().length - 1, 0))
  const focusKey = createMemo(() => keybind.print("question_focus") || "alt+q")

  function setFocus(next: boolean) {
    setStore("focused", next)
    if (next) {
      renderer.currentFocusedRenderable?.blur()
    }
  }

  function submit() {
    const answers = questions().map((_, i) => store.answers[i] ?? [])
    sdk.client.question.reply({
      requestID: props.request.id,
      answers,
    })
  }

  function advance() {
    if (store.tab >= lastIndex()) {
      submit()
      return
    }
    setStore("tab", store.tab + 1)
    setStore("selected", 0)
  }

  function reject() {
    sdk.client.question.reject({
      requestID: props.request.id,
    })
  }

  function pick(answer: string, custom: boolean = false) {
    const answers = [...store.answers]
    answers[store.tab] = [answer]
    setStore("answers", answers)
    if (custom) {
      const inputs = [...store.custom]
      inputs[store.tab] = answer
      setStore("custom", inputs)
    }
    advance()
  }

  function clear() {
    const answers = [...store.answers]
    answers[store.tab] = []
    setStore("answers", answers)

    const inputs = [...store.custom]
    inputs[store.tab] = ""
    setStore("custom", inputs)
    setStore("editing", false)
  }

  function toggle(answer: string) {
    const existing = store.answers[store.tab] ?? []
    const next = [...existing]
    const index = next.indexOf(answer)
    if (index === -1) next.push(answer)
    if (index !== -1) next.splice(index, 1)
    const answers = [...store.answers]
    answers[store.tab] = next
    setStore("answers", answers)
  }

  function moveTo(index: number) {
    setStore("selected", index)
  }

  function selectTab(index: number) {
    setStore("tab", index)
    setStore("selected", 0)
    setFocus(true)
  }

  function selectOption() {
    if (other()) {
      if (!multi()) {
        setStore("editing", true)
        return
      }
      const value = input()
      if (value && customPicked()) {
        toggle(value)
        return
      }
      setStore("editing", true)
      return
    }
    const opt = options()[store.selected]
    if (!opt) return
    if (multi()) {
      toggle(opt.label)
      return
    }
    pick(opt.label)
  }

  const dialog = useDialog()

  useKeyboard((evt) => {
    // Skip processing if a dialog (e.g., command palette) is open
    if (dialog.stack.length > 0) return

    if (!store.editing && keybind.match("question_focus", evt)) {
      evt.preventDefault()
      setFocus(!store.focused)
      return
    }

    if (!store.editing && !focused()) return

    // When editing custom answer textarea
    if (store.editing) {
      if (evt.name === "escape") {
        evt.preventDefault()
        setStore("editing", false)
        return
      }
      if (keybind.match("input_clear", evt)) {
        evt.preventDefault()
        const text = textarea?.plainText ?? ""
        if (!text) {
          setStore("editing", false)
          return
        }
        textarea?.setText("")
        return
      }
      if (evt.name === "return") {
        evt.preventDefault()
        const text = textarea?.plainText?.trim() ?? ""
        const prev = store.custom[store.tab]

        if (!text) {
          if (prev) {
            const inputs = [...store.custom]
            inputs[store.tab] = ""
            setStore("custom", inputs)

            const answers = [...store.answers]
            answers[store.tab] = (answers[store.tab] ?? []).filter((x) => x !== prev)
            setStore("answers", answers)
          }
          setStore("editing", false)
          return
        }

        if (multi()) {
          const inputs = [...store.custom]
          inputs[store.tab] = text
          setStore("custom", inputs)

          const existing = store.answers[store.tab] ?? []
          const next = [...existing]
          if (prev) {
            const index = next.indexOf(prev)
            if (index !== -1) next.splice(index, 1)
          }
          if (!next.includes(text)) next.push(text)
          const answers = [...store.answers]
          answers[store.tab] = next
          setStore("answers", answers)
          setStore("editing", false)
          return
        }

        pick(text, true)
        setStore("editing", false)
        return
      }
      // Let textarea handle all other keys
      return
    }

    const total = totalOptions()
    const key = evt.name.length === 1 ? evt.name.toUpperCase() : ""
    if (key) {
      const letterIndex = letters.indexOf(key)
      const index = key === "D" && custom() ? options().length : letterIndex
      if (letterIndex >= 0 && letterIndex >= options().length) return
      if (index >= 0 && index < total) {
        evt.preventDefault()
        moveTo(index)
        selectOption()
        return
      }
    }

    const digit = Number(evt.name)
    if (!Number.isNaN(digit)) {
      const index = digit === 4 && custom() ? options().length : digit - 1
      if (digit >= 1 && digit <= 3 && digit > options().length) return
      if (index >= 0 && index < total) {
        evt.preventDefault()
        moveTo(index)
        selectOption()
        return
      }
    }

    if (evt.name === "up" || evt.name === "k") {
      evt.preventDefault()
      moveTo((store.selected - 1 + total) % total)
    }

    if (evt.name === "down" || evt.name === "j") {
      evt.preventDefault()
      moveTo((store.selected + 1) % total)
    }

    if (keybind.match("question_clear", evt)) {
      evt.preventDefault()
      clear()
    }

    if (keybind.match("question_previous", evt)) {
      evt.preventDefault()
      selectTab(Math.max(0, store.tab - 1))
    }

    if (evt.name === "space" && multi()) {
      evt.preventDefault()
      selectOption()
    }

    if (evt.name === "return") {
      evt.preventDefault()
      if (multi()) {
        advance()
        return
      }
      selectOption()
    }

    if (evt.name === "escape" || keybind.match("app_exit", evt)) {
      evt.preventDefault()
      reject()
    }
  })

  return (
    <box
      backgroundColor={theme.backgroundPanel}
      border={["left", "right", "top", "bottom"]}
      borderColor={focused() ? theme.primary : theme.backgroundElement}
      customBorderChars={SplitBorder.customBorderChars}
      marginTop={1}
      onMouseUp={() => setFocus(true)}
    >
      <box paddingLeft={1} paddingRight={3} paddingTop={1} paddingBottom={1}>
        <box
          flexDirection="row"
          alignItems="center"
          gap={2}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={1}
          paddingBottom={1}
          backgroundColor={theme.backgroundElement}
        >
          <text fg={theme.text}>Question</text>
          <box flexDirection="row" gap={2}>
            <text fg={theme.textMuted}>click or {focusKey()} to focus</text>
            <Show when={store.tab > 0}>
              <text fg={theme.textMuted} onMouseUp={() => selectTab(Math.max(0, store.tab - 1))}>
                ◀ prev ({keybind.print("question_previous")})
              </text>
            </Show>
          </box>
        </box>
      </box>
      <box gap={1} paddingLeft={1} paddingRight={3} paddingBottom={1}>
        <For each={questions()}>
          {(q, index) => {
            const active = () => index() === store.tab
            const answers = () => store.answers[index()] ?? []
            const opts = () => q.options.slice(0, 3)
            const isMulti = () => q.multiple === true
            const customValue = () => store.custom[index()] ?? ""
            const customSelected = () => customValue() && answers().includes(customValue())
            return (
              <box paddingLeft={1} paddingBottom={1}>
                <box flexDirection="row" gap={1} onMouseUp={() => selectTab(index())}>
                  <text fg={active() ? theme.secondary : theme.textMuted}>{`${index() + 1})`}</text>
                  <text fg={active() ? theme.text : theme.textMuted}>{q.question}</text>
                </box>
                <box paddingLeft={3} gap={1}>
                  <box>
                    <For each={opts()}>
                      {(opt, i) => {
                        const isActive = () => active() && i() === store.selected
                        const picked = () => answers().includes(opt.label)
                        const textColor = () =>
                          isActive()
                            ? theme.secondary
                            : picked()
                              ? theme.success
                              : active()
                                ? theme.text
                                : theme.textMuted
                        return (
                          <box
                            onMouseOver={() => {
                              if (active()) moveTo(i())
                            }}
                            onMouseUp={() => {
                              setFocus(true)
                              if (!active()) {
                                setStore("tab", index())
                                setStore("selected", i())
                                queueMicrotask(() => selectOption())
                                return
                              }
                              selectOption()
                            }}
                          >
                            <box flexDirection="row">
                              <box backgroundColor={isActive() ? theme.backgroundElement : undefined} paddingRight={1}>
                                <text fg={isActive() ? tint(theme.textMuted, theme.secondary, 0.6) : theme.textMuted}>
                                  {`${letters[i()]}.`}
                                </text>
                              </box>
                              <box backgroundColor={isActive() ? theme.backgroundElement : undefined}>
                                <text fg={textColor()}>
                                  {isMulti() ? `[${picked() ? "✓" : " "}] ${opt.label}` : opt.label}
                                </text>
                              </box>
                              <Show when={!isMulti()}>
                                <text fg={theme.success}>{picked() ? "✓" : ""}</text>
                              </Show>
                            </box>
                            <box paddingLeft={3}>
                              <text fg={theme.textMuted}>{opt.description}</text>
                            </box>
                          </box>
                        )
                      }}
                    </For>
                    <box
                      onMouseOver={() => {
                        if (active()) moveTo(opts().length)
                      }}
                      onMouseUp={() => {
                        setFocus(true)
                        if (!active()) {
                          setStore("tab", index())
                          setStore("selected", opts().length)
                          queueMicrotask(() => selectOption())
                          return
                        }
                        selectOption()
                      }}
                    >
                      <box flexDirection="row">
                        <box
                          backgroundColor={active() && other() ? theme.backgroundElement : undefined}
                          paddingRight={1}
                        >
                          <text
                            fg={active() && other() ? tint(theme.textMuted, theme.secondary, 0.6) : theme.textMuted}
                          >
                            D.
                          </text>
                        </box>
                        <box backgroundColor={active() && other() ? theme.backgroundElement : undefined}>
                          <text
                            fg={
                              active() && other()
                                ? theme.secondary
                                : customSelected()
                                  ? theme.success
                                  : active()
                                    ? theme.text
                                    : theme.textMuted
                            }
                          >
                            {isMulti()
                              ? `[${customSelected() ? "✓" : " "}] Type your own answer`
                              : "Type your own answer"}
                          </text>
                        </box>
                        <Show when={!isMulti()}>
                          <text fg={theme.success}>{customSelected() ? "✓" : ""}</text>
                        </Show>
                      </box>
                      <Show when={active() && store.editing}>
                        <box paddingLeft={3}>
                          <textarea
                            ref={(val: TextareaRenderable) => {
                              textarea = val
                              queueMicrotask(() => {
                                val.focus()
                                val.gotoLineEnd()
                              })
                            }}
                            initialValue={input()}
                            placeholder="Type your own answer"
                            textColor={theme.text}
                            focusedTextColor={theme.text}
                            cursorColor={theme.primary}
                            keyBindings={bindings()}
                          />
                        </box>
                      </Show>
                      <Show when={!store.editing && customValue()}>
                        <box paddingLeft={3}>
                          <text fg={theme.textMuted}>{customValue()}</text>
                        </box>
                      </Show>
                    </box>
                  </box>
                </box>
              </box>
            )
          }}
        </For>
      </box>
      <box
        flexDirection="row"
        flexShrink={0}
        gap={1}
        paddingLeft={2}
        paddingRight={3}
        paddingBottom={1}
        justifyContent="space-between"
      >
        <box flexDirection="row" gap={2}>
          <text fg={theme.text}>
            {"↑↓"} <span style={{ fg: theme.textMuted }}>select</span>
          </text>
          <text fg={theme.text}>
            A-D/1-4 <span style={{ fg: theme.textMuted }}>choose</span>
          </text>
          <text fg={theme.text}>
            enter <span style={{ fg: theme.textMuted }}>{multi() ? "next" : "pick"}</span>
          </text>
          <text fg={theme.text}>
            {keybind.print("question_previous")} <span style={{ fg: theme.textMuted }}>previous</span>
          </text>
          <text fg={theme.text}>
            {keybind.print("question_clear")} <span style={{ fg: theme.textMuted }}>clear</span>
          </text>
          <text fg={theme.text}>
            {focusKey()} <span style={{ fg: theme.textMuted }}>{focused() ? "unfocus" : "focus"}</span>
          </text>
          <Show when={multi()}>
            <text fg={theme.text}>
              space <span style={{ fg: theme.textMuted }}>toggle</span>
            </text>
          </Show>

          <text fg={theme.text}>
            esc <span style={{ fg: theme.textMuted }}>dismiss</span>
          </text>
        </box>
      </box>
    </box>
  )
}

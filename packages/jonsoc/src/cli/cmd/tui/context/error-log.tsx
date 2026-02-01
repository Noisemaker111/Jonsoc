import { createContext, useContext, type ParentProps } from "solid-js"
import { createStore } from "solid-js/store"

export interface ErrorEntry {
  id: string
  timestamp: number
  message: string
  stack?: string
  source?: string
}

export function init() {
  const [store, setStore] = createStore({
    errors: [] as ErrorEntry[],
  })

  const errorLog = {
    add(error: Error | string, source?: string) {
      const entry: ErrorEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        timestamp: Date.now(),
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        source,
      }
      setStore("errors", (prev) => [...prev, entry])
    },
    clear() {
      setStore("errors", [])
    },
    get errors(): ErrorEntry[] {
      return store.errors
    },
    get count(): number {
      return store.errors.length
    },
  }
  return errorLog
}

export type ErrorLogContext = ReturnType<typeof init>

const ctx = createContext<ErrorLogContext>()

export function ErrorLogProvider(props: ParentProps & { value?: ErrorLogContext }) {
  const value = props.value ?? init()
  return <ctx.Provider value={value}>{props.children}</ctx.Provider>
}

export function useErrorLog() {
  const value = useContext(ctx)
  if (!value) {
    throw new Error("useErrorLog must be used within an ErrorLogProvider")
  }
  return value
}

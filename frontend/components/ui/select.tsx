'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Native-<select> wrapper that matches the shadcn Select API used in the app:
//   <Select value={v} onValueChange={(v) => ...}>
//     <SelectTrigger className="..."><SelectValue placeholder="..." /></SelectTrigger>
//     <SelectContent>
//       <SelectItem value="X">Label</SelectItem>
//     </SelectContent>
//   </Select>
//
// We collect SelectItem children, render a styled native <select>, and use
// the placeholder from SelectValue when value is empty.

type SelectContextValue = {
  value: string
  onValueChange: (v: string) => void
  triggerClassName: string
  setTriggerClassName: (v: string) => void
  placeholder: string
  setPlaceholder: (v: string) => void
  disabled?: boolean
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext(component: string) {
  const ctx = React.useContext(SelectContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used inside <Select>`)
  }
  return ctx
}

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children?: React.ReactNode
}

function Select({
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? '')
  const isControlled = controlledValue !== undefined
  const value = isControlled ? (controlledValue ?? '') : uncontrolledValue

  const handleChange = React.useCallback(
    (v: string) => {
      if (!isControlled) setUncontrolledValue(v)
      onValueChange?.(v)
    },
    [isControlled, onValueChange]
  )

  const [triggerClassName, setTriggerClassName] = React.useState('')
  const [placeholder, setPlaceholder] = React.useState('')

  // Collect <SelectItem> options by walking children recursively.
  const options = React.useMemo(() => collectItems(children), [children])

  const ctxValue = React.useMemo<SelectContextValue>(
    () => ({
      value,
      onValueChange: handleChange,
      triggerClassName,
      setTriggerClassName,
      placeholder,
      setPlaceholder,
      disabled,
    }),
    [value, handleChange, triggerClassName, placeholder, disabled]
  )

  return (
    <SelectContext.Provider value={ctxValue}>
      {/* Render trigger/content children so they can register placeholder + className via refs */}
      <div className="hidden">{children}</div>
      <NativeSelect options={options} />
    </SelectContext.Provider>
  )
}

type CollectedItem = { value: string; label: React.ReactNode; disabled?: boolean }

function collectItems(children: React.ReactNode): CollectedItem[] {
  const out: CollectedItem[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const childType = child.type as unknown
    // SelectItem: capture value/label
    if (childType === SelectItem) {
      const props = child.props as {
        value: string
        children?: React.ReactNode
        disabled?: boolean
      }
      out.push({
        value: props.value,
        label: props.children,
        disabled: props.disabled,
      })
      return
    }
    // Otherwise recurse into children to find items inside <SelectContent>, groups, etc.
    const props = child.props as { children?: React.ReactNode } | null
    if (props && props.children) {
      out.push(...collectItems(props.children))
    }
  })
  return out
}

function NativeSelect({ options }: { options: CollectedItem[] }) {
  const ctx = useSelectContext('Select')
  const { value, onValueChange, triggerClassName, placeholder, disabled } = ctx

  const showPlaceholder = value === '' || value === undefined
  const hasEmptyOption = options.some((o) => o.value === '')

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        className={cn(
          // Default styles (look like input-base); can be overridden by triggerClassName
          'input-base h-auto appearance-none pr-9 bg-white cursor-pointer',
          showPlaceholder && 'text-slate-400',
          triggerClassName
        )}
      >
        {!hasEmptyOption && (
          <option value="" disabled hidden>
            {placeholder || 'Select…'}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {typeof opt.label === 'string' || typeof opt.label === 'number'
              ? opt.label
              : flattenLabel(opt.label)}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary"
        aria-hidden
      />
    </div>
  )
}

function flattenLabel(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenLabel).join('')
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode }
    return flattenLabel(props.children)
  }
  return ''
}

// --- API-compatible sub-components (mostly no-ops; metadata flows via context) ---

function SelectTrigger({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
  size?: 'sm' | 'default'
}) {
  const ctx = useSelectContext('SelectTrigger')
  // Register className on parent so the rendered native <select> picks it up.
  React.useEffect(() => {
    ctx.setTriggerClassName(className ?? '')
  }, [className, ctx])
  return <>{children}</>
}

function SelectValue({ placeholder }: { placeholder?: string; className?: string }) {
  const ctx = useSelectContext('SelectValue')
  React.useEffect(() => {
    if (placeholder !== undefined) ctx.setPlaceholder(placeholder)
  }, [placeholder, ctx])
  return null
}

function SelectContent({ children }: { children?: React.ReactNode; className?: string }) {
  // Children (SelectItem...) are walked by Select to build <option>s.
  return <>{children}</>
}

function SelectItem({
  children,
}: {
  value: string
  disabled?: boolean
  children?: React.ReactNode
  className?: string
}) {
  // Rendered indirectly via <option>; this component is a metadata carrier.
  return <>{children}</>
}

function SelectGroup({ children }: { children?: React.ReactNode; className?: string }) {
  return <>{children}</>
}

function SelectLabel({ children }: { children?: React.ReactNode; className?: string }) {
  return <>{children}</>
}

function SelectSeparator() {
  return null
}

function SelectScrollUpButton() {
  return null
}

function SelectScrollDownButton() {
  return null
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}

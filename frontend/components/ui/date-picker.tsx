"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

const ACCENT = '#F0623A'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className, disabled }: DatePickerProps) {
  const parsed = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
  const date = parsed && isValid(parsed) ? parsed : undefined
  const now = new Date()

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "input-base h-auto w-full inline-flex items-center justify-start text-left font-normal",
          !date && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-textSecondary" />
        {date
          ? <span className="font-semibold text-textPrimary">{format(date, "MMM d, yyyy")}</span>
          : <span className="text-textSecondary">{placeholder}</span>
        }
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="calendar-accent">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
            captionLayout="dropdown"
            startMonth={new Date(now.getFullYear() - 5, 0)}
            endMonth={new Date(now.getFullYear() + 5, 11)}
          />
          <div className="border-t border-border px-3 py-2.5">
            <button
              type="button"
              className="w-full text-xs font-bold py-1.5 rounded-lg transition-colors hover:bg-[#FFF2EF]"
              style={{ color: ACCENT }}
              onClick={() => onChange(format(now, "yyyy-MM-dd"))}
            >
              Today
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateTimePicker({ value, onChange, placeholder = "Pick date", className, disabled }: DateTimePickerProps) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""]
  const parsed = datePart ? parse(datePart, "yyyy-MM-dd", new Date()) : undefined
  const date = parsed && isValid(parsed) ? parsed : undefined
  const now = new Date()

  function handleDateSelect(d: Date | undefined) {
    const newDate = d ? format(d, "yyyy-MM-dd") : ""
    onChange(newDate ? `${newDate}T${timePart || "00:00"}` : "")
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(datePart ? `${datePart}T${e.target.value}` : "")
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            "input-base h-auto flex-1 inline-flex items-center justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-textSecondary" />
          {date
            ? <span className="font-semibold text-textPrimary">{format(date, "MMM d, yyyy")}</span>
            : <span className="text-textSecondary">{placeholder}</span>
          }
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="calendar-accent">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              captionLayout="dropdown"
              startMonth={new Date(now.getFullYear() - 5, 0)}
              endMonth={new Date(now.getFullYear() + 5, 11)}
            />
            <div className="border-t border-border px-3 py-2.5">
              <button
                type="button"
                className="w-full text-xs font-bold py-1.5 rounded-lg transition-colors hover:bg-[#FFF2EF]"
                style={{ color: ACCENT }}
                onClick={() => handleDateSelect(now)}
              >
                Today
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        className="input-base h-auto w-28"
        value={timePart || ""}
        onChange={handleTimeChange}
        disabled={disabled}
      />
    </div>
  )
}

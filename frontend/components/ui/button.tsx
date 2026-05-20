'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:     'bg-primary text-white hover:opacity-90 active:opacity-80',
        outline:     'border border-border bg-white text-textPrimary hover:bg-gray-50 active:bg-gray-100',
        ghost:       'text-textSecondary hover:bg-gray-100 hover:text-textPrimary active:bg-gray-200',
        destructive: 'bg-highlight text-white hover:opacity-90',
        secondary:   'bg-secondary text-white hover:opacity-90',
        link:        'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default:   'h-9 px-4 py-2',
        sm:        'h-8 rounded-md px-3 text-xs',
        lg:        'h-11 rounded-xl px-8',
        xs:        'h-6 rounded-md px-2 text-xs',
        icon:      'h-9 w-9',
        'icon-xs': 'h-6 w-6',
        'icon-sm': 'h-7 w-7',
        'icon-lg': 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

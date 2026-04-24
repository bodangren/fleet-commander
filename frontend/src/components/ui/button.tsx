import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-150 active:translate-y-1 active:shadow-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground border-4 border-primary shadow-[4px_4px_0px_0px_hsl(var(--secondary))] hover:shadow-[6px_6px_0px_0px_hsl(var(--secondary))]',
        destructive:
          'bg-destructive text-destructive-foreground border-4 border-destructive shadow-[4px_4px_0px_0px_hsl(var(--primary))]',
        outline:
          'border-4 border-border bg-transparent hover:bg-accent hover:text-accent-foreground shadow-[4px_4px_0px_0px_hsl(var(--secondary))]',
        secondary:
          'bg-secondary text-secondary-foreground border-4 border-secondary shadow-[4px_4px_0px_0px_hsl(var(--primary))] hover:shadow-[6px_6px_0px_0px_hsl(var(--primary))]',
        ghost: 'hover:bg-accent hover:text-accent-foreground border-4 border-transparent',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-10 px-4 text-xs',
        lg: 'h-14 px-10 text-lg',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }

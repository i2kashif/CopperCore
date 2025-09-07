import { HTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const cardVariants = cva('bg-white rounded-2xl', {
  variants: {
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    shadow: {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
    },
  },
  defaultVariants: {
    padding: 'md',
    shadow: 'xl',
  },
})

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding, shadow, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cardVariants({ padding, shadow, className })}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'

export { Card, cardVariants }
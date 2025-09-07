import { forwardRef, InputHTMLAttributes, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const inputVariants = cva(
  'block w-full rounded-xl border bg-white px-4 py-2.5 text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-copper-500 focus:border-copper-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
  {
    variants: {
      error: {
        true: 'border-red-500 focus:ring-red-500 focus:border-red-500',
        false: 'border-slate-300',
      },
    },
    defaultVariants: {
      error: false,
    },
  }
)

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  helperText?: string
  errorMessage?: string
  startIcon?: ReactNode
  endIcon?: ReactNode
  onEndIconClick?: () => void
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      id,
      label,
      helperText,
      errorMessage,
      startIcon,
      endIcon,
      onEndIconClick,
      error,
      className,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const hasError = error || !!errorMessage
    const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`
    const errorId = `${fieldId}-error`
    const helperId = `${fieldId}-helper`

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={fieldId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={fieldId}
            className={inputVariants({
              error: hasError,
              className: `${startIcon ? 'pl-10' : ''} ${endIcon ? 'pr-10' : ''} ${className}`,
            })}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            {...props}
          />
          {endIcon && (
            <div 
              className={`absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 ${
                onEndIconClick ? 'cursor-pointer' : 'pointer-events-none'
              }`}
              onClick={onEndIconClick}
            >
              {endIcon}
            </div>
          )}
        </div>
        {errorMessage && (
          <p id={errorId} className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}
        {helperText && !errorMessage && (
          <p id={helperId} className="text-sm text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

TextField.displayName = 'TextField'
// eslint-disable-next-line react-refresh/only-export-components
export { TextField, inputVariants }

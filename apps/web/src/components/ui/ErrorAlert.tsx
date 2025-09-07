import { HTMLAttributes } from 'react'

export interface ErrorAlertProps extends HTMLAttributes<HTMLDivElement> {
  message: string
}

export function ErrorAlert({ message, className, ...props }: ErrorAlertProps) {
  if (!message) return null

  return (
    <div
      role="alert"
      className={`rounded-xl bg-red-50 border border-red-200 p-4 ${className || ''}`}
      {...props}
    >
      <div className="flex gap-3">
        <svg
          className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm font-medium text-red-800">{message}</p>
      </div>
    </div>
  )
}
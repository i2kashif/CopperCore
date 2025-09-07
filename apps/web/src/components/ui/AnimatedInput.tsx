import { motion } from 'framer-motion'
import { useState } from 'react'
import { cn } from '../../lib/utils'

interface AnimatedInputProps {
  id: string
  name: string
  type: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  autoComplete?: string
  required?: boolean
  icon?: React.ReactNode
}

export function AnimatedInput({
  id,
  name,
  type,
  label,
  value,
  onChange,
  disabled = false,
  autoComplete,
  required = false,
  icon
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const hasValue = value.length > 0

  return (
    <div className="relative">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
            {icon}
          </div>
        )}
        
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          autoComplete={autoComplete}
          required={required}
          className={cn(
            'peer w-full px-4 py-4 pt-6',
            icon ? 'pl-12' : 'pl-4',
            'text-gray-900 bg-white/80 backdrop-blur-sm',
            'border-2 rounded-xl transition-all duration-200',
            'focus:outline-none focus:ring-0',
            isFocused ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-gray-200',
            'disabled:bg-gray-50 disabled:text-gray-500',
            'placeholder-transparent'
          )}
          placeholder={label}
        />
        
        <motion.label
          htmlFor={id}
          className={cn(
            'absolute left-4 transition-all duration-200 pointer-events-none',
            icon ? 'left-12' : 'left-4',
            'text-gray-500',
            hasValue || isFocused
              ? 'top-2 text-xs font-medium text-blue-600'
              : 'top-1/2 -translate-y-1/2 text-base'
          )}
          animate={{
            y: hasValue || isFocused ? 0 : 0,
            scale: hasValue || isFocused ? 0.85 : 1,
          }}
        >
          {label}
        </motion.label>
        
        {/* Focus ring animation */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: isFocused ? 1 : 0,
            scale: isFocused ? 1 : 0.95
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
        </motion.div>
      </div>
    </div>
  )
}
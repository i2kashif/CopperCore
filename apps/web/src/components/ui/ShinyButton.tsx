import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { ReactNode } from 'react'

interface ShinyButtonProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function ShinyButton({ 
  children, 
  className, 
  onClick, 
  disabled = false,
  type = 'button' 
}: ShinyButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center justify-center px-8 py-4',
        'font-medium text-white transition-all duration-200',
        'bg-gradient-to-r from-blue-600 to-blue-700',
        'rounded-xl shadow-lg hover:shadow-xl',
        'hover:scale-105 active:scale-100',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'overflow-hidden group',
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
      
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 -top-2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'linear',
          repeatDelay: 1
        }}
      />
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl" />
      </div>
    </motion.button>
  )
}
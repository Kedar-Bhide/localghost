import { forwardRef, ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        className={clsx(
          // Base styles
          'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          // Variants
          {
            'btn-primary': variant === 'primary',
            'btn-secondary': variant === 'secondary',
            'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:ring-neutral-400': variant === 'ghost',
          },
          // Sizes
          {
            'py-2 px-4 text-sm min-h-[36px]': size === 'sm',
            'py-3 px-6 text-body min-h-tap-target': size === 'md',
            'py-4 px-8 text-body-lg min-h-[52px]': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
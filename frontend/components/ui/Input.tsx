import { forwardRef, InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, fullWidth = true, ...props }, ref) => {
    return (
      <div className={clsx('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label className="block text-small font-medium text-neutral-900 mb-2">
            {label}
          </label>
        )}
        <input
          className={clsx(
            'input-field',
            error && 'border-primary focus:ring-primary',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <span className="mt-1 text-small text-primary">
            {error}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
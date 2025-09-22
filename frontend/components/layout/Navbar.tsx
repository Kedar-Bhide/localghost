import Link from 'next/link'
import { useRouter } from 'next/router'
import { clsx } from 'clsx'

export function Navbar() {
  const router = useRouter()

  const navigation = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Browse', href: '/browse', icon: '👀' },
    { name: 'Search', href: '/search', icon: '🔍' },
    { name: 'Messages', href: '/messages', icon: '💬' },
    { name: 'Profile', href: '/profile', icon: '👤' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
      <div className="container-mobile md:container-tablet lg:container-desktop">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LG</span>
            </div>
            <span className="font-bold text-xl text-neutral-900 hidden sm:block">
              LocalGhost
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = router.pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center space-x-1 px-3 py-2 rounded-2xl text-body font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <button className="p-2 rounded-2xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-all duration-200">
              <span className="text-xl">☰</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (simplified - could be enhanced with state management) */}
      <div className="md:hidden border-t border-neutral-200 bg-white">
        <div className="container-mobile">
          <div className="flex justify-around py-2">
            {navigation.map((item) => {
              const isActive = router.pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex flex-col items-center space-y-1 p-2 rounded-2xl min-w-tap-target min-h-tap-target transition-all duration-200',
                    isActive
                      ? 'text-primary'
                      : 'text-neutral-600'
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
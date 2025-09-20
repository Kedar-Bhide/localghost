import { Navbar } from './Navbar'

interface LayoutProps {
  children: React.ReactNode
  showNavbar?: boolean
}

export function Layout({ children, showNavbar = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      {showNavbar && <Navbar />}
      <main className={showNavbar ? 'pt-16 md:pt-16' : ''}>
        {children}
      </main>
    </div>
  )
}
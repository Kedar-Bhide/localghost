import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Button, Input, Card, CardHeader, CardContent } from '../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Mock login for now
      console.log('Login attempt:', { email, password })
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      router.push('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12">
      <div className="container-mobile md:container-tablet lg:max-w-md lg:mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Link href="/">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-airbnb cursor-pointer hover:bg-primary-hover transition-colors">
                <span className="text-2xl font-bold text-white">LG</span>
              </div>
            </Link>
          </div>
          <h1 className="text-headline md:text-headline-lg text-neutral-900 mb-2">
            Welcome back
          </h1>
          <p className="text-body text-neutral-600">
            Sign in to your LocalGhost account
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email address"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary bg-white border-neutral-300 rounded focus:ring-primary focus:ring-2"
                  />
                  <span className="text-small text-neutral-600">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-small text-primary hover:text-primary-hover font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-small text-neutral-600">
                Don't have an account?{' '}
                <Link href="/signup" className="text-primary hover:text-primary-hover font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
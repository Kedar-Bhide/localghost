import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Button, Input, Card, CardContent } from '../components/ui'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'traveler' as 'traveler' | 'local'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setIsLoading(true)
    try {
      // Mock signup for now
      console.log('Signup attempt:', formData)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      router.push('/dashboard')
    } catch (error) {
      console.error('Signup error:', error)
      setError('Failed to create account. Please try again.')
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
            Join LocalGhost
          </h1>
          <p className="text-body text-neutral-600">
            Create your account to start connecting with locals
          </p>
        </div>

        {/* Signup Form */}
        <Card>
          <CardContent>
            {error && (
              <div className="mb-6 bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-small font-medium text-primary">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First name"
                  name="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Last name"
                  name="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>

              <Input
                label="Email address"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <div>
                <label className="block text-small font-medium text-neutral-900 mb-2">
                  I want to
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="traveler">Explore as a Traveler</option>
                  <option value="local">Share as a Local</option>
                </select>
              </div>

              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <Input
                label="Confirm password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />


              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-small text-neutral-600">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:text-primary-hover font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
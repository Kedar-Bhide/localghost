import Link from 'next/link'
import Head from 'next/head'
import { Button, Card } from '../components/ui'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>LocalGhost - Connect with Local Travel Experts</title>
        <meta name="description" content="Connect with locals for authentic travel experiences. Discover hidden gems and create lasting memories around the world." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/90 to-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container-mobile md:container-tablet lg:container-desktop py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-airbnb">
                <span className="text-3xl font-bold text-white">LG</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Connect with locals,<br />
              <span className="text-accent-200">discover hidden gems</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
              LocalGhost bridges travelers with local hosts for authentic experiences in every destination.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-white text-primary hover:bg-neutral-100 shadow-airbnb">
                  Get Started
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="secondary" size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white/10">
                  Find Local Guides
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="lg" className="text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-neutral-50">
        <div className="container-mobile md:container-tablet lg:container-desktop">
          <div className="text-center mb-16">
            <h2 className="text-headline md:text-headline-lg text-neutral-900 mb-4">
              How LocalGhost works
            </h2>
            <p className="text-body-lg text-neutral-600 max-w-2xl mx-auto">
              Whether you're exploring a new city or sharing your hometown, LocalGhost makes authentic connections simple.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                Discover Locals
              </h3>
              <p className="text-body text-neutral-600">
                Find verified local hosts who know the best spots, hidden gems, and authentic experiences in their city.
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                Connect & Chat
              </h3>
              <p className="text-body text-neutral-600">
                Message directly with locals to plan meetups, get recommendations, and build genuine connections.
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                Create Memories
              </h3>
              <p className="text-body text-neutral-600">
                Experience destinations like a local and create lasting memories that go beyond typical tourist attractions.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-accent/10 to-primary/10 py-20">
        <div className="container-mobile md:container-tablet lg:container-desktop">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-headline md:text-headline-lg text-neutral-900 mb-6">
              Ready to start your local adventure?
            </h2>
            <p className="text-body-lg text-neutral-600 mb-8">
              Join thousands of travelers and locals creating authentic connections around the world.
            </p>
            <Link href="/signup">
              <Button size="lg" className="shadow-airbnb">
                Join LocalGhost
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12">
        <div className="container-mobile md:container-tablet lg:container-desktop">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LG</span>
              </div>
              <span className="font-bold text-xl">LocalGhost</span>
            </div>
            <div className="flex space-x-6 text-small">
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link href="/support" className="hover:text-primary transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
import type { NextPage } from 'next'
import Head from 'next/head'

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>LocalGhost - Connect with Local Travel Experts</title>
        <meta name="description" content="A peer-to-peer travel connection platform where travelers connect directly with locals for authentic guidance, recommendations, and companionship." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-8">
            Welcome to <span className="text-indigo-600">LocalGhost</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            A peer-to-peer travel connection platform where travelers connect directly with locals 
            for authentic guidance, recommendations, and companionship in exploring destinations.
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              🚧 Development in Progress
            </h2>
            
            <div className="space-y-4 text-left">
              <div className="flex items-center space-x-3">
                <span className="text-green-500">✅</span>
                <span>Production Infrastructure Setup Complete</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-500">✅</span>
                <span>Database Schema Deployed</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-green-500">✅</span>
                <span>Frontend & Backend Deployed</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-yellow-500">🔄</span>
                <span>Feature Development Starting Soon</span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">API Status</h3>
              <p className="text-sm text-gray-600">
                Backend API: <a href="https://localghost.onrender.com/api/v1" 
                className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://localghost.onrender.com/api/v1
                </a>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                API Documentation: <a href="https://localghost.onrender.com/docs" 
                className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://localghost.onrender.com/docs
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home
'use client'

import { useState } from 'react'

export default function TestAPIPage() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const addResult = (test, status, message, data = null) => {
    setResults(prev => [...prev, { test, status, message, data, time: new Date().toLocaleTimeString() }])
  }

  const runTests = async () => {
    setResults([])
    setLoading(true)

    // Test 1: Check API_BASE_URL
    addResult('Environment Variable', 'info', `NEXT_PUBLIC_API_URL = ${process.env.NEXT_PUBLIC_API_URL || 'NOT SET'}`)
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    addResult('Using API URL', 'info', API_URL)

    // Test 2: Check if backend is reachable
    try {
      addResult('Backend Connectivity', 'testing', 'Testing connection to backend...')
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'test', password: 'test' })
      })
      
      if (response.ok || response.status === 401) {
        addResult('Backend Connectivity', 'success', `Backend is reachable! Status: ${response.status}`)
      } else {
        addResult('Backend Connectivity', 'warning', `Backend responded with status: ${response.status}`)
      }
    } catch (error) {
      addResult('Backend Connectivity', 'error', `Failed to connect: ${error.message}`)
    }

    // Test 3: Test login with correct credentials
    try {
      addResult('Login Test', 'testing', 'Testing login with hm001/hm123...')
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'hm001', password: 'hm123' })
      })
      
      const data = await response.json()
      
      if (response.ok && data.access_token) {
        addResult('Login Test', 'success', 'Login successful! Token received.', { tokenPreview: data.access_token.substring(0, 50) + '...' })
        
        // Test 4: Test authenticated API call
        try {
          addResult('My Requests API', 'testing', 'Testing GET /rrf/my-requests...')
          const rrfResponse = await fetch(`${API_URL}/rrf/my-requests`, {
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          const rrfData = await rrfResponse.json()
          
          if (rrfResponse.ok) {
            addResult('My Requests API', 'success', `Success! Retrieved ${rrfData.data?.length || 0} RRFs`, rrfData)
          } else {
            addResult('My Requests API', 'error', `Failed: ${rrfData.message}`, rrfData)
          }
        } catch (error) {
          addResult('My Requests API', 'error', `Request failed: ${error.message}`)
        }
      } else {
        addResult('Login Test', 'error', `Login failed: ${data.message}`, data)
      }
    } catch (error) {
      addResult('Login Test', 'error', `Login request failed: ${error.message}`)
    }

    // Test 5: Check localStorage
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (token) {
      addResult('localStorage Check', 'success', 'Auth token found in localStorage', { tokenPreview: token.substring(0, 50) + '...' })
    } else {
      addResult('localStorage Check', 'warning', 'No auth token in localStorage. User needs to login.')
    }
    if (user) {
      addResult('User Data', 'info', 'User data found', { user: JSON.parse(user) })
    }

    setLoading(false)
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-300'
      case 'error': return 'bg-red-100 text-red-800 border-red-300'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'testing': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'info': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'testing': return '🔄'
      case 'info': return 'ℹ️'
      default: return '•'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 API Connection Diagnostics</h1>
          <p className="text-gray-600 mb-6">Test backend API connectivity and authentication</p>
          
          <button
            onClick={runTests}
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '🔄 Running Tests...' : '▶️ Run All Tests'}
          </button>

          {results.length > 0 && (
            <div className="mt-8 space-y-3">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Results:</h2>
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className={`border-2 rounded-lg p-4 ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getStatusIcon(result.status)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{result.test}</h3>
                        <span className="text-xs opacity-75">{result.time}</span>
                      </div>
                      <p className="text-sm">{result.message}</p>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer hover:underline">View data</summary>
                          <pre className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">💡 How to use:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Click "Run All Tests" to diagnose connection issues</li>
              <li>Check which tests pass (✅) and which fail (❌)</li>
              <li>If "Backend Connectivity" fails, ensure backend is running: <code className="bg-blue-100 px-1 rounded">docker-compose up -d</code></li>
              <li>If "Login Test" fails, verify correct credentials are seeded</li>
              <li>Clear browser cache and localStorage if needed</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

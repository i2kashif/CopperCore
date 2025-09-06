import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Scanner from './components/Scanner'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  CopperCore ERP
                </h1>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Scanner />} />
            <Route path="/scanner" element={<Scanner />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
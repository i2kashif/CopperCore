import { useState } from 'react'

export default function Scanner() {
  const [scannedData, setScannedData] = useState<string>('')
  const [inputValue, setInputValue] = useState<string>('')

  const handleScan = () => {
    if (inputValue.trim()) {
      setScannedData(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan()
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            QR/Barcode Scanner
          </h2>
          <p className="text-gray-600 mb-6">
            Scan or manually enter PU codes, DN numbers, or other identifiers
          </p>
          
          <div className="max-w-md mx-auto">
            <div className="flex rounded-md shadow-sm">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Enter or scan code..."
                autoFocus
              />
              <button
                onClick={handleScan}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm hover:bg-gray-100"
              >
                Scan
              </button>
            </div>
          </div>

          {scannedData && (
            <div className="mt-6 p-4 bg-green-50 rounded-md">
              <h3 className="text-sm font-medium text-green-800">
                Scanned Data:
              </h3>
              <p className="mt-1 text-sm text-green-600 font-mono">
                {scannedData}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
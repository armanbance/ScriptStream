// App.jsx — the root React component
// Everything you see on the page starts here.

import { useState } from 'react'
import './App.css'

function App() {
  // useState(0) creates a piece of state called 'count' starting at 0.
  // Calling setCount() with a new value re-renders the component.
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>ScriptStream</h1>

      <p>Your React + Vite frontend is running.</p>

      {/* Counter — demonstrates React state updating the UI */}
      <div className="card">
        <p>Count: <strong>{count}</strong></p>
        <button onClick={() => setCount(count + 1)}>Increment</button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>

      <p className="hint">
        Edit <code>src/App.jsx</code> and save — the page updates instantly.
      </p>
    </div>
  )
}

export default App

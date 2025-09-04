'use client'

import { useState } from 'react'

export default function Home() {
  console.log('Minimal Page Rendering')
  const [searchQuery, setSearchQuery] = useState('')
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Describe It - Spanish Learning App</h1>
      <p>App is loading successfully!</p>
      
      <div style={{ marginTop: '20px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for images..."
          style={{ 
            padding: '10px', 
            width: '300px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <button 
          style={{
            padding: '10px 20px',
            marginLeft: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Search
        </button>
      </div>
      
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h2>Status: Working!</h2>
        <p>React is rendering correctly.</p>
        <p>Search query: "{searchQuery}"</p>
      </div>
    </div>
  )
}
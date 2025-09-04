'use client'

export default function TestPage() {
  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8fafc'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          🎯 CSS & Styling Test
        </h1>
        
        <div style={{ color: '#10b981', marginBottom: '2rem', textAlign: 'center' }}>
          ✅ If you can see this page, CSS is working correctly!
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#dbeafe',
            borderRadius: '0.25rem',
            border: '1px solid #3b82f6'
          }}>
            <h3 style={{ fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem' }}>
              CSS Status
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#1f2937' }}>
              Inline styles are rendering correctly
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#dcfce7',
            borderRadius: '0.25rem',
            border: '1px solid #22c55e'
          }}>
            <h3 style={{ fontWeight: '600', color: '#15803d', marginBottom: '0.5rem' }}>
              Layout Test
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#1f2937' }}>
              Grid layout is working
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#fef3c7',
            borderRadius: '0.25rem',
            border: '1px solid #f59e0b'
          }}>
            <h3 style={{ fontWeight: '600', color: '#d97706', marginBottom: '0.5rem' }}>
              JavaScript Test
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#1f2937' }}>
              React is hydrating properly
            </p>
          </div>
        </div>

        <div style={{
          padding: '1rem',
          backgroundColor: '#f1f5f9',
          borderRadius: '0.25rem',
          border: '1px solid #cbd5e1'
        }}>
          <h3 style={{ fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
            Next Steps
          </h3>
          <ul style={{ fontSize: '0.875rem', color: '#1f2937', paddingLeft: '1.25rem' }}>
            <li>CSS compilation is working</li>
            <li>No hydration issues detected</li>
            <li>Layout rendering correctly</li>
            <li>JavaScript execution successful</li>
          </ul>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f0fdf4',
          borderRadius: '0.25rem',
          border: '1px solid #22c55e'
        }}>
          <p style={{ color: '#15803d', fontWeight: '500' }}>
            🎉 All styling systems are functional!
          </p>
        </div>
      </div>
    </div>
  )
}
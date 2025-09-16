/**
 * Storage cleanup endpoint
 * Helps users clear localStorage when quota is exceeded
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Storage cleanup endpoint',
    instructions: 'Open browser console and run: localStorage.clear(); sessionStorage.clear(); location.reload()',
    script: `
// Copy and paste this in your browser console:
(() => {
  console.log('Starting storage cleanup...');
  
  // Get current usage
  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return (total / 1024).toFixed(2) + ' KB';
  };
  
  console.log('Current localStorage usage:', getStorageSize());
  
  // Clear analytics and error data
  const keysToRemove = [];
  for (let key in localStorage) {
    if (key.includes('analytics') || 
        key.includes('error') || 
        key.includes('sentry') ||
        key.includes('performance') ||
        key.includes('webvitals')) {
      keysToRemove.push(key);
    }
  }
  
  console.log('Removing', keysToRemove.length, 'analytics/error keys');
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear old session data
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  for (let key in localStorage) {
    try {
      const value = localStorage.getItem(key);
      if (value && value.includes('timestamp')) {
        const parsed = JSON.parse(value);
        if (parsed.timestamp && parsed.timestamp < oneWeekAgo) {
          localStorage.removeItem(key);
          console.log('Removed old key:', key);
        }
      }
    } catch {}
  }
  
  console.log('Storage after cleanup:', getStorageSize());
  console.log('Cleanup complete! Refreshing page...');
  
  setTimeout(() => location.reload(), 1000);
})();
    `.trim()
  });
}

export async function POST() {
  // Return a script that can be executed client-side
  return new NextResponse(`
<!DOCTYPE html>
<html>
<head>
  <title>Storage Cleanup</title>
  <style>
    body { 
      font-family: system-ui; 
      padding: 40px; 
      max-width: 800px; 
      margin: 0 auto;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; }
    button { 
      background: #3b82f6; 
      color: white; 
      border: none; 
      padding: 12px 24px; 
      border-radius: 6px; 
      font-size: 16px;
      cursor: pointer;
      margin: 10px 5px;
    }
    button:hover { background: #2563eb; }
    .success { color: #10b981; font-weight: bold; }
    .error { color: #ef4444; }
    .info { 
      background: #f0f9ff; 
      border: 1px solid #3b82f6; 
      padding: 15px; 
      border-radius: 6px;
      margin: 20px 0;
    }
    pre { 
      background: #1e293b; 
      color: #e2e8f0; 
      padding: 15px; 
      border-radius: 6px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧹 Storage Cleanup Tool</h1>
    
    <div class="info">
      <strong>Current Issue:</strong> Your browser's localStorage is full, causing "quota exceeded" errors.
      <br><br>
      <strong>Solution:</strong> Click the button below to clean up unnecessary data.
    </div>
    
    <h2>Storage Status</h2>
    <div id="status">Checking storage...</div>
    
    <h2>Actions</h2>
    <button onclick="cleanAnalytics()">Clean Analytics Data</button>
    <button onclick="cleanAll()">Clear All Storage</button>
    <button onclick="checkStorage()">Check Storage</button>
    
    <h2>Results</h2>
    <pre id="output">Ready to clean...</pre>
  </div>
  
  <script>
    function getStorageSize() {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return (total / 1024).toFixed(2) + ' KB';
    }
    
    function checkStorage() {
      const size = getStorageSize();
      const keys = Object.keys(localStorage).length;
      
      document.getElementById('status').innerHTML = 
        '<strong>Storage Used:</strong> ' + size + '<br>' +
        '<strong>Total Keys:</strong> ' + keys;
      
      document.getElementById('output').textContent = 
        'localStorage keys:\\n' + Object.keys(localStorage).join('\\n');
    }
    
    function cleanAnalytics() {
      const output = document.getElementById('output');
      output.textContent = 'Starting cleanup...\\n';
      
      const before = getStorageSize();
      let removed = 0;
      
      const keysToRemove = [];
      for (let key in localStorage) {
        if (key.includes('analytics') || 
            key.includes('error') || 
            key.includes('sentry') ||
            key.includes('performance') ||
            key.includes('webvitals') ||
            key.includes('events')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        removed++;
      });
      
      const after = getStorageSize();
      
      output.textContent = 
        'Cleanup Complete!\\n\\n' +
        'Before: ' + before + '\\n' +
        'After: ' + after + '\\n' +
        'Keys removed: ' + removed + '\\n\\n' +
        'Page will refresh in 3 seconds...';
      
      output.className = 'success';
      
      setTimeout(() => location.reload(), 3000);
    }
    
    function cleanAll() {
      if (confirm('This will clear ALL localStorage data. Are you sure?')) {
        localStorage.clear();
        sessionStorage.clear();
        
        document.getElementById('output').textContent = 
          'All storage cleared!\\nPage will refresh in 2 seconds...';
        document.getElementById('output').className = 'success';
        
        setTimeout(() => location.reload(), 2000);
      }
    }
    
    // Check storage on load
    checkStorage();
  </script>
</body>
</html>
  `, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
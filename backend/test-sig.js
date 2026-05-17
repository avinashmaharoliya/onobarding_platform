const fs = require('fs');

async function testSignature() {
  try {
    const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    
    const res = await fetch('http://localhost:5000/api/signature', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature: dummyBase64 }) 
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (error) {
    console.log("Error message:", error.message);
  }
}

testSignature();

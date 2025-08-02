// Additional error handling test
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function testAsyncError() {
    console.log('Testing async error handling...\n');
    
    try {
        console.log('🧪 Test async error - Triggering async error in route');
        
        const response = await fetch(`${API_BASE}/api/register-valve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                serialNumber: 'TEST123', 
                details: 'Test valve'
            })
        });
        
        const data = await response.json();
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        
        if (data.success) {
            console.log('   ✅ Async route handled successfully');
        } else {
            console.log('   ❌ Async route failed');
        }
        
    } catch (error) {
        console.log(`   Error: ${error.message} ❌`);
    }
}

testAsyncError();
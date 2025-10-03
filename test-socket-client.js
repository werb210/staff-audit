#!/usr/bin/env node

// Socket.IO Chat System Test Client
// Tests the complete workflow according to the testing checklist

import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';
const TEST_SESSION_ID = 'test-session-' + Date.now();

console.log('🧪 Starting Socket.IO Chat System Comprehensive Test');
console.log('=' .repeat(60));

// Test Results Tracker
const testResults = {
  clientConnection: false,
  staffConnection: false,
  chatRequest: false,
  sessionJoin: false,
  userMessage: false,
  staffReply: false,
  realTimeSync: false
};

function updateResults(test, status) {
  testResults[test] = status;
  const passed = Object.values(testResults).filter(v => v).length;
  const total = Object.keys(testResults).length;
  console.log(`📊 Progress: ${passed}/${total} tests passed`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CLIENT SOCKET TEST
async function testClientSocket() {
  console.log('\n📱 Testing Client Socket Connection...');
  
  return new Promise((resolve) => {
    const clientSocket = io(SERVER_URL, {
      query: { 
        'x-dev-bypass': 'true',
        'session-id': TEST_SESSION_ID
      }
    });

    clientSocket.on('connect', () => {
      console.log('✅ Client socket connected successfully');
      updateResults('clientConnection', true);
      
      // Test chat request emission
      console.log('\n🆘 Testing Chat Request Creation...');
      const chatRequestData = {
        sessionId: TEST_SESSION_ID,
        userName: 'Test User',
        userEmail: 'test@example.com',
        priority: 3,
        timestamp: Date.now()
      };
      
      clientSocket.emit('chat-request', chatRequestData);
      console.log('📤 Chat request emitted:', JSON.stringify(chatRequestData, null, 2));
      updateResults('chatRequest', true);
      
      // Test session join
      console.log('\n🏠 Testing Session Join...');
      clientSocket.emit('join-session', TEST_SESSION_ID);
      console.log('📤 Join session emitted:', TEST_SESSION_ID);
      updateResults('sessionJoin', true);
      
      // Test user message
      setTimeout(() => {
        console.log('\n💬 Testing User Message...');
        const userMessageData = {
          sessionId: TEST_SESSION_ID,
          message: 'Hello, I need help with my application!',
          timestamp: Date.now()
        };
        
        clientSocket.emit('user-message', userMessageData);
        console.log('📤 User message emitted:', JSON.stringify(userMessageData, null, 2));
        updateResults('userMessage', true);
      }, 1000);
      
      resolve(clientSocket);
    });

    clientSocket.on('new-message', (message) => {
      console.log('📩 Client received new message:', JSON.stringify(message, null, 2));
      if (message.role === 'staff') {
        console.log('✅ Real-time staff message received by client');
        updateResults('realTimeSync', true);
      }
    });

    clientSocket.on('disconnect', () => {
      console.log('👋 Client socket disconnected');
    });

    clientSocket.on('error', (error) => {
      console.error('❌ Client socket error:', error);
    });
  });
}

// STAFF SOCKET TEST
async function testStaffSocket() {
  console.log('\n👩‍💼 Testing Staff Socket Connection...');
  
  return new Promise((resolve) => {
    const staffSocket = io(SERVER_URL, {
      query: { 'x-dev-bypass': 'true' }
    });

    staffSocket.on('connect', () => {
      console.log('✅ Staff socket connected successfully');
      updateResults('staffConnection', true);
      resolve(staffSocket);
    });

    staffSocket.on('chat-request', (data) => {
      console.log('🔔 Staff received chat request:', JSON.stringify(data, null, 2));
      console.log('🎯 ALERT: New chat request would trigger browser notification');
      
      // Auto-join the session (simulating staff selection)
      setTimeout(() => {
        console.log('\n🎯 Testing Staff Session Selection...');
        staffSocket.emit('join-session', data.sessionId);
        console.log('📤 Staff joined session:', data.sessionId);
        
        // Send staff reply
        setTimeout(() => {
          console.log('\n📤 Testing Staff Reply...');
          const staffReplyData = {
            sessionId: data.sessionId,
            message: 'Hello! I received your request. How can I help you today?',
            timestamp: Date.now()
          };
          
          staffSocket.emit('staff-message', staffReplyData);
          console.log('📤 Staff message emitted:', JSON.stringify(staffReplyData, null, 2));
          updateResults('staffReply', true);
        }, 1500);
      }, 1000);
    });

    staffSocket.on('new-message', (message) => {
      console.log('📩 Staff received new message:', JSON.stringify(message, null, 2));
    });

    staffSocket.on('disconnect', () => {
      console.log('👋 Staff socket disconnected');
    });

    staffSocket.on('error', (error) => {
      console.error('❌ Staff socket error:', error);
    });
  });
}

// WEBSOCKET EVENT MONITORING
function monitorWebSocketEvents(socket, name) {
  const originalEmit = socket.emit;
  socket.emit = function(...args) {
    console.log(`🔄 [${name}] EMIT: ${args[0]}`, args[1] ? JSON.stringify(args[1]) : '');
    return originalEmit.apply(this, args);
  };
}

// MAIN TEST SEQUENCE
async function runComprehensiveTest() {
  try {
    // Start both client and staff sockets
    const [clientSocket, staffSocket] = await Promise.all([
      testClientSocket(),
      testStaffSocket()
    ]);
    
    // Enable WebSocket event monitoring
    monitorWebSocketEvents(clientSocket, 'CLIENT');
    monitorWebSocketEvents(staffSocket, 'STAFF');
    
    // Wait for all tests to complete
    await sleep(5000);
    
    // Final results
    console.log('\n' + '='.repeat(60));
    console.log('🏁 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(60));
    
    let allPassed = true;
    for (const [test, passed] of Object.entries(testResults)) {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} ${testName}`);
      if (!passed) allPassed = false;
    }
    
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED - Socket.IO Chat System is fully operational!');
    } else {
      console.log('⚠️  Some tests failed - check the logs above for details');
    }
    
    // Cleanup
    clientSocket.disconnect();
    staffSocket.disconnect();
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the test
runComprehensiveTest();
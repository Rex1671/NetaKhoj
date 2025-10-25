import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
    console.log('WebSocket connected');
    // Subscribe with the tempId from the curl request
    ws.send(JSON.stringify({ type: 'subscribe', tempId: 'tmp_080e741303e935cf' }));
});

ws.on('message', (data) => {
    console.log('Received WebSocket message:', data.toString());
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
});

ws.on('close', () => {
    console.log('WebSocket closed');
});

// Keep the script running for a bit
setTimeout(() => {
    ws.close();
}, 15000);

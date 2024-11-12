import { saveSimulationResult } from './database.js';
import { getAuth } from 'firebase/auth';

const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

const GRAVITY = 9.81;
const SCALE = 20;

let ballX = 80;
let ballY = canvas.height - 120;
let time = 0;
let isAnimating = false;
let animationId = null;
let pointScored = false;

let initialVelocity = 20;
let angle = 45;
let velocityX = 0;
let velocityY = 0;

const netX = canvas.width - 200;
const netHeight = 100;
const courtEnd = canvas.width - 50;

function calculateMaxDistance() {
    const angleRad = angle * Math.PI / 180;
    return (initialVelocity * initialVelocity * Math.sin(2 * angleRad)) / GRAVITY;
}

function calculateMaxHeight() {
    const angleRad = angle * Math.PI / 180;
    return (initialVelocity * initialVelocity * Math.sin(angleRad) * Math.sin(angleRad)) / (2 * GRAVITY);
}

function updateDisplays() {
    document.getElementById('velocityValue').textContent = `${initialVelocity} m/s`;
    document.getElementById('angleValue').textContent = `${angle}°`;
    
    const angleRad = angle * Math.PI / 180;
    velocityX = initialVelocity * Math.cos(angleRad);
    velocityY = initialVelocity * Math.sin(angleRad);
    
    document.getElementById('vx').textContent = velocityX.toFixed(2);
    document.getElementById('vy').textContent = velocityY.toFixed(2);
    document.getElementById('maxDistance').textContent = calculateMaxDistance().toFixed(2);
    document.getElementById('maxHeight').textContent = calculateMaxHeight().toFixed(2);
}

function checkPoint(x, y) {
    return x > netX && x < courtEnd && y >= canvas.height - 10;
}

async function startSimulation() {
    if (isAnimating) return;
    
    isAnimating = true;
    pointScored = false;
    time = 0;
    const angleRad = angle * Math.PI / 180;
    velocityX = initialVelocity * Math.cos(angleRad);
    velocityY = initialVelocity * Math.sin(angleRad);
    
    // Save simulation parameters
    try {
        const auth = getAuth();
        if (auth.currentUser) {
            await saveSimulationResult({
                type: 'parabola',
                parameters: {
                    initialVelocity,
                    angle,
                    gravity: GRAVITY
                },
                results: {
                    maxHeight: calculateMaxHeight(),
                    maxDistance: calculateMaxDistance(),
                    timeOfFlight: (2 * velocityY) / GRAVITY
                },
                score: 0,
                createdAt: new Date()
            });
        }
    } catch (error) {
        console.error('Error saving simulation:', error);
    }
    
    animate();
}

function resetSimulation() {
    isAnimating = false;
    pointScored = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    ballX = 80;
    ballY = canvas.height - 80;
    time = 0;
    
    drawScene();
    updateDisplays();
}

function animate() {
    time += 0.016;
    
    const x = ballX + (velocityX * time) * SCALE;
    const y = ballY - (velocityY * time - 0.5 * GRAVITY * time * time) * SCALE;
    
    // Check if ball hits the net
    if (x >= netX && x <= netX + 5 && y > canvas.height - netHeight) {
        isAnimating = false;
        pointScored = false;
        drawScene(x, y);
        return;
    }
    
    // Check if ball hits the ground
    if (y >= canvas.height - 10) {
        isAnimating = false;
        pointScored = checkPoint(x, y);
        drawScene(x, y);
        // Update score in database if point scored
        if (pointScored) {
            try {
                const auth = getAuth();
                if (auth.currentUser) {
                    saveSimulationResult({
                        type: 'parabola',
                        parameters: {
                            initialVelocity,
                            angle,
                            gravity: GRAVITY
                        },
                        results: {
                            maxHeight: calculateMaxHeight(),
                            maxDistance: calculateMaxDistance(),
                            timeOfFlight: time
                        },
                        score: 100,
                        createdAt: new Date()
                    });
                }
            } catch (error) {
                console.error('Error saving score:', error);
            }
        }
        return;
    }
    
    drawScene(x, y);
    document.getElementById('time').textContent = time.toFixed(2);
    
    if (isAnimating) {
        animationId = requestAnimationFrame(animate);
    }
}

function drawScene(x = ballX, y = ballY) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTennisCourt();
    drawPlayer();
    drawBall(x, y);
    drawTrajectory();
    if (pointScored) {
        drawPointText();
    }
}

function drawTennisCourt() {
    // Court ground
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
    
    // Net
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(netX, canvas.height - netHeight, 5, netHeight);
    
    // Net lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let y = canvas.height - netHeight; y < canvas.height; y += 10) {
        ctx.beginPath();
        ctx.moveTo(netX, y);
        ctx.lineTo(netX + 5, y);
        ctx.stroke();
    }
    
    // Court boundaries
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(netX, canvas.height - 10);
    ctx.lineTo(courtEnd, canvas.height - 10);
    ctx.stroke();
}

function drawPlayer() {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(20, 0);
    
    // Head with baseball cap
    ctx.beginPath();
    ctx.arc(50, canvas.height - 100, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(50, canvas.height - 100, 10, Math.PI, 2 * Math.PI);
    ctx.lineTo(62, canvas.height - 100);
    ctx.stroke();
    
    // Body leaning back
    ctx.beginPath();
    ctx.moveTo(50, canvas.height - 90);
    ctx.lineTo(45, canvas.height - 60);
    ctx.stroke();
    
    // Legs
    ctx.beginPath();
    ctx.moveTo(45, canvas.height - 60);
    ctx.lineTo(35, canvas.height - 35);
    ctx.lineTo(45, canvas.height - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(45, canvas.height - 60);
    ctx.lineTo(55, canvas.height - 10);
    ctx.stroke();
    
    // Arms
    ctx.beginPath();
    ctx.moveTo(45, canvas.height - 85);
    ctx.lineTo(35, canvas.height - 95);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(45, canvas.height - 85);
    ctx.lineTo(65, canvas.height - 80);
    ctx.stroke();
    
    // Tennis racquet
    drawRacquet();
    
    ctx.restore();
}

function drawRacquet() {
    // Handle
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, canvas.height - 90);
    ctx.lineTo(50, canvas.height - 115);
    ctx.stroke();
    
    // Racquet head
    ctx.beginPath();
    ctx.save();
    ctx.translate(55, canvas.height - 120);
    ctx.rotate(Math.PI / 4);
    ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Racquet strings
    ctx.lineWidth = 0.3;
    
    // Vertical strings
    for (let i = -10; i <= 10; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, -14);
        ctx.lineTo(i, 14);
        ctx.stroke();
    }
    
    // Horizontal strings
    for (let i = -12; i <= 12; i += 4) {
        ctx.beginPath();
        ctx.moveTo(-10, i);
        ctx.lineTo(10, i);
        ctx.stroke();
    }
    
    ctx.restore();
}

function drawBall(x, y) {
    ctx.fillStyle = '#bfff00';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
}

function drawTrajectory() {
    if (isAnimating) {
        ctx.strokeStyle = '#9ca3af';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(ballX, ballY);
        
        for (let t = 0; t <= time; t += 0.1) {
            const trajX = ballX + (velocityX * t) * SCALE;
            const trajY = ballY - (velocityY * t - 0.5 * GRAVITY * t * t) * SCALE;
            ctx.lineTo(trajX, trajY);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawPointText() {
    ctx.save();
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#4CAF50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add white outline to text
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeText('POINT!', canvas.width/2, canvas.height/2);
    
    // Fill text
    ctx.fillText('POINT!', canvas.width/2, canvas.height/2);
    ctx.restore();
}

// Event listeners
document.getElementById('initialVelocity').addEventListener('input', (e) => {
    initialVelocity = parseFloat(e.target.value);
    updateDisplays();
});

document.getElementById('angle').addEventListener('input', (e) => {
    angle = parseFloat(e.target.value);
    updateDisplays();
});

document.getElementById('throwButton').addEventListener('click', startSimulation);
document.getElementById('resetButton').addEventListener('click', resetSimulation);

// Initialize the simulation
updateDisplays();
drawScene();
const fs = require('fs');
const path = require('path');

const serverTs = fs.readFileSync('server.ts', 'utf8');

// We want to extract the Express app configuration and all routes.
// Then we export the app.

// Let's create an api/index.ts that acts as the serverless entrypoint.
fs.mkdirSync('api', { recursive: true });

let apiIndexTs = `
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

`;

// Extract everything from app.post to the end of the last app.post
const startIdx = serverTs.indexOf('app.post(');
const endIdx = serverTs.lastIndexOf('if (process.env.NODE_ENV');

let routes = serverTs.substring(startIdx, endIdx);

apiIndexTs += routes;
apiIndexTs += `\nexport default app;\n`;

fs.writeFileSync('api/index.ts', apiIndexTs);
console.log('Created api/index.ts');

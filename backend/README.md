# PDF Merger and Splitter Backend

## Overview
This is the backend for the PDF Merger and Splitter application, built with Node.js and Express.

## Prerequisites
- Node.js (v14 or later)
- MongoDB

## Installation
1. Clone the repository
2. Navigate to the backend directory
3. Run `npm install`
4. Create a `.env` file with the following variables:
   - `PORT`: Server port
   - `MONGODB_URI`: MongoDB connection string
   - `UPLOAD_DIR`: Directory for uploaded files
   - `MAX_FILE_SIZE`: Maximum file upload size
   - `BASE_URL`: Base URL for the server

## Running the Server
- Development: `npm run dev`
- Production: `npm start`

## Features
- PDF Merging
- PDF Splitting
- File Upload and Processing

## Technologies
- Node.js
- Express
- MongoDB
- pdf-lib

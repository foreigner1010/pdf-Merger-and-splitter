const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');
const { PDFDocument } = require('pdf-lib');
const BASE_URL = process.env.BASE_URL

// Helper function to create rotation in degrees
const degrees = (angle) => {
  angle = angle % 360;
  if (angle < 0) angle += 360;
  return { angle };
};

const app = express();
const port = 5000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
(async () => {
  try {
    await fs.access('uploads');
  } catch {
    await fs.mkdir('uploads');
  }
})();

// API Routes
app.post('/api/split', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    if (!req.body.pages) {
      return res.status(400).json({ error: 'No pages specified' });
    }

    console.log('Received split request with pages:', req.body.pages);
    const { pages } = req.body;
    const rotation = parseInt(req.body.rotation || '0');
    const pdfPath = req.file.path;
    
    // Read and load PDF
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    console.log('Total pages in PDF:', totalPages);

    // Create new PDF
    const newPdf = await PDFDocument.create();
    
    // Parse page ranges
    const pageRanges = pages.trim().split(',');
    console.log('Page ranges:', pageRanges);
    const pageIndexes = [];
    
    for (const range of pageRanges) {
      const trimmedRange = range.trim();
      console.log('Processing range:', trimmedRange);
      
      if (trimmedRange.includes('-')) {
        const [start, end] = trimmedRange.split('-').map(num => parseInt(num.trim(), 10));
        console.log('Range start-end:', start, end);
        
        if (isNaN(start) || isNaN(end) || start > end) {
          throw new Error('Invalid page range format');
        }
        
        for (let i = start; i <= end; i++) {
          pageIndexes.push(i);
        }
      } else {
        const pageNum = parseInt(trimmedRange, 10);
        if (isNaN(pageNum)) {
          throw new Error('Invalid page number');
        }
        pageIndexes.push(pageNum);
      }
    }
    
    // Remove duplicates and sort
    const uniquePageIndexes = [...new Set(pageIndexes)].sort((a, b) => a - b);
    console.log('Unique sorted page indexes:', uniquePageIndexes);
    
    // Validate page numbers
    if (uniquePageIndexes.some(page => page < 1 || page > totalPages)) {
      throw new Error(`Invalid page number. PDF has ${totalPages} pages.`);
    }
    
    // Copy and rotate pages
    for (const pageIndex of uniquePageIndexes) {
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex - 1]);
      
      // Apply rotation if specified
      if (rotation !== 0) {
        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees(currentRotation + rotation));
      }
      
      newPdf.addPage(copiedPage);
    }
    
    // Save the new PDF
    const newPdfBytes = await newPdf.save();
    
    // Clean up the input file
    await fs.unlink(pdfPath).catch(console.error);
    
    // Send the response
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="split.pdf"`
    });
    res.send(Buffer.from(newPdfBytes));
    
  } catch (error) {
    console.error('Error in split operation:', error);
    res.status(500).json({ 
      error: error.message || 'Error splitting PDF',
      details: error.toString()
    });
  }
});

app.post('/api/merge', upload.array('pdfs'), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'Please upload at least two PDF files' });
    }

    console.log('Received merge request for', req.files.length, 'files');
    
    // Create new PDF
    const mergedPdf = await PDFDocument.create();
    
    // Process each uploaded PDF
    for (const file of req.files) {
      const pdfBytes = await fs.readFile(file.path);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
      
      // Clean up the input file
      await fs.unlink(file.path).catch(console.error);
    }
    
    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    
    // Send the response
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="merged.pdf"'
    });
    res.send(Buffer.from(mergedPdfBytes));
    
  } catch (error) {
    console.error('Error in merge operation:', error);
    res.status(500).json({ 
      error: error.message || 'Error merging PDFs',
      details: error.toString()
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${BASE_URL}`);
});

import dotenv from 'dotenv';
import express from 'express';
import { ethers } from 'ethers';
import contractABI from './abi/ValveChainABI.json' with { type: 'json' };
import multer from 'multer';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(express.json());

// Ensure the uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('The MSA file must be a PDF.'), false);
    }
  }
});

const { PRIVATE_KEY, RPC_URL, CONTRACT_ADDRESS, PORT } = process.env;

// Setup ethers provider/wallet (only if connection details are provided)
let provider, wallet, contract;
if (PRIVATE_KEY && RPC_URL && CONTRACT_ADDRESS) {
  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
  } catch (error) {
    console.warn('Blockchain connection failed, blockchain endpoints will not work:', error.message);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ValveChain Sidecar API running' });
});

// Register Valve (native support)
app.post('/api/register-valve', async (req, res) => {
  if (!contract) {
    return res.status(503).json({ error: 'Blockchain connection not available' });
  }
  const { serialNumber, details } = req.body;
  if (!serialNumber || !details) {
    return res.status(400).json({ error: 'serialNumber and details required' });
  }
  try {
    const tx = await contract.registerValve(serialNumber, details);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Transfer Valve (native support)
app.post('/api/transfer-valve', async (req, res) => {
  if (!contract) {
    return res.status(503).json({ error: 'Blockchain connection not available' });
  }
  const { serialNumber, to } = req.body;
  if (!serialNumber || !to) {
    return res.status(400).json({ error: 'serialNumber and to required' });
  }
  try {
    const tx = await contract.transferValve(serialNumber, to);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Log Maintenance Event
app.post('/api/maintenance', async (req, res) => {
  if (!contract) {
    return res.status(503).json({ error: 'Blockchain connection not available' });
  }
  const { serialNumber, description, reportHash } = req.body;
  if (!serialNumber || !description || !reportHash) {
    return res.status(400).json({ error: 'serialNumber, description, and reportHash required' });
  }
  try {
    const tx = await contract.logMaintenance(serialNumber, description, reportHash);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Request Repair (with escrow)
app.post('/api/repair-request', async (req, res) => {
  if (!contract) {
    return res.status(503).json({ error: 'Blockchain connection not available' });
  }
  const { serialNumber, contractor, amountEth } = req.body;
  if (!serialNumber || !contractor || !amountEth) {
    return res.status(400).json({ error: 'serialNumber, contractor, and amountEth required' });
  }
  try {
    const tx = await contract.requestRepair(
      serialNumber,
      contractor,
      { value: ethers.parseEther(amountEth) }
    );
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Log Repair
app.post('/api/repair', async (req, res) => {
  if (!contract) {
    return res.status(503).json({ error: 'Blockchain connection not available' });
  }
  const { serialNumber, preTestHash, repairHash, postTestHash } = req.body;
  if (!serialNumber || !preTestHash || !repairHash || !postTestHash) {
    return res.status(400).json({ error: 'serialNumber, preTestHash, repairHash, and postTestHash required' });
  }
  try {
    const tx = await contract.logRepair(serialNumber, preTestHash, repairHash, postTestHash);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Vendor Registration endpoint (ported from FastAPI)
app.post('/register_vendor', upload.single('msa_file'), (req, res) => {
  const { vendor_name, contact_email } = req.body;
  
  // Validate required fields
  if (!vendor_name || !contact_email) {
    return res.status(400).json({ 
      error: 'vendor_name and contact_email are required' 
    });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contact_email)) {
    return res.status(400).json({ 
      error: 'Please provide a valid email address' 
    });
  }
  
  if (!req.file) {
    return res.status(400).json({ 
      error: 'MSA file is required' 
    });
  }
  
  res.json({
    message: 'Vendor registered successfully.',
    file_path: req.file.path,
    vendor_data: {
      vendor_name,
      contact_email,
      file_name: req.file.filename,
      original_name: req.file.originalname
    }
  });
});

// Example: Add more endpoints for audit, confirm, etc. as needed

// Start server
app.listen(PORT || 3000, () => {
  console.log(`ValveChain Sidecar API running on port ${PORT || 3000}`);
});

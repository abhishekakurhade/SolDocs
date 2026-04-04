import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentGenerator from '../services/documentGenerator.js';
import * as storage from '../utils/storage.js';
import { supabase } from '../utils/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const docGenerator = new DocumentGenerator();

/**
 * POST /api/generate-document
 * Generate a Word document by filling placeholders in the template
 * Request body: { name, address, date, mobile, ... any other fields }
 * Response: Binary Word document file
 */
router.post('/generate-document', async (req, res) => {
  try {
    const { name, address, date, mobile, ...otherFields } = req.body;

    // Validation
    if (!name || !address || !date || !mobile) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'address', 'date', 'mobile']
      });
    }

    // Combine all data
    const data = { name, address, date, mobile, ...otherFields };

    // Sanitize filename
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const filename = `${sanitizedName}.docx`;

    // Generate document
    const fileBuffer = await docGenerator.generateDocument(data);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Send the document
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({
      error: 'Failed to generate document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/generate-wcr
 * Generate a WCR Word document by filling placeholders
 */
router.post('/generate-wcr', async (req, res) => {
  try {
    const data = req.body;
    
    // Auto-calculate total_capacity if possible
    if (data.wattage && data.number_module && !data.total_capacity) {
      data.total_capacity = (parseFloat(data.wattage) * parseFloat(data.number_module)).toString();
    }

    // Format installation_date if it exists
    if (data.installation_date) {
      // In case it's in YYYY-MM-DD from a previous version or inconsistent entry
      const dateMatch = data.installation_date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        data.installation_date = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
      }
    }

    const { name } = data;

    // Sanitize filename
    const sanitizedName = (name || 'wcr_report').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const filename = `${sanitizedName}.docx`;

    // 1. Generate DOCX
    const fileBuffer = await docGenerator.generateDocument(data, 'wcr template.docx');

    // 2. Save Word file
    const fileId = Date.now();
    const wordFilename = `${fileId}_${sanitizedName}.docx`;
    fs.writeFileSync(path.join(__dirname, '../generated', wordFilename), fileBuffer);

    // 3. Log history to Supabase
    const userid = data.userid;
    if (!userid) throw new Error('Unauthorized: User ID is missing from request');

    const { error: insertError } = await supabase.from('reports').insert([{
      technician_id: userid,
      filename: `${sanitizedName}.docx`,
      type: 'DOCX',
      customer_name: name || 'Unknown',
      customer_mobile: data.mobile_number || null,
      consumer_number: data.consumer_number || null,
      aadhar_number: data.aadhar_number || null,
      word_url: `/generated/${wordFilename}`
    }]);
    if (insertError) console.error('Supabase Insert Error:', insertError);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Send the document
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error generating WCR document:', error);
    res.status(500).json({
      error: 'Failed to generate WCR document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/template-fields
 * Get list of available placeholders in the template
 */
router.get('/template-fields', (req, res) => {
  try {
    const fields = [
      { name: 'name', label: 'Full Name', required: true },
      { name: 'address', label: 'Address', required: true },
      { name: 'date', label: 'Date', required: true, format: 'YYYY-MM-DD' },
      { name: 'mobile', label: 'Mobile Number', required: true }
    ];
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch template fields' });
  }
});

/**
 * GET /api/wcr-template-fields
 * Get list of placeholders for the WCR template
 */
router.get('/wcr-template-fields', (req, res) => {
  const fields = [
    { name: 'name', label: 'Customer Name' },
    { name: 'company_name', label: 'Company Name' },
    { name: 'company_address', label: 'Company Address' },
    { name: 'consumer_number', label: 'Consumer Number' },
    { name: 'aadhar_number', label: 'Aadhar Number' },
    { name: 'Site_address', label: 'Site Address' },
    { name: 'district', label: 'District' },
    { name: 'Sub_division_name', label: 'Sub-Division Name' },
    { name: 'installation_date', label: 'Installation Date', type: 'date' },
    { name: 'sanction_number', label: 'Sanction Number' },
    { name: 'sanctioned_capacity', label: 'Sanctioned Capacity' },
    { name: 'category', label: 'Category' },
    { name: 'capacity_type', label: 'Capacity Type' },
    { name: 'module', label: 'Module Make' },
    { name: 'number_module', label: 'Number of Module' },
    { name: 'wattage', label: 'Wattage' },
    { name: 'total_capacity', label: 'Total Capacity' },
    { name: 'almm_model_number', label: 'ALMM Model Number' },
    { name: 'inverter_make', label: 'Inverter Make' },
    { name: 'capacity_of_inverter', label: 'Capacity of Inverter' },
    { name: 'year_of_manufacturing', label: 'Year of Manufacturing' },
    { name: 'Phase', label: 'Phase' },
    { name: 'mobile_number', label: 'Mobile Number' },
    { name: 'email', label: 'Email' }
  ];
  res.json(fields);
});

/**
 * GET /api/history
 * Get document generation history
 */
router.get('/history', (req, res) => {
  try {
    const history = storage.getHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/profile
 * Get company profile
 */
router.get('/profile', (req, res) => {
  try {
    const profile = storage.getProfile();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * POST /api/profile
 * Update company profile
 */
router.post('/profile', (req, res) => {
  try {
    const updatedProfile = storage.updateProfile(req.body);
    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/stats
 * Get generation statistics
 */
router.get('/stats', (req, res) => {
  try {
    const history = storage.getHistory();
    const stats = {
      total_docs: history.length,
      total_docx: history.filter(h => h.type === 'DOCX').length,
      recent: history.slice(0, 5)
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

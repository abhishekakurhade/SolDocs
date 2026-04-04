import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
  }

  /**
   * Generate a Word document by replacing placeholders with data
   * @param {Object} data - Data to fill placeholders
   * @param {string} [templateName='template.docx'] - Name of the template file in the templates directory
   * @returns {Buffer} - Binary buffer of the generated Word document
   */
  generateDocument(data, templateName = 'template.docx') {
    try {
      const templatePath = path.join(this.templatesDir, templateName);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      // Read template file
      const templateBuffer = fs.readFileSync(templatePath);

      // PizZip is required by docxtemplater v3+ to unzip the .docx file
      const zip = new PizZip(templateBuffer);

      // Create Docxtemplater instance with the PizZip instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{{',
          end: '}}',
        },
      });

      // Render the document with the provided data
      doc.render(data);

      // Generate output buffer
      const output = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return output;
    } catch (error) {
      console.error('Document generation error:', error);
      throw new Error(`Failed to generate document: ${error.message}`);
    }
  }
}

export default DocumentGenerator;

/**
 * Creates a template.docx by writing the OOXML content directly.
 * Each {{placeholder}} is placed in its own single <w:t> run so docxtemplater can parse it correctly.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, '../templates/template.docx');

// Helper to make a normal text run
function run(text, bold = false, size = 24) {
  const boldTag = bold ? '<w:b/>' : '';
  return `<w:r><w:rPr>${boldTag}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`;
}

// Helper to make a paragraph with runs
function para(runs, align = '') {
  const alignTag = align ? `<w:jc w:val="${align}"/>` : '';
  return `<w:p><w:pPr>${alignTag}</w:pPr>${runs}</w:p>`;
}

// Helper: empty paragraph spacer
function space() {
  return '<w:p/>';
}

// Build the document body XML
const bodyXml = [
  // Title
  para(run('DOCUMENT', true, 32), 'center'),
  space(),
  // Date (right-aligned)
  para(run('Date: ', true) + run('{{date}}'), 'right'),
  space(),
  // To block
  para(run('To,')),
  para(run('{{name}}', true)),
  para(run('{{address}}')),
  para(run('Mobile: ') + run('{{mobile}}')),
  space(),
  space(),
  // Subject
  para(run('Subject: ', true) + run('Document for ') + run('{{name}}')),
  space(),
  // Salutation
  para(run('Dear ') + run('{{name}}') + run(',')),
  space(),
  // Body
  para(run('This document has been prepared for ') + run('{{name}}', true) + run(', residing at ') + run('{{address}}') + run(', dated ') + run('{{date}}') + run('. For any queries, please reach us at ') + run('{{mobile}}') + run('.')),
  space(),
  space(),
  // Closing
  para(run('Yours sincerely,')),
  space(),
  space(),
  para(run('____________________________')),
  para(run('Authorized Signatory', true)),
].join('\n');

// OOXML document.xml content
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

// Minimal _rels/document.xml.rels
const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

// Minimal styles.xml
const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

// [Content_Types].xml
const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

// Root _rels/.rels
const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

// Build the zip
const zip = new PizZip();
zip.file('[Content_Types].xml', contentTypesXml);
zip.file('_rels/.rels', rootRelsXml);
zip.file('word/document.xml', documentXml);
zip.file('word/_rels/document.xml.rels', relsXml);
zip.file('word/styles.xml', stylesXml);

const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(outputPath, output);
console.log('✅ Clean template.docx created at:', outputPath, '- size:', output.length, 'bytes');

// Verify it works with docxtemplater
import Docxtemplater from 'docxtemplater';
const verifyBuf = fs.readFileSync(outputPath);
const verifyZip = new PizZip(verifyBuf);
const doc = new Docxtemplater(verifyZip, { paragraphLoop: true, linebreaks: true });
try {
  doc.render({ name: 'Test User', address: '123 Main St', date: '2026-03-21', mobile: '9876543210' });
  const testOut = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(path.join(__dirname, '../test_output.docx'), testOut);
  console.log('✅ Docxtemplater render SUCCESS! Output size:', testOut.length, 'bytes');
  console.log('✅ Test file saved as: test_output.docx');
} catch(e) {
  console.error('❌ Docxtemplater render FAILED:', JSON.stringify(e, null, 2));
}

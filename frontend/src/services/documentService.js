import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const generateDocument = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/api/generate-document`, formData, {
      responseType: 'blob',
    });

    // Create a blob URL and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from Content-Disposition header if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = `document.docx`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error('Error generating document:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to generate document'
    );
  }
};

export const fetchTemplateFields = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/template-fields`);
    return response.data;
  } catch (error) {
    console.error('Error fetching template fields:', error);
    throw new Error('Failed to fetch template fields');
  }
};

export const generateWCRDocument = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/api/generate-wcr`, formData, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = `wcr_report.docx`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error('Error generating WCR document:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to generate WCR document'
    );
  }
};

export const fetchWCRTemplateFields = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/wcr-template-fields`);
    return response.data;
  } catch (error) {
    console.error('Error fetching WCR template fields:', error);
    throw new Error('Failed to fetch WCR template fields');
  }
};

export const generateWCRPdf = async (formData) => {
  // PDF generation has been removed. This function is no longer available.
  throw new Error('PDF generation is disabled. Please use Word document generation instead.');
};

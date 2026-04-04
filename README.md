# Document Generator - Full Stack Project

A full-stack application for generating personalized Word documents from a template with placeholder values. Built with **React** (frontend), **Node.js/Express** (backend), and **docxtemplater** (Word templating).

## 📋 Project Structure

```
project02/
├── backend/
│   ├── package.json
│   ├── server.js                 # Main Express server
│   ├── .env.example
│   ├── routes/
│   │   └── documentRoutes.js     # API routes for document generation
│   ├── services/
│   │   └── documentGenerator.js  # Document generation logic
│   ├── templates/
│   │   └── template.docx         # Word template with placeholders
│   └── scripts/
│       └── generateTemplate.js   # Helper to create template
│
├── frontend/
│   ├── package.json
│   ├── .env.example
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       ├── index.jsx
│       ├── components/
│       │   ├── DocumentForm.jsx    # Main form component
│       │   └── DocumentForm.css
│       └── services/
│           └── documentService.js  # API communication
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher) - [Download](https://nodejs.org)
- **npm** or **yarn** package manager
- **Word template** (created in Microsoft Word or LibreOffice)

### Step 1: Create the Word Template

You need to create a `template.docx` file with placeholders before starting:

#### Option A: Manual Creation (Recommended for Production)
1. Open **Microsoft Word** or **LibreOffice Writer**
2. Create your document with desired formatting and content
3. Add placeholders in this format: `{{fieldname}}`
   - **Example placeholders:**
     - `{{name}}`
     - `{{address}}`
     - `{{date}}`
     - `{{mobile}}`
4. Save the file as `template.docx`
5. Place it in: `backend/templates/template.docx`

#### Option B: Using the Generator Script
```bash
cd backend
npm install
node scripts/generateTemplate.js
```

**Sample template content:**
```
Document for: {{name}}

Personal Information:
Name: {{name}}
Address: {{address}}
Mobile: {{mobile}}
Date: {{date}}
```

---

### Step 2: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file from example
copy .env.example .env

# Ensure template.docx exists before proceeding
# (Place your template.docx in backend/templates/)

# Start the server
npm start
```

**Expected output:**
```
✅ Server is running on http://localhost:5000
📋 POST /api/generate-document - Generate Word document from template
❤️ GET /health - Health check
```

**Development mode** (with auto-reload):
```bash
npm run dev
```

---

### Step 3: Setup Frontend

In a **new terminal** (keep backend running):

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file from example
copy .env.example .env

# Start the React development server
npm start
```

The app will automatically open at `http://localhost:3000`

---

## 📝 API Documentation

### POST `/api/generate-document`

Generates a Word document by filling placeholders with user-provided data.

**Request:**
```json
{
  "name": "John Doe",
  "address": "123 Main Street, Anytown, USA",
  "date": "2024-03-21",
  "mobile": "+1 (555) 123-4567"
}
```

**Response:**
- **Status:** 200 OK
- **Content-Type:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Body:** Binary Word document file
- **Download filename:** `john_doe.docx` (auto-generated from name)

**Error Response:**
```json
{
  "error": "Missing required fields",
  "required": ["name", "address", "date", "mobile"]
}
```

### GET `/api/template-fields`

Returns a list of available placeholder fields in the template.

**Response:**
```json
[
  { "name": "name", "label": "Full Name", "required": true },
  { "name": "address", "label": "Address", "required": true },
  { "name": "date", "label": "Date", "required": true, "format": "YYYY-MM-DD" },
  { "name": "mobile", "label": "Mobile Number", "required": true }
]
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "Server is running",
  "timestamp": "2024-03-21T10:30:00.000Z"
}
```

---

## 🎨 Frontend Features

- **Responsive React Form** with validation
- **Real-time error messages**
- **Date picker** with YYYY-MM-DD format
- **Mobile number validation** (minimum 10 digits)
- **Automatic file download** with user's name as filename
- **Loading state** during document generation
- **Beautiful gradient UI** with smooth animations

---

## 🔧 Configuration

### Backend (.env)
```env
PORT=5000                              # Server port
NODE_ENV=development                   # Environment: development or production
CORS_ORIGIN=http://localhost:3000      # Frontend URL for CORS
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000  # Backend API URL
```

---

## 📦 Dependencies

### Backend
- **express** (4.18.2) - Web framework
- **cors** (2.8.5) - CORS middleware
- **docxtemplater** (3.52.0) - Word templating
- **pizzip** (3.2.1) - ZIP handling for DOCX files
- **dotenv** (16.3.1) - Environment variables
- **nodemon** (dev) - Auto-reload during development

### Frontend
- **react** (18.2.0) - UI framework
- **react-dom** (18.2.0) - React DOM rendering
- **axios** (1.6.0) - HTTP client for API calls
- **react-scripts** (5.0.1) - Build tools

---

## 🔄 How It Works

1. **User fills the form** on the frontend with personal information
2. **Frontend validates** all required fields and formats
3. **Frontend sends** POST request to `/api/generate-document` with form data
4. **Backend reads** the template.docx file
5. **Backend replaces** all placeholders (e.g., `{{name}}`, `{{address}}`) with user data
6. **Backend returns** the generated Word document as a binary file
7. **Frontend automatically** downloads the file with the user's name as filename

---

## 🚀 Production Deployment

### Build Frontend for Production
```bash
cd frontend
npm run build
```
Output: `frontend/build/` - Ready for static hosting

### Deploy Backend
```bash
cd backend
npm install --production
NODE_ENV=production npm start
```

### Environment Variables for Production
**Backend (.env):**
```env
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

---

## 🔐 Security Notes

- **Input Validation:** All user inputs are validated on both frontend and backend
- **File Naming:** Special characters in names are sanitized to prevent path traversal
- **CORS:** Configuration limits requests to specified origin
- **No Database:** Currently no persistent data storage; data is processed on-demand

---

## 🎯 Future Enhancements (Post-MVP)

- ✅ **MongoDB Integration:** Store generated documents and user data
- ✅ **User Authentication:** JWT-based user accounts
- ✅ **Template Management:** Upload and manage multiple templates
- ✅ **Document History:** Track generated documents per user
- ✅ **Email Integration:** Send generated documents via email
- ✅ **Advanced Templating:** Conditional fields, loops, and formatting
- ✅ **Error Logging:** Centralized error tracking and monitoring
- ✅ **Unit Tests:** Jest/Mocha tests for backend and frontend
- ✅ **API Rate Limiting:** Prevent abuse with request throttling

---

## 📂 File Reference

| File | Purpose |
|------|---------|
| `backend/server.js` | Main Express server entry point |
| `backend/routes/documentRoutes.js` | API endpoint handlers |
| `backend/services/documentGenerator.js` | Core templating logic using docxtemplater |
| `backend/templates/template.docx` | Word template with {{placeholder}} syntax |
| `frontend/src/App.jsx` | Root React component |
| `frontend/src/components/DocumentForm.jsx` | Form UI and validation logic |
| `frontend/src/services/documentService.js` | API communication layer |

---

## 🐛 Troubleshooting

### Issue: "Template file not found"
**Solution:** Ensure `template.docx` exists in `backend/templates/` directory

### Issue: CORS error in browser console
**Solution:** Update `CORS_ORIGIN` in `backend/.env` to match your frontend URL

### Issue: Document generation fails
**Solution:** 
- Check that template.docx has proper placeholder syntax: `{{fieldname}}`
- Verify the placeholder names match the API request fields

### Issue: Port already in use
**Solution:** Change `PORT` in `.env` or kill the process:
```bash
# Find and kill process on port 5000 (Windows PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

---

## 📚 Resources

- [docxtemplater Documentation](https://docxtemplater.com/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [PizZip (ZIP handling)](https://stuk.github.io/jszip/)

---

## 📄 License

This project is provided as-is for educational and commercial use.

---

## 💡 Tips

- Always create the template manually in Microsoft Word for best results
- Test the template with sample data before going to production
- Monitor server logs for any placeholder replacement errors
- Use descriptive names for placeholders (e.g., `{{user_full_name}}` instead of `{{n}}`)

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API documentation
3. Ensure all prerequisites are installed
4. Verify file paths and environment variables

---

**Built with ❤️ - Document Generator v1.0**

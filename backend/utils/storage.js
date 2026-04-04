import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');

// Initialize files if they don't exist
const initFile = (filePath, initialData) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
  }
};

initFile(HISTORY_FILE, []);
initFile(PROFILE_FILE, {
  company_name: '',
  company_address: '',
  email: '',
  mobile_number: '',
  address: '',
  site_address: '',
  district: '',
  sub_division: ''
});

export const getHistory = () => {
  const data = fs.readFileSync(HISTORY_FILE, 'utf8');
  return JSON.parse(data);
};

export const addHistoryEntry = (entry) => {
  const history = getHistory();
  const newEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...entry
  };
  history.unshift(newEntry);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  return newEntry;
};

export const getProfile = () => {
  const data = fs.readFileSync(PROFILE_FILE, 'utf8');
  return JSON.parse(data);
};

export const updateProfile = (profileData) => {
  const currentProfile = getProfile();
  const updatedProfile = { ...currentProfile, ...profileData };
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(updatedProfile, null, 2));
  return updatedProfile;
};

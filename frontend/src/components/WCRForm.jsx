import React, { useState, useEffect } from 'react';
import { generateWCRDocument, fetchWCRTemplateFields } from '../services/documentService';
import { supabase } from '../services/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faMapMarkerAlt, faSun, faPlug, faBuilding, faFileWord } from '@fortawesome/free-solid-svg-icons';
import './WCRForm.css';

const WCRForm = () => {
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [wordLoading, setWordLoading] = useState(false);
  const [fetchingFields, setFetchingFields] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [isOtherPhase, setIsOtherPhase] = useState(false);

  const steps = [
    { title: 'Customer Information', icon: <FontAwesomeIcon icon={faUser} />, id: 'personal' },
    { title: 'Address Information', icon: <FontAwesomeIcon icon={faMapMarkerAlt} />, id: 'address' },
    { title: 'Solar Details', icon: <FontAwesomeIcon icon={faSun} />, id: 'solar' },
    { title: 'Inverter Details', icon: <FontAwesomeIcon icon={faPlug} />, id: 'inverter' },
    { title: 'Company Information', icon: <FontAwesomeIcon icon={faBuilding} />, id: 'contact' }
  ];

  useEffect(() => {
    const loadFields = async () => {
      try {
        const userStr = sessionStorage.getItem('technician_user');
        const user = userStr ? JSON.parse(userStr) : null;

        let profileData = {};
        if (user && user.userid) {
          const { data } = await supabase.from('technicians').select('*').eq('userid', user.userid).single();
          if (data) profileData = data;
        }

        const fieldsData = await fetchWCRTemplateFields();
        setFields(fieldsData);

        const initialState = {};
        fieldsData.forEach(field => {
          // Auto-fill from company profile if it's a company-wide field
          if (field.name === 'company_name') {
            initialState[field.name] = profileData.company_name || '';
          } else if (field.name === 'company_address') {
            initialState[field.name] = profileData.company_address || '';
          } else if (field.name === 'district') {
            initialState[field.name] = profileData.district || '';
          } else {
            initialState[field.name] = '';
          }
        });
        setFormData(initialState);
      } catch (err) {
        setError('Failed to load form details');
      } finally {
        setFetchingFields(false);
      }
    };
    loadFields();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => {
      const newState = {
        ...prevState,
        [name]: value
      };

      // Auto-calculate total_capacity (Wattage * Number of Modules)
      if (name === 'wattage' || name === 'number_module') {
        const w = parseFloat(name === 'wattage' ? value : prevState.wattage) || 0;
        const n = parseFloat(name === 'number_module' ? value : prevState.number_module) || 0;
        if (w > 0 && n > 0) {
          newState.total_capacity = ((w * n) / 1000).toFixed(1)
        }
      }

      return newState;
    });
    setError('');
    setSuccess('');
  };

  const validateStep = (stepIdx) => {
    const stepId = steps[stepIdx].id;
    const currentFields = getStepFields(stepId);

    // Define explicit required fields per user instructions
    const requiredForPersonal = ['name', 'consumer_number', 'aadhar_number', 'mobile_number', 'email'];

    const missingFields = currentFields.filter(field => {
      // Step 4 (contact) is not required
      if (stepId === 'contact') return false;

      // Step 0 (personal) has specific required fields
      if (stepId === 'personal') {
        return requiredForPersonal.includes(field.name) && !formData[field.name];
      }

      // Steps 1, 2, 3 (address, solar, inverter) - all fields are required
      return !formData[field.name];
    });

    if (missingFields.length > 0) {
      const fieldLabels = missingFields.map(f => f.label).join(', ');
      setError(`Please fill all required fields: ${fieldLabels}`);
      return false;
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setWordLoading(true);
    setSuccess('');

    try {
      const userStr = sessionStorage.getItem('technician_user');
      const user = userStr ? JSON.parse(userStr) : {};
      const dataToSubmit = { ...formData, userid: user.userid };
      const result = await generateWCRDocument(dataToSubmit);
      setSuccess(`WCR Document generated and downloaded: ${result.filename}`);
    } catch (err) {
      setError(err.message || 'An error occurred while generating the document');
    } finally {
      setWordLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'Other') {
      setIsOtherCategory(true);
      setFormData(prev => ({ ...prev, category: '' }));
    } else {
      setIsOtherCategory(false);
      setFormData(prev => ({ ...prev, category: value }));
    }
    setError('');
  };

  const handlePhaseChange = (e) => {
    const value = e.target.value;
    if (value === 'Other') {
      setIsOtherPhase(true);
      setFormData(prev => ({ ...prev, Phase: '' }));
    } else {
      setIsOtherPhase(false);
      setFormData(prev => ({ ...prev, Phase: value }));
    }
    setError('');
  };

  if (fetchingFields) {
    return <div className="loading-container">Loading form details...</div>;
  }

  const getStepFields = (stepId) => {
    switch (stepId) {
      case 'personal':
        return fields.filter(f => ['name', 'consumer_number', 'aadhar_number', 'mobile_number', 'email'].includes(f.name));
      case 'address':
        return fields.filter(f => ['Site_address', 'district', 'Sub_division_name'].includes(f.name));
      case 'solar':
        return fields.filter(f => ['installation_date', 'sanctioned_capacity', 'sanction_number', 'category'].includes(f.name));
      case 'inverter':
        return fields.filter(f => ['module', 'number_module', 'wattage', 'total_capacity', 'almm_model_number', 'inverter_make', 'capacity_of_inverter', 'year_of_manufacturing', 'Phase',].includes(f.name));
      case 'contact':
        return fields.filter(f => ['company_name', 'company_address',].includes(f.name));
      default:
        return [];
    }
  };

  const currentStepFields = getStepFields(steps[currentStep].id);
  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div className="wcr-stepper-container">
      <div className="stepper-wrapper no-print">
        <div className="profile-completeness">
          <span>Profile Completeness</span>
          <span className="percent">{progressPercent}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <nav className="stepper-nav">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`step-item ${idx <= currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
              onClick={() => idx < currentStep && setCurrentStep(idx)}
            >
              <div className="step-icon">{idx < currentStep ? '✓' : step.icon}</div>
              <span className="step-label">{step.title}</span>
            </div>
          ))}
        </nav>

        <div className="form-content-area">
          <header className="step-header">
            <h2>{steps[currentStep].title}</h2>
          </header>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="step-form">
            <div className="fields-grid">
              {currentStepFields.map(field => (
                <div key={field.name} className="form-group">
                  <label htmlFor={field.name}>
                    {field.label}
                    {(steps[currentStep].id !== 'contact' &&
                      (steps[currentStep].id !== 'personal' || ['name', 'consumer_number', 'aadhar_number', 'mobile_number', 'email'].includes(field.name))
                    ) && <span className="required">*</span>}
                  </label>
                  {field.type === 'date' ? (
                    <div className="date-input-wrapper">
                      <input
                        type="date"
                        id={field.name}
                        name={field.name}
                        value={formData[field.name]?.includes('/') ? formData[field.name].split('/').reverse().join('-') : formData[field.name] || ''}
                        onChange={(e) => {
                          const val = e.target.value; // YYYY-MM-DD
                          const formatted = val.split('-').reverse().join('/');
                          handleInputChange({ target: { name: field.name, value: formatted } });
                        }}
                        className="hidden-date-input"
                      />
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={formData[field.name] || ''}
                        readOnly
                        onClick={(e) => e.target.previousSibling.showPicker()}
                        className="display-date-input"
                      />
                      <span className="calendar-icon" onClick={(e) => e.target.previousSibling.previousSibling.showPicker()}>📅</span>
                    </div>
                  ) : field.name === 'category' ? (
                    <div className="category-select-wrapper">
                      <select
                        id={field.name}
                        name={field.name}
                        value={isOtherCategory ? 'Other' : (['Residential', 'Commercial'].includes(formData.category) ? formData.category : (formData.category ? 'Other' : ''))}
                        onChange={handleCategoryChange}
                        className="category-select"
                      >
                        <option value="">Select Category</option>
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Other">Other</option>
                      </select>
                      {(isOtherCategory || (formData.category && !['Residential', 'Commercial'].includes(formData.category))) && (
                        <input
                          type="text"
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          placeholder="Type custom category..."
                          className="other-category-input"
                          autoFocus
                        />
                      )}
                    </div>
                  ) : field.name === 'Phase' ? (
                    <div className="category-select-wrapper">
                      <select
                        id={field.name}
                        name={field.name}
                        value={isOtherPhase ? 'Other' : (['Single Phase', 'Three Phase'].includes(formData.Phase) ? formData.Phase : (formData.Phase ? 'Other' : ''))}
                        onChange={handlePhaseChange}
                        className="category-select"
                      >
                        <option value="">Select Phase</option>
                        <option value="Single Phase">Single Phase</option>
                        <option value="Three Phase">Three Phase</option>
                        <option value="Other">Other</option>
                      </select>
                      {(isOtherPhase || (formData.Phase && !['Single Phase', 'Three Phase'].includes(formData.Phase))) && (
                        <input
                          type="text"
                          name="Phase"
                          value={formData.Phase}
                          onChange={handleInputChange}
                          placeholder="Type custom phase..."
                          className="other-category-input"
                          autoFocus
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      id={field.name}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="stepper-actions">
              {currentStep > 0 && (
                <button type="button" className="btn-prev" onClick={prevStep}>
                  Previous
                </button>
              )}

              {currentStep < steps.length - 1 ? (
                <button type="button" className="btn-next" onClick={nextStep}>
                  Next Step
                </button>
              ) : (
                <div className="final-actions">
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={wordLoading}
                  >
                    <FontAwesomeIcon icon={faFileWord} /> <span className="btn-text">{wordLoading ? 'Generating...' : 'Download Word'}</span>
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WCRForm;

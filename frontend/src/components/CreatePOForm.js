import React, { useState } from 'react';
import './CreatePOForm.css';

const CreatePOForm = ({ onSubmit, onCancel, manufacturers = [], distributors = [] }) => {
  const [formData, setFormData] = useState({
    po_number: '',
    manufacturer_id: '',
    distributor_id: '',
    total_amount: '',
    currency: 'USD',
    items: [{ valve_id: '', quantity: 1, unit_price: '', description: '' }],
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Recalculate total amount
    const total = updatedItems.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      return sum + (quantity * unitPrice);
    }, 0);

    setFormData(prev => ({
      ...prev,
      total_amount: total.toFixed(2)
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { valve_id: '', quantity: 1, unit_price: '', description: '' }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));

      // Recalculate total amount
      const total = updatedItems.reduce((sum, item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        return sum + (quantity * unitPrice);
      }, 0);

      setFormData(prev => ({
        ...prev,
        total_amount: total.toFixed(2)
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.po_number.trim()) {
      newErrors.po_number = 'PO Number is required';
    }
    if (!formData.manufacturer_id) {
      newErrors.manufacturer_id = 'Manufacturer is required';
    }
    if (!formData.distributor_id) {
      newErrors.distributor_id = 'Distributor is required';
    }
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      newErrors.total_amount = 'Total amount must be greater than 0';
    }

    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.valve_id.trim()) {
        newErrors[`items.${index}.valve_id`] = 'Valve ID is required';
      }
      if (!item.description.trim()) {
        newErrors[`items.${index}.description`] = 'Description is required';
      }
      if (!item.unit_price || parseFloat(item.unit_price) <= 0) {
        newErrors[`items.${index}.unit_price`] = 'Unit price must be greater than 0';
      }
      if (!item.quantity || parseInt(item.quantity) <= 0) {
        newErrors[`items.${index}.quantity`] = 'Quantity must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Convert string values to appropriate types
      const submitData = {
        ...formData,
        total_amount: parseFloat(formData.total_amount),
        items: formData.items.map(item => ({
          ...item,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: 'Failed to create purchase order. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-po-form">
      <div className="form-header">
        <h2>Create Purchase Order</h2>
      </div>

      <form onSubmit={handleSubmit} className="po-form">
        {errors.submit && (
          <div className="error-message form-error">
            {errors.submit}
          </div>
        )}

        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="po_number">PO Number *</label>
              <input
                type="text"
                id="po_number"
                name="po_number"
                value={formData.po_number}
                onChange={handleInputChange}
                placeholder="e.g., PO-2024-001"
                className={errors.po_number ? 'error' : ''}
                disabled={isSubmitting}
              />
              {errors.po_number && <span className="error-message">{errors.po_number}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="currency">Currency</label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                disabled={isSubmitting}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="manufacturer_id">Manufacturer *</label>
              <select
                id="manufacturer_id"
                name="manufacturer_id"
                value={formData.manufacturer_id}
                onChange={handleInputChange}
                className={errors.manufacturer_id ? 'error' : ''}
                disabled={isSubmitting}
              >
                <option value="">Select a manufacturer</option>
                {manufacturers.map(mfg => (
                  <option key={mfg.id} value={mfg.id}>
                    {mfg.name}
                  </option>
                ))}
              </select>
              {errors.manufacturer_id && <span className="error-message">{errors.manufacturer_id}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="distributor_id">Distributor *</label>
              <select
                id="distributor_id"
                name="distributor_id"
                value={formData.distributor_id}
                onChange={handleInputChange}
                className={errors.distributor_id ? 'error' : ''}
                disabled={isSubmitting}
              >
                <option value="">Select a distributor</option>
                {distributors.map(dist => (
                  <option key={dist.id} value={dist.id}>
                    {dist.name}
                  </option>
                ))}
              </select>
              {errors.distributor_id && <span className="error-message">{errors.distributor_id}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Items</h3>
            <button 
              type="button" 
              onClick={addItem}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Add Item
            </button>
          </div>

          {formData.items.map((item, index) => (
            <div key={index} className="item-row">
              <div className="item-header">
                <h4>Item {index + 1}</h4>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="btn btn-danger btn-sm"
                    disabled={isSubmitting}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={`valve_id_${index}`}>Valve ID *</label>
                  <input
                    type="text"
                    id={`valve_id_${index}`}
                    value={item.valve_id}
                    onChange={(e) => handleItemChange(index, 'valve_id', e.target.value)}
                    placeholder="e.g., valve-001"
                    className={errors[`items.${index}.valve_id`] ? 'error' : ''}
                    disabled={isSubmitting}
                  />
                  {errors[`items.${index}.valve_id`] && 
                    <span className="error-message">{errors[`items.${index}.valve_id`]}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor={`quantity_${index}`}>Quantity *</label>
                  <input
                    type="number"
                    id={`quantity_${index}`}
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    min="1"
                    className={errors[`items.${index}.quantity`] ? 'error' : ''}
                    disabled={isSubmitting}
                  />
                  {errors[`items.${index}.quantity`] && 
                    <span className="error-message">{errors[`items.${index}.quantity`]}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor={`unit_price_${index}`}>Unit Price *</label>
                  <input
                    type="number"
                    id={`unit_price_${index}`}
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                    step="0.01"
                    min="0"
                    className={errors[`items.${index}.unit_price`] ? 'error' : ''}
                    disabled={isSubmitting}
                  />
                  {errors[`items.${index}.unit_price`] && 
                    <span className="error-message">{errors[`items.${index}.unit_price`]}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor={`description_${index}`}>Description *</label>
                <input
                  type="text"
                  id={`description_${index}`}
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  placeholder="e.g., Ball Valve 1/2 inch"
                  className={errors[`items.${index}.description`] ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {errors[`items.${index}.description`] && 
                  <span className="error-message">{errors[`items.${index}.description`]}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="form-section">
          <div className="form-group">
            <label htmlFor="total_amount">Total Amount *</label>
            <div className="total-amount-display">
              <span className="currency">{formData.currency}</span>
              <span className="amount">{formData.total_amount || '0.00'}</span>
            </div>
            {errors.total_amount && <span className="error-message">{errors.total_amount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              placeholder="Additional notes or special instructions..."
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePOForm;
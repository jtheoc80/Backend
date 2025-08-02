# Vendor Registration API (Python/FastAPI)

A FastAPI-based service for vendor registration with MSA file upload functionality.

## Features

- **Vendor Registration**: Register vendors with contact information
- **File Upload**: Upload and validate MSA (Master Service Agreement) PDF files
- **Email Validation**: Validate contact email addresses using Pydantic
- **PDF Validation**: Ensure uploaded files are valid PDF documents

## API Endpoints

- `POST /register_vendor` - Register a vendor with MSA file upload
  - **Parameters**:
    - `vendor_name` (form field): Name of the vendor
    - `contact_email` (form field): Valid email address
    - `msa_file` (file upload): PDF file containing the MSA

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Configure environment variables in `.env` (if needed):
   ```
   # Add any specific Python service configuration here
   ```

3. Start the server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## Dependencies

- **fastapi**: Modern, fast web framework for building APIs
- **uvicorn**: ASGI server for FastAPI
- **python-dotenv**: Environment variable management
- **web3**: Ethereum blockchain interaction library
- **pydantic**: Data validation using Python type hints

## API Usage

### Register a Vendor

```bash
curl -X POST "http://localhost:8000/register_vendor" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "vendor_name=Example Vendor" \
     -F "contact_email=vendor@example.com" \
     -F "msa_file=@path/to/msa.pdf"
```

### Response

```json
{
  "message": "Vendor registration successful",
  "file_path": "uploads/msa.pdf"
}
```

## File Storage

Uploaded MSA files are stored in the `uploads/` directory. The directory is automatically created if it doesn't exist.

## Validation

- Email addresses are validated using Pydantic's `EmailStr` type
- File uploads must be PDF format (`application/pdf` content type)
- All required fields must be provided

## Files

- `main.py` - Main FastAPI application
- `requirements.txt` - Python dependencies
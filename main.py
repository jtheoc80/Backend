
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, ValidationError, field_validator
import os
import shutil

app = FastAPI(title="Vendor Management API", version="1.0.0")

# Ensure the uploads directory exists
upload_dir = "uploads"
os.makedirs(upload_dir, exist_ok=True)

class VendorRegistration(BaseModel):
    vendor_name: str
    contact_email: EmailStr
    
    @field_validator('vendor_name')
    @classmethod
    def vendor_name_must_not_be_empty(cls, v):
        if not v or v.strip() == '':
            raise ValueError('Vendor name cannot be empty')
        return v

@app.get("/")
async def root():
    return {"message": "Vendor Management API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "vendor-management"}

@app.post("/register_vendor")
async def register_vendor(
    vendor_name: str = Form(...),
    contact_email: EmailStr = Form(...),
    msa_file: UploadFile = File(...)
):
    # Validate vendor data
    try:
        vendor_data = VendorRegistration(vendor_name=vendor_name, contact_email=contact_email)
    except ValidationError as e:
        error_messages = []
        for error in e.errors():
            error_messages.append(f"{error['loc'][0]}: {error['msg']}")
        raise HTTPException(status_code=400, detail="; ".join(error_messages))

    # Check if the uploaded file is a PDF
    if msa_file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="The MSA file must be a PDF.")

    # Save the uploaded file
    file_location = os.path.join(upload_dir, msa_file.filename)
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(msa_file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    return JSONResponse(
        content={
            "message": "Vendor registered successfully",
            "vendor_name": vendor_data.vendor_name,
            "contact_email": vendor_data.contact_email,
            "file_path": file_location
        },
        status_code=201
    )

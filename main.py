
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, EmailStr, ValidationError, field_validator
import os
import shutil

app = FastAPI()

# Ensure the uploads directory exists
upload_dir = "uploads"
os.makedirs(upload_dir, exist_ok=True)

class VendorRegistration(BaseModel):
    vendor_name: str
    contact_email: EmailStr

    @field_validator('vendor_name')
    @classmethod
    def vendor_name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Vendor name cannot be empty')
        return v

@app.post("/register_vendor")
async def register_vendor(
    vendor_name: str = Form(...), 
    contact_email: EmailStr = Form(...), 
    msa_file: UploadFile = File(...)
):
    # Validate input data
    try:
        vendor_data = VendorRegistration(vendor_name=vendor_name, contact_email=contact_email)
    except ValidationError as e:
        # Convert ValidationError to a format that FastAPI can serialize
        errors = []
        for error in e.errors():
            errors.append({
                "field": error.get("loc", ["unknown"])[0] if error.get("loc") else "unknown",
                "message": error.get("msg", "Validation error"),
                "type": error.get("type", "value_error")
            })
        raise HTTPException(status_code=422, detail=errors)

    # Check if the uploaded file is a PDF
    if msa_file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="The MSA file must be a PDF.")

    # Save the uploaded file
    file_location = os.path.join(upload_dir, msa_file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(msa_file.file, buffer)

    return {
        "message": "Vendor registration successful",
        "file_path": file_location
    }


from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import EmailStr
import os
import shutil

app = FastAPI()

# Ensure the uploads directory exists
os.makedirs("uploads", exist_ok=True)

@app.post("/register_vendor")
async def register_vendor(
    vendor_name: str = Form(...),
    contact_email: EmailStr = Form(...),
    msa_file: UploadFile = File(...)
):
    # Check if the uploaded file is a PDF
    if msa_file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="The MSA file must be a PDF.")

    # Save the uploaded file
    upload_path = os.path.join("uploads", msa_file.filename)
    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(msa_file.file, buffer)

    return JSONResponse(
        content={
            "message": "Vendor registered successfully.",
            "file_path": upload_path
        }
    )

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, EmailStr, ValidationError
import os
import shutil

app = FastAPI()

upload_dir = "uploads"
os.makedirs(upload_dir, exist_ok=True)

class VendorRegistration(BaseModel):
    vendor_name: str
    contact_email: EmailStr

@app.post("/register_vendor")
async def register_vendor(vendor_name: str = Form(...), contact_email: EmailStr = Form(...), msa_file: UploadFile = File(...)):
    try:
        vendor_data = VendorRegistration(vendor_name=vendor_name, contact_email=contact_email)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors())

    file_location = os.path.join(upload_dir, msa_file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(msa_file.file, buffer)

    return {
        "message": "Vendor registration successful",
        "file_path": file_location
    }

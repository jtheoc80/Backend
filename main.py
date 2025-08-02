
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, ValidationError
import os
import shutil
import magic
import hashlib
import uuid
import aiofiles
from pathlib import Path
from typing import Optional

app = FastAPI()

# Configuration
UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = ["application/pdf"]
ALLOWED_EXTENSIONS = [".pdf"]

# Ensure upload directory exists with proper permissions
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.chmod(UPLOAD_DIR, 0o755)

class VendorRegistration(BaseModel):
    vendor_name: str
    contact_email: EmailStr

class FileValidationError(Exception):
    """Custom exception for file validation errors"""
    pass

class SecureFileHandler:
    """Handles secure file upload validation and storage"""
    
    def __init__(self, upload_dir: str = UPLOAD_DIR, max_size: int = MAX_FILE_SIZE):
        self.upload_dir = Path(upload_dir)
        self.max_size = max_size
        self.upload_dir.mkdir(exist_ok=True)
    
    async def validate_file_size(self, file: UploadFile) -> None:
        """Validate file size"""
        # Read file content to check size
        content = await file.read()
        file_size = len(content)
        
        # Reset file pointer
        await file.seek(0)
        
        if file_size > self.max_size:
            raise FileValidationError(f"File size {file_size} bytes exceeds maximum allowed size {self.max_size} bytes")
    
    def validate_filename(self, filename: str) -> None:
        """Validate filename and extension"""
        if not filename:
            raise FileValidationError("Filename cannot be empty")
        
        # Check for path traversal attempts
        if ".." in filename or "/" in filename or "\\" in filename:
            raise FileValidationError("Invalid filename: path traversal detected")
        
        # Check file extension
        file_ext = Path(filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise FileValidationError(f"File extension {file_ext} not allowed. Allowed extensions: {ALLOWED_EXTENSIONS}")
    
    async def validate_mime_type(self, file: UploadFile) -> str:
        """Validate MIME type using python-magic for robust detection"""
        # Read first chunk of file for MIME detection
        chunk = await file.read(1024)
        await file.seek(0)
        
        # Detect MIME type using magic
        detected_mime = magic.from_buffer(chunk, mime=True)
        
        # Also check the declared content type
        declared_mime = file.content_type
        
        # Validate detected MIME type
        if detected_mime not in ALLOWED_MIME_TYPES:
            raise FileValidationError(f"Detected MIME type {detected_mime} not allowed. Allowed types: {ALLOWED_MIME_TYPES}")
        
        # Check for MIME type spoofing
        if declared_mime != detected_mime:
            raise FileValidationError(f"MIME type mismatch: declared {declared_mime} but detected {detected_mime}")
        
        return detected_mime
    
    def generate_secure_filename(self, original_filename: str) -> str:
        """Generate a secure filename using UUID and hash"""
        file_ext = Path(original_filename).suffix.lower()
        unique_id = str(uuid.uuid4())
        
        # Create hash of original filename for reference
        filename_hash = hashlib.sha256(original_filename.encode()).hexdigest()[:8]
        
        return f"{unique_id}_{filename_hash}{file_ext}"
    
    async def save_file_securely(self, file: UploadFile, filename: str) -> str:
        """Save file securely with proper permissions"""
        file_path = self.upload_dir / filename
        
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                # Read and write file in chunks to handle large files efficiently
                while chunk := await file.read(8192):  # 8KB chunks
                    await f.write(chunk)
            
            # Set secure file permissions (readable by owner only)
            os.chmod(file_path, 0o600)
            
            return str(file_path)
        
        except Exception as e:
            # Clean up file if save failed
            if file_path.exists():
                file_path.unlink()
            raise FileValidationError(f"Failed to save file securely: {str(e)}")
    
    async def validate_and_store_file(self, file: UploadFile) -> tuple[str, str]:
        """Complete file validation and secure storage process"""
        # Reset file pointer to beginning
        await file.seek(0)
        
        # Validate filename
        self.validate_filename(file.filename)
        
        # Validate file size
        await self.validate_file_size(file)
        
        # Validate MIME type
        detected_mime = await self.validate_mime_type(file)
        
        # Generate secure filename
        secure_filename = self.generate_secure_filename(file.filename)
        
        # Save file securely
        file_path = await self.save_file_securely(file, secure_filename)
        
        return file_path, detected_mime

# Create global instance
secure_file_handler = SecureFileHandler()

@app.post("/register_vendor")
async def register_vendor(
    vendor_name: str = Form(...),
    contact_email: EmailStr = Form(...),
    msa_file: UploadFile = File(...)
):
    try:
        # Validate vendor data
        vendor_data = VendorRegistration(vendor_name=vendor_name, contact_email=contact_email)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.errors())
    
    try:
        # Validate and store file securely
        file_path, detected_mime = await secure_file_handler.validate_and_store_file(msa_file)
        
        return JSONResponse(
            content={
                "message": "Vendor registered successfully.",
                "file_path": file_path,
                "original_filename": msa_file.filename,
                "detected_mime_type": detected_mime,
                "file_size_bytes": len(await msa_file.read()) if hasattr(msa_file, 'read') else 0
            }
        )
    
    except FileValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "upload_dir": UPLOAD_DIR}

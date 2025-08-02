import pytest
import os
import shutil
import tempfile
from fastapi.testclient import TestClient
from main import app

# Create a test client
client = TestClient(app)

@pytest.fixture(scope="module")
def test_uploads_dir():
    """Create a temporary directory for test uploads"""
    test_dir = tempfile.mkdtemp()
    original_dir = "uploads"
    
    # Replace the uploads directory with test directory
    if os.path.exists(original_dir):
        shutil.rmtree(original_dir)
    os.makedirs(test_dir, exist_ok=True)
    os.symlink(test_dir, original_dir)
    
    yield test_dir
    
    # Cleanup
    if os.path.exists(original_dir):
        os.unlink(original_dir)
    shutil.rmtree(test_dir)
    os.makedirs(original_dir, exist_ok=True)

@pytest.fixture
def sample_pdf_file():
    """Create a sample PDF file for testing"""
    content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF"
    return ("test_msa.pdf", content, "application/pdf")

@pytest.fixture
def sample_non_pdf_file():
    """Create a sample non-PDF file for testing"""
    content = b"This is not a PDF file"
    return ("test_document.txt", content, "text/plain")

class TestVendorManagementAPI:
    
    def test_root_endpoint(self):
        """Test the root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "Vendor Management API is running"}

    def test_health_check(self):
        """Test the health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "vendor-management"

    def test_register_vendor_success(self, test_uploads_dir, sample_pdf_file):
        """Test successful vendor registration"""
        filename, content, content_type = sample_pdf_file
        
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "Test Vendor Inc.",
                "contact_email": "contact@testvendor.com"
            },
            files={"msa_file": (filename, content, content_type)}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "Vendor registered successfully"
        assert data["vendor_name"] == "Test Vendor Inc."
        assert data["contact_email"] == "contact@testvendor.com"
        assert "file_path" in data
        
        # Verify file was saved
        assert os.path.exists(data["file_path"])

    def test_register_vendor_missing_vendor_name(self, sample_pdf_file):
        """Test vendor registration with missing vendor name"""
        filename, content, content_type = sample_pdf_file
        
        response = client.post(
            "/register_vendor",
            data={
                "contact_email": "contact@testvendor.com"
            },
            files={"msa_file": (filename, content, content_type)}
        )
        
        assert response.status_code == 422
        
    def test_register_vendor_missing_email(self, sample_pdf_file):
        """Test vendor registration with missing email"""
        filename, content, content_type = sample_pdf_file
        
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "Test Vendor Inc."
            },
            files={"msa_file": (filename, content, content_type)}
        )
        
        assert response.status_code == 422

    def test_register_vendor_invalid_email(self, sample_pdf_file):
        """Test vendor registration with invalid email format"""
        filename, content, content_type = sample_pdf_file
        
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "Test Vendor Inc.",
                "contact_email": "invalid-email"
            },
            files={"msa_file": (filename, content, content_type)}
        )
        
        assert response.status_code == 422  # FastAPI returns 422 for validation errors

    def test_register_vendor_missing_file(self):
        """Test vendor registration with missing file"""
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "Test Vendor Inc.",
                "contact_email": "contact@testvendor.com"
            }
        )
        
        assert response.status_code == 422

    def test_register_vendor_non_pdf_file(self, sample_non_pdf_file):
        """Test vendor registration with non-PDF file"""
        filename, content, content_type = sample_non_pdf_file
        
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "Test Vendor Inc.",
                "contact_email": "contact@testvendor.com"
            },
            files={"msa_file": (filename, content, content_type)}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "The MSA file must be a PDF."

    def test_register_vendor_empty_vendor_name(self, sample_pdf_file):
        """Test vendor registration with empty vendor name"""
        filename, content, content_type = sample_pdf_file
        
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "",
                "contact_email": "contact@testvendor.com"
            },
            files={"msa_file": (filename, content, content_type)}
        )
        
        assert response.status_code == 400  # Should fail validation

    def test_register_vendor_multiple_vendors(self, test_uploads_dir, sample_pdf_file):
        """Test registering multiple vendors"""
        filename, content, content_type = sample_pdf_file
        
        vendors = [
            {"name": "Vendor One", "email": "vendor1@example.com"},
            {"name": "Vendor Two", "email": "vendor2@example.com"},
            {"name": "Vendor Three", "email": "vendor3@example.com"}
        ]
        
        for i, vendor in enumerate(vendors):
            test_filename = f"msa_{i+1}.pdf"
            response = client.post(
                "/register_vendor",
                data={
                    "vendor_name": vendor["name"],
                    "contact_email": vendor["email"]
                },
                files={"msa_file": (test_filename, content, content_type)}
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["vendor_name"] == vendor["name"]
            assert data["contact_email"] == vendor["email"]

    def test_register_vendor_special_characters(self, test_uploads_dir, sample_pdf_file):
        """Test vendor registration with special characters in name"""
        filename, content, content_type = sample_pdf_file
        
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "Tëst Véndor & Co., Ltd.",
                "contact_email": "contact@test-vendor.com"
            },
            files={"msa_file": (filename, content, content_type)}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["vendor_name"] == "Tëst Véndor & Co., Ltd."

    def test_404_endpoints(self):
        """Test non-existent endpoints return 404"""
        response = client.get("/non-existent")
        assert response.status_code == 404
        
        response = client.post("/non-existent")
        assert response.status_code == 404

if __name__ == "__main__":
    pytest.main([__file__])
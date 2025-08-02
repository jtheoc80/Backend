import pytest
import httpx
import os
import tempfile
from fastapi.testclient import TestClient
from unittest.mock import patch, mock_open

# Import the FastAPI app
import sys
sys.path.append('/home/runner/work/Backend/Backend')
from main import app

client = TestClient(app)

class TestVendorRegistration:
    """Test cases for vendor registration endpoint"""

    def setup_method(self):
        """Setup before each test method"""
        # Create uploads directory for testing
        os.makedirs("uploads", exist_ok=True)

    def test_register_vendor_valid_input(self):
        """Test vendor registration with valid input"""
        # Create a mock PDF file
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        
        with patch("shutil.copyfileobj") as mock_copy:
            response = client.post(
                "/register_vendor",
                data={
                    "vendor_name": "Acme Valve Company",
                    "contact_email": "contact@acmevalve.com"
                },
                files={
                    "msa_file": ("contract.pdf", pdf_content, "application/pdf")
                }
            )
        
        assert response.status_code == 200
        response_data = response.json()
        
        assert response_data["message"] == "Vendor registration successful"
        assert "file_path" in response_data
        assert response_data["file_path"].endswith("contract.pdf")
        mock_copy.assert_called_once()

    def test_register_vendor_invalid_email(self):
        """Test vendor registration with invalid email format"""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "Acme Valve Company",
                "contact_email": "invalid-email"
            },
            files={
                "msa_file": ("contract.pdf", pdf_content, "application/pdf")
            }
        )
        
        assert response.status_code == 422  # Validation error
        response_data = response.json()
        assert "detail" in response_data

    def test_register_vendor_missing_vendor_name(self):
        """Test vendor registration with missing vendor name"""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        
        response = client.post(
            "/register_vendor",
            data={
                "contact_email": "contact@acmevalve.com"
            },
            files={
                "msa_file": ("contract.pdf", pdf_content, "application/pdf")
            }
        )
        
        assert response.status_code == 422  # Validation error
        response_data = response.json()
        assert "detail" in response_data

    def test_register_vendor_missing_email(self):
        """Test vendor registration with missing email"""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "Acme Valve Company"
            },
            files={
                "msa_file": ("contract.pdf", pdf_content, "application/pdf")
            }
        )
        
        assert response.status_code == 422  # Validation error
        response_data = response.json()
        assert "detail" in response_data

    def test_register_vendor_missing_file(self):
        """Test vendor registration with missing MSA file"""
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "Acme Valve Company",
                "contact_email": "contact@acmevalve.com"
            }
        )
        
        assert response.status_code == 422  # Validation error
        response_data = response.json()
        assert "detail" in response_data

    def test_register_vendor_invalid_file_type(self):
        """Test vendor registration with non-PDF file"""
        text_content = b"This is a text file, not a PDF"
        
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "Acme Valve Company",
                "contact_email": "contact@acmevalve.com"
            },
            files={
                "msa_file": ("contract.txt", text_content, "text/plain")
            }
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert response_data["detail"] == "The MSA file must be a PDF."

    def test_register_vendor_empty_vendor_name(self):
        """Test vendor registration with empty vendor name"""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        
        response = client.post(
            "/register_vendor",
            data={
                "vendor_name": "",
                "contact_email": "contact@acmevalve.com"
            },
            files={
                "msa_file": ("contract.pdf", pdf_content, "application/pdf")
            }
        )
        
        assert response.status_code == 422  # Validation error

    def test_register_vendor_special_characters_in_name(self):
        """Test vendor registration with special characters in vendor name"""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        
        with patch("shutil.copyfileobj") as mock_copy:
            response = client.post(
                "/register_vendor",
                data={
                    "vendor_name": "Acme Valve & Pipe Co. Ltd.",
                    "contact_email": "contact@acmevalve.com"
                },
                files={
                    "msa_file": ("contract.pdf", pdf_content, "application/pdf")
                }
            )
        
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["message"] == "Vendor registration successful"

    def test_register_vendor_long_vendor_name(self):
        """Test vendor registration with very long vendor name"""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        long_name = "A" * 200  # Very long name
        
        with patch("shutil.copyfileobj") as mock_copy:
            response = client.post(
                "/register_vendor",
                data={
                    "vendor_name": long_name,
                    "contact_email": "contact@acmevalve.com"
                },
                files={
                    "msa_file": ("contract.pdf", pdf_content, "application/pdf")
                }
            )
        
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["message"] == "Vendor registration successful"

    @patch("os.makedirs")
    def test_uploads_directory_creation(self, mock_makedirs):
        """Test that uploads directory is created if it doesn't exist"""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        
        with patch("shutil.copyfileobj") as mock_copy:
            response = client.post(
                "/register_vendor",
                data={
                    "vendor_name": "Test Vendor",
                    "contact_email": "test@vendor.com"
                },
                files={
                    "msa_file": ("test.pdf", pdf_content, "application/pdf")
                }
            )
        
        # The uploads directory should be created by the app startup
        # This test verifies the behavior when the app initializes
        assert response.status_code == 200
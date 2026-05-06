import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:8000/api/v1';
const adminCredentials = {
  email: 'admin@gmail.com',
  password: 'admin@gmail.com'
};

async function runTests() {
  const results = [];

  try {
    // 1. Test Search API
    console.log('Testing Search API...');
    const searchRes = await axios.get(`${BASE_URL}/products/all?search=zya`);
    const searchData = searchRes.data;
    if (searchData.success && searchData.products && searchData.products.length > 0) {
      const foundZiya = searchData.products.some(p => p.name.toLowerCase().includes('ziya'));
      results.push({ test: 'Search (zya -> ziya)', status: foundZiya ? 'PASS' : 'FAIL', message: foundZiya ? 'Found Ziya products' : 'Ziya products not found' });
    } else {
      results.push({ test: 'Search (zya -> ziya)', status: 'FAIL', message: 'No products returned for "zya"' });
    }

    // 2. Login as Admin
    console.log('Logging in as Admin...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, adminCredentials);
    const cookie = loginRes.headers['set-cookie'];
    const tokenCookie = cookie ? cookie.find(c => c.startsWith('token=')) : null;

    if (!tokenCookie) {
      throw new Error('Login failed: Token not found in cookies');
    }
    console.log('Login successful');

    // 3. Test Bulk Import with empty/invalid data (should return success: false)
    console.log('Testing Bulk Import (0 products case)...');
    // We'll send a dummy multipart request with an empty file
    const form = new FormData();
    // Create a dummy csv file with just headers but no data
    const dummyCsv = 'Name,SKU,Description\n';
    const filePath = path.join(process.cwd(), 'dummy_empty.csv');
    fs.writeFileSync(filePath, dummyCsv);
    
    form.append('file', fs.createReadStream(filePath));

    try {
      const importRes = await axios.post(`${BASE_URL}/products/admin/import`, form, {
        headers: {
          ...form.getHeaders(),
          Cookie: tokenCookie
        }
      });
      
      const importData = importRes.data;
      if (importData.success === false && importData.message.includes('No products were imported')) {
        results.push({ test: 'Bulk Import (0 products)', status: 'PASS', message: 'Correctly returned failure for 0 products' });
      } else {
        results.push({ test: 'Bulk Import (0 products)', status: 'FAIL', message: `Unexpected response: ${JSON.stringify(importData)}` });
      }
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.success === false) {
        // This is also acceptable if we chose 400, but I changed it to 200 in the last edit
        results.push({ test: 'Bulk Import (0 products)', status: 'PASS', message: 'Correctly returned failure (400) for 0 products' });
      } else {
         results.push({ test: 'Bulk Import (0 products)', status: 'FAIL', message: err.message });
      }
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // 4. CRUD Test: Create Category -> Create Product -> Update -> Delete
    console.log('Testing CRUD for Product...');
    
    // Create Category
    const catForm = { name: 'Test Category ' + Date.now(), description: 'Test' };
    const catRes = await axios.post(`${BASE_URL}/categories/admin/new`, catForm, {
        headers: { Cookie: tokenCookie }
    });
    const categoryId = catRes.data.data._id;
    console.log('Category created:', categoryId);

    // Create Product
    // Note: createProduct expects FormData because of images, but we'll try to send partial data if allowed or dummy images
    // Actually, createProduct in controller uses req.files, so we need multipart
    const prodForm = new FormData();
    prodForm.append('name', 'Test CRUD Product ' + Date.now());
    prodForm.append('description', 'Test Description');
    prodForm.append('materialCare', 'Test Care');
    prodForm.append('category', categoryId);
    prodForm.append('variants', JSON.stringify([{ color: { name: 'Red', code: '#FF0000' }, sizes: [{ name: 'S', stock: 10, price: 100 }] }]));
    
    const prodRes = await axios.post(`${BASE_URL}/products/admin/new`, prodForm, {
        headers: { ...prodForm.getHeaders(), Cookie: tokenCookie }
    });
    
    const productId = prodRes.data.data._id;
    console.log('Product created:', productId);
    results.push({ test: 'Product Create', status: 'PASS', message: 'Product created successfully' });

    // Update Product
    const updateForm = new FormData();
    updateForm.append('name', 'Updated Test CRUD Product');
    const updateRes = await axios.put(`${BASE_URL}/products/admin/${productId}`, updateForm, {
        headers: { ...updateForm.getHeaders(), Cookie: tokenCookie }
    });
    console.log('Product updated');
    results.push({ test: 'Product Update', status: 'PASS', message: 'Product updated successfully' });

    // Delete Product
    await axios.delete(`${BASE_URL}/products/admin/${productId}`, {
        headers: { Cookie: tokenCookie }
    });
    console.log('Product deleted');
    results.push({ test: 'Product Delete', status: 'PASS', message: 'Product deleted successfully' });

    // Cleanup Category
    await axios.delete(`${BASE_URL}/categories/admin/${categoryId}`, {
        headers: { Cookie: tokenCookie }
    });

  } catch (error) {
    console.error('Test Suite Error:', error.message);
    if (error.response) console.error('Response Data:', error.response.data);
    results.push({ test: 'Global', status: 'ERROR', message: error.message });
  }

  console.log('\n--- TEST RESULTS ---');
  console.table(results);
}

runTests();

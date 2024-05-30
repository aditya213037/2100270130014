const express = require("express");
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');

const app = express();
const port = 9876;

const cache = new NodeCache({ stdTTL: 300 }); 

const ECOMMERCE_API_BASE_URL = 'http://20.244.56.144/test/companies'; 

const registerWithAllCompanies = async () => {
    try {
        const res = await axios.post(`${ECOMMERCE_API_BASE_URL}/register`);
        console.log('Registered with e-commerce companies:', res.data);
    } catch (error) {
        console.error('Error registering with e-commerce companies:', error.message);
    }
};

registerWithAllCompanies();

// Function to fetch product data from each e-commerce company's API
const fetchProductData = async (category, minPrice, maxPrice) => {
    const companies = ['AMZ', 'FLP', 'SNP', 'MYN', 'AZO'];
    let allProducts = [];

    for (const company of companies) {
        try {
            const res = await axios.get(`${ECOMMERCE_API_BASE_URL}/${company}/categories/${category}/products`, {
                params: {
                    minPrice,
                    maxPrice,
                    top: 10
                }
            });
            const products = res.data.filter(product => 
                product.productName && product.price && product.rating && product.discount && product.availability
            );
            allProducts = allProducts.concat(products);
        } catch (error) {
            console.error(`Error fetching products from ${company}:`, error.message);
        }
    }

    return allProducts;
};

// Function to sort products
const sortProducts = (products, sortBy, sortOrder) => 
    {
        return products.sort((a, b) => {
            if (sortOrder === 'asc') {
                return a[sortBy] - b[sortBy];
            } else {
                return b[sortBy] - a[sortBy];
            }
    });
};

// Generate unique IDs for products
const addUniqueIds = (products) => 
    {
    return products.map(product => 
    ({
        ...product,
        id: uuidv4()
    }));
};

// GET endpoint to retrieve top N products within a category
app.get("/categories/:categoryname/products", async (req, res) => 
    {
    const { categoryname } = req.params;
    const { n = 10, page = 1, sortBy = 'rating', sortOrder = 'desc', minPrice = 0, maxPrice = Infinity } = req.query;

    const cacheKey = `${categoryname}-${minPrice}-${maxPrice}-${sortBy}-${sortOrder}-${page}-${n}`;
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
        return res.json(cachedResponse);
    }

    try {
        let products = await fetchProductData(categoryname, minPrice, maxPrice);

        // Add unique IDs to products
        products = addUniqueIds(products);

        // Sort products
        products = sortProducts(products, sortBy, sortOrder);

        // Implement pagination
        const startIndex = (page - 1) * n;
        const endIndex = startIndex + parseInt(n);
        const paginatedProducts = products.slice(startIndex, endIndex);

        const response = {
            total: products.length,
            page: parseInt(page),
            perPage: parseInt(n),
            products: paginatedProducts
        };

        // Cache the response
        cache.set(cacheKey, response);

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
        console.error('Error handling request:', error.message);
    }
});

// GET endpoint to retrieve product details by ID
app.get("/categories/:categoryname/products/:productid", async (req, res) => {
    const { categoryname, productid } = req.params;

    try {
        const cachedProducts = cache.keys()
            .filter(key => key.startsWith(`${categoryname}-`))
            .map(key => cache.get(key))
            .reduce((acc, curr) => acc.concat(curr.products), []);

        const product = cachedProducts.find(p => p.id === productid);

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
        console.error('Error handling request:', error.message);
    }
});

app.listen(port, () => {
    console.log(`Server running at port ${port}`);
});

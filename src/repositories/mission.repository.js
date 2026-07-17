class ProductRepository {
    async getAllProducts() {
        this.products = await Product.findAll();
        return this.products;
    }

    async getProductById(id) {
        this.product = await Product.findByPk(id);
        return this.product;
    }

    async createProduct(productData) {
        this.product = await Product.create(productData);
        return this.product;
    }

    async updateProduct(id, productData) {
        this.product = await Product.findByPk(id); 
        await this.product.update(productData);
        return this.product;
    }

    async deleteProduct(id) {
        this.product = await Product.findByPk(id);
        await this.product.destroy();
        return this.product;
    }
    
    }
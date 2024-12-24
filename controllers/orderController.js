const Order = require("../models/Order");
const Product = require("../models/Product");

exports.createOrder = async (req, res) => {
    try {
      const { DealerCode, DealerName, Products, Remarks } = req.body;
  
      // Check if Products is an array
      if (!Array.isArray(Products) || Products.length === 0) {
        return res.status(400).json({ error: 'Products must be a non-empty array' });
      }
  
      // Calculate total price from products
      const totalPrice = Products.reduce((acc, product) => {
        // Validate each product's structure
        if (!product.Price || !product.Quantity) {
          throw new Error('Each product must have Price and Quantity fields');
        }
        return acc + product.Price * product.Quantity;
      }, 0);
  
      const order = new Order({
        DealerCode,
        DealerName,
        Products,
        TotalPrice: totalPrice,
        Remarks
      });
  
      await order.save();
  
      return res.status(201).json({ message: 'Order created successfully!', order });
    } catch (error) {
      console.error("Error creating order:", error.message || error);
      return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  };
  
  
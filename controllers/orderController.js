const Order = require("../models/Order");
const Product = require("../models/Product");

exports.createOrder = async (req, res) => {
  try {
    console.log("Creating Order...");

    // Extract dealer details and products from request
    const { dealerCode, shopName } = req; // shopName is extracted from req
    const { products, remarks } = req.body;

    console.log("Dealer Code, Dealer Name (ShopName), Products:", dealerCode, shopName, products);

    // Validate if products is a non-empty array
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products must be a non-empty array' });
    }

    // Calculate total price from products
    const totalPrice = products.reduce((acc, product) => {
      // Validate each product's structure
      if (!product.Price || !product.Quantity) {
        throw new Error('Each product must have Price and Quantity fields');
      }
      return acc + product.Price * product.Quantity;
    }, 0);

    // Create new order
    const order = new Order({
      DealerCode: dealerCode,
      DealerName: shopName, // Use shopName from request as DealerName
      Products: products,
      TotalPrice: totalPrice,
      Remarks: remarks || '', // Optional remarks field
    });

    // Save the order to the database
    await order.save();

    // Respond with success
    return res.status(201).json({ message: 'Order created successfully!', order });
  } catch (error) {
    console.error("Error creating order:", error.message || error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
  

exports.getOrdersForDealers = async (req, res) => {
  try {
    const { dealerCode } = req; // Extract dealerCode from request parameters

    if (!dealerCode) {
      return res.status(400).json({ error: 'Dealer code is required' });
    }

    // Fetch all orders for the given dealer code
    const orders = await Order.find({ DealerCode: dealerCode }).sort({ OrderDate: -1 }); // Sort by OrderDate (most recent first)

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: 'No orders found for this dealer' });
    }

    // Respond with the orders
    return res.status(200).json({ message: 'Orders retrieved successfully', orders });
  } catch (error) {
    console.error('Error retrieving orders:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
  
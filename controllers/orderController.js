const Product = require("../models/Product");

exports.createOrder = async (req, res) => {
    try {
      const { DealerCode, DealerName, Products, Remarks } = req.body;
  
      // Calculate total price from products
      const totalPrice = Product.reduce((acc, product) => acc + product.Price * product.Quantity, 0);
  
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
      console.error("Error creating order:", error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  
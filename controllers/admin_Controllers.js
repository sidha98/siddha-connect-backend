const ExtractionRecord = require("../models/ExtractionRecord");
const Order = require("../models/Order");
const Product = require("../models/Product");
const SalesDataMTDW = require("../models/SalesDataMTDW");
const SegmentTarget = require("../models/SegmentTarget");
const User = require("../models/User");

// extraction  Records controller 
exports.editExtraction = async (req, res) => {
  try {
    const { id } = req.params; 
    const updates = req.body; 


    if (!id) {
      return res
        .status(400)
        .json({ message: "Extraction record ID is required." });
    }


    const updatedRecord = await ExtractionRecord.findByIdAndUpdate(
      id,
      updates,
      {
        new: true, 
        runValidators: true, 
      }
    );

    if (!updatedRecord) {
      return res.status(404).json({ message: "Extraction record not found." });
    }

    res.status(200).json({
      message: "Extraction record updated successfully.",
      data: updatedRecord,
    });
  } catch (error) {
    console.error("Error in editing extraction:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
exports.deleteExtraction = async (req, res) => {
 try {
     const { id } = req.params; 

    
     if (!id) {
         return res.status(400).json({ message: "Extraction record ID is required." });
     }

     const deletedRecord = await ExtractionRecord.findByIdAndDelete(id);

     if (!deletedRecord) {
         return res.status(404).json({ message: "Extraction record not found." });
     }

     res.status(200).json({
         message: "Extraction record deleted successfully.",
         data: deletedRecord
     });
 } catch (error) {
     console.error("Error in deleting extraction:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};


// controllers for order 
exports.getOrderForAdmin = async (req, res) => {
 try {
   const { dealerCode, status, startDate, endDate, sortBy, sortOrder } = req.query;

   
   const filter = {};

   if (dealerCode) {
     filter.DealerCode = dealerCode;
   }

   if (status) {
     filter.OrderStatus = status;
   }

   if (startDate || endDate) {
     filter.OrderDate = {};
     if (startDate) {
       filter.OrderDate.$gte = new Date(new Date(startDate).setUTCHours(0, 0, 0, 0));
     }
     if (endDate) {
       filter.OrderDate.$lte = new Date(new Date(endDate).setUTCHours(23, 59, 59, 999));
     }
   }

 
   const sortOptions = {};
   if (sortBy) {
     sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
   } else {
     sortOptions.OrderDate = -1; 
   }

   // Fetch orders
   const orders = await Order.find(filter).sort(sortOptions).lean();

   if (!orders || orders.length === 0) {
     return res.status(404).json({ message: 'No orders found' });
   }

   
   const productIds = orders.flatMap(order => order.Products.map(product => product.ProductId));
   const products = await Product.find({ _id: { $in: productIds } }, { Model: 1, ProductCode: 1 }).lean();

   
   const productDetailsMap = products.reduce((map, product) => {
     map[product._id.toString()] = { Model: product.Model, ProductCode: product.ProductCode };
     return map;
   }, {});

   
   const missingProducts = [];

   // Enhance orders with product details
   const enhancedOrders = orders.map(order => ({
     ...order,
     Products: order.Products.map(product => {
       const details = productDetailsMap[product.ProductId];
       if (!details) {
         missingProducts.push(product.ProductId); 
       }
       return {
         ...product,
         Model: details?.Model || null,
         ProductCode: details?.ProductCode || null,
       };
     }),
   }));

  
   const response = {
     message: 'Orders retrieved successfully',
     orders: enhancedOrders,
   };

   if (missingProducts.length > 0) {
     response.missingProducts = Array.from(new Set(missingProducts)); 
   }

   return res.status(200).json(response);
 } catch (error) {
   console.error('Error retrieving orders for admin:', error.message || error);
   return res.status(500).json({ error: 'Internal Server Error' });
 }
};


exports.editOrderForAdmin = async (req, res) => {
 console.log("hitting the order ")
 try {
     const { id } = req.params; 
     const updates = req.body; 

    
     if (!id) {
         return res.status(400).json({ message: "Order ID is required." });
     }

    
     const updatedOrder = await Order.findByIdAndUpdate(id, updates, {
         new: true, 
         runValidators: true, 
     });

     if (!updatedOrder) {
         return res.status(404).json({ message: "Order not found." });
     }

     res.status(200).json({
         message: "Order updated successfully.",
         data: updatedOrder
     });
 } catch (error) {
     console.error("Error in editing order for admin:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};

exports.deleteOrderForAdmin = async (req, res) => {
 try {
     const { id } = req.params; 
     if (!id) {
         return res.status(400).json({ message: "Order ID is required." });
     }
     const deletedOrder = await Order.findByIdAndDelete(id);

     if (!deletedOrder) {
         return res.status(404).json({ message: "Order not found." });
     }

     res.status(200).json({
         message: "Order deleted successfully.",
         data: deletedOrder,
     });
 } catch (error) {
     console.error("Error in deleting order for admin:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};



// controllers for products
exports.editProductForAdmin = async (req, res) => {
 try {
     const { id } = req.params; 
     const updates = req.body; 
     
     if (!id) {
         return res.status(400).json({ message: "Product ID is required." });
     }

   
     const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
         new: true,
         runValidators: true, 
     });

     if (!updatedProduct) {
         return res.status(404).json({ message: "Product not found." });
     }

     res.status(200).json({
         message: "Product updated successfully.",
         data: updatedProduct
     });
 } catch (error) {
     console.error("Error in editing product for admin:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};
exports.deleteProductForAdmin = async (req, res) => {
 try {
     const { id } = req.params;
     
     if (!id) {
         return res.status(400).json({ message: "Product ID is required." });
     }

     
     const deletedProduct = await Product.findByIdAndDelete(id);

     if (!deletedProduct) {
         return res.status(404).json({ message: "Product not found." });
     }

     res.status(200).json({
         message: "Product deleted successfully.",
         data: deletedProduct
     });
 } catch (error) {
     console.error("Error in deleting product for admin:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};


// Segment target 
exports.getSegmentForAdmin = async (req, res) => {
 try {
     // Fetch all segment data
     const segments = await SegmentTarget.find();

     if (!segments || segments.length === 0) {
         return res.status(404).json({ message: "No segment data found." });
     }

     res.status(200).json({
         message: "Segment data retrieved successfully.",
         data: segments
     });
 } catch (error) {
     console.error("Error in retrieving segment data for admin:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};
exports.editSegmentForAdmin = async (req, res) => {
 try {
     const { id } = req.params; 
     const updates = req.body; 

   
     if (!id) {
         return res.status(400).json({ message: "Segment ID is required." });
     }

  
     if (!updates || Object.keys(updates).length === 0) {
         return res.status(400).json({ message: "No updates provided." });
     }

   
     const updatedSegment = await SegmentTarget.findByIdAndUpdate(id, updates, {
         new: true, 
         runValidators: true, 
     });

     if (!updatedSegment) {
         return res.status(404).json({ message: "Segment data not found." });
     }

     res.status(200).json({
         message: "Segment data updated successfully.",
         data: updatedSegment
     });
 } catch (error) {
     console.error("Error in editing segment data for admin:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};
exports.deleteSegmentForAdmin = async (req, res) => {
 try {
     const { id } = req.params; 
     if (!id) {
         return res.status(400).json({ message: "Segment ID is required." });
     }


     const deletedSegment = await SegmentTarget.findByIdAndDelete(id);

     if (!deletedSegment) {
         return res.status(404).json({ message: "Segment data not found." });
     }

     res.status(200).json({
         message: "Segment data deleted successfully.",
         data: deletedSegment
     });
 } catch (error) {
     console.error("Error in deleting segment data for admin:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};

// sales data mtd wise 
exports.getSalesDataForAdmin = async (req, res) => {
 const { page = 1, limit = 5 } = req.query; 

 try {
   const skip = (page - 1) * limit; 
   const salesData = await SalesDataMTDW.find()
     .skip(skip) 
     .limit(Number(limit)); 

   if (!salesData || salesData.length === 0) {
     return res.status(404).json({ message: "No sales data found." });
   }

   // Get the total count for pagination
   const totalCount = await SalesDataMTDW.countDocuments();

   res.status(200).json({
     message: "Sales data retrieved successfully.",
     data: salesData,
     totalCount, // Send total count for pagination logic
   });
 } catch (error) {
   console.error("Error in retrieving sales data for admin:", error);
   res.status(500).json({ message: "Internal server error." });
 }
};

exports.editSalesDataForAdmin = async (req,res) =>{
 try{
console.log("hiting api ")
 }catch(error){
  console.log("error while editing sales data" , error)
 }
}

exports.deleteSalesData = async (req,res) =>{
 try{
console.log("hiting api ")
 }catch(error){
  console.log("error while editing sales data" , error)
 }
}

// users

exports.UserForAdmin = async (req, res) => {
 try {
     // Retrieve all users from the database
     const users = await User.find().populate("role").populate("parents");

     if (!users || users.length === 0) {
         return res.status(404).json({ message: "No users found." });
     }

     res.status(200).json({
         message: "Users retrieved successfully.",
         data: users,
     });
 } catch (error) {
     console.error("Error retrieving users:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};
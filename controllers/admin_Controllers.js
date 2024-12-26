const ExtractionRecord = require("../models/ExtractionRecord");
const Order = require("../models/Order");
const Product = require("../models/Product");
const SegmentTarget = require("../models/SegmentTarget");

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
     
     const { dealerCode, status, sortBy, sortOrder } = req.query;


     const filter = {};
     if (dealerCode) filter.DealerCode = dealerCode;
     if (status) filter.OrderStatus = status;


     const sortOptions = {};
     if (sortBy) {
         sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
     }

  
     const orders = await Order.find(filter)
         .populate('Products.ProductId') 
         .sort(sortOptions);

   
     res.status(200).json({
         message: "Orders fetched successfully.",
         data: orders
     });
 } catch (error) {
     console.error("Error fetching orders for admin:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};

exports.editOrderForAdmin = async (req, res) => {
 try {
     const { id } = req.params; // Order ID from route parameter
     const updates = req.body; // Updates to be applied, provided in the request body

     // Validate that the ID is provided
     if (!id) {
         return res.status(400).json({ message: "Order ID is required." });
     }

     // Update the order
     const updatedOrder = await Order.findByIdAndUpdate(id, updates, {
         new: true, // Return the updated document
         runValidators: true, // Ensure validation rules in the schema are applied
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
     const { id } = req.query; // Order ID from query parameters

     // Validate that the ID is provided
     if (!id) {
         return res.status(400).json({ message: "Order ID is required." });
     }

     // Find and delete the order
     const deletedOrder = await Order.findByIdAndDelete(id);

     if (!deletedOrder) {
         return res.status(404).json({ message: "Order not found." });
     }

     res.status(200).json({
         message: "Order deleted successfully.",
         data: deletedOrder
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
 try {
     // Fetch all sales data
     const salesData = await SalesDataMTDW.find();

     if (!salesData || salesData.length === 0) {
         return res.status(404).json({ message: "No sales data found." });
     }

     res.status(200).json({
         message: "Sales data retrieved successfully.",
         data: salesData
     });
 } catch (error) {
     console.error("Error in retrieving sales data for admin:", error);
     res.status(500).json({ message: "Internal server error." });
 }
};
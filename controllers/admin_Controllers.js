const Dealer = require("../models/Dealer");
const EmployeeCode = require("../models/EmployeeCode");
const ExtractionRecord = require("../models/ExtractionRecord");
const ModelData = require("../models/ModelData");
const Order = require("../models/Order");
const Product = require("../models/Product");
const SalesDataMTDW = require("../models/SalesDataMTDW");
const SegmentTarget = require("../models/SegmentTarget");
const User = require("../models/User");
const csvParser = require("csv-parser");
const { Readable } = require("stream");

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
// exports.getSegmentForAdmin = async (req, res) => {
//  try {
//      // Fetch all segment data
//      const segments = await SegmentTarget.find();

//      if (!segments || segments.length === 0) {
//          return res.status(404).json({ message: "No segment data found." });
//      }

//      res.status(200).json({
//          message: "Segment data retrieved successfully.",
//          data: segments
//      });
//  } catch (error) {
//      console.error("Error in retrieving segment data for admin:", error);
//      res.status(500).json({ message: "Internal server error." });
//  }
// };
exports.getSegmentForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Default to 10 items per page

    const skip = (page - 1) * limit;

    const [segments, total] = await Promise.all([
      SegmentTarget.find().skip(skip).limit(limit),
      SegmentTarget.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: segments,
      pagination: {
        totalItems: total,
        currentPage: page,
        totalPages: totalPages,
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
  const { page = 1, limit = 20, search = "", startDate, endDate } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const query = {};

    // Add universal search
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { "TSE": { $regex: search, $options: "i" } },
        { "ASM": { $regex: search, $options: "i" } },
        { "SELLER NAME": { $regex: search, $options: "i" } },
        { "BUYER": { $regex: search, $options: "i" } },
        { "MODEL CODE": { $regex: search, $options: "i" } },
        { "MARKET": { $regex: search, $options: "i" } },
      ];
    }

    // Add date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }


    const salesData = await SalesDataMTDW.find(query).skip(skip).limit(Number(limit));

    if (!salesData || salesData.length === 0) {
      return res.status(404).json({ message: "No sales data found." });
    }

    const totalCount = await SalesDataMTDW.countDocuments(query);

    res.status(200).json({
      message: "Sales data retrieved successfully.",
      data: salesData,
      totalCount,
    });
  } catch (error) {
    console.error("Error in retrieving sales data for admin:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
exports.editSalesDataForAdmin = async (req, res) => {
  try {
    console.log("hiting api ")
  } catch (error) {
    console.log("error while editing sales data", error)
  }
};
exports.deleteSalesData = async (req, res) => {
  try {
    console.log("hiting api ")
  } catch (error) {
    console.log("error while editing sales data", error)
  }
};

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
exports.editUserForAdmin = async (req, res) => {
  try {
    console.log("hitting edit api")
  } catch (error) {
    console.log("can not edit user", error)
  }
};
exports.deleteUserForAdmin = async (req, res) => {
  try {
    console.log("hitting delete user api")
  } catch (error) {
    console.log("error deleting user", error);
  }
};


// Extraction Controller

exports.getExtractionForAdmin = async (req, res) => {
  try {
    const { query, page = 1, limit = 20, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const filters = {};
    if (query && query.trim() !== "") {
      const lowerCaseQuery = query.toLowerCase();
      filters.$or = [
        { dealerCode: { $regex: lowerCaseQuery, $options: 'i' } },
        { uploadedBy: { $regex: lowerCaseQuery, $options: 'i' } },
        { status: { $regex: lowerCaseQuery, $options: 'i' } },
        { 'productId.Brand': { $regex: lowerCaseQuery, $options: 'i' } },
        { 'productId.Model': { $regex: lowerCaseQuery, $options: 'i' } },
        { 'productId.Category': { $regex: lowerCaseQuery, $options: 'i' } },
      ];
    }

    if (startDate && endDate) {
      filters.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const extractionRecords = await ExtractionRecord.find(filters)
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'productId',
        select: 'Brand Model Price Segment Category Status AdditionalInfo',
      });

    if (extractionRecords.length === 0) {
      return res.status(200).json({ message: 'No Matching Records Found' });
    }

    const recordsWithDetails = await Promise.all(
      extractionRecords.map(async (record) => {
        const employee = await EmployeeCode.findOne({ Code: record.uploadedBy }).select('Name');
        const dealer = await Dealer.findOne({ dealerCode: record.dealerCode }).select('shopName');

        return {
          ID: record._id,
          'Dealer Code': record.dealerCode,
          'Shop Name': dealer ? dealer.shopName : 'N/A',
          Brand: record.productId?.Brand,
          Model: record.productId?.Model,
          Category: record.productId?.Category,
          Quantity: record.quantity,
          Price: record.productId?.Price,
          'Total Price': record.totalPrice,
          Segment: record.productId?.Segment,
          'Uploaded By': record.uploadedBy,
          'Employee Name': employee ? employee.Name : 'N/A',
          Status: record.productId?.Status,
          Date: record.date?.toISOString().split('T')[0] || 'N/A',
          'Admin Note': record.adminNote || 'N/A',
        };
      })
    );
    const columns = {
      columns: [
        'ID',
        'Dealer Code',
        'Shop Name',
        'Brand',
        'Model',
        'Category',
        'Quantity',
        'Dealer Price',
        'Total Price',
        'Segment',
        'Uploaded By',
        'Employee Name',
        'Status',
        'Date',
        'Admin Note',
      ],
    };

    const totalRecords = await ExtractionRecord.countDocuments(filters);
    const totalPages = Math.ceil(totalRecords / limit);
    recordsWithDetails.unshift(columns);

    return res.status(200).json({
      records: recordsWithDetails,
      totalRecords,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching data for admin extraction:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
exports.editExtractionForAdmin = async (req, res) => {
  try {
    console.log("httiing extraction edit api");
  } catch (error) {
    consle.log("error editing extraction");
  }
}
exports.deleteExtractionForAdmin = async (req, res) => {
  try {
    console.log("hitting delete extraction")
  } catch (error) {
    console.log("error deleting extraction")
  }
}
// Dealer Controllers
exports.getDealerForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const skip = (page - 1) * limit;

    const dealers = await Dealer.find()
      .skip(skip)
      .limit(limit)
      .exec();
    const totalDealers = await Dealer.countDocuments();

    const response = {
      currentPage: page,
      totalPages: Math.ceil(totalDealers / limit),
      totalRecords: totalDealers,
      data: dealers
    };

    // Send response
    res.status(200).json(response);
  } catch (error) {
    console.error("Error getting dealers:", error.message);
    res.status(500).json({ message: "Error getting dealers", error: error.message });
  }
}
exports.editDealerForAdmin = async (req, res) => {
  try {
    console.log("hitting editing dealer ")

  } catch (error) {
    console.log("error editing data")
  }
}
exports.deleteDealerForAdmin = async (req, res) => {
  try {
    console.log("delete dealer ");
  } catch {
    console.log("error deleting dealer");
  }
}
// Model Controller
exports.getModelForAdmin = async (req, res) => {
  try {
    console.log("Fetching model data");
    const data = await ModelData.find({});
    res.status(200).json({
      success: true,
      message: "Model data fetched successfully",
      data: data,
    });
  } catch (error) {
    console.error("Error fetching model data:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching model data",
      error: error.message,
    });
  }
}

exports.editModelForAdmin = async (req, res) => {
  try {
    console.log("Hitting editing model")
  } catch (error) {
    console.log("error editing model")
  }
}
exports.deleteModelData = async (req, res) => {
  try {
    console.log("hitting delete model api ")
  } catch (error) {
    console.log("error deleting model")
  }
}

// ============28/01/2025=============

//get credit limit
// const CreditLimit = require("../models/creditLimit"); // Import the model

exports.getCreditLimitsForAdmin = async (req, res) => {
  // Get page, limit, and dealerCategory from query parameters, with defaults
  const { page = 1, limit = 50, dealerCategory = 'MDD' } = req.query;

  // Calculate the number of documents to skip
  const skip = (page - 1) * limit;

  try {
    console.log("Fetching Paginated Credit Limits...");

    // Build filter object based on dealerCategory selection
    let filter = {};
    if (dealerCategory !== 'All') {
      filter.dealerCategory = dealerCategory; // Only filter by dealerCategory if not 'All'
    }

    // Fetch paginated documents from the Dealer collection
    const creditLimits = await Dealer.find(
      filter, // Apply filter based on dealerCategory
      { dealerCode: 1, shopName: 1, credit_limit: 1, _id: 1, dealerCategory: 1 } // Project specific fields
    )
      .skip(skip) // Skip documents based on the page number
      .limit(parseInt(limit)) // Limit the number of documents per page
      .lean();
    // Count the total number of documents for pagination metadata

    const totalRecords = await Dealer.countDocuments(filter); // Count based on filter

    // If no data is found
    if (!creditLimits || creditLimits.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No credit limits found",
      });
    }

    // Return paginated data and metadata
    res.status(200).json({
      success: true,
      message: "Credit limits fetched successfully",
      data: creditLimits,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching credit limits:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch credit limits",
      error: error.message,
    });
  }
};


// put particular dealer's credit limit
exports.updateSingleCreditLimitForAdmin = async (req, res) => {
  try {
    const { dealerCode } = req.query;  // Get dealer code from query params
    const { credit_limit } = req.body;  // Get credit limit from request body

    // Validate inputs
    if (!dealerCode) {
      return res.status(400).json({ success: false, message: 'Dealer code is required.' });
    }

    if (credit_limit === undefined || isNaN(credit_limit)) {
      return res.status(400).json({ success: false, message: 'A valid credit limit is required.' });
    }

    // Find and update the dealer's credit limit
    const updatedDealer = await Dealer.findOneAndUpdate(
      { dealerCode },
      { credit_limit },
      { new: true, runValidators: true }
    );

    if (!updatedDealer) {
      return res.status(404).json({ success: false, message: 'Dealer not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Dealer credit limit updated successfully.',
      data: updatedDealer,
    });
  } catch (error) {
    console.error('Error updating dealer credit limit:', error);
    res.status(500).json({ success: false, message: 'Error updating the credit limit.', error: error.message });
  }
};

// put dealer's credit limit in bulk
exports.updateCreditLimitFromCsvForAdmin = async (req, res) => {
  try {
    // Ensure a file is uploaded
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    // Ensure the uploaded file is a CSV file
    if (!req.file.originalname.endsWith(".csv")) {
      return res.status(400).send("Unsupported file format. Please upload a CSV file.");
    }

    // Parse the CSV file
    const results = [];
    const stream = new Readable();
    stream.push(req.file.buffer);
    stream.push(null);

    stream
      .pipe(csvParser())
      .on("data", (data) => {
        results.push(data);
      })
      .on("end", async () => {
        try {
          let updateCount = 0;

          // Loop through the parsed CSV rows
          for (const row of results) {
            const dealerCode = row["dealerCode"];
            const shopName = row["shopName"];
            const creditLimit = parseFloat(row["credit_limit"]);

            // Skip rows with invalid or missing data
            if (!dealerCode || !shopName || isNaN(creditLimit)) {
              continue;
            }

            // Check if a record with matching dealerCode and shopName exists in the database
            const existingRecord = await Dealer.findOne({ dealerCode, shopName });

            if (existingRecord) {
              // Update only the credit_limit field
              existingRecord.credit_limit = creditLimit;
              await existingRecord.save();
              updateCount++;
            }
          }

          // Respond with the number of updated records
          res.status(200).json({
            success: true,
            message: `${updateCount} dealers' credit limits updated successfully.`,
          });
        } catch (error) {
          console.error("Error updating credit limits:", error);
          res.status(500).json({
            success: false,
            message: "An error occurred while updating credit limits.",
            error: error.message,
          });
        }
      });
  } catch (error) {
    console.error("Error processing CSV file:", error);
    res.status(500).json({
      success: false,
      message: "An internal error occurred while processing the request.",
      error: error.message,
    });
  }
};

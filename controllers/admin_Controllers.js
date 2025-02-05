const mongoose = require("mongoose");
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
const tallyTransaction = require("../models/TallyTransaction");
const bcrypt = require("bcrypt");
const csv = require("csv-parser");
const xml = require("xml2js");
const fs = require("fs");
const { application } = require("express");
const { console } = require("inspector");
const moment = require("moment");
const DealerListTseWise = require("../models/DealerListTseWise");

// controllers for order
exports.getOrderForAdmin = async (req, res) => {
  try {
    const { dealerCode, status, startDate, endDate, sortBy, sortOrder } =
      req.query;

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
        filter.OrderDate.$gte = new Date(
          new Date(startDate).setUTCHours(0, 0, 0, 0)
        );
      }
      if (endDate) {
        filter.OrderDate.$lte = new Date(
          new Date(endDate).setUTCHours(23, 59, 59, 999)
        );
      }
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions.OrderDate = -1;
    }

    // Fetch orders
    const orders = await Order.find(filter).sort(sortOptions).lean();

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    const productIds = orders.flatMap((order) =>
      order.Products.map((product) => product.ProductId)
    );
    const products = await Product.find(
      { _id: { $in: productIds } },
      { Model: 1, ProductCode: 1 }
    ).lean();

    const productDetailsMap = products.reduce((map, product) => {
      map[product._id.toString()] = {
        Model: product.Model,
        ProductCode: product.ProductCode,
      };
      return map;
    }, {});

    const missingProducts = [];

    // Enhance orders with product details
    const enhancedOrders = orders.map((order) => ({
      ...order,
      Products: order.Products.map((product) => {
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
      message: "Orders retrieved successfully",
      orders: enhancedOrders,
    };

    if (missingProducts.length > 0) {
      response.missingProducts = Array.from(new Set(missingProducts));
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error retrieving orders for admin:", error.message || error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.editOrderForAdmin = async (req, res) => {
  console.log("hitting the order ");
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
      data: updatedOrder,
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
      data: updatedProduct,
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
      data: deletedProduct,
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
    const limit = parseInt(req.query.limit) || 20; // Default items per page

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
    console.error("Error fetching segments:", error);
    res.status(500).json({ success: false, message: "Server error" });
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
      data: updatedSegment,
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
      data: deletedSegment,
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
        { TSE: { $regex: search, $options: "i" } },
        { ASM: { $regex: search, $options: "i" } },
        { "SELLER NAME": { $regex: search, $options: "i" } },
        { BUYER: { $regex: search, $options: "i" } },
        { "MODEL CODE": { $regex: search, $options: "i" } },
        { MARKET: { $regex: search, $options: "i" } },
      ];
    }

    // Add date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const salesData = await SalesDataMTDW.find(query)
      .skip(skip)
      .limit(Number(limit));

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
    console.log("hiting api ");
  } catch (error) {
    console.log("error while editing sales data", error);
  }
};
// ================= h D s =========================
// exports.editSalesDataForAdmin = async (req, res) => {
//   const { id } = req.params; // Assuming the ID is passed as a URL parameter.
//   const updates = req.body; // Data to be updated is in the body of the request.

//   try {
//     console.log("Hitting API to edit sales data");

//     // Find the sales data by ID and update it
//     const updatedSalesData = await SalesDataMTDW.findByIdAndUpdate(id, updates, { new: true });

//     if (!updatedSalesData) {
//       return res.status(404).json({ message: "Sales data not found." });
//     }

//     res.status(200).json({
//       message: "Sales data updated successfully.",
//       data: updatedSalesData,
//     });
//   } catch (error) {
//     console.error("Error while editing sales data:", error);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };
// ==========================================
exports.deleteSalesData = async (req, res) => {
  try {
    console.log("hiting api ");
  } catch (error) {
    console.log("error while editing sales data", error);
  }
};
// ================== h D s ========================
// exports.deleteSalesData = async (req, res) => {
//   const { id } = req.params; // Assuming the ID is passed as a URL parameter.

//   try {
//     console.log("Hitting API to delete sales data");

//     // Find and delete the sales data by ID
//     const deletedSalesData = await SalesDataMTDW.findByIdAndDelete(id);

//     if (!deletedSalesData) {
//       return res.status(404).json({ message: "Sales data not found." });
//     }

//     res.status(200).json({
//       message: "Sales data deleted successfully.",
//       data: deletedSalesData,
//     });
//   } catch (error) {
//     console.error("Error while deleting sales data:", error);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };
// ==========================================
// users

exports.UserForAdmin = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const query = req.query.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      filter.$or = [
        { name: { $regex: lowerCaseQuery, $options: "i" } },
        { email: { $regex: lowerCaseQuery, $options: "i" } },
        { position: { $regex: lowerCaseQuery, $options: "i" } },
      ];
    }

    // Retrieve all users from the database
    const users = await User.find(filter)
      .skip(skip)
      .limit(limit)
      .populate("role")
      .populate("parents")
      .lean();
    const totalCount = await User.countDocuments(filter);

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found.",
      });
    }

    res.status(200).json({
      success: true,
      totalCount: totalCount,
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
    // console.log("Hitting edit user API");

    const { id } = req.params; // Extract the user ID from the URL
    const updates = req.body; // Extract the updates from the request body

    // Validate the presence of the user ID
    if (!id) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Validate the presence of updates
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No updates provided." });
    }

    // Find the user by ID and update with the provided data
    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true, // Return the updated document
      runValidators: true, // Ensure data validation is run
    });

    // Handle case where the user is not found
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Send a success response
    res.status(200).json({
      message: "User updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Cannot edit user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
// ================== h D s ========================
// exports.editUserForAdmin = async (req, res) => {
//   try {
//     console.log("Hitting edit user API");

//     const { id } = req.params; // Extract the user ID from the URL
//     const updates = req.body; // Extract the updates from the request body

//     // Validate the presence of the user ID
//     if (!id) {
//       return res.status(400).json({ message: "User ID is required." });
//     }

//     // Validate the presence of updates
//     if (!updates || Object.keys(updates).length === 0) {
//       return res.status(400).json({ message: "No updates provided." });
//     }

//     // Find the user by ID and update with the provided data
//     const updatedUser = await User.findByIdAndUpdate(id, updates, {
//       new: true, // Return the updated document
//       runValidators: true, // Ensure data validation is run
//     });

//     // Handle case where the user is not found
//     if (!updatedUser) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     // Send a success response
//     res.status(200).json({
//       message: "User updated successfully.",
//       data: updatedUser,
//     });
//   } catch (error) {
//     console.error("Cannot edit user:", error);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };
// ==========================================
exports.deleteUserForAdmin = async (req, res) => {
  try {
    console.log("Hitting delete user API");
    const { id } = req.params;
    console.log("User ID received:", id);

    if (!id) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    console.log("Deleted user:", deletedUser);

    if (!deletedUser) {
      return res.status(404).json({ message: "User data not found." });
    }

    res.status(200).json({
      message: "User data deleted successfully.",
      data: deletedUser,
    });
  } catch (error) {
    console.error("Error in deleting user:", error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

exports.addUserForAdmin = async (req, res) => {
  try {
    // console.log("user body: ", req.body);
    const { name, email, password, phone_number, code, verified, position } =
      req.body;
    if (!name || !email || !password || !phone_number || !code || !position) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const existingUser = await User.findOne({
      $or: [{ email: email }, { code: code }, { phone_number: phone_number }],
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const data = await User.create({
      name,
      email,
      password: hashedPassword,
      phone_number,
      code,
      verified,
      position,
    });
    return res.status(201).json({
      success: true,
      message: "User added successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error.", error: err });
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
        { dealerCode: { $regex: lowerCaseQuery, $options: "i" } },
        { uploadedBy: { $regex: lowerCaseQuery, $options: "i" } },
        { status: { $regex: lowerCaseQuery, $options: "i" } },
        { "productId.Brand": { $regex: lowerCaseQuery, $options: "i" } },
        { "productId.Model": { $regex: lowerCaseQuery, $options: "i" } },
        { "productId.Category": { $regex: lowerCaseQuery, $options: "i" } },
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
        path: "productId",
        select: "Brand Model Price Segment Category Status AdditionalInfo",
      });

    if (extractionRecords.length === 0) {
      return res.status(200).json({ message: "No Matching Records Found" });
    }

    const recordsWithDetails = await Promise.all(
      extractionRecords.map(async (record) => {
        const employee = await EmployeeCode.findOne({
          Code: record.uploadedBy,
        }).select("Name");
        const dealer = await Dealer.findOne({
          dealerCode: record.dealerCode,
        }).select("shopName");

        return {
          ID: record._id,
          "Dealer Code": record.dealerCode,
          "Shop Name": dealer ? dealer.shopName : "N/A",
          Brand: record.productId?.Brand,
          Model: record.productId?.Model,
          Category: record.productId?.Category,
          Quantity: record.quantity,
          Price: record.productId?.Price,
          "Total Price": record.totalPrice,
          Segment: record.productId?.Segment,
          "Uploaded By": record.uploadedBy,
          "Employee Name": employee ? employee.Name : "N/A",
          Status: record.productId?.Status,
          Date: record.date?.toISOString().split("T")[0] || "N/A",
          "Admin Note": record.adminNote || "N/A",
        };
      })
    );
    const columns = {
      columns: [
        "ID",
        "Dealer Code",
        "Shop Name",
        "Brand",
        "Model",
        "Category",
        "Quantity",
        "Dealer Price",
        "Total Price",
        "Segment",
        "Uploaded By",
        "Employee Name",
        "Status",
        "Date",
        "Admin Note",
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
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.editExtractionForAdmin = async (req, res) => {
  try {
    console.log("httiing extraction edit api");
  } catch (error) {
    consle.log("error editing extraction");
  }
};
exports.deleteExtractionForAdmin = async (req, res) => {
  try {
    console.log("hitting delete extraction");
  } catch (error) {
    console.log("error deleting extraction");
  }
}
// =================== h D s ======================
// exports.deleteExtractionForAdmin = async (req, res) => {
//   try {
//       const { id } = req.params; 
 
     
//       if (!id) {
//           return res.status(400).json({ message: "Extraction record ID is required." });
//       }
 
//       const deletedRecord = await ExtractionRecord.findByIdAndDelete(id);
 
//       if (!deletedRecord) {
//           return res.status(404).json({ message: "Extraction record not found." });
//       }
 
//       res.status(200).json({
//           message: "Extraction record deleted successfully.",
//           data: deletedRecord
//       });
//   } catch (error) {
//       console.error("Error in deleting extraction:", error);
//       res.status(500).json({ message: "Internal server error." });
//   }
//  };
// =========================================

// Dealer Controllers
exports.getDealerForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const skip = (page - 1) * limit;

    const dealers = await Dealer.find().skip(skip).limit(limit).exec();
    const totalDealers = await Dealer.countDocuments();

    const response = {
      currentPage: page,
      totalPages: Math.ceil(totalDealers / limit),
      totalRecords: totalDealers,
      data: dealers,
    };

    // Send response
    res.status(200).json(response);
  } catch (error) {
    console.error("Error getting dealers:", error.message);
    res
      .status(500)
      .json({ message: "Error getting dealers", error: error.message });
  }
};
exports.editDealerForAdmin = async (req, res) => {
  try {
    console.log("hitting editing dealer ");
  } catch (error) {
    console.log("error editing data");
  }
};
exports.deleteDealerForAdmin = async (req, res) => {
  try {
    console.log("delete dealer ");
  } catch {
    console.log("error deleting dealer");
  }
};
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
};

exports.editModelForAdmin = async (req, res) => {
  try {
    console.log("Hitting editing model");
  } catch (error) {
    console.log("error editing model");
  }
};
exports.deleteModelData = async (req, res) => {
  try {
    console.log("hitting delete model api ");
  } catch (error) {
    console.log("error deleting model");
  }
}

// ================ h D s ===========

// Dealer TSE Wise
// Backend Route to Fetch Paginated Dealer Data
exports.getDealerTseWiseForAdmin = async (req, res) => {
  const { page = 1, limit = 100, TSE, Area } = req.query;

  try {
      let matchQuery = {}; // Filter condition

      if (TSE) matchQuery["TSE"] = TSE;
if (Area) matchQuery["Area"] = Area;

      let pipeline = [
          {
              $lookup: {
                  from: "employeecodes",
                  localField: "TSE",
                  foreignField: "Name",
                  as: "employeeData"
              }
          },
          { $unwind: { path: "$employeeData", preserveNullAndEmptyArrays: true } },
          {
              $project: {
                  "Dealer Code": 1,
                  "DEALER NAME": 1,
                  "Area": 1,
                  "TSE": 1,
                  "TSE Code": { $ifNull: ["$employeeData.Code", "N/A"] }
              }
          },
          
          { $match: matchQuery } // Apply filtering only when needed
        ];
        console.log("Match Query:", matchQuery);

      let totalCount = await DealerListTseWise.countDocuments(matchQuery);

      // Apply pagination only if no filters are applied
      if (!TSE && !Area) {
          pipeline.push({ $skip: (page - 1) * limit });
          pipeline.push({ $limit: parseInt(limit) });
      }

      const dealers = await DealerListTseWise.aggregate(pipeline);

      res.json({
          data: dealers,
          pagination: {
              totalItems: totalCount,
              totalPages: Math.ceil(totalCount / limit),
              currentPage: parseInt(page)
          }
      });

  } catch (error) {
      console.error("Error fetching dealers:", error);
      res.status(500).send("Server error");
  }
};


exports.putDealerTseWise = async (req, res) => {
  try {
    console.log("Updating dealer data in dealerlisttsewisessssss...");

    const { updates } = req.body;
    if (!updates || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No updates provided",
      });
    }

    // Normalize and validate input
    const updateList = Array.isArray(updates) ? updates : [updates];
    const normalizedUpdates = updateList.map((update) => ({
      dealerCode: update.dealerCode || update["Dealer Code"],
      TSE: update.TSE,
      dealerName: update["DEALER NAME"],
      Area: update.Area,
    }));

    // Check for missing dealerCode
    const invalidUpdates = normalizedUpdates.filter((update) => !update.dealerCode);
    if (invalidUpdates.length > 0) {
      throw new Error("Dealer Code is required for all updates.");
    }

    // Process updates
    const updatePromises = normalizedUpdates.map(async (update) => {
      const { dealerCode, TSE, dealerName, Area } = update;

      const fieldsToUpdate = { TSE, "DEALER NAME": dealerName, Area };

      // Remove undefined fields
      Object.keys(fieldsToUpdate).forEach((key) => {
        if (fieldsToUpdate[key] === undefined) delete fieldsToUpdate[key];
      });

      const updatedDealer = await DealerListTseWise.findOneAndUpdate(
        { "Dealer Code": dealerCode }, // Match by dealer code
        { $set: fieldsToUpdate }, // Apply updates
        { new: true } // Return updated document
      );

      if (!updatedDealer) {
        throw new Error(`Dealer with code ${dealerCode} not found.`);
      }

      return updatedDealer;
    });

    // Wait for all updates to complete
    const updatedDealers = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: "Data updated successfully",
      updatedDealers,
    });
  } catch (error) {
    console.error("Error updating data in dealerlisttsewises:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update data",
      error: error.message,
    });
  }
};

exports.deleteDealerTseWise = async (req, res) => {
  try {
    // Extract the dealer code or id from the request parameters
    const { dealerCode } = req.params; // Assuming you're using a URL parameter

    if (!dealerCode) {
      return res.status(400).json({
        success: false,
        message: "Dealer Code is required",
      });
    }

    console.log(`Deleting dealer with Dealer Code: ${dealerCode}`);

    // Attempt to delete the dealer from the database
    const deletedDealer = await DealerListTseWise.findOneAndDelete({ "Dealer Code": dealerCode });

    // Check if the dealer was found and deleted
    if (!deletedDealer) {
      return res.status(404).json({
        success: false,
        message: `Dealer with Dealer Code ${dealerCode} not found.`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Dealer with Dealer Code ${dealerCode} deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting dealer from dealerlisttsewises:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete dealer data",
      error: error.message,
    });
  }
};
// fetch area for dropdown
exports.getAreasForDropdownForAdmin = async (req, res) => {
  try {
    console.log("Fetching unique areas for dropdown...");

    // Access the raw MongoDB collection without using a Mongoose model
    const db = mongoose.connection.db;
    const dealerListCollection = db.collection("dealerlisttsewises"); // Use the actual collection name

    // Fetch only 'Area' field from all documents
    const dealerList = await dealerListCollection.find({}, { projection: { Area: 1, _id: 0 } }).toArray();

    // Extract unique areas
    const uniqueAreas = [...new Set(dealerList.map((dealer) => dealer.Area).filter(area => area))]; // Remove null/undefined values

    // Check if areas are found
    if (uniqueAreas.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No areas found in the dealer list",
      });
    }

    res.status(200).json({
      success: true,
      message: "Areas fetched successfully",
      data: uniqueAreas,
    });
  } catch (error) {
    console.error("Error fetching areas:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch areas",
      error: error.message,
    });
  }
};

// Fetch employee code by Name

exports.getEmployeeCode = async (req, res) => {
  try {
    console.log("Fetching employee code data strictly for Position 'TSE'...");

    const { name } = req.query; // Get Name from query parameter

    // Ensure that Name is provided in the request
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name parameter is required",
      });
    }

    // Fetch employee code strictly for Position "TSE"
    const employee = await EmployeeCode.findOne(
      { Name: name, Position: "TSE" }, // Filter by both Name and Position
      { Name: 1, Position: 1, Code: 1, _id: 0 } // Include Name, Position, and Code, exclude _id
    ).lean();

    // If no matching employee is found
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `${ name } with Position 'TSE' not found`,
      });
    }

    // Return the employee data
    res.status(200).json({
      success: true,
      message: "Employee data fetched successfully",
      data: employee, // Only Name, Position, and Code
    });
  } catch (error) {
    console.error("Error fetching employee code:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employee data",
      error: error.message,
    });
  }
};

exports.getEmployeeNamesForDropdown = async (req, res) => {
  try {
    console.log("Fetching employee names strictly for Position 'TSE' for dropdown...");

    // Fetch employees with Position 'TSE'
    const employees = await EmployeeCode.find(
      { Position: "TSE" }, // Ensure only employees with Position 'TSE' are included
      { Name: 1, Code: 1, _id: 0 } // Include Name and Code, exclude _id
    ).lean();

    // Remove duplicate entries based on Name + Position to ensure strict matching
    const uniqueEmployees = employees.filter(
      (value, index, self) => index === self.findIndex((emp) => emp.Name === value.Name && emp.Code === value.Code)
    );

    // Check if no TSE employees are found
    if (!uniqueEmployees || uniqueEmployees.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No employees with Position 'TSE' found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee names fetched successfully",
      data: uniqueEmployees, // Return strictly filtered list of TSE employees
    });
  } catch (error) {
    console.error("Error fetching employee names:", error);

    // Return a generic error message for server errors
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee names",
      error: error.message,
    });
  }
};

// ============28/01/2025=============

//get credit limit
// const CreditLimit = require("../models/creditLimit"); // Import the model

exports.getCreditLimitsForAdmin = async (req, res) => {
  // Get page, limit, and dealerCategory from query parameters, with defaults
  const { page = 1, limit = 50, dealerCategory = "MDD" } = req.query;

  // Calculate the number of documents to skip
  const skip = (page - 1) * limit;

  try {
    console.log("Fetching Paginated Credit Limits...");

    // Build filter object based on dealerCategory selection
    let filter = {};
    if (dealerCategory !== "All") {
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
    const { dealerCode } = req.query; // Get dealer code from query params
    const { credit_limit } = req.body; // Get credit limit from request body

    // Validate inputs
    if (!dealerCode) {
      return res
        .status(400)
        .json({ success: false, message: "Dealer code is required." });
    }

    if (credit_limit === undefined || isNaN(credit_limit)) {
      return res
        .status(400)
        .json({ success: false, message: "A valid credit limit is required." });
    }

    // Find and update the dealer's credit limit
    const updatedDealer = await Dealer.findOneAndUpdate(
      { dealerCode },
      { credit_limit },
      { new: true, runValidators: true }
    );

    if (!updatedDealer) {
      return res
        .status(404)
        .json({ success: false, message: "Dealer not found." });
    }

    res.status(200).json({
      success: true,
      message: "Dealer credit limit updated successfully.",
      data: updatedDealer,
    });
  } catch (error) {
    console.error("Error updating dealer credit limit:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating the credit limit.",
        error: error.message,
      });
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
      return res
        .status(400)
        .send("Unsupported file format. Please upload a CSV file.");
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
            const existingRecord = await Dealer.findOne({
              dealerCode,
              shopName,
            });

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

// Employee Code Controller
exports.getEmployeeCodeForAdmin = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const query = req.query.query;

    const filters = {};
    if (query && query.trim() !== "") {
      const lowerCaseQuery = query.toLowerCase();
      filters.$or = [
        { Name: { $regex: lowerCaseQuery, $options: "i" } },
        { Code: { $regex: lowerCaseQuery, $options: "i" } },
        { Position: { $regex: lowerCaseQuery, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const data = await EmployeeCode.find(filters)
      .skip(skip)
      .limit(limit)
      .lean();
    const totalRecords = await EmployeeCode.countDocuments(filters);

    res.status(200).json({
      success: true,
      message: "Employee code data fetched successfully",
      page: page,
      limit: limit,
      totalRecords: totalRecords,
      data: data,
    });
  } catch (error) {
    console.error("Error fetching employee code data:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching employee code data",
      error: error.message,
    });
  }
};

exports.editEmployeeCodeForAdmin = async (req, res) => {
  try {
    const id = req.params.id;
    const update = req.body;
    const data = await EmployeeCode.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Error updating employee code",
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Employee code updated successfully",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.deleteEmployeeCodeForAdmin = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await EmployeeCode.findByIdAndDelete(id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Error deleting employee code",
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Employee code deleted successfully",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
exports.addEmployeeCodeForAdmin = async (req, res) => {
  try {
    // console.log(req.body)
    const { Code, Name, Position } = req.body;
    if (!Code || !Name || !Position) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all fields",
      });
    }
    const exit = await EmployeeCode.findOne({ Code });
    if (exit) {
      return res.status(400).json({
        success: false,
        message: "Employee code already exists",
      });
    }
    const data = await EmployeeCode.create({ Code, Name, Position });
    return res.status(201).json({
      success: true,
      message: "Employee code added successfully",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//Tally Transaction
exports.getTallyTransactionForAdmin = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const filter = req.query.filter || "";
  const voucher = req.query.voucher || "";
  const skip = (page - 1) * limit;

  const filters = {};

  // Apply text-based filters
  if (filter.trim() !== "") {
    const lowerCaseQuery = filter.toLowerCase();
    filters.$or = [
      { PARTYNAME: { $regex: lowerCaseQuery, $options: "i" } },
      { PARTYLEDGERNAME: { $regex: lowerCaseQuery, $options: "i" } },
      { VOUCHERNUMBER: { $regex: lowerCaseQuery, $options: "i" } },
      { AMOUNT: { $regex: lowerCaseQuery, $options: "i" } },
      { dealerCode: { $regex: lowerCaseQuery, $options: "i" } },
    ];
  }

  // Extract startDate and endDate from query
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({
      success: false,
      message: "Invalid date range",
    });
  }

  // Apply date filters
  if (startDate || endDate) {
    filters.DATE = {}; // Assuming your date field is named "DATE"

    if (startDate) {
      filters.DATE.$gte = startDate;
    }

    if (endDate) {
      filters.DATE.$lte = endDate;
    }
  }
  if (voucher) {
    filters.VOUCHERTYPE = voucher;
  }

  try {
    // Fetch filtered transactions
    const data = await tallyTransaction
      .find(filters)
      .sort({ DATE: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await tallyTransaction.countDocuments(filters);

    return res.status(200).json({
      success: true,
      message: "Tally transaction data fetched successfully",
      totalCount: totalCount,
      data: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


exports.editTallyTransaction = async (req, res) => {
  try {
    const id = req.params.id;
    const update = req.body;
    const data = await tallyTransaction.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Tally transaction not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Tally transaction updated successfully",
      data: data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err,
    });
  }
};

exports.deleteTallyTransactionByDate = async (req, res) => {
  try {
    const dateParam = req.params.date;

    if (!dateParam) return res.status(400).json({ error: "Date is required" });

    // Convert string to Date object
    const startDate = new Date(dateParam);
    if (isNaN(startDate))
      return res.status(400).json({ error: "Invalid date format" });
    // Set start time to 12:00 AM (midnight)
    startDate.setUTCHours(0, 0, 0, 0);

    // Set end time to 11:59:59.999 PM on the same day
    const endDate = new Date(startDate);
    endDate.setUTCHours(23, 59, 59, 999); // Move to the next day at 00:00:00

    // console.log("Querying between:", startDate, "and", endDate);

    // MongoDB query
    const data = await tallyTransaction.deleteMany({
      DATE: { $gte: startDate, $lt: endDate },
    });

    if (data.deletedCount === 0)
      return res.status(404).json({
        success: "false",
        error: "No data found",
      });

    res.status(200).json({
      success: true,
      message: "Tally transactions deleted successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      err: "Internal Server Error",
    });
  }
};


exports.addTallyTransactionForAdmin = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  try {
    const fileType = req.file.mimetype;

    if (req.file.originalname.endsWith(".csv")) {
      const result = [];
      
      // Convert buffer to stream
      const stream = Readable.from(req.file.buffer.toString());

      stream
        .pipe(csv())
        .on("data", (data) => {
          result.push(data);
        })
        .on("end", async () => {
          try {
            let newEntries = [];

            for (let data of result) {
              const [partyName, dealerCode] = data.PARTYNAME?.split("-").map(str => str.trim()) || ["", ""];
              data.PARTYNAME = partyName;
              data.dealerCode = dealerCode || null;

              const iuid = Object.values(data).join("|");
              console.log("IUID: ", iuid);

              const remoteId = data["VOUCHER.REMOTEID"] || `${iuid}-${Date.now()}`;

              const existingRecord = await tallyTransaction.findOne({
                $or: [{ iuid }, { "VOUCxHER.REMOTEID": remoteId }],
              });

              if (!existingRecord) {
                const formattedDate = moment(data.DATE, "YYYYMMDD").toDate();
                const newData = { ...data, iuid, "VOUCHER.REMOTEID": remoteId, DATE: formattedDate };
                newEntries.push(newData);
              }
            }

            if (newEntries.length > 0) {
              await tallyTransaction.insertMany(newEntries);
              res.status(200).json({ success: true, message: "Data inserted into the database" });
            } else {
              res.status(200).json({ success: true, message: "No new data to insert, all entries already exist." });
            }
          } catch (error) {
            console.error("Database Error: ", error);
            return res.status(500).json({
              success: false,
              message: "Error inserting data into the database",
            });
          }
        })
        .on("error", (err) => {
          console.error("CSV Parsing Error: ", err);
          return res.status(500).json({
            success: false,
            message: "Error parsing the CSV file",
          });
        });
    } else if (fileType === "application/xml") {
      const xmlData = req.file.buffer.toString();

      xml2js.parseString(xmlData, async (err, result) => {
        if (err) {
          console.error("Error parsing XML file:", err);
          return res.status(500).json({ success: false, message: "Error parsing XML file." });
        }

        try {
          const transactions = result.transactions?.transaction || [];

          if (transactions.length === 0) {
            return res.status(400).json({ success: false, message: "XML file contains no transactions." });
          }

          const data = transactions.map((item) => ({ ...item }));

          await TallyTransaction.insertMany(data);

          res.json({
            success: true,
            message: "XML file uploaded and saved to the database successfully!",
          });
        } catch (error) {
          console.error("Error saving XML data to database:", error);
          res.status(500).json({ success: false, message: "Error saving XML data to the database." });
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Only CSV and XML files are allowed.",
      });
    }
  } catch (err) {
    console.error("Server Error: ", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//Voucher
exports.getVoucherForAdmin = async (req, res) => {
  try {
    const Voucher = await tallyTransaction.distinct("VOUCHERTYPE");
    res.status(200).json({
      success: true,
      message: "Voucher types retrieved successfully",
      data: Voucher,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err,
    });
  }
};

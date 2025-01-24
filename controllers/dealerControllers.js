const Dealer = require('../models/Dealer'); // Import the Dealer model
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();
const { JWT_SECRET } = process.env;
const { token } = require("../middlewares/authMiddlewares");
const SalesDataMTDW = require('../models/SalesDataMTDW');
const TallyTransaction = require("../models/TallyTransaction");
const DealerListTseWise = require("../models/DealerListTseWise");
const EmployeeCode = require('../models/EmployeeCode'); 
require("dotenv").config();
const csvParser = require("csv-parser");
const { Readable } = require("stream");
const cloudinary = require('../config/cloudinary');

exports.addDealer = async (req, res) => {
  try {
    const {
      dealerCode,
      shopName,
      shopArea,
      shopAddress,
      owner, // Nested object with required fields like name and contactNumber
      anniversaryDate,
      otherImportantFamilyDates, // Array of objects
      businessDetails, // Nested object with typeOfBusiness and yearsInBusiness
      specialNotes,
      password // Add password field
    } = req.body;

    // Basic Validations
    if (
      !dealerCode ||
      !shopName ||
      !shopArea ||
      !shopAddress ||
      !owner?.name ||
      !owner?.contactNumber ||
      !password
    ) {
      return res.status(400).json({
        error:
          "Please provide all the required fields: dealerCode, shopName, shopArea, shopAddress, owner's name, owner's contact number, and password.",
      });
    }

    // Check if the dealer code already exists in the database
    const existingDealer = await Dealer.findOne({ dealerCode });
    if (existingDealer) {
      return res
        .status(400)
        .json({ error: "Dealer code already exists. Please provide a unique dealer code." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new Dealer with all fields
    const newDealer = new Dealer({
      dealerCode,
      shopName,
      shopArea,
      shopAddress,
      owner: {
        name: owner.name,
        position: owner.position, // Optional
        contactNumber: owner.contactNumber,
        email: owner.email, // Optional
        homeAddress: owner.homeAddress, // Optional
        birthday: owner.birthday, // Optional
        wife: {
          name: owner?.wife?.name, // Optional
          birthday: owner?.wife?.birthday, // Optional
        },
        children: owner.children || [], // Optional array
        otherFamilyMembers: owner.otherFamilyMembers || [], // Optional array
      },
      anniversaryDate, // Optional
      otherImportantFamilyDates, // Optional array
      businessDetails: {
        typeOfBusiness: businessDetails?.typeOfBusiness, // Optional
        yearsInBusiness: businessDetails?.yearsInBusiness, // Optional
        preferredCommunicationMethod: businessDetails?.preferredCommunicationMethod, // Optional
      },
      specialNotes, // Optional
      password: hashedPassword, // Store the hashed password
    });

    await newDealer.save();

    // Generate a token
    const token = jwt.sign(
      {
        dealer_id: newDealer._id,
        dealerCode: newDealer.dealerCode,
        shopName: newDealer.shopName,
        ownerName: newDealer.owner.name,
        role: "dealer", // Include the role in the token payload
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Dealer added successfully.",
      data: newDealer,
      token,
      role: "dealer", // Include the role in the response
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getDealer = async (req, res) => {
  try {
    const { dealer_id } = req;

    // Validate that dealer_id is provided
    if (!dealer_id) {
      return res.status(400).json({ error: "Dealer Id not found in the token!" });
    }

    // Find the dealer by dealer_id
    const dealer = await Dealer.findOne({ _id: dealer_id });

    // If dealer is not found
    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found." });
    }

    // Return the dealer data excluding the password
    return res.status(200).json({
      message: "Dealer retrieved successfully.",
      data: {
        dealerCode: dealer.dealerCode,
        shopName: dealer.shopName,
        shopArea: dealer.shopArea,
        shopAddress: dealer.shopAddress,
        owner: dealer.owner,
        anniversaryDate: dealer.anniversaryDate,
        otherImportantFamilyDates: dealer.otherImportantFamilyDates,
        businessDetails: dealer.businessDetails,
        specialNotes: dealer.specialNotes,
      },
      role: "dealer", // Include the role in the response
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.isDealerVerified = async (req, res) => {
  try {
    const { dealer_id } = req;

    // Validate that dealer_id is provided
    if (!dealer_id) {
      return res.status(400).json({ error: 'Dealer Id not found in the token!' });
    }

    // Find the dealer by dealer_id
    const dealer = await Dealer.findOne({ _id: dealer_id });

    // If dealer is not found
    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found.' });
    }

    // Return the verified status of the dealer
    return res.status(200).json({
      message: 'Dealer verification status retrieved successfully.',
      verified: dealer.verified,
      role: 'dealer',
      code: dealer.dealerCode,
      name: dealer.owner.name

    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.editDealer = async (req, res) => {
  try {
    const { dealer_id } = req;  // Assuming dealer_id is obtained from the request, e.g., via authentication middleware
    const {
      shopName,
      shopArea,
      shopAddress,
      owner,
      anniversaryDate,
      otherImportantFamilyDates,
      businessDetails,
      specialNotes,
      latitude,
      longitude
    } = req.body;

    // Validate dealer ID
    if (!dealer_id) {
      return res.status(400).json({ error: 'Dealer ID is required.' });
    }

    // Find the dealer by ID
    const dealer = await Dealer.findOne({ _id: dealer_id });

    // If dealer is not found
    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found.' });
    }

    // Update only the fields that are allowed to be edited
    if (shopName) dealer.shopName = shopName;
    if (shopArea) dealer.shopArea = shopArea;
    if (shopAddress) dealer.shopAddress = shopAddress;
    if (owner) {
      if (owner.name) dealer.owner.name = owner.name;
      if (owner.position) dealer.owner.position = owner.position;
      if (owner.contactNumber) dealer.owner.contactNumber = owner.contactNumber;
      if (owner.email) dealer.owner.email = owner.email;
      // if (owner.email) {
      //   return res.status(400).json({ error: 'Email cannot be edited.' });
      // }
      if (owner.homeAddress) dealer.owner.homeAddress = owner.homeAddress;
      if (owner.birthday) dealer.owner.birthday = owner.birthday;
      if (owner.wife) {
        if (owner.wife.name) dealer.owner.wife.name = owner.wife.name;
        if (owner.wife.birthday) dealer.owner.wife.birthday = owner.wife.birthday;
      }
      if (owner.children) dealer.owner.children = owner.children;
      if (owner.otherFamilyMembers) dealer.owner.otherFamilyMembers = owner.otherFamilyMembers;
    }
    if (anniversaryDate) dealer.anniversaryDate = anniversaryDate;
    if (otherImportantFamilyDates) dealer.otherImportantFamilyDates = otherImportantFamilyDates;
    if (businessDetails) {
      if (businessDetails.typeOfBusiness) dealer.businessDetails.typeOfBusiness = businessDetails.typeOfBusiness;
      if (businessDetails.yearsInBusiness) dealer.businessDetails.yearsInBusiness = businessDetails.yearsInBusiness;
      if (businessDetails.preferredCommunicationMethod) dealer.businessDetails.preferredCommunicationMethod = businessDetails.preferredCommunicationMethod;
    }
    if (specialNotes) dealer.specialNotes = specialNotes;
    if (latitude) dealer.latitude = latitude;
    if(longitude) dealer.longitude = longitude;

    // Save the updated dealer information
    await dealer.save();

    return res.status(200).json({
      message: 'Dealer profile updated successfully.',
      data: {
        dealerCode: dealer.dealerCode,
        shopName: dealer.shopName,
        shopArea: dealer.shopArea,
        shopAddress: dealer.shopAddress,
        owner: dealer.owner,
        anniversaryDate: dealer.anniversaryDate,
        otherImportantFamilyDates: dealer.otherImportantFamilyDates,
        businessDetails: dealer.businessDetails,
        specialNotes: dealer.specialNotes,
        latitude: dealer.latitude,
        longitude: dealer.longitude
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.verifyAllDealers = async (req, res) => {
  try {
    // Fetch all dealers
    const dealers = await Dealer.find();

    // Check if dealers exist
    if (!dealers || dealers.length === 0) {
      return res.status(404).json({ error: 'No dealers found.' });
    }

    // Initialize a counter to track the number of newly verified dealers
    let newlyVerifiedCount = 0;

    // Iterate over each dealer to check their verification status
    for (let dealer of dealers) {
      if (dealer.verified === undefined) {
        // If the verified field does not exist, add it and set to verified
        dealer.verified = true;
        await dealer.save();  // Save the changes to the dealer
        newlyVerifiedCount++;
      } else if (!dealer.verified) {
        // If not verified, set to verified
        dealer.verified = true;
        await dealer.save();  // Save the changes to the dealer
        newlyVerifiedCount++;
      }
    }

    return res.status(200).json({
      message: 'All unverified dealers have been verified successfully.',
      totalVerified: newlyVerifiedCount,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Auto fetch and register dealers from sales data MTDW 
exports.registerDealersFromSalesData = async (req, res) => {
  try {
    // Fetch all unique BUYER CODE entries from the sales data (SalesDataMTDW)
    const uniqueDealerCodes = await SalesDataMTDW.distinct("BUYER CODE");

    // Capitalize all dealer codes
    const capitalizedDealerCodes = uniqueDealerCodes.map(code => code.toUpperCase());

    // Fetch existing dealers from the database (those that already have a dealerCode)
    const existingDealers = await Dealer.find({ dealerCode: { $in: capitalizedDealerCodes } });

    // Extract the dealer codes that already exist
    const existingDealerCodes = existingDealers.map(dealer => dealer.dealerCode);

    // Filter out the dealer codes that are not in the existing dealers list
    const newDealerCodes = capitalizedDealerCodes.filter(code => !existingDealerCodes.includes(code));

    // Register new dealers
    let newDealers = [];
    for (const dealerCode of newDealerCodes) {
      // Get the sales entry to fetch shopName (BUYER field) from the sales data
      const salesEntry = await SalesDataMTDW.findOne({ "BUYER CODE": dealerCode });

      if (salesEntry) {
        const shopName = salesEntry.BUYER || "Unknown Shop"; // Default to "Unknown Shop" if no buyer name is found
        const shopArea = "Unknown Area"; // Default value, adjust based on data availability
        const shopAddress = "Unknown Address"; // Default value, adjust based on data availability

        // Owner details from schema
        const owner = {
          name: "Unknown Owner", // Default owner name, adjust if data is available
          position: "Owner", // Default position
          contactNumber: "Unknown Contact", // Default contact number
          email: `${dealerCode.toLowerCase()}@gmail.com`, // Default email as [dealerCode@gmail.com]
          homeAddress: "Unknown Home Address", // Default home address
          birthday: new Date(1970, 0, 1), // Default birthday, adjust if necessary
          wife: {
            name: "", // Optional, default empty
            birthday: null // Optional, default null
          },
          children: [], // Default empty children array
          otherFamilyMembers: [] // Default empty family members array
        };

        // Business details from schema
        const businessDetails = {
          typeOfBusiness: "Unknown", // Default business type
          yearsInBusiness: 0, // Default to 0, as no data available
          preferredCommunicationMethod: "Unknown" // Default value
        };

        // Hash the default password "123456"
        const hashedPassword = await bcrypt.hash("123456", 10);

        // Create a new dealer object with all required fields
        const newDealer = new Dealer({
          dealerCode,
          shopName,
          shopArea, // Required field
          shopAddress, // Required field
          owner, // Owner details
          anniversaryDate: null, // Default null for now
          otherImportantFamilyDates: [], // Default empty array
          businessDetails, // Business details
          specialNotes: "", // No special notes available
          password: hashedPassword, // Password field
          verified: false // Set verified to false initially
        });

        // Save the new dealer in the database
        await newDealer.save();

        // Generate a token for the newly created dealer
        const token = jwt.sign(
          {
            dealer_id: newDealer._id,
            dealerCode: newDealer.dealerCode,
            shopName: newDealer.shopName,
            ownerName: newDealer.owner.name,
            role: "dealer", // Include the role in the token payload
          },
          JWT_SECRET,
          { expiresIn: "7d" } // Token expiry duration
        );

        // Add the new dealer to the response list
        newDealers.push({
          dealer: newDealer,
          token,
          message: "Dealer registered successfully."
        });
      }
    }

    if (newDealers.length > 0) {
      // Return the newly registered dealers and their tokens
      return res.status(200).json({
        message: "New dealers registered successfully.",
        newDealers
      });
    } else {
      return res.status(200).json({
        message: "No new dealers to register."
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deleteDuplicateDealers = async (req, res) => {
  try {
    // Find all dealer codes that have more than one occurrence
    const duplicateDealers = await Dealer.aggregate([
      {
        $group: {
          _id: "$dealerCode",
          count: { $sum: 1 },
          ids: { $push: "$_id" } // Collecting all dealer IDs with the same dealerCode
        }
      },
      {
        $match: { count: { $gt: 1 } } // Find dealerCodes that occur more than once
      }
    ]);

    // Array to track all deleted dealers and their counts
    let deletedDealersInfo = [];

    // Loop through each duplicate dealerCode group
    for (const dealerGroup of duplicateDealers) {
      // Sort the dealer records by creation date and keep only the oldest one
      const dealers = await Dealer.find({ _id: { $in: dealerGroup.ids } }).sort({ createdAt: 1 });

      // Keep the first (oldest) dealer and delete the rest (most recent ones)
      const dealersToDelete = dealers.slice(1); // Skip the first one
      let deletedCount = 0;

      // Delete the duplicate dealers
      for (const dealer of dealersToDelete) {
        await Dealer.findByIdAndDelete(dealer._id); // Delete each duplicate dealer
        deletedCount += 1;
      }

      // Add the details of the deleted dealers, including the count
      deletedDealersInfo.push({
        dealerCode: dealerGroup._id,
        totalDuplicates: dealerGroup.count,
        deletedDuplicates: deletedCount
      });
    }

    if (deletedDealersInfo.length > 0) {
      return res.status(200).json({
        message: "Duplicate dealers deleted successfully.",
        deletedDealersInfo // Include the details of the deleted dealers with counts
      });
    } else {
      return res.status(200).json({
        message: "No duplicate dealers found."
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.capitalizeDealerCodes = async (req, res) => {
  try {
    // Find all dealers where the dealerCode is not already in uppercase
    const dealers = await Dealer.find({});

    let updatedDealers = [];
    let updatedCount = 0;

    for (const dealer of dealers) {
      const originalDealerCode = dealer.dealerCode;

      // Check if dealerCode is not capitalized
      if (originalDealerCode !== originalDealerCode.toUpperCase()) {
        // Capitalize the dealerCode
        dealer.dealerCode = originalDealerCode.toUpperCase();

        // Save the updated dealer entry
        await dealer.save();

        updatedDealers.push({
          _id: dealer._id,
          oldDealerCode: originalDealerCode,
          newDealerCode: dealer.dealerCode
        });

        // Increment count of updated dealer codes
        updatedCount += 1;
      }
    }

    if (updatedDealers.length > 0) {
      return res.status(200).json({
        message: "Dealer codes capitalized successfully.",
        updatedCount: updatedCount, // Include the count of updated dealer codes
        updatedDealers
      });
    } else {
      return res.status(200).json({
        message: "All dealer codes are already capitalized.",
        updatedCount: 0
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateDealerCategoryFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    let csvData = [];

    if (req.file.originalname.endsWith(".csv")) {
      // Create a readable stream from the uploaded CSV buffer
      const stream = new Readable();
      stream.push(req.file.buffer);
      stream.push(null);

      // Parse CSV and collect rows in memory
      stream
        .pipe(csvParser())
        .on("data", (data) => {
          csvData.push(data);
        })
        .on("end", async () => {
          try {
            // Fetch all dealers from the database
            const dealers = await Dealer.find({});

            // Initialize counters
            let matchedCount = 0;
            let totalDealers = dealers.length;

            // Process each dealer to update their category
            for (const dealer of dealers) {
              const csvRow = csvData.find(row => row['dealerCode'] === dealer.dealerCode);

              if (csvRow) {
                // Update the category from the CSV
                dealer.dealerCategory = csvRow['category'];
                matchedCount++; // Increase count for matched dealers
              } else {
                // If dealerCategory is missing, or if not found in CSV, set it to 'N/A'
                if (!dealer.dealerCategory || dealer.dealerCategory === '') {
                  dealer.dealerCategory = 'N/A';
                }
              }

              // Save updated dealer info
              await dealer.save();
            }

            // Return the result with counts
            return res.status(200).send({
              message: 'Dealer categories updated successfully.',
              totalDealers: totalDealers,
              matchedDealersInCSV: matchedCount,
              unmatchedDealers: totalDealers - matchedCount,
            });
          } catch (error) {
            console.error("Error processing CSV: ", error);
            return res.status(500).send("Error processing CSV and updating dealers.");
          }
        });
    } else {
      res.status(400).send("Unsupported file format. Please upload a CSV file.");
    }
  } catch (error) {
    console.error("Internal server error: ", error);
    return res.status(500).send("Internal server error");
  }
};

exports.addDefaultAddressToDealers = async (req, res) => {
  try {
    // Fetch all dealers where the address field is missing
    const dealersWithoutAddress = await Dealer.find({ address: { $exists: false } });

    if (!dealersWithoutAddress || dealersWithoutAddress.length === 0) {
      return res.status(200).json({ message: "All dealers already have the address field." });
    }

    // Update each dealer to add the address field with default values
    for (const dealer of dealersWithoutAddress) {
      dealer.address = {
        state: "Rajasthan",
        district: "Jaipur",
        town: "",
      };
      await dealer.save();
    }

    return res.status(200).json({
      message: `${dealersWithoutAddress.length} dealers updated with the address field.`,
    });
  } catch (error) {
    console.error("Error updating dealers with address:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.addCoordinateFieldsToDealers = async (req, res) => {
  try {
    // Find all dealers where latitude or longitude is not set
    const dealers = await Dealer.find({
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } }
      ]
    });

    if (dealers.length === 0) {
      return res.status(200).json({ message: 'All dealers already have latitude and longitude fields.' });
    }

    // Update each dealer to include latitude and longitude if missing
    for (const dealer of dealers) {
      if (!dealer.latitude) dealer.latitude = "26.937941"; // Set default empty string
      if (!dealer.longitude) dealer.longitude = "75.796671"; // Set default empty string
      await dealer.save(); // Save updated dealer
    }

    return res.status(200).json({
      message: 'Latitude and longitude fields added to dealers successfully.',
      updatedCount: dealers.length
    });
  } catch (error) {
    console.error('Error adding latitude and longitude fields:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.addCreditLimitToDealers = async(req, res) => {
  try{
    const dealers = await Dealer.find({
      $or: [
        {credit_limit: { $exists: false }}
      ]
    });

    if (dealers.length === 0){
      return res.status(200).json({message: 'All dealers have credit limits'})
    }

    for (const dealer of dealers){
      if (!dealer.credit_limit) dealer.credit_limit = "1000000";
      await dealer.save();
    }

    return res.status(200).json({
      message: 'Credit limits added successfully.',
      updatedCount: dealers.length
    })
  } catch(error){
    console.error("Error adding credit limits: ", error);
    return res.status(500).json({ error: 'Internal Server Error'})
  }
}

exports.updateCreditLimitFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    let csvData = [];

    if (req.file.originalname.endsWith(".csv")) {
      // Create a readable stream from the uploaded CSV buffer
      const stream = new Readable();
      stream.push(req.file.buffer);
      stream.push(null);

      // Parse CSV and collect rows in memory
      stream
        .pipe(csvParser())
        .on("data", (data) => {
          csvData.push(data);
        })
        .on("end", async () => {
          try {
            // Initialize counters
            let updatedCount = 0;
            let unmatchedCount = 0;

            for (const row of csvData) {
              const dealerCode = row['dealerCode'];
              const newCreditLimit = parseFloat(row['credit_limit']);

              if (!dealerCode || isNaN(newCreditLimit)) {
                continue; // Skip rows with invalid data
              }

              // Find the dealer in the database
              const dealer = await Dealer.findOne({ dealerCode });

              if (dealer) {
                // Update the credit limit
                dealer.credit_limit = newCreditLimit;
                await dealer.save();
                updatedCount++;
              } else {
                unmatchedCount++;
              }
            }

            // Return the result with counts
            return res.status(200).send({
              message: "Credit limits updated successfully.",
              totalRows: csvData.length,
              updatedDealers: updatedCount,
              unmatchedDealers: unmatchedCount,
            });
          } catch (error) {
            console.error("Error processing CSV: ", error);
            return res.status(500).send("Error processing CSV and updating credit limits.");
          }
        });
    } else {
      res.status(400).send("Unsupported file format. Please upload a CSV file.");
    }
  } catch (error) {
    console.error("Internal server error: ", error);
    return res.status(500).send("Internal server error");
  }
};

exports.fetchCreditLimitForMDD = async (req, res) => {
  try {
      const { dealerCode } = req;

      // Validate that dealerCode is provided
      if (!dealerCode) {
          return res.status(400).json({ success: false, message: "Dealer code is required." });
      }

      // Find the dealer by dealerCode
      const dealer = await Dealer.findOne({ dealerCode }).lean();

      // If dealer is not found
      if (!dealer) {
          return res.status(404).json({ success: false, message: "Dealer not found." });
      }

      // // Check if dealerCategory is MDD
      // if (dealer.dealerCategory !== "MDD") {
      //     return res.status(403).json({ success: false, message: "Dealer is not in the MDD category." });
      // }

      // Return the credit limit
      return res.status(200).json({
          success: true,
          message: "Credit limit retrieved successfully.",
          data: {
              creditLimit: dealer.credit_limit,
              dealerCategory: dealer.dealerCategory,
              shopName: dealer.shopName,
              dealer_code: dealer.dealerCode
          }
      });
  } catch (error) {
      console.error("Error fetching credit limit:", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// exports.updateDealerGeoTagForEmployee = async (req, res) => {
//  try {
//    const { dealerCode, latitude, longitude } = req.body;

//    // Validate request body
//    if (!dealerCode) {
//      return res.status(400).json({
//        success: false,
//        message: "DealerCode is required",
//      });
//    }

//    // Parse latitude and longitude to ensure they are stored as numbers
//    const parsedLatitude = parseFloat(latitude);
//    const parsedLongitude = parseFloat(longitude);

//    if (isNaN(parsedLatitude) || isNaN(parsedLongitude)) {
//      return res.status(400).json({
//        success: false,
//        message: "Latitude and longitude must be valid numbers.",
//      });
//    }

//    // Find and update the dealer
//    const updatedDealer = await Dealer.findOneAndUpdate(
//      { dealerCode },
//      { latitude: parsedLatitude, longitude: parsedLongitude },
//      { new: true } // Return the updated document
//    );

//    if (!updatedDealer) {
//      return res.status(404).json({
//        success: false,
//        message: "Dealer not found",
//      });
//    }

//    return res.status(200).json({
//      success: true,
//      message: "Dealer geotag updated successfully",
//      dealer: updatedDealer,
//    });
//  } catch (error) {
//    console.error("Error updating dealer geotag:", error);
//    return res.status(500).json({
//      success: false,
//      message: "Internal Server Error",
//    });
//  }
// };

exports.updateDealerGeoTagForEmployee = async (req, res) => {
  try {
    const { dealerCode, latitude, longitude } = req.body;

    if (!dealerCode) {
      return res.status(400).json({
        success: false,
        message: "DealerCode is required",
      });
    }

    const parsedLatitude = parseFloat(latitude);
    const parsedLongitude = parseFloat(longitude);

    if (isNaN(parsedLatitude) || isNaN(parsedLongitude)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude must be valid numbers.",
      });
    }

    // Check for file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Geotagging picture is required.",
      });
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'geotag_pictures',
      public_id: `${dealerCode}_${Date.now()}`,
      resource_type: 'image',
    });

    
    // Update dealer with latitude, longitude, and geotag picture URL
    const updatedDealer = await Dealer.findOneAndUpdate(
      { dealerCode },
      { 
        latitude: parsedLatitude, 
        longitude: parsedLongitude,
        geotag_picture: result.secure_url,
      },
      { new: true } // Return the updated document
    );

    if (!updatedDealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dealer geotag updated successfully",
      dealer: updatedDealer,
    });
  } catch (error) {
    console.error("Error updating dealer geotag:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getUpdatedGeoTagForEmployee = async (req, res) => {
 try {
   const { dealerCode } = req.query;

   if (!dealerCode) {
     return res.status(400).json({
       success: false,
       message: "DealerCode is required as a query parameter.",
     });
   }
   const dealer = await Dealer.findOne({ dealerCode });

   if (!dealer) {
     return res.status(404).json({
       success: false,
       message: "Dealer not found",
     });
   }
   const { latitude, longitude } = dealer;

   return res.status(200).json({
     success: true,
     message: "Dealer geotag fetched successfully",
     data: {
       dealerCode,
       latitude,
       longitude,
     },
   });
 } catch (error) {
   console.error("Error fetching dealer geotag:", error);
   return res.status(500).json({
     success: false,
     message: "Internal Server Error",
   });
 }
};

exports.fetchLimitsForMDD = async (req, res) => {
  try {
      const { dealerCode } = req; // Accept dealerCode from request body

      // Validate that dealerCode is provided
      if (!dealerCode) {
          return res.status(400).json({ success: false, message: "Dealer code is required." });
      }

      // Fetch dealer details
      const dealer = await Dealer.findOne({ dealerCode }).lean();

      // If dealer is not found
      if (!dealer) {
          return res.status(404).json({ success: false, message: "Dealer not found." });
      }

      // Fetch transactions for the dealer
      const transactions = await TallyTransaction.find({ dealerCode }).lean();

      // If no transactions found
      if (!transactions || transactions.length === 0) {
          return res.status(200).json({
              success: true,
              message: "No transactions found for the dealer.",
              data: {
                  creditLimit: dealer.credit_limit,
                  utilizedLimit: 0,
                  availableLimit: dealer.credit_limit,
              }
          });
      }

      // Calculate the utilized amount (considering signs)
      let utilizedAmount = transactions.reduce(
          (sum, txn) => sum + parseFloat(txn.AMOUNT || 0),
          0
      );

      // Convert the utilized amount to a positive number
      utilizedAmount = Math.abs(utilizedAmount);

      // Calculate the available credit limit
      const availableLimit = dealer.credit_limit - utilizedAmount;

      // Return the response
      return res.status(200).json({
          success: true,
          message: "Credit limit retrieved successfully.",
          data: {
              creditLimit: dealer.credit_limit,
              utilizedLimit: utilizedAmount,
              availableLimit: availableLimit < 0 ? 0 : availableLimit, // Avoid negative available limits
              dealerCategory: dealer.dealerCategory,
              shopName: dealer.shopName,
          }
      });
  } catch (error) {
      console.error("Error fetching credit limit:", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.addGeotagPictureField = async (req, res) => {
  try {
    const result = await Dealer.updateMany(
      { geotag_picture: { $exists: false } },
      { $set: { geotag_picture: null } }
    );
    console.log("Field added to existing dealers:", result);
  } catch (error) {
    console.error("Error updating dealers:", error);
  }
};


// Auto fetch and register dealers from sales data MTDW 
exports.registerDealersFromDealerListTseWise = async (req, res) => {
  try {
    // Fetch all unique BUYER CODE entries from the sales data (SalesDataMTDW)
    const uniqueDealerCodes = await DealerListTseWise.distinct("Dealer Code");

    // Capitalize all dealer codes
    const capitalizedDealerCodes = uniqueDealerCodes.map(code => code.toUpperCase());

    // Fetch existing dealers from the database (those that already have a dealerCode)
    const existingDealers = await Dealer.find({ dealerCode: { $in: capitalizedDealerCodes } });

    // Extract the dealer codes that already exist
    const existingDealerCodes = existingDealers.map(dealer => dealer.dealerCode);

    // Filter out the dealer codes that are not in the existing dealers list
    const newDealerCodes = capitalizedDealerCodes.filter(code => !existingDealerCodes.includes(code));

    // Register new dealers
    let newDealers = [];
    for (const dealerCode of newDealerCodes) {
      // Get the sales entry to fetch shopName (BUYER field) from the sales data
      const dealerEntry = await DealerListTseWise.findOne({ "Dealer Code": dealerCode });

      if (dealerEntry) {
        const shopName = dealerEntry['DEALER NAME'] || "Unknown Shop"; // Default to "Unknown Shop" if no buyer name is found
        const shopArea = "Unknown Area"; // Default value, adjust based on data availability
        const shopAddress = "Unknown Address"; // Default value, adjust based on data availability

        // Owner details from schema
        const owner = {
          name: "Unknown Owner", // Default owner name, adjust if data is available
          position: "Owner", // Default position
          contactNumber: "Unknown Contact", // Default contact number
          email: `${dealerCode.toLowerCase()}@gmail.com`, // Default email as [dealerCode@gmail.com]
          homeAddress: "Unknown Home Address", // Default home address
          birthday: new Date(1970, 0, 1), // Default birthday, adjust if necessary
          wife: {
            name: "", // Optional, default empty
            birthday: null // Optional, default null
          },
          children: [], // Default empty children array
          otherFamilyMembers: [] // Default empty family members array
        };

        // Business details from schema
        const businessDetails = {
          typeOfBusiness: "Unknown", // Default business type
          yearsInBusiness: 0, // Default to 0, as no data available
          preferredCommunicationMethod: "Unknown" // Default value
        };

        // Hash the default password "123456"
        const hashedPassword = await bcrypt.hash("123456", 10);

        // Create a new dealer object with all required fields
        const newDealer = new Dealer({
          dealerCode,
          shopName,
          shopArea, // Required field
          shopAddress, // Required field
          owner, // Owner details
          anniversaryDate: null, // Default null for now
          otherImportantFamilyDates: [], // Default empty array
          businessDetails, // Business details
          specialNotes: "", // No special notes available
          password: hashedPassword, // Password field
          verified: false // Set verified to false initially
        });

        // Save the new dealer in the database
        await newDealer.save();

        // Generate a token for the newly created dealer
        const token = jwt.sign(
          {
            dealer_id: newDealer._id,
            dealerCode: newDealer.dealerCode,
            shopName: newDealer.shopName,
            ownerName: newDealer.owner.name,
            role: "dealer", // Include the role in the token payload
          },
          JWT_SECRET,
          { expiresIn: "7d" } // Token expiry duration
        );

        // Add the new dealer to the response list
        newDealers.push({
          dealer: newDealer,
          token,
          message: "Dealer registered successfully."
        });
      }
    }

    if (newDealers.length > 0) {
      // Return the newly registered dealers and their tokens
      return res.status(200).json({
        message: "New dealers registered successfully.",
        newDealers
      });
    } else {
      return res.status(200).json({
        message: "No new dealers to register."
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


// exports.getMassagedDealersCSV = async (req, res) => {
//   try {
//     // Fetch all dealers from the database
//     const dealers = await Dealer.find();

//     if (dealers.length === 0) {
//       return res.status(404).json({ message: "No dealers found." });
//     }

//     // Define default latitude and longitude
//     const defaultLatitude = 26.937867;
//     const defaultLongitude = 75.7913932;

//     // Prepare the data for CSV export
//     const dealerData = dealers.map((dealer) => {
//       const latitude = dealer?.latitude ?? defaultLatitude;
//       const longitude = dealer?.longitude ?? defaultLongitude;

//       return {
//         dealerCode: dealer.dealerCode || "N/A",
//         shopName: dealer.shopName || "N/A",
//         shopArea: dealer.shopArea || "N/A",
//         shopAddress: dealer.shopAddress || "N/A",
//         updatedAt: new Date(dealer.updatedAt).toLocaleString("en-IN", {
//           day: "2-digit",
//           month: "2-digit",
//           year: "numeric",
//           hour: "2-digit",
//           minute: "2-digit",
//           second: "2-digit",
//         }),
//         latitude,
//         longitude,
//         geotag_picture: dealer?.geotag_picture || "N/A",
//       };
//     });

//     // Define the CSV columns
//     const columns = [
//       "dealerCode",
//       "shopName",
//       "shopArea",
//       "shopAddress",
//       "updatedAt",
//       "latitude",
//       "longitude",
//       "geotag_picture",
//     ];

//     // Convert data to CSV format
//     let csvContent = columns.join(",") + "\n"; // Add header row

//     dealerData.forEach((dealer) => {
//       const row = columns.map((col) => {
//         const value = dealer[col];
//         return typeof value === "string" ? value.replace(/,/g, "") : value; // Remove commas from string values
//       });
//       csvContent += row.join(",") + "\n";
//     });

//     // Set response headers for CSV file download
//     res.header("Content-Type", "text/csv");
//     res.header("Content-Disposition", "attachment; filename=dealers.csv");

//     // Send the CSV content
//     return res.status(200).send(csvContent);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// exports.getMassagedDealersCSV = async (req, res) => {
//   try {
//     // Fetch all dealers from the database
//     const dealers = await Dealer.find();

//     if (dealers.length === 0) {
//       return res.status(404).json({ message: "No dealers found." });
//     }

//     // Define default latitude and longitude
//     const defaultLatitude = 26.937867;
//     const defaultLongitude = 75.7913932;

//     // Prepare the data for CSV export
//     const dealerData = dealers.map((dealer) => {
//       const latitude = dealer?.latitude ?? defaultLatitude;
//       const longitude = dealer?.longitude ?? defaultLongitude;

//       return {
//         dealerCode: dealer.dealerCode || "N/A",
//         shopName: dealer.shopName || "N/A",
//         shopArea: dealer.shopArea || "N/A",
//         shopAddress: dealer.shopAddress || "N/A",
//         updatedAt: new Date(dealer.updatedAt).toLocaleString("en-IN", {
//           day: "2-digit",
//           month: "2-digit",
//           year: "numeric",
//           hour: "2-digit",
//           minute: "2-digit",
//           second: "2-digit",
//         }),
//         latitude,
//         longitude,
//         geotag_picture: dealer?.geotag_picture || "N/A",
//         geotagging_status: dealer?.geotag_picture ? "DONE" : "PENDING",
//       };
//     });

//     // Define the CSV columns
//     const columns = [
//       "dealerCode",
//       "shopName",
//       "shopArea",
//       "shopAddress",
//       "updatedAt",
//       "latitude",
//       "longitude",
//       "geotag_picture",
//       "geotagging_status",
//     ];

//     // Convert data to CSV format
//     let csvContent = columns.join(",") + "\n"; // Add header row

//     dealerData.forEach((dealer) => {
//       const row = columns.map((col) => {
//         const value = dealer[col];
//         return typeof value === "string" ? value.replace(/,/g, "") : value; // Remove commas from string values
//       });
//       csvContent += row.join(",") + "\n";
//     });

//     // Set response headers for CSV file download
//     res.header("Content-Type", "text/csv");
//     res.header("Content-Disposition", "attachment; filename=dealers.csv");

//     // Send the CSV content
//     return res.status(200).send(csvContent);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// exports.getMassagedDealersCSV = async (req, res) => {
//   try {
//     // Fetch all dealers from the database
//     const dealers = await Dealer.find();

//     if (dealers.length === 0) {
//       return res.status(404).json({ message: "No dealers found." });
//     }

//     // Fetch dealer list from DealerListTseWise
//     const dealerListTseWise = await DealerListTseWise.find();
//     const tseMap = dealerListTseWise.reduce((map, item) => {
//       map[item["Dealer Code"]] = item.TSE || "N/A";
//       return map;
//     }, {});

//     // Define default latitude and longitude
//     const defaultLatitude = 26.937867;
//     const defaultLongitude = 75.7913932;

//     // Prepare the data for CSV export
//     const dealerData = dealers.map((dealer) => {
//       const latitude = dealer?.latitude ?? defaultLatitude;
//       const longitude = dealer?.longitude ?? defaultLongitude;
//       const tse = tseMap[dealer.dealerCode] || "N/A";

//       return {
//         dealerCode: dealer.dealerCode || "N/A",
//         shopName: dealer.shopName || "N/A",
//         shopArea: dealer.shopArea || "N/A",
//         shopAddress: dealer.shopAddress || "N/A",
//         updatedAt: new Date(dealer.updatedAt).toLocaleString("en-IN", {
//           day: "2-digit",
//           month: "2-digit",
//           year: "numeric",
//           hour: "2-digit",
//           minute: "2-digit",
//           second: "2-digit",
//         }),
//         latitude,
//         longitude,
//         geotag_picture: dealer?.geotag_picture || "N/A",
//         geotagging_status: dealer?.geotag_picture ? "DONE" : "PENDING",
//         TSE: tse,
//       };
//     });

//     // Define the CSV columns
//     const columns = [
//       "dealerCode",
//       "shopName",
//       "shopArea",
//       "shopAddress",
//       "updatedAt",
//       "latitude",
//       "longitude",
//       "geotag_picture",
//       "geotagging_status",
//       "TSE",
//     ];

//     // Convert data to CSV format
//     let csvContent = columns.join(",") + "\n"; // Add header row

//     dealerData.forEach((dealer) => {
//       const row = columns.map((col) => {
//         const value = dealer[col];
//         return typeof value === "string" ? value.replace(/,/g, "") : value; // Remove commas from string values
//       });
//       csvContent += row.join(",") + "\n";
//     });

//     // Set response headers for CSV file download
//     res.header("Content-Type", "text/csv");
//     res.header("Content-Disposition", "attachment; filename=dealers.csv");

//     // Send the CSV content
//     return res.status(200).send(csvContent);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };
// Nameeeeeeeeeeeeeeeeeeeeeeeeeeerraarararararararararararar
exports.getMassagedDealersCSV = async (req, res) => {
 try {
   // Extract employee code from the token via middleware
   const { code } = req;
   if (!code) {
     return res.status(400).json({ error: "Employee code not found in request" });
   }

   console.log("Code is:", code);

   // Fetch name and position from EmployeeCodes schema using the employee code
   const employee = await EmployeeCode.findOne({ Code: code });
   if (!employee) {
     return res.status(404).json({ error: "Employee not found for the provided code" });
   }

   const { Name, Position } = employee;

   // Fetch dealer list from DealerListTseWise filtered by TSE name
   const dealerListTseWise = await DealerListTseWise.find({ TSE: Name  });
   if (dealerListTseWise.length === 0) {
     return res
       .status(404)
       .json({ message: `No dealers found for TSE: ${Name}` });
   }

   // Extract dealer codes from the filtered list
   const dealerCodes = dealerListTseWise.map((dealer) => dealer["Dealer Code"]);

   // Fetch dealers by dealer codes (only those assigned to this TSE)
   const dealers = await Dealer.find({
     dealerCode: { $in: dealerCodes },
   });

   if (dealers.length === 0) {
     return res
       .status(404)
       .json({ message: `No dealer details found for TSE: ${name}` });
   }

   console.log("Filtered Dealers:", dealers);

   // Define default latitude and longitude
   const defaultLatitude = 26.937867;
   const defaultLongitude = 75.7913932;

   // Prepare the data for CSV export
   const dealerData = dealers.map((dealer) => {
     const latitude = dealer?.latitude ?? defaultLatitude;
     const longitude = dealer?.longitude ?? defaultLongitude;

     return {
       dealerCode: dealer.dealerCode || "N/A",
       shopName: dealer.shopName || "N/A",
       shopArea: dealer.shopArea || "N/A",
       shopAddress: dealer.shopAddress || "N/A",
       updatedAt: new Date(dealer.updatedAt).toLocaleString("en-IN", {
         day: "2-digit",
         month: "2-digit",
         year: "numeric",
         hour: "2-digit",
         minute: "2-digit",
         second: "2-digit",
       }),
       latitude,
       longitude,
       geotag_picture: dealer?.geotag_picture || "N/A",
       geotagging_status: dealer?.geotag_picture ? "DONE" : "PENDING",
     };
   });

   // Define the CSV columns
   const columns = [
     "dealerCode",
     "shopName",
     "shopArea",
     "shopAddress",
     "updatedAt",
     "latitude",
     "longitude",
     "geotag_picture",
     "geotagging_status",
   ];

   // Convert data to CSV format
   let csvContent = columns.join(",") + "\n"; // Add header row

   dealerData.forEach((dealer) => {
     const row = columns.map((col) => {
       const value = dealer[col];
       return typeof value === "string" ? value.replace(/,/g, "") : value; // Remove commas from string values
     });
     csvContent += row.join(",") + "\n";
   });

   // Set response headers for CSV file download
   res.header("Content-Type", "text/csv");
   res.header("Content-Disposition", "attachment; filename=dealers.csv");

   // Send the CSV content
   return res.status(200).send(csvContent);
 } catch (error) {
   console.error("Error:", error);
   return res.status(500).json({ error: "Internal Server Error" });
 }
};






exports.getDealersGeotaggingInCSVFormat = async (req, res) => {
  try {
    // Fetch all dealers from the database
    const dealers = await Dealer.find();

    if (dealers.length === 0) {
      return res.status(404).json({ message: "No dealers found." });
    }

    // Fetch dealer list from DealerListTseWise
    const dealerListTseWise = await DealerListTseWise.find();
    const tseMap = dealerListTseWise.reduce((map, item) => {
      map[item["Dealer Code"]] = item.TSE || "N/A";
      return map;
    }, {});

    // Define default latitude and longitude
    const defaultLatitude = 26.937867;
    const defaultLongitude = 75.7913932;

    // Prepare the data for CSV export
    const dealerData = dealers.map((dealer) => {
      const latitude = dealer?.latitude ?? defaultLatitude;
      const longitude = dealer?.longitude ?? defaultLongitude;
      const tse = tseMap[dealer.dealerCode] || "N/A";

      return {
        dealerCode: dealer.dealerCode || "N/A",
        shopName: dealer.shopName || "N/A",
        shopArea: dealer.shopArea || "N/A",
        shopAddress: dealer.shopAddress || "N/A",
        updatedAt: new Date(dealer.updatedAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        latitude,
        longitude,
        geotag_picture: dealer?.geotag_picture || "N/A",
        geotagging_status: dealer?.geotag_picture ? "DONE" : "PENDING",
        TSE: tse,
      };
    });

    // Define the CSV columns
    const columns = [
      "dealerCode",
      "shopName",
      "shopArea",
      "shopAddress",
      "updatedAt",
      "latitude",
      "longitude",
      "geotag_picture",
      "geotagging_status",
      "TSE",
    ];

    // Convert data to CSV format
    let csvContent = columns.join(",") + "\n"; // Add header row

    dealerData.forEach((dealer) => {
      const row = columns.map((col) => {
        const value = dealer[col];
        return typeof value === "string" ? value.replace(/,/g, "") : value; // Remove commas from string values
      });
      csvContent += row.join(",") + "\n";
    });

    // Set response headers for CSV file download
    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", "attachment; filename=dealers.csv");

    // Send the CSV content
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};



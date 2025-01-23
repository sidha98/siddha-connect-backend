const DealerListTseWise = require("../models/DealerListTseWise");
const csvParser = require("csv-parser");
const { Readable } = require("stream");
const { v4: uuidv4 } = require("uuid");
const SalesDataMTDW = require("../models/SalesDataMTDW");

exports.uploadDealerListTseWise = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }
  
      let results = [];
  
      if (req.file.originalname.endsWith(".csv")) {
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
              let newEntries = [];
  
              for (let data of results) {
                const iuid = Object.values(data).join('|');
                console.log("IUID: ", iuid);
  
                const existingRecord = await DealerListTseWise.findOne({ iuid });
  
                if (!existingRecord) {
                  // Deep clone the data object to avoid modification issues
                  const newData = JSON.parse(JSON.stringify(data)); 
  
                  newData.iuid = iuid;

  
                  newEntries.push(newData);  // Push the deeply cloned data
                }
              }
  
              if (newEntries.length > 0) {
                await DealerListTseWise.insertMany(newEntries);
                res.status(200).send("Data inserted into database");
              } else {
                res.status(200).send("No new data to insert, all entries already exist.");
              }
            } catch (error) {
              console.log(error);
              res.status(500).send("Error inserting data into database");
            }
          });
      } else {
        res.status(400).send("Unsupported file format");
      }
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
    }
  };

exports.updateDealerListWithSalesData = async (req, res) => {
  try {
    // Fetch all dealer entries from DealerListTseWise
    const dealers = await DealerListTseWise.find();
    console.log("Dealers: ", dealers);

    // Initialize an array to keep track of updated dealers
    let updatedDealers = [];

    // Iterate through each dealer entry
    for (const dealer of dealers) {
      const dealerCode = dealer["Dealer Code"]; // Get the dealer code
      console.log("dealerCode: ", dealerCode);

      // Fetch the most recent sales data for the dealer code, sorted by date
      const salesData = await SalesDataMTDW.findOne({ "BUYER CODE": dealerCode })
        .sort({ DATE: -1 }) // Sorting in descending order by DATE to get the most recent entry
        .limit(1);

      // If sales data is found, update the dealer entry with ASM, ASE, ABM, ZSM, RSO
      if (salesData) {
        // Prepare the fields to be updated or added
        const updatedFields = {
          ASM: salesData.ASM || dealer.ASM || "",
          ASE: salesData.ASE || dealer.ASE || "",
          ABM: salesData.ABM || dealer.ABM || "",
          ZSM: salesData.ZSM || dealer.ZSM || "",
          RSO: salesData.RSO || dealer.RSO || ""
        };

        // Update the dealer in the database
        const updatedDealer = await DealerListTseWise.updateOne(
          { 'Dealer Code': dealerCode },
          { $set: updatedFields }
        );

        if (updatedDealer.nModified > 0) {
          updatedDealers.push(dealerCode);
        }
      }
    }

    if (updatedDealers.length > 0) {
      res.status(200).send({
        message: "Dealer list updated successfully",
        updatedDealers,
      });
    } else {
      res.status(200).send({
        message: "No dealers were updated, no matching sales data found",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error while updating dealer list");
  }
};


exports.addDefaultAddressToDealerListTseWise = async (req, res) => {
  try {
    // Update all documents without the 'address' field
    const result = await DealerListTseWise.updateMany(
      { address: { $exists: false } },
      {
        $set: {
          address: {
            state: "Rajasthan",
            district: "Jaipur",
            town: "",
          },
        },
      }
    );

    return res.status(200).json({
      message: `${result.modifiedCount} entries updated with the address field.`,
    });
  } catch (error) {
    console.error("Error updating entries with address:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// exports.updateDealerListTSEWiseFromCSV = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).send("No file uploaded");
//     }

//     const results = [];

//     if (req.file.originalname.endsWith(".csv")) {
//       const stream = new Readable();
//       stream.push(req.file.buffer);
//       stream.push(null);

//       stream
//         .pipe(csvParser())
//         .on("data", (data) => {
//           results.push(data);
//         })
//         .on("end", async () => {
//           try {
//             let updatedCount = 0;
//             let notFoundCount = 0;
//             const notFoundDealers = [];

//             for (const data of results) {
//               const dealerCode = data["Dealer Code"];
//               console.log("Processing Dealer Code:", dealerCode);

//               if (!dealerCode) {
//                 console.log("Skipping row due to missing Dealer Code:", data);
//                 continue;
//               }

//               // Find existing dealer by Dealer Code
//               const existingRecord = await DealerListTseWise.findOne({ "Dealer Code": dealerCode });

//               if (existingRecord) {
//                 // Use Object.assign to update all fields dynamically
//                 Object.assign(existingRecord, data);

//                 // Recalculate and update iuid
//                 existingRecord.iuid = Object.values(data)
//                   .map((value) => (value ? value : ""))
//                   .join("|");

//                 try {
//                   console.log("Before Save - Existing Record:", existingRecord);
//                   await existingRecord.save(); // Save the updated record
//                   console.log("After Save - Updated Record:", existingRecord);
//                   updatedCount++;
//                 } catch (saveError) {
//                   console.error("Error saving record for Dealer Code:", dealerCode, saveError);
//                 }
//               } else {
//                 console.log(`Dealer Code ${dealerCode} not found in database.`);
//                 notFoundDealers.push(dealerCode);
//                 notFoundCount++;
//               }
//             }

//             // Log summary and send response
//             console.log(`Updated ${updatedCount} dealers.`);
//             console.log(`Could not find ${notFoundCount} dealers.`, notFoundDealers);

//             res.status(200).json({
//               message: "Dealer data updated successfully.",
//               updatedCount,
//               notFoundCount,
//               notFoundDealers,
//             });
//           } catch (error) {
//             console.error("Error processing CSV data:", error);
//             res.status(500).send("Error processing dealer data.");
//           }
//         });
//     } else {
//       res.status(400).send("Unsupported file format. Please upload a CSV file.");
//     }
//   } catch (error) {
//     console.error("Internal server error:", error);
//     res.status(500).send("Internal server error");
//   }
// };

exports.updateDealerListTSEWiseFromCSV = async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).send("No file uploaded");
      }

      let results = [];

      if (req.file.originalname.endsWith(".csv")) {
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

                      for (let row of results) {
                          const dealerCode = row["Dealer Code"];

                          if (!dealerCode) continue; // Skip rows without Dealer Code

                          // Use findOneAndUpdate to update the record
                          const updatedRecord = await DealerListTseWise.findOneAndUpdate(
                              { "Dealer Code": dealerCode }, // Filter
                              {
                                  $set: {
                                      TYPE: row.TYPE,
                                      Area: row.Area,
                                      TSE: row.TSE,
                                      ASM: row.ASM,
                                      ABM: row.ABM,
                                      ZSM: row.ZSM,
                                  },
                              },
                              { new: true, upsert: false } // Options: Return the updated document, no upsert
                          );

                          if (updatedRecord) {
                              updateCount++;
                          }
                      }

                      res.status(200).send(`${updateCount} records updated successfully.`);
                  } catch (error) {
                      console.error(error);
                      res.status(500).send("Error updating records in the database");
                  }
              });
      } else {
          res.status(400).send("Unsupported file format");
      }
  } catch (error) {
      console.error(error);
      res.status(500).send("Internal server error");
  }
};

exports.updateTseInDealerListTseWise = async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).send("No file uploaded");
      }

      let results = [];

      if (req.file.originalname.endsWith(".csv")) {
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

                      for (let row of results) {
                          const dealerCode = row["Dealer Code"];
                          const tseName = row["TSE Name"];

                          if (!dealerCode || !tseName) continue; // Skip rows without Dealer Code or TSE Name

                          // Update TSE field in DealerListTseWise
                          const updatedRecord = await DealerListTseWise.findOneAndUpdate(
                              { "Dealer Code": dealerCode }, // Filter by Dealer Code
                              { $set: { TSE: tseName } },     // Update TSE field
                              { new: true, upsert: false }    // Options: Return the updated document, no upsert
                          );

                          if (updatedRecord) {
                              updateCount++;
                          }
                      }

                      res.status(200).send(`${updateCount} records updated successfully.`);
                  } catch (error) {
                      console.error("Error updating records: ", error);
                      res.status(500).send("Error updating records in the database");
                  }
              });
      } else {
          res.status(400).send("Unsupported file format");
      }
  } catch (error) {
      console.error("Internal server error: ", error);
      res.status(500).send("Internal server error");
  }
};








  




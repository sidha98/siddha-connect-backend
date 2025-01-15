const { Readable } = require("stream");
const xml2js = require("xml2js");
const TallyTransaction = require("../models/TallyTransaction"); // Import your model
const csvParser = require("csv-parser");


const moment = require('moment'); // Install moment.js for date formatting


exports.uploadTallyTransactions = async (req, res) => {
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
                // Extract dealerCode and modify PARTYNAME
                const [partyName, dealerCode] = data.PARTYNAME.split('-').map((str) => str.trim());
                data.PARTYNAME = partyName; // Update PARTYNAME to exclude dealerCode
                data.dealerCode = dealerCode || null; // Add dealerCode or set to null if absent
  
                const iuid = Object.values(data).join('|');
                console.log("IUID: ", iuid);
  
                // Check if VOUCHER.REMOTEID exists, generate unique ID if null
                const remoteId =
                  data['VOUCHER.REMOTEID'] || `${iuid}-${Date.now()}`; // Unique ID based on IUID and timestamp
  
                // Skip duplicates based on IUID or VOUCHER.REMOTEID
                const existingRecord = await TallyTransaction.findOne({
                  $or: [{ iuid }, { 'VOUCHER.REMOTEID': remoteId }]
                });
  
                if (!existingRecord) {
                  // Parse and format the DATE field
                  const formattedDate = moment(data.DATE, "YYYYMMDD").toDate();
  
                  // Deep clone the data object to avoid modification issues
                  const newData = JSON.parse(JSON.stringify(data)); 
                  newData.iuid = iuid;
                  newData['VOUCHER.REMOTEID'] = remoteId;
                  newData.DATE = formattedDate; // Store the formatted Date object
                  newEntries.push(newData);
                }
              }
  
              if (newEntries.length > 0) {
                await TallyTransaction.insertMany(newEntries);
                res.status(200).send("Data inserted into database");
              } else {
                res.status(200).send("No new data to insert, all entries already exist.");
              }
            } catch (error) {
              console.error("Error during insertion:", error);
              res.status(500).send("Error inserting data into database");
            }
          });
      } else {
        res.status(400).send("Unsupported file format");
      }
    } catch (error) {
      console.error("Internal server error:", error);
      res.status(500).send("Internal server error");
    }
  };
  

  exports.getTallyTransactionForDealer = async (req, res) => {
    try {
        const { dealerCode } = req; // Assuming dealerCode is passed as a route parameter
        const { voucher_type } = req.query;

        if (!dealerCode) {
            return res.status(400).json({ error: "dealerCode is required." });
        }

        // Constructing filters for the query
        const filters = { dealerCode };
        if (voucher_type) {
            filters.VOUCHERTYPE = voucher_type;
        }

        // Fetching transactions from MongoDB
        const transactions = await TallyTransaction.find(filters).lean(); // Use `lean()` for better performance

        if (!transactions || transactions.length === 0) {
            return res.status(404).json({ message: "No transactions found for the given filters" });
        }

        // Adding unique `id` field for frontend compatibility
        const formattedTransactions = transactions.map((transaction) => ({
            ...transaction,
            id: transaction._id, // Using `_id` as the `id` field
        }));

        res.status(200).json(formattedTransactions);
    } catch (error) {
        console.error("Internal server error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


exports.uploadTallyTransactionsThroughMainMachine = async (req, res) => {
  try {
      const transactions = req.body; // Transactions data sent from the local machine

      if (!transactions || transactions.length === 0) {
          return res.status(400).json({ error: "No transactions provided." });
      }

      // Example processing: Saving transactions to the database (replace with your logic)
      // await TransactionModel.insertMany(transactions);
      console.log("Transactions: ", transactions);

      console.log("Transactions received:", transactions.length);

      res.status(200).json({ message: "Transactions uploaded successfully.", count: transactions.length });
  } catch (error) {
      console.error("Internal server error:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};



// exports.getTallyTransactionForDealer = async (req, res) => {
//   try {
//       const { dealerCode } = req;
//       const { voucher_type } = req.query;

//       if (!dealerCode) {
//           return res.status(400).json({ error: "dealerCode is required" });
//       }

//       // Assuming TallyTransaction is your MongoDB model
//       const filters = { dealerCode };

//       if (voucher_type) {
//           filters.VOUCHERTYPE = voucher_type;
//       }

//       const transactions = await TallyTransaction.find(filters);

//       if (!transactions || transactions.length === 0) {
//           return res.status(404).json({ message: "No transactions found for the given filters" });
//       }

//       res.status(200).json(transactions);
//   } catch (error) {
//       console.error("Internal server error", error);
//       res.status(500).send("Internal server error");
//   }
// };
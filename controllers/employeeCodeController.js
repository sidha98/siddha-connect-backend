const { Readable } = require('stream');
const csvParser = require('csv-parser');
const { model } = require('mongoose');
const EmployeeCode = require('../models/EmployeeCode');

exports.uploadEmployeeCodes = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        if (!req.file.originalname.endsWith(".csv")) {
            return res.status(400).send("Unsupported file format");
        }

        // Fetch existing codes from the database first
        const existingCodes = new Set(await EmployeeCode.find().distinct('Code'));
        console.log("Existing codes: ", existingCodes);

        const stream = new Readable();
        stream.push(req.file.buffer);
        stream.push(null);

        const results = [];
        const skippedRecords = [];

        stream.pipe(csvParser())
            .on('data', (data) => {
                if (!existingCodes.has(data.Code)) {
                    existingCodes.add(data.Code); // Add new code to the existingCodes set
                    results.push(data);          // Add to results if code was not previously seen
                } else {
                    skippedRecords.push(data);   // Skip the record if the code is duplicated
                    console.log("Skipped due to duplication:", data);
                }
            })
            .on('end', async () => {
                try {
                    if (results.length > 0) {
                        await EmployeeCode.insertMany(results);
                    }

                    res.status(200).send({
                        message: `${results.length} new records inserted successfully`,
                        skippedRecords: skippedRecords // Optionally send back or log the skipped records
                    });
                } catch (error) {
                    console.error(error);
                    res.status(500).send("Error inserting data into database");
                }
            });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
};

exports.addEmployeeCode = async (req, res) => {
    try {
        // Destructure required fields from the request body
        const { Name, Position, Code } = req.body;

        // Validate input fields
        if (!Name || !Position || !Code) {
            return res.status(400).json({ error: "Name, Position, and Code are required fields." });
        }

        // Check if the code already exists in the database
        const existingEmployee = await EmployeeCode.findOne({ Code });
        if (existingEmployee) {
            return res.status(400).json({ error: "Employee with this code already exists." });
        }

        // Create a new employee code document
        const newEmployeeCode = new EmployeeCode({
            Name,
            Position,
            Code
        });

        // Save the new employee code to the database
        await newEmployeeCode.save();

        return res.status(201).json({
            message: "Employee code added successfully.",
            data: newEmployeeCode
        });
    } catch (error) {
        console.error("Error adding employee code:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
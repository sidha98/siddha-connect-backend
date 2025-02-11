const WeeklyBeatMappingSchedule = require("../models/WeeklyBeatMappingSchedule");

const csvParser = require("csv-parser");
const { Readable } = require("stream");
const EmployeeCode = require("../models/EmployeeCode");
const Dealer = require("../models/Dealer");
const { getCurrentWeekDates } = require("../helpers/dateHelpers");

exports.addWeeklyBeatMappingSchedule = async (req, res) => {
    try {
        const { startDate, endDate, code, schedule } = req.body;

        // Validate input fields
        if (!code || !startDate || !endDate || !schedule) {
            return res.status(400).json({ error: "Code, startDate, endDate, and schedule are required fields." });
        }

        // Count total dealers in the schedule
        let total = 0;
        let done = 0;
        let pending = 0;

        Object.values(schedule).forEach(daySchedule => {
            total += daySchedule.length;
            daySchedule.forEach(dealer => {
                if (dealer.status === 'done') done++;
                else if (dealer.status === 'pending') pending++;
            });
        });

        // Create new schedule entry
        const newSchedule = new WeeklyBeatMappingSchedule({
            startDate,
            endDate,
            userCode: code,
            schedule,
            total,
            done,
            pending
        });

        // Save to database
        await newSchedule.save();

        return res.status(201).json({
            message: "Weekly Beat Mapping Schedule added successfully.",
            data: newSchedule
        });

    } catch (error) {
        console.error("Error adding Weekly Beat Mapping Schedule:", error);
        return res.status(500).json({ error: "Internal server error!!!" });
    }
};


exports.getWeeklyBeatMappingScheduleByUserCodeAndDate = async (req, res) => {
    try {
        const { code } = req.params;
        let { startDate, endDate } = req.query; // Optional date range
        console.log("Startdate, endDate: ", startDate, endDate);

        // Validate userCode
        if (!code) {
            return res.status(400).json({ error: "User code is required." });
        }

        // If startDate and endDate are not provided, select the current week (Monday to Sunday)
        if (!startDate || !endDate) {
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 (Sunday) - 6 (Saturday)

            // Calculate Monday of the current week
            const monday = new Date(today);
            monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // If today is Sunday, go back 6 days

            // Calculate Sunday of the current week
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            startDate = monday.toISOString().split("T")[0]; // Format YYYY-MM-DD
            endDate = sunday.toISOString().split("T")[0];
        }

        // Convert to Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Fetch schedules within the date range
        const schedules = await WeeklyBeatMappingSchedule.find({
            userCode: code,
            startDate: { $gte: start },
            endDate: { $lte: end }
        });

        // If no schedules found
        if (!schedules || schedules.length === 0) {
            return res.status(404).json({ error: "No schedules found for this user code within the given date range." });
        }

        return res.status(200).json({
            message: "Weekly Beat Mapping Schedules retrieved successfully!",
            data: schedules
        });

    } catch (error) {
        console.error("Error fetching Weekly Beat Mapping Schedule:", error);
        return res.status(500).json({ error: "Internal server error!!!!" });
    }
};


exports.updateWeeklyBeatMappingStatusById = async (req, res) => {
    try {
        const { scheduleId, dealerId } = req.params; // Schedule document ID & Dealer ID inside schedule
        const { status } = req.body; // New status

        // Validate input
        if (!scheduleId || !dealerId || !status) {
            return res.status(400).json({ error: "Schedule ID, dealer ID, and status are required." });
        }

        // Validate status value
        if (!["done", "pending"].includes(status)) {
            return res.status(400).json({ error: "Invalid status. Allowed values: 'done', 'pending'." });
        }

        // Find the schedule entry by ID
        const schedule = await WeeklyBeatMappingSchedule.findById(scheduleId);
        if (!schedule) {
            return res.status(404).json({ error: "Schedule not found." });
        }

        let dealerUpdated = false;

        // Loop through all days to find and update the dealer entry by _id
        Object.keys(schedule.schedule).forEach(day => {
            schedule.schedule[day].forEach(dealer => {
                if (dealer._id.toString() === dealerId) {
                    dealer.status = status;
                    dealerUpdated = true;
                }
            });
        });

        if (!dealerUpdated) {
            return res.status(404).json({ error: "Dealer entry not found in the schedule." });
        }

        // Recalculate total, done, and pending counts
        let total = 0, done = 0, pending = 0;
        Object.values(schedule.schedule).forEach(daySchedule => {
            total += daySchedule.length;
            daySchedule.forEach(dealer => {
                if (dealer.status === 'done') done++;
                else if (dealer.status === 'pending') pending++;
            });
        });

        // Update the counts
        schedule.total = total;
        schedule.done = done;
        schedule.pending = pending;

        // Save the updated schedule
        await schedule.save();

        return res.status(200).json({
            message: "Dealer status updated successfully.",
            data: schedule
        });

    } catch (error) {
        console.error("Error updating dealer status:", error);
        return res.status(500).json({ error: "Internal server error!!!" });
    }
};

exports.addWeeklyBeatMappingFromCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        let results = [];

        // Parse CSV from buffer
        const stream = new Readable();
        stream.push(req.file.buffer);
        stream.push(null);

        stream.pipe(csvParser())
            .on("data", (data) => {
                results.push(data);
            })
            .on("end", async () => {
                try {
                    let schedules = [];

                    for (let row of results) {
                        const tseName = row["TSE Name"];
                        const dealerCodes = row["Dealer Codes(All)"] ? row["Dealer Codes(All)"].split(" ") : [];

                        if (!tseName) continue;

                        // Find the TSE code from EmployeeCode collection
                        const tseEmployee = await EmployeeCode.findOne({ Name: tseName, Position: "TSE" });
                        if (!tseEmployee) {
                            console.warn(`TSE ${tseName} not found in EmployeeCode database.`);
                            continue;
                        }

                        const userCode = tseEmployee.Code;

                        // Fetch dealer details from Dealer collection
                        const dealerRecords = await Dealer.find({ dealerCode: { $in: dealerCodes } });

                        let schedule = {
                            Mon: [],
                            Tue: [],
                            Wed: [],
                            Thu: [],
                            Fri: [],
                            Sat: [],
                            Sun: []
                        };

                        // Populate schedule for each day
                        for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
                            if (row[day]) {
                                const dayDealerCodes = row[day].split(" ").filter(code => code);
                                for (const dealerCode of dayDealerCodes) {
                                    const dealer = dealerRecords.find(d => d.dealerCode === dealerCode);
                                    if (dealer) {
                                        schedule[day.substring(0, 3)].push({
                                            dealerCode: dealerCode,
                                            dealerName: dealer.shopName,
                                            lat: dealer?.latitude || 0.0,
                                            long: dealer?.longitude || 0.0,
                                            status: "pending"
                                        });
                                    }
                                }
                            }
                        }

                        // Get start and end date from request or select current week
                        let { startDate, endDate } = req.body;
                        if (!startDate || !endDate) {
                            ({ startDate, endDate } = getCurrentWeekDates());
                        }

                        // Calculate total dealers in the schedule
                        let total = Object.values(schedule).reduce((sum, dealers) => sum + dealers.length, 0);

                        // Prepare new schedule entry
                        schedules.push({
                            startDate: new Date(startDate),
                            endDate: new Date(endDate),
                            userCode,
                            schedule,
                            total,
                            done: 0,
                            pending: total
                        });
                    }

                    // Insert all schedules into the database
                    await WeeklyBeatMappingSchedule.insertMany(schedules);

                    return res.status(201).json({
                        message: "Weekly Beat Mapping Schedules added successfully.",
                        totalSchedules: schedules.length
                    });

                } catch (error) {
                    console.error("Error processing CSV:", error);
                    return res.status(500).json({ error: "Internal server error while processing CSV" });
                }
            });

    } catch (error) {
        console.error("Error handling CSV upload:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

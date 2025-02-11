const WeeklyBeatMappingSchedule = require("../models/WeeklyBeatMappingSchedule");

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

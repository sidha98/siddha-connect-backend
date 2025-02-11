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

const BeatMapping = require("../models/BeatMapping");

exports.addBeat = async (req, res) => {
    try {
        const { user_id } = req;
        const { latitude, longitude, accuracy, speed, altitude, address, deviceId, batteryLevel } = req.body;

        // Validate input fields
        if (!user_id || !latitude || !longitude) {
            return res.status(400).json({ error: "Employee ID, latitude, and longitude are required fields." });
        }

        // Create a new location entry
        const newBeat = new BeatMapping({
            employeeId : user_id,
            latitude,
            longitude,
            accuracy,
            speed,
            altitude,
            address,
            deviceId,
            batteryLevel
        });

        // Save to database
        await newBeat.save();

        return res.status(201).json({
            message: "Employee beat added successfully.",
            data: newBeat
        });
    } catch (error) {
        console.error("Error adding employee location:", error);
        return res.status(500).json({ error: "Internal server error!!" });
    }
};

exports.getBeat = async (req, res) => {
 try {
     const beats = await BeatMapping.find();
     res.status(200).json({ success: true, data: beats });
 } catch (error) {
     console.error("Error getting mapping", error);
     res.status(500).json({ success: false, message: "Server error" });
 }
};
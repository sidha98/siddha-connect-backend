const express = require("express");
const { addWeeklyBeatMappingSchedule, getWeeklyBeatMappingScheduleByUserCodeAndDate } = require("../controllers/weeklyBeatMappingScheduleControllers");
const { userAuth } = require("../middlewares/authMiddlewares");
const router = express.Router();


router.post("/add-weekly-beat-mapping-entry", addWeeklyBeatMappingSchedule);
router.get("/get-weekly-beat-mapping/:code", getWeeklyBeatMappingScheduleByUserCodeAndDate);

module.exports = router;
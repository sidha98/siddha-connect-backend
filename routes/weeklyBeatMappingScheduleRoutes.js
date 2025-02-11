const express = require("express");
const { addWeeklyBeatMappingSchedule, getWeeklyBeatMappingScheduleByUserCodeAndDate, updateWeeklyBeatMappingStatusById } = require("../controllers/weeklyBeatMappingScheduleControllers");
const { userAuth } = require("../middlewares/authMiddlewares");
const router = express.Router();


router.post("/add-weekly-beat-mapping-entry", addWeeklyBeatMappingSchedule);
router.get("/get-weekly-beat-mapping/:code", getWeeklyBeatMappingScheduleByUserCodeAndDate);

router.put("/weekly-schedule/:scheduleId/dealer/:dealerId/status", updateWeeklyBeatMappingStatusById);

module.exports = router;    
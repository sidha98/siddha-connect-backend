const express = require("express");
const { addWeeklyBeatMappingSchedule, getWeeklyBeatMappingScheduleByUserCodeAndDate, updateWeeklyBeatMappingStatusById, addWeeklyBeatMappingFromCSV } = require("../controllers/weeklyBeatMappingScheduleControllers");
const { upload } = require("../services/fileUpload");
const router = express.Router();


router.post("/add-weekly-beat-mapping-entry", addWeeklyBeatMappingSchedule);
router.get("/get-weekly-beat-mapping/:code", getWeeklyBeatMappingScheduleByUserCodeAndDate);

router.put("/weekly-schedule/:scheduleId/dealer/:dealerId/status", updateWeeklyBeatMappingStatusById);

router.post("/weekly-schedule/upload", upload.single("file"), addWeeklyBeatMappingFromCSV);




module.exports = router;    
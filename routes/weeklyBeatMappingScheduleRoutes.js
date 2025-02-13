const express = require("express");
const { addWeeklyBeatMappingSchedule, getWeeklyBeatMappingScheduleByUserCodeAndDate, updateWeeklyBeatMappingStatusById, addWeeklyBeatMappingFromCSV, updateDealerStatusWithProximity } = require("../controllers/weeklyBeatMappingScheduleControllers");
const { upload } = require("../services/fileUpload");
const { userAuth } = require("../middlewares/authMiddlewares");
const router = express.Router();


router.post("/add-weekly-beat-mapping-entry", addWeeklyBeatMappingSchedule);
router.get("/get-weekly-beat-mapping", userAuth, getWeeklyBeatMappingScheduleByUserCodeAndDate);

router.put("/weekly-schedule/:scheduleId/dealer/:dealerId/status", updateWeeklyBeatMappingStatusById);

router.post("/weekly-schedule/upload", upload.single("file"), addWeeklyBeatMappingFromCSV);

router.put("/weekly-schedule/:scheduleId/dealer/:dealerId/status-proximity", updateDealerStatusWithProximity);



module.exports = router;    
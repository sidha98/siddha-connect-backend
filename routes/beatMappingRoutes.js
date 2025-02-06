const express = require("express");
const { addBeat, getBeat } = require("../controllers/beatMappingControllers");
const { userAuth } = require("../middlewares/authMiddlewares");
const router = express.Router();

router.post("/add-beat", userAuth, addBeat);
router.get("/get-beat" ,getBeat);

module.exports = router;
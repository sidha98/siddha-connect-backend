const express = require("express");
const { addBeat } = require("../controllers/beatMappingControllers");
const { userAuth } = require("../middlewares/authMiddlewares");
const router = express.Router();

router.post("/add-beat", userAuth, addBeat);

module.exports = router;
const express = require("express");
const router = express.Router();
const { upload } = require("../services/fileUpload");
const { uploadTallyTransactions } = require("../controllers/tallyTransactionControllers");

router.post("/upload-tally-transactions", upload.single("file"), uploadTallyTransactions);

module.exports = router;

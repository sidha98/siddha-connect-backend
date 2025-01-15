const express = require("express");
const router = express.Router();
const { upload } = require("../services/fileUpload");
const { uploadTallyTransactions, getTallyTransactionForDealer, uploadTallyTransactionsThroughMainMachine } = require("../controllers/tallyTransactionControllers");
const { dealerAuth } = require("../middlewares/authMiddlewares");

router.post("/upload-tally-transactions", upload.single("file"), uploadTallyTransactions);
router.get("/get-tally-transactions-for-dealer", dealerAuth, getTallyTransactionForDealer);
router.post("/upload-tally-transactions-through-main-machine", uploadTallyTransactionsThroughMainMachine);

module.exports = router;

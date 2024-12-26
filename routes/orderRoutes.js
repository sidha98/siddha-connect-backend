const express = require("express");
const { createOrder } = require("../controllers/orderController");
const { dealerAuth } = require("../middlewares/authMiddlewares");
const router = express.Router();


router.post("/dealer/create-order", dealerAuth, createOrder)

module.exports = router;

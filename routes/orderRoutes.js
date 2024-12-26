const express = require("express");
const { createOrder, getOrdersForDealers } = require("../controllers/orderController");
const { dealerAuth } = require("../middlewares/authMiddlewares");
const router = express.Router();


router.post("/dealer/create-order", dealerAuth, createOrder);
router.post('/dealer/orders', dealerAuth, getOrdersForDealers);

module.exports = router;

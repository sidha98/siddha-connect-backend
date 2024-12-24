const express = require("express");
const { createOrder } = require("../controllers/orderController");
const router = express.Router();


router.post("/dealer/order", createOrder)

module.exports = router;
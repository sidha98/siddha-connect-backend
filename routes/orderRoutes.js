const express = require("express");
const { createOrder } = require("../controllers/orderController");
const router = express.Router();


router.post("/dealer/create-order", createOrder)

module.exports = router;
const express = require('express');
const { editExtraction, deleteExtraction, editProductForAdmin, deleteProductForAdmin, getOrderForAdmin, editOrderForAdmin, deleteOrderForAdmin, getSalesDataForAdmin, getSegmentForAdmin, editSegmentForAdmin, deleteSegmentForAdmin, UserForAdmin, editSalesDataForAdmin, deleteSalesData } = require('../controllers/admin_Controllers');
const router = express.Router();

// extraction routes

router.put("/extraction/editExtraction/:id",editExtraction);
router.delete("/extraction/deleteExtraction/:id" , deleteExtraction);


// orders Routes
router.get("/dealer/getOrders",getOrderForAdmin);
router.put("/dealer/editOrder/:id" ,editOrderForAdmin);
router.delete("/dealer/deleteOrder/:id" ,deleteOrderForAdmin);


// Products Routes for Admin

router.put("/product/editProduct/:id",editProductForAdmin);
router.delete("/product/deleteProduct/:id" ,deleteProductForAdmin);


// sales data MTD Wise
router.get("/sales-data-mtdw/getSalesData" , getSalesDataForAdmin);
router.put("/sales-data-mtdw/editSalesData/:id" , editSalesDataForAdmin);
router.delete("/sales-data-mtdw/deleteSalesData/:id" , deleteSalesData);


// segment Target Routes For admin

router.get("/segment-target/getSegment" , getSegmentForAdmin);
router.put("/segment-target/editSegment/:id" ,editSegmentForAdmin);
router.delete("/segment-target/deleteSegment/:id",deleteSegmentForAdmin);


// get user api 

router.get("/users/getUser" ,UserForAdmin);

module.exports =  router;
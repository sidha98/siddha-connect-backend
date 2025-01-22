const express = require('express');
const { editExtraction, deleteExtraction, editProductForAdmin, deleteProductForAdmin, getOrderForAdmin, editOrderForAdmin, deleteOrderForAdmin, getSalesDataForAdmin, getSegmentForAdmin, editSegmentForAdmin, deleteSegmentForAdmin, UserForAdmin, editSalesDataForAdmin, deleteSalesData, getExtractionForAdmin, editUserForAdmin, deleteUserForAdmin, editExtractionForAdmin, deleteExtractionForAdmin, getDealerForAdmin, getModelForAdmin, editModelForAdmin, deleteModelData, editDealerForAdmin, deleteDealerForAdmin } = require('../controllers/admin_Controllers');
const router = express.Router();

// orders Routes
router.get("/dealer/get-orders",getOrderForAdmin);
router.put("/dealer/edit-order/:id" ,editOrderForAdmin);
router.delete("/dealer/delete-order/:id" ,deleteOrderForAdmin);


// Products Routes for Admin

router.put("/product/edit-product/:id",editProductForAdmin);
router.delete("/product/delete-product/:id" ,deleteProductForAdmin);


// sales data MTD Wise
router.get("/sales-data-mtdw/get-sales-data" , getSalesDataForAdmin);
router.put("/sales-data-mtdw/edit-sales-data/:id" , editSalesDataForAdmin);
router.delete("/sales-data-mtdw/delete-sales-data/:id" , deleteSalesData);


// segment Target Routes For admin

router.get("/segment-target/getSegement" ,getSegmentForAdmin);
router.put("/segment-target/editSegment/:id" ,editSegmentForAdmin);
router.delete("/segment-target/deleteSegment/:id",deleteSegmentForAdmin);


// get user api 

router.get("/users/getUser" ,UserForAdmin);
router.put("user/editUser/:id" ,editUserForAdmin);
router.delete("user/deleteUser/:id" ,deleteUserForAdmin);

// Extraction Api
router.get("/extraction/getExtractions" ,getExtractionForAdmin); 
router.put("/extraction/editExtractions" ,editExtractionForAdmin);
router.put("/extraction/deleteExtraction/:id" ,deleteExtractionForAdmin);

// Dealers Routes
router.get("/dealer/getDealer" ,getDealerForAdmin);
router.put("/dealer/editDealer" ,editDealerForAdmin);
router.delete("/dealer/deleteDealer" , deleteDealerForAdmin);
// Model Routes
router.get("/model/getModel" ,getModelForAdmin);
router.put("/model/editModel" ,editModelForAdmin);
router.delete("model/deleteModel" ,deleteModelData)
module.exports =  router;
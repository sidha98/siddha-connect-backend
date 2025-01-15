const express = require("express");
const { addDealer, getDealer, isDealerVerified, editDealer, verifyAllDealers, registerDealersFromSalesData, deleteDuplicateDealers, capitalizeDealerCodes, updateDealerCategoryFromCSV, addDefaultAddressToDealers, addCoordinateFieldsToDealers, addCreditLimitToDealers, updateCreditLimitFromCSV, fetchCreditLimitForMDD, updateDealerGeoTagForEmployee, getUpdatedGeoTagForEmployee, fetchLimitsForMDD } = require("../controllers/dealerControllers");
const router = express.Router();
const { userAuth, dealerAuth } = require("../middlewares/authMiddlewares");
const { upload } = require("../services/fileUpload");

router.post("/add-dealer", addDealer);
router.get("/get-dealer", dealerAuth, getDealer);
router.put("/edit-dealer", dealerAuth, editDealer);

router.get("/is-dealer-verified", dealerAuth, isDealerVerified);
router.put("/verify-all-dealers", verifyAllDealers);
router.post("/register-dealers-from-sales-data", registerDealersFromSalesData);

// delete duplicate dealers w dealer code 
router.delete("/delete-dupe-dealers-w-dealer-code", deleteDuplicateDealers);

// capitalize all dealer codes 
router.put("/capitalize-all-dealer-codes", capitalizeDealerCodes);

// Update dealer category from csv 
router.put("/update-dealer-categories", upload.single("file"), updateDealerCategoryFromCSV);

// Update dealer addresses
router.put("/add-default-address-to-dealers", addDefaultAddressToDealers);

//add cordinate fields to dealers
router.put("/add-coordinate-fields-to-dealers", addCoordinateFieldsToDealers);

//add credit limit to dealer
router.put("/add-default-credit-limits", addCreditLimitToDealers);
router.put("/add-credit-limit-csv", upload.single("file"), updateCreditLimitFromCSV);

// MDD 
router.get("/fetch-credit-limit", dealerAuth, fetchCreditLimitForMDD);
router.get("/fetch-limits-for-mdd", dealerAuth, fetchLimitsForMDD);


// created by nameera 
router.put("/updateDealerGeoTagForEmployee", updateDealerGeoTagForEmployee);
router.get("/getUpdatedGeoTagForEmployee" , getUpdatedGeoTagForEmployee);

module.exports = router;
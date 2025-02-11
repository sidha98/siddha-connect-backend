const express = require("express");
const router = express.Router();
const { upload } = require("../services/fileUpload");
const { uploadDealerListTseWise, updateDealerListWithSalesData, addDefaultAddressToDealerListTseWise, updateDealerListTSEWiseFromCSV, updateTseInDealerListTseWise, getAllDealersForATseFromOBM } = require("../controllers/dealerListTseWiseController");

router.post("/dealer-list-tse-wise", upload.single("file"), uploadDealerListTseWise);
router.put("/mapping-update-dealers", updateDealerListWithSalesData);
router.put("/add-def-address-dealer-list-tse", addDefaultAddressToDealerListTseWise);
router.put("/update-dealer-list-tse-wise-from-csv", upload.single("file"), updateDealerListTSEWiseFromCSV);
router.put("/update-tse-in-dealer-list-tse-wise", upload.single("file"), updateTseInDealerListTseWise);


router.get("/get-all-dealers-w-tse-obm", getAllDealersForATseFromOBM);
module.exports = router;
const express = require("express");
const {
  editExtraction,
  deleteExtraction,
  editProductForAdmin,
  deleteProductForAdmin,
  getOrderForAdmin,
  editOrderForAdmin,
  deleteOrderForAdmin,
  getSalesDataForAdmin,
  getSegmentForAdmin,
  editSegmentForAdmin,
  deleteSegmentForAdmin,
  UserForAdmin,
  editSalesDataForAdmin,
  deleteSalesData,
  getExtractionForAdmin,
  editUserForAdmin,
  deleteUserForAdmin,
  editExtractionForAdmin,
  deleteExtractionForAdmin,
  getDealerForAdmin,
  getModelForAdmin,
  editModelForAdmin,
  deleteModelData,
  editDealerForAdmin,
  deleteDealerForAdmin,
  getCreditLimitsForAdmin,
  updateCreditLimitFromCsvForAdmin,
  updateSingleCreditLimitForAdmin,
  getEmployeeCodeForAdmin,
  editEmployeeCodeForAdmin,
  deleteEmployeeCodeForAdmin,
  addEmployeeCodeForAdmin,
  addUserForAdmin,
  addTallyTransactionForAdmin,
  getTallyTransactionForAdmin,
  editTallyTransaction,
  getVoucherForAdmin,
  deleteTallyTransactionByDate,
  getDealerTseWiseForAdmin,
  putDealerTseWise,
  getAreasForDropdownForAdmin,
  getEmployeeCode,
  getEmployeeNamesForDropdown,
  LoginAdmin
} = require("../controllers/admin_Controllers");
const { upload } = require("../services/fileUpload");
const router = express.Router();

// orders Routes
router.get("/dealer/get-orders", getOrderForAdmin);
router.put("/dealer/edit-order/:id", editOrderForAdmin);
router.delete("/dealer/delete-order/:id", deleteOrderForAdmin);

// Products Routes for Admin

router.put("/product/edit-product/:id", editProductForAdmin);
router.delete("/product/delete-product/:id", deleteProductForAdmin);

// sales data MTD Wise
router.get("/sales-data-mtdw/get-sales-data", getSalesDataForAdmin);
router.put("/sales-data-mtdw/edit-sales-data/:id", editSalesDataForAdmin);
router.delete("/sales-data-mtdw/delete-sales-data/:id", deleteSalesData);

// segment Target Routes For admin

router.get("/segment-target/getSegement", getSegmentForAdmin);
router.put("/segment-target/editSegment/:id", editSegmentForAdmin);
router.delete("/segment-target/deleteSegment/:id", deleteSegmentForAdmin);

// get user api
router.post("/user/addUser", addUserForAdmin);
router.get("/users/getUser", UserForAdmin);
router.put("/user/editUser/:id", editUserForAdmin);
router.delete("/user/deleteUser/:id", deleteUserForAdmin);

// Extraction Api
router.get("/extraction/getExtractions", getExtractionForAdmin);
router.put("/extraction/editExtractions", editExtractionForAdmin);
router.put("/extraction/deleteExtraction/:id", deleteExtractionForAdmin);

// Dealers Routes
router.get("/dealer/getDealer", getDealerForAdmin);
router.put("/dealer/editDealer", editDealerForAdmin);
router.delete("/dealer/deleteDealer", deleteDealerForAdmin);
// Model Routes
router.get("/model/getModel" ,getModelForAdmin);
router.put("/model/editModel" ,editModelForAdmin);
router.delete("model/deleteModel" ,deleteModelData)

//  Dealer TSE Wise Routes
router.get("/tse/get-dealer-tse-wise", getDealerTseWiseForAdmin);
router.put("/tse/put-dealer-tse-wise", putDealerTseWise);
router.get("/tse/get-areas-for-dropdown", getAreasForDropdownForAdmin);

//  Employeecodes Routes
router.get("/employeecode/get-employee-code", getEmployeeCode);
router.get("/employeename/get-employee-names-for-dropdown", getEmployeeNamesForDropdown);


// Credit limit Routes
router.get("/credit-limit/get-credit-limits", getCreditLimitsForAdmin);
router.put("/credit-limit/update-single-credit-limit-for-admin", updateSingleCreditLimitForAdmin);
router.put("/credit-limit/update-credit-limits-from-csv-for-admin", upload.single("file"), updateCreditLimitFromCsvForAdmin);

//Employee Routes
router.get("/employee/get-employee", getEmployeeCodeForAdmin);
router.put("/employee/edit-employee/:id", editEmployeeCodeForAdmin);
router.delete("/employee/delete-employee/:id", deleteEmployeeCodeForAdmin);
router.post("/employee/add-employee", addEmployeeCodeForAdmin);

//Tally Transactions
router.get("/tally-transaction/get-tally-transaction",getTallyTransactionForAdmin);
router.post("/tally-transaction/add-tally-transaction", upload.single("file"), addTallyTransactionForAdmin);
router.put("/tally-transaction/edit-tally-transaction/:id", editTallyTransaction);
router.delete("/tally-transaction/delete-tally-transaction/:date", deleteTallyTransactionByDate);

//voucher
router.get("/voucher/get-voucher-type", getVoucherForAdmin);


// login
router.post("/login-admin",LoginAdmin);
module.exports = router;

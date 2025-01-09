const express = require("express");
const { uploadEmployeeCodes, addEmployeeCode, updateEmployeeCodesFromCSV } = require("../controllers/employeeCodeController");
const { upload } = require("../services/fileUpload");
const router = express.Router();

router.post("/employee-codes", upload.single("file"), uploadEmployeeCodes);
router.post("/add-employee-code", addEmployeeCode);
router.post("/update-employee-codes-from-csv", upload.single('file'), updateEmployeeCodesFromCSV);

module.exports = router;
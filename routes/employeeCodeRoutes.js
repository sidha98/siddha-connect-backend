const express = require("express");
const { uploadEmployeeCodes, addEmployeeCode } = require("../controllers/employeeCodeController");
const { upload } = require("../services/fileUpload");
const router = express.Router();

router.post("/employee-codes", upload.single("file"), uploadEmployeeCodes);
router.post("/add-employee-code", addEmployeeCode);

module.exports = router;
const { Schema, model } = require("mongoose");

const tallyTransaction = new Schema(
  {},
  {
    strict: false,
  }
);
tallyTransaction.index({ "VOUCHER.REMOTEID": 1 }, { unique: true });


module.exports = model("TallyTransaction", tallyTransaction);

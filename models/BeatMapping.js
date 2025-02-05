const { Schema, model, default: mongoose } = require('mongoose');

const beatMappingSchema = new Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  accuracy: { type: Number },
  speed: { type: Number },
  altitude: { type: Number },
  address: { type: String },
  deviceId: { type: String },
  batteryLevel: { type: Number }
}, 
{
    timestamps: true,
    strict: false
  });

module.exports = model('BeatMapping', beatMappingSchema);

const mongoose = require('mongoose');

const DealerScheduleSchema = new mongoose.Schema({
    dealerCode: { type: String, required: true },
    dealerName: { type: String, required: true },
    lat: { type: mongoose.Schema.Types.Decimal128, required: true },
    long: { type: mongoose.Schema.Types.Decimal128, required: true },
    status: { type: String, enum: ['done', 'pending'], required: true }
});

const WeeklyBeatMappingScheduleSchema = new mongoose.Schema({
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    userCode: { type: String, required: true },
    schedule: {
        Mon: [DealerScheduleSchema],
        Tue: [DealerScheduleSchema],
        Wed: [DealerScheduleSchema],
        Thu: [DealerScheduleSchema],
        Fri: [DealerScheduleSchema],
        Sat: [DealerScheduleSchema],
        Sun: [DealerScheduleSchema]
    },
    total: { type: Number, default: 0 },
    done: { type: Number, default: 0 },
    pending: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('WeeklyBeatMappingSchedule', WeeklyBeatMappingScheduleSchema);

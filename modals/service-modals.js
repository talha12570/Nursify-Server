const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    category: {
        type: String,
        enum: ['caregiving', 'nursing', 'specialized'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        default: 'home' // icon identifier
    },
    color: {
        type: String,
        default: '#dbeafe' // background color
    },
    iconColor: {
        type: String,
        default: '#2563eb' // icon color
    },
    basePrice: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    displayOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Service = mongoose.model("services", serviceSchema);

module.exports = Service;

import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema(
    {
        name: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: true
    },

    image: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    rating: {
        type: Number,
        default: 0
    },

    reviewCount: {
        type: Number,
        default: 0
    },

    locationNote: {
        type: String
    },

    hotline: {
        type: String
    }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Hotel = mongoose.model("Hotel", hotelSchema);

export default Hotel;
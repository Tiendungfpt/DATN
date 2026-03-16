import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
{
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    roomId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Room",
        required:true
    },

    checkIn:{
        type:Date,
        required:true
    },

    checkOut:{
        type:Date,
        required:true
    },

    totalPrice:{
        type:Number
    },

    status:{
        type:String,
        enum:["pending","confirmed","cancelled"],
        default:"pending"
    },

    paymentStatus:{
        type:String,
        enum:["unpaid","paid"],
        default:"unpaid"
    },

    paymentMethod:{
        type:String,
        enum:["cash","vnpay","momo"],
        default:"cash"
    },

    transactionId:{
        type:String
    }

},
{
    timestamps:true,
    versionKey:false
}
);

export default mongoose.model("Booking",bookingSchema);
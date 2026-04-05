import mongoose from "mongoose";
import Booking from "../src/models/Booking.js";

const MONGODB_URI = "mongodb://127.0.0.1:27017/thinhphathotel";

async function migrateServiceReferences() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all bookings with invalid service references (strings instead of ObjectIds)
    const bookings = await Booking.find();
    console.log(`📊 Found ${bookings.length} bookings to check`);

    let migratedCount = 0;

    for (const booking of bookings) {
      if (!booking.services || booking.services.length === 0) {
        continue;
      }

      // Filter out non-ObjectId values (like old string enums)
      const validServices = booking.services.filter((service) => {
        if (typeof service === "string" && !mongoose.Types.ObjectId.isValid(service)) {
          console.log(
            `  ⚠️  Removing invalid service "${service}" from booking ${booking._id}`
          );
          return false;
        }
        return true;
      });

      // Convert strings to ObjectIds if needed
      const convertedServices = validServices.map((service) => {
        if (typeof service === "string") {
          return new mongoose.Types.ObjectId(service);
        }
        return service;
      });

      if (validServices.length < booking.services.length) {
        await Booking.findByIdAndUpdate(booking._id, {
          services: convertedServices,
        });
        migratedCount++;
        console.log(
          `  ✅ Updated booking ${booking._id} - removed ${
            booking.services.length - validServices.length
          } invalid services`
        );
      }
    }

    console.log(`\n✨ Migration complete! Migrated ${migratedCount} bookings`);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

migrateServiceReferences();

import Notification from "../models/Notification.js";

export async function createNotification({
  userId,
  bookingId = null,
  type,
  title,
  message,
  eventKey = null,
}) {
  if (!userId || !type || !title || !message) return null;

  if (eventKey) {
    return Notification.findOneAndUpdate(
      { event_key: eventKey },
      {
        user_id: userId,
        booking_id: bookingId,
        type,
        title,
        message,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  return Notification.create({
    user_id: userId,
    booking_id: bookingId,
    type,
    title,
    message,
  });
}

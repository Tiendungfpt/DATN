import axios from "axios";

const BASE = "/api/room-types/availability";

export async function fetchRoomTypeAvailability(params = {}) {
  const res = await axios.get(BASE, { params });
  return Array.isArray(res.data?.items) ? res.data.items : [];
}

export async function fetchRoomTypeCatalog() {
  const res = await axios.get("/api/room-types");
  return Array.isArray(res.data) ? res.data : [];
}

export function normalizeTypeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

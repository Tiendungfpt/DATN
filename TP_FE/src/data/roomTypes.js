/**
 * Loại phòng hiển thị công khai (trang chủ + lọc /dat-phong).
 * key phải khớp ROOM_TYPE_KEYWORDS ở backend (TP_BE/src/utils/roomSearch.js).
 */
export const PUBLIC_ROOM_TYPES = [
  {
    key: "tieu-chuan",
    name: "Phòng Tiêu Chuẩn",
    price: 520000,
    image:
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=900&q=80",
    desc: "Không gian gọn gàng, đầy đủ tiện nghi cơ bản cho công tác và nghỉ ngắn ngày.",
  },
  {
    key: "cao-cap-2-don",
    name: "Phòng Cao cấp-2 giường đơn",
    price: 650000,
    image:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
    desc: "Hai giường đơn riêng — phù hợp đồng nghiệp, bạn đồng hành hoặc gia đình nhỏ.",
  },
  {
    key: "cao-cap-queen",
    name: "Phòng Cao cấp-1 giường Queen",
    price: 720000,
    image:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80",
    desc: "Giường Queen rộng rãi, phòng yên tĩnh — lý tưởng cho cặp đôi.",
  },
  {
    key: "sang-trong",
    name: "Phòng Sang Trọng",
    price: 980000,
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
    desc: "Nội thất cao cấp, không gian thoáng — trải nghiệm nghỉ dưỡng đẳng cấp.",
  },
  {
    key: "family-suite",
    name: "Family Suite",
    price: 1350000,
    image:
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80",
    desc: "Suite rộng cho cả gia đình — khu tiếp khách và phòng ngủ riêng biệt.",
  },
];

export function getRoomTypeLabel(key) {
  if (!key) return "";
  const found = PUBLIC_ROOM_TYPES.find((r) => r.key === key);
  return found ? found.name : key;
}

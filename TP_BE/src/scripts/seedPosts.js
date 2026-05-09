import dotenv from "dotenv";
import mongoose from "mongoose";
import Post from "../models/Post.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/thinhphathotel";

const samplePosts = [
  {
    title: "7 kinh nghiệm đặt phòng khách sạn tiết kiệm mà vẫn chất lượng",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80",
    content: `Đặt phòng đúng thời điểm giúp bạn tiết kiệm đáng kể chi phí lưu trú.

Bạn nên so sánh giá giữa ngày thường và cuối tuần vì mức chênh lệch có thể lên đến 20-30%.

Hãy ưu tiên các khách sạn có chính sách hủy linh hoạt để chủ động khi lịch trình thay đổi.

Đừng chỉ nhìn giá phòng cơ bản, cần kiểm tra thêm phụ phí và dịch vụ đi kèm để tối ưu tổng chi phí.`,
    isPublished: true,
  },
  {
    title: "Checklist tiện nghi cần kiểm tra trước khi nhận phòng",
    image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80",
    content: `Khi vừa nhận phòng, bạn nên kiểm tra nhanh điều hòa, nước nóng, két sắt và kết nối wifi.

Nếu đi cùng gia đình, hãy xác nhận lại số giường, bộ đồ dùng cá nhân và khu vực an toàn cho trẻ nhỏ.

Việc báo lễ tân sớm khi phát hiện vấn đề giúp khách sạn hỗ trợ đổi phòng nhanh hơn.

Một checklist ngắn ngay lúc check-in sẽ giúp kỳ nghỉ thoải mái và tránh phát sinh không mong muốn.`,
    isPublished: true,
  },
  {
    title: "Gợi ý lịch trình 2 ngày 1 đêm cho kỳ nghỉ cuối tuần tại Hà Nội",
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80",
    content: `Ngày đầu tiên phù hợp để check-in sớm, nghỉ ngơi nhẹ và khám phá ẩm thực quanh khu vực khách sạn.

Buổi tối nên dành thời gian cho các điểm tham quan trung tâm và trải nghiệm cà phê rooftop.

Ngày thứ hai, hãy tận hưởng bữa sáng thong thả rồi tham quan các điểm văn hóa gần đó.

Lịch trình ngắn nhưng hợp lý sẽ giúp bạn vừa thư giãn vừa có trải nghiệm đáng nhớ.`,
    isPublished: true,
  },
  {
    title: "Cách chọn hạng phòng phù hợp cho cặp đôi và gia đình",
    image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=80",
    content: `Với cặp đôi, ưu tiên phòng có view đẹp, không gian riêng tư và dịch vụ đi kèm như bữa sáng.

Với gia đình, nên chọn hạng phòng có diện tích rộng, sức chứa tốt và tiện nghi miễn phí đa dạng.

Nếu đi cùng người lớn tuổi, hãy ưu tiên phòng gần thang máy và hạn chế nhiều bậc thềm.

Chọn đúng hạng phòng ngay từ đầu giúp trải nghiệm lưu trú trọn vẹn hơn.`,
    isPublished: true,
  },
  {
    title: "Những sai lầm thường gặp khi đặt phòng online và cách tránh",
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80",
    content: `Sai lầm phổ biến là đặt phòng chỉ dựa vào hình ảnh mà không đọc kỹ mô tả và chính sách.

Bạn cần kiểm tra rõ thời gian nhận-trả phòng, điều kiện hoàn hủy và phụ thu số lượng khách.

Ngoài ra, nên xem đánh giá gần đây để nắm tình trạng dịch vụ thực tế tại thời điểm đặt.

Chuẩn bị kỹ thông tin trước khi thanh toán giúp bạn hạn chế rủi ro và tiết kiệm thời gian xử lý.`,
    isPublished: true,
  },
];

async function main() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  let created = 0;
  let updated = 0;

  for (const post of samplePosts) {
    const existing = await Post.findOne({ title: post.title });
    if (existing) {
      await Post.updateOne({ _id: existing._id }, { $set: post });
      updated += 1;
    } else {
      await Post.create(post);
      created += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        total_input: samplePosts.length,
        created,
        updated,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect error
    }
    process.exit(1);
  });

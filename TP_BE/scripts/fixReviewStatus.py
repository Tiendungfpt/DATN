path = r"d:\DATN\DATN\TP_BE\src\controllers\review.js"
text = open(path, encoding="utf-8").read()
old = """    // ch�� completed mới review
    if (booking.status !== "completed") {
      return res.status(400).json({
        message: "Ch�� đánh giá sau khi checkout",
      });
    }
"""
new = """    const done = booking.status === "checked_out" || booking.status === "completed";
    if (!done) {
      return res.status(400).json({
        message: "Ch�� đánh giá sau khi checkout",
      });
    }
"""
if old not in text:
    raise SystemExit("pattern not found")
open(path, "w", encoding="utf-8").write(text.replace(old, new, 1))
print("ok")

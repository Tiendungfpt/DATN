path = r"d:\DATN\DATN\TP_BE\src\controllers\booking.js"
lines = open(path, encoding="utf-8").read().splitlines(keepends=True)
for i, line in enumerate(lines):
    if 'type: "checked_out"' in line:
        for j in range(i, min(i + 8, len(lines))):
            if "message:" in lines[j] and "grand" in lines[j]:
                indent = lines[j][: len(lines[j]) - len(lines[j].lstrip())]
                lines[j] = (
                    indent
                    + "message: `Booking #${String(booking._id).slice(-6).toUpperCase()} checked out. Total: ${grand} VND.`,\n"
                )
                break
        break
open(path, "w", encoding="utf-8").writelines(lines)
print("ok")

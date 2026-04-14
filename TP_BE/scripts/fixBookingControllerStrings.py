# -*- coding: utf-8 -*-
path = r"d:\DATN\DATN\TP_BE\src\controllers\booking.js"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

out = []
skip_next = 0
for i, line in enumerate(lines):
    if skip_next:
        skip_next -= 1
        continue
    if "Đặt cọc:" in line or ("cọc:" in line and "tiền phải" in line):
        indent = line[: len(line) - len(line.lstrip())]
        out.append(
            f'{indent}message: "Deposit: amount must be > 0 and < estimated room total",\n'
        )
        continue
    if (
        "return res.status(400).json({ message:" in line
        and "checkout" in line
        and "checked_in" in line
        and "Checkout preview" not in line
    ):
        indent = line[: len(line) - len(line.lstrip())]
        out.append(f"{indent}return res.status(400).json({{\n")
        out.append(f'{indent}  message: "Checkout preview only when checked_in",\n')
        out.append(f"{indent}}});\n")
        continue
    out.append(line)

with open(path, "w", encoding="utf-8") as f:
    f.writelines(out)
print("patched lines", len(lines))

import Joi from "joi";

const schema = Joi.object({
  name: Joi.string().required(),
  age: Joi.number().required().min(0).messages({
    "number.min": "Age không được âm",
  }),
});

const data = { name: 11, age: -1, abc: "dd" };

const { error, value } = schema.validate(data, { abortEarly: false }); //value: data, error: thong bao loi: ko loi -> undefined, error.details

if (error) {
  //error.details : Array ({ message, path, type, context})
  console.log(
    "Dữ liệu không hợp lệ:",
    error.details.map((err) => err.message)
  ); // Nếu có lỗi, in chi tiết lỗi ra console
} else {
  console.log("Dữ liệu hợp lệ:", value); // Nếu dữ liệu hợp lệ, in dữ liệu đã được validate
}

// ----------------------------------

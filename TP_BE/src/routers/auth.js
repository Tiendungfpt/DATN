// import { Router } from "express";
// import { getProfileUser, loginUser, registerUser } from "../controllers/auth";
// import { checkAuth } from "../middlewares/checkAuth";

// const authRouter = Router();

// // POST api/auth
// authRouter.post("/register", registerUser);
// authRouter.post("/login", loginUser);
// //GET api/auth/profile
// authRouter.get("/profile", checkAuth, getProfileUser);

// export default authRouter;
import { Router } from "express";
import { getProfileUser, loginUser, registerUser } from "../controllers/auth.js";
import { checkAuth } from "../middlewares/checkAuth.js";
import { updateRole } from "../controllers/auth.js";

const authRouter = Router();

// POST api/auth/register
authRouter.post("/register", registerUser);

// POST api/auth/login
authRouter.post("/login", loginUser);

// GET api/auth/profile
authRouter.get("/profile", checkAuth, getProfileUser);

authRouter.put("/:id", updateRole);

export default authRouter;

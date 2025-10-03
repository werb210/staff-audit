import { Router } from "express";
import contacts from "./contacts";
import lenderProducts from "./lenderProducts";
import pipeline from "./pipeline";
import applications from "./applications";

const staffRouter = Router();
staffRouter.use(contacts);
staffRouter.use(lenderProducts);
staffRouter.use(pipeline);
staffRouter.use(applications);

export default staffRouter;
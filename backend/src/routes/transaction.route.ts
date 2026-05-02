// import { Router } from "express"
// import { bulkDeleteTransactionController, createTransactionController, deleteTransactionController, duplicateTransactionController, getAllTransactionController, getTransactionByIdController } from "../controllers/transaction.controller";


// const transactionRouter = Router();

// transactionRouter.post('/create', createTransactionController);
// transactionRouter.get('/all', getAllTransactionController);
// transactionRouter.get('/:id', getTransactionByIdController);
// transactionRouter.put("/duplicate/:id", duplicateTransactionController);
// transactionRouter.delete("/bulk-delete", bulkDeleteTransactionController);
// transactionRouter.delete("/delete/:id", deleteTransactionController);

// export default transactionRouter;


import { Router } from "express";
import {
  bulkDeleteTransactionController,
  bulkTransactionController,
  createTransactionController,
  deleteTransactionController,
  duplicateTransactionController,
  getAllTransactionController,
  getTransactionByIdController,
  scanReceiptController,
  updateTransactionController,
} from "../controllers/transaction.controller";
import { upload } from "../config/cloudinary.config";

const transactionRoutes = Router();

transactionRoutes.post("/create", createTransactionController);

transactionRoutes.post(
  "/scan-receipt",
  upload.single("receipt"),
  scanReceiptController
);

transactionRoutes.post("/bulk-transaction", bulkTransactionController);

transactionRoutes.put("/duplicate/:id", duplicateTransactionController);
transactionRoutes.put("/update/:id", updateTransactionController);

transactionRoutes.get("/all", getAllTransactionController);
transactionRoutes.get("/:id", getTransactionByIdController);
transactionRoutes.delete("/delete/:id", deleteTransactionController);
transactionRoutes.delete("/bulk-delete", bulkDeleteTransactionController);

export default transactionRoutes;
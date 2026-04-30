import { Router } from "express"
import { bulkDeleteTransactionController, createTransactionController, deleteTransactionController, duplicateTransactionController, getAllTransactionController, getTransactionByIdController } from "../controllers/transaction.controller";


const transactionRouter = Router();



transactionRouter.post('/create', createTransactionController);
transactionRouter.get('/all', getAllTransactionController);
transactionRouter.get('/:id', getTransactionByIdController);
transactionRouter.get("/duplicate/:id", duplicateTransactionController);
transactionRouter.delete("/bulk-delete", bulkDeleteTransactionController);
transactionRouter.delete("/delete/:id", deleteTransactionController);

export default transactionRouter;
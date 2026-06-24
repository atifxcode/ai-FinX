import axios from "axios";
import TransactionModel, {
  TransactionTypeEnum,
} from "../models/transaction.model";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import { calculateNextOccurrence } from "../utils/helper";
import { CreateTransactionType, UpdateTransactionType } from "../validators/transaction.validator";
import { genAI, genAIModel } from "../config/google-ai-config";
import { createPartFromBase64, createUserContent } from "@google/genai";
import { receiptPrompt } from "../utils/prompt";

export const createTransactionService = async (
  body: CreateTransactionType,
  userId: string,
) => {
  let nextRecurringDate: Date | undefined;
  const currentDate = new Date();

  if (body.isRecurring && body.recurringInterval) {
    const calulatedDate = calculateNextOccurrence(
      body.date,
      body.recurringInterval,
    );

    nextRecurringDate =
      calulatedDate < currentDate
        ? calculateNextOccurrence(currentDate, body.recurringInterval)
        : calulatedDate;
  }

  const transaction = await TransactionModel.create({
    ...body,
    userId,
    category: body.category,
    amount: Number(body.amount),
    isRecurring: body.isRecurring || false,
    recurringInterval: body.recurringInterval || null,
    nextRecurringDate,
    lastProcessed: null,
  });

  return transaction;
};

export const getAllTransactionService = async (
  userId: string,
  filters: {
    keyword?: string;
    type?: keyof typeof TransactionTypeEnum;
    recurringStatus?: "RECURRING" | "NON_RECURRING";
  },
  pagination: {
    pageSize: number;
    pageNumber: number;
  },
) => {
  const { keyword, type, recurringStatus } = filters;

  const filterConditions: Record<string, any> = {
    userId,
  };

  if (keyword) {
    filterConditions.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { category: { $regex: keyword, $options: "i" } },
    ];
  }

  if (type) {
    filterConditions.type = type;
  }

  if (recurringStatus) {
    if (recurringStatus === "RECURRING") {
      filterConditions.isRecurring = true;
    } else if (recurringStatus === "NON_RECURRING") {
      filterConditions.isRecurring = false;
    }
  }

  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [transations, totalCount] = await Promise.all([
    TransactionModel.find(filterConditions)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 }),
    TransactionModel.countDocuments(filterConditions),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    transations,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};



export const getTransactionByIdService = async (
  userId: string,
  transactionId: string
) => {
  const transaction = await TransactionModel.findOne({
    _id: transactionId,
    userId,
  });
  if (!transaction) throw new NotFoundException("Transaction not found");

  return transaction;
};



export const duplicateTransactionService = async (
  userId: string,
  transactionId: string
) => {
  const transaction = await TransactionModel.findOne({
    _id: transactionId,
    userId,
  });
  if (!transaction) throw new NotFoundException("Transaction not found");

  const duplicated = await TransactionModel.create({
    ...transaction.toObject(),
    _id: undefined,
    title: `Duplicate - ${transaction.title}`,
    description: transaction.description
      ? `${transaction.description} (Duplicate)`
      : "Duplicated transaction",
    isRecurring: false,
    recurringInterval: undefined,
    nextRecurringDate: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  });

  return duplicated;
};

export const updateTransactionService = async (
  userId: string,
  transactionId: string,
  body: UpdateTransactionType
) => {
  const existingTransaction = await TransactionModel.findOne({
    _id: transactionId,
    userId,
  });
  if (!existingTransaction)
    throw new NotFoundException("Transaction not found");

  const now = new Date();
  const isRecurring = body.isRecurring ?? existingTransaction.isRecurring;

  const date =
    body.date !== undefined ? new Date(body.date) : existingTransaction.date;

  const recurringInterval =
    body.recurringInterval || existingTransaction.recurringInterval;

  let nextRecurringDate: Date | undefined;

  if (isRecurring && recurringInterval) {
    const calulatedDate = calculateNextOccurrence(date, recurringInterval);

    nextRecurringDate =
      calulatedDate < now
        ? calculateNextOccurrence(now, recurringInterval)
        : calulatedDate;
  }

  existingTransaction.set({
    ...(body.title && { title: body.title }),
    ...(body.description && { description: body.description }),
    ...(body.category && { category: body.category }),
    ...(body.type && { type: body.type }),
    ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
    ...(body.amount !== undefined && { amount: Number(body.amount) }),
    date,
    isRecurring,
    recurringInterval,
    nextRecurringDate,
  });

  await existingTransaction.save();

  return;
};

export const deleteTransactionService = async (
  userId: string,
  transactionId: string
) => {
  const deleted = await TransactionModel.findByIdAndDelete({
    _id: transactionId,
    userId,
  });
  if (!deleted) throw new NotFoundException("Transaction not found");

  return;
};

export const bulkDeleteTransactionService = async (
  userId: string,
  transactionIds: string[]
) => {
  const result = await TransactionModel.deleteMany({
    _id: { $in: transactionIds },
    userId,
  });

  if (result.deletedCount === 0)
    throw new NotFoundException("No transations found");

  return {
    sucess: true,
    deletedCount: result.deletedCount,
  };
};

export const bulkTransactionService = async (
  userId: string,
  transactions: CreateTransactionType[]
) => {
  try {
    const bulkOps = transactions.map((tx) => ({
      insertOne: {
        document: {
          ...tx,
          userId,
          isRecurring: false,
          nextRecurringDate: null,
          recurringInterval: null,
          lastProcesses: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    }));

    const result = await TransactionModel.bulkWrite(bulkOps, {
      ordered: true,
    });

    return {
      insertedCount: result.insertedCount,
      success: true,
    };
  } catch (error) {
    throw error;
  }
};




export const scanReceiptService = async (file: Express.Multer.File | undefined) => {
  if (!file) throw new BadRequestException("No file uploaded");

  try {
    if (!file.path) throw new BadRequestException("Failed to upload file");

    console.log("Fetching image from:", file.path);

    // Add retry logic
    let responseData: { data: Buffer } | undefined;
    let retries = 3;
    
    while (retries > 0) {
      try {
        responseData = await axios.get(file.path, {
          responseType: "arraybuffer",
          timeout: 15000, // 15 second timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          },
          // For self-signed certificates in development
          httpsAgent: process.env.NODE_ENV === 'development' 
            ? new (require('https').Agent)({ rejectUnauthorized: false })
            : undefined,
        });
        break; // Success, exit retry loop
      } catch (err: unknown) {
        retries--;
        console.log(`Retry ${3 - retries} failed. Retries left: ${retries}`);
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    // ✅ Fix: Check if responseData exists
    if (!responseData || !responseData.data) {
      throw new BadRequestException("Failed to fetch image from Cloudinary");
    }

    const base64String = Buffer.from(responseData.data).toString("base64");

    if (!base64String) throw new BadRequestException("Could not process file");

    const result = await genAI.models.generateContent({
      model: genAIModel,
      contents: [
        createUserContent([
          receiptPrompt,
          createPartFromBase64(base64String, file.mimetype),
        ]),
      ],
      config: {
        temperature: 0,
        topP: 1,
        responseMimeType: "application/json",
      },
    });

    const response = result.text;
    const cleanedText = response?.replace(/```(?:json)?\n?/g, "").trim();

    if (!cleanedText) {
      throw new BadRequestException("Could not read receipt content");
    }

    const data = JSON.parse(cleanedText);

    if (!data.amount || !data.date) {
      throw new BadRequestException("Receipt missing required information");
    }

    return {
      title: data.title || "Receipt",
      amount: data.amount,
      date: data.date,
      description: data.description,
      category: data.category,
      paymentMethod: data.paymentMethod,
      type: data.type,
      receiptUrl: file.path,
    };
  } catch (error: unknown) {  // ✅ Fix: Type annotation for error
    console.error("Detailed error:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error && (error as any).code ? (error as any).code : undefined,
      status: error instanceof Error && (error as any).response?.status ? (error as any).response.status : undefined,
      statusText: error instanceof Error && (error as any).response?.statusText ? (error as any).response.statusText : undefined,
      url: file?.path,
    });
    
    // ✅ Fix: Proper error handling with type checking
    if (error instanceof BadRequestException) {
      throw error;
    }
    
    if (error instanceof Error) {
      throw new BadRequestException(`Receipt scanning failed: ${error.message}`);
    }
    
    throw new BadRequestException("Receipt scanning service unavailable");
  }
};
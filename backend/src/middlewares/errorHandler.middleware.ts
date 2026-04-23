import { ErrorRequestHandler } from "express";
import { HTTPSTATUS } from "../config/http.config";
import { AppError } from "../utils/app-error";

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next,
): any => {
  console.log("Error occured on PATH: ", req.path);

//   if (error instanceof MulterError) {
//     const { status, message, error: err } = handleMulterError(error);
//     return res.status(status).json({
//       message,
//       error: err,
//       errorCode: ErrorCodeEnum.FILE_UPLOAD_ERROR,
//     });
//   }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errorCode: error.errorCode,
    });
  }

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    error: error?.message || "Unknow error occurred",
  });
};

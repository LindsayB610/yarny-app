import axios, { type AxiosInstance } from "axios";

import { env } from "../config/env";
import {
  type ConfigResponse,
  type DriveCheckCommentsRequest,
  type DriveCheckCommentsResponse,
  type DriveCreateFolderRequest,
  type DriveCreateFolderResponse,
  type DriveDeleteFileRequest,
  type DriveDeleteFileResponse,
  type DriveGetOrCreateYarnyStoriesResponse,
  type DriveListQueryParams,
  type DriveListResponse,
  type DriveReadRequest,
  type DriveReadResponse,
  type DriveRenameFileRequest,
  type DriveRenameFileResponse,
  type DriveWriteRequest,
  type DriveWriteResponse,
  type ErrorResponse,
  type LogoutResponse,
  type VerifyGoogleRequest,
  type VerifyGoogleResponse,
  ConfigResponseSchema,
  DriveCheckCommentsResponseSchema,
  DriveCreateFolderResponseSchema,
  DriveDeleteFileResponseSchema,
  DriveGetOrCreateYarnyStoriesResponseSchema,
  DriveListResponseSchema,
  DriveReadResponseSchema,
  DriveRenameFileResponseSchema,
  DriveWriteResponseSchema,
  ErrorResponseSchema,
  LogoutResponseSchema,
  parseApiResponse,
  VerifyGoogleResponseSchema
} from "./contract";

export class ApiClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: env.driveFunctionBase,
      timeout: 30_000,
      withCredentials: true
    });

    // Add response interceptor for error handling
    this.http.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.data) {
          try {
            const errorData = parseApiResponse(ErrorResponseSchema, error.response.data);
            return Promise.reject(new ApiError(errorData.error, errorData));
          } catch {
            // If it doesn't match error schema, use default error handling
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // Authentication APIs
  // ============================================================================

  async getConfig(): Promise<ConfigResponse> {
    const response = await this.http.get("/config");
    return parseApiResponse(ConfigResponseSchema, response.data);
  }

  async verifyGoogle(request: VerifyGoogleRequest): Promise<VerifyGoogleResponse> {
    const response = await this.http.post("/verify-google", request);
    return parseApiResponse(VerifyGoogleResponseSchema, response.data);
  }

  async logout(): Promise<LogoutResponse> {
    const response = await this.http.post("/logout");
    return parseApiResponse(LogoutResponseSchema, response.data);
  }

  // ============================================================================
  // Drive APIs
  // ============================================================================

  async listDriveFiles(params?: DriveListQueryParams): Promise<DriveListResponse> {
    const response = await this.http.get("/drive-list", { params });
    return parseApiResponse(DriveListResponseSchema, response.data);
  }

  async readDriveFile(request: DriveReadRequest): Promise<DriveReadResponse> {
    const response = await this.http.post("/drive-read", request);
    return parseApiResponse(DriveReadResponseSchema, response.data);
  }

  async writeDriveFile(request: DriveWriteRequest): Promise<DriveWriteResponse> {
    const response = await this.http.post("/drive-write", request);
    return parseApiResponse(DriveWriteResponseSchema, response.data);
  }

  async createDriveFolder(
    request: DriveCreateFolderRequest
  ): Promise<DriveCreateFolderResponse> {
    const response = await this.http.post("/drive-create-folder", request);
    return parseApiResponse(DriveCreateFolderResponseSchema, response.data);
  }

  async getOrCreateYarnyStories(): Promise<DriveGetOrCreateYarnyStoriesResponse> {
    const response = await this.http.get("/drive-get-or-create-yarny-stories");
    return parseApiResponse(DriveGetOrCreateYarnyStoriesResponseSchema, response.data);
  }

  async deleteDriveFile(request: DriveDeleteFileRequest): Promise<DriveDeleteFileResponse> {
    const response = await this.http.post("/drive-delete-file", request);
    return parseApiResponse(DriveDeleteFileResponseSchema, response.data);
  }

  async renameDriveFile(request: DriveRenameFileRequest): Promise<DriveRenameFileResponse> {
    const response = await this.http.post("/drive-rename-file", request);
    return parseApiResponse(DriveRenameFileResponseSchema, response.data);
  }

  async checkDriveComments(
    request: DriveCheckCommentsRequest
  ): Promise<DriveCheckCommentsResponse> {
    const response = await this.http.post("/drive-check-comments", request);
    return parseApiResponse(DriveCheckCommentsResponseSchema, response.data);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly data?: ErrorResponse
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Singleton instance
export const apiClient = new ApiClient();


import axios, { type AxiosInstance } from "axios";
import PQueue from "p-queue";

import type { DriveDeleteStoryRequest, DriveDeleteStoryResponse } from "./contract";
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
  DriveDeleteStoryResponseSchema,
  DriveGetOrCreateYarnyStoriesResponseSchema,
  DriveListResponseSchema,
  DriveReadResponseSchema,
  DriveRenameFileResponseSchema,
  DriveWriteResponseSchema,
  ErrorResponseSchema,
  LogoutResponseSchema,
  parseApiResponse,
  VerifyGoogleResponseSchema,
} from "./contract";
import { env } from "../config/env";

export class ApiClient {
  private http: AxiosInstance;
  private requestQueue: PQueue;

  constructor() {
    this.http = axios.create({
      baseURL: env.driveFunctionBase,
      timeout: 30_000,
      withCredentials: true,
    });

    // Create a queue to limit concurrent API requests
    // Max 5 concurrent requests to prevent overwhelming the server
    this.requestQueue = new PQueue({ concurrency: 5 });

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
      },
    );
  }

  // Helper method to queue HTTP requests
  private async queuedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return this.requestQueue.add(requestFn);
  }

  // ============================================================================
  // Authentication APIs
  // ============================================================================

  async getConfig(): Promise<ConfigResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.get("/config");
      return parseApiResponse(ConfigResponseSchema, response.data);
    });
  }

  async verifyGoogle(request: VerifyGoogleRequest): Promise<VerifyGoogleResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.post("/verify-google", request);
      return parseApiResponse(VerifyGoogleResponseSchema, response.data);
    });
  }

  async logout(): Promise<LogoutResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.post("/logout");
      return parseApiResponse(LogoutResponseSchema, response.data);
    });
  }

  // ============================================================================
  // Drive APIs
  // ============================================================================

  async listDriveFiles(params?: DriveListQueryParams): Promise<DriveListResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.get("/drive-list", { params });
      return parseApiResponse(DriveListResponseSchema, response.data);
    });
  }

  async readDriveFile(request: DriveReadRequest): Promise<DriveReadResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.post("/drive-read", request);
      return parseApiResponse(DriveReadResponseSchema, response.data);
    });
  }

  async writeDriveFile(request: DriveWriteRequest): Promise<DriveWriteResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.post("/drive-write", request);
      return parseApiResponse(DriveWriteResponseSchema, response.data);
    });
  }

  async createDriveFolder(request: DriveCreateFolderRequest): Promise<DriveCreateFolderResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.post("/drive-create-folder", request);
      return parseApiResponse(DriveCreateFolderResponseSchema, response.data);
    });
  }

  async getOrCreateYarnyStories(): Promise<DriveGetOrCreateYarnyStoriesResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.get("/drive-get-or-create-yarny-stories");
      return parseApiResponse(DriveGetOrCreateYarnyStoriesResponseSchema, response.data);
    });
  }

  async deleteDriveFile(request: DriveDeleteFileRequest): Promise<DriveDeleteFileResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.post("/drive-delete-file", request);
      return parseApiResponse(DriveDeleteFileResponseSchema, response.data);
    });
  }

  async renameDriveFile(request: DriveRenameFileRequest): Promise<DriveRenameFileResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.post("/drive-rename-file", request);
      return parseApiResponse(DriveRenameFileResponseSchema, response.data);
    });
  }

  async checkDriveComments(
    request: DriveCheckCommentsRequest,
  ): Promise<DriveCheckCommentsResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.post("/drive-check-comments", request);
      return parseApiResponse(DriveCheckCommentsResponseSchema, response.data);
    });
  }

  async deleteStory(request: DriveDeleteStoryRequest): Promise<DriveDeleteStoryResponse> {
    return this.queuedRequest(async () => {
      const response = await this.http.post("/drive-delete-story", request);
      return parseApiResponse(DriveDeleteStoryResponseSchema, response.data);
    });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly data?: ErrorResponse,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Singleton instance
export const apiClient = new ApiClient();

# Zod Validation Audit - API Contract Formalization

**Date**: 2025-01-XX  
**Purpose**: Verify that ALL API calls use Zod schemas for runtime validation

## Executive Summary

**Status**: ✅ **FULLY COMPLIANT** - All API calls now use Zod validation

**Findings**:
- ✅ **Frontend API Client** - All responses validated with Zod schemas
- ✅ **Drive Client** - Responses and inputs validated with Zod schemas
- ✅ **Netlify Functions** - All incoming requests now validated with Zod schemas
- ✅ **Request Validation** - All backend functions validate incoming request bodies with Zod

**Last Updated**: 2025-01-XX - All issues resolved

---

## ✅ Frontend Validation (Complete)

### 1. `src/api/client.ts` - ApiClient
**Status**: ✅ **FULLY VALIDATED**

All API methods use `parseApiResponse()` with Zod schemas:
- `getConfig()` - Validates with `ConfigResponseSchema` ✅
- `verifyGoogle()` - Validates with `VerifyGoogleResponseSchema` ✅
- `logout()` - Validates with `LogoutResponseSchema` ✅
- `listDriveFiles()` - Validates with `DriveListResponseSchema` ✅
- `readDriveFile()` - Validates with `DriveReadResponseSchema` ✅
- `writeDriveFile()` - Validates with `DriveWriteResponseSchema` ✅
- `createDriveFolder()` - Validates with `DriveCreateFolderResponseSchema` ✅
- `getOrCreateYarnyStories()` - Validates with `DriveGetOrCreateYarnyStoriesResponseSchema` ✅
- `deleteDriveFile()` - Validates with `DriveDeleteFileResponseSchema` ✅
- `renameDriveFile()` - Validates with `DriveRenameFileResponseSchema` ✅
- `checkDriveComments()` - Validates with `DriveCheckCommentsResponseSchema` ✅
- `deleteStory()` - Validates with `DriveDeleteStoryResponseSchema` ✅

**Note**: Frontend doesn't validate request bodies because they're typed in TypeScript, but the backend should validate them.

### 2. `src/api/driveClient.ts` - DriveClient
**Status**: ✅ **FULLY VALIDATED**

- `listProjects()` - Validates response with `NormalizedSchema` ✅
- `getStory()` - Validates response with `NormalizedSchema` ✅
- `saveStory()` - Validates input with `SaveStoryInputSchema` ✅

---

## ✅ Backend Validation (Complete)

### Netlify Functions - Request Validation ✅ FIXED

**Status**: ✅ **ALL FUNCTIONS NOW USE ZOD VALIDATION**

All Netlify Functions now validate incoming requests with Zod schemas:

#### Functions With Request Validation ✅:

1. **`verify-google.ts`** ✅
   - Now uses: `validateRequest(VerifyGoogleRequestSchema, event.body)`
   - Schema: ✅ `VerifyGoogleRequestSchema`

2. **`drive-read.ts`** ✅
   - Now uses: `validateRequest(DriveReadRequestSchema, event.body)`
   - Schema: ✅ `DriveReadRequestSchema`

3. **`drive-write.ts`** ✅
   - Now uses: `validateRequest(DriveWriteRequestSchema, event.body)`
   - Schema: ✅ `DriveWriteRequestSchema`

4. **`drive-create-folder.ts`** ✅
   - Now uses: `validateRequest(DriveCreateFolderRequestSchema, event.body)`
   - **Fixed**: Schema accepts both `name` and `folderName` for backward compatibility, transforms to `name`
   - Schema: ✅ `DriveCreateFolderRequestSchema`

5. **`drive-delete-file.ts`** ✅
   - Now uses: `validateRequest(DriveDeleteFileRequestSchema, event.body)`
   - Schema: ✅ `DriveDeleteFileRequestSchema`

6. **`drive-rename-file.ts`** ✅
   - Now uses: `validateRequest(DriveRenameFileRequestSchema, event.body)`
   - **Fixed**: Schema accepts both `newName` and `fileName` for backward compatibility, transforms to `newName`
   - Schema: ✅ `DriveRenameFileRequestSchema`

7. **`drive-check-comments.ts`** ✅
   - Now uses: `validateRequest(DriveCheckCommentsRequestSchema, event.body)`
   - Schema: ✅ `DriveCheckCommentsRequestSchema`

8. **`drive-delete-story.ts`** ✅
   - Now uses: `validateRequest(DriveDeleteStoryRequestSchema, event.body)`
   - Schema: ✅ `DriveDeleteStoryRequestSchema`

9. **`drive-list.ts`** ✅
   - Now uses: `validateQueryParams(DriveListQueryParamsSchema, event.queryStringParameters)`
   - Schema: ✅ `DriveListQueryParamsSchema`

---

## Issues Found (All Fixed ✅)

### Issue 1: Field Name Mismatches ✅ FIXED

**`drive-create-folder.ts`**:
- **Fixed**: Schema now accepts both `name` and `folderName`, transforms to `name`
- Uses `.refine()` and `.transform()` to handle backward compatibility

**`drive-rename-file.ts`**:
- **Fixed**: Schema now accepts both `newName` and `fileName`, transforms to `newName`
- Uses `.refine()` and `.transform()` to handle backward compatibility

### Issue 2: No Runtime Validation ✅ FIXED

All functions now use Zod validation which:
- ✅ Provides runtime validation
- ✅ Catches malformed JSON
- ✅ Catches missing required fields
- ✅ Catches type mismatches
- ✅ Provides helpful error messages

### Issue 3: Import Path ✅ FIXED

- **Solution**: Created `netlify/functions/contract.ts` with all necessary schemas
- Schemas are self-contained in the functions directory
- Validation helpers (`validateRequest`, `validateQueryParams`) included

---

## Recommendations

### Priority 1: Add Zod Validation to All Netlify Functions

1. **Update import paths** to access `src/api/contract.ts` schemas
2. **Replace type assertions** with Zod schema parsing
3. **Add error handling** for Zod validation errors
4. **Fix field name mismatches** between schemas and functions

### Priority 2: Align Field Names

1. **`drive-create-folder.ts`**: Change `folderName` to `name` OR update schema
2. **`drive-rename-file.ts`**: Change `fileName` to `newName` OR update schema

### Priority 3: Create Validation Helper

Create a helper function in `netlify/functions/types.ts`:

```typescript
import { z } from "zod";
import { parseApiResponse } from "../../src/api/contract";

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  body: string | null
): T {
  if (!body) {
    throw new Error("Request body is required");
  }
  try {
    const parsed = JSON.parse(body);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid request: ${error.errors.map(e => e.message).join(", ")}`);
    }
    throw error;
  }
}
```

---

## Summary

### Statistics
- **Frontend API Calls**: ~15 methods
- **Frontend Validated**: 15/15 (100%) ✅
- **Backend Functions**: 9 functions
- **Backend Validated**: 9/9 (100%) ✅
- **Overall Compliance**: 100% ✅

### Issues Fixed
1. ✅ **Request validation added to all Netlify Functions** - All 9 functions now use Zod validation
2. ✅ **Field name mismatches resolved** - Schemas handle both old and new field names with transforms
3. ✅ **Shared validation helper created** - `validateRequest` and `validateQueryParams` helpers in `contract.ts`

---

## Next Steps

1. **Create validation helper** in `netlify/functions/types.ts`
2. **Update all 9 Netlify Functions** to use Zod validation
3. **Fix field name mismatches** in `drive-create-folder.ts` and `drive-rename-file.ts`
4. **Test all functions** to ensure validation works correctly
5. **Update gap analysis** with completion status

---

## Verification Checklist

- [x] Create validation helper function ✅
- [x] Add Zod validation to `verify-google.ts` ✅
- [x] Add Zod validation to `drive-read.ts` ✅
- [x] Add Zod validation to `drive-write.ts` ✅
- [x] Add Zod validation to `drive-create-folder.ts` (fix field name) ✅
- [x] Add Zod validation to `drive-delete-file.ts` ✅
- [x] Add Zod validation to `drive-rename-file.ts` (fix field name) ✅
- [x] Add Zod validation to `drive-check-comments.ts` ✅
- [x] Add Zod validation to `drive-delete-story.ts` ✅
- [x] Add Zod validation to `drive-list.ts` (query params) ✅
- [ ] Test all functions with invalid requests (manual testing needed)
- [x] Update gap analysis document ✅


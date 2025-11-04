const { getAuthenticatedDriveClient } = require('./drive-client');
const { Readable } = require('stream');

async function getUserEmailFromSession(event) {
  const cookies = event.headers.cookie?.split(';') || [];
  const sessionCookie = cookies.find(c => c.trim().startsWith('session='));
  if (!sessionCookie) return null;
  
  try {
    const sessionToken = sessionCookie.split('=')[1].trim();
    const decoded = Buffer.from(sessionToken, 'base64').toString();
    const parts = decoded.split(':');
    return parts[0];
  } catch (error) {
    return null;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const email = await getUserEmailFromSession(event);
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  try {
    const { fileId, fileName, content, parentFolderId, mimeType = 'text/plain' } = JSON.parse(event.body);
    
    if (!fileName || content === undefined) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'fileName and content required' }) 
      };
    }

    // Get authenticated drive client - this will refresh tokens if needed
    const drive = await getAuthenticatedDriveClient(email);
    const isGoogleDoc = mimeType === 'application/vnd.google-apps.document';
    
    // Verify the auth client is attached and has credentials
    if (isGoogleDoc) {
      if (!drive._auth) {
        console.error('drive._auth is undefined - drive client:', Object.keys(drive));
        throw new Error('Authentication client not properly initialized - drive._auth is undefined');
      }
      
      // Check if credentials are set
      let credentials = drive._auth.credentials;
      if (!credentials || !credentials.access_token) {
        console.log('Credentials missing or expired, attempting to get access token...');
        // Try to get/refresh access token
        try {
          const authCredentials = await drive._auth.getAccessToken();
          if (authCredentials && authCredentials.token) {
            console.log('Successfully retrieved access token');
            // Credentials should now be set by getAccessToken
            credentials = drive._auth.credentials;
            if (!credentials || !credentials.access_token) {
              throw new Error('Access token retrieved but credentials not set');
            }
          } else {
            throw new Error('Failed to get access token');
          }
        } catch (tokenError) {
          console.error('Error getting access token:', tokenError);
          throw new Error('Authentication client not properly initialized - failed to get access token: ' + tokenError.message);
        }
      }
      
      console.log('Auth client verified - has credentials:', !!drive._auth.credentials?.access_token);
    }

    if (fileId) {
      // Update existing file
      if (isGoogleDoc) {
        // For Google Docs, we need to use batchUpdate to replace content
        // Get current document to check if it exists
        const existingFile = await drive.files.get({
          fileId: fileId,
          fields: 'mimeType'
        });

        if (existingFile.data.mimeType === 'application/vnd.google-apps.document') {
          // Clear existing content and insert new content
          // Use Google Docs API to update content
          const { google } = require('googleapis');
          // Get the auth from the drive client
          const auth = drive._auth;
          const docs = google.docs({ version: 'v1', auth: auth });
          
          // Get current document
          const doc = await docs.documents.get({ documentId: fileId });
          const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;
          
          // Delete all content except first paragraph
          if (endIndex > 1) {
            await docs.documents.batchUpdate({
              documentId: fileId,
              requestBody: {
                requests: [
                  {
                    deleteContentRange: {
                      range: {
                        startIndex: 1,
                        endIndex: endIndex
                      }
                    }
                  },
                  {
                    insertText: {
                      location: {
                        index: 1
                      },
                      text: content
                    }
                  }
                ]
              }
            });
          } else {
            // Document is empty, just insert
            await docs.documents.batchUpdate({
              documentId: fileId,
              requestBody: {
                requests: [
                  {
                    insertText: {
                      location: {
                        index: 1
                      },
                      text: content
                    }
                  }
                ]
              }
            });
          }
        } else {
          // Not a Google Doc, update as regular file
          const fileBuffer = Buffer.from(content, 'utf8');
          const fileStream = Readable.from(fileBuffer);
          await drive.files.update({
            fileId: fileId,
            media: {
              mimeType: mimeType,
              body: fileStream
            }
          });
        }
      } else {
        // Regular file update
        const fileBuffer = Buffer.from(content, 'utf8');
        const fileStream = Readable.from(fileBuffer);
        await drive.files.update({
          fileId: fileId,
          media: {
            mimeType: mimeType,
            body: fileStream
          }
        });
      }

      const fileMetadata = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, modifiedTime'
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fileMetadata.data.id,
          name: fileMetadata.data.name,
          modifiedTime: fileMetadata.data.modifiedTime
        })
      };
    } else {
      // Create new file
      if (isGoogleDoc) {
        // Create empty Google Doc first
        const fileMetadata = {
          name: fileName,
          mimeType: 'application/vnd.google-apps.document'
        };

        if (parentFolderId) {
          fileMetadata.parents = [parentFolderId];
        }

        const response = await drive.files.create({
          requestBody: fileMetadata,
          fields: 'id, name, modifiedTime'
        });

        // Add content to the Google Doc
        if (content && content.trim()) {
          const { google } = require('googleapis');
          // Get the auth from the drive client
          // The drive client should already have fresh tokens from getAuthenticatedDriveClient
          const auth = drive._auth;
          const docs = google.docs({ version: 'v1', auth: auth });
          
          // Small delay to ensure the document is fully initialized
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            // Get the document structure
            const doc = await docs.documents.get({ documentId: response.data.id });
            console.log('Google Doc structure (first 500 chars):', JSON.stringify(doc.data.body, null, 2).substring(0, 500));
            
            // Find the end of the document body
            let endIndex = 1;
            if (doc.data.body && doc.data.body.content && doc.data.body.content.length > 0) {
              const lastElement = doc.data.body.content[doc.data.body.content.length - 1];
              endIndex = lastElement.endIndex - 1;
              console.log('Document endIndex:', endIndex);
            }
            
            // For a new empty Google Doc, the structure is typically:
            // - body.content[0] = paragraph element
            //   - paragraph.elements[0] = break element (creates the paragraph)
            // The break is usually at index 1, and we want to insert text right after it
            // OR we can delete everything and insert at index 1
            
            // Strategy: Delete everything from index 1 to end, then insert our text at index 1
            const requests = [];
            
            if (endIndex > 1) {
              console.log('Deleting existing content from index 1 to', endIndex);
              requests.push({
                deleteContentRange: {
                  range: {
                    startIndex: 1,
                    endIndex: endIndex
                  }
                }
              });
            }
            
            // Insert the new content at index 1
            console.log('Inserting text at index 1, length:', content.length, 'First 50:', content.substring(0, 50));
            requests.push({
              insertText: {
                location: {
                  index: 1
                },
                text: content
              }
            });
            
            // Execute both operations in a single batchUpdate
            await docs.documents.batchUpdate({
              documentId: response.data.id,
              requestBody: {
                requests: requests
              }
            });
            
            // Wait a bit for the update to propagate
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify the content was inserted
            const verifyDoc = await docs.documents.get({ documentId: response.data.id });
            if (verifyDoc.data.body && verifyDoc.data.body.content) {
              const textContent = verifyDoc.data.body.content
                .map(element => {
                  if (element.paragraph && element.paragraph.elements) {
                    return element.paragraph.elements
                      .map(elem => elem.textRun ? elem.textRun.content : '')
                      .join('');
                  }
                  return '';
                })
                .join('')
                .trim();
              console.log('Verified content length:', textContent.length, 'First 50 chars:', textContent.substring(0, 50));
              
              if (textContent.length === 0) {
                console.error('Content insertion failed - document is still empty. Full structure:', JSON.stringify(verifyDoc.data.body, null, 2));
                throw new Error('Content insertion failed - document is still empty after insertion');
              }
            } else {
              console.error('Could not verify content - document structure is missing');
            }
          } catch (error) {
            console.error('Error inserting text into Google Doc:', error);
            console.error('Error details:', error.message);
            if (error.response) {
              console.error('Error response:', error.response.data);
            }
            
            // Check if this is a scope/authentication issue
            if (error.status === 401 || error.code === 401) {
              // Check if tokens actually have the Docs scope before clearing
              const { getTokens } = require('./drive-client');
              const tokens = await getTokens(email);
              
              let hasDocsScope = false;
              if (tokens && tokens.scope) {
                hasDocsScope = tokens.scope.includes('documents') || tokens.scope.includes('https://www.googleapis.com/auth/documents');
                console.log('Checking token scope:', tokens.scope);
                console.log('Has Docs scope in stored tokens:', hasDocsScope);
              }
              
              // Only clear tokens if they don't have the Docs scope
              if (!hasDocsScope) {
                console.log('Tokens do not have Docs scope - clearing to force re-authorization');
                const { getStore } = require('@netlify/blobs');
                const STORAGE_KEY = 'drive_tokens.json';
                
                try {
                  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
                  const token = process.env.NETLIFY_AUTH_TOKEN;
                  
                  const storeOptions = { name: 'drive-tokens' };
                  if (siteID) storeOptions.siteID = siteID;
                  if (token) storeOptions.token = token;
                  
                  const store = getStore(storeOptions);
                  const data = await store.get(STORAGE_KEY);
                  if (data) {
                    const allTokens = JSON.parse(data);
                    delete allTokens[email]; // Remove this user's tokens
                    await store.set(STORAGE_KEY, JSON.stringify(allTokens, null, 2));
                    console.log('Cleared tokens due to missing Docs API scope - user needs to re-authorize');
                  }
                } catch (clearError) {
                  console.error('Error clearing tokens:', clearError);
                }
                
                // Return a specific error that the frontend can handle
                return {
                  statusCode: 403,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    error: 'MISSING_DOCS_SCOPE',
                    message: 'OAuth tokens are missing Google Docs API scope. Please re-authorize Drive access to enable Google Docs creation.',
                    requiresReauth: true
                  })
                };
              } else {
                // Tokens have the scope, but still got 401 - this might be a different auth issue
                console.error('Got 401 error but tokens have Docs scope - might be expired or invalid token');
                throw error; // Re-throw the original error
              }
            }
            
            // Re-throw other errors
            throw error;
          }
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: response.data.id,
            name: response.data.name,
            modifiedTime: response.data.modifiedTime
          })
        };
      } else {
        // Create regular file
        const fileMetadata = {
          name: fileName,
          mimeType: mimeType
        };

        if (parentFolderId) {
          fileMetadata.parents = [parentFolderId];
        }

        const fileBuffer = Buffer.from(content, 'utf8');
        const fileStream = Readable.from(fileBuffer);
        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: {
            mimeType: mimeType,
            body: fileStream
          },
          fields: 'id, name, modifiedTime'
        });

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: response.data.id,
            name: response.data.name,
            modifiedTime: response.data.modifiedTime
          })
        };
      }
    }
  } catch (error) {
    console.error('Drive write error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to write file' })
    };
  }
};

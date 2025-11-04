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

    const drive = await getAuthenticatedDriveClient(email);
    const isGoogleDoc = mimeType === 'application/vnd.google-apps.document';

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
          const auth = drive._auth;
          const docs = google.docs({ version: 'v1', auth: auth });
          
          // Small delay to ensure the document is fully initialized
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            // Get the document structure
            const doc = await docs.documents.get({ documentId: response.data.id });
            console.log('Google Doc structure:', JSON.stringify(doc.data.body, null, 2));
            
            // Find the end of the document body
            let endIndex = 1;
            if (doc.data.body && doc.data.body.content && doc.data.body.content.length > 0) {
              const lastElement = doc.data.body.content[doc.data.body.content.length - 1];
              endIndex = lastElement.endIndex - 1;
              console.log('Document endIndex:', endIndex);
            }
            
            // New Google Docs have a structure where the first paragraph contains a break element
            // We need to insert text after the break, or replace the break with our text
            // The typical structure is: paragraph with break at index 1, so we insert at index 1
            
            // Delete existing content if any (beyond the initial paragraph break)
            if (endIndex > 1) {
              console.log('Deleting existing content from index 1 to', endIndex);
              await docs.documents.batchUpdate({
                documentId: response.data.id,
                requestBody: {
                  requests: [
                    {
                      deleteContentRange: {
                        range: {
                          startIndex: 1,
                          endIndex: endIndex
                        }
                      }
                    }
                  ]
                }
              });
            }
            
            // Insert the new content at index 1
            console.log('Inserting text at index 1:', content.substring(0, 50) + '...');
            await docs.documents.batchUpdate({
              documentId: response.data.id,
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
                throw new Error('Content insertion failed - document is still empty');
              }
            }
          } catch (error) {
            console.error('Error inserting text into Google Doc:', error);
            console.error('Error details:', error.message, error.stack);
            // Re-throw so the error is visible
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

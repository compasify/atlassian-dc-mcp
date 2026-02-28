import { connectServer, createMcpServer, formatToolResponse } from '@atlassian-dc-mcp/common';
import { ConfluenceService, ConfluenceContent, confluenceToolSchemas } from './confluence-service.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const missingEnvVars = ConfluenceService.validateConfig();
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Initialize Confluence service
const confluenceService = new ConfluenceService(
  process.env.CONFLUENCE_API_BASE_PATH ? undefined : process.env.CONFLUENCE_HOST!,
  process.env.CONFLUENCE_API_TOKEN!,
  process.env.CONFLUENCE_API_BASE_PATH
);

// Define Confluence instance type
const confluenceInstanceType = "Confluence Data Center edition instance";

// Initialize MCP server
const server = createMcpServer({
  name: "atlassian-confluence-mcp",
  version: "1.0.0"
});

// Add Confluence content tools
server.tool(
  "confluence_getContent",
  `Get Confluence content by ID from the ${confluenceInstanceType}`,
  confluenceToolSchemas.getContent,
  async ({ contentId, expand }) => {
    const result = await confluenceService.getContent(contentId, expand);
    return formatToolResponse(result);
  }
);

server.tool(
  "confluence_searchContent",
  `Search for content in ${confluenceInstanceType} using CQL`,
  confluenceToolSchemas.searchContent,
  async ({ cql, limit, start, expand }) => {
    const result = await confluenceService.searchContent(cql, limit, start, expand);
    return formatToolResponse(result);
  }
);

server.tool(
  "confluence_createContent",
  `Create new content in ${confluenceInstanceType}`,
  confluenceToolSchemas.createContent,
  async ({ title, spaceKey, type, content, parentId }) => {
    const contentObj: ConfluenceContent = {
      type: type || 'page',
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      }
    };

    // Add parent page as ancestor if specified
    if (parentId) {
      contentObj.ancestors = [{ id: parentId }];
    }

    const result = await confluenceService.createContent(contentObj);
    return formatToolResponse(result);
  }
);

server.tool(
  "confluence_updateContent",
  `Update existing content in ${confluenceInstanceType}`,
  confluenceToolSchemas.updateContent,
  async ({ contentId, title, content, version, versionComment }) => {
    // First get the current content to build upon
    const currentContent = await confluenceService.getContent(contentId);

    if (!currentContent.success || !currentContent.data) {
      return formatToolResponse({
        success: false,
        error: `Failed to retrieve content with ID ${contentId}: ${currentContent.error || 'Unknown error'}`
      });
    }

    // Type assertion to help TypeScript understand the structure
    const contentData = currentContent.data as {
      type: string;
      title: string;
      space: { key: string };
    };

    const updateObj: ConfluenceContent = {
      id: contentId,
      type: contentData.type,
      title: title || contentData.title,
      space: contentData.space,
      version: {
        number: version,
        message: versionComment
      }
    };

    // Only update body if content is provided
    if (content) {
      updateObj.body = {
        storage: {
          value: content,
          representation: 'storage'
        }
      };
    }

    const result = await confluenceService.updateContent(contentId, updateObj);
    return formatToolResponse(result);
  }
);

server.tool('confluence_searchSpace',
  `Search for spaces in ${confluenceInstanceType}`,
  confluenceToolSchemas.searchSpaces,
  async ({
           searchText,
           limit,
           start,
           expand
         }) => {
    const result = await confluenceService.searchSpaces(searchText, limit, start, expand);
    return formatToolResponse(result);
  });

server.tool(
  "confluence_deletePage",
  `Delete a page in ${confluenceInstanceType}`,
  confluenceToolSchemas.deleteContent,
  async ({ contentId, status }) => {
    const result = await confluenceService.deleteContent(contentId, status);
    return formatToolResponse(result);
  }
);

server.tool(
  "confluence_getPageChildren",
  `Get child pages of a page in ${confluenceInstanceType}`,
  confluenceToolSchemas.getPageChildren,
  async ({ contentId, limit, start, expand }) => {
    const result = await confluenceService.getPageChildren(contentId, limit, start, expand);
    return formatToolResponse(result);
  }
);

server.tool(
  "confluence_getLabels",
  `Get labels of a page in ${confluenceInstanceType}`,
  confluenceToolSchemas.getLabels,
  async ({ contentId, prefix, limit, start }) => {
    const result = await confluenceService.getLabels(contentId, prefix, limit, start);
    return formatToolResponse(result);
  }
);

server.tool(
  "confluence_addLabel",
  `Add a label to a page in ${confluenceInstanceType}`,
  confluenceToolSchemas.addLabel,
  async ({ contentId, labelName, prefix }) => {
    const result = await confluenceService.addLabel(contentId, labelName, prefix);
    return formatToolResponse(result);
  }
);

server.tool(
  "confluence_getComments",
  `Get comments of a page in ${confluenceInstanceType}`,
  confluenceToolSchemas.getComments,
  async ({ contentId, limit, start, expand, depth }) => {
    const result = await confluenceService.getComments(contentId, limit, start, expand, depth);
    return formatToolResponse(result);
  }
);

server.tool(
  "confluence_addComment",
  `Add a comment to a page in ${confluenceInstanceType}`,
  confluenceToolSchemas.addComment,
  async ({ contentId, body, parentCommentId }) => {
    const result = await confluenceService.addComment(contentId, body, parentCommentId);
    return formatToolResponse(result);
  }
);

server.tool(
  "confluence_getAttachments",
  `Get attachments of a page in ${confluenceInstanceType}`,
  confluenceToolSchemas.getAttachments,
  async ({ contentId, filename, mediaType, limit, start, expand }) => {
    const result = await confluenceService.getAttachments(contentId, filename, mediaType, limit, start, expand);
    return formatToolResponse(result);
  }
);

server.tool(
  "confluence_deleteAttachment",
  `Delete an attachment from a page in ${confluenceInstanceType}`,
  confluenceToolSchemas.deleteAttachment,
  async ({ contentId, attachmentId }) => {
    const result = await confluenceService.deleteAttachment(contentId, attachmentId);
    return formatToolResponse(result);
  }
);

await connectServer(server);

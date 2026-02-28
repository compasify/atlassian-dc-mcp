import { z } from 'zod';
import { ContentLabelsService, ContentResourceService, ChildContentService, AttachmentsService, OpenAPI, SearchService } from './confluence-client/index.js';
import { handleApiOperation } from '@atlassian-dc-mcp/common';

export interface ConfluenceContent {
  id?: string;
  type: string;
  title: string;
  space: {
    key: string;
  };
  body?: {
    storage: {
      value: string;
      representation: 'storage';
    };
  };
  version?: {
    number: number;
    message?: string;
  };
  ancestors?: Array<{ id: string }>;
}

export class ConfluenceService {
  /**
   * Creates a new ConfluenceService instance
   * @param host The hostname of the Confluence server (e.g., "host.com")
   * @param token The API token for authentication
   * @param fullApiUrl Optional full API URL (e.g., "https://host.com/wiki/"). If provided, host and apiBasePath are ignored.
   */
  constructor(host: string | undefined, token: string, fullApiUrl?: string) {
    if (fullApiUrl) {
      OpenAPI.BASE = fullApiUrl;
    } else if (host) {
      OpenAPI.BASE = `https://${host}`;
    } else {
      throw new Error('Either host or fullApiUrl must be provided');
    }
    OpenAPI.TOKEN = token;
    OpenAPI.VERSION = '1.0';
  }
  /**
   * Get a Confluence page by ID
   * @param contentId The ID of the page to retrieve
   * @param expand Optional comma-separated list of properties to expand
   */
  async getContent(contentId: string, expand?: string) {
    const expandValue = expand || 'body.storage';
    const finalExpand = expand && !expand.includes('body.storage')
      ? `${expand},body.storage`
      : expandValue;
    return handleApiOperation(() => ContentResourceService.getContentById(contentId, finalExpand), 'Error getting content');
  }

  /**
   * Search for content in Confluence using CQL
   * @param cql Confluence Query Language string
   * @param limit Maximum number of results to return
   * @param start Start index for pagination
   * @param expand Optional comma-separated list of properties to expand
   */
  async searchContent(cql: string, limit?: number, start?: number, expand?: string) {
    return handleApiOperation(() => SearchService.search1(undefined, expand, undefined, limit?.toString(), start?.toString(), undefined, cql), 'Error searching for content');
  }

  /**
   * Create a new page in Confluence
   * @param content The content object to create
   */
  async createContent(content: ConfluenceContent) {
    return handleApiOperation(() => ContentResourceService.createContent(content), 'Error creating content');
  }

  /**
   * Update an existing page in Confluence
   * @param contentId The ID of the content to update
   * @param content The updated content object
   */
  async updateContent(contentId: string, content: ConfluenceContent) {
    return handleApiOperation(() => ContentResourceService.update2(contentId, content), 'Error updating content');
  }

  /**
   * Delete a Confluence page by ID
   * @param contentId The ID of the content to delete
   * @param status Optional: delete trashed content permanently by passing 'trashed'
   */
  async deleteContent(contentId: string, status?: string) {
    return handleApiOperation(
      () => ContentResourceService.delete3(contentId, status),
      'Error deleting content'
    );
  }

  /**
   * Get child pages of a Confluence page
   * @param contentId The ID of the parent page
   * @param limit Maximum number of results to return
   * @param start Start index for pagination
   * @param expand Optional comma-separated list of properties to expand
   */
  async getPageChildren(contentId: string, limit?: number, start?: number, expand?: string) {
    return handleApiOperation(
      () => ChildContentService.childrenOfType(contentId, 'page', expand, limit?.toString(), start?.toString()),
      'Error getting page children'
    );
  }

  /**
   * Get labels of a Confluence page
   * @param contentId The ID of the content
   * @param prefix Optional label prefix filter (e.g. 'global', 'my', 'team')
   * @param limit Maximum number of labels to return
   * @param start Start index for pagination
   */
  async getLabels(contentId: string, prefix?: string, limit?: number, start?: number) {
    return handleApiOperation(
      () => ContentLabelsService.labels(contentId, prefix, limit?.toString(), start?.toString()),
      'Error getting labels'
    );
  }

  /**
   * Add a label to a Confluence page
   * @param contentId The ID of the content
   * @param labelName The label name to add
   * @param prefix The label prefix (default: 'global')
   */
  async addLabel(contentId: string, labelName: string, prefix: string = 'global') {
    return handleApiOperation(
      () => ContentLabelsService.addLabels(contentId, { name: labelName, prefix }),
      'Error adding label'
    );
  }

  /**
   * Get comments of a Confluence page
   * @param contentId The ID of the content
   * @param limit Maximum number of results to return
   * @param start Start index for pagination
   * @param expand Optional comma-separated list of properties to expand
   * @param depth Optional depth: '' (root only) or 'all'
   */
  async getComments(contentId: string, limit?: number, start?: number, expand?: string, depth?: string) {
    return handleApiOperation(
      () => ChildContentService.commentsOfContent(contentId, expand || 'body.view', depth, limit?.toString(), start?.toString()),
      'Error getting comments'
    );
  }

  /**
   * Add a comment to a Confluence page
   * @param contentId The ID of the page to comment on
   * @param body The comment body in storage format (XML)
   * @param parentCommentId Optional parent comment ID for replies
   */
  async addComment(contentId: string, body: string, parentCommentId?: string) {
    const commentObj: any = {
      type: 'comment',
      container: {
        id: contentId,
        type: 'page',
      },
      body: {
        storage: {
          value: body,
          representation: 'storage',
        },
      },
    };

    // If replying to another comment, set ancestor
    if (parentCommentId) {
      commentObj.ancestors = [{ id: parentCommentId }];
    }

    return handleApiOperation(
      () => ContentResourceService.createContent(commentObj),
      'Error adding comment'
    );
  }

  /**
   * Get attachments of a Confluence page
   * @param contentId The ID of the page
   * @param filename Optional filter by filename
   * @param mediaType Optional filter by media type
   * @param limit Maximum number of results to return
   * @param start Start index for pagination
   * @param expand Optional comma-separated list of properties to expand
   */
  async getAttachments(contentId: string, filename?: string, mediaType?: string, limit?: number, start?: number, expand?: string) {
    return handleApiOperation(
      () => AttachmentsService.getAttachments(contentId, expand, filename, limit?.toString(), start?.toString(), mediaType),
      'Error getting attachments'
    );
  }

  /**
   * Delete an attachment from a Confluence page
   * @param contentId The ID of the page the attachment is on
   * @param attachmentId The ID of the attachment to delete
   */
  async deleteAttachment(contentId: string, attachmentId: string) {
    return handleApiOperation(
      () => AttachmentsService.removeAttachment(attachmentId, contentId),
      'Error deleting attachment'
    );
  }

  /**
   * Search for spaces by text
   * @param searchText Text to search for in space names or descriptions
   * @param limit Maximum number of results to return
   * @param start Start index for pagination
   * @param expand Optional comma-separated list of properties to expand
   */
  async searchSpaces(searchText: string, limit?: number, start?: number, expand?: string) {
    // Create a CQL query that searches for spaces
    // The correct syntax for space search is: type=space AND title ~ "searchText"
    const cql = `type=space AND title ~ "${searchText}"`;

    return handleApiOperation(() => SearchService.search1(
      undefined,
      expand,
      undefined,
      limit?.toString(),
      start?.toString(),
      undefined,
      cql
    ), 'Error searching for spaces');
  }

  static validateConfig(): string[] {
    const missingVars: string[] = [];

    // API token is always required
    if (!process.env.CONFLUENCE_API_TOKEN) {
      missingVars.push('CONFLUENCE_API_TOKEN');
    }

    // Either CONFLUENCE_HOST or CONFLUENCE_API_BASE_PATH must be set
    if (!process.env.CONFLUENCE_HOST && !process.env.CONFLUENCE_API_BASE_PATH) {
      missingVars.push('CONFLUENCE_HOST or CONFLUENCE_API_BASE_PATH');
    }

    return missingVars;
  }
}

export const confluenceToolSchemas = {
  getContent: {
    contentId: z.string().describe("Confluence Data Center content ID"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand")
  },
  searchContent: {
    cql: z.string().describe("Confluence Query Language (CQL) search string for Confluence Data Center"),
    limit: z.number().optional().describe("Maximum number of results to return"),
    start: z.number().optional().describe("Start index for pagination"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand")
  },
  createContent: {
    title: z.string().describe("Title of the content"),
    spaceKey: z.string().describe("Space key where content will be created"),
    type: z.string().default("page").describe("Content type (page, blogpost, etc)"),
    content: z.string().describe("Content body in Confluence Data Center \"storage\" format (confluence XML)"),
    parentId: z.string().optional().describe("ID of the parent page (if creating a child page)")
  },
  updateContent: {
    contentId: z.string().describe("ID of the content to update"),
    title: z.string().optional().describe("New title of the content"),
    content: z.string().optional().describe("New content body in Confluence Data Center storage format (XML-based)"),
    version: z.number().describe("New version number (must be incremented)"),
    versionComment: z.string().optional().describe("Comment for this version")
  },
  searchSpaces: {
    searchText: z.string().describe("Text to search for in Confluence Data Center space names or descriptions"),
    limit: z.number().optional().describe("Maximum number of results to return"),
    start: z.number().optional().describe("Start index for pagination"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand")
  },
  deleteContent: {
    contentId: z.string().describe("ID of the Confluence Data Center content to delete"),
    status: z.string().optional().describe("Set to 'trashed' to permanently delete already-trashed content")
  },
  getPageChildren: {
    contentId: z.string().describe("ID of the parent page in Confluence Data Center"),
    limit: z.number().optional().describe("Maximum number of child pages to return"),
    start: z.number().optional().describe("Start index for pagination"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand")
  },
  getLabels: {
    contentId: z.string().describe("ID of the Confluence Data Center content"),
    prefix: z.string().optional().describe("Filter labels by prefix: 'global', 'my', or 'team'"),
    limit: z.number().optional().describe("Maximum number of labels to return"),
    start: z.number().optional().describe("Start index for pagination")
  },
  addLabel: {
    contentId: z.string().describe("ID of the Confluence Data Center content to label"),
    labelName: z.string().describe("Name of the label to add"),
    prefix: z.string().optional().default("global").describe("Label prefix: 'global' (default), 'my', or 'team'")
  },
  getComments: {
    contentId: z.string().describe("ID of the Confluence Data Center page to get comments for"),
    limit: z.number().optional().describe("Maximum number of comments to return"),
    start: z.number().optional().describe("Start index for pagination"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand (default: body.view)"),
    depth: z.string().optional().describe("Comment depth: leave empty for root only, or 'all' for all levels")
  },
  addComment: {
    contentId: z.string().describe("ID of the Confluence Data Center page to add a comment to"),
    body: z.string().describe("Comment body in Confluence storage format (XML). Example: '<p>This is a comment</p>'"),
    parentCommentId: z.string().optional().describe("ID of a parent comment to reply to (for threaded comments)")
  },
  getAttachments: {
    contentId: z.string().describe("ID of the Confluence Data Center page to get attachments for"),
    filename: z.string().optional().describe("Filter by exact filename"),
    mediaType: z.string().optional().describe("Filter by media type (e.g., 'image/png')"),
    limit: z.number().optional().describe("Maximum number of attachments to return"),
    start: z.number().optional().describe("Start index for pagination"),
    expand: z.string().optional().describe("Comma-separated list of properties to expand")
  },
  deleteAttachment: {
    contentId: z.string().describe("ID of the Confluence Data Center page the attachment is on"),
    attachmentId: z.string().describe("ID of the attachment to delete")
  }
}

import axiosClient from './axiosClient';
import { MessageResponse, MessageDetails, ComposeResponse, MarkActionResponse, SyncNewResponse } from '../types';

interface MessageParams {
  mailboxes?: number[];
  page?: number;
  is_read?: boolean;
  status?: 'SENT' | 'RECEIVED' | 'DRAFT';
  is_starred?: boolean;
  label?: 'Work'| 'Personal'|'Important';
  is_spam?: boolean;
  search?: string;
}

interface BulkMarkParams {
  ids: number[];
  field: 'is_read' | 'is_starred' | 'is_spam' | 'is_deleted';
  value: boolean;
}

export const messagesApi = {
  getMessages: async (params: MessageParams = {}): Promise<MessageResponse> => {
    const queryParams = new URLSearchParams();
    
    // Handle mailboxes param (can be multiple)
    if (params.mailboxes && params.mailboxes.length > 0) {
      params.mailboxes.forEach(id => {
        queryParams.append('mailboxes', id.toString());
      });
    }
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.status) {
      queryParams.append('status', params.status);
    }
    if (params.label) {
      queryParams.append('label', params.label);
    }

    if (params.is_read !== undefined) queryParams.append('is_read', params.is_read.toString());
    if (params.is_starred !== undefined) queryParams.append('is_starred', params.is_starred.toString());
    if (params.is_spam !== undefined) queryParams.append('is_spam', params.is_spam.toString());
    if (params.search) queryParams.append('search', params.search);
    
    const response = await axiosClient.get(`/messages/?${queryParams.toString()}`);
    return response.data;
  },
  
  getMessage: async (id: number): Promise<MessageDetails> => {
    const response = await axiosClient.get(`/messages/${id}`);
    return response.data;
  },
  
  compose: async (data: FormData): Promise<ComposeResponse> => {
    const response = await axiosClient.post('/messages/compose/', data,{
  headers: {
    'Content-Type': undefined
  }
});
    return response.data;
  },
  
  syncNewMessages: async (): Promise<SyncNewResponse> => {
    const response = await axiosClient.get('/messages/sync-new');
    return response.data;
  },


  bulkMark: async (data: BulkMarkParams): Promise<MarkActionResponse> => {
    const response = await axiosClient.patch('/messages/bulk_mark/', data);
    return response.data;
  },

  downloadAttachment: async (fileId: number): Promise<void> => {
  const response = await axiosClient.get('/download/', {
    params: { file_id: fileId },
    responseType: 'blob', // still very important
  });

  const contentType = response.headers['content-type'] || 'application/octet-stream';
  const blob = new Blob([response.data], { type: contentType });  // ✅ use correct mime type
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;

  const contentDisposition = response.headers['content-disposition'];
  let filename = 'download';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}


};

export default messagesApi;